import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import sharp from 'sharp';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface GenerateGifRequest {
  referenceImageUrl: string;
  action: string;
  frameCount: 3 | 4 | 5;
}

// 액션별 프레임별 프롬프트 생성
function getFramePrompt(action: string, frameIndex: number, totalFrames: number): string {
  const framePosition = frameIndex / (totalFrames - 1); // 0.0 ~ 1.0

  let animationDescription = '';

  switch (action) {
    case 'sparkle':
      // 반짝임 효과: 크기 변화와 밝기
      if (frameIndex === 0) {
        animationDescription = 'normal size, ready to sparkle';
      } else if (frameIndex === totalFrames - 1) {
        animationDescription = 'back to normal size';
      } else {
        const scale = 1 + Math.sin(framePosition * Math.PI) * 0.15; // 최대 15% 커짐
        animationDescription = `slightly scaled up (${Math.round(scale * 100)}%), glowing, sparkling effect`;
      }
      break;

    case 'shake':
      // 흔들림 효과: 좌우 이동
      const angle = Math.sin(framePosition * Math.PI * 2) * 10; // -10 ~ +10도
      if (angle > 5) {
        animationDescription = 'tilted slightly to the right';
      } else if (angle < -5) {
        animationDescription = 'tilted slightly to the left';
      } else {
        animationDescription = 'centered, straight position';
      }
      break;

    case 'bounce':
      // 통통 튀기: 위아래 이동
      const bounce = Math.abs(Math.sin(framePosition * Math.PI)) * 20; // 0~20px 위로
      if (bounce > 10) {
        animationDescription = 'jumping up, lifted position, excited';
      } else {
        animationDescription = 'landing down, lower position';
      }
      break;

    default:
      // 커스텀 액션: 프레임 진행도에 따라
      const progress = Math.round(framePosition * 100);
      animationDescription = `${action} (${progress}% progress through the animation)`;
      break;
  }

  return animationDescription;
}

// 이미지 URL을 base64로 변환
async function imageUrlToBase64(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString('base64');
}

