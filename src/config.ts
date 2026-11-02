/**
 * Global configuration for the Mobile Song ID client.
 */

// Active ngrok tunnel (or local backend) — overridden by EXPO_PUBLIC_API_URL if set
const DEFAULT_HOST = 'https://adelia-unwarlike-unacerbically.ngrok-free.dev';


export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || DEFAULT_HOST).replace(/\/$/, '');

// Log the active URL on startup so you can confirm it in the console
console.log('[config] API_BASE_URL:', API_BASE_URL);

/**
 * Ensures any stream URL (whether Cloudinary, ngrok, or local loopback)
 * resolves correctly on mobile devices.
 */
export function resolveStreamUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http://127.0.0.1:8000')) {
    return url.replace('http://127.0.0.1:8000', API_BASE_URL);
  }
  if (url.startsWith('http://localhost:8000')) {
    return url.replace('http://localhost:8000', API_BASE_URL);
  }
  if (url.startsWith('/audio/')) {
    return `${API_BASE_URL}${url}`;
  }
  return url;
}

// How often to poll for async results (ms)
export const POLL_INTERVAL_MS = 1000;
// Max time to wait for a result before giving up (ms)
export const POLL_TIMEOUT_MS = 120000; // 2 minutes

export type MatchMode = 'auto' | 'fingerprint' | 'melody';

export interface IdentifyResult {
  status?: 'done' | 'queued' | 'processing' | 'failed';
  song: string | null;
  artist: string | null;
  confidence: number;
  method: 'fingerprint' | 'melody' | 'none';
  stream_url?: string | null;
  processing_time_s?: number;
  alternatives?: Array<{
    song_id: number;
    title: string;
    artist: string | null;
    confidence: number;
    stream_url?: string | null;
  }>;
}

export interface JobResponse {
  status: 'queued' | 'processing';
  job_id: string;
  message?: string;
}

export interface UsageInfo {
  user_id: string;
  used: number;
  remaining: number;
  free_limit: number;
  is_free_tier: boolean;
}

export interface SongItem {
  id: number;
  title: string;
  artist: string | null;
  r2_key?: string | null;
  r2_url?: string | null;
  stream_url?: string | null;
}

export interface HistoryItem {
  id: string;
  song: string;
  artist: string | null;
  confidence: number;
  method: 'fingerprint' | 'melody' | 'none';
  stream_url?: string | null;
  timestamp: number;
}

export const THEME = {
  colors: {
    cream: '#F8F5F0',
    creamLight: '#FCFAF7',
    creamDark: '#EDE8DE',
    ink: '#121110',
    inkSoft: '#2B2825',
    muted: '#8A857D',
    subtle: '#C5BFB5',
    border: '#E8E3D8',
    borderLight: '#F2EEE6',
    white: '#FFFFFF',
    success: '#2E7547',
    gold: '#C59B27',
    bronze: '#C99A45',
    cardBg: '#FFFFFF',
  },
};

