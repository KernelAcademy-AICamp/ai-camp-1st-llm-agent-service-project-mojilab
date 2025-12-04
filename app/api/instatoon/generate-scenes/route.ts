import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface GenerateInstatoonScenesRequest {
  story: string;
  sceneCount?: number;
}

interface Scene {
  id: string;
  description: string;
  dialogue: string;
  characterExpression: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateInstatoonScenesRequest = await request.json();
    const { story, sceneCount = 4 } = body;

    if (!story || story.trim().length < 10) {
      return NextResponse.json(
        { error: '줄거리를 10자 이상 입력해주세요.' },
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

    const prompt = `당신은 인스타툰 작가입니다. 사용자가 입력한 줄거리를 기반으로 ${sceneCount}개의 웹툰 장면(컷)을 구성해주세요.

줄거리: ${story}

각 장면에 대해 다음 정보를 JSON 배열로 반환해주세요:
- description: 장면에서 일어나는 상황 설명 (예: "주인공이 알람 소리에 놀라 일어난다")
- dialogue: 캐릭터의 대사 또는 내레이션 (예: "앗! 벌써 이 시간이야?!")
- characterExpression: 표정/분위기 (웃음, 놀람, 다급함, 당황, 화남, 슬픔 중 하나)

요구사항:
1. 정확히 ${sceneCount}개의 장면을 생성해주세요
2. 장면들이 자연스럽게 이어지도록 해주세요
3. 대사는 짧고 임팩트 있게 작성해주세요
4. 인스타그램 웹툰 스타일에 맞게 간결하게 작성해주세요

다음 JSON 형식으로만 응답해주세요 (다른 텍스트 없이):
[
  {
    "description": "장면 설명",
    "dialogue": "대사",
    "characterExpression": "표정"
  }
]`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // JSON 파싱 시도
    let scenes: Scene[];
    try {
      // 마크다운 코드 블록 제거
      const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsedScenes = JSON.parse(jsonText);

      scenes = parsedScenes.map((scene: any, index: number) => ({
        id: String(index + 1),
        description: scene.description || '',
        dialogue: scene.dialogue || '',
        characterExpression: scene.characterExpression || '웃음',
      }));
    } catch (parseError) {
      console.error('JSON 파싱 실패:', text);
      return NextResponse.json(
        { error: 'AI 응답을 파싱하는데 실패했습니다.' },
        { status: 500 }
      );
    }

    console.log(`Generated ${scenes.length} instatoon scenes for story`);

    return NextResponse.json({
      success: true,
      scenes,
    });

  } catch (error: any) {
    console.error('Error generating instatoon scenes:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to generate scenes',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}
