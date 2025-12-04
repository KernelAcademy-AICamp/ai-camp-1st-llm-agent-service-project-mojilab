'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Download, Loader2, Layers } from 'lucide-react';

interface Scene {
  id: string;
  title: string;
  image_url: string;
  emotion: string;
}

interface GifMakerProps {
  scene: Scene;
  onClose: () => void;
  onSaved?: () => void;
}

export default function GifMaker({ scene, onClose, onSaved }: GifMakerProps) {
  const [action, setAction] = useState('');
  const [frameCount, setFrameCount] = useState<3 | 4 | 5>(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [testMode, setTestMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGifUrl(null);
    setTestMode(false);

    try {
      console.log('🎬 Starting GIF generation...');
      const response = await fetch('/api/emoticons/create-gif', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referenceImageUrl: scene.image_url,
          action: action,
          frameCount,
        }),
      });

      console.log('📡 Response status:', response.status);
      console.log('📦 Content-Type:', response.headers.get('Content-Type'));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', errorText);
        throw new Error('GIF 생성에 실패했습니다.');
      }

      const blob = await response.blob();
      console.log('✅ Received blob:', blob.size, 'bytes, type:', blob.type);

      // GIF 파일인지 확인
      if (!blob.type.includes('gif')) {
        console.error('⚠️ Warning: Blob is not a GIF, type:', blob.type);
      }

      const url = URL.createObjectURL(blob);
      setGifUrl(url);
      console.log('🎉 GIF URL created:', url);
    } catch (error) {
      console.error('GIF generation error:', error);
      alert('GIF 생성에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleQuickTest = async () => {
    setIsGenerating(true);
    setGifUrl(null);
    setTestMode(true);

    try {
      console.log('🧪 QUICK TEST MODE - No LLM, instant GIF');
      const response = await fetch('/api/emoticons/test-gif', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: scene.image_url,
          frameCount,
        }),
      });

      console.log('📡 Test response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Test API Error:', errorText);
        throw new Error('테스트 GIF 생성에 실패했습니다.');
      }

      const blob = await response.blob();
      console.log('✅ Test GIF received:', blob.size, 'bytes');

      const url = URL.createObjectURL(blob);
      setGifUrl(url);
      console.log('🎉 Test GIF ready!');
    } catch (error) {
      console.error('Test GIF error:', error);
      alert('테스트 GIF 생성에 실패했습니다. 콘솔을 확인하세요.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!gifUrl) return;

    console.log('💾 Starting download...');
    console.log('📁 File URL:', gifUrl);

    const filename = testMode
      ? `${scene.title || scene.emotion || 'emoticon'}-test.gif`
      : `${scene.title || scene.emotion || 'emoticon'}-animated.gif`;
    console.log('📄 Filename:', filename);

    const link = document.createElement('a');
    link.href = gifUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log('✅ Download triggered');
  };

  const handleSaveToCollection = async () => {
    if (!gifUrl) return;

    setIsSaving(true);
    try {
      // GIF Blob 가져오기
      const response = await fetch(gifUrl);
      const blob = await response.blob();

      // FormData 생성
      const formData = new FormData();
      formData.append('file', blob, `${scene.id}-animated.gif`);
      formData.append('sceneId', scene.id);
      formData.append('action', action);

      // 서버에 업로드 및 저장
      const saveResponse = await fetch('/api/emoticons/save-gif', {
        method: 'POST',
        body: formData,
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save GIF');
      }

      alert('컬렉션에 추가되었습니다! 내 이모티콘에서 확인하세요.');
      if (onSaved) onSaved();
      onClose();
    } catch (error) {
      console.error('Save to collection error:', error);
      alert('컬렉션 추가에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (gifUrl) {
      URL.revokeObjectURL(gifUrl);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[150] p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Sparkles className="text-emerald-500" size={24} />
              움직이는 이모티콘 만들기
            </h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={24} className="text-gray-600" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Reference Image */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">참조 이미지</h3>
              <div className="flex justify-center">
                <img
                  src={scene.image_url}
                  alt={scene.title}
                  className="w-64 h-64 object-cover rounded-xl shadow-lg"
                />
              </div>
            </div>

            {/* Animation Action Input */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">애니메이션 효과</h3>
              <input
                type="text"
                placeholder="움직임을 표현해보세요"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {/* Frame Count Selection */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">프레임 수</h3>
              <div className="flex gap-3">
                {[3, 4, 5].map((count) => (
                  <button
                    key={count}
                    onClick={() => setFrameCount(count as 3 | 4 | 5)}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all font-medium ${
                      frameCount === count
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    {count}컷
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                프레임이 많을수록 부드럽지만 생성 시간이 길어집니다
              </p>
            </div>

            {/* Result Preview */}
            {gifUrl && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">생성 결과 (애니메이션 GIF)</h3>
                <div className="flex justify-center">
                  <img
                    src={gifUrl}
                    alt="Generated GIF"
                    className="w-64 h-64 object-cover rounded-xl shadow-lg"
                    onLoad={() => console.log('🖼️ GIF preview loaded successfully')}
                    onError={() => console.error('❌ GIF preview failed to load')}
                  />
                </div>
                <p className="text-xs text-gray-500 text-center mt-2">
                  ↑ 움직이는 애니메이션이 보이나요?
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 pt-4">
              {!gifUrl ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleGenerate();
                  }}
                  disabled={isGenerating || !action.trim()}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-400 to-emerald-500 text-white rounded-lg hover:from-emerald-500 hover:to-emerald-600 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      생성 중... (18초 소요)
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} />
                      GIF 생성하기
                    </>
                  )}
                </button>
              ) : (
                <>
                  <div className="flex gap-3">
                    <button
                      onClick={handleDownload}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-400 to-emerald-500 text-white rounded-lg hover:from-emerald-500 hover:to-emerald-600 transition-all font-medium"
                    >
                      <Download size={20} />
                      다운로드
                    </button>
                    <button
                      onClick={handleSaveToCollection}
                      disabled={isSaving}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-400 to-emerald-500 text-white rounded-lg hover:from-emerald-500 hover:to-emerald-600 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="animate-spin" size={20} />
                          저장 중...
                        </>
                      ) : (
                        <>
                          <Layers size={20} />
                          컬렉션에 추가
                        </>
                      )}
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      URL.revokeObjectURL(gifUrl);
                      setGifUrl(null);
                    }}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all font-medium"
                  >
                    다시 만들기
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
