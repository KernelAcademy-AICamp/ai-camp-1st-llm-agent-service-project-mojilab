import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// 32개 감정 세트
const EMOTIONS_32 = [
  // 기본 감정 (8개)
  '행복', '슬픔', '화남', '놀람', '사랑', '피곤', '신남', '혼란',
  // 일상 감정 (8개)
  '졸림', '배고픔', '만족', '걱정', '부끄러움', '자신감', '긴장', '편안함',
  // 소통 감정 (8개)
  '동의', '거절', '응원', '축하', '위로', '감사', '미안', '궁금',
  // 특수 상황 (8개)
  '기대', '실망', '질투', '뿌듯', '허탈', '당황', '집중', '휴식',
];

interface GenerateRequest {
  character: string;
  selectedCharacterImage: string; // base64 data URL
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { character, selectedCharacterImage } = body;

    // 유효성 검사
    if (!character || !selectedCharacterImage) {
      return NextResponse.json(
        { error: 'Missing required fields: character, selectedCharacterImage' },
        { status: 400 }
      );
    }

    console.log('Generating 32 emoticons with Gemini Flash Image...');
    console.log('Character:', character);

    // base64 data URL에서 순수 base64만 추출
    const base64Data = selectedCharacterImage.replace(/^data:.*;base64,/, '');

    console.log('Received image data URL prefix:', selectedCharacterImage.substring(0, 50));
    console.log('Extracted base64 length:', base64Data.length);

    // Gemini 2.5 Flash Image 모델
    const imageModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image' });

    const emoticons: Array<{
      index: number;
      emotion: string;
      dataUrl: string;
    }> = [];

    // 32개 감정을 순차적으로 생성 (rate limit 회피)
    for (let i = 0; i < EMOTIONS_32.length; i++) {
      const emotion = EMOTIONS_32[i];
      console.log(`Generating ${i + 1}/32: ${emotion}`);

      // 프롬프트 생성 - 한국 스티커 스타일 강조 + 투명 배경
      const prompt = `MIMIC THE EXACT STYLE: Copy the reference image's art style, character design, and aesthetic perfectly.

CRITICAL REQUIREMENTS:
- Same character face, body shape, proportions, and colors as reference
- Same art style (line thickness, drawing technique, texture)
- Show "${emotion}" emotion clearly through facial expression and pose
- Transparent background (NO white background)
- Korean sticker style: simple, clear, expressive
- 360x360px format
- Clean edges for transparency
- Korean messaging sticker aesthetic

Expression for "${emotion}":
- Clear facial expression showing this emotion
- Body language matching the emotion
- Keep character design identical to reference

OUTPUT: PNG with transparent background, 360x360px, Korean sticker style`;

      console.log(`Prompt: ${prompt}`);

      // 재시도 로직 (503 에러 대응)
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
                    data: base64Data
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
          console.error(`❌ Attempt ${retryCount} failed for ${emotion}:`, error.message);

          if (retryCount < maxRetries) {
            const waitTime = Math.pow(2, retryCount) * 2000; // Exponential backoff: 2s, 4s, 8s
            console.log(`⏳ Retrying in ${waitTime / 1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          } else {
            throw new Error(`Failed to generate ${emotion} after ${maxRetries} attempts: ${error.message}`);
          }
        }
      }

      if (!imageBase64) {
        throw new Error(`No image data in Gemini response for emotion: ${emotion}`);
      }

      // Base64를 data URL로 변환
      const dataUrl = `data:image/png;base64,${imageBase64}`;

      emoticons.push({
        index: i,
        emotion,
        dataUrl,
      });

      console.log(`✅ ${i + 1}/32 complete: ${emotion}`);

      // 마지막 이미지가 아니면 6초 대기 (rate limit 회피: 분당 10개 제한)
      if (i < EMOTIONS_32.length - 1) {
        console.log('⏳ Waiting 6 seconds before next generation (rate limit: 10/min)...');
        await new Promise(resolve => setTimeout(resolve, 6000));
      }
    }

    console.log('✅ All 32 emoticons generated successfully');

    return NextResponse.json({
      success: true,
      emoticons,
      character,
      total: 32,
      format: {
        size: '360x360',
        background: 'transparent',
        type: 'PNG',
        style: 'Korean sticker',
      },
    });

  } catch (error: any) {
    console.error('Error generating 32 emoticons with Gemini:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to generate emoticons',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}
