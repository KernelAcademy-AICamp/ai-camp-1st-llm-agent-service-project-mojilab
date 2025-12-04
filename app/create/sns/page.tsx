'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Instagram, Facebook, Twitter, Youtube, Pencil } from 'lucide-react';

interface FormatOption {
  id: string;
  name: string;
  icon: React.ReactNode;
  aspectRatio: string;
  dimensions: string;
  color: string;
}

export default function SNSContentPage() {
  const router = useRouter();
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);

  const formats: FormatOption[] = [
    {
      id: 'instagram_post',
      name: 'Instagram 피드 (추천)',
      icon: <Instagram size={32} />,
      aspectRatio: '4:5',
      dimensions: '1080 × 1350',
      color: '#E1306C',
    },
    {
      id: 'instagram_square',
      name: 'Instagram 정사각형',
      icon: <Instagram size={32} />,
      aspectRatio: '1:1',
      dimensions: '1080 × 1080',
      color: '#E1306C',
    },
    {
      id: 'instagram_story',
      name: 'Instagram 스토리',
      icon: <Instagram size={32} />,
      aspectRatio: '9:16',
      dimensions: '1080 × 1920',
      color: '#E1306C',
    },
    {
      id: 'facebook_post',
      name: 'Facebook 게시물',
      icon: <Facebook size={32} />,
      aspectRatio: '1:1',
      dimensions: '1200 × 1200',
      color: '#1877F2',
    },
    {
      id: 'twitter_post',
      name: 'Twitter 게시물',
      icon: <Twitter size={32} />,
      aspectRatio: '16:9',
      dimensions: '1200 × 675',
      color: '#1DA1F2',
    },
    {
      id: 'youtube_thumbnail',
      name: 'YouTube 썸네일',
      icon: <Youtube size={32} />,
      aspectRatio: '16:9',
      dimensions: '1280 × 720',
      color: '#FF0000',
    },
  ];

  const toggleFormat = (formatId: string) => {
    if (selectedFormats.includes(formatId)) {
      setSelectedFormats(selectedFormats.filter((id) => id !== formatId));
    } else {
      setSelectedFormats([...selectedFormats, formatId]);
    }
  };

  const handleStartEditing = () => {
    if (selectedFormats.length === 0) {
      alert('최소 1개의 포맷을 선택해주세요.');
      return;
    }
    // Navigate to editor page with selected formats
    router.push(`/create/sns/editor?formats=${selectedFormats.join(',')}`);
  };

  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center gap-3">
              <Instagram className="text-pink-600" size={40} />
              SNS 콘텐츠 편집기
            </h1>
            <p className="text-gray-600">
              내 이모티콘으로 여러 SNS 포맷을 한 번에 만드세요
            </p>
          </motion.div>

        {/* Format Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-lg p-8 mb-8"
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-4">포맷 선택</h2>
          <p className="text-gray-600 mb-6">생성하고 싶은 포맷을 선택하세요 (여러 개 가능)</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {formats.map((format) => (
              <div
                key={format.id}
                onClick={() => toggleFormat(format.id)}
                className={`
                  p-6 rounded-xl border-2 cursor-pointer transition-all duration-200
                  ${
                    selectedFormats.includes(format.id)
                      ? 'border-emerald-500 bg-emerald-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }
                `}
              >
                <div className="flex items-center gap-4 mb-3">
                  <div
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: `${format.color}15` }}
                  >
                    <div style={{ color: format.color }}>{format.icon}</div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{format.name}</h3>
                    <p className="text-sm text-gray-500">{format.aspectRatio}</p>
                  </div>
                  {selectedFormats.includes(format.id) && (
                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="3"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500">{format.dimensions}</p>
              </div>
            ))}
          </div>

          {selectedFormats.length > 0 && (
            <div className="mt-6 flex items-center justify-between p-4 bg-emerald-50 rounded-lg">
              <p className="text-sm text-emerald-700">
                선택됨: {selectedFormats.length}개 포맷
              </p>
              <button
                onClick={handleStartEditing}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg font-semibold hover:from-emerald-600 hover:to-emerald-700 transition-all"
              >
                <Pencil size={20} />
                편집 시작하기
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
