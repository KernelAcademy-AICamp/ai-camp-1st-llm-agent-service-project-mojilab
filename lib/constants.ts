// Supabase Storage URL Constants
export const SUPABASE_STORAGE_URL = 'https://xqzsfnaydxxnmrsmyfut.supabase.co/storage/v1/object/public/images';
export const EMOTICONS_STORAGE_URL = `${SUPABASE_STORAGE_URL}/emoticons`;

// Helper function to build full emoticon URL
export const getEmoticonUrl = (path: string) => `${EMOTICONS_STORAGE_URL}/${path}`;
