// 장면 전환 효과
export type TransitionType =
  'none' | 'fade' | 'fadeblack' | 'fadewhite' | 'dissolve' |
  'wipeleft' | 'wiperight' | 'wipeup' | 'wipedown' |
  'slideleft' | 'slideright' | 'slideup' | 'slidedown' |
  'smoothleft' | 'smoothright' | 'zoomin' | 'radial' | 'pixelize';

export interface Transition {
  type: TransitionType;
  duration: number; // 초 (0.2 ~ 1.5)
}

export const DEFAULT_TRANSITION: Transition = { type: 'none', duration: 0.5 };

export const TRANSITION_OPTIONS: { id: TransitionType; label: string }[] = [
  { id: 'none',        label: '없음 (컷)' },
  { id: 'fade',        label: '페이드' },
  { id: 'fadeblack',   label: '검정 페이드' },
  { id: 'fadewhite',   label: '흰색 페이드' },
  { id: 'dissolve',    label: '디졸브' },
  { id: 'wipeleft',    label: '와이프 ←' },
  { id: 'wiperight',   label: '와이프 →' },
  { id: 'wipeup',      label: '와이프 ↑' },
  { id: 'wipedown',    label: '와이프 ↓' },
  { id: 'slideleft',   label: '슬라이드 ←' },
  { id: 'slideright',  label: '슬라이드 →' },
  { id: 'slideup',     label: '슬라이드 ↑' },
  { id: 'slidedown',   label: '슬라이드 ↓' },
  { id: 'smoothleft',  label: '부드러운 ←' },
  { id: 'smoothright', label: '부드러운 →' },
  { id: 'zoomin',      label: '줌인' },
  { id: 'radial',      label: '방사형' },
  { id: 'pixelize',    label: '픽셀화' },
];

// 9:16 크롭 영역 (원본 이미지 픽셀 기준)
export interface CropData {
  x: number;      // 크롭 시작 X (픽셀)
  y: number;      // 크롭 시작 Y (픽셀)
  width: number;  // 크롭 너비 (픽셀)
  height: number; // 크롭 높이 (픽셀, = width * 16/9)
}

export interface SubtitleStyle {
  enabled: boolean;
  font: string;
  color: string;
  size: number;
  borderWidth: number;
  borderColor: string;
  position: 'top' | 'center' | 'bottom';
  customY: number | null;  // 0~100 (캔버스 높이 %) - null이면 position 사용
  customX: number | null;  // 0~100 (캔버스 너비 %) - null이면 중앙(50)
}

export const DEFAULT_SUBTITLE: SubtitleStyle = {
  enabled: true,
  font: '나눔고딕',
  color: '#ffffff',
  size: 40,
  borderWidth: 3,
  borderColor: '#000000',
  position: 'bottom',
  customY: null,
  customX: null,
};

export interface TtsSettings {
  model: 'tts-1' | 'gpt-4o-mini-tts';
  voice: string;
  speed: number;       // 0.25 ~ 4.0
  format: 'mp3' | 'wav' | 'opus' | 'aac';
  instructions: string; // 감정/스타일 지시 (gpt-4o-mini-tts 전용)
}

export const DEFAULT_TTS: TtsSettings = {
  model: 'gpt-4o-mini-tts',
  voice: 'nova',
  speed: 1.0,
  format: 'mp3',
  instructions: '',
};

// 장면 내 동작 효과 (줌/패닝)
export type MotionEffectType =
  'none' | 'zoomin' | 'zoomout' | 'panleft' | 'panright' | 'kenburns' |
  'zoomin-fast' | 'zoomout-fast' | 'panleft-fast' | 'panright-fast';

