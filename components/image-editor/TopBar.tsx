'use client';

import { useState } from 'react';
import { BrushStyle, Transform, ToolType } from '@/types/image-editor';
import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon, Undo, Redo, MessageSquare, Save, Layers, Palette } from 'lucide-react';

interface TopBarProps {
  brushSize: number;
  brushOpacity: number;
  brushStyle: BrushStyle;
  brushColor: string;
  currentTool: ToolType;
  transform: Transform;
  zoom?: number;
  modifiedCount?: number;
  onBrushSizeChange: (size: number) => void;
  onBrushOpacityChange: (opacity: number) => void;
  onBrushStyleChange: (style: BrushStyle) => void;
  onBrushColorChange: (color: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave?: () => void;
  onSuggestMeme?: () => void;
  onSeparateLayers?: () => void;
  onRecolorLayer?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export default function TopBar({
  brushSize,
  brushOpacity,
  brushStyle,
  brushColor,
  currentTool,
  transform,
  zoom = 1,
  modifiedCount = 0,
  onBrushSizeChange,
  onBrushOpacityChange,
  onBrushStyleChange,
  onBrushColorChange,
  onUndo,
  onRedo,
  onSave,
  onSuggestMeme,
  onSeparateLayers,
  onRecolorLayer,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  canUndo,
  canRedo,
}: TopBarProps) {
  const { theme, colors, toggleTheme } = useTheme();
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  return (
    <div
      style={{
        height: '50px',
        background: colors.panel,
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 15px',
        gap: '10px',
        zIndex: 10,
        overflowX: 'auto',
        overflowY: 'hidden',
      }}
    >
      {/* Theme Toggle */}
      <div
        style={{ position: 'relative' }}
        onMouseEnter={() => setHoveredButton('theme')}
        onMouseLeave={() => setHoveredButton(null)}
      >
        <button
          onClick={toggleTheme}
          style={{
            padding: '8px',
            background: colors.background,
            border: `1px solid ${colors.border}`,
            borderRadius: '5px',
            color: colors.text,
            cursor: 'pointer',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        {hoveredButton === 'theme' && (
          <div
            style={{
              position: 'absolute',
              top: '55px',
              left: '50%',
              transform: 'translateX(-50%)',
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
            {theme === 'light' ? '다크 모드' : '라이트 모드'}
          </div>
        )}
      </div>

      <div style={{ width: '1px', height: '30px', background: colors.border }} />

      <div
        style={{ position: 'relative' }}
        onMouseEnter={() => setHoveredButton('undo')}
        onMouseLeave={() => setHoveredButton(null)}
      >
        <button
          onClick={canUndo ? onUndo : undefined}
          style={{
            padding: '8px 12px',
            background: colors.background,
            border: 'none',
            borderRadius: '5px',
            color: colors.text,
            cursor: canUndo ? 'pointer' : 'not-allowed',
            opacity: canUndo ? 1 : 0.3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Undo size={18} />
        </button>
        {hoveredButton === 'undo' && (
          <div
            style={{
              position: 'absolute',
              top: '55px',
              left: '50%',
              transform: 'translateX(-50%)',
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
            실행취소 (Cmd+Z)
          </div>
        )}
      </div>

      <div
        style={{ position: 'relative' }}
        onMouseEnter={() => setHoveredButton('redo')}
        onMouseLeave={() => setHoveredButton(null)}
      >
        <button
          onClick={canRedo ? onRedo : undefined}
          style={{
            padding: '8px 12px',
            background: colors.background,
            border: 'none',
            borderRadius: '5px',
            color: colors.text,
            cursor: canRedo ? 'pointer' : 'not-allowed',
            opacity: canRedo ? 1 : 0.3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Redo size={18} />
        </button>
        {hoveredButton === 'redo' && (
          <div
            style={{
              position: 'absolute',
              top: '55px',
              left: '50%',
              transform: 'translateX(-50%)',
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
            재실행 (Cmd+Shift+Z)
          </div>
        )}
      </div>

      {onSuggestMeme && (
        <>
          <div style={{ width: '1px', height: '30px', background: colors.border }} />
          <div
            style={{ position: 'relative' }}
            onMouseEnter={() => setHoveredButton('meme')}
            onMouseLeave={() => setHoveredButton(null)}
          >
            <button
              onClick={onSuggestMeme}
              style={{
                padding: '8px 12px',
                background: 'linear-gradient(to right, #10b981, #059669)',
                border: 'none',
                borderRadius: '5px',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MessageSquare size={18} />
            </button>
            {hoveredButton === 'meme' && (
              <div
                style={{
                  position: 'absolute',
                  top: '55px',
                  left: '50%',
                  transform: 'translateX(-50%)',
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
                밈 문구 추천 - AI가 이미지를 분석해요
              </div>
            )}
          </div>
        </>
      )}

      {/* 선/배경 분리 버튼 */}
      {onSeparateLayers && (
        <>
          <div style={{ width: '1px', height: '30px', background: colors.border }} />
          <div
            style={{ position: 'relative' }}
            onMouseEnter={() => setHoveredButton('separate')}
            onMouseLeave={() => setHoveredButton(null)}
          >
            <button
              onClick={onSeparateLayers}
              style={{
                padding: '8px 12px',
                background: 'linear-gradient(to right, #8b5cf6, #7c3aed)',
                border: 'none',
                borderRadius: '5px',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Layers size={18} />
            </button>
            {hoveredButton === 'separate' && (
              <div
                style={{
                  position: 'absolute',
                  top: '55px',
                  left: '50%',
                  transform: 'translateX(-50%)',
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
                선 추출
              </div>
            )}
          </div>
        </>
      )}

      {onSave && (
        <div
          style={{ position: 'relative' }}
          onMouseEnter={() => setHoveredButton('save')}
          onMouseLeave={() => setHoveredButton(null)}
        >
          <button
            onClick={modifiedCount > 0 ? onSave : undefined}
            style={{
              padding: '8px 12px',
              background: modifiedCount > 0 ? colors.accent : colors.background,
              border: `1px solid ${colors.border}`,
              borderRadius: '5px',
              color: modifiedCount > 0 ? '#fff' : colors.textSecondary,
              cursor: modifiedCount > 0 ? 'pointer' : 'not-allowed',
              opacity: modifiedCount > 0 ? 1 : 0.5,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Save size={18} />
            {modifiedCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {modifiedCount}
              </span>
            )}
          </button>
          {hoveredButton === 'save' && (
            <div
              style={{
                position: 'absolute',
                top: '55px',
                left: '50%',
                transform: 'translateX(-50%)',
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
              {modifiedCount > 0 ? `저장 - ${modifiedCount}개 이모티콘` : '저장 - 변경 사항 없음'}
            </div>
          )}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '0 10px',
          borderLeft: `1px solid ${colors.border}`,
        }}
      >
        <label style={{ fontSize: '12px', color: colors.textSecondary }}>크기:</label>
        <input
          type="range"
          min="1"
          max="50"
          value={brushSize}
          onChange={(e) => onBrushSizeChange(Number(e.target.value))}
          style={{ width: '120px' }}
        />
        <input
          type="number"
          min="1"
          max="200"
          value={brushSize}
          onChange={(e) => {
            const val = Number(e.target.value);
            if (val >= 1 && val <= 200) {
              onBrushSizeChange(val);
            }
          }}
          style={{
            width: '45px',
            padding: '3px 5px',
            background: colors.background,
            border: `1px solid ${colors.border}`,
            borderRadius: '3px',
            color: colors.text,
            fontSize: '12px',
            textAlign: 'center',
          }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '0 10px',
          borderLeft: `1px solid ${colors.border}`,
        }}
      >
        <input
          type="color"
          value={brushColor}
          onChange={(e) => onBrushColorChange(e.target.value)}
          style={{
            width: '40px',
            height: '30px',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        />
        {onRecolorLayer && (
          <button
            onClick={onRecolorLayer}
            style={{
              padding: '6px 10px',
              background: colors.background,
              border: `1px solid ${colors.border}`,
              borderRadius: '5px',
              color: colors.text,
              cursor: 'pointer',
              fontSize: '11px',
              whiteSpace: 'nowrap',
            }}
          >
            적용
          </button>
        )}
      </div>

      {currentTool === 'transform' && transform.active && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '0 10px',
            borderLeft: `1px solid ${colors.border}`,
          }}
        >
          <label style={{ fontSize: '12px', color: colors.textSecondary }}>각도:</label>
          <input
            type="number"
            min="-360"
            max="360"
            value={Math.round(transform.rotation)}
            onChange={(e) => {
              // Transform 업데이트 로직은 CanvasArea에서 처리
            }}
            style={{
              width: '60px',
              padding: '5px',
              background: colors.background,
              border: `1px solid ${colors.border}`,
              borderRadius: '3px',
              color: colors.text,
              fontSize: '12px',
            }}
          />
          <span style={{ fontSize: '12px', color: colors.text }}>°</span>
        </div>
      )}

      {/* Zoom 컨트롤 */}
      {onZoomIn && onZoomOut && onZoomReset && (
        <>
          <div style={{ width: '1px', height: '30px', background: colors.border, marginLeft: 'auto' }} />

          <button
            onClick={onZoomOut}
            title="축소 (Alt + 스크롤 아래 또는 Cmd+-)"
            style={{
              padding: '5px 10px',
              background: colors.background,
              border: `1px solid ${colors.border}`,
              borderRadius: '3px',
              color: colors.text,
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
            }}
          >
            −
          </button>

          <div
            onClick={onZoomReset}
            title="100%로 리셋 (Cmd+0)"
            style={{
              padding: '5px 10px',
              background: colors.background,
              border: `1px solid ${colors.border}`,
              borderRadius: '3px',
              color: colors.text,
              cursor: 'pointer',
              fontSize: '12px',
              minWidth: '50px',
              textAlign: 'center',
            }}
          >
            {Math.round(zoom * 100)}%
          </div>

          <button
            onClick={onZoomIn}
            title="확대 (Alt + 스크롤 위 또는 Cmd++)"
            style={{
              padding: '5px 10px',
              background: colors.background,
              border: `1px solid ${colors.border}`,
              borderRadius: '3px',
              color: colors.text,
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
            }}
          >
            +
          </button>
        </>
      )}
    </div>
  );
}
