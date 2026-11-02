import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { API_BASE_URL, SongItem, THEME } from '../config';
import { SongPlayerModal } from '../components/SongPlayerModal';

interface LibraryScreenProps {
  activePlayingUrl: string | null;
  onSetPlayingUrl: (url: string | null) => void;
}

export const LibraryScreen: React.FC<LibraryScreenProps> = ({
  activePlayingUrl,
  onSetPlayingUrl,
}) => {
  const [songs, setSongs] = useState<SongItem[]>([]);
  const [filteredSongs, setFilteredSongs] = useState<SongItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activePlayer, setActivePlayer] = useState<AudioPlayer | null>(null);
  const [playingSongId, setPlayingSongId] = useState<number | null>(null);

  // Dedicated Player Modal state
  const [selectedSong, setSelectedSong] = useState<SongItem | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  useEffect(() => {
    fetchSongs();
  }, []);

  useEffect(() => {
    if (activePlayingUrl === null && activePlayer) {
      activePlayer.pause();
      activePlayer.remove();
      setActivePlayer(null);
      setPlayingSongId(null);
    }
  }, [activePlayingUrl]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSongs(songs);
    } else {
      const q = searchQuery.toLowerCase();
      setFilteredSongs(
        songs.filter(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            (s.artist && s.artist.toLowerCase().includes(q))
        )
      );
    }
  }, [searchQuery, songs]);

  const fetchSongs = async () => {
    try {
      setError(null);
      const res = await fetch(`${API_BASE_URL}/songs`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: SongItem[] = await res.json();
      setSongs(data);
      setFilteredSongs(data);
    } catch (err: any) {
      console.warn('Failed to load songs:', err);
      setError('Could not load songs. Check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchSongs();
  };

  const openPlayer = (song: SongItem, index: number) => {
    const url = song.stream_url || song.r2_url;
    if (!url) return;
    try { Haptics.selectionAsync(); } catch { /* ok */ }

    if (activePlayer) {
      activePlayer.pause();
      activePlayer.remove();
      setActivePlayer(null);
    }

    setSelectedSong(song);
    setSelectedIndex(index);
    setIsPlayerOpen(true);
  };

  const handleNextSong = () => {
    if (selectedIndex < filteredSongs.length - 1) {
      const nextIdx = selectedIndex + 1;
      setSelectedIndex(nextIdx);
      setSelectedSong(filteredSongs[nextIdx]);
    }
  };

  const handlePrevSong = () => {
    if (selectedIndex > 0) {
      const prevIdx = selectedIndex - 1;
      setSelectedIndex(prevIdx);
      setSelectedSong(filteredSongs[prevIdx]);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header (Matching Figma Screen 5) */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Library</Text>
          <Text style={styles.subtitle}>
            {songs.length > 0 ? `${songs.length} songs` : 'Music'}
          </Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchBox}>
        <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={THEME.colors.muted} strokeWidth={2}>
          <Circle cx="11" cy="11" r="8" />
          <Path d="m21 21-4.35-4.35" strokeLinecap="round" />
        </Svg>
        <TextInput
          style={styles.searchInput}
          placeholder="Search songs..."
          placeholderTextColor={THEME.colors.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={THEME.colors.muted} strokeWidth={2}>
              <Path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </Svg>
          </TouchableOpacity>
        )}
      </View>

      {/* Body */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color={THEME.colors.ink} />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchSongs} activeOpacity={0.8}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : filteredSongs.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>
            {searchQuery ? 'No songs found' : 'No songs yet'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredSongs}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={THEME.colors.ink}
            />
          }
          renderItem={({ item, index }) => {
            const isPlaying = playingSongId === item.id;
            const trackIndex = (index + 1).toString().padStart(2, '0');

            return (
              <TouchableOpacity
                style={[styles.songRow, isPlaying && styles.songRowPlaying]}
                onPress={() => openPlayer(item, index)}
                activeOpacity={0.7}
              >
                <Text style={styles.trackIndex}>{trackIndex}</Text>

                <View style={styles.songInfo}>
                  <Text style={styles.songTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.artistName} numberOfLines={1}>
                    {item.artist || 'Loveworld Song'}
                  </Text>
                </View>

                {(item.stream_url || item.r2_url) ? (
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
            );
          }}
        />
      )}

      {/* High-Fidelity Dedicated Player Modal */}
      <SongPlayerModal
        visible={isPlayerOpen}
        song={selectedSong ? {
          id: selectedSong.id,
          title: selectedSong.title,
          artist: selectedSong.artist,
          stream_url: selectedSong.stream_url || selectedSong.r2_url,
          r2_url: selectedSong.r2_url,
        } : null}
        onClose={() => setIsPlayerOpen(false)}
        onNext={handleNextSong}
        onPrev={handlePrevSong}
        hasNext={selectedIndex < filteredSongs.length - 1}
        hasPrev={selectedIndex > 0}
        onPlaybackChange={(playing, songId) => {
          setPlayingSongId(playing ? (songId as number) : null);
          onSetPlayingUrl(playing ? (selectedSong?.stream_url || selectedSong?.r2_url || null) : null);
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
    paddingHorizontal: 28,
    paddingTop: 18,
    paddingBottom: 16,
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
    fontSize: 13,
    color: THEME.colors.muted,
    marginTop: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 28,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: THEME.colors.white,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: THEME.colors.ink,
    marginLeft: 10,
    padding: 0,
  },
  listContent: {
    paddingHorizontal: 28,
    paddingBottom: 24,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: THEME.colors.borderLight,
  },
  songRowPlaying: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 12,
    paddingHorizontal: 8,
  },
  trackIndex: {
    fontSize: 12,
    color: THEME.colors.subtle,
    width: 28,
  },
  songInfo: {
    flex: 1,
    paddingRight: 16,
  },
  songTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: THEME.colors.ink,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    fontStyle: 'italic',
    marginBottom: 3,
  },
  artistName: {
    fontSize: 13,
    color: THEME.colors.muted,
  },
  playBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
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
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 14,
    color: THEME.colors.muted,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: THEME.colors.ink,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  retryText: {
    color: THEME.colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: THEME.colors.muted,
  },
});
