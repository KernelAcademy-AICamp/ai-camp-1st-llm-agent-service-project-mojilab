export interface TextSticker {
  id: string;
  text: string;
  fontSize: number;
  fontFamily: string;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  fontWeight?: string | number;
  shadow?: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
}

export const textStickers: TextSticker[] = [
  // 기본 스티커
  {
    id: 'sticker-1',
    text: '좋아요 👍',
    fontSize: 48,
    fontFamily: 'Noto Sans KR',
    fill: '#FF6B6B',
    fontWeight: 'bold',
  },
  {
    id: 'sticker-2',
    text: '사랑해 💕',
    fontSize: 48,
    fontFamily: 'Noto Sans KR',
    fill: '#FF69B4',
    fontWeight: 'bold',
  },
  {
    id: 'sticker-3',
    text: '화이팅 💪',
    fontSize: 48,
    fontFamily: 'Noto Sans KR',
    fill: '#4ECDC4',
    fontWeight: 'bold',
  },
  {
    id: 'sticker-4',
    text: 'ㅋㅋㅋ',
    fontSize: 56,
    fontFamily: 'Noto Sans KR',
    fill: '#FFD93D',
    stroke: '#333',
    strokeWidth: 2,
    fontWeight: 'bold',
  },
  {
    id: 'sticker-5',
    text: '고마워 🙏',
    fontSize: 44,
    fontFamily: 'Noto Sans KR',
    fill: '#95E1D3',
    fontWeight: 'bold',
  },
  {
    id: 'sticker-6',
    text: '축하해 🎉',
    fontSize: 48,
    fontFamily: 'Noto Sans KR',
    fill: '#F38181',
    fontWeight: 'bold',
  },
  {
    id: 'sticker-7',
    text: '미안해 😢',
    fontSize: 44,
    fontFamily: 'Noto Sans KR',
    fill: '#A8DADC',
    fontWeight: 'bold',
  },
  {
    id: 'sticker-8',
    text: '힘내 ✨',
    fontSize: 48,
    fontFamily: 'Noto Sans KR',
    fill: '#FFB6C1',
    fontWeight: 'bold',
  },
  // 그림자 효과 스티커
  {
    id: 'sticker-9',
    text: 'OK!',
    fontSize: 64,
    fontFamily: 'Arial Black',
    fill: '#FFFFFF',
    stroke: '#000000',
    strokeWidth: 4,
    fontWeight: 'bold',
    shadow: {
      color: 'rgba(0,0,0,0.3)',
      blur: 10,
      offsetX: 5,
      offsetY: 5,
    },
  },
  {
    id: 'sticker-10',
    text: 'WOW',
    fontSize: 64,
    fontFamily: 'Arial Black',
    fill: '#FF6B6B',
    stroke: '#FFFFFF',
    strokeWidth: 3,
    fontWeight: 'bold',
    shadow: {
      color: 'rgba(0,0,0,0.5)',
      blur: 8,
      offsetX: 3,
      offsetY: 3,
    },
  },
  // 귀여운 스타일
  {
    id: 'sticker-11',
    text: '♡ 러브 ♡',
    fontSize: 40,
    fontFamily: 'Noto Sans KR',
    fill: '#FFB6D9',
    fontWeight: 'bold',
  },
  {
    id: 'sticker-12',
    text: '☆ 최고 ☆',
    fontSize: 44,
    fontFamily: 'Noto Sans KR',
    fill: '#FFD700',
    stroke: '#FF6347',
    strokeWidth: 2,
    fontWeight: 'bold',
  },
];
