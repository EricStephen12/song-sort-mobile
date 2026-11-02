import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { HistoryItem, THEME } from '../config';
import { getHistory, clearHistory } from '../services/historyStorage';
import { SongPlayerModal, PlayableSong } from '../components/SongPlayerModal';

interface HistoryScreenProps {
  onGoToFind: () => void;
  activePlayingUrl: string | null;
  onSetPlayingUrl: (url: string | null) => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  onGoToFind,
  activePlayingUrl,
  onSetPlayingUrl,
}) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePlayer, setActivePlayer] = useState<AudioPlayer | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  // Dedicated Player Modal state
  const [selectedSong, setSelectedSong] = useState<PlayableSong | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    const data = await getHistory();
    setHistory(data);
    setLoading(false);
  };

  useEffect(() => {
    if (activePlayingUrl === null && activePlayer) {
      activePlayer.pause();
      activePlayer.remove();
      setActivePlayer(null);
      setPlayingId(null);
    }
  }, [activePlayingUrl]);

  const openPlayer = (item: HistoryItem, index: number) => {
    if (!item.stream_url) return;
    try { Haptics.selectionAsync(); } catch { /* ok */ }

    if (activePlayer) {
      activePlayer.pause();
      activePlayer.remove();
      setActivePlayer(null);
    }

    setSelectedSong({
      id: item.id,
      title: item.song,
      artist: item.artist,
      stream_url: item.stream_url,
    });
    setSelectedIndex(index);
    setIsPlayerOpen(true);
  };

  const handleNext = () => {
    if (selectedIndex < history.length - 1) {
      const nextIdx = selectedIndex + 1;
      const nextItem = history[nextIdx];
      setSelectedIndex(nextIdx);
      setSelectedSong({
        id: nextItem.id,
        title: nextItem.song,
        artist: nextItem.artist,
        stream_url: nextItem.stream_url,
      });
    }
  };

  const handlePrev = () => {
    if (selectedIndex > 0) {
      const prevIdx = selectedIndex - 1;
      const prevItem = history[prevIdx];
      setSelectedIndex(prevIdx);
      setSelectedSong({
        id: prevItem.id,
        title: prevItem.song,
        artist: prevItem.artist,
        stream_url: prevItem.stream_url,
      });
    }
  };

  const handleClear = () => {
    Alert.alert('Clear history', 'Remove all recently found songs?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch { /* ok */ }
          await clearHistory();
          setHistory([]);
        },
      },
    ]);
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Staggered row entrance animation
  const RowItem = ({ item, index }: { item: HistoryItem; index: number }) => {
    const rowAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
      Animated.timing(rowAnim, {
        toValue: 1,
        duration: 280,
        delay: index * 40,
        useNativeDriver: true,
      }).start();
    }, []);
    const isPlaying = playingId === item.id;
    return (
      <Animated.View style={{
        opacity: rowAnim,
        transform: [{ translateY: rowAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
      }}>
        <TouchableOpacity
          style={styles.songRow}
          onPress={() => openPlayer(item, index)}
          activeOpacity={0.7}
        >
          <View style={styles.songMain}>
            <Text style={styles.songTitle} numberOfLines={1}>{item.song}</Text>
            <Text style={styles.songMeta} numberOfLines={1}>
              {item.artist || 'Loveworld Song'} • {formatTime(item.timestamp)}
            </Text>
          </View>
          {item.stream_url ? (
            <TouchableOpacity
              style={[styles.playBtn, isPlaying && styles.playBtnActive]}
              onPress={() => openPlayer(item, index)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Svg width={13} height={13} viewBox="0 0 24 24" fill={isPlaying ? THEME.colors.white : THEME.colors.ink}>
                {isPlaying ? (
                  <Path d="M6 4h4v16H6zm8 0h4v16h-4z" />
                ) : (
                  <Path d="M8 5v14l11-7z" />
                )}
              </Svg>
            </TouchableOpacity>
          ) : null}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>History</Text>
          <Text style={styles.subtitle}>
            {history.length > 0 ? 'TODAY' : 'Recent searches'}
          </Text>
        </View>

        {history.length > 0 && (
          <TouchableOpacity
            onPress={handleClear}
            style={styles.clearBtn}
            hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
            activeOpacity={0.6}
          >
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Body */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color={THEME.colors.ink} />
        </View>
      ) : history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Nothing here yet</Text>
          <Text style={styles.emptySub}>
            Songs you search for will show up here.
          </Text>
          <TouchableOpacity
            style={styles.findBtn}
            onPress={onGoToFind}
            activeOpacity={0.8}
          >
            <Text style={styles.findBtnText}>Find a song</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => <RowItem item={item} index={index} />}
        />
      )}

      {/* High-Fidelity Dedicated Player Modal */}
      <SongPlayerModal
        visible={isPlayerOpen}
        song={selectedSong}
        onClose={() => setIsPlayerOpen(false)}
        onNext={handleNext}
        onPrev={handlePrev}
        hasNext={selectedIndex < history.length - 1}
        hasPrev={selectedIndex > 0}
        onPlaybackChange={(playing, songId) => {
          setPlayingId(playing ? (songId as string) : null);
          onSetPlayingUrl(playing ? selectedSong?.stream_url || null : null);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.cream,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 28,
    paddingTop: 18,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: THEME.colors.border,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: THEME.colors.ink,
    letterSpacing: -0.8,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    fontStyle: 'italic',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.muted,
    marginTop: 6,
    letterSpacing: 1,
  },
  clearBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  clearText: {
    fontSize: 13,
    color: THEME.colors.muted,
  },
  listContent: {
    paddingHorizontal: 28,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: THEME.colors.borderLight,
  },
  songMain: {
    flex: 1,
    paddingRight: 16,
  },
  songTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME.colors.ink,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    fontStyle: 'italic',
    marginBottom: 4,
  },
  songMeta: {
    fontSize: 13,
    color: THEME.colors.muted,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(18,17,16,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnActive: {
    backgroundColor: THEME.colors.ink,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    marginTop: -30,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: THEME.colors.ink,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    fontStyle: 'italic',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: THEME.colors.muted,
    textAlign: 'center',
    marginBottom: 24,
  },
  findBtn: {
    backgroundColor: THEME.colors.ink,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  findBtnText: {
    color: THEME.colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
