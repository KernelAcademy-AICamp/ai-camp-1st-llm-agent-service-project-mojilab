/**
 * Image Trace 유틸리티
 * 일러스트레이터의 Image Trace와 유사한 기능 제공
 */

export interface TraceOptions {
  // 프리셋
  preset?: 'default' | 'posterized' | 'curvy' | 'sharp' | 'detailed' | 'smoothed' | 'grayscale' | 'fixedpalette' | 'randomsampling' | 'artistic';

  // 선/라인아트용 설정
  lineArt?: boolean;

  // 색상 수 (2 = 흑백)
  numberofcolors?: number;

  // 최소 영역 크기 (노이즈 제거)
  mincolorratio?: number;

  // 곡선 부드러움 (0-1)
  ltres?: number;  // Line threshold
  qtres?: number;  // Quadratic spline threshold

  // 패스 최적화
  pathomit?: number;  // 이 크기보다 작은 패스 생략

  // 블러 (노이즈 제거용)
  blurradius?: number;
  blurdelta?: number;
}

// 일러스트레이터 스타일 프리셋
export const TRACE_PRESETS = {
  // 펜/잉크 드로잉용 - 깔끔한 선
  lineArt: {
    numberofcolors: 2,
    mincolorratio: 0,
    colorquantcycles: 1,
    ltres: 0.1,
    qtres: 1,
    pathomit: 8,
    blurradius: 0,
    blurdelta: 20,
    strokewidth: 1,
    linefilter: true,
    desc: false,
    rightangleenhance: true,
  },

  // 스케치/연필 드로잉용
  sketch: {
    numberofcolors: 4,
    mincolorratio: 0.02,
    colorquantcycles: 3,
    ltres: 1,
    qtres: 1,
    pathomit: 4,
    blurradius: 2,
    blurdelta: 40,
    strokewidth: 0,
    linefilter: false,
    desc: false,
  },

  // 디테일 유지
  detailed: {
    numberofcolors: 16,
    mincolorratio: 0,
    colorquantcycles: 3,
    ltres: 0.5,
    qtres: 0.5,
    pathomit: 0,
    blurradius: 0,
    blurdelta: 20,
    strokewidth: 0,
    linefilter: false,
    desc: false,
  },

  // 포스터화 (단순한 컬러)
  posterized: {
    numberofcolors: 8,
    mincolorratio: 0.05,
    colorquantcycles: 3,
    ltres: 1,
    qtres: 1,
    pathomit: 8,
    blurradius: 4,
    blurdelta: 64,
    strokewidth: 0,
    linefilter: false,
    desc: false,
  },

  // 부드러운 곡선
  smooth: {
    numberofcolors: 8,
    mincolorratio: 0.02,
    colorquantcycles: 3,
    ltres: 2,
    qtres: 2,
    pathomit: 8,
    blurradius: 5,
    blurdelta: 64,
    strokewidth: 0,
    linefilter: false,
    desc: false,
    roundcoords: 2,
  },
};

/**
 * 이미지를 선(Line)과 배경(Fill)으로 분리
 * 일러스트레이터의 "확장(Expand)" 기능과 유사
 * imagetracerjs 없이 순수 Canvas API로 구현
 */
