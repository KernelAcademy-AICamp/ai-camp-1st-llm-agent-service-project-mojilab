# Mojilab

AI 기반 이모티콘 생성 서비스입니다.

## 기술 스택

### Frontend
- **Framework**: Next.js 15.1.4 (App Router)
- **Language**: TypeScript
- **UI Library**: React 18.3.1
- **Styling**: Tailwind CSS 3.4
- **Animation**: Framer Motion
- **Icons**: Lucide React
- **State Management**: Zustand

### Backend & Database
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Authentication**: Supabase Auth

### AI Integration
- **Image Generation**: Google Gemini 2.5 Flash, Replicate (Flux LoRA)
- **Text Generation**: OpenAI GPT, Google Gemini

### Image Processing
- **Canvas Editor**: Fabric.js
- **GIF Creation**: gifenc, gif-encoder-2
- **Image Optimization**: Sharp

## 주요 기능

### 이모티콘 생성
- **심플 이모티콘**: AI 챗봇과 대화하며 32개 이모티콘 세트 생성
- **Pro 이모티콘**: LoRA 학습으로 나만의 스타일 이모티콘 생성
- **SNS 콘텐츠**: SNS용 이미지 생성 및 편집

### 이미지 편집
- Fabric.js 기반 캔버스 에디터
- 레이어 관리
- 텍스트/스티커 추가
- GIF 애니메이션 생성

### 공유 기능
- 카카오톡 공유하기

## 프로젝트 구조

```
mojilab/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # 홈 (랜딩 페이지)
│   ├── landing/                  # 랜딩 페이지
│   ├── create/                   # 이모티콘 생성
│   │   ├── emoticon/             # 생성 방식 선택
│   │   ├── simple/               # 심플 이모티콘
│   │   ├── pro/                  # Pro 이모티콘
│   │   │   └── train/            # LoRA 학습
│   │   └── sns/                  # SNS 콘텐츠
│   │       └── editor/           # SNS 에디터
│   ├── editor/                   # 이미지 에디터
│   ├── series/                   # 이모티콘 시리즈
│   │   └── [id]/                 # 시리즈 상세
│   ├── my-series/                # 내 시리즈
│   ├── chat/                     # AI 챗봇
│   ├── login/                    # 로그인
│   ├── signup/                   # 회원가입
│   └── api/                      # API Routes
│       ├── emoticons/            # 이모티콘 API
│       │   ├── generate-simple/  # 심플 생성
│       │   ├── generate-scenes/  # 장면 생성
│       │   ├── create-gif/       # GIF 생성
│       │   ├── save/             # 저장
│       │   └── popular/          # 인기 목록
│       ├── lora/                 # LoRA 학습 API
│       │   ├── train/            # 학습 시작
│       │   ├── models/           # 모델 목록
│       │   ├── check-status/     # 상태 확인
│       │   └── webhook/          # Replicate 웹훅
│       └── instatoon/            # 인스타툰 API
├── components/                   # React 컴포넌트
│   ├── AppLayout.tsx             # 앱 레이아웃
│   ├── CommonNavbar.tsx          # 공통 네비게이션
│   ├── KakaoScript.tsx           # 카카오 SDK
│   ├── image-editor/             # 이미지 에디터 컴포넌트
│   └── chat/                     # 챗봇 컴포넌트
├── contexts/                     # React Context
│   ├── AuthContext.tsx           # 인증 상태
│   ├── GenerationContext.tsx     # 생성 상태
│   └── ThemeContext.tsx          # 테마 상태
├── lib/                          # 유틸리티
│   ├── supabase.ts               # Supabase 클라이언트 (브라우저)
│   ├── supabase-server.ts        # Supabase 클라이언트 (서버)
│   ├── supabase-storage.ts       # Supabase Storage 유틸
│   └── credits.ts                # 크레딧 관리
├── types/                        # TypeScript 타입 정의
├── public/                       # 정적 파일
│   └── banners/                  # 배너 이미지
└── supabase/                     # Supabase 설정
    └── migrations/               # DB 마이그레이션
```

## 시작하기

### 사전 요구사항
- Node.js 18+
- npm 또는 yarn

### 설치

```bash
# 의존성 설치
npm install
```

### 환경 변수 설정

`.env.example`을 `.env.local`로 복사하고 값을 설정하세요:

```bash
cp .env.example .env.local
```

#### 필수 환경 변수

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google Gemini (이미지 생성)
GEMINI_API_KEY=your_gemini_api_key

# Replicate (LoRA 학습)
REPLICATE_API_TOKEN=your_replicate_api_token

# Kakao (공유하기)
NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY=your_kakao_javascript_key
```

### 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

### 빌드

```bash
npm run build
npm start
```

## 배포

### Vercel 배포 (권장)

1. [Vercel](https://vercel.com)에서 GitHub 저장소 연결
2. 환경 변수 설정
3. 자동 배포

```bash
# 또는 Vercel CLI 사용
npm install -g vercel
vercel
```

### 환경 변수 설정 (Vercel)

Vercel 대시보드 → Settings → Environment Variables에서 위의 필수 환경 변수들을 설정하세요.

## 라이센스

MIT
