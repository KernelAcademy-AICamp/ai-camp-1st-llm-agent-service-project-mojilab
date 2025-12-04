'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, Download, RefreshCw, Pencil } from 'lucide-react';
import EmojiEditor from './emoji-editor/EmojiEditor';
import { useAuth } from '@/contexts/AuthContext';
import { useGeneration } from '@/contexts/GenerationContext';

interface Scene {
  scene_number: number;
  title: string;
  prompt: string;
  image_url: string | null;
  emotion: string;
  intensity: number;
  status?: 'pending' | 'generating' | 'complete';
}

interface SeriesMetadata {
  title: string;
  theme: string;
  character_description: string;
  style_guidelines: string;
  consistency_score: number;
}

interface SeriesResponse {
  success: boolean;
  metadata: SeriesMetadata;
  scenes: Scene[];
  data: {
    series_id: string;
    summary: any;
  };
}

export default function SeriesGenerator() {
  const { user } = useAuth();
  const { startGeneration, updateProgress, endGeneration } = useGeneration();
  const searchParams = useSearchParams();
  const [isMounted, setIsMounted] = useState(false);
  const [theme, setTheme] = useState('');
  const [numScenes, setNumScenes] = useState(8);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SeriesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isFromChatbot, setIsFromChatbot] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [seriesId, setSeriesId] = useState<string | null>(null);
  const [regeneratingScene, setRegeneratingScene] = useState<number | null>(null);
  const [editingSceneNumber, setEditingSceneNumber] = useState<number | null>(null);
  const hasStartedRef = useRef(false);

  // Prevent hydration error
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auto-start generation from URL parameters (from chatbot)
  useEffect(() => {
    // Prevent double execution in React Strict Mode
    if (hasStartedRef.current) return;
    if (!isMounted) return; // Wait for client-side mount

    const urlTheme = searchParams.get('theme');
    const urlNumScenes = searchParams.get('num_scenes');

    if (urlTheme) {
      hasStartedRef.current = true; // Mark as started

      const themeValue = urlTheme;
      const numScenesValue = urlNumScenes ? Number(urlNumScenes) : 8;

      setTheme(themeValue);
      setNumScenes(numScenesValue);
      setIsFromChatbot(true);

      // Use URL params directly instead of waiting for state update
      startGenerationProcess(themeValue, numScenesValue);
    }
  }, [isMounted, searchParams]);

  const startGenerationProcess = async (themeValue: string, numScenesValue: number) => {
    console.log('[START] Starting generation:', { theme: themeValue, num_scenes: numScenesValue });

    setLoading(true);
    setError(null);
    setResult(null);
    setProgress(0);
    setScenes([]);
    setStatusMessage('');

    // Update global generation state
    startGeneration(themeValue, numScenesValue);

    // Estimate total time: 30s (story) + 3s per image
    const estimatedTime = 30 + (numScenesValue * 3);
    const startTime = Date.now();

    // Progress timer (fake progress based on estimated time)
    let progressInterval: NodeJS.Timeout | null = null;

    progressInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000; // seconds
      const estimatedProgress = Math.min((elapsed / estimatedTime) * 100, 99);

      setProgress(Math.floor(estimatedProgress));

      // 3-stage status messages based on progress percentage
      if (estimatedProgress < 60) {
        setStatusMessage('이모티콘을 구상하고 있습니다...');
      } else if (estimatedProgress < 85) {
        setStatusMessage('세부 표현을 다듬고 있습니다...');
      } else {
        setStatusMessage('마무리 작업 중입니다...');
      }
    }, 100); // Update every 100ms

    try {
      console.log('[FETCH] Calling API:', 'http://localhost:8000/api/generate/series');

      const response = await fetch('http://localhost:8000/api/generate/series', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          theme: themeValue,
          num_scenes: numScenesValue,
          user_id: user?.id || 'anonymous',
        }),
      });

      console.log('[RESPONSE] Status:', response.status, 'OK:', response.ok);

      if (!response.ok) {
        throw new Error('Failed to start generation');
      }

      // Read SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        console.error('[ERROR] No response body');
        throw new Error('No response body');
      }

      console.log('[SSE] Starting to read stream');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log('[SSE] Stream ended');
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // Keep the last incomplete line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            console.log('[SSE] Received:', line);
            try {
              const data = JSON.parse(line.slice(6));
              console.log('[SSE] Parsed:', data);

              switch (data.type) {
                case 'story_complete':
                  console.log('[STORY] Story complete:', data.data);
                  // Initialize result metadata
                  setResult({
                    success: true,
                    metadata: {
                      title: data.data.title || theme,
                      theme: data.data.theme || theme,
                      character_description: '',
                      style_guidelines: '',
                      consistency_score: 0.9,
                    },
                    scenes: [],
                    data: { series_id: '', summary: {} },
                  });
                  break;

                case 'scene_complete':
                  console.log('[SCENE] Scene complete:', data.data, 'Progress:', data.progress);
                  setProgress(data.progress);

                  // Update global progress
                  updateProgress(data.progress, data.data.scene_number);

                  // Add or update scene (only update scenes state, not result)
                  setScenes((prev) => {
                    const existingIndex = prev.findIndex(
                      (s) => s.scene_number === data.data.scene_number
                    );

                    const newScene: Scene = {
                      ...data.data,
                      prompt: data.data.title,
                      status: 'complete',
                    };

                    if (existingIndex >= 0) {
                      const updated = [...prev];
                      updated[existingIndex] = newScene;
                      return updated;
                    } else {
                      return [...prev, newScene].sort(
                        (a, b) => a.scene_number - b.scene_number
                      );
                    }
                  });
                  break;

                case 'generation_complete':
                  console.log('[COMPLETE] Generation complete!', data);
                  clearInterval(progressInterval);
                  setProgress(100);
                  setStatusMessage('모든 이모티콘 생성 완료!');
                  setLoading(false);

                  // End global generation state
                  endGeneration();

                  // Store series_id for modification
                  if (data.series_id) {
                    console.log('[SERIES_ID] Stored:', data.series_id);
                    setSeriesId(data.series_id);
                  }
                  break;

                case 'error':
                  console.error('[ERROR] Generation error:', data.message);
                  clearInterval(progressInterval);
                  setError(data.message);
                  setLoading(false);
                  break;
              }
            } catch (e) {
              console.error('[PARSE ERROR] Failed to parse SSE data:', line, e);
            }
          }
        }
      }
    } catch (err) {
      console.error('[FATAL ERROR]', err);
      if (progressInterval) clearInterval(progressInterval);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  const generateSeries = async () => {
    if (!theme.trim()) {
      setError('테마를 입력해주세요');
      return;
    }

    await startGenerationProcess(theme, numScenes);
  };

  const downloadSeries = () => {
    if (!result) return;
    // Implement download logic
    alert('다운로드 기능은 추후 구현 예정입니다');
  };

  const regenerateScene = async (sceneNumber: number) => {
    if (!seriesId) {
      alert('시리즈 ID가 없습니다. 생성 완료 후 다시 시도해주세요.');
      return;
    }

    // Simple regeneration without custom prompt for now
    const userPrompt = prompt(`장면 ${sceneNumber}을(를) 어떻게 수정하시겠습니까?\n(예: "더 밝게", "3D → 2D로", "더 웃긴 표정으로")\n\n비워두면 원본 프롬프트로 재생성합니다.`);

    if (userPrompt === null) {
      // User cancelled
      return;
    }

    setRegeneratingScene(sceneNumber);

    try {
      console.log('[REGENERATE] Starting regeneration for scene:', sceneNumber);

      const response = await fetch(
        `http://localhost:8000/api/generate/series/${seriesId}/regenerate/${sceneNumber}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            modification_description: userPrompt || undefined,
            user_id: user?.id || 'anonymous',
          }),
        }
      );

      if (!response.ok) {
        throw new Error('재생성 실패');
      }

      const result = await response.json();
      console.log('[REGENERATE] Success:', result);

      // Update scene with new image
      setScenes((prev) =>
        prev.map((scene) =>
          scene.scene_number === sceneNumber
            ? { ...scene, image_url: result.new_image_url }
            : scene
        )
      );

      alert(`장면 ${sceneNumber}이(가) 성공적으로 재생성되었습니다!`);
    } catch (error) {
      console.error('[REGENERATE ERROR]', error);
      alert('재생성 중 오류가 발생했습니다.');
    } finally {
      setRegeneratingScene(null);
    }
  };

  // Handle edited image save
  const handleEditSave = (editedImageUrl: string) => {
    if (editingSceneNumber === null) return;

    // Update the scene with the edited image URL
    setScenes((prev) =>
      prev.map((scene) =>
        scene.scene_number === editingSceneNumber
          ? { ...scene, image_url: editedImageUrl }
          : scene
      )
    );

    setEditingSceneNumber(null);
  };

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-gray-800 mb-4 flex items-center justify-center gap-3">
            <Sparkles className="text-emerald-600" size={40} />
            스토리 기반 이모티콘 시리즈 생성기
          </h1>
          <p className="text-gray-600">
            AI 에이전트가 일관된 스토리를 가진 이모티콘 시리즈를 자동으로 생성합니다
          </p>
        </motion.div>

        {/* Chatbot Auto-Generation View */}
        {isFromChatbot ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-8 mb-8"
          >
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-emerald-50 rounded-full mb-4">
                <Sparkles className="text-emerald-600" size={24} />
                <div className="text-left">
                  <p className="text-sm text-gray-600">테마</p>
                  <p className="font-semibold text-gray-800">{theme}</p>
                </div>
                <div className="text-left border-l pl-3 ml-3">
                  <p className="text-sm text-gray-600">장면 수</p>
                  <p className="font-semibold text-gray-800">{numScenes}컷</p>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}

            {/* Progress Bar */}
            {loading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{statusMessage || 'AI가 이모티콘을 생성하고 있어요...'}</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-emerald-600 to-blue-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 text-center">
                  완성되는 대로 아래에 표시됩니다
                </p>
              </div>
            )}
          </motion.div>
        ) : (
          /* Manual Input Section */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-8 mb-8"
          >
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  시리즈 테마
                </label>
                <textarea
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      generateSeries();
                    }
                  }}
                  placeholder="예: 회사 생활 8컷, 주말 요리 레시피, 운동 루틴"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                  rows={3}
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  장면 개수: {numScenes}개
                </label>
                <input
                  type="range"
                  min="2"
                  max="12"
                  value={numScenes}
                  onChange={(e) => setNumScenes(Number(e.target.value))}
                  className="w-full"
                  disabled={loading}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>2개</span>
                  <span>12개</span>
                </div>
              </div>

              <button
                onClick={generateSeries}
                disabled={loading || !theme.trim()}
                className="w-full bg-gradient-to-r from-emerald-600 to-blue-600 text-white py-4 rounded-lg font-semibold hover:from-emerald-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    생성 중...
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    시리즈 생성하기
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}

            {/* Progress Bar */}
            {loading && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>생성 진행 중...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-emerald-600 to-blue-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 text-center">
                  완성되는 대로 아래에 표시됩니다
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Real-time Scenes Grid */}
        {scenes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {scenes.map((scene) => (
                <motion.div
                  key={scene.scene_number}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-xl shadow-lg overflow-hidden"
                >
                  <div className="aspect-square bg-gray-100 flex items-center justify-center">
                    {scene.image_url ? (
                      <img
                        src={scene.image_url}
                        alt={scene.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <Loader2 className="animate-spin mx-auto mb-2 text-gray-400" size={24} />
                        <p className="text-xs text-gray-500">생성 중...</p>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="text-xs text-gray-500 mb-1">Scene {scene.scene_number}</div>
                    <h3 className="font-semibold text-gray-800 text-sm mb-1">{scene.title}</h3>
                    <div className="flex items-center gap-2 text-xs mb-2">
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded">
                        {scene.emotion}
                      </span>
                      <span className="text-gray-500">강도: {scene.intensity}/10</span>
                    </div>

                    {/* Edit and Regenerate Buttons */}
                    {scene.image_url && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => setEditingSceneNumber(scene.scene_number)}
                          className="flex-1 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
                        >
                          <Pencil size={14} />
                          편집
                        </button>
                        {seriesId && (
                          <button
                            onClick={() => regenerateScene(scene.scene_number)}
                            disabled={regeneratingScene === scene.scene_number}
                            className="flex-1 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {regeneratingScene === scene.scene_number ? (
                              <>
                                <Loader2 className="animate-spin" size={14} />
                                재생성 중...
                              </>
                            ) : (
                              <>
                                <RefreshCw size={14} />
                                재생성
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Results Section */}
        {result && result.scenes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Metadata */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                {result.metadata.title}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold text-gray-700">테마:</span>
                  <span className="ml-2 text-gray-600">{result.metadata.theme}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">일관성 점수:</span>
                  <span className="ml-2 text-gray-600">
                    {(result.metadata.consistency_score * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="md:col-span-2">
                  <span className="font-semibold text-gray-700">캐릭터:</span>
                  <p className="mt-1 text-gray-600">{result.metadata.character_description}</p>
                </div>
                <div className="md:col-span-2">
                  <span className="font-semibold text-gray-700">스타일:</span>
                  <p className="mt-1 text-gray-600">{result.metadata.style_guidelines}</p>
                </div>
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  onClick={downloadSeries}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <Download size={16} />
                  다운로드
                </button>
                <button
                  onClick={() => setResult(null)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <RefreshCw size={16} />
                  새로 만들기
                </button>
              </div>
            </div>

            {/* Scenes Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {result.scenes.map((scene) => (
                <motion.div
                  key={scene.scene_number}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: scene.scene_number * 0.1 }}
                  className="bg-white rounded-xl shadow-lg overflow-hidden"
                >
                  <div className="aspect-square bg-gray-100 flex items-center justify-center">
                    {scene.image_url ? (
                      <img
                        src={scene.image_url}
                        alt={scene.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <Loader2 className="animate-spin mx-auto mb-2 text-gray-400" size={24} />
                        <p className="text-xs text-gray-500">생성 중...</p>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="text-xs text-gray-500 mb-1">Scene {scene.scene_number}</div>
                    <h3 className="font-semibold text-gray-800 text-sm mb-1">{scene.title}</h3>
                    <div className="flex items-center gap-2 text-xs mb-2">
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded">
                        {scene.emotion}
                      </span>
                      <span className="text-gray-500">강도: {scene.intensity}/10</span>
                    </div>

                    {/* Edit and Regenerate Buttons */}
                    {scene.image_url && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => setEditingSceneNumber(scene.scene_number)}
                          className="flex-1 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
                        >
                          <Pencil size={14} />
                          편집
                        </button>
                        {seriesId && (
                          <button
                            onClick={() => regenerateScene(scene.scene_number)}
                            disabled={regeneratingScene === scene.scene_number}
                            className="flex-1 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {regeneratingScene === scene.scene_number ? (
                              <>
                                <Loader2 className="animate-spin" size={14} />
                                재생성 중...
                              </>
                            ) : (
                              <>
                                <RefreshCw size={14} />
                                재생성
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Emoji Editor Modal */}
        {isMounted && editingSceneNumber !== null && (
          <EmojiEditor
            imageUrl={
              scenes.find((s) => s.scene_number === editingSceneNumber)?.image_url || ''
            }
            onSave={handleEditSave}
            onClose={() => setEditingSceneNumber(null)}
          />
        )}
      </div>
    </div>
  );
}
