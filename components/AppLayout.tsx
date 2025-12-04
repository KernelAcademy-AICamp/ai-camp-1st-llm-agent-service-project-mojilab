'use client';

import { useState, useEffect, useRef, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useGeneration } from '@/contexts/GenerationContext';
import { Sparkles, Instagram, Crown } from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { user, signOut } = useAuth();
  const { generation } = useGeneration();

  const handleProfileMenuOpen = () => {
    if (profileMenuTimeoutRef.current) {
      clearTimeout(profileMenuTimeoutRef.current);
    }
    setIsProfileMenuOpen(true);
  };

  const handleProfileMenuClose = () => {
    profileMenuTimeoutRef.current = setTimeout(() => {
      setIsProfileMenuOpen(false);
    }, 200);
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  useEffect(() => {
    return () => {
      if (profileMenuTimeoutRef.current) {
        clearTimeout(profileMenuTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      {/* Generation Progress Banner */}
      {generation.isGenerating && (
        <div
          className="fixed top-0 left-0 right-0 bg-emerald-50 border-b border-emerald-200 z-100 px-6 py-2 cursor-pointer hover:bg-emerald-100 transition-colors"
          onClick={() => router.push('/series')}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="text-emerald-600 animate-pulse" size={18} />
              <span className="text-sm font-medium text-emerald-800">
                {generation.theme} 이모티콘 생성 중 ({generation.completed}/{generation.total} 완료)
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-32 bg-emerald-200 rounded-full h-2">
                <div
                  className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${generation.progress}%` }}
                />
              </div>
              <span className="text-xs text-emerald-700">{generation.progress}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="app-layout-header" style={{ top: generation.isGenerating ? '40px' : '0' }}>
        <div
          className="app-layout-logo"
          onClick={() => router.push('/')}
          style={{ cursor: 'pointer' }}
        >
          mojimoji
        </div>

        <div className="app-layout-actions">
          <div
            className="app-layout-profile-wrapper"
            onMouseEnter={handleProfileMenuOpen}
            onMouseLeave={handleProfileMenuClose}
          >
            <button className="app-layout-btn" title="프로필">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </button>

            {isProfileMenuOpen && (
              <div className="app-layout-dropdown">
                {user ? (
                  <>
                    <div className="app-layout-dropdown-item app-layout-user-info">
                      <div className="app-layout-user-email">{user.email}</div>
                    </div>
                    <div className="app-layout-divider"></div>
                    <button
                      className="app-layout-dropdown-item"
                      onClick={() => router.push('/profile')}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                      <span>프로필</span>
                    </button>
                    <button className="app-layout-dropdown-item" onClick={handleLogout}>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                      </svg>
                      <span>로그아웃</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="app-layout-dropdown-item"
                      onClick={() => router.push('/login')}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                        <polyline points="10 17 15 12 10 7"></polyline>
                        <line x1="15" y1="12" x2="3" y2="12"></line>
                      </svg>
                      <span>로그인</span>
                    </button>
                    <button
                      className="app-layout-dropdown-item"
                      onClick={() => router.push('/signup')}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <line x1="19" y1="8" x2="19" y2="14"></line>
                        <line x1="22" y1="11" x2="16" y2="11"></line>
                      </svg>
                      <span>회원가입</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="app-layout-sidebar" style={{ top: generation.isGenerating ? '110px' : '70px' }}>
        {/* 이모티콘 만들기 */}
        <div
          className={`app-layout-menu-item ${pathname === '/create/emoticon' ? 'active' : ''}`}
          onClick={() => router.push('/create/emoticon')}
          style={{ cursor: 'pointer' }}
        >
          <Sparkles size={20} strokeWidth={1.5} />
          <span className="app-layout-tooltip">이모티콘 만들기</span>
        </div>

        {/* 인스타툰 만들기 */}
        <div
          className={`app-layout-menu-item ${pathname?.startsWith('/create/sns') ? 'active' : ''}`}
          onClick={() => router.push('/create/sns/editor?formats=instagram_post')}
          style={{ cursor: 'pointer' }}
        >
          <Instagram size={20} strokeWidth={1.5} />
          <span className="app-layout-tooltip">인스타툰 만들기</span>
        </div>

        {/* Pro - 내 스타일 */}
        <div
          className={`app-layout-menu-item ${pathname?.startsWith('/create/pro') ? 'active' : ''}`}
          onClick={() => router.push('/create/pro')}
          style={{ cursor: 'pointer' }}
        >
          <Crown size={20} strokeWidth={1.5} />
          <span className="app-layout-tooltip">Pro 내 스타일</span>
        </div>



        {/* 내 이모티콘 */}
        <div
          className={`app-layout-menu-item ${pathname === '/my-series' ? 'active' : ''}`}
          onClick={() => router.push('/my-series')}
          style={{ cursor: 'pointer' }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
          <span className="app-layout-tooltip">내 이모티콘</span>
        </div>

       
      </div>

      {/* Main Content */}
      <div className="app-layout-content" style={{ paddingTop: generation.isGenerating ? '110px' : '70px' }}>{children}</div>

      <style jsx>{`
        .app-layout-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 70px;
          background-color: #ffffff;
          border-bottom: 1px solid #d2d2d7;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 32px 0 20px;
          z-index: 90;
        }

        .app-layout-logo {
          font-size: 20px;
          font-weight: 600;
          color: #1d1d1f;
        }

        .app-layout-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .app-layout-btn {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          border: 1px solid #d2d2d7;
          background-color: transparent;
          color: #6e6e73;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .app-layout-btn:hover {
          background-color: #f5f5f7;
          color: #1d1d1f;
        }

        .app-layout-profile-wrapper {
          position: relative;
        }

        .app-layout-dropdown {
          position: absolute;
          top: 48px;
          right: 0;
          min-width: 220px;
          background-color: white;
          border: 1px solid #d2d2d7;
          border-radius: 12px;
          padding: 8px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
          z-index: 100;
        }

        .app-layout-dropdown-item {
          width: 100%;
          padding: 10px 12px;
          border: none;
          background: transparent;
          color: #1d1d1f;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 12px;
          border-radius: 8px;
          font-size: 14px;
          transition: background-color 0.2s ease;
          text-align: left;
        }

        .app-layout-dropdown-item:hover {
          background-color: #f5f5f7;
        }

        .app-layout-user-info {
          cursor: default;
        }

        .app-layout-user-info:hover {
          background-color: transparent;
        }

        .app-layout-user-email {
          font-size: 13px;
          color: #6e6e73;
        }

        .app-layout-divider {
          height: 1px;
          background-color: #d2d2d7;
          margin: 6px 0;
        }

        .app-layout-sidebar {
          position: fixed;
          left: 0;
          bottom: 0;
          width: 60px;
          background-color: #f5f5f7;
          border-right: 1px solid #d2d2d7;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 16px 0;
          z-index: 80;
        }

        .app-layout-menu-item {
          width: 40px;
          height: 40px;
          margin-bottom: 8px;
          border-radius: 8px;
          background-color: transparent;
          color: #6e6e73;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          position: relative;
        }

        .app-layout-menu-item:hover {
          background-color: #f5f5f7;
        }

        .app-layout-menu-item.active {
          background-color: #ffffff;
          color: #10b981;
          border: 1px solid #d2d2d7;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .app-layout-menu-item.active:hover {
          background-color: #f0fdf4;
        }

        .app-layout-tooltip {
          position: absolute;
          left: 60px;
          background-color: #1f2937;
          color: white;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 13px;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s;
          z-index: 1000;
        }

        .app-layout-tooltip::before {
          content: '';
          position: absolute;
          left: -4px;
          top: 50%;
          transform: translateY(-50%);
          border-width: 4px 4px 4px 0;
          border-style: solid;
          border-color: transparent #1f2937 transparent transparent;
        }

        .app-layout-menu-item:hover .app-layout-tooltip {
          opacity: 1;
        }

        .app-layout-content {
          margin-left: 60px;
          min-height: 100vh;
          background: #f5f5f7;
        }
      `}</style>
    </>
  );
}
