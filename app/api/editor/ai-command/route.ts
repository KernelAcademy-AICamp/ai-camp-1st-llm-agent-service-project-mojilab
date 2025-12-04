import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const SYSTEM_PROMPT = `당신은 이모티콘 편집 AI 어시스턴트입니다.
사용자의 자연어 요청을 분석하고 JSON 액션으로 변환합니다.

사용 가능한 액션:
1. add_text: 텍스트 추가
   { "action": "add_text", "text": "텍스트 내용", "color": "#000000", "size": 32 }

2. add_sticker: 스티커 추가 (좋아요, 사랑해, 화이팅 등)
   { "action": "add_sticker", "type": "like" | "love" | "fighting" | "laugh" | "thanks" | "congrats" | "sorry" | "cheer" }

3. draw: 그리기 (색상만 지정)
   { "action": "draw", "color": "#000000" }

4. select: 선택 도구 활성화
   { "action": "select" }

5. delete_selected: 선택된 요소 삭제
   { "action": "delete_selected" }

6. undo: 실행 취소
   { "action": "undo" }

7. clear: 전체 초기화
   { "action": "clear" }

8. remove_background: 배경 이미지 제거
   { "action": "remove_background" }

예시:
사용자: "좋아요 스티커 추가해줘"
응답: { "action": "add_sticker", "type": "like" }

사용자: "빨간색으로 좋아요 써줘"
응답: { "action": "add_text", "text": "좋아요", "color": "#ff0000", "size": 32 }

사용자: "파란색으로 그리기"
응답: { "action": "draw", "color": "#0000ff" }

사용자: "지워줘"
응답: { "action": "delete_selected" }

사용자: "취소"
응답: { "action": "undo" }

사용자: "배경 지워줘"
응답: { "action": "remove_background" }

항상 JSON 형식으로만 응답하세요. 설명은 추가하지 마세요.`;

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const result = await model.generateContent([
      SYSTEM_PROMPT,
      `\n\n사용자 요청: ${message}\n\nJSON 응답:`,
    ]);

    const response = result.response;
    const text = response.text();

    // Extract JSON from response
    let jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Try to parse the whole text as JSON
      jsonMatch = [text];
    }

    const actionData = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      action: actionData,
      message: text,
    });
  } catch (error) {
    console.error('AI Command Error:', error);
    return NextResponse.json(
      { error: 'Failed to process command', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
