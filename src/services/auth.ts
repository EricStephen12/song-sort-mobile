import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

const STORAGE_KEY_AUTH = '@songsort_auth_session';

const HEADERS = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true',
  'Bypass-Tunnel-Reminder': 'true',
};

/**
 * Safe JSON parser — if the server returns HTML (ngrok warning page, 502, etc.)
 * this throws a user-friendly error instead of a cryptic SyntaxError.
 */
async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text || text.trimStart().startsWith('<')) {
    throw new Error('Could not reach the server. Check your internet connection and try again.');
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Unexpected response from server. Please try again.');
  }
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

/**
 * Retrieve saved session from AsyncStorage
 */
export async function getStoredSession(): Promise<AuthSession | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_AUTH);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch (err) {
    console.warn('[Auth] Failed to load session:', err);
    return null;
  }
}

/**
 * Save active session
 */
export async function saveSession(session: AuthSession): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(session));
  } catch (err) {
    console.warn('[Auth] Failed to save session:', err);
  }
}

/**
 * Clear session on sign out
 */
export async function clearSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY_AUTH);
  } catch (err) {
    console.warn('[Auth] Failed to clear session:', err);
  }
}

/**
 * Sign up API request
 */
export async function apiSignUp(name: string, email: string, password: string): Promise<AuthSession> {
  const url = `${API_BASE_URL}/auth/signup`;
  console.log('[auth] POST', url);
  const res = await fetch(url, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ name, email, password }),
  });

  const data = await safeJson(res);
  if (!res.ok) {
    throw new Error(data?.detail || 'Sign up failed. Please try again.');
  }

  const session: AuthSession = { token: data.token, user: data.user };
  await saveSession(session);
  return session;
}

/**
 * Sign in API request
 */
export async function apiSignIn(email: string, password: string): Promise<AuthSession> {
  const url = `${API_BASE_URL}/auth/signin`;
  console.log('[auth] POST', url);
  const res = await fetch(url, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ email, password }),
  });

  const data = await safeJson(res);
  if (!res.ok) {
    throw new Error(data?.detail || 'Invalid email or password.');
  }

  const session: AuthSession = { token: data.token, user: data.user };
  await saveSession(session);
  return session;
}

/**
 * Reset password — user provides email + new password directly.
 * No email verification for now. Resend integration coming later.
 */
export async function apiResetPassword(email: string, newPassword: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ email, new_password: newPassword }),
  });

  const data = await safeJson(res);
  if (!res.ok) {
    throw new Error(data?.detail || 'Password reset failed. Please try again.');
  }
}
