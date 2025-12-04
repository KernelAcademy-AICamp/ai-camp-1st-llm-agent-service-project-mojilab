import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side client with service role key for storage upload
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

interface SaveSeriesRequest {
  character: string;
  theme: string;
  style: string;
  scenes: Array<{
    index: number;
    name: string;
    dataUrl: string;
  }>;
  userId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();

    // 인증 토큰 검증
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authUser) {
      return NextResponse.json(
        { error: '유효하지 않은 인증입니다' },
        { status: 401 }
      );
    }

    const body: SaveSeriesRequest = await request.json();
    const { character, theme, style, scenes, userId } = body;

    // userId와 인증된 사용자 일치 확인
    if (userId && userId !== authUser.id) {
      return NextResponse.json(
        { error: '권한이 없습니다' },
        { status: 403 }
      );
    }

    // 인증된 사용자 ID 사용
    const targetUserId = authUser.id;

    // 1. Create series record
    const { data: series, error: seriesError } = await supabase
      .from('emoticon_series')
      .insert({
        user_id: targetUserId,
        theme: theme,
        title: `${character} - ${theme}`,
        character_description: character,
        num_scenes: scenes.length,
        metadata: {
          style: style,
          generation_method: 'hybrid_lora_gemini',
          created_from: 'trending',
        },
      })
      .select()
      .single();

    if (seriesError) {
      console.error('Series creation error:', seriesError);
      throw seriesError;
    }

    // 2. Upload images to Supabase Storage and create scene records
    const scenePromises = scenes.map(async (scene) => {
      // Convert base64 data URL to blob
      const base64Data = scene.dataUrl.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // Upload to Supabase Storage
      const fileName = `emoticons/${series.id}/scene_${scene.index}.png`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, buffer, {
          contentType: 'image/png',
          upsert: true,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(fileName);

      // Create scene record
      const { error: sceneError } = await supabase
        .from('emoticon_scenes')
        .insert({
          series_id: series.id,
          scene_number: scene.index,
          title: scene.name,
          narrative: '',
          prompt: `${character} - ${theme} - Scene ${scene.index + 1}`,
          image_url: urlData.publicUrl,
          metadata: {
            original_style: style,
          },
        });

      if (sceneError) {
        console.error('Scene creation error:', sceneError);
        throw sceneError;
      }

      return urlData.publicUrl;
    });

    await Promise.all(scenePromises);

    return NextResponse.json({
      success: true,
      seriesId: series.id,
      message: 'Series saved successfully',
    });

  } catch (error: any) {
    console.error('Error saving series:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to save series',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}
