import { createClient } from '@supabase/supabase-js';

// 서버 사이드에서만 사용 (service_role 키 필요)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type CreditType = 'credits' | 'lora_credits';

export interface UserCredits {
  user_id: string;
  credits: number;
  lora_credits: number;
  created_at: string;
  updated_at: string;
}

// 유저 크레딧 조회
export async function getUserCredits(userId: string): Promise<UserCredits | null> {
  const { data, error } = await supabaseAdmin
    .from('user_credits')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    // 레코드가 없으면 null 반환
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }

  return data;
}

// 크레딧 체크 (충분한지 확인)
export async function checkCredits(
  userId: string,
  type: CreditType,
  amount: number = 1
): Promise<{ hasEnough: boolean; current: number }> {
  const credits = await getUserCredits(userId);

  if (!credits) {
    return { hasEnough: false, current: 0 };
  }

  const current = credits[type];
  return {
    hasEnough: current >= amount,
    current,
  };
}

// 크레딧 차감
export async function useCredit(
  userId: string,
  type: CreditType,
  amount: number = 1
): Promise<{ success: boolean; remaining: number }> {
  // 먼저 충분한지 확인
  const { hasEnough, current } = await checkCredits(userId, type, amount);

  if (!hasEnough) {
    throw new Error(`크레딧이 부족합니다. 현재: ${current}, 필요: ${amount}`);
  }

  // 차감 실행
  const { error } = await supabaseAdmin.rpc('decrement_credit', {
    p_user_id: userId,
    p_type: type,
  });

  if (error) {
    throw error;
  }

  return {
    success: true,
    remaining: current - amount,
  };
}

// 크레딧 추가 (관리자용)
export async function addCredits(
  userId: string,
  credits: number = 0,
  loraCredits: number = 0
): Promise<UserCredits> {
  const { data, error } = await supabaseAdmin
    .from('user_credits')
    .upsert(
      {
        user_id: userId,
        credits,
        lora_credits: loraCredits,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
      }
    )
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

// 크레딧 초기화 (신규 유저용)
export async function initializeCredits(userId: string): Promise<UserCredits> {
  const existing = await getUserCredits(userId);

  if (existing) {
    return existing;
  }

  const { data, error } = await supabaseAdmin
    .from('user_credits')
    .insert({
      user_id: userId,
      credits: 0,
      lora_credits: 0,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
