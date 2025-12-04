import { supabase } from './supabase';

const BUCKET_NAME = 'images';

export interface UploadImageResult {
  url: string;
  path: string;
}

/**
 * 이미지를 Supabase Storage에 업로드합니다
 * @param file - 업로드할 파일
 * @param folder - 저장할 폴더 경로 (예: 'designs', 'templates')
 * @returns 업로드된 이미지의 public URL과 저장 경로
 */
export async function uploadImage(
  file: File,
  folder: string = 'uploads'
): Promise<UploadImageResult> {
  try {
    // 파일 확장자 추출
    const fileExt = file.name.split('.').pop();
    // 고유한 파일명 생성
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    // Supabase Storage에 업로드
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw error;
    }

    // Public URL 가져오기
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return {
      url: urlData.publicUrl,
      path: filePath,
    };
  } catch (error) {
    console.error('Error uploading image:', error);
    throw new Error('이미지 업로드에 실패했습니다');
  }
}

/**
 * Supabase Storage에서 이미지를 삭제합니다
 * @param path - 삭제할 이미지의 경로
 */
export async function deleteImage(path: string): Promise<void> {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path]);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    throw new Error('이미지 삭제에 실패했습니다');
  }
}

/**
 * Base64 문자열을 Blob으로 변환합니다
 * @param base64 - Base64 인코딩된 문자열
 * @param contentType - 파일의 MIME 타입
 * @returns Blob 객체
 */
export function base64ToBlob(base64: string, contentType: string = 'image/png'): Blob {
  const byteCharacters = atob(base64.split(',')[1]);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: contentType });
}

/**
 * Base64 이미지를 Supabase Storage에 업로드합니다
 * @param base64 - Base64 인코딩된 이미지
 * @param folder - 저장할 폴더 경로
 * @param fileName - 파일명 (확장자 포함)
 * @returns 업로드된 이미지의 public URL과 저장 경로
 */
export async function uploadBase64Image(
  base64: string,
  folder: string = 'generated',
  fileName?: string
): Promise<UploadImageResult> {
  try {
    const blob = base64ToBlob(base64);
    const file = new File(
      [blob],
      fileName || `${Date.now()}.png`,
      { type: 'image/png' }
    );

    return await uploadImage(file, folder);
  } catch (error) {
    console.error('Error uploading base64 image:', error);
    throw new Error('Base64 이미지 업로드에 실패했습니다');
  }
}
