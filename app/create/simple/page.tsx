'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Loader2, Sparkles, Image as ImageIcon, X, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  generatedImages?: string[];
  isGenerating?: boolean;
  seriesId?: string;
}

export default function SimpleEmoticonChatPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '안녕하세요! 어떤 이모티콘을 만들어드릴까요? 캐릭터와 테마를 자유롭게 설명해주세요 😊\n\n예시: "귀여운 고양이로 직장생활 이모티콘 만들어줘"',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [modalImage, setModalImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 로그인 체크
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setReferenceImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setReferenceImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // 유저 메시지 추가
    const newUserMessage: Message = {
      role: 'user',
      content: userMessage,
      imageUrl: referenceImage || undefined,
    };
    setMessages(prev => [...prev, newUserMessage]);
    setReferenceImage(null);

    try {
      // 1. AI에게 캐릭터/테마 파싱 요청 (참조 이미지 포함)
      const parseResponse = await fetch('/api/chat/parse-emoticon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: messages.map(m => ({ role: m.role, content: m.content })),
          referenceImage: newUserMessage.imageUrl || null,
        }),
      });
      const parseData = await parseResponse.json();

      if (!parseData.success) {
        // 추가 정보 필요
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: parseData.followUpQuestion || '조금 더 자세히 설명해주시겠어요?',
        }]);
        setIsLoading(false);
        return;
      }

      // 2. 파싱 성공 - 이모티콘 생성 시작
      const { character, theme } = parseData;

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `"${character}"로 "${theme}" 테마 이모티콘을 만들고 있어요! 잠시만 기다려주세요... ✨`,
        isGenerating: true,
      }]);

      // 3. 장면 생성
      const scenesResponse = await fetch('/api/emoticons/generate-scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ character, theme }),
      });
      const scenesData = await scenesResponse.json();

      if (!scenesData.success) {
        throw new Error('장면 생성 실패');
      }

      // 4. 이미지 생성 (참조 이미지 포함)
      const { data: { session } } = await supabase.auth.getSession();

      const generateResponse = await fetch('/api/emoticons/generate-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          character,
          theme,
          scenes: scenesData.scenes,
          userId: user?.id,
          referenceImage: newUserMessage.imageUrl || null,
        }),
      });
      const generateData = await generateResponse.json();

      if (!generateData.success) {
        throw new Error('이미지 생성 실패');
      }

      // 5. 결과 표시 (이미지 미리보기 없이 링크만)
      setMessages(prev => {
        const newMessages = [...prev];
        // 마지막 "생성 중" 메시지 업데이트
        const lastIndex = newMessages.length - 1;
        newMessages[lastIndex] = {
          role: 'assistant',
          content: `"${character}" ${theme} 이모티콘 ${generateData.total}개가 완성됐어요! 🎉\n\n내 이모티콘에서 확인하고 다운로드할 수 있어요.`,
          seriesId: generateData.seriesId,
          isGenerating: false,
        };
        return newMessages;
      });

    } catch (error: any) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '죄송해요, 이모티콘 생성 중 오류가 발생했어요. 다시 시도해주세요 🙏',
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // 로딩 중
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 70px)' }}>
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  // 로그인 안 된 경우
  if (!user) {
    return (
      <div className="auth-container">
          <div className="auth-box">
            <AlertCircle size={48} className="auth-icon" />
            <h2>로그인이 필요합니다</h2>
            <p>이모티콘을 만들고 저장하려면 먼저 로그인해주세요</p>
            <button onClick={() => router.push('/login')} className="login-btn">
              로그인하기
            </button>
          </div>
          <style jsx>{`
            .auth-container {
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: calc(100vh - 70px);
              margin-top: -57px;
            }
            .auth-box {
              text-align: center;
              padding: 48px;
              background: white;
              border-radius: 20px;
              box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
            }
            .auth-icon {
              color: #f59e0b;
              margin-bottom: 16px;
            }
            .auth-box h2 {
              font-size: 22px;
              font-weight: 700;
              color: #1a1a1a;
              margin: 0 0 8px 0;
            }
            .auth-box p {
              font-size: 15px;
              color: #888;
              margin: 0 0 24px 0;
            }
            .login-btn {
              padding: 14px 32px;
              background: #10b981;
              color: white;
              border: none;
              border-radius: 12px;
              font-size: 15px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
            }
            .login-btn:hover {
              background: #059669;
            }
          `}</style>
        </div>
    );
  }

  return (
    <>
      {/* 이미지 모달 - chat-container 바깥에 배치 */}
      {modalImage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setModalImage(null)}
        >
          <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            <img
              src={modalImage}
              alt="Preview"
              style={{
                maxWidth: '90vw',
                maxHeight: '90vh',
                borderRadius: '12px',
                objectFit: 'contain',
              }}
            />
            <button
              onClick={() => setModalImage(null)}
              style={{
                position: 'absolute',
                top: '-44px',
                right: '0',
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      <div className="chat-container">
        {/* 헤더 */}
        <div className="chat-header">
          <Sparkles size={28} className="header-icon" />
          <div>
            <h1>심플 이모티콘 만들기</h1>
            <p>AI와 대화하며 나만의 이모티콘을 만들어보세요</p>
          </div>
        </div>

        {/* 메시지 영역 */}
        <div className="messages-container">
          {messages.map((message, index) => (
            <div key={index} className={`message ${message.role}`}>
              {message.role === 'assistant' && (
                <div className="avatar">
                  <Sparkles size={16} />
                </div>
              )}
              <div className="message-content">
                {message.imageUrl && (
                  <div className="message-image" onClick={() => setModalImage(message.imageUrl!)}>
                    <img src={message.imageUrl} alt="Reference" />
                  </div>
                )}
                <p>{message.content}</p>
                {message.isGenerating && (
                  <div className="generating-indicator">
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>이모티콘 생성 중...</span>
                  </div>
                )}
                {message.seriesId && (
                  <button
                    onClick={() => router.push(`/my-series`)}
                    className="view-series-btn"
                  >
                    내 이모티콘으로 가기 →
                  </button>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* 입력 영역 */}
        <div className="input-container">
          {referenceImage && (
            <div className="reference-preview">
              <img src={referenceImage} alt="Reference" />
              <button onClick={removeImage} className="remove-image">
                <X size={14} />
              </button>
            </div>
          )}
          <form onSubmit={handleSubmit} className="input-form">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="image-btn"
              title="참고 이미지 첨부"
            >
              <ImageIcon size={20} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              hidden
            />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="예: 귀여운 토끼로 연애 이모티콘 만들어줘"
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading || !input.trim()} className="send-btn">
              {isLoading ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={20} />}
            </button>
          </form>
        </div>

        <style jsx>{`
          .chat-container {
            display: flex;
            flex-direction: column;
            height: calc(100vh - 70px);
            max-width: 800px;
            margin: 0 auto;
            padding: 0 20px;
            margin-top: -57px;
            background: white;
            border-radius: 20px;
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
          }

          .chat-header {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 24px;
            border-bottom: 1px solid #eee;
          }

          .header-icon {
            color: #10b981;
          }

          .chat-header h1 {
            font-size: 24px;
            font-weight: 700;
            color: #1a1a1a;
            margin: 0;
          }

          .chat-header p {
            font-size: 14px;
            color: #888;
            margin: 4px 0 0 0;
          }

          .messages-container {
            flex: 1;
            overflow-y: auto;
            padding: 24px;
            display: flex;
            flex-direction: column;
            gap: 20px;
          }

          .message {
            display: flex;
            gap: 12px;
            max-width: 85%;
          }

          .message.user {
            align-self: flex-end;
            flex-direction: row-reverse;
          }

          .message.assistant {
            align-self: flex-start;
          }

          .avatar {
            width: 36px;
            height: 36px;
            background: #ecfdf5;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #10b981;
            flex-shrink: 0;
          }

          .message-content {
            background: #f5f5f7;
            padding: 14px 18px;
            border-radius: 20px;
            max-width: 100%;
          }

          .message.user .message-content {
            background: #1a1a1a;
            color: white;
          }

          .message-content p {
            margin: 0;
            font-size: 15px;
            line-height: 1.6;
            white-space: pre-wrap;
          }

          .message-image {
            margin-bottom: 10px;
            border-radius: 12px;
            overflow: hidden;
            cursor: pointer;
            transition: transform 0.2s;
          }

          .message-image:hover {
            transform: scale(1.02);
          }

          .message-image img {
            max-width: 200px;
            max-height: 150px;
            object-fit: cover;
          }

          .image-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }

          .modal-content {
            position: relative;
            max-width: 90vw;
            max-height: 90vh;
          }

          .modal-content img {
            max-width: 90vw;
            max-height: 90vh;
            border-radius: 12px;
            object-fit: contain;
          }

          .modal-close {
            position: absolute;
            top: -40px;
            right: 0;
            background: rgba(255, 255, 255, 0.2);
            border: none;
            border-radius: 50%;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            cursor: pointer;
            transition: background 0.2s;
          }

          .modal-close:hover {
            background: rgba(255, 255, 255, 0.3);
          }

          .generating-indicator {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 12px;
            color: #10b981;
            font-size: 14px;
          }

          .view-series-btn {
            margin-top: 16px;
            padding: 12px 20px;
            background: #10b981;
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }

          .view-series-btn:hover {
            background: #059669;
          }

          .generated-images {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin-top: 16px;
          }

          .generated-image {
            aspect-ratio: 1;
            border-radius: 12px;
            overflow: hidden;
            background: white;
            border: 1px solid #eee;
          }

          .generated-image img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }

          .input-container {
            padding: 16px 24px 24px;
            border-top: 1px solid #eee;
          }

          .reference-preview {
            position: relative;
            display: inline-block;
            margin-bottom: 12px;
          }

          .reference-preview img {
            width: 80px;
            height: 80px;
            object-fit: cover;
            border-radius: 12px;
            border: 2px solid #eee;
          }

          .remove-image {
            position: absolute;
            top: -6px;
            right: -6px;
            width: 22px;
            height: 22px;
            background: #1a1a1a;
            color: white;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .input-form {
            display: flex;
            gap: 12px;
            align-items: center;
          }

          .image-btn {
            width: 44px;
            height: 44px;
            background: #f5f5f7;
            border: none;
            border-radius: 12px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #666;
            transition: all 0.2s;
          }

          .image-btn:hover {
            background: #eee;
            color: #1a1a1a;
          }

          .input-form input[type="text"] {
            flex: 1;
            padding: 14px 18px;
            font-size: 15px;
            border: 1px solid #e5e5e5;
            border-radius: 24px;
            outline: none;
            transition: border-color 0.2s;
          }

          .input-form input[type="text"]:focus {
            border-color: #10b981;
          }

          .send-btn {
            width: 48px;
            height: 48px;
            background: #10b981;
            color: white;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
          }

          .send-btn:hover:not(:disabled) {
            background: #059669;
            transform: scale(1.05);
          }

          .send-btn:disabled {
            background: #ccc;
            cursor: not-allowed;
          }

          .spinner {
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          @media (max-width: 640px) {
            .chat-container {
              padding: 0 16px;
            }

            .message {
              max-width: 90%;
            }

            .generated-images {
              grid-template-columns: repeat(3, 1fr);
            }
          }
        `}</style>
      </div>
    </>
  );
}
