# 숏폼 에디터 설계 문서

## 1. 개요

이미지 + 나레이션(TTS) + 배경음악을 조합하여 9:16 숏폼 영상(MP4)을 제작하는 도구.
남양주시 내부망(HTTP) 온프레미스 서버 환경에 최적화된 설계.

---

## 2. 핵심 설계 원칙

| 항목 | 결정 | 이유 |
|------|------|------|
| 렌더링 위치 | 서버사이드 FFmpeg | HTTP 환경에서 FFmpeg.wasm의 SharedArrayBuffer 미지원 |
| 프로젝트 저장 | 클라이언트 IndexedDB | 서버 디스크 부담 없음, 영구 저장 불필요 |
| 자막 합성 | 클라이언트 Canvas | 서버에 한국어 폰트 설치 불필요 |
| 임시 파일 | /tmp 처리 후 즉시 삭제 | 서버 저장소 무부하 |
| 출력 비율 | 9:16 (1080×1920) | 숏폼(Reels, Shorts, TikTok) 표준 |

---

## 3. 폴더 구조

```
lib/shortform-editor/           ← 기능 전체 (삭제 시 이 폴더만 제거)
  types.ts                      ← 공통 타입 정의
  hooks/
    useIndexedDB.ts             ← IndexedDB 저장/불러오기
    useScenes.ts                ← 장면 상태 관리 (CRUD)
  components/
    CropTool.tsx                ← 9:16 크롭 팝업 (드래그 + 줌)
    SceneCard.tsx               ← 장면 카드 (이미지/대본/TTS)
    SceneList.tsx               ← 좌측 장면 목록 패널
    PreviewPanel.tsx            ← 우측 미리보기 + 설정 패널

app/shortform-editor/
  page.tsx                      ← 메인 페이지 (렌더링 파이프라인 포함)

app/api/shortform-editor/
  tts/route.ts                  ← OpenAI TTS API 중계
  render/route.ts               ← FFmpeg 영상 렌더링

public/bgm/                     ← 배경음악 mp3 파일 (수동 추가)
  upbeat.mp3
  calm.mp3
  dramatic.mp3
```

### 완전 삭제 방법

```bash
rm -rf lib/shortform-editor/
rm -rf app/shortform-editor/
rm -rf app/api/shortform-editor/
```

---

## 4. 데이터 구조

### Scene

```typescript
interface Scene {
  id: string;
  imageDataUrl: string | null;  // 원본 이미지 (base64 data URL)
  imageWidth: number;           // 원본 이미지 픽셀 너비
  imageHeight: number;          // 원본 이미지 픽셀 높이
  crop: CropData | null;        // null이면 자동 중앙 9:16 크롭
  script: string;               // 대본 (TTS 입력 텍스트)
  audioDataUrl: string | null;  // TTS 결과 오디오 (base64 data URL)
  audioDuration: number;        // 초 단위 (기본 5초)
  subtitle: SubtitleStyle;
}
```

### CropData

```typescript
interface CropData {
  x: number;      // 크롭 시작 X (원본 이미지 픽셀)
  y: number;      // 크롭 시작 Y (원본 이미지 픽셀)
  width: number;  // 크롭 너비 (픽셀)
  height: number; // 크롭 높이 (픽셀) — 항상 width * 16/9
}
```

### SubtitleStyle

```typescript
interface SubtitleStyle {
  enabled: boolean;
  font: string;           // 예: '나눔고딕'
  color: string;          // 예: '#ffffff'
  size: number;           // pt 기준 (20~80)
  borderWidth: number;    // 테두리 두께 (0~8)
  borderColor: string;    // 테두리 색
  position: 'top' | 'center' | 'bottom';
}
```

### ProjectSettings

```typescript
interface ProjectSettings {
  bgMusicId: string;      // 'none' | 'upbeat' | 'calm' | 'dramatic'
  bgMusicVolume: number;  // 0.0 ~ 1.0
}
```

---

## 5. 사용자 경험 흐름

```
1. 진입
   /shortform-editor 접속
   → IndexedDB에 저장된 프로젝트 자동 복원
   → 없으면 빈 장면 #1 생성

2. 장면 구성 (반복)
   이미지 업로드 → 대본 입력 → 음성 생성
   → 장면 추가 → 반복

3. 크롭 조정
   썸네일 클릭 → 크롭 팝업
   → 9:16 박스 드래그로 영역 선택
   → 줌 슬라이더로 확대/축소
   → 적용 또는 모든 장면에 적용

4. 나레이션 생성
   장면별: 카드의 '음성 생성' 버튼
   일괄: 상단 '일괄 음성 생성' 버튼
   → OpenAI TTS API → audio data URL 저장

5. 미리보기
   우측 패널: 선택 장면의 9:16 크롭 + 자막 미리보기
   자막 스타일 실시간 조정
   배경음악 선택 + 볼륨 조절

6. 렌더링
   '영상 렌더링' 버튼
   → 클라이언트: Canvas로 합성 이미지 생성 (크롭 + 자막 소성)
   → 서버: FFmpeg으로 scene별 mp4 생성 → 전체 concat → BGM 믹싱
   → MP4 다운로드
```

---

## 6. 렌더링 파이프라인

