import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import os from 'os';

export const maxDuration = 300;

const execAsync = promisify(exec);

// zoompan 필터 (떨림 방지: 2배 업스케일 후 적용, ease in-out)
function buildZoompanFilter(effect: string, durationSec: number, outRes: string): string {
  if (!effect || effect === 'none') return '';
  const fps = 25;
  const f = Math.ceil(durationSec * fps);
  const s = outRes;
  const cy = 'ih/2-(ih/zoom/2)';
  const cx = 'iw/2-(iw/zoom/2)';
  const pre = 'scale=iw*2:ih*2,';
  const t = `(1-cos(PI*min(on,${f})/${f}))/2`;
  switch (effect) {
    case 'zoomin':      return `${pre}zoompan=z='1+0.3*${t}':x='${cx}':y='${cy}':d=${f}:s=${s}:fps=${fps}`;
    case 'zoomout':     return `${pre}zoompan=z='1.3-0.3*${t}':x='${cx}':y='${cy}':d=${f}:s=${s}:fps=${fps}`;
    case 'panleft':     return `${pre}zoompan=z='1.2':x='(iw-iw/zoom)*${t}':y='${cy}':d=${f}:s=${s}:fps=${fps}`;
    case 'panright':    return `${pre}zoompan=z='1.2':x='(iw-iw/zoom)*(1-${t})':y='${cy}':d=${f}:s=${s}:fps=${fps}`;
    case 'kenburns':    return `${pre}zoompan=z='1+0.25*${t}':x='(iw-iw/zoom)*${t}*0.5':y='${cy}':d=${f}:s=${s}:fps=${fps}`;
    case 'zoomin-fast': return `${pre}zoompan=z='1+0.6*${t}':x='${cx}':y='${cy}':d=${f}:s=${s}:fps=${fps}`;
    case 'zoomout-fast':return `${pre}zoompan=z='1.6-0.6*${t}':x='${cx}':y='${cy}':d=${f}:s=${s}:fps=${fps}`;
    case 'panleft-fast':return `${pre}zoompan=z='1.5':x='(iw-iw/zoom)*${t}':y='${cy}':d=${f}:s=${s}:fps=${fps}`;
    case 'panright-fast':return `${pre}zoompan=z='1.5':x='(iw-iw/zoom)*(1-${t})':y='${cy}':d=${f}:s=${s}:fps=${fps}`;
    default: return '';
  }
}

// 색보정 eq 필터 문자열 생성
function buildEqFilter(brightness: number, contrast: number, saturation: number): string {
  if (brightness === 0 && contrast === 0 && saturation === 0) return '';
  const b = (brightness / 200).toFixed(3);
  const c = (1 + contrast / 200).toFixed(3);
  const s = (1 + saturation / 100).toFixed(3);
  return `eq=brightness=${b}:contrast=${c}:saturation=${s}`;
}

// 자막 애니메이션 필터 (PNG 합성 오버레이)
function buildSubtitleAnimFilter(animation: string, animDur: number, renderW: number, renderH: number): string {
  const dur = animDur.toFixed(3);
  if (animation === 'slideup') {
    const offset = 80;
    return `[1:v]scale=${renderW}:${renderH},format=rgba[s];[0:v][s]overlay=0:'max(0,${offset}-${offset}*min(1,t/${dur}))'[v]`;
  } else if (animation === 'fadein' || animation === 'typing') {
    return `[1:v]scale=${renderW}:${renderH},format=rgba,fade=t=in:st=0:d=${dur}:alpha=1[sfade];[0:v][sfade]overlay=0:0[v]`;
  }
  // none - 정적 오버레이
  return `[1:v]scale=${renderW}:${renderH}[sub];[0:v][sub]overlay=0:0[v]`;
}

