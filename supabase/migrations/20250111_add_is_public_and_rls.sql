-- Add is_public column and RLS policies to emoticon tables
-- Purpose: Allow public gallery while protecting user data

-- ============================================
-- 1. ADD is_public COLUMN
-- ============================================

-- Add is_public to emoticon_series (default true = 공개)
ALTER TABLE emoticon_series
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- Update existing rows to be public
UPDATE emoticon_series SET is_public = true WHERE is_public IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_emoticon_series_is_public ON emoticon_series(is_public);

-- ============================================
-- 2. ENABLE RLS
-- ============================================

ALTER TABLE emoticon_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE emoticon_scenes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. DROP EXISTING POLICIES (if any)
-- ============================================

DROP POLICY IF EXISTS "View public or own series" ON emoticon_series;
DROP POLICY IF EXISTS "Manage own series insert" ON emoticon_series;
DROP POLICY IF EXISTS "Manage own series update" ON emoticon_series;
DROP POLICY IF EXISTS "Manage own series delete" ON emoticon_series;
DROP POLICY IF EXISTS "View scenes of public or own series" ON emoticon_scenes;
DROP POLICY IF EXISTS "Manage scenes of own series insert" ON emoticon_scenes;
DROP POLICY IF EXISTS "Manage scenes of own series update" ON emoticon_scenes;
DROP POLICY IF EXISTS "Manage scenes of own series delete" ON emoticon_scenes;

-- ============================================
-- 4. CREATE POLICIES FOR emoticon_series
-- ============================================

-- SELECT: 공개된 것 OR 내 것
CREATE POLICY "View public or own series"
    ON emoticon_series FOR SELECT
    USING (
        is_public = true
        OR auth.uid()::text = user_id
    );

-- INSERT: 본인만 생성 가능
CREATE POLICY "Manage own series insert"
    ON emoticon_series FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);

-- UPDATE: 본인 것만 수정 가능
CREATE POLICY "Manage own series update"
    ON emoticon_series FOR UPDATE
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- DELETE: 본인 것만 삭제 가능
CREATE POLICY "Manage own series delete"
    ON emoticon_series FOR DELETE
    USING (auth.uid()::text = user_id);

-- ============================================
-- 5. CREATE POLICIES FOR emoticon_scenes
-- ============================================

-- SELECT: 공개된 시리즈의 장면 OR 내 시리즈의 장면
CREATE POLICY "View scenes of public or own series"
    ON emoticon_scenes FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM emoticon_series
        WHERE emoticon_series.id = emoticon_scenes.series_id
        AND (
            emoticon_series.is_public = true
            OR emoticon_series.user_id = auth.uid()::text
        )
    ));

-- INSERT: 내 시리즈의 장면만 생성 가능
CREATE POLICY "Manage scenes of own series insert"
    ON emoticon_scenes FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM emoticon_series
        WHERE emoticon_series.id = emoticon_scenes.series_id
        AND emoticon_series.user_id = auth.uid()::text
    ));

-- UPDATE: 내 시리즈의 장면만 수정 가능
CREATE POLICY "Manage scenes of own series update"
    ON emoticon_scenes FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM emoticon_series
        WHERE emoticon_series.id = emoticon_scenes.series_id
        AND emoticon_series.user_id = auth.uid()::text
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM emoticon_series
        WHERE emoticon_series.id = emoticon_scenes.series_id
        AND emoticon_series.user_id = auth.uid()::text
    ));

-- DELETE: 내 시리즈의 장면만 삭제 가능
CREATE POLICY "Manage scenes of own series delete"
    ON emoticon_scenes FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM emoticon_series
        WHERE emoticon_series.id = emoticon_scenes.series_id
        AND emoticon_series.user_id = auth.uid()::text
    ));

-- ============================================
-- DONE!
-- ============================================
-- 결과:
-- - 메인 갤러리: is_public=true인 모든 시리즈 표시
-- - 내 이모티콘: 내 것만 표시 (public 여부 무관)
-- - 수정/삭제: 본인 것만 가능