### 클라이언트 전처리 (page.tsx: buildCompositeBlob)

```
원본 이미지 (imageDataUrl)
  → Canvas 1080×1920 생성
  → CropData 기준으로 이미지 크롭하여 Canvas에 그리기
  → 자막 텍스트 Canvas에 오버레이
  → canvas.toBlob() → JPEG blob
```

자막을 클라이언트에서 합성함으로써 서버의 한국어 폰트 의존성을 제거.

### 서버 처리 (render/route.ts)

```
FormData 수신
  scene_0_image.jpg + scene_0_audio.mp3 → ffmpeg → scene_0.mp4
  scene_1_image.jpg + scene_1_audio.mp3 → ffmpeg → scene_1.mp4
  ...
  concat.txt → ffmpeg → concat.mp4
  (BGM 선택 시) concat.mp4 + bgm.mp3 → ffmpeg → with_bgm.mp4
  → 결과 MP4 바이너리 반환
  → /tmp/{session}/ 디렉토리 즉시 삭제
```

### FFmpeg 명령어

**장면 생성 (이미지 + 오디오):**
```bash
ffmpeg -y -loop 1 -i scene_N.jpg -i scene_N.mp3 \
  -c:v libx264 -tune stillimage -c:a aac -b:a 128k \
  -pix_fmt yuv420p -shortest scene_N.mp4
```

**장면 생성 (이미지 + 무음):**
```bash
ffmpeg -y -loop 1 -i scene_N.jpg \
  -f lavfi -i anullsrc=r=44100:cl=stereo \
  -c:v libx264 -tune stillimage -c:a aac -b:a 128k \
  -pix_fmt yuv420p -t {duration} scene_N.mp4
```

**전체 합치기:**
```bash
ffmpeg -y -f concat -safe 0 -i concat.txt \
  -c:v libx264 -c:a aac -pix_fmt yuv420p concat.mp4
```

**BGM 믹싱:**
```bash
ffmpeg -y -i concat.mp4 -i bgm.mp3 \
  -filter_complex "[1:a]volume=0.3[bgm];[0:a][bgm]amix=inputs=2:duration=first[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac with_bgm.mp4
```

---

## 7. 서버 설치 요구사항 (Rocky Linux)

### FFmpeg 설치

```bash
sudo dnf install -y epel-release
sudo dnf install -y --nogpgcheck \
  https://mirrors.rpmfusion.org/free/el/rpmfusion-free-release-$(rpm -E %rhel).noarch.rpm
sudo dnf install -y ffmpeg ffmpeg-devel

# 설치 확인
ffmpeg -version
```

### 배경음악 파일 추가

```bash
# 프로젝트 루트에서
mkdir -p public/bgm
# 아래 파일을 직접 추가 (저작권 없는 MP3)
# public/bgm/upbeat.mp3
# public/bgm/calm.mp3
# public/bgm/dramatic.mp3
```

---

## 8. API

### POST /api/shortform-editor/tts

나레이션 음성 생성.

**Request (JSON):**
```json
{
  "text": "대본 내용",
  "voice": "nova",
  "speed": 1.0
}
```

**Response:** `audio/mpeg` 바이너리

**voice 옵션:** alloy, echo, fable, onyx, nova, shimmer

---

### POST /api/shortform-editor/render

영상 렌더링. `multipart/form-data` 형식.

**FormData 필드:**

| 필드 | 타입 | 설명 |
|------|------|------|
| sceneCount | string | 총 장면 수 |
| bgMusicId | string | 'none' \| 'upbeat' \| 'calm' \| 'dramatic' |
| bgMusicVolume | string | 0.0 ~ 1.0 |
| image_{i} | File (JPEG) | i번째 장면 합성 이미지 (1080×1920) |
| audio_{i} | File (MP3) | i번째 장면 나레이션 (없으면 생략) |
| duration_{i} | string | i번째 장면 길이 (초) |

**Response:** `video/mp4` 바이너리

---

## 9. 스토리지 전략

| 데이터 | 저장 위치 | 생명주기 |
|--------|-----------|---------|
| 프로젝트 (이미지 + 오디오 + 설정) | 브라우저 IndexedDB | 사용자가 초기화하기 전까지 유지 |
| 렌더링 임시 파일 | 서버 /tmp/{session}/ | 렌더링 완료 즉시 삭제 |
| 배경음악 | public/bgm/ (정적 파일) | 영구 |
| 최종 MP4 | 사용자 로컬 다운로드 | 서버 저장 없음 |

---

## 10. 향후 추가 가능 기능

| 기능 | 난이도 | 설명 |
|------|--------|------|
| Ken Burns 효과 | 중 | 시작/끝 크롭 좌표 설정 → FFmpeg zoompan 필터 |
| 장면 전환 효과 | 중 | FFmpeg xfade 필터 (fade, slide 등) |
| BGM 자동 페이드아웃 | 하 | FFmpeg afade 필터 |
| 자막 애니메이션 | 상 | 프레임별 Canvas 렌더링 필요 |
| 다중 해상도 출력 | 하 | FFmpeg scale 필터 옵션 추가 |
| 프로젝트 내보내기/가져오기 | 하 | IndexedDB 데이터 JSON 파일로 export/import |
