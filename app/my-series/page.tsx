'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Folder, Sparkles, Calendar, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';

interface Series {
  id: string;
  user_id: string;
  title: string;
  theme: string;
  character_description: string | null;
  style_guidelines: string | null;
  num_scenes: number;
  created_at: string;
  thumbnail_url: string | null;
}

export default function MySeriesPage() {
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    fetchMySeries();
  }, [user]);

  const fetchMySeries = async () => {
    try {
      if (!user) {
        setSeries([]);
        setLoading(false);
        return;
      }

      // 시리즈와 첫 번째 씬을 한 번에 가져오기
      const { data, error } = await supabase
        .from('emoticon_series')
        .select(`
          *,
          emoticon_scenes (
            image_url
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 첫 번째 씬 이미지를 thumbnail_url로 매핑
      const seriesWithThumbnails = (data || []).map((s: any) => ({
        ...s,
        thumbnail_url: s.emoticon_scenes?.[0]?.image_url || null,
      }));

      setSeries(seriesWithThumbnails);
    } catch (error) {
      console.error('Error fetching series:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isMounted) {
    return null;
  }

  // 인증 로딩 중
  if (authLoading) {
    return (
      <AppLayout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <Loader2 className="animate-spin" size={32} />
        </div>
      </AppLayout>
    );
  }

  // 로그인 안 된 경우
  if (!user) {
    return (
      <AppLayout>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', textAlign: 'center' }}>
          <AlertCircle size={48} style={{ color: '#f59e0b', marginBottom: '16px' }} />
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 8px 0' }}>로그인이 필요합니다</h2>
          <p style={{ fontSize: '15px', color: '#666', margin: '0 0 24px 0' }}>내 이모티콘을 보려면 먼저 로그인해주세요</p>
          <button
            onClick={() => router.push('/login')}
            style={{ padding: '14px 32px', background: '#10b981', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}
          >
            로그인하기
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="my-series-container">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="page-header"
          >
            <div className="header-title-row">
              <div className="header-icon">
                <Folder
                  size={44}
                  strokeWidth={1.5}
                  style={{ color: '#10b981' }}
                />
              </div>
              <h1 className="page-title">내 이모티콘</h1>
            </div>
          </motion.div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <Sparkles className="animate-spin mx-auto mb-4 text-emerald-600" size={40} />
            <p className="text-gray-600">로딩 중...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && series.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12 bg-white rounded-2xl shadow-lg"
          >
            <Sparkles className="mx-auto mb-4 text-gray-400" size={64} />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              아직 생성한 이모티콘이 없어요
            </h2>
            <p className="text-gray-600 mb-6">첫 이모티콘을 만들어보세요!</p>
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-400 to-emerald-600 text-white rounded-lg hover:from-emerald-500 hover:to-emerald-700 transition-all"
            >
              <Sparkles size={20} />
              이모티콘 생성하기
            </Link>
          </motion.div>
        )}

        {/* Series Grid */}
        {!loading && series.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {series.map((s, index) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link href={`/series/${s.id}`}>
                  <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer group">
                    {/* Thumbnail */}
                    <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
                      {s.thumbnail_url ? (
                        <img
                          src={s.thumbnail_url}
                          alt={s.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <Sparkles className="text-gray-300" size={64} />
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <h3 className="font-bold text-lg text-gray-800 mb-2 line-clamp-1">
                        {s.title}
                      </h3>

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Sparkles size={14} />
                          <span>{s.num_scenes}컷</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar size={14} />
                          <span>{new Date(s.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* View Button */}
                      <div className="mt-4 flex items-center justify-center gap-2 text-emerald-600 font-medium group-hover:gap-3 transition-all">
                        <span>보기</span>
                        <ArrowRight size={16} />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

      <style jsx>{`
        .my-series-container {
          min-height: calc(100vh - 70px);
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          align-items: center;
          padding: 0 20px 20px;
          margin-top: -57px;
          background: #f5f5f7;
          max-width: 1200px;
          margin-left: auto;
          margin-right: auto;
        }

        .page-header {
          text-align: left;
          margin-bottom: 48px;
          margin-top: 40px;
          width: 100%;
        }

        .header-title-row {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .header-icon {
          position: relative;
          flex-shrink: 0;
        }

        .page-title {
          font-size: 36px;
          font-weight: 800;
          color: #1a1a1a;
          margin: 0;
          letter-spacing: -0.5px;
          word-break: keep-all;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
          min-width: 0;
        }

        @media (max-width: 768px) {
          .my-series-container {
            padding: 0 16px 16px;
            margin-top: -57px;
          }

          .page-header {
            margin-bottom: 32px;
            margin-top: 32px;
          }

          .page-title {
            font-size: 28px;
          }
        }
      `}</style>
    </div>
    </AppLayout>
  );
}
