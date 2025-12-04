import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface SuggestMemeRequest {
  imageUrl: string;
}

interface SuggestMemeResponse {
  suggestions: string[];
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

export async function POST(request: NextRequest) {
  try {
    const body: SuggestMemeRequest = await request.json();
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Missing required field: imageUrl' },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured' },
        { status: 500 }
      );
    }

    console.log('💬 Starting meme suggestion generation...');
    console.log(`Image URL: ${imageUrl}`);

    // 1. 이미지 다운로드 및 base64 변환
    const imageBase64 = await imageUrlToBase64(imageUrl);

    // 2. Gemini Vision으로 이미지 분석 + 밈 문구 추천
    // gemini-2.5-flash: 다른 API에서 사용 중인 모델 (vision 포함)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `당신은 2025년 한국 인스타그램, X(트위터)의 10-20대 밈 문화를 완벽히 이해하는 전문가입니다.

이 이모티콘 이미지를 보고, 지금 당장 인스타/X에서 쓰이는 찰떡같은 밈 문구를 추천해주세요.

**요구사항:**
- 2025년 현재 10-20대가 실제로 사용하는 말투
- 인스타 스토리, X 트윗에서 바로 쓸 수 있는 수준
- 짧고 임팩트 있게 (가능하면 10자 이하, 최대 15자)
- 이모티콘의 감정/상황과 완벽히 매칭
- 유행어, 신조어, 줄임말 적극 활용

**스타일 가이드:**
- "ㅋㅋㅋ", "ㅠㅠ", "ㅇㅈ" 등 초성 사용 OK
- "진짜루?", "실화냐", "개웃김", "이게 맞아?", "미쳤다", "레전드" 등
- "~임", "~해서", "~ㄴ데" 같은 MZ 말투
- 상황에 맞는 최신 밈 (예: "그게 바로 나야", "나 왜 이럼", "어쩌라고" 등)

**절대 금지:**
- 20대 후반 이상이 쓰는 말투
- 너무 긴 문장
- 딱딱한 표준어
- 오래된 밈 (2023년 이전 유행어)

**출력 형식:**
정확히 5개의 밈 문구를 JSON 배열로 반환하세요.
["문구1", "문구2", "문구3", "문구4", "문구5"]

이미지 분석 후 가장 찰떡인 5개만 골라주세요:`;

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: imageBase64
            }
          },
          { text: prompt }
        ]
      }]
    });

    const responseText = result.response.text();
    console.log('🤖 Gemini response:', responseText);

    // JSON 파싱 (마크다운 코드블록 제거)
    let suggestions: string[];
    try {
      // ```json ... ``` 형태 제거
      const jsonText = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      suggestions = JSON.parse(jsonText);

      if (!Array.isArray(suggestions) || suggestions.length === 0) {
        throw new Error('Invalid suggestions format');
      }

      // 최대 5개로 제한
      suggestions = suggestions.slice(0, 5);

    } catch (parseError) {
      console.error('❌ JSON parsing failed:', parseError);
      console.error('Raw response:', responseText);

      // Fallback: 텍스트를 줄바꿈으로 분리
      suggestions = responseText
        .split('\n')
        .filter(line => line.trim().length > 0 && !line.includes('```'))
        .map(line => line.replace(/^[-*]\s*/, '').replace(/^"\s*|\s*"$/g, '').trim())
        .filter(line => line.length > 0)
        .slice(0, 5);
    }

    console.log('✅ Final suggestions:', suggestions);

    const response: SuggestMemeResponse = {
      suggestions
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error: any) {
    console.error('❌ Meme suggestion error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to generate meme suggestions',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}