export async function separateLineAndFill(
  canvas: HTMLCanvasElement,
  threshold: number = 200
): Promise<{ lineCanvas: HTMLCanvasElement; fillCanvas: HTMLCanvasElement }> {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot get canvas context');

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { width, height, data } = imageData;

  // 선 레이어용 캔버스
  const lineCanvas = document.createElement('canvas');
  lineCanvas.width = width;
  lineCanvas.height = height;
  const lineCtx = lineCanvas.getContext('2d')!;
  const lineImageData = lineCtx.createImageData(width, height);

  // 배경/채우기 레이어용 캔버스
  const fillCanvas = document.createElement('canvas');
  fillCanvas.width = width;
  fillCanvas.height = height;
  const fillCtx = fillCanvas.getContext('2d')!;
  const fillImageData = fillCtx.createImageData(width, height);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // 밝기 계산 (가중 평균)
    const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

    if (a === 0) {
      // 완전 투명 픽셀은 둘 다 투명
      continue;
    }

    // 안티앨리어싱 레벨 3 스타일: 대부분 선명하고 가장자리만 살짝 부드럽게
    if (brightness < threshold) {
      // 가장자리 그라데이션 범위 (threshold의 15%만 그라데이션)
      const gradientRange = threshold * 0.15;
      const coreThreshold = threshold - gradientRange;

      let lineAlpha: number;
      if (brightness < coreThreshold) {
        // 선의 중심부: 완전 불투명
        lineAlpha = a;
      } else {
        // 가장자리: 얇은 그라데이션
        lineAlpha = Math.round((threshold - brightness) / gradientRange * a);
      }

      lineImageData.data[i] = 0;
      lineImageData.data[i + 1] = 0;
      lineImageData.data[i + 2] = 0;
      lineImageData.data[i + 3] = lineAlpha;
    }
    // 배경 픽셀은 투명 유지
  }

  lineCtx.putImageData(lineImageData, 0, 0);
  fillCtx.putImageData(fillImageData, 0, 0);

  return { lineCanvas, fillCanvas };
}

/**
 * 캔버스/이미지를 SVG로 벡터화
 * imagetracerjs를 dynamic import로 로드
 */
export async function traceToSVG(
  canvas: HTMLCanvasElement,
  preset: keyof typeof TRACE_PRESETS = 'lineArt'
): Promise<string> {
  // Dynamic import for client-side only
  // @ts-ignore
  const ImageTracer = (await import('imagetracerjs')).default;

  const options = TRACE_PRESETS[preset];

  // ImageData 가져오기
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot get canvas context');

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // imagetracerjs 형식으로 변환
  const imgd = {
    width: imageData.width,
    height: imageData.height,
    data: imageData.data,
  };

  // SVG 문자열 생성
  const svgstr = ImageTracer.imagedataToSVG(imgd, options);

  return svgstr;
}

/**
 * SVG 문자열을 Canvas에 렌더링
 */
export async function svgToCanvas(
  svgString: string,
  width: number,
  height: number
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Cannot get canvas context'));
      return;
    }

    const img = new Image();
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG'));
    };

    img.src = url;
  });
}

/**
 * 레이어 색상 변경 (알파 유지)
 * 모든 픽셀의 RGB를 지정된 색상으로 변경하고 알파는 유지
 */
export function recolorLayer(
  canvas: HTMLCanvasElement,
  hexColor: string
): HTMLCanvasElement {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot get canvas context');

  // hex to RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];

    // 투명하지 않은 픽셀만 색상 변경
    if (a > 0) {
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      // alpha는 유지
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/**
 * 선만 추출하여 깔끔한 벡터로 변환
 */
export async function traceLines(
  canvas: HTMLCanvasElement,
  options?: {
    threshold?: number;
    smoothness?: number;
    minPathSize?: number;
  }
): Promise<{ svgString: string; lineCanvas: HTMLCanvasElement }> {
  // Dynamic import for client-side only
  // @ts-ignore
  const ImageTracer = (await import('imagetracerjs')).default;

  const { threshold = 200, smoothness = 1, minPathSize = 8 } = options || {};

  // 1. 먼저 선만 추출 (래스터)
  const { lineCanvas } = await separateLineAndFill(canvas, threshold);

  // 2. 선을 벡터화
  const traceOptions = {
    ...TRACE_PRESETS.lineArt,
    ltres: smoothness,
    qtres: smoothness,
    pathomit: minPathSize,
  };

  const lineCtx = lineCanvas.getContext('2d')!;
  const imageData = lineCtx.getImageData(0, 0, lineCanvas.width, lineCanvas.height);

  const imgd = {
    width: imageData.width,
    height: imageData.height,
    data: imageData.data,
  };

  const svgString = ImageTracer.imagedataToSVG(imgd, traceOptions);

  return { svgString, lineCanvas };
}
