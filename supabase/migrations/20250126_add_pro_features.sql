-- Pro Features Migration
-- Purpose: Add user credits and LoRA models for Pro emoticon generation

-- ============================================
-- 1. User Credits Table (관리자가 수동으로 크레딧 추가)
-- ============================================
CREATE TABLE IF NOT EXISTS user_credits (
    user_id TEXT PRIMARY KEY,
    credits INTEGER DEFAULT 0,              -- 이모티콘 생성 크레딧 (1 = 32개 시리즈 1회)
    lora_credits INTEGER DEFAULT 0,         -- LoRA 학습 크레딧 (1 = 학습 1회)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS: 본인 크레딧만 조회 가능 (수정은 service_role만)
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credits"
    ON user_credits FOR SELECT
    USING (auth.uid()::text = user_id);

-- 크레딧 차감 함수 (service_role로만 호출)
CREATE OR REPLACE FUNCTION decrement_credit(p_user_id TEXT, p_type TEXT)
RETURNS VOID AS $$
BEGIN
    IF p_type = 'credits' THEN
        UPDATE user_credits
        SET credits = credits - 1, updated_at = NOW()
        WHERE user_id = p_user_id AND credits > 0;
    ELSIF p_type = 'lora_credits' THEN
        UPDATE user_credits
        SET lora_credits = lora_credits - 1, updated_at = NOW()
        WHERE user_id = p_user_id AND lora_credits > 0;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. LoRA Models Table (유저별 학습된 모델)
-- ============================================
CREATE TABLE IF NOT EXISTS lora_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    replicate_model_id TEXT,                -- Replicate에서 반환된 모델 ID/URL
    replicate_training_id TEXT,             -- Replicate training ID (상태 조회용)
    trigger_word TEXT DEFAULT 'TOK',        -- 학습된 트리거 워드
    status TEXT DEFAULT 'pending',          -- pending, training, completed, failed
    training_started_at TIMESTAMP WITH TIME ZONE,
    training_completed_at TIMESTAMP WITH TIME ZONE,
    training_images_count INTEGER DEFAULT 0,
    error_message TEXT,                     -- 실패 시 에러 메시지
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- RLS 정책
ALTER TABLE lora_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own LoRA models"
    ON lora_models FOR SELECT
    USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own LoRA models"
    ON lora_models FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own LoRA models"
    ON lora_models FOR UPDATE
    USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own LoRA models"
    ON lora_models FOR DELETE
    USING (auth.uid()::text = user_id);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_lora_models_user_id ON lora_models(user_id);
CREATE INDEX IF NOT EXISTS idx_lora_models_status ON lora_models(status);
CREATE INDEX IF NOT EXISTS idx_lora_models_created_at ON lora_models(created_at DESC);

-- ============================================
-- 3. LoRA Training Images Table (학습용 이미지)
-- ============================================
CREATE TABLE IF NOT EXISTS lora_training_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lora_model_id UUID NOT NULL REFERENCES lora_models(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    caption TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 정책
ALTER TABLE lora_training_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own training images"
    ON lora_training_images FOR ALL
    USING (lora_model_id IN (
        SELECT id FROM lora_models WHERE user_id = auth.uid()::text
    ));

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_training_images_model_id ON lora_training_images(lora_model_id);

-- ============================================
-- 4. Updated At Triggers
-- ============================================
CREATE TRIGGER update_user_credits_updated_at
    BEFORE UPDATE ON user_credits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lora_models_updated_at
    BEFORE UPDATE ON lora_models
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. 참고: 관리자 크레딧 추가 SQL
-- ============================================
-- INSERT INTO user_credits (user_id, credits, lora_credits)
-- VALUES ('user-uuid-here', 10, 3)
-- ON CONFLICT (user_id)
-- DO UPDATE SET
--   credits = user_credits.credits + 10,
--   lora_credits = user_credits.lora_credits + 3,
--   updated_at = NOW();
