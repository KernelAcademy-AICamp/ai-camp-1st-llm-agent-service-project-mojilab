'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, Loader2, ArrowLeft, Sparkles, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { LORA_TRAINING_CONFIG } from '@/lib/replicate-lora';
import { supabase } from '@/lib/supabase';

export default function LoRATrainPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [name, setName] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ modelId: string; message: string } | null>(null);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(
      (file) =>
        file.type === 'image/png' ||
        file.type === 'image/jpeg' ||
        file.type === 'image/webp'
    );

    const remainingSlots = LORA_TRAINING_CONFIG.maxImages - images.length;
    const filesToProcess = validFiles.slice(0, remainingSlots);

    const newImages: string[] = [];

    for (const file of filesToProcess) {
      if (file.size > LORA_TRAINING_CONFIG.maxFileSize) {
        setError(`파일 ${file.name}이 10MB를 초과합니다`);
        continue;
      }
      const base64 = await fileToBase64(file);
      newImages.push(base64);
    }

    setImages(prev => [...prev, ...newImages]);
    setError(null);
  }, [images.length]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  const removeImage = useCallback((index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearAll = useCallback(() => {
    setImages([]);
  }, []);

  const handleStartTraining = async () => {
    if (!user) {
      setError('로그인이 필요합니다');
      return;
    }

    if (!name.trim()) {
      setError('스타일 이름을 입력해주세요');
      return;
    }

    if (images.length < LORA_TRAINING_CONFIG.minImages) {
      setError(`최소 ${LORA_TRAINING_CONFIG.minImages}장의 이미지가 필요합니다`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 세션에서 access_token 가져오기
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/lora/train', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          images,
          userId: user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '학습 시작에 실패했습니다');
      }

      setSuccess({
        modelId: data.modelId,
        message: data.message,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 인증 로딩 중
  if (authLoading) {
    return (
      <div className="page">
        <div className="loading-container">
          <Loader2 size={48} className="spinner" />
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  // 로그인 안 된 경우
  if (!user) {
    return (
      <div className="page">
        <div className="auth-message">
          <AlertCircle size={48} />
          <h2>로그인이 필요합니다</h2>
          <p>스타일 학습을 하려면 먼저 로그인해주세요</p>
          <button onClick={() => router.push('/login')} className="btn-primary">
            로그인하기
          </button>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  // 성공 화면
  if (success) {
    return (
      <div className="page">
          <div className="success-container">
            <CheckCircle size={64} className="success-icon" />
            <h1>학습이 시작되었습니다!</h1>
            <p className="success-message">{success.message}</p>
            <p className="success-note">
              학습이 완료되면 &apos;내 스타일&apos; 목록에서 확인할 수 있습니다.
            </p>
            <div className="success-actions">
              <button onClick={() => router.push('/create/pro')} className="btn-primary">
                Pro 이모티콘 만들기
              </button>
              <button onClick={() => router.push('/my-styles')} className="btn-secondary">
                내 스타일 보기
              </button>
            </div>
          </div>
          <style jsx>{styles}</style>
        </div>
    );
  }

  // 로딩 화면
  if (loading) {
    return (
      <div className="page">
          <div className="loading-container">
            <Loader2 size={48} className="spinner" />
            <h2>학습 준비 중...</h2>
            <p>이미지를 업로드하고 학습을 시작합니다</p>
          </div>
          <style jsx>{styles}</style>
        </div>
    );
  }

  return (
    <div className="page">
        <div className="header">
       
          <div>
            <h1>나만의 스타일 학습</h1>
            <p className="subtitle">내 그림체로 이모티콘을 만들어보세요</p>
          </div>
        </div>

        {/* 스타일 이름 */}
        <div className="section">
          <label className="label">스타일 이름</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 귀여운 토끼 스타일"
            className="input"
          />
        </div>

        {/* 이미지 업로드 */}
        <div className="section">
          <div className="label-row">
            <label className="label">학습 이미지</label>
            <span className="count">{images.length}/{LORA_TRAINING_CONFIG.maxImages}</span>
          </div>

          <div className="requirements">
            <p>• PNG, JPG, WebP 형식 • 최소 {LORA_TRAINING_CONFIG.minImages}장, 최대 {LORA_TRAINING_CONFIG.maxImages}장</p>
            <p>• 권장 {LORA_TRAINING_CONFIG.recommendedImages}장 • 파일당 10MB 이하</p>
            <p>• 일관된 스타일의 이미지를 업로드하세요</p>
          </div>

          {/* 업로드 영역 */}
          {images.length < LORA_TRAINING_CONFIG.maxImages && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`upload-area ${isDragging ? 'dragging' : ''}`}
            >
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={handleFileInput}
                className="file-input"
              />
              <Upload size={32} className="upload-icon" />
              <p>이미지를 드래그하거나 클릭하여 업로드</p>
            </div>
          )}

          {/* 이미지 미리보기 */}
          {images.length > 0 && (
            <div className="images-section">
              <div className="images-header">
                <span>업로드된 이미지 ({images.length}장)</span>
                <button onClick={clearAll} className="clear-btn">전체 삭제</button>
              </div>
              <div className="images-grid">
                {images.map((image, index) => (
                  <div key={index} className="image-card">
                    <img src={image} alt={`이미지 ${index + 1}`} />
                    <button onClick={() => removeImage(index)} className="remove-btn">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="error-box">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* 비용 안내 */}
        <div className="info-box">
          <Sparkles size={18} />
          <div>
            <p><strong>LoRA 크레딧 1개</strong>가 차감됩니다</p>
            <p className="small">학습 시간: 약 {LORA_TRAINING_CONFIG.estimatedTime}</p>
          </div>
        </div>

        {/* 시작 버튼 */}
        <button
          onClick={handleStartTraining}
          disabled={!name.trim() || images.length < LORA_TRAINING_CONFIG.minImages}
          className="btn-start"
        >
          <Sparkles size={20} />
          학습 시작하기
        </button>

        <style jsx>{styles}</style>
      </div>
  );
}

const styles = `
  .page {
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    min-height: 100vh;
  }

  .header {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 32px;
  }

  .back-btn {
    padding: 8px;
    background: #f5f5f5;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 4px;
  }

  .back-btn:hover {
    background: #e5e5e5;
  }

  h1 {
    font-size: 24px;
    font-weight: 700;
    color: #1a1a1a;
    margin: 0 0 4px 0;
  }

  .subtitle {
    font-size: 14px;
    color: #666;
    margin: 0;
  }

  .section {
    margin-bottom: 24px;
  }

  .label {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: #333;
    margin-bottom: 8px;
  }

  .label-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .count {
    font-size: 13px;
    color: #10b981;
    font-weight: 600;
  }

  .input {
    width: 100%;
    padding: 14px 16px;
    font-size: 16px;
    border: 2px solid #e5e5e5;
    border-radius: 12px;
    transition: border-color 0.2s;
  }

  .input:focus {
    outline: none;
    border-color: #10b981;
  }

  .requirements {
    background: #f8f9fa;
    border-radius: 12px;
    padding: 12px 16px;
    margin-bottom: 16px;
  }

  .requirements p {
    font-size: 13px;
    color: #666;
    margin: 4px 0;
  }

  .upload-area {
    position: relative;
    border: 2px dashed #d1d5db;
    border-radius: 16px;
    padding: 40px 20px;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
    background: #fafafa;
  }

  .upload-area:hover, .upload-area.dragging {
    border-color: #10b981;
    background: #ecfdf5;
  }

  .file-input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }

  .upload-icon {
    color: #9ca3af;
    margin-bottom: 12px;
  }

  .upload-area p {
    color: #666;
    font-size: 14px;
    margin: 0;
  }

  .images-section {
    margin-top: 16px;
  }

  .images-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .images-header span {
    font-size: 13px;
    color: #666;
  }

  .clear-btn {
    font-size: 12px;
    color: #ef4444;
    background: none;
    border: none;
    cursor: pointer;
  }

  .clear-btn:hover {
    text-decoration: underline;
  }

  .images-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: 8px;
  }

  .image-card {
    position: relative;
    aspect-ratio: 1;
    border-radius: 8px;
    overflow: hidden;
  }

  .image-card img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .remove-btn {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 20px;
    height: 20px;
    background: rgba(239, 68, 68, 0.9);
    color: white;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .image-card:hover .remove-btn {
    opacity: 1;
  }

  .error-box {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 12px;
    margin-bottom: 16px;
    color: #dc2626;
    font-size: 14px;
  }

  .info-box {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    background: #ecfdf5;
    border: 1px solid #a7f3d0;
    border-radius: 12px;
    margin-bottom: 24px;
    color: #059669;
  }

  .info-box p {
    margin: 0;
    font-size: 14px;
  }

  .info-box .small {
    font-size: 12px;
    color: #10b981;
    margin-top: 4px;
  }

  .btn-start {
    width: 100%;
    padding: 16px;
    background: linear-gradient(to right, #10b981, #059669);
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.2s;
  }

  .btn-start:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);
  }

  .btn-start:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Loading & Auth */
  .loading-container, .auth-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    text-align: center;
  }

  .auth-message h2 {
    font-size: 22px;
    font-weight: 700;
    color: #1a1a1a;
    margin: 16px 0 8px 0;
  }

  .auth-message p {
    font-size: 15px;
    color: #666;
    margin: 0 0 24px 0;
  }

  .spinner {
    animation: spin 1s linear infinite;
    color: #10b981;
    margin-bottom: 16px;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .loading-container h2 {
    font-size: 20px;
    color: #1a1a1a;
    margin: 0 0 8px 0;
  }

  .loading-container p {
    font-size: 14px;
    color: #666;
    margin: 0;
  }

  /* Success */
  .success-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    text-align: center;
  }

  .success-icon {
    color: #10b981;
    margin-bottom: 24px;
  }

  .success-container h1 {
    font-size: 24px;
    margin-bottom: 12px;
  }

  .success-message {
    font-size: 16px;
    color: #666;
    margin: 0 0 8px 0;
  }

  .success-note {
    font-size: 14px;
    color: #888;
    margin: 0 0 32px 0;
  }

  .success-actions {
    display: flex;
    gap: 12px;
  }

  .btn-primary {
    padding: 14px 24px;
    background: linear-gradient(to right, #10b981, #059669);
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-secondary {
    padding: 14px 24px;
    background: white;
    color: #666;
    border: 2px solid #e5e5e5;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }

  @media (max-width: 640px) {
    .page {
      padding: 16px;
    }

    .success-actions {
      flex-direction: column;
      width: 100%;
    }

    .btn-primary, .btn-secondary {
      width: 100%;
    }
  }
`;
