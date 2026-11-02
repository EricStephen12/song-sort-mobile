import AsyncStorage from '@react-native-async-storage/async-storage';
import { HistoryItem, IdentifyResult } from '../config';

const HISTORY_STORAGE_KEY = '@songsort_history_v1';
const LEGACY_STORAGE_KEY = '@aude_song_history_v1';

export async function getHistory(): Promise<HistoryItem[]> {
  try {
    let raw = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) {
      raw = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
    }
    if (!raw) return [];
    const parsed: HistoryItem[] = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to load history:', err);
    return [];
  }
}

export async function saveHistoryItem(result: IdentifyResult): Promise<HistoryItem | null> {
  if (!result.song) return null;
  try {
    const existing = await getHistory();
    const newItem: HistoryItem = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      song: result.song,
      artist: result.artist || null,
      confidence: result.confidence ?? 0,
      method: result.method || 'fingerprint',
      stream_url: result.stream_url || null,
      timestamp: Date.now(),
    };

    // Filter out immediate duplicate if identified within last 3 minutes
    const filtered = existing.filter(
      (item) => !(item.song.toLowerCase() === newItem.song.toLowerCase() && Date.now() - item.timestamp < 180000)
    );

    const updated = [newItem, ...filtered].slice(0, 50); // Keep last 50 matches
    await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    return newItem;
  } catch (err) {
    console.warn('Failed to save history item:', err);
    return null;
  }
}

export async function removeHistoryItem(id: string): Promise<HistoryItem[]> {
  try {
    const existing = await getHistory();
    const updated = existing.filter((item) => item.id !== id);
    await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('Failed to remove history item:', err);
    return [];
  }
}

export async function clearHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(HISTORY_STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to clear history:', err);
  }
}
