'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles, Loader2, Download, Layers, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import JSZip from 'jszip';
import GifMaker from '@/components/GifMaker';

interface Scene {
  id: string;
  series_id: string;
  scene_number: number;
  title: string;
  prompt: string;
  emotion: string;
  intensity: number;
  image_url: string;
  gif_url?: string;
  gif_action?: string;
  created_at: string;
}

interface Series {
  id: string;
  user_id: string;
  title: string;
  theme: string;
  character_description: string | null;
  style_guidelines: string | null;
  num_scenes: number;
  created_at: string;
}

export default function SeriesDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const seriesId = params.id as string;

  const [series, setSeries] = useState<Series | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
  const [showGifMaker, setShowGifMaker] = useState(false);

  // 소유권 확인
  const isOwner = user && series && user.id === series.user_id;

  useEffect(() => {
    if (seriesId) {
      fetchSeriesData();
    }
  }, [seriesId]);

  const fetchSeriesData = async () => {
    try {
      // Fetch series metadata
      const { data: seriesData, error: seriesError } = await supabase
        .from('emoticon_series')
        .select('*')
        .eq('id', seriesId)
        .single();

      if (seriesError) throw seriesError;

      setSeries(seriesData);

      // Fetch scenes
      const { data: scenesData, error: scenesError } = await supabase
        .from('emoticon_scenes')
        .select('*')
        .eq('series_id', seriesId)
        .order('scene_number');

      if (scenesError) throw scenesError;

      setScenes(scenesData || []);
    } catch (error) {
      console.error('Error fetching series:', error);
      alert('시리즈를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAll = async () => {
    try {
      console.log(`📦 Creating ZIP with ${scenes.length} images...`);

      const zip = new JSZip();

      // Fetch all images and add to zip
      for (const [index, scene] of scenes.entries()) {
        try {
          console.log(`📥 Fetching ${index + 1}/${scenes.length}: ${scene.title}`);

          const response = await fetch(scene.image_url);
          const blob = await response.blob();

          // Add to zip with filename
          const filename = `${String(scene.scene_number).padStart(2, '0')}-${scene.title}.png`;
          zip.file(filename, blob);

          console.log(`✅ Added to ZIP: ${filename}`);
        } catch (error) {
          console.error(`❌ Failed to fetch ${scene.title}:`, error);
        }
      }

      console.log('🗜️ Generating ZIP file...');

      // Generate zip file
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      // Download zip
      const link = document.createElement('a');
      const blobUrl = URL.createObjectURL(zipBlob);
      link.href = blobUrl;
      link.download = `${series?.title || 'emoticons'}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Cleanup
      URL.revokeObjectURL(blobUrl);

      console.log('🎉 ZIP download completed!');
      alert(`${scenes.length}개 이미지가 ZIP 파일로 다운로드되었습니다!`);
    } catch (error) {
      console.error('❌ ZIP creation failed:', error);
      alert('ZIP 파일 생성에 실패했습니다.');
    }
  };

  const handleDownloadSingle = async (scene: Scene) => {
    try {
      // GIF가 있으면 GIF 다운로드, 없으면 이미지 다운로드
      const downloadUrl = scene.gif_url || scene.image_url;
      const fileExtension = scene.gif_url ? 'gif' : 'png';

      // Fetch the file as a blob to bypass CORS issues
      const response = await fetch(downloadUrl);
      const blob = await response.blob();

      // Create a blob URL
      const blobUrl = URL.createObjectURL(blob);

      // Create download link
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${scene.title || scene.emotion}.${fileExtension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    } catch (error) {
      console.error('Download failed:', error);
      alert('다운로드에 실패했습니다.');
    }
  };

  const handleMakeGif = (scene: Scene) => {
    setSelectedScene(scene);
    setShowGifMaker(true);
  };

  const handleKakaoShare = (scene: Scene) => {
    console.log('handleKakaoShare called', { scene, kakaoLoaded: !!window.Kakao });

    if (!window.Kakao) {
      console.error('Kakao SDK not loaded');
      alert('카카오 SDK가 로드되지 않았습니다.');
      return;
    }

    if (!window.Kakao.isInitialized()) {
      console.error('Kakao SDK not initialized');
      alert('카카오 SDK가 초기화되지 않았습니다.');
      return;
    }

    if (!series) {
      console.error('No series data');
      alert('공유할 콘텐츠가 없습니다.');
      return;
    }

    // 사용자에게 메시지 입력받기
    const userMessage = prompt('카카오톡으로 보낼 메시지를 입력하세요:', '');

    if (userMessage === null) {
      // 취소 버튼 클릭
      return;
    }

    try {
      // 제목: 장면 제목만 (없으면 빈 문자열)
      const titleText = scene.title && !scene.title.match(/^Scene\s+\d+$/i)
        ? scene.title
        : '';

      const shareData = {
        objectType: 'feed' as const,
        content: {
          title: titleText,
          description: userMessage || ' ',
          imageUrl: scene.image_url,
          link: {
            mobileWebUrl: scene.image_url,
            webUrl: scene.image_url,
          },
        },
      };

      console.log('Sending Kakao share:', shareData);

      // setTimeout으로 카카오 SDK의 DOM 조작 완료를 기다림
      setTimeout(() => {
        try {
          window.Kakao.Share.sendDefault(shareData);
          console.log('Kakao share sent successfully');
        } catch (error) {
          console.error('Kakao share error:', error);
          alert('공유에 실패했습니다: ' + (error as Error).message);
        }
      }, 100);
    } catch (error) {
      console.error('Kakao share error:', error);
      alert('공유에 실패했습니다: ' + (error as Error).message);
    }
  };

  if (loading || authLoading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
          <Loader2 className="animate-spin text-emerald-600" size={40} />
        </div>
      </AppLayout>
    );
  }

  if (!series) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
          <div className="text-center">
            <p className="text-gray-600 mb-4">시리즈를 찾을 수 없습니다.</p>
            <button
              onClick={() => router.push('/my-series')}
              className="px-4 py-2 bg-gradient-to-r from-emerald-400 to-emerald-500 text-white rounded-lg hover:from-emerald-500 hover:to-emerald-600 transition-all"
            >
              ← 돌아가기
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen p-8 pt-12" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => router.push('/my-series')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          >
            <ArrowLeft size={32} strokeWidth={2} />
          </button>

          <div className="flex items-start justify-between">
            <div className="flex-1 max-w-3xl">
              <h1 className="text-4xl font-bold text-gray-800 mb-2">{series.title.length> 20? series.title.slice(0,20) + '...' : series.title}</h1>
              <p className="text-gray-600 mb-4">{series.theme.length > 20 ? series.theme.slice(0, 20) + '...' : series.theme}</p>
              <div className="flex gap-2 text-sm text-gray-500">
                <span>{scenes.length}컷</span>
                <span>•</span>
                <span>{new Date(series.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="flex gap-3">
              {isOwner ? (
                <>
                  <button
                    onClick={() => router.push(`/editor?seriesId=${seriesId}&width=360&height=360`)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-400 to-purple-500 text-white rounded-lg hover:from-purple-500 hover:to-purple-600 transition-all"
                  >
                    <Layers size={18} />
                    그룹 편집
                  </button>
                  <button
                    onClick={handleDownloadAll}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-400 to-emerald-500 text-white rounded-lg hover:from-emerald-500 hover:to-emerald-600 transition-all"
                  >
                    <Download size={18} />
                    전체 다운로드
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-500 rounded-lg">
                  <Lock size={18} />
                  읽기 전용
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Scenes Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {scenes.flatMap((scene, index) => {
            const cards = [];

            // 정적 이미지 카드 (항상 표시)
            if (scene.image_url) {
              cards.push(
                <motion.div
                  key={`${scene.id}-static`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-xl shadow-lg overflow-hidden group cursor-pointer"
                >
                  <div className="aspect-square bg-gray-100 flex items-center justify-center relative">
                    <img
                      src={scene.image_url}
                      alt={scene.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                      PNG
                    </div>

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => handleKakaoShare(scene)}
                        className="w-16 h-16 bg-white bg-opacity-20 hover:bg-opacity-30 backdrop-blur-sm rounded-full transition-all transform scale-95 group-hover:scale-100 flex items-center justify-center shadow-xl border-2 border-white border-opacity-30"
                        title="카카오톡 공유"
                      >
                        <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 3C6.477 3 2 6.582 2 11c0 2.8 1.8 5.28 4.5 6.74-.2.74-.73 2.67-.83 3.1-.12.51.19.5.39.37.16-.11 2.5-1.67 3.44-2.31.5.07 1 .1 1.5.1 5.523 0 10-3.582 10-8S17.523 3 12 3z" fill="white" fillOpacity="0.9" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Scene Info */}
                  {scene.title && !scene.title.match(/^Scene\s+\d+$/i) && (
                    <div className="p-3">
                      <h3 className="font-semibold text-gray-800 text-sm mb-1 truncate">{scene.title}</h3>
                      {scene.emotion && <p className="text-xs text-gray-600 truncate">{scene.emotion}</p>}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="px-3 pb-3 flex items-center gap-2">
                    {isOwner && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const link = document.createElement('a');
                            link.href = scene.image_url;
                            link.download = `${scene.title || 'image'}.png`;
                            link.click();
                          }}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm"
                          title="다운로드"
                        >
                          <Download size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMakeGif(scene);
                          }}
                          className="flex-1 px-3 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-colors text-sm font-medium"
                        >
                          GIF 만들기
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            }

            // GIF 카드 (GIF가 있을 때만 표시)
            if (scene.gif_url) {
              cards.push(
                <motion.div
                  key={`${scene.id}-gif`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 + 0.05 }}
                  className="bg-white rounded-xl shadow-lg overflow-hidden group cursor-pointer border-2 border-emerald-200"
                >
                  <div className="aspect-square bg-gray-100 flex items-center justify-center relative">
                    <img
                      src={scene.gif_url}
                      alt={`${scene.title} (animated)`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-emerald-600 text-white text-xs px-2 py-1 rounded font-semibold">
                      GIF
                    </div>

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => handleKakaoShare(scene)}
                        className="w-16 h-16 bg-white bg-opacity-20 hover:bg-opacity-30 backdrop-blur-sm rounded-full transition-all transform scale-95 group-hover:scale-100 flex items-center justify-center shadow-xl border-2 border-white border-opacity-30"
                        title="카카오톡 공유"
                      >
                        <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 3C6.477 3 2 6.582 2 11c0 2.8 1.8 5.28 4.5 6.74-.2.74-.73 2.67-.83 3.1-.12.51.19.5.39.37.16-.11 2.5-1.67 3.44-2.31.5.07 1 .1 1.5.1 5.523 0 10-3.582 10-8S17.523 3 12 3z" fill="white" fillOpacity="0.9" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Scene Info */}
                  {scene.title && !scene.title.match(/^Scene\s+\d+$/i) && (
                    <div className="p-3">
                      <h3 className="font-semibold text-gray-800 text-sm mb-1 truncate">{scene.title}</h3>
                      {scene.gif_action && <p className="text-xs text-emerald-600 truncate">🎬 {scene.gif_action}</p>}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="px-3 pb-3 flex items-center gap-2">
                    {isOwner && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const link = document.createElement('a');
                            link.href = scene.gif_url!;
                            link.download = `${scene.title || 'image'}.gif`;
                            link.click();
                          }}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm"
                          title="다운로드"
                        >
                          <Download size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMakeGif(scene);
                          }}
                          className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
                        >
                          다시 만들기
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            }

            return cards;
          })}
        </div>
      </div>
    </div>

      {/* GIF Maker Modal */}
      {showGifMaker && selectedScene && (
        <GifMaker
          scene={selectedScene}
          onClose={() => setShowGifMaker(false)}
          onSaved={() => {
            // 데이터 새로고침
            fetchSeriesData();
          }}
        />
      )}
    </AppLayout>
  );
}
