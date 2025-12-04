'use client';

import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  timestamp?: Date;
  streaming?: boolean;
}

export default function MessageBubble({
  role,
  content,
  imageUrl,
  timestamp,
  streaming = false,
}: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-emerald-400 text-white'
            : 'bg-gray-100 text-gray-800'
        }`}
      >
        {/* Image attachment */}
        {imageUrl && (
          <div className="mb-2 rounded-lg overflow-hidden">
            <Image
              src={imageUrl}
              alt="Reference image"
              width={200}
              height={200}
              className="object-cover"
            />
          </div>
        )}

        {/* Message content */}
        <div className="whitespace-pre-wrap break-words">
          {content}
          {streaming && (
            <Loader2 className="inline-block ml-2 animate-spin" size={16} />
          )}
        </div>

        {/* Timestamp */}
        {timestamp && (
          <div
            className={`text-xs mt-1 ${
              isUser ? 'text-emerald-100' : 'text-gray-500'
            }`}
          >
            {timestamp.toLocaleTimeString('ko-KR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
