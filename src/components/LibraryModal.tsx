import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import { API_BASE_URL, SongItem } from '../config';
import * as Haptics from 'expo-haptics';

interface LibraryModalProps {
  visible: boolean;
  onClose: () => void;
}

export const LibraryModal: React.FC<LibraryModalProps> = ({ visible, onClose }) => {
  const [songs, setSongs] = useState<SongItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSongId, setActiveSongId] = useState<number | null>(null);
  const [player, setPlayer] = useState<AudioPlayer | null>(null);
  const sheetAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      fetchSongs();
      Animated.spring(sheetAnim, {
        toValue: 1,
        friction: 8,
        tension: 70,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(sheetAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
      if (player) {
        player.pause();
        player.remove();
        setPlayer(null);
        setActiveSongId(null);
      }
    }
  }, [visible]);

  const fetchSongs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/songs`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      const data: SongItem[] = await res.json();
      setSongs(data);
    } catch (err: any) {
      console.warn('Failed to fetch songs:', err);
      setError('Unable to load library. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const playSong = (song: SongItem) => {
    if (!song.r2_url) return;
    try {
      Haptics.selectionAsync();
    } catch { /* optional */ }

    try {
      if (activeSongId === song.id && player) {
        player.pause();
        player.remove();
        setPlayer(null);
        setActiveSongId(null);
        return;
      }
      if (player) {
        player.pause();
        player.remove();
      }
      const newPlayer = createAudioPlayer(song.r2_url);
      setPlayer(newPlayer);
      setActiveSongId(song.id);
      newPlayer.play();
      newPlayer.addListener('playbackStatusUpdate', (status) => {
        if (!status.playing && status.currentTime >= (status.duration || 0) && (status.duration || 0) > 0) {
          setActiveSongId(null);
        }
      });
    } catch (err) {
      console.warn('Error playing song:', err);
    }
  };

  const sheetTranslateY = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });

  return (
    <Modal visible={visible} animationType="none" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.overlayTouchable} onPress={onClose} activeOpacity={1} />
        <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetTranslateY }] }]}>

          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Library</Text>
              <Text style={styles.subtitle}>
                {songs.length} {songs.length === 1 ? 'track' : 'tracks'} indexed
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#8E8A83" strokeWidth={2.2}>
                <Path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </TouchableOpacity>
          </View>

          {/* Body */}
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#0D0D0D" />
              <Text style={styles.centerText}>Loading library...</Text>
            </View>
          ) : error ? (
            <View style={styles.center}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={fetchSongs} style={styles.retryBtn} activeOpacity={0.8}>
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : songs.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.centerText}>No songs indexed yet.</Text>
            </View>
          ) : (
            <FlatList
              data={songs}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => {
                const isActive = activeSongId === item.id;
                return (
                  <View
                    style={[
                      styles.songRow,
                      index === songs.length - 1 && styles.songRowLast,
                    ]}
                  >
                    {/* Track number */}
                    <Text style={styles.trackNum}>
                      {String(index + 1).padStart(2, '0')}
                    </Text>

                    {/* Meta */}
                    <View style={styles.songMeta}>
                      <Text
                        style={[styles.rowTitle, isActive && styles.rowTitleActive]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      <Text style={styles.rowArtist} numberOfLines={1}>
                        {item.artist || 'Unknown Artist'}
                      </Text>
                    </View>

                    {/* Play button */}
                    {item.r2_url ? (
                      <TouchableOpacity
                        onPress={() => playSong(item)}
                        style={[styles.rowPlayBtn, isActive && styles.rowPlayBtnActive]}
                        activeOpacity={0.75}
                      >
                        <Svg
                          width={13}
                          height={13}
                          viewBox="0 0 24 24"
                          fill={isActive ? '#FAFAF8' : '#0D0D0D'}
                        >
                          {isActive ? (
                            <Path d="M6 4h4v16H6zm8 0h4v16h-4z" />
                          ) : (
                            <Path d="M8 5v14l11-7z" />
                          )}
                        </Svg>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.rowPlayBtnPlaceholder} />
                    )}
                  </View>
                );
              }}
            />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const INK = '#0D0D0D';
const CREAM = '#F9F6F1';
const MUTED = '#8E8A83';
const BORDER = '#EDEAE3';

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(13, 13, 13, 0.4)',
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    maxHeight: '80%',
    minHeight: '45%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DEDAD3',
    alignSelf: 'center',
    marginBottom: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: INK,
    letterSpacing: -0.4,
    fontStyle: 'italic',
  },
  subtitle: {
    fontSize: 12,
    color: MUTED,
    marginTop: 2,
    fontWeight: '400',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F2EEE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    minHeight: 160,
  },
  centerText: {
    fontSize: 14,
    color: MUTED,
    marginTop: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 13,
    color: '#C0392B',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  retryBtn: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    backgroundColor: INK,
    borderRadius: 50,
  },
  retryText: {
    color: '#FAFAF8',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  listContent: {
    paddingTop: 4,
    paddingBottom: 8,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    gap: 12,
  },
  songRowLast: {
    borderBottomWidth: 0,
  },
  trackNum: {
    fontSize: 11,
    color: '#C8C4BB',
    fontWeight: '600',
    minWidth: 22,
    textAlign: 'right',
    letterSpacing: 0.5,
  },
  songMeta: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: INK,
    letterSpacing: -0.1,
  },
  rowTitleActive: {
    color: '#555',
  },
  rowArtist: {
    fontSize: 12,
    color: MUTED,
    fontWeight: '400',
  },
  rowPlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2EEE8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  rowPlayBtnActive: {
    backgroundColor: INK,
    borderColor: INK,
  },
  rowPlayBtnPlaceholder: {
    width: 32,
  },
});
