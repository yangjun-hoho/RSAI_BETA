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
}

export interface ProjectSettings {
  bgMusicId: string;      // 'none' | 'upbeat' | 'calm' | 'dramatic'
  bgMusicVolume: number;  // 0~1
}

export const DEFAULT_SETTINGS: ProjectSettings = {
  bgMusicId: 'none',
  bgMusicVolume: 0.3,
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
