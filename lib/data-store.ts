// 임시 인메모리 데이터 스토어
// 나중에 Prisma/PostgreSQL로 교체 가능

export interface Design {
  id: string;
  title: string;
  description?: string;
  width: number;
  height: number;
  content?: any;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  password: string;
  createdAt: string;
  onboarding?: OnboardingData;
}

export interface OnboardingData {
  industry?: string;
  designGoal?: string;
  style?: string;
  tone?: string;
  experience?: string;
  completedAt?: string;
}

// Mock designs data
export const designs: Design[] = [
  {
    id: '1',
    title: 'Social Media Post',
    description: 'Instagram post template',
    width: 1080,
    height: 1080,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Presentation Slide',
    description: 'Business presentation',
    width: 1920,
    height: 1080,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Mock users data
export const users: User[] = [
  {
    id: '1',
    email: 'user@example.com',
    name: 'John Doe',
    password: 'password123', // 실제로는 해시화 필요
    createdAt: new Date().toISOString(),
  },
];
