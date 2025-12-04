'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import ChatInterface from '@/components/chat/ChatInterface';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  timestamp: Date;
}

interface ChatResponse {
  session_id: string;
  message: string;
  action?: string;
  parameters?: Record<string, any>;
}

export default function ChatPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const sessionCreatedRef = useRef(false);

  // Create session on mount (only once)
  useEffect(() => {
    // Prevent double execution in React Strict Mode
    if (sessionCreatedRef.current) return;

    sessionCreatedRef.current = true;
    createSession();
  }, []);

  const createSession = async () => {
    console.log('[CHAT] Creating session...');
    try {
      const response = await fetch('http://localhost:8000/api/chat/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('[CHAT] Session response:', response.status);

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const data = await response.json();
      console.log('[CHAT] Session created:', data.session_id);
      setSessionId(data.session_id);

      // Add welcome message
      setMessages([
        {
          role: 'assistant',
          content: '안녕하세요! 어떤 이모티콘을 만들고 싶으세요? 😊',
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error('[CHAT ERROR] Failed to create session:', error);
      alert('세션 생성에 실패했습니다. 페이지를 새로고침해주세요.');
    }
  };

  const handleSendMessage = async (messageText: string, image?: File) => {
    if (!sessionId) {
      alert('세션이 생성되지 않았습니다. 페이지를 새로고침해주세요.');
      return;
    }

    setLoading(true);

    try {
      // Process image to base64 if provided
      let referenceImage: string | undefined;
      if (image) {
        referenceImage = await fileToBase64(image);
      }

      // Add user message to UI
      const userMessage: Message = {
        role: 'user',
        content: messageText,
        imageUrl: referenceImage,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Send message to backend
      const response = await fetch('http://localhost:8000/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: messageText,
          reference_image: referenceImage,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data: ChatResponse = await response.json();

      // Debug: Log response
      console.log('Chat response:', data);
      console.log('Action:', data.action);
      console.log('Parameters:', data.parameters);

      // Add assistant message to UI
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Handle action
      if (data.action === 'generate' && data.parameters) {
        // Navigate to series generation page with parameters
        const params = new URLSearchParams();
        if (data.parameters.theme) params.set('theme', data.parameters.theme);
        if (data.parameters.num_scenes) params.set('num_scenes', String(data.parameters.num_scenes));

        // Delay navigation slightly to show assistant response
        setTimeout(() => {
          router.push(`/series?${params.toString()}`);
        }, 1500);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: '죄송해요, 메시지 전송에 실패했어요. 다시 시도해주세요. 🙏',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  return (
    <AppLayout>
      <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="max-w-4xl mx-auto p-6" style={{ marginTop: '-57px' }}>
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-3" style={{ color: 'var(--text-primary)' }}>
                <Sparkles className="text-emerald-400" size={32} />
                이모티콘 만들기
              </h1>
              <p style={{ color: 'var(--text-secondary)' }}>
                원하는 이모티콘을 자유롭게 설명해주세요! 참고 이미지도 함께 보내실 수 있어요.
              </p>
            </div>
          </motion.div>

          {/* Chat Interface */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="h-[calc(100vh-200px)]"
          >
            <ChatInterface
              onSendMessage={handleSendMessage}
              messages={messages}
              loading={loading}
              placeholder="예: 귀여운 고양이 8컷 이모티콘 만들어줘"
            />
          </motion.div>

          {/* Tips */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-4 text-center"
          >
            <div className="inline-flex items-center gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <span>💡 팁: 구체적으로 설명할수록 더 좋은 결과를 얻을 수 있어요</span>
            </div>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}
