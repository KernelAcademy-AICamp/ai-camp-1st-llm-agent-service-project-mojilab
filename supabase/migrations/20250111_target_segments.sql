-- Target Segments Table
CREATE TABLE IF NOT EXISTS target_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    age_range TEXT CHECK (age_range IN ('18-24', '25-34', '35-44', '45+')),
    gender TEXT CHECK (gender IN ('male', 'female', 'all')),
    interests JSONB DEFAULT '[]'::jsonb,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_target_segments_user_id ON target_segments(user_id);
CREATE INDEX IF NOT EXISTS idx_target_segments_default ON target_segments(user_id, is_default) WHERE is_default = true;

-- Ensure only one default segment per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_default_per_user ON target_segments(user_id) WHERE is_default = true;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_target_segments_updated_at BEFORE UPDATE ON target_segments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE target_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own segments"
    ON target_segments FOR SELECT
    USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create their own segments"
    ON target_segments FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own segments"
    ON target_segments FOR UPDATE
    USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own segments"
    ON target_segments FOR DELETE
    USING (auth.uid()::text = user_id);
