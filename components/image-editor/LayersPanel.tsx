'use client';

import { Layer, LayerGroup } from '@/types/image-editor';
import { useState } from 'react';
import { ChevronDown, ChevronRight, Eye, EyeOff, Lock, Unlock, Trash2, FolderOpen } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface LayersPanelProps {
  layers: Layer[];
  groups: LayerGroup[];
  activeLayerIndex: number;
  selectedLayerIndices: number[];
  onLayerSelect: (index: number, isMultiSelect: boolean) => void;
  onLayerAdd: () => void;
  onLayerDelete: (index: number) => void;
  onLayerToggleVisibility: (index: number) => void;
  onLayerToggleLock: (index: number) => void;
  onLayerMove: (fromIndex: number, toIndex: number) => void;
  onMergeLayers: () => void;
  onGroupToggleVisibility: (groupId: string) => void;
  onGroupToggleCollapsed: (groupId: string) => void;
  onCreateGroup: () => void;
  onUngroup: (groupId: string) => void;
  onAddLayerToGroup: (layerIndex: number, groupId: string) => void;
}

export default function LayersPanel({
  layers,
  groups,
  activeLayerIndex,
  selectedLayerIndices,
  onLayerSelect,
  onLayerAdd,
  onLayerDelete,
  onLayerToggleVisibility,
  onLayerToggleLock,
  onLayerMove,
  onMergeLayers,
  onGroupToggleVisibility,
  onGroupToggleCollapsed,
  onCreateGroup,
  onUngroup,
  onAddLayerToGroup,
}: LayersPanelProps) {
  const { colors } = useTheme();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      onLayerMove(draggedIndex, index);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDragOverGroupId(null);
  };

  const handleGroupDragOver = (e: React.DragEvent, groupId: string) => {
    e.preventDefault();
    setDragOverGroupId(groupId);
  };

  const handleGroupDragLeave = () => {
    setDragOverGroupId(null);
  };

  const handleGroupDrop = (e: React.DragEvent, groupId: string) => {
    e.preventDefault();
    if (draggedIndex !== null) {
      onAddLayerToGroup(draggedIndex, groupId);
    }
    setDraggedIndex(null);
    setDragOverGroupId(null);
  };

  return (
    <div
      style={{
        width: '280px',
        background: colors.panel,
        borderLeft: `1px solid ${colors.border}`,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          padding: '15px',
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: colors.text }}>레이어</div>
          {selectedLayerIndices.length >= 2 && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={onMergeLayers}
                style={{
                  padding: '6px 12px',
                  background: colors.accent,
                  border: 'none',
                  borderRadius: '5px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
                title={`${selectedLayerIndices.length}개 레이어 병합`}
              >
                병합
              </button>
              <button
                onClick={onCreateGroup}
                style={{
                  padding: '6px 12px',
                  background: colors.accent,
                  border: 'none',
                  borderRadius: '5px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
                title={`${selectedLayerIndices.length}개 레이어를 그룹으로 묶기`}
              >
                그룹 생성
              </button>
            </div>
          )}
        </div>

        <button
          onClick={onLayerAdd}
          style={{
            width: '100%',
            padding: '10px',
            background: colors.accent,
            border: 'none',
            borderRadius: '5px',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          + 레이어 추가
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '10px',
        }}
      >
        {/* 그룹 렌더링 (그룹 1이 맨 위) */}
        {groups.map((group) => (
          <div key={group.id} style={{ marginBottom: '5px' }}>
            {/* 그룹 헤더 */}
            <div
              onDragOver={(e) => handleGroupDragOver(e, group.id)}
              onDragLeave={handleGroupDragLeave}
              onDrop={(e) => handleGroupDrop(e, group.id)}
              style={{
                background: dragOverGroupId === group.id ? colors.accent + '40' : colors.background,
                padding: '10px',
                borderRadius: '5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                border: dragOverGroupId === group.id ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
              }}
            >
              <button
                onClick={() => onGroupToggleCollapsed(group.id)}
                style={{
                  background: colors.background,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '3px',
                  color: colors.text,
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title={group.collapsed ? '펼치기' : '접기'}
              >
                {group.collapsed ? <ChevronRight size={18} strokeWidth={2.5} /> : <ChevronDown size={18} strokeWidth={2.5} />}
              </button>

              <span style={{ flex: 1, fontSize: '13px', fontWeight: 600, color: colors.text }}>{group.name}</span>

              <span style={{ fontSize: '11px', color: '#666' }}>
                {group.layerIds.length}개
              </span>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onGroupToggleVisibility(group.id);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: colors.text,
                  cursor: 'pointer',
                  padding: '4px',
                  opacity: 0.7,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="그룹 가시성 토글"
              >
                {group.visible ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`"${group.name}" 그룹을 해제하시겠습니까?`)) {
                    onUngroup(group.id);
                  }
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: colors.text,
                  cursor: 'pointer',
                  padding: '4px',
                  opacity: 0.7,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="그룹 해제"
              >
                <FolderOpen size={16} />
              </button>
            </div>

            {/* 그룹 내 레이어들 */}
            {!group.collapsed && (
              <div style={{ paddingLeft: '20px', marginTop: '5px' }}>
                {[...layers]
                  .reverse()
                  .filter((layer) => group.layerIds.includes(String(layer.id)))
                  .map((layer, reverseIndex) => {
          const index = layers.findIndex(l => l.id === layer.id);
          const isActive = index === activeLayerIndex;
          const isSelected = selectedLayerIndices.includes(index);
          const isDragging = draggedIndex === index;
          const isDragOver = dragOverIndex === index;

          return (
            <div
              key={`${layer.id}-${layer.visible}`}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              onClick={(e) => onLayerSelect(index, e.ctrlKey || e.metaKey)}
              style={{
                background: isSelected ? colors.selectedLayer : isActive ? colors.activeLayer : colors.background,
                borderLeft: isSelected ? `2px solid ${colors.accent}` : 'none',
                borderRight: isSelected ? `2px solid ${colors.accent}` : 'none',
                borderBottom: isSelected ? `2px solid ${colors.accent}` : 'none',
                borderTop: isDragOver ? `3px solid ${colors.accent}` : isSelected ? `2px solid ${colors.accent}` : 'none',
                padding: '10px',
                marginBottom: '5px',
                borderRadius: '5px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'move',
                transition: 'all 0.2s',
                userSelect: 'none',
                opacity: isDragging ? 0.5 : 1,
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  background: '#444',
                  borderRadius: '3px',
                  flexShrink: 0,
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <img
                  src={layer.canvas.toDataURL()}
                  alt={layer.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                  }}
                />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '13px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {layer.name}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '5px' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onLayerToggleVisibility(index);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: colors.text,
                    cursor: 'pointer',
                    padding: '4px',
                    opacity: 0.7,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title={layer.visible ? '숨기기' : '보이기'}
                >
                  {layer.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onLayerToggleLock(index);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: layer.locked ? '#f59e0b' : colors.text,
                    cursor: 'pointer',
                    padding: '4px',
                    opacity: layer.locked ? 1 : 0.7,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title={layer.locked ? '잠금 해제' : '잠금'}
                >
                  {layer.locked ? <Lock size={16} /> : <Unlock size={16} />}
                </button>

                {layers.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onLayerDelete(index);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: colors.text,
                      cursor: 'pointer',
                      padding: '4px',
                      opacity: 0.7,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="삭제"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
              </div>
            )}
          </div>
        ))}

        {/* 그룹에 속하지 않은 레이어들 */}
        {layers
          .filter((layer) => {
            const layerIdStr = String(layer.id);
            const inAnyGroup = groups.some((g) => g.layerIds.includes(layerIdStr));
            return !inAnyGroup;
          })
          .reverse()
          .map((layer, reverseIndex) => {
            const index = layers.findIndex((l) => l.id === layer.id);
            const isActive = index === activeLayerIndex;
            const isSelected = selectedLayerIndices.includes(index);
            const isDragging = draggedIndex === index;
            const isDragOver = dragOverIndex === index;

            return (
              <div
                key={`${layer.id}-${layer.visible}`}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onClick={(e) => onLayerSelect(index, e.ctrlKey || e.metaKey)}
                style={{
                  background: isSelected ? colors.selectedLayer : isActive ? colors.activeLayer : colors.background,
                  borderLeft: isSelected ? `2px solid ${colors.accent}` : 'none',
                  borderRight: isSelected ? `2px solid ${colors.accent}` : 'none',
                  borderBottom: isSelected ? `2px solid ${colors.accent}` : 'none',
                  borderTop: isDragOver ? `3px solid ${colors.accent}` : isSelected ? `2px solid ${colors.accent}` : 'none',
                  padding: '10px',
                  marginBottom: '5px',
                  borderRadius: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'move',
                  transition: 'all 0.2s',
                  userSelect: 'none',
                  opacity: isDragging ? 0.5 : 1,
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    background: '#444',
                    borderRadius: '3px',
                    flexShrink: 0,
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <img
                    src={layer.canvas.toDataURL()}
                    alt={layer.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                    }}
                  />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '13px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {layer.name}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '5px' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onLayerToggleVisibility(index);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: colors.text,
                      cursor: 'pointer',
                      padding: '4px',
                      opacity: 0.7,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title={layer.visible ? '숨기기' : '보이기'}
                  >
                    {layer.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onLayerToggleLock(index);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: layer.locked ? '#f59e0b' : colors.text,
                      cursor: 'pointer',
                      padding: '4px',
                      opacity: layer.locked ? 1 : 0.7,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title={layer.locked ? '잠금 해제' : '잠금'}
                  >
                    {layer.locked ? <Lock size={16} /> : <Unlock size={16} />}
                  </button>

                  {layers.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onLayerDelete(index);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: colors.text,
                        cursor: 'pointer',
                        padding: '4px',
                        opacity: 0.7,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title="삭제"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
