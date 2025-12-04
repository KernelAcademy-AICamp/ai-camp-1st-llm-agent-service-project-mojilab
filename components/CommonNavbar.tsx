'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Sparkles, Folder } from 'lucide-react';

export default function CommonNavbar() {
  const router = useRouter();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { user, signOut } = useAuth();

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
    <div className="common-navbar">
      <div className="common-navbar-left">
        <div
          className="common-navbar-logo"
          onClick={() => router.push('/')}
        >
          mojimoji
        </div>

        <nav className="common-navbar-nav">
          <button
            className="common-navbar-item"
            onClick={() => router.push('/create/emoticon')}
          >
            <Sparkles size={18} strokeWidth={1.5} />
            <span>이모티콘 만들기</span>
          </button>
          <button
            className="common-navbar-item"
            onClick={() => router.push('/my-series')}
          >
            <Folder size={18} strokeWidth={1.5} />
            <span>내 이모티콘</span>
          </button>
        </nav>
      </div>

      <div className="common-navbar-actions">
        <div
          className="common-navbar-profile"
          onMouseEnter={handleProfileMenuOpen}
          onMouseLeave={handleProfileMenuClose}
        >
          <button className="common-navbar-btn" title="프로필">
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
            <div className="common-navbar-dropdown">
              {user ? (
                <>
                  <div className="common-navbar-dropdown-item common-navbar-user-info">
                    <div className="common-navbar-user-email">{user.email}</div>
                  </div>
                  <div className="common-navbar-divider"></div>
                  <button
                    className="common-navbar-dropdown-item"
                    onClick={() => router.push('/profile')}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <span>프로필</span>
                  </button>
                  <button className="common-navbar-dropdown-item" onClick={handleLogout}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                    className="common-navbar-dropdown-item"
                    onClick={() => router.push('/login')}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                      <polyline points="10 17 15 12 10 7"></polyline>
                      <line x1="15" y1="12" x2="3" y2="12"></line>
                    </svg>
                    <span>로그인</span>
                  </button>
                  <button
                    className="common-navbar-dropdown-item"
                    onClick={() => router.push('/signup')}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

      <style jsx>{`
        .common-navbar {
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
          padding: 0 32px;
          z-index: 90;
        }

        .common-navbar-left {
          display: flex;
          align-items: center;
          gap: 40px;
        }

        .common-navbar-logo {
          font-size: 20px;
          font-weight: 600;
          color: #1d1d1f;
          cursor: pointer;
        }

        .common-navbar-nav {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .common-navbar-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border: none;
          background: transparent;
          color: #6e6e73;
          cursor: pointer;
          font-size: 15px;
          font-weight: 500;
          border-radius: 10px;
          transition: all 0.2s ease;
        }

        .common-navbar-item:hover {
          background-color: #f5f5f7;
          color: #1d1d1f;
        }

        .common-navbar-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .common-navbar-btn {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          border: 1px solid #d2d2d7;
          background-color: transparent;
          color: #6e6e73;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .common-navbar-btn:hover {
          background-color: #f5f5f7;
          color: #1d1d1f;
        }

        .common-navbar-profile {
          position: relative;
        }

        .common-navbar-dropdown {
          position: absolute;
          top: 52px;
          right: 0;
          min-width: 220px;
          background-color: white;
          border: 1px solid #d2d2d7;
          border-radius: 12px;
          padding: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
          z-index: 100;
        }

        .common-navbar-dropdown-item {
          width: 100%;
          padding: 12px 14px;
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

        .common-navbar-dropdown-item:hover {
          background-color: #f5f5f7;
        }

        .common-navbar-user-info {
          cursor: default;
        }

        .common-navbar-user-info:hover {
          background-color: transparent;
        }

        .common-navbar-user-email {
          font-size: 13px;
          color: #6e6e73;
        }

        .common-navbar-divider {
          height: 1px;
          background-color: #d2d2d7;
          margin: 6px 0;
        }
      `}</style>
    </div>
  );
}
