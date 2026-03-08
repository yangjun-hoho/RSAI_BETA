import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import os from 'os';

export const maxDuration = 300; // Vercel 등 플랫폼 최대 실행 시간 (로컬은 무제한)

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  const tmpDir = join(os.tmpdir(), `shortform-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  try {
    await mkdir(tmpDir, { recursive: true });

    const formData = await request.formData();
    const sceneCount = Number(formData.get('sceneCount') || 0);
    const bgMusicId = String(formData.get('bgMusicId') || 'none');
    const bgMusicVolume = Number(formData.get('bgMusicVolume') || 0.3);

    if (sceneCount === 0) {
      return NextResponse.json({ error: '장면이 없습니다.' }, { status: 400 });
    }

    const scenePaths: string[] = [];

    // 각 장면: 이미지 + 오디오 → scene_N.mp4
    for (let i = 0; i < sceneCount; i++) {
      const imgFile = formData.get(`image_${i}`) as File | null;
      const audioFile = formData.get(`audio_${i}`) as File | null;
      const duration = Number(formData.get(`duration_${i}`) || 5);

      if (!imgFile) continue;

      const imgPath = join(tmpDir, `scene_${i}.jpg`);
      const outPath = join(tmpDir, `scene_${i}.mp4`);
      scenePaths.push(outPath);

      // 이미지 저장
      await writeFile(imgPath, Buffer.from(await imgFile.arrayBuffer()));

      if (audioFile) {
        // 이미지 + 오디오 → mp4
        const audioPath = join(tmpDir, `scene_${i}.mp3`);
        await writeFile(audioPath, Buffer.from(await audioFile.arrayBuffer()));

        await execAsync(
          `ffmpeg -y -loop 1 -i "${imgPath}" -i "${audioPath}" ` +
          `-c:v libx264 -tune stillimage -c:a aac -b:a 128k ` +
          `-pix_fmt yuv420p -shortest "${outPath}"`
        );
      } else {
        // 오디오 없음: 무음으로 N초짜리 생성
        await execAsync(
          `ffmpeg -y -loop 1 -i "${imgPath}" ` +
          `-f lavfi -i anullsrc=r=44100:cl=stereo ` +
          `-c:v libx264 -tune stillimage -c:a aac -b:a 128k ` +
          `-pix_fmt yuv420p -t ${duration} "${outPath}"`
        );
      }
    }

    if (scenePaths.length === 0) {
      return NextResponse.json({ error: '처리된 장면이 없습니다.' }, { status: 400 });
    }

    let finalPath = join(tmpDir, 'final.mp4');

    if (scenePaths.length === 1) {
      finalPath = scenePaths[0];
    } else {
      // concat list 생성
      const concatList = scenePaths.map(p => `file '${p}'`).join('\n');
      const listPath = join(tmpDir, 'concat.txt');
      await writeFile(listPath, concatList);

      const concatPath = join(tmpDir, 'concat.mp4');
      await execAsync(
        `ffmpeg -y -f concat -safe 0 -i "${listPath}" ` +
        `-c:v libx264 -c:a aac -pix_fmt yuv420p "${concatPath}"`
      );
      finalPath = concatPath;
    }

    // 배경음악 믹싱
    if (bgMusicId !== 'none') {
      const bgmPath = join(process.cwd(), 'public', 'bgm', `${bgMusicId}.mp3`);
      const withBgmPath = join(tmpDir, 'with_bgm.mp4');
      try {
        await execAsync(
          `ffmpeg -y -i "${finalPath}" -i "${bgmPath}" ` +
          `-filter_complex "[1:a]volume=${bgMusicVolume}[bgm];[0:a][bgm]amix=inputs=2:duration=first[a]" ` +
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
