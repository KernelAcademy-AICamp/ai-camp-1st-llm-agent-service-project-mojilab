'use client';

import { useState } from 'react';
import { ToolType } from '@/types/image-editor';
import { useTheme } from '@/contexts/ThemeContext';
import {
  Brush,
  Eraser,
  PaintBucket,
  Pipette,
  Type,
  Lasso,
  MousePointer2,
  Wand2,
  Minus,
} from 'lucide-react';

interface ToolbarProps {
  currentTool: ToolType;
  onToolChange: (tool: ToolType) => void;
}

const tools = [
  { id: 'brush' as ToolType, Icon: Brush, title: '브러시 (B)' },
  { id: 'eraser' as ToolType, Icon: Eraser, title: '지우개 (E)' },
  { id: 'paint-bucket' as ToolType, Icon: PaintBucket, title: '페인트통 (G)' },
  { id: 'eyedropper' as ToolType, Icon: Pipette, title: '색 추출 (I)' },
  { id: 'text' as ToolType, Icon: Type, title: '텍스트 (T)' },
  { id: 'lasso' as ToolType, Icon: Lasso, title: '올가미 선택 (L)' },
  { id: 'magic-wand' as ToolType, Icon: Wand2, title: '마법봉 선택 (W)' },
  { id: 'move' as ToolType, Icon: MousePointer2, title: '이동 (V)' },
  { id: 'line' as ToolType, Icon: Minus, title: '직선 (D)' },
];

export default function Toolbar({ currentTool, onToolChange }: ToolbarProps) {
  const { colors } = useTheme();
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);

  return (
    <div
      style={{
        width: '60px',
        background: colors.panel,
        display: 'flex',
        flexDirection: 'column',
        padding: '10px 0',
        gap: '5px',
        borderRight: `1px solid ${colors.border}`,
        position: 'relative',
      }}
    >
      {tools.map((tool) => {
        const IconComponent = tool.Icon;
        return (
          <div
            key={tool.id}
            style={{ position: 'relative' }}
            onMouseEnter={() => setHoveredTool(tool.id)}
            onMouseLeave={() => setHoveredTool(null)}
          >
            <button
              className={currentTool === tool.id ? 'active' : ''}
              onClick={() => onToolChange(tool.id)}
              style={{
                width: '40px',
                height: '40px',
                margin: '0 auto',
                background: currentTool === tool.id ? colors.accent : colors.background,
                border: 'none',
                borderRadius: '5px',
                color: colors.text,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconComponent size={20} strokeWidth={2} />
            </button>

            {/* 커스텀 툴팁 */}
            {hoveredTool === tool.id && (
              <div
                style={{
                  position: 'absolute',
                  left: '65px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: colors.panel,
                  color: colors.text,
                  padding: '6px 10px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  border: `1px solid ${colors.border}`,
                  zIndex: 1000,
                  pointerEvents: 'none',
                }}
              >
                {tool.title}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
