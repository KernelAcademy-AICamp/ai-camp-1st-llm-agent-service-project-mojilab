import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service role key로 클라이언트 생성 (RLS 우회)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const sceneId = formData.get('sceneId') as string;
    const action = formData.get('action') as string;

    if (!file || !sceneId) {
      return NextResponse.json(
        { error: 'Missing required fields: file, sceneId' },
        { status: 400 }
      );
    }

    console.log('💾 Saving GIF to collection...');
    console.log(`Scene ID: ${sceneId}`);
    console.log(`Action: ${action}`);
    console.log(`File size: ${file.size} bytes`);

    // 1. GIF 파일을 Supabase Storage에 업로드
    const fileName = `${sceneId}-${Date.now()}.gif`;
    const fileBuffer = await file.arrayBuffer();

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('images')
      .upload(`emoticons/gifs/${fileName}`, fileBuffer, {
        contentType: 'image/gif',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    console.log('✅ GIF uploaded to storage:', uploadData.path);

    // 2. Public URL 생성
    const { data: urlData } = supabaseAdmin.storage
      .from('images')
      .getPublicUrl(`emoticons/gifs/${fileName}`);

    const gifUrl = urlData.publicUrl;
    console.log('🔗 Public URL:', gifUrl);

    // 3. Scene에 GIF URL 업데이트
    const { error: updateError } = await supabaseAdmin
      .from('emoticon_scenes')
      .update({
        gif_url: gifUrl,
        gif_action: action
      })
      .eq('id', sceneId);

    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error(`Database update failed: ${updateError.message}`);
    }

    console.log('✅ Scene updated with GIF URL');

    return NextResponse.json({
      success: true,
      gifUrl,
      sceneId,
    });

  } catch (error: any) {
    console.error('❌ Save GIF error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to save GIF',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}
