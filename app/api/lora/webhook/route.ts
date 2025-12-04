import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Replicate Webhook 처리
export async function POST(request: NextRequest) {
  try {
    // 웹훅 시크릿 검증
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    if (secret !== process.env.WEBHOOK_SECRET) {
      console.error('Webhook 인증 실패: 잘못된 시크릿');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    console.log('Replicate Webhook 수신:', JSON.stringify(body, null, 2));

    const { id: trainingId, status, output, error, logs } = body;

    if (!trainingId) {
      return NextResponse.json({ error: 'Training ID가 없습니다' }, { status: 400 });
    }

    // training ID로 lora_models 찾기
    const { data: loraModel, error: findError } = await supabaseAdmin
      .from('lora_models')
      .select('*')
      .eq('replicate_training_id', trainingId)
      .single();

    if (findError || !loraModel) {
      console.error('LoRA 모델을 찾을 수 없음:', findError);
      return NextResponse.json({ error: '모델을 찾을 수 없습니다' }, { status: 404 });
    }

    // 상태에 따른 처리
    if (status === 'succeeded') {
      // 학습 성공
      const modelVersion = output?.version || output;

      await supabaseAdmin
        .from('lora_models')
        .update({
          status: 'completed',
          replicate_model_id: modelVersion,
          training_completed_at: new Date().toISOString(),
          metadata: {
            ...loraModel.metadata,
            output,
            logs: logs?.slice(-1000), // 로그는 마지막 1000자만
          },
        })
        .eq('id', loraModel.id);

      console.log(`LoRA 학습 완료: ${loraModel.id}`);

    } else if (status === 'failed' || status === 'canceled') {
      // 학습 실패/취소
      await supabaseAdmin
        .from('lora_models')
        .update({
          status: 'failed',
          error_message: error || `학습 ${status}`,
          metadata: {
            ...loraModel.metadata,
            error,
            logs: logs?.slice(-1000),
          },
        })
        .eq('id', loraModel.id);

      console.error(`LoRA 학습 실패: ${loraModel.id}`, error);

    } else if (status === 'processing' || status === 'starting') {
      // 진행 중
      await supabaseAdmin
        .from('lora_models')
        .update({
          status: 'training',
          metadata: {
            ...loraModel.metadata,
            lastUpdate: new Date().toISOString(),
          },
        })
        .eq('id', loraModel.id);
    }

    return NextResponse.json({ success: true, status });

  } catch (error: any) {
    console.error('Webhook 처리 오류:', error);
    return NextResponse.json(
      { error: '서버 오류: ' + error.message },
      { status: 500 }
    );
  }
}

// Replicate에서 GET으로 webhook 확인할 수 있음
export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'Mojilab LoRA Webhook' });
}
