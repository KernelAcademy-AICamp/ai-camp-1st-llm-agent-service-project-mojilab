import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import Replicate from 'replicate';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN || '' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface GenerateSimpleRequest {
  character: string;
  theme: string;
  scenes: string[];
  userId?: string;
  referenceImage?: string | null; // base64 data URL
}

export async function POST(request: NextRequest) {
  try {
    // 인증 토큰 검증
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authUser) {
      return NextResponse.json(
        { error: '유효하지 않은 인증입니다' },
        { status: 401 }
      );
    }

    const body: GenerateSimpleRequest = await request.json();
    const { character, theme, scenes, userId, referenceImage } = body;

    // userId와 인증된 사용자 일치 확인
    if (userId && userId !== authUser.id) {
      return NextResponse.json(
        { error: '권한이 없습니다' },
        { status: 403 }
      );
    }

    // 인증된 사용자 ID 사용
    const targetUserId = authUser.id;

    if (!character || !scenes || scenes.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: character, scenes' },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured' },
        { status: 500 }
      );
    }

    console.log(`Generating ${scenes.length} simple emoticons...`);
    console.log('Character:', character);
    console.log('Theme:', theme);
    console.log('Has reference image:', !!referenceImage);

    // Gemini 3 Pro Image (Nano Banana Pro) 모델 사용
    const imageModel = genAI.getGenerativeModel({
      model: 'gemini-3-pro-image-preview',
      generationConfig: {
        responseModalities: ['Text', 'Image'],
      } as any,
    });

    // 참조 이미지 처리
    let referenceImageData: { mimeType: string; data: string } | null = null;
    if (referenceImage) {
      const base64Data = referenceImage.replace(/^data:.*;base64,/, '');
      const mimeType = referenceImage.match(/^data:(.*?);base64,/)?.[1] || 'image/png';
      referenceImageData = { mimeType, data: base64Data };
    }

    const generatedImages: string[] = [];
    let seriesId: string | null = null;

    // DB에 시리즈 생성
    {
      const { data: series, error: seriesError } = await supabase
        .from('emoticon_series')
        .insert({
          user_id: targetUserId,
          title: `${character.split(',')[0]} - ${theme}`,
          character_description: character,
          theme: theme,
          num_scenes: scenes.length,
        })
        .select()
        .single();

      if (seriesError) {
        console.error('Series creation error:', seriesError);
      } else {
        seriesId = series.id;
        console.log('Created series:', seriesId);
      }
    }

    // 각 장면에 대해 이미지 생성
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      console.log(`Generating ${i + 1}/${scenes.length}: ${scene}`);

      const basePrompt = referenceImageData
        ? `IMPORTANT: Copy ONLY the ART STYLE from the reference image, NOT the character.

Copy these STYLE elements from the reference:
- Line thickness and drawing technique
- Coloring style and color palette
- Overall aesthetic and mood

DO NOT copy the character from the reference image.
Instead, draw this character: ${character}

SCENE/EMOTION: ${scene}

Create an emoticon of "${character}" showing "${scene}" using the SAME ART STYLE as the reference.
The character must be ${character}, NOT the character shown in the reference image.
Square format (1:1 ratio), PURE WHITE background (#FFFFFF). No shadows on background.`
        : `Create a cute Korean-style messaging sticker character.

CHARACTER: ${character}
SCENE/EMOTION: ${scene}

STYLE REQUIREMENTS:
- Cute, simple Korean sticker style
- Clean black outlines with white/light fill
- Expressive face and body language
- Square format (1:1 ratio)
- Minimal details, maximum expression
- Korean messaging sticker aesthetic
- PURE WHITE background (#FFFFFF), no shadows

The character should clearly show the emotion/action: "${scene}"`;

      try {
        let result;

        if (referenceImageData) {
          // 참조 이미지와 함께 생성
          result = await imageModel.generateContent({
            contents: [{
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: referenceImageData.mimeType,
                    data: referenceImageData.data,
                  },
                },
                { text: basePrompt },
              ],
            }],
          });
        } else {
          // 텍스트만으로 생성
          result = await imageModel.generateContent(basePrompt);
        }

        // 이미지 데이터 추출
        let imageBase64: string | null = null;

        if (result.response.candidates && result.response.candidates[0]) {
          const parts = result.response.candidates[0].content.parts;
          for (const part of parts) {
            if ((part as any).inlineData && (part as any).inlineData.data) {
              imageBase64 = (part as any).inlineData.data;
              break;
            }
          }
        }

        if (imageBase64) {
          // 배경 제거 처리 (rembg)
          let finalImageBase64 = imageBase64;

          try {
            console.log(`🔄 Removing background for scene ${i + 1}...`);
            const imageDataUrl = `data:image/png;base64,${imageBase64}`;

            const rembgOutput = await replicate.run(
              'cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003',
              {
                input: {
                  image: imageDataUrl,
                },
              }
            );

            // rembg 결과는 URL로 반환됨
            if (rembgOutput && typeof rembgOutput === 'string') {
              const response = await fetch(rembgOutput);
              const arrayBuffer = await response.arrayBuffer();
              finalImageBase64 = Buffer.from(arrayBuffer).toString('base64');
              console.log(`✅ Background removed for scene ${i + 1}`);
            }
          } catch (rembgError) {
            console.error('Background removal failed, using original:', rembgError);
            // 배경 제거 실패시 원본 사용
          }

          const dataUrl = `data:image/png;base64,${finalImageBase64}`;
          generatedImages.push(dataUrl);

          // Supabase Storage에 저장
          if (seriesId) {
            try {
              const buffer = Buffer.from(finalImageBase64, 'base64');
              const fileName = `${seriesId}/scene_${i}.png`;

              const { error: uploadError } = await supabase.storage
                .from('images')
                .upload(fileName, buffer, {
                  contentType: 'image/png',
                  upsert: true,
                });

              if (!uploadError) {
                const { data: urlData } = supabase.storage
                  .from('images')
                  .getPublicUrl(fileName);

                // DB에 장면 저장
                const { error: sceneError } = await supabase
                  .from('emoticon_scenes')
                  .insert({
                    series_id: seriesId,
                    scene_number: i,
                    title: scene,
                    prompt: basePrompt,
                    image_url: urlData.publicUrl,
                    emotion: scene,
                  });

                if (sceneError) {
                  console.error('Scene insert error:', sceneError);
                }
              }
            } catch (storageError) {
              console.error('Storage error:', storageError);
            }
          }

          console.log(`✅ ${i + 1}/${scenes.length} complete`);
        } else {
          console.error(`Failed to generate image for scene: ${scene}`);
          generatedImages.push(''); // 빈 문자열로 실패 표시
        }

        // Rate limit 대응 - 다음 생성 전 대기
        if (i < scenes.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (error: any) {
        console.error(`Error generating scene ${i}:`, error);
        generatedImages.push('');

        // 에러 후 더 긴 대기
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    const successCount = generatedImages.filter(img => img !== '').length;
    console.log(`✅ Generated ${successCount}/${scenes.length} emoticons`);

    return NextResponse.json({
      success: true,
      images: generatedImages.filter(img => img !== ''),
      seriesId,
      total: successCount,
      character,
      theme,
    });

  } catch (error: any) {
    console.error('Error generating simple emoticons:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to generate emoticons',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}
