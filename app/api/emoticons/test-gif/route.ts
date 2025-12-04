import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';

interface TestGifRequest {
  imageUrl: string;
  frameCount: 3 | 4 | 5;
}

// 이미지 URL을 Buffer로 다운로드
async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// GIF 생성 (gifenc 사용 - 흰색 배경, 자동 팔레트)
async function createTestGif(imageBuffer: Buffer, frameCount: number): Promise<Buffer> {
  const width = 360;
  const height = 360;

  console.log(`🎨 Creating ${frameCount} test frames with gifenc...`);

  // GIF 인코더 생성
  const gif = GIFEncoder();

  // 각도 배열 (간단한 흔들림 효과)
  const rotations = frameCount === 3
    ? [0, 5, 0]
    : frameCount === 4
    ? [0, 5, 0, -5]
    : [0, 5, 0, -5, 0];

  for (let i = 0; i < frameCount; i++) {
    const rotation = rotations[i];
    console.log(`  Frame ${i + 1}: rotation ${rotation}°`);

    // 1. 흰색 배경 생성
    const whiteBackground = await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    })
      .png()
      .toBuffer();

    // 2. 원본 이미지 회전 및 리사이즈
    const transformed = await sharp(imageBuffer)
      .rotate(rotation, { background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .resize(width, height, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .toBuffer();

    // 3. 흰색 배경 위에 합성
    const composited = await sharp(whiteBackground)
      .composite([{ input: transformed, blend: 'over' }])
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .png()
      .toBuffer();

    // 4. RGBA 데이터로 변환 (gifenc는 RGBA 필요)
    const { data, info } = await sharp(composited)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    console.log(`  Frame ${i + 1}: ${data.length} bytes RGBA data, ${info.channels} channels`);

    // 5. 팔레트 생성 및 적용
    const palette = quantize(data, 256); // 256색 팔레트 생성
    const index = applyPalette(data, palette); // 인덱스 이미지로 변환

    console.log(`  Palette: ${palette.length / 3} colors`);

    // 6. GIF 프레임 추가
    gif.writeFrame(index, width, height, {
      palette,
      delay: 200, // 200ms
    });

    console.log(`  ✅ Frame ${i + 1} added to GIF`);
  }

  // 7. GIF 종료 및 버퍼 반환
  gif.finish();
  const buffer = Buffer.from(gif.bytes());

  console.log(`🎉 gifenc GIF created: ${buffer.length} bytes`);

  return buffer;
}

export async function POST(request: NextRequest) {
  try {
    const body: TestGifRequest = await request.json();
    const { imageUrl, frameCount } = body;

    console.log('🧪 TEST GIF MODE STARTED');
    console.log(`Image URL: ${imageUrl}`);
    console.log(`Frame count: ${frameCount}`);

    if (!imageUrl || !frameCount) {
      return NextResponse.json(
        { error: 'Missing required fields: imageUrl, frameCount' },
        { status: 400 }
      );
    }

    // 1. 이미지 다운로드
    console.log('📥 Downloading image...');
    const imageBuffer = await downloadImage(imageUrl);
    console.log(`✅ Downloaded: ${imageBuffer.length} bytes`);

    // 2. 테스트 GIF 생성 (간단한 회전 애니메이션)
    const gifBuffer = await createTestGif(imageBuffer, frameCount);

    // 3. GIF 반환
    return new NextResponse(new Uint8Array(gifBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Content-Disposition': 'attachment; filename="test-emoticon.gif"',
        'Content-Length': gifBuffer.length.toString(),
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error: any) {
    console.error('❌ Test GIF generation failed:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to generate test GIF',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}
