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

export type SubtitleAnimationType = 'none' | 'fadein' | 'slideup' | 'typing';

export const SUBTITLE_ANIMATION_OPTIONS: { id: SubtitleAnimationType; label: string }[] = [
  { id: 'none',    label: '없음' },
  { id: 'fadein',  label: '페이드인' },
  { id: 'slideup', label: '슬라이드업' },
  { id: 'typing',  label: '타이핑' },
];

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
  animation?: SubtitleAnimationType;
  animationDuration?: number; // 애니메이션 지속시간 (초)
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
  animation: 'none',
  animationDuration: 0.5,
};

export interface TtsSettings {
  model: 'tts-1' | 'gpt-4o-mini-tts' | 'gemini-2.5-flash-preview-tts';
  voice: string;
  speed: number;       // 0.25 ~ 4.0 (OpenAI 전용)
  format: 'mp3' | 'wav' | 'opus' | 'aac';
  instructions: string; // 감정/스타일 지시
}

export const DEFAULT_TTS: TtsSettings = {
  model: 'gemini-2.5-flash-preview-tts',
  voice: 'Aoede',
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
  // 볼륨 믹싱
  ttsVolume?: number;      // TTS 나레이션 볼륨 (0.0~2.0, 기본 1.0)
  sceneBgmVolume?: number; // 이 장면의 BGM 볼륨 (0.0~2.0, 기본 1.0)
  // 색보정
  colorBrightness?: number; // 밝기 (-100~100, 기본 0)
  colorContrast?: number;   // 대비 (-100~100, 기본 0)
  colorSaturation?: number; // 채도 (-100~100, 기본 0)
}

export type LogoPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

export interface OverlayItem {
  dataUrl: string;
  position: LogoPosition;
  customX: number | null;
  customY: number | null;
  opacity: number;    // 10~100
  width: number;      // % of canvas width
  height: number;     // % of canvas height
  sceneIds: string[] | null;  // null = all scenes
}

export const DEFAULT_OVERLAY_POSITIONS: LogoPosition[] = ['top-right', 'top-left', 'bottom-right'];

// 고정 로고 (프리셋 3종)
export interface FixedLogo {
  enabled: boolean;
  position: LogoPosition;
  customX: number | null;
  customY: number | null;
  opacity: number;  // 10~100
  size: number;     // % of canvas width
}

export const FIXED_LOGO_FILES = ['logo1.png', 'logo2.png', 'logo3.png'];
export const FIXED_LOGO_LABELS = ['로고 1', '로고 2', '로고 3'];
export const DEFAULT_FIXED_LOGO: FixedLogo = {
  enabled: false,
  position: 'top-right',
  customX: null,
  customY: null,
  opacity: 80,
  size: 15,
};

export interface ProjectSettings {
  bgMusicId: string;              // 'none' | 파일명
  bgMusicVolume: number;          // 0~1
  bgMusicFadeOut: boolean;        // 영상 끝에 BGM 페이드아웃
  bgMusicFadeOutDuration: number; // 페이드아웃 시간(초, 1~5)
  aspectRatio: '9:16' | '16:9';  // 종횡비
  overlays?: OverlayItem[];       // 사용자 오버레이 이미지 (최대 3개)
  fixedLogos?: FixedLogo[];       // 고정 로고 프리셋 (최대 3개)
}

export const DEFAULT_SETTINGS: ProjectSettings = {
  bgMusicId: 'none',
  bgMusicVolume: 0.3,
  bgMusicFadeOut: true,
  bgMusicFadeOutDuration: 3,
  aspectRatio: '9:16',
  overlays: [],
  fixedLogos: [{ ...DEFAULT_FIXED_LOGO }, { ...DEFAULT_FIXED_LOGO }, { ...DEFAULT_FIXED_LOGO }],
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

// Gemini 2.5 Flash Preview TTS 지원 보이스
export const VOICE_OPTIONS_GEMINI = [
  { id: 'Aoede',   label: 'Aoede (여성, 자연스러움)' },
  { id: 'Charon',  label: 'Charon (남성, 안정적)' },
  { id: 'Fenrir',  label: 'Fenrir (남성, 강렬함)' },
  { id: 'Kore',    label: 'Kore (여성, 차분함)' },
  { id: 'Leda',    label: 'Leda (여성, 밝음)' },
  { id: 'Orus',    label: 'Orus (남성, 깊음)' },
  { id: 'Puck',    label: 'Puck (남성, 경쾌함)' },
  { id: 'Zephyr',  label: 'Zephyr (여성, 부드러움)' },
];