export async function POST(request: NextRequest) {
  const tmpDir = join(os.tmpdir(), `shortform-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  try {
    await mkdir(tmpDir, { recursive: true });

    const formData = await request.formData();
    const sceneCount = Number(formData.get('sceneCount') || 0);
    const bgMusicId = String(formData.get('bgMusicId') || 'none');
    const bgMusicVolume = Number(formData.get('bgMusicVolume') || 0.3);
    const bgMusicFadeOut = formData.get('bgMusicFadeOut') === 'true';
    const bgMusicFadeOutDuration = Number(formData.get('bgMusicFadeOutDuration') || 3);
    const aspectRatio = String(formData.get('aspectRatio') || '9:16');
    const is16x9 = aspectRatio === '16:9';
    const renderW = is16x9 ? 1920 : 1080;
    const renderH = is16x9 ? 1080 : 1920;
    const outRes = `${renderW}x${renderH}`;

    if (sceneCount === 0) {
      return NextResponse.json({ error: '장면이 없습니다.' }, { status: 400 });
    }

    // 전환 효과 데이터
    const transitions: Array<{ type: string; duration: number }> = [];
    for (let i = 0; i < sceneCount - 1; i++) {
      transitions.push({
        type: String(formData.get(`transition_type_${i}`) || 'none'),
        duration: Number(formData.get(`transition_duration_${i}`) || 0.5),
      });
    }

    const scenePaths: string[] = [];
    const sceneBgmVolumes: number[] = [];
    const sceneDurations: number[] = [];

    // 각 장면: 이미지 + 오디오 → scene_N.mp4
    for (let i = 0; i < sceneCount; i++) {
      const imgFile = formData.get(`image_${i}`) as File | null;
      const audioFile = formData.get(`audio_${i}`) as File | null;
      const duration = Number(formData.get(`duration_${i}`) || 5);
      const motionEffect = String(formData.get(`motion_effect_${i}`) || 'none');
      const ttsVolume = Number(formData.get(`tts_volume_${i}`) || 1.0);
      const sceneBgmVol = Number(formData.get(`scene_bgm_volume_${i}`) || 1.0);
      const colorBrightness = Number(formData.get(`color_brightness_${i}`) || 0);
      const colorContrast = Number(formData.get(`color_contrast_${i}`) || 0);
      const colorSaturation = Number(formData.get(`color_saturation_${i}`) || 0);
      const subtitleAnimation = String(formData.get(`subtitle_animation_${i}`) || 'none');
      const subtitleAnimDur = Number(formData.get(`subtitle_anim_dur_${i}`) || 0.5);
      // 자막 PNG (애니메이션용 별도 레이어, page.tsx에서 subtitle_png_i로 전달)
      const subtitlePngFile = formData.get(`subtitle_png_${i}`) as File | null;

      if (!imgFile) continue;

      const imgPath = join(tmpDir, `scene_${i}.jpg`);
      const outPath = join(tmpDir, `scene_${i}.mp4`);
      scenePaths.push(outPath);
      sceneBgmVolumes.push(sceneBgmVol);
      sceneDurations.push(duration);

      await writeFile(imgPath, Buffer.from(await imgFile.arrayBuffer()));

      // 색보정 필터
      const eqFilter = buildEqFilter(colorBrightness, colorContrast, colorSaturation);

      // 동작 효과 필터
      const zoompan = buildZoompanFilter(motionEffect, duration, outRes);

      // vf 필터 체인 구성
      let vfParts: string[] = [];
      if (zoompan) vfParts.push(zoompan);
      else vfParts.push(`scale=${renderW}:${renderH}:force_original_aspect_ratio=increase,crop=${renderW}:${renderH}`);
      if (eqFilter) vfParts.push(eqFilter);
      vfParts.push('fps=25');

      const tunePart = zoompan ? '' : '-tune stillimage ';

      if (audioFile) {
        const audioPath = join(tmpDir, `scene_${i}.mp3`);
        await writeFile(audioPath, Buffer.from(await audioFile.arrayBuffer()));

        // 자막 애니메이션 (별도 PNG 레이어 있을 때)
        if (subtitlePngFile && subtitleAnimation !== 'none') {
          const subPngPath = join(tmpDir, `subtitle_${i}.png`);
          await writeFile(subPngPath, Buffer.from(await subtitlePngFile.arrayBuffer()));
          // 먼저 기본 영상 생성
          const baseOutPath = join(tmpDir, `scene_${i}_base.mp4`);
          await execAsync(
            `ffmpeg -y -loop 1 -i "${imgPath}" -i "${audioPath}" ` +
            `-vf "${vfParts.join(',')}" -c:v libx264 ${tunePart}-c:a aac -b:a 128k ` +
            `-pix_fmt yuv420p -shortest "${baseOutPath}"`
          );
          // 자막 PNG 오버레이 + 애니메이션
          const animFilter = buildSubtitleAnimFilter(subtitleAnimation, subtitleAnimDur, renderW, renderH);
          // TTS 볼륨 적용
          const afFilter = ttsVolume !== 1.0 ? `-af "volume=${ttsVolume.toFixed(3)}"` : '';
          await execAsync(
            `ffmpeg -y -i "${baseOutPath}" -i "${subPngPath}" ` +
            `-filter_complex "${animFilter}" ` +
            `-map "[v]" -map 0:a ${afFilter} -c:v libx264 -c:a aac -pix_fmt yuv420p "${outPath}"`
          );
        } else {
          const afFilter = ttsVolume !== 1.0 ? `-af "volume=${ttsVolume.toFixed(3)}"` : '';
          await execAsync(
            `ffmpeg -y -loop 1 -i "${imgPath}" -i "${audioPath}" ` +
            `-vf "${vfParts.join(',')}" -c:v libx264 ${tunePart}-c:a aac -b:a 128k ` +
            `-pix_fmt yuv420p ${afFilter} -shortest "${outPath}"`
          );
        }
      } else {
        // 오디오 없음: 무음
        await execAsync(
          `ffmpeg -y -loop 1 -i "${imgPath}" ` +
          `-f lavfi -i anullsrc=r=44100:cl=stereo ` +
          `-vf "${vfParts.join(',')}" -c:v libx264 ${tunePart}-c:a aac -b:a 128k ` +
          `-pix_fmt yuv420p -t ${duration} "${outPath}"`
        );
      }
    }

    if (scenePaths.length === 0) {
      return NextResponse.json({ error: '처리된 장면이 없습니다.' }, { status: 400 });
    }

    let finalPath = join(tmpDir, 'final.mp4');
    const hasTransitions = transitions.some(t => t.type !== 'none');

    if (scenePaths.length === 1) {
      finalPath = scenePaths[0];
    } else if (!hasTransitions) {
      const concatList = scenePaths.map(p => `file '${p}'`).join('\n');
      const listPath = join(tmpDir, 'concat.txt');
      await writeFile(listPath, concatList);
      const concatPath = join(tmpDir, 'concat.mp4');
      await execAsync(
        `ffmpeg -y -f concat -safe 0 -i "${listPath}" ` +
        `-c:v libx264 -c:a aac -pix_fmt yuv420p "${concatPath}"`
      );
      finalPath = concatPath;
    } else {
      // ffprobe로 각 클립 길이 측정
      const durations: number[] = [];
      for (const p of scenePaths) {
        const { stdout } = await execAsync(
          `ffprobe -v error -show_entries format=duration -of csv=p=0 "${p}"`
        );
        durations.push(parseFloat(stdout.trim()));
      }

      type Segment = { indices: number[]; transitions: Array<{ type: string; duration: number }> };
      const segments: Segment[] = [];
      let curIndices = [0];
      let curTransitions: Array<{ type: string; duration: number }> = [];

      for (let i = 0; i < scenePaths.length - 1; i++) {
        const trans = transitions[i] ?? { type: 'none', duration: 0.5 };
        if (trans.type === 'none') {
          segments.push({ indices: curIndices, transitions: curTransitions });
          curIndices = [i + 1];
          curTransitions = [];
        } else {
          curIndices.push(i + 1);
          curTransitions.push(trans);
        }
      }
      segments.push({ indices: curIndices, transitions: curTransitions });

      const segmentPaths: string[] = [];
      for (let si = 0; si < segments.length; si++) {
        const seg = segments[si];
        if (seg.indices.length === 1) {
          segmentPaths.push(scenePaths[seg.indices[0]]);
        } else {
          const segInputs = seg.indices.map(idx => `-i "${scenePaths[idx]}"`).join(' ');
          const segDurations = seg.indices.map(idx => durations[idx]);
          const vFilters: string[] = [];
          const aFilters: string[] = [];
          let prevV = '0:v';
          let prevA = '0:a';
          let offsetAccum = 0;
          const m = seg.indices.length;

          for (let j = 0; j < m - 1; j++) {
            const trans = seg.transitions[j];
            const isLast = j === m - 2;
            const outV = isLast ? 'vout' : `sv${j}`;
            const outA = isLast ? 'aout' : `sa${j}`;
            const tDur = Math.min(trans.duration, segDurations[j] * 0.9);
            offsetAccum += segDurations[j] - tDur;
            vFilters.push(`[${prevV}][${j + 1}:v]xfade=transition=${trans.type}:duration=${tDur.toFixed(3)}:offset=${offsetAccum.toFixed(3)}[${outV}]`);
            aFilters.push(`[${prevA}][${j + 1}:a]acrossfade=d=${tDur.toFixed(3)}[${outA}]`);
            prevV = outV;
            prevA = outA;
          }

          const filterComplex = [...vFilters, ...aFilters].join(';');
          const segPath = join(tmpDir, `segment_${si}.mp4`);
          await execAsync(
            `ffmpeg -y ${segInputs} ` +
            `-filter_complex "${filterComplex}" ` +
            `-map "[vout]" -map "[aout]" -c:v libx264 -c:a aac -pix_fmt yuv420p "${segPath}"`
          );
          segmentPaths.push(segPath);
        }
      }

      if (segmentPaths.length === 1) {
        finalPath = segmentPaths[0];
      } else {
        const concatList = segmentPaths.map(p => `file '${p}'`).join('\n');
        const listPath = join(tmpDir, 'concat_segs.txt');
        await writeFile(listPath, concatList);
        const concatPath = join(tmpDir, 'concat.mp4');
        await execAsync(
          `ffmpeg -y -f concat -safe 0 -i "${listPath}" ` +
          `-c:v libx264 -c:a aac -pix_fmt yuv420p "${concatPath}"`
        );
        finalPath = concatPath;
      }
    }

    // BGM 믹싱 (장면별 볼륨 envelope 지원)
    if (bgMusicId !== 'none') {
      const bgmPath = join(process.cwd(), 'public', 'bgm', bgMusicId);
      const withBgmPath = join(tmpDir, 'with_bgm.mp4');
      try {
        const hasBgmEnvelope = sceneBgmVolumes.some(v => v !== 1.0);

        let bgmVolumeExpr: string;
        if (hasBgmEnvelope) {
          // 장면별 BGM 볼륨 동적 envelope (중첩 if 표현식)
          let acc = 0;
          const cumulativeTimes: number[] = [];
          for (const d of sceneDurations) { acc += d; cumulativeTimes.push(acc); }
          const lastV = (sceneBgmVolumes[sceneBgmVolumes.length - 1] * bgMusicVolume).toFixed(3);
          let expr = lastV;
          for (let si = sceneBgmVolumes.length - 2; si >= 0; si--) {
            const v = (sceneBgmVolumes[si] * bgMusicVolume).toFixed(3);
            const cutT = cumulativeTimes[si].toFixed(3);
            expr = `if(lt(t,${cutT}),${v},${expr})`;
          }
          bgmVolumeExpr = `volume='${expr}'`;
        } else {
          bgmVolumeExpr = `volume=${bgMusicVolume}`;
        }

        let bgmFilter: string;
        if (bgMusicFadeOut) {
          const { stdout: durStr } = await execAsync(
            `ffprobe -v error -show_entries format=duration -of csv=p=0 "${finalPath}"`
          );
          const videoDuration = parseFloat(durStr.trim());
          const fadeStart = Math.max(0, videoDuration - bgMusicFadeOutDuration).toFixed(3);
          bgmFilter =
            `[1:a]${bgmVolumeExpr}[bgm_vol];` +
            `[bgm_vol]afade=t=out:st=${fadeStart}:d=${bgMusicFadeOutDuration}[bgm];` +
            `[0:a][bgm]amix=inputs=2:duration=first[a]`;
        } else {
          bgmFilter = `[1:a]${bgmVolumeExpr}[bgm];[0:a][bgm]amix=inputs=2:duration=first[a]`;
        }

        await execAsync(
          `ffmpeg -y -i "${finalPath}" -i "${bgmPath}" ` +
          `-filter_complex "${bgmFilter}" ` +
          `-map 0:v -map "[a]" -c:v copy -c:a aac "${withBgmPath}"`
        );
        finalPath = withBgmPath;
      } catch (e) {
        console.warn('[Render] BGM 믹싱 실패, 원본 사용:', e);
      }
    }

    const outputBuffer = await readFile(finalPath);
    await rm(tmpDir, { recursive: true, force: true });

    return new NextResponse(outputBuffer, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': 'attachment; filename="shortform.mp4"',
        'Content-Length': String(outputBuffer.length),
      },
    });
  } catch (err) {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    console.error('[Render] 오류:', err);
    const msg = err instanceof Error ? err.message : '렌더링 실패';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