export const MOTION_EFFECT_OPTIONS: { id: MotionEffectType; label: string }[] = [
  { id: 'none',          label: '없음' },
  { id: 'zoomin',        label: '줌인 (중앙 기준 1.0→1.3배 서서히 확대)' },
  { id: 'zoomout',       label: '줌아웃 (중앙 기준 1.3→1.0배 서서히 축소)' },
  { id: 'panleft',       label: '좌→우 패닝 (1.2배 고정, 왼쪽에서 오른쪽으로 이동)' },
  { id: 'panright',      label: '우→좌 패닝 (1.2배 고정, 오른쪽에서 왼쪽으로 이동)' },
  { id: 'kenburns',      label: '켄번즈 (1.0→1.25배 확대 + 좌→우 패닝 동시)' },
  { id: 'zoomin-fast',   label: '빠른 줌인 (중앙 기준 1.0→1.6배 빠르게 확대)' },
  { id: 'zoomout-fast',  label: '빠른 줌아웃 (중앙 기준 1.6→1.0배 빠르게 축소)' },
  { id: 'panleft-fast',  label: '빠른 좌→우 패닝 (1.5배 고정, 빠르게 이동)' },
  { id: 'panright-fast', label: '빠른 우→좌 패닝 (1.5배 고정, 빠르게 이동)' },
];

export interface Scene {
  id: string;
  imageDataUrl: string | null;  // 원본 이미지 (data URL)
  imageWidth: number;
  imageHeight: number;
  crop: CropData | null;        // null = 자동 중앙 크롭
  script: string;               // 대본
  audioDataUrl: string | null;  // TTS 결과 오디오 (data URL)
  audioDuration: number;        // 초 (기본 5초)
  subtitle: SubtitleStyle;
  tts: TtsSettings;
  transition: Transition;       // 다음 장면으로 넘어갈 때 효과 (마지막 장면은 무시됨)
  motionEffect: MotionEffectType; // 장면 내 동작 효과
}

export interface ProjectSettings {
  bgMusicId: string;              // 'none' | 'upbeat' | 'calm' | 'dramatic'
  bgMusicVolume: number;          // 0~1
  bgMusicFadeOut: boolean;        // 영상 끝에 BGM 페이드아웃
  bgMusicFadeOutDuration: number; // 페이드아웃 시간(초, 1~5)
}

export const DEFAULT_SETTINGS: ProjectSettings = {
  bgMusicId: 'none',
  bgMusicVolume: 0.3,
  bgMusicFadeOut: true,
  bgMusicFadeOutDuration: 3,
};

export const BGM_OPTIONS = [
  { id: 'none',     label: '없음' },
  { id: 'upbeat',   label: '경쾌한 배경음악', file: '/bgm/upbeat.mp3' },
  { id: 'calm',     label: '잔잔한 배경음악', file: '/bgm/calm.mp3' },
  { id: 'dramatic', label: '웅장한 배경음악', file: '/bgm/dramatic.mp3' },
];

export const FONT_OPTIONS = [
  '나눔고딕', '나눔명조', '맑은 고딕', '굴림', 'Arial', 'Impact',
];

// tts-1 지원 보이스
export const VOICE_OPTIONS_TTS1 = [
  { id: 'alloy',   label: 'Alloy (중성)' },
  { id: 'echo',    label: 'Echo (남성)' },
  { id: 'fable',   label: 'Fable (따뜻함)' },
  { id: 'onyx',    label: 'Onyx (깊은 남성)' },
  { id: 'nova',    label: 'Nova (여성)' },
  { id: 'shimmer', label: 'Shimmer (밝은 여성)' },
];

// gpt-4o-mini-tts 지원 보이스 (확장)
export const VOICE_OPTIONS_MINI_TTS = [
  { id: 'alloy',   label: 'Alloy (중성)' },
  { id: 'ash',     label: 'Ash (차분한 남성)' },
  { id: 'ballad',  label: 'Ballad (서정적)' },
  { id: 'coral',   label: 'Coral (친근한 여성)' },
  { id: 'echo',    label: 'Echo (남성)' },
  { id: 'fable',   label: 'Fable (따뜻함)' },
  { id: 'nova',    label: 'Nova (여성)' },
  { id: 'onyx',    label: 'Onyx (깊은 남성)' },
  { id: 'sage',    label: 'Sage (지적인 여성)' },
  { id: 'shimmer', label: 'Shimmer (밝은 여성)' },
];

export const FORMAT_OPTIONS = [
  { id: 'mp3',  label: 'MP3 (권장)' },
  { id: 'wav',  label: 'WAV (무손실)' },
  { id: 'opus', label: 'Opus (경량)' },
  { id: 'aac',  label: 'AAC' },
];