// GIF 생성 (gifenc 사용 - 흰색 배경, 자동 팔레트)
async function createGif(frameBuffers: Buffer[], width: number, height: number): Promise<Buffer> {
  console.log(`🎨 Creating GIF with ${frameBuffers.length} frames using gifenc...`);

  // GIF 인코더 생성
  const gif = GIFEncoder();

  // 각 프레임을 RGBA 픽셀 데이터로 변환하여 추가
  for (let i = 0; i < frameBuffers.length; i++) {
    console.log(`  Adding frame ${i + 1}/${frameBuffers.length} to GIF encoder...`);

    // PNG를 RGBA raw 데이터로 변환 (흰색 배경 이미 합성되어 있음)
    const { data, info } = await sharp(frameBuffers[i])
      .ensureAlpha() // RGBA 4채널 유지
      .raw()
      .toBuffer({ resolveWithObject: true });

    console.log(`  Frame ${i + 1} size: ${info.width}x${info.height}, channels: ${info.channels}`);

    // 팔레트 생성 및 적용
    const palette = quantize(data, 256); // 256색 팔레트 생성
    const index = applyPalette(data, palette); // 인덱스 이미지로 변환

    console.log(`  Palette: ${palette.length / 3} colors`);

    // GIF 프레임 추가
    gif.writeFrame(index, width, height, {
      palette,
      delay: 200, // 200ms
    });

    console.log(`  ✅ Frame ${i + 1} added to GIF`);
  }

  // GIF 종료 및 버퍼 반환
  gif.finish();
  const buffer = Buffer.from(gif.bytes());

  console.log(`🎉 gifenc GIF created: ${buffer.length} bytes`);

  return buffer;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateGifRequest = await request.json();
    const { referenceImageUrl, action, frameCount } = body;

    // 유효성 검사
    if (!referenceImageUrl || !action || !frameCount) {
      return NextResponse.json(
        { error: 'Missing required fields: referenceImageUrl, action, frameCount' },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured' },
        { status: 500 }
      );
    }

    console.log(`🎬 Starting GIF generation with ${frameCount} frames...`);
    console.log(`Action: ${action}`);

    // 1. 참조 이미지 다운로드 및 base64 변환
    console.log('📥 Downloading reference image...');
    const referenceBase64 = await imageUrlToBase64(referenceImageUrl);

    // 2. Gemini로 각 프레임 생성
    const imageModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image' });
    const frameBuffers: Buffer[] = [];

    for (let i = 0; i < frameCount; i++) {
      console.log(`🖼️ Generating frame ${i + 1}/${frameCount}...`);

      const animationDescription = getFramePrompt(action, i, frameCount);

      const prompt = `MIMIC THE EXACT STYLE: Copy the reference image's art style, character design, and aesthetic perfectly.

ANIMATION FRAME ${i + 1}/${frameCount}:
${animationDescription}

CRITICAL REQUIREMENTS:
- Same character face, body shape, proportions, and colors as reference
- Same art style (line thickness, drawing technique, texture)
- Apply the animation state: ${animationDescription}
- Keep character design IDENTICAL to reference except for the animation
- Korean sticker style: simple, clear, expressive
- 360x360px format
- Character only - isolated, minimal background
- NO TRANSPARENCY ANYWHERE - all areas must be filled with solid colors

BACKGROUND REQUIREMENTS:
- MANDATORY: SOLID WHITE BACKGROUND (#FFFFFF) filling entire 360x360 canvas
- If character has outline/line art, fill interior with WHITE (not transparent)
- Character outline on white background
- No transparent pixels anywhere in the image
- Character should be clearly visible
- Keep focus on the character

STRICTLY FORBIDDEN - NEVER INCLUDE:
- NO WATER (수영, 헤엄, swimming, water) - use WHITE background only
- NO OCEAN, POOL, LAKE, WAVES, SPLASH - use WHITE background only
- NO BLUE BACKGROUNDS or DARK BACKGROUNDS - ONLY WHITE (#FFFFFF)
- NO environmental elements (clouds, ground, floor, grass, etc)
- NO background objects or decorations
- Background clutter or complex patterns
- Multiple characters
- Text or labels
- Any elements not in the reference

CRITICAL: Regardless of the action (swimming, flying, running, etc), ALWAYS use PURE WHITE background. Show the action ONLY through character pose and movement, NOT through environmental elements.

OUTPUT: PNG image, character clearly visible, 360x360px, Korean sticker style for GIF animation.`;

      // 재시도 로직
      let imageBase64: string | null = null;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries && !imageBase64) {
        try {
          const result = await imageModel.generateContent({
            contents: [{
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: 'image/png',
                    data: referenceBase64
                  }
                },
                { text: prompt }
              ]
            }]
          });

          // Gemini에서 이미지 추출
          if (result.response.candidates && result.response.candidates[0]) {
            const parts = result.response.candidates[0].content.parts;
            for (const part of parts) {
              if (part.inlineData && part.inlineData.data) {
                imageBase64 = part.inlineData.data;
                break;
              }
            }
          }

          if (!imageBase64) {
            throw new Error('No image data in response');
          }
        } catch (error: any) {
          retryCount++;
          console.error(`❌ Attempt ${retryCount} failed for frame ${i + 1}:`, error.message);

          if (retryCount < maxRetries) {
            const waitTime = Math.pow(2, retryCount) * 2000;
            console.log(`⏳ Retrying in ${waitTime / 1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          } else {
            throw new Error(`Failed to generate frame ${i + 1} after ${maxRetries} attempts`);
          }
        }
      }

      if (!imageBase64) {
        throw new Error(`No image data for frame ${i + 1}`);
      }

      // 이미지를 360x360으로 리사이즈 (투명 배경 → 흰색 배경)
      // 테스트 API와 완전히 동일한 방식
      const imageBuffer = Buffer.from(imageBase64, 'base64');
      const width = 360;
      const height = 360;

      console.log(`  Processing frame ${i + 1}: Converting transparent to white background...`);

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

      // 2. 원본 이미지 회전 및 리사이즈 (rotate(0) 포함 - 테스트 코드와 동일)
      const transformed = await sharp(imageBuffer)
        .rotate(0, { background: { r: 255, g: 255, b: 255, alpha: 0 } })
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

      console.log(`  Frame ${i + 1}: White background applied successfully`);

      frameBuffers.push(composited);

      console.log(`✅ Frame ${i + 1}/${frameCount} complete`);

      // 마지막 프레임이 아니면 대기 (rate limit 회피: 분당 10개)
      if (i < frameCount - 1) {
        console.log('⏳ Waiting 4 seconds before next frame (rate limit: 10/min)...');
        await new Promise(resolve => setTimeout(resolve, 4000));
      }
    }

    // 3. GIF로 합성
    console.log('🎨 Creating GIF from frames...');
    const gifBuffer = await createGif(frameBuffers, 360, 360);

    console.log(`🎉 GIF generation complete! Size: ${Math.round(gifBuffer.length / 1024)}KB`);

    // 4. GIF 반환
    return new NextResponse(new Uint8Array(gifBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Content-Disposition': 'attachment; filename="emoticon-animated.gif"',
        'Content-Length': gifBuffer.length.toString(),
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error: any) {
    console.error('Error generating GIF:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to generate GIF',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}
