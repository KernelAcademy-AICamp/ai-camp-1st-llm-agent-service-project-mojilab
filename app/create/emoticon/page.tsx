'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { TrendingUp, MessageCircle, Sparkles, Folder, Crown, Coins } from 'lucide-react';

export default function EmoticonChoicePage() {
  const router = useRouter();

  return (
    <div className="choice-container">
      <div className="page-header">
        <div className="header-title-row">
          <div className="header-icon">
            <Sparkles
              size={44}
              strokeWidth={1.5}
              style={{ color: '#eab308' }}
            />
          </div>
          <h1 className="page-title">이모티콘 만들기</h1>
        </div>
      </div>
      <div className="choice-cards">
        {/* 심플 이모티콘 */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => router.push('/create/simple')}
          className="choice-card trending"
        >
          <div className="card-badge trending-badge">심플</div>

          <div className="sample-grid trending-grid">
            <div className="sample-item">
              <img src="https://xqzsfnaydxxnmrsmyfut.supabase.co/storage/v1/object/public/images/emoticons/f8f885c0-965c-4384-b781-e7ef66f1359d/scene_0.png" alt="Sample 1" />
            </div>
            <div className="sample-item">
              <img src="https://xqzsfnaydxxnmrsmyfut.supabase.co/storage/v1/object/public/images/emoticons/f8f885c0-965c-4384-b781-e7ef66f1359d/scene_1.png" alt="Sample 2" />
            </div>
            <div className="sample-item">
              <img src="https://xqzsfnaydxxnmrsmyfut.supabase.co/storage/v1/object/public/images/emoticons/f8f885c0-965c-4384-b781-e7ef66f1359d/scene_2.png" alt="Sample 3" />
            </div>
            <div className="sample-item">
              <img src="https://xqzsfnaydxxnmrsmyfut.supabase.co/storage/v1/object/public/images/emoticons/f8f885c0-965c-4384-b781-e7ef66f1359d/scene_3.png" alt="Sample 4" />
            </div>
          </div>

          <h2>심플 이모티콘</h2>
          <p className="card-meta">32개 • 4분</p>
        </motion.div>

        {/* Pro 이모티콘 - 내 스타일 */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          onClick={() => router.push('/create/pro')}
          className="choice-card pro"
        >
          <div className="card-badge pro-badge"><Crown size={10} /> Pro <span className="credit-pill"><Coins size={10} color="#fbbf24" /> 10</span></div>

          <div className="sample-grid pro-grid">
            <div className="sample-item pro-item">
              <img src="https://xqzsfnaydxxnmrsmyfut.supabase.co/storage/v1/object/public/images/emoticons/b90aee4c-3a5e-4826-8d55-4755bf244035/scene_0.png" alt="Sample 1" />
            </div>
            <div className="sample-item pro-item">
              <img src="https://xqzsfnaydxxnmrsmyfut.supabase.co/storage/v1/object/public/images/emoticons/b90aee4c-3a5e-4826-8d55-4755bf244035/scene_5.png" alt="Sample 1" />
            </div>
            <div className="sample-item pro-item">
          <img src="https://xqzsfnaydxxnmrsmyfut.supabase.co/storage/v1/object/public/images/emoticons/b90aee4c-3a5e-4826-8d55-4755bf244035/scene_3.png" alt="Sample 1" />
            </div>
            <div className="sample-item pro-item">
              <img src="https://xqzsfnaydxxnmrsmyfut.supabase.co/storage/v1/object/public/images/emoticons/b90aee4c-3a5e-4826-8d55-4755bf244035/scene_29.png" alt="Sample 1" />
            </div>
          </div>

          <h2>Pro 이모티콘</h2>
          <p className="card-meta">내 스타일 • LoRA 학습</p>
        </motion.div>
      </div>

      <style jsx>{`
        .choice-container {
          min-height: calc(100vh - 70px);
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          align-items: center;
          padding: 0 20px 20px;
          background: #f5f5f7;
        }

        .page-header {
          text-align: left;
          margin-bottom: 48px;
          margin-top: 40px;
          max-width: 900px;
          width: 100%;
        }

        .header-title-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-icon {
          position: relative;
        }

        .sparkles-icon {
          color: #eab308;
        }

        .page-title {
          font-size: 36px;
          font-weight: 800;
          color: #1a1a1a;
          margin: 0;
          letter-spacing: -0.5px;
        }

        .choice-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 32px;
          max-width: 900px;
          width: 100%;
        }

        .choice-card {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(20px);
          border-radius: 32px;
          padding: 32px 28px;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
          border: 2px solid rgba(255, 255, 255, 0.5);
        }

        .choice-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          opacity: 0;
          transition: opacity 0.4s ease;
          z-index: 0;
        }

        .choice-card.trending::before {
          background: linear-gradient(135deg, #d1d5db 0%, #9ca3af 50%, #6b7280 100%);
        }

        .choice-card.story::before {
          background: linear-gradient(135deg, #d1d5db 0%, #9ca3af 50%, #6b7280 100%);
        }

        .choice-card:hover {
          transform: translateY(-12px) scale(1.02);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
        }

        .choice-card.trending:hover {
          border-color: #9ca3af;
          background: rgba(229, 231, 235, 0.3);
        }

        .choice-card.story:hover {
          border-color: #9ca3af;
          background: rgba(229, 231, 235, 0.3);
        }

        .choice-card:hover::before {
          opacity: 0.08;
        }

        .choice-card > * {
          position: relative;
          z-index: 1;
        }

        .card-badge {
          display: inline-block;
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 20px;
          align-self: flex-start;
        }

        .trending-badge {
          background: linear-gradient(to right, #6ee7b7, #34d399);
          color: white;
        }

        .story-badge {
          background: linear-gradient(to right, #6ee7b7, #34d399);
          color: white;
        }

        .pro-badge {
          background: linear-gradient(to right, #4b5563, #374151);
          color: white;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .credit-pill {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          background: rgba(255, 255, 255, 0.2);
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 600;
          margin-left: 6px;
        }

        .sample-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 24px;
          padding: 16px;
          border-radius: 20px;
        }

        .trending-grid {
          background: linear-gradient(135deg, rgba(229, 231, 235, 0.5), rgba(209, 213, 219, 0.4));
        }

        .story-grid {
          background: linear-gradient(135deg, rgba(229, 231, 235, 0.5), rgba(209, 213, 219, 0.4));
        }

        .pro-grid {
          background: linear-gradient(135deg, rgba(75, 85, 99, 0.15), rgba(55, 65, 81, 0.1));
        }

        .sample-item {
          aspect-ratio: 1;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
          overflow: hidden;
        }

        .sample-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 20px;
        }

        .trending-grid .sample-item {
          background: rgba(229, 231, 235, 0.6);
          border: 2px solid rgba(209, 213, 219, 0.4);
          color: #6b7280;
        }

        .story-grid .sample-item {
          background: rgba(229, 231, 235, 0.6);
          border: 2px solid rgba(209, 213, 219, 0.4);
          color: #6b7280;
        }

        .pro-grid .sample-item.pro-item {
          background: rgba(75, 85, 99, 0.1);
          border: 2px solid rgba(75, 85, 99, 0.3);
          color: #4b5563;
        }

        .choice-card.pro::before {
          background: linear-gradient(135deg, #6b7280 0%, #4b5563 50%, #374151 100%);
        }

        .choice-card.pro:hover {
          border-color: #6b7280;
          background: rgba(75, 85, 99, 0.05);
        }

        .sample-item:hover {
          transform: scale(1.1);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
        }

        .choice-card h2 {
          font-size: 26px;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0 0 8px 0;
          letter-spacing: -0.3px;
        }

        .card-meta {
          font-size: 16px;
          font-weight: 600;
          color: #666;
          margin: 0;
        }

        @media (max-width: 768px) {
          .choice-container {
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

          .choice-cards {
            grid-template-columns: 1fr;
            gap: 20px;
          }

          .choice-card {
            padding: 28px 24px;
            border-radius: 28px;
          }

          .card-badge {
            font-size: 11px;
            padding: 5px 14px;
          }

          .sample-grid {
            gap: 10px;
            padding: 14px;
            margin-bottom: 20px;
          }

          .sample-item {
            border-radius: 16px;
          }

          .choice-card h2 {
            font-size: 22px;
          }

          .card-meta {
            font-size: 15px;
          }
        }
      `}</style>
    </div>
  );
}
