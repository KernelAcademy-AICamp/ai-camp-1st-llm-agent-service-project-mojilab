import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface GenerateThemePromptRequest {
  themeLabel: string; // 예: '직장생활', '연애', '게이머' 등
  character?: string; // 선택적으로 캐릭터 정보도 활용
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateThemePromptRequest = await request.json();
    const { themeLabel, character } = body;

    if (!themeLabel) {
      return NextResponse.json(
        { error: 'Missing required field: themeLabel' },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured' },
        { status: 500 }
      );
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const characterContext = character
      ? `캐릭터: ${character}\n이 캐릭터의 특성을 고려하여 `
      : '';

    const prompt = `"${themeLabel}" 테마로 이모티콘을 만들기 위한 테마 설명을 작성해주세요.

요구사항:
- 해당 테마에서 일어날 수 있는 다양한 감정, 상황, 행동을 포함
- 콤마(,)로 구분하여 나열
- 한국어로 작성
- 이모지 절대 사용 금지
- 텍스트만 작성
- 100자 이내

예시: 출근길 졸림, 회의 중 멍때리기, 야근 피곤함, 퇴근 설렘, 점심시간 행복

테마: ${themeLabel}
결과:`;

    const result = await model.generateContent(prompt);
    const generatedPrompt = result.response.text().trim();

    // 따옴표 제거 (있는 경우)
    const cleanPrompt = generatedPrompt
      .replace(/^["']|["']$/g, '')
      .replace(/^프롬프트:\s*/i, '')
      .trim();

    console.log(`Generated theme prompt for "${themeLabel}":`, cleanPrompt);

    return NextResponse.json({
      success: true,
      themeLabel,
      prompt: cleanPrompt,
    });

  } catch (error: any) {
    console.error('Error generating theme prompt:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to generate theme prompt',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}
