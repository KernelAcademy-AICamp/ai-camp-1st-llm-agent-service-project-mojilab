import { supabase } from './supabase';

export interface SignUpData {
  email: string;
  password: string;
  name: string;
}

export interface SignInData {
  email: string;
  password: string;
}

/**
 * 새 사용자를 등록합니다
 * @param data - 회원가입 정보
 */
export async function signUp({ email, password, name }: SignUpData) {
  try {
    const { data: authData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    if (error) {
      throw error;
    }

    return authData;
  } catch (error) {
    console.error('Error signing up:', error);
    throw new Error('회원가입에 실패했습니다');
  }
}

/**
 * 사용자 로그인
 * @param data - 로그인 정보
 */
export async function signIn({ email, password }: SignInData) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error signing in:', error);
    throw new Error('로그인에 실패했습니다');
  }
}

/**
 * 사용자 로그아웃
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error signing out:', error);
    throw new Error('로그아웃에 실패했습니다');
  }
}

/**
 * 현재 로그인한 사용자 정보 가져오기
 */
export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      throw error;
    }

    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * 비밀번호 재설정 이메일 전송
 * @param email - 사용자 이메일
 */
export async function resetPassword(email: string) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error resetting password:', error);
    throw new Error('비밀번호 재설정에 실패했습니다');
  }
}

/**
 * 비밀번호 업데이트
 * @param newPassword - 새 비밀번호
 */
export async function updatePassword(newPassword: string) {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error updating password:', error);
    throw new Error('비밀번호 업데이트에 실패했습니다');
  }
}
