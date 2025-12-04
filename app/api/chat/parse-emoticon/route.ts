import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface ParseRequest {
  message: string;
  conversationHistory?: { role: string; content: string }[];
  referenceImage?: string | null; // base64 data URL
}

export async function POST(request: NextRequest) {
  try {
    const body: ParseRequest = await request.json();
    const { message, conversationHistory = [], referenceImage } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Missing message' },
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

    // 대화 컨텍스트 구성
    const historyContext = conversationHistory
      .slice(-6) // 최근 6개 메시지만
      .map(m => `${m.role === 'user' ? '사용자' : 'AI'}: ${m.content}`)
      .join('\n');

    // 참조 이미지가 있으면 이미지 분석 포함
    const imageContext = referenceImage
      ? `\n\n참고: 사용자가 참조 이미지를 첨부했습니다. 이미지는 "그림체/스타일" 참고용입니다. 이미지에 있는 캐릭터 종류(곰, 토끼 등)는 무시하고, 사용자가 텍스트로 말한 캐릭터(예: 쥐, 고양이)를 사용하세요. 이미지에서는 선 두께, 색감, 표현 방식 등 스타일만 분석하세요.`
      : '';

    const prompt = `당신은 이모티콘 생성 도우미입니다. 사용자의 요청에서 캐릭터와 테마를 추출해야 합니다.

이전 대화:
${historyContext}

현재 사용자 메시지: "${message}"${imageContext}

다음 규칙에 따라 응답하세요:

1. 캐릭터와 테마가 모두 파악되면 JSON 형식으로 응답:
{"success": true, "character": "캐릭터 설명", "theme": "테마 설명"}

2. 캐릭터만 있고 테마가 불명확하면:
{"success": false, "followUpQuestion": "어떤 테마로 만들까요? (예: 직장생활, 연애, 일상 등)"}

3. 테마만 있고 캐릭터가 불명확하면:
{"success": false, "followUpQuestion": "어떤 캐릭터로 만들까요? (예: 귀여운 고양이, 곰돌이 등)"}

4. 둘 다 불명확하면:
{"success": false, "followUpQuestion": "어떤 캐릭터로 어떤 테마의 이모티콘을 만들까요?"}

5. 이모티콘과 관련 없는 대화면:
{"success": false, "followUpQuestion": "이모티콘을 만들어드릴게요! 어떤 캐릭터로 어떤 테마의 이모티콘을 원하세요?"}

6. 참조 이미지가 있고 캐릭터 설명이 부족하면, 이미지에서 보이는 캐릭터의 특징을 상세히 분석하여 character에 포함하세요.

중요:
- 캐릭터는 외형 특징을 포함해서 구체적으로 (예: "귀여운 주황색 고양이, 둥근 얼굴, 큰 눈")
- 참조 이미지가 있으면 이미지의 스타일과 특징을 캐릭터 설명에 반영
- 테마는 상황/감정을 다양하게 (예: "직장인의 일상: 출근 졸림, 야근 피곤, 퇴근 설렘 등")
- 반드시 JSON 형식으로만 응답하세요.`;

    let result;

    // 참조 이미지가 있으면 멀티모달로 요청
    if (referenceImage) {
      // base64 data URL에서 순수 base64 추출
      const base64Data = referenceImage.replace(/^data:.*;base64,/, '');
      const mimeType = referenceImage.match(/^data:(.*?);base64,/)?.[1] || 'image/png';

      console.log('Processing with reference image, mimeType:', mimeType);

      result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            { text: prompt },
          ],
        }],
      });
    } else {
      // 텍스트만 요청
      result = await model.generateContent(prompt);
    }

    const text = result.response.text().trim();
    console.log('Gemini response:', text);

    // JSON 파싱
    try {
      // JSON 블록 추출 (```json ... ``` 또는 순수 JSON)
      let jsonStr = text;
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      } else {
        // 순수 JSON 찾기
        const startIdx = text.indexOf('{');
        const endIdx = text.lastIndexOf('}');
        if (startIdx !== -1 && endIdx !== -1) {
          jsonStr = text.substring(startIdx, endIdx + 1);
        }
      }

      const parsed = JSON.parse(jsonStr);
      return NextResponse.json(parsed);
    } catch (parseError) {
      console.error('JSON parse error:', text);
      return NextResponse.json({
        success: false,
        followUpQuestion: '어떤 캐릭터로 어떤 테마의 이모티콘을 만들까요? 예: "귀여운 고양이로 직장생활 이모티콘 만들어줘"',
      });
    }

  } catch (error: any) {
    console.error('Error parsing emoticon request:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to parse request' },
      { status: 500 }
    );
  }
}
