'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Heart, Star, Zap, Gift, PawPrint, Briefcase, Utensils, Snowflake } from 'lucide-react';
import CommonNavbar from '@/components/CommonNavbar';

// 배너 이미지 3개
const bannerImages = [
  {
    id: 1,
    image: '/banners/forest.png',
    title: '나만의 이모티콘 만들기',
    subtitle: 'AI로 쉽고 빠르게',
    link: '/create/emoticon',
  },
  {
    id: 2,
    image: '/banners/christmas.png',
    title: '크리스마스 이모티콘',
    subtitle: '특별한 시즌 이모티콘',
    link: '/create/emoticon',
  },
  {
    id: 3,
    image: '/banners/pool.png',
    title: '여름 이모티콘',
    subtitle: '시원한 여름 느낌',
    link: '/create/emoticon',
  },
];

interface EmoticonSeries {
  id: string;
  title: string;
  thumbnail: string;
  author: string;
  likes: number;
  isNew: boolean;
}

export default function LandingPage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('all');
  const [currentBanner, setCurrentBanner] = useState(0);
  const [popularSeries, setPopularSeries] = useState<EmoticonSeries[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 인기 이모티콘 로드 (카테고리 변경 시 재로드)
  useEffect(() => {
    const fetchPopularSeries = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/emoticons/popular?limit=6&category=${activeCategory}`);
        const data = await response.json();
        if (data.success) {
          setPopularSeries(data.series);
        }
      } catch (error) {
        console.error('Failed to fetch popular series:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPopularSeries();
  }, [activeCategory]);

  // 배너 자동 슬라이드
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % bannerImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const categories = [
    { id: 'all', label: '전체', icon: <Sparkles size={16} /> },
    { id: 'new', label: 'NEW', icon: <Zap size={16} /> },
    { id: 'popular', label: '인기', icon: <Heart size={16} /> },
    { id: 'cute', label: '귀여운', icon: <Star size={16} /> },
    { id: 'daily', label: '일상', icon: <Gift size={16} /> },
    { id: 'animal', label: '동물', icon: <PawPrint size={16} /> },
    { id: 'love', label: '연애', icon: <Heart size={16} /> },
    { id: 'work', label: '직장', icon: <Briefcase size={16} /> },
    { id: 'food', label: '음식', icon: <Utensils size={16} /> },
    { id: 'seasonal', label: '계절', icon: <Snowflake size={16} /> },
  ];

  return (
    <>
      <CommonNavbar />
      <div className="preview-container">
      {/* Banner Carousel */}
      <section className="banner-section">
        <div className="banner-carousel">
          <div
            className="banner-track"
            style={{ transform: `translateX(-${currentBanner * 100}%)` }}
          >
            {bannerImages.map((banner) => (
              <div
                key={banner.id}
                className="banner-slide"
                onClick={() => router.push(banner.link)}
              >
                <img src={banner.image} alt={banner.title} className="banner-image" />
                <div className="banner-overlay">
                  <h2 className="banner-title">{banner.title}</h2>
                  <p className="banner-subtitle">{banner.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
          {/* Dots */}
          <div className="banner-dots">
            {bannerImages.map((_, index) => (
              <button
                key={index}
                className={`banner-dot ${currentBanner === index ? 'active' : ''}`}
                onClick={() => setCurrentBanner(index)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Category Tabs */}
      <section className="category-section">
        <div className="category-tabs">
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`category-tab ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* Series Gallery */}
      <section className="gallery-section">
        <div className="section-header">
          <h3 className="section-title">인기 이모티콘</h3>
        </div>
        <div className="series-grid">
          {isLoading ? (
            // 로딩 스켈레톤
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="series-card skeleton">
                <div className="series-thumbnail skeleton-thumb" />
                <div className="series-info">
                  <div className="skeleton-title" />
                  <div className="skeleton-meta" />
                </div>
              </div>
            ))
          ) : popularSeries.length > 0 ? (
            popularSeries.map((series) => (
              <div key={series.id} className="series-card" onClick={() => router.push(`/series/${series.id}`)}>
                <div className="series-thumbnail">
                  {series.thumbnail ? (
                    <img src={series.thumbnail} alt={series.title} />
                  ) : (
                    <span className="emoji-thumb">🎨</span>
                  )}
                  {series.isNew && <span className="new-badge">NEW</span>}
                </div>
                <div className="series-info">
                  <h4 className="series-title">{series.title}</h4>
                  <div className="series-meta">
                    <span className="series-author">{series.author}</span>
                    <span className="series-likes">
                      <Heart size={12} fill="#ff6b6b" stroke="#ff6b6b" />
                      {series.likes.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            // 데이터 없을 때
            <div className="empty-series">
              <p>아직 이모티콘이 없습니다</p>
              <button onClick={() => router.push('/create/emoticon')}>첫 이모티콘 만들기</button>
            </div>
          )}
        </div>
      </section>

      <style jsx>{`
        .preview-container {
          min-height: 100vh;
          background: #fafafa;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          padding-top: 70px;
        }

        /* Banner Carousel */
        .banner-section {
          padding: 0;
        }

        .banner-carousel {
          position: relative;
          width: 100%;
          overflow: hidden;
        }

        .banner-track {
          display: flex;
          transition: transform 0.5s ease-in-out;
        }

        .banner-slide {
          min-width: 100%;
          position: relative;
          aspect-ratio: 3 / 1;
          cursor: pointer;
        }

        .banner-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .banner-placeholder {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .banner-placeholder-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          color: white;
        }

        .banner-placeholder-icon {
          font-size: 48px;
          opacity: 0.8;
        }

        .banner-placeholder-text {
          font-size: 20px;
          font-weight: 600;
        }

        .banner-placeholder-hint {
          font-size: 14px;
          opacity: 0.7;
        }

        .banner-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 40px;
          background: linear-gradient(transparent, rgba(0,0,0,0.7));
          color: white;
        }

        .banner-title {
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .banner-subtitle {
          font-size: 18px;
          opacity: 0.9;
        }

        .banner-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 48px;
          height: 48px;
          background: rgba(255, 255, 255, 0.9);
          border: none;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          color: #1f2937;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .banner-nav:hover {
          background: white;
          transform: translateY(-50%) scale(1.1);
        }

        .banner-nav.prev {
          left: 20px;
        }

        .banner-nav.next {
          right: 20px;
        }

        .banner-dots {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 8px;
        }

        .banner-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: none;
          background: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          transition: all 0.2s;
        }

        .banner-dot.active {
          background: white;
          width: 30px;
          border-radius: 5px;
        }

        /* Category */
        .category-section {
          padding: 24px 32px;
        }

        .category-tabs {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .category-tab {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 20px;
          border: 1px solid #e5e5e5;
          background: white;
          border-radius: 50px;
          font-size: 14px;
          font-weight: 500;
          color: #666;
          cursor: pointer;
          transition: all 0.2s;
        }

        .category-tab:hover {
          border-color: #1f2937;
          color: #1f2937;
        }

        .category-tab.active {
          background: #1f2937;
          border-color: #1f2937;
          color: white;
        }

        /* Gallery */
        .gallery-section {
          padding: 0 32px 40px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .section-title {
          font-size: 22px;
          font-weight: 700;
          color: #1f2937;
        }

        .see-all-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          background: none;
          border: none;
          color: #666;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .see-all-btn:hover {
          color: #1f2937;
          gap: 8px;
        }

        .series-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 20px;
        }

        .series-card {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.3s;
          border: 1px solid #f0f0f0;
        }

        .series-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.1);
        }

        .series-thumbnail {
          position: relative;
          aspect-ratio: 1;
          background: #f9f9f9;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .series-thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .emoji-thumb {
          font-size: 64px;
        }

        .new-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          background: #ef4444;
          color: white;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
        }

        .series-info {
          padding: 16px;
        }

        .series-title {
          font-size: 14px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 8px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .series-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          color: #999;
        }

        .series-likes {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #ef4444;
        }

        /* Skeleton Loading */
        .skeleton-thumb {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }

        .skeleton-title {
          height: 16px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 4px;
          margin-bottom: 8px;
        }

        .skeleton-meta {
          height: 12px;
          width: 60%;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 4px;
        }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        /* Empty State */
        .empty-series {
          grid-column: 1 / -1;
          text-align: center;
          padding: 60px 20px;
          color: #999;
        }

        .empty-series p {
          margin-bottom: 16px;
          font-size: 15px;
        }

        .empty-series button {
          padding: 12px 24px;
          background: #1f2937;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .empty-series button:hover {
          background: #374151;
        }

        @media (max-width: 768px) {
          .preview-header {
            padding: 12px 16px;
          }

          .search-box {
            width: 200px;
          }

          .banner-section {
            padding: 0;
          }

          .banner-slide {
            aspect-ratio: 16 / 9;
          }

          .banner-title {
            font-size: 24px;
          }

          .series-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
      </div>
    </>
  );
}
