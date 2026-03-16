import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import os from 'os';

export const maxDuration = 300; // Vercel 등 플랫폼 최대 실행 시간 (로컬은 무제한)

const execAsync = promisify(exec);

// zoompan 필터 생성 (없음이면 빈 문자열 반환)
// 떨림 방지: 이미지를 2배 업스케일 후 zoompan 적용 → 좌표 스텝이 0.5픽셀 단위로 세밀해져 흔들림 제거
// ease in-out: (1 - cos(PI * t)) / 2  →  천천히 시작 → 빠르게 → 천천히 끝 (영화적 느낌)
function buildZoompanFilter(effect: string, durationSec: number): string {
  if (!effect || effect === 'none') return '';
  const fps = 25;
  const f = Math.ceil(durationSec * fps);
  const s = '1080x1920';
  const cy = 'ih/2-(ih/zoom/2)';
  const cx = 'iw/2-(iw/zoom/2)';
  const pre = 'scale=iw*2:ih*2,';
  // ease in-out 진행도: t = (1 - cos(PI * min(on,f) / f)) / 2  (0→1 부드럽게)
  const t = `(1-cos(PI*min(on,${f})/${f}))/2`;
  switch (effect) {
    case 'zoomin':
      return `${pre}zoompan=z='1+0.3*${t}':x='${cx}':y='${cy}':d=${f}:s=${s}:fps=${fps}`;
    case 'zoomout':
      return `${pre}zoompan=z='1.3-0.3*${t}':x='${cx}':y='${cy}':d=${f}:s=${s}:fps=${fps}`;
    case 'panleft':
      return `${pre}zoompan=z='1.2':x='(iw-iw/zoom)*${t}':y='${cy}':d=${f}:s=${s}:fps=${fps}`;
    case 'panright':
      return `${pre}zoompan=z='1.2':x='(iw-iw/zoom)*(1-${t})':y='${cy}':d=${f}:s=${s}:fps=${fps}`;
    case 'kenburns':
      return `${pre}zoompan=z='1+0.25*${t}':x='(iw-iw/zoom)*${t}*0.5':y='${cy}':d=${f}:s=${s}:fps=${fps}`;
    case 'zoomin-fast':
      return `${pre}zoompan=z='1+0.6*${t}':x='${cx}':y='${cy}':d=${f}:s=${s}:fps=${fps}`;
    case 'zoomout-fast':
      return `${pre}zoompan=z='1.6-0.6*${t}':x='${cx}':y='${cy}':d=${f}:s=${s}:fps=${fps}`;
    case 'panleft-fast':
      return `${pre}zoompan=z='1.5':x='(iw-iw/zoom)*${t}':y='${cy}':d=${f}:s=${s}:fps=${fps}`;
    case 'panright-fast':
      return `${pre}zoompan=z='1.5':x='(iw-iw/zoom)*(1-${t})':y='${cy}':d=${f}:s=${s}:fps=${fps}`;
    default:
      return '';
  }
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

    if (sceneCount === 0) {
      return NextResponse.json({ error: '장면이 없습니다.' }, { status: 400 });
    }

    // 전환 효과 데이터 읽기 (장면 i → i+1)
    const transitions: Array<{ type: string; duration: number }> = [];
    for (let i = 0; i < sceneCount - 1; i++) {
      transitions.push({
        type: String(formData.get(`transition_type_${i}`) || 'none'),
        duration: Number(formData.get(`transition_duration_${i}`) || 0.5),
      });
    }

    const scenePaths: string[] = [];

    // 각 장면: 이미지 + 오디오 → scene_N.mp4
    for (let i = 0; i < sceneCount; i++) {
      const imgFile = formData.get(`image_${i}`) as File | null;
      const audioFile = formData.get(`audio_${i}`) as File | null;
      const duration = Number(formData.get(`duration_${i}`) || 5);
      const motionEffect = String(formData.get(`motion_effect_${i}`) || 'none');

      if (!imgFile) continue;

      const imgPath = join(tmpDir, `scene_${i}.jpg`);
      const outPath = join(tmpDir, `scene_${i}.mp4`);
      scenePaths.push(outPath);

      // 이미지 저장
      await writeFile(imgPath, Buffer.from(await imgFile.arrayBuffer()));

      // 동작 효과 필터 생성
      const zoompan = buildZoompanFilter(motionEffect, duration);
      const vfPart = zoompan ? `-vf "${zoompan}" ` : '';
      const tunePart = zoompan ? '' : '-tune stillimage ';

      if (audioFile) {
        // 이미지 + 오디오 → mp4
        const audioPath = join(tmpDir, `scene_${i}.mp3`);
        await writeFile(audioPath, Buffer.from(await audioFile.arrayBuffer()));

        await execAsync(
          `ffmpeg -y -loop 1 -i "${imgPath}" -i "${audioPath}" ` +
          `${vfPart}-c:v libx264 ${tunePart}-c:a aac -b:a 128k ` +
          `-pix_fmt yuv420p -shortest "${outPath}"`
        );
      } else {
        // 오디오 없음: 무음으로 N초짜리 생성
        await execAsync(
          `ffmpeg -y -loop 1 -i "${imgPath}" ` +
          `-f lavfi -i anullsrc=r=44100:cl=stereo ` +
          `${vfPart}-c:v libx264 ${tunePart}-c:a aac -b:a 128k ` +
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
      // 모두 없음(컷): 단순 concat
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
      // 혼합 전환: "없음(컷)" 경계로 그룹 분리 → 그룹 내 xfade → 그룹 간 concat
      // ffprobe로 각 클립의 실제 재생 시간 측정
      const durations: number[] = [];
      for (const p of scenePaths) {
        const { stdout } = await execAsync(
          `ffprobe -v error -show_entries format=duration -of csv=p=0 "${p}"`
        );
        durations.push(parseFloat(stdout.trim()));
      }

      // "없음(컷)" 전환을 기준으로 장면을 그룹으로 분리
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

      // 각 그룹을 하나의 mp4로 처리
      const segmentPaths: string[] = [];
      for (let si = 0; si < segments.length; si++) {
        const seg = segments[si];
        if (seg.indices.length === 1) {
          // 단일 장면: 그대로 사용
          segmentPaths.push(scenePaths[seg.indices[0]]);
        } else {
          // 여러 장면: xfade 적용
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

      // 그룹 간 concat (없음(컷)으로 연결)
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

    // 배경음악 믹싱 (bgMusicId는 파일명 전체 ex: upbeat.mp3)
    if (bgMusicId !== 'none') {
      const bgmPath = join(process.cwd(), 'public', 'bgm', bgMusicId);
      const withBgmPath = join(tmpDir, 'with_bgm.mp4');
      try {
        let bgmFilter: string;
        if (bgMusicFadeOut) {
          // 영상 길이 측정 후 BGM 페이드아웃 적용
          const { stdout: durStr } = await execAsync(
            `ffprobe -v error -show_entries format=duration -of csv=p=0 "${finalPath}"`
          );
          const videoDuration = parseFloat(durStr.trim());
          const fadeStart = Math.max(0, videoDuration - bgMusicFadeOutDuration).toFixed(3);
          bgmFilter =
            `[1:a]volume=${bgMusicVolume}[bgm_vol];` +
            `[bgm_vol]afade=t=out:st=${fadeStart}:d=${bgMusicFadeOutDuration}[bgm];` +
            `[0:a][bgm]amix=inputs=2:duration=first[a]`;
        } else {
          bgmFilter = `[1:a]volume=${bgMusicVolume}[bgm];[0:a][bgm]amix=inputs=2:duration=first[a]`;
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

    // 결과 읽기 + 반환
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
