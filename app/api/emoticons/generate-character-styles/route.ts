import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import { GoogleGenerativeAI } from '@google/generative-ai';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || '',
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface GenerateRequest {
  character: string;
}

// 캐릭터 설명을 영어로 번역
async function translateToEnglish(text: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = `Translate this character description to English for AI image generation.
Keep it concise and clear. Only output the English translation, nothing else.

Korean: ${text}
English:`;

    const result = await model.generateContent(prompt);
    const translation = result.response.text().trim();

    console.log(`Translation: "${text}" → "${translation}"`);
    return translation;
  } catch (error) {
    console.error('Translation failed:', error);
    // 번역 실패시 원본 반환
    return text;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { character } = body;

    if (!character) {
      return NextResponse.json(
        { error: 'Missing required field: character' },
        { status: 400 }
      );
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: 'REPLICATE_API_TOKEN not configured' },
        { status: 500 }
      );
    }

    if (!process.env.REPLICATE_FLUX_MODEL_ID) {
      return NextResponse.json(
        { error: 'REPLICATE_FLUX_MODEL_ID not configured' },
        { status: 500 }
      );
    }

    console.log('Generating 3 character styles (jiseom/doodle)...');
    console.log('Character (원본):', character);

    // 한국어를 영어로 번역
    const characterEnglish = await translateToEnglish(character);
    console.log('Character (영어):', characterEnglish);

    // 3가지 스타일 생성
    const styles = [
      {
        name: 'Doodle Style 1',
        model: process.env.REPLICATE_FLUX_MODEL_ID,
        prompt: `rough doodle sketch, messy hand-drawn lines, sketchy unpolished style, with small simple flat eyes (NO sparkling or shining eyes, NO round pupils), asymmetric crooked face shape, wonky irregular proportions, tiny body at least 2x smaller than oversized head, small limbs, imperfect shapes, ${characterEnglish}, casual drawing, loose strokes, white background`,
        useLoRA: true,
      },
      {
        name: 'Doodle Style 2',
        model: process.env.REPLICATE_FLUX_MODEL_ID,
        prompt: `rough doodle sketch, messy hand-drawn lines, sketchy unpolished style, with small simple flat eyes (NO sparkling or shining eyes, NO round pupils), asymmetric crooked face shape, wonky irregular proportions, tiny body at least 2x smaller than oversized head, small limbs, imperfect shapes, ${characterEnglish}, casual drawing, loose strokes, white background`,
        useLoRA: true,
      },
      {
        name: 'Doodle Style 3',
        model: process.env.REPLICATE_FLUX_MODEL_ID,
        prompt: `rough doodle sketch, messy hand-drawn lines, sketchy unpolished style, with small simple flat eyes (NO sparkling or shining eyes, NO round pupils), asymmetric crooked face shape, wonky irregular proportions, tiny body at least 2x smaller than oversized head, small limbs, imperfect shapes, ${characterEnglish}, casual drawing, loose strokes, white background`,
        useLoRA: true,
      },
    ];

    console.log('Generating 3 styles with Replicate LoRA (jiseom/doodle)...');

    // 스타일 생성 - 순차적으로 생성 (rate limit 회피)
    const results = [];

    for (let index = 0; index < styles.length; index++) {
      const style = styles[index];
      const startTime = Date.now();
      console.log(`Generating style ${index + 1}/3: ${style.name} (${style.useLoRA ? 'LoRA' : 'FLUX'})`);

      const output = await replicate.run(style.model as any, {
        input: {
          prompt: style.prompt,
          width: 360,
          height: 360,
          num_outputs: 1,
          ...(style.useLoRA ? {} : { num_inference_steps: 4 }),
        },
      });

      let imageUrl: string;

      if (Array.isArray(output)) {
        imageUrl = String(output[0]);
      } else if (typeof output === 'string') {
        imageUrl = output;
      } else if (output && typeof output === 'object') {
        const urlField = (output as any).url || (output as any).output || (output as any)[0];
        if (urlField) {
          imageUrl = String(urlField);
        } else {
          throw new Error('Cannot find URL in output object');
        }
      } else {
        throw new Error('Invalid output format: ' + typeof output);
      }

      if (typeof imageUrl !== 'string' || !imageUrl.startsWith('http')) {
        throw new Error('Invalid URL');
      }

      const elapsedTime = Date.now() - startTime;
      console.log(`✅ Style ${index + 1}/3 complete (took ${(elapsedTime / 1000).toFixed(1)}s):`, imageUrl);

      results.push({
        index,
        name: style.name,
        imageUrl,
        model: style.model,
        stylePrompt: style.prompt,
        useLoRA: style.useLoRA,
      });

      // rate limit: 6/min = 최소 10초 간격 필요
      // 생성 시간이 10초 미만이면 나머지 시간만 대기
      if (index < styles.length - 1) {
        const minInterval = 10000; // 10초
        const waitTime = Math.max(0, minInterval - elapsedTime);
        if (waitTime > 0) {
          console.log(`⏳ Waiting ${(waitTime / 1000).toFixed(1)}s for rate limit (6/min)...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    console.log('✅ Style generation complete');

    return NextResponse.json({
      success: true,
      styles: results,
      character,
    });

  } catch (error: any) {
    console.error('Error generating character styles:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to generate character styles',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}
