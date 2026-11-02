import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Platform,
  Easing,
} from 'react-native';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import Svg, { Path } from 'react-native-svg';
import { IdentifyResult, THEME, resolveStreamUrl } from '../config';
import * as Haptics from 'expo-haptics';

interface ResultCardProps {
  result: IdentifyResult;
  onDismiss: () => void;
}

interface ActiveSongSelection {
  title: string | null;
  artist: string | null;
  confidence: number;
  stream_url?: string | null;
}

export const ResultCard: React.FC<ResultCardProps> = ({ result }) => {
  const [selectedSong, setSelectedSong] = useState<ActiveSongSelection>({
    title: result.song,
    artist: result.artist,
    confidence: result.confidence,
    stream_url: resolveStreamUrl(result.stream_url),
  });

  const [player, setPlayer] = useState<AudioPlayer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  const slideAnim = useRef(new Animated.Value(28)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.94)).current;

  // Turntable vinyl spinning animation
  const spinAnim = useRef(new Animated.Value(0)).current;
  const spinLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, friction: 9, tension: 90, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 9, tension: 90, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
    ]).start();

    return () => {
      if (player) {
        player.pause();
        player.remove();
      }
    };
  }, []);

  useEffect(() => {
    setSelectedSong({
      title: result.song,
      artist: result.artist,
      confidence: result.confidence,
      stream_url: resolveStreamUrl(result.stream_url),
    });
    if (player) {
      player.pause();
      player.remove();
      setPlayer(null);
      setIsPlaying(false);
    }
  }, [result]);

  useEffect(() => {
    if (isPlaying) {
      spinLoop.current = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 4800,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      spinLoop.current.start();
    } else {
      spinLoop.current?.stop();
    }
  }, [isPlaying]);

  const togglePlayback = async () => {
    const activeUrl = resolveStreamUrl(selectedSong.stream_url);
    if (!activeUrl) return;
    try { await Haptics.selectionAsync(); } catch { /* ok */ }

    try {
      if (player) {
        if (isPlaying) {
          player.pause();
          setIsPlaying(false);
        } else {
          try {
            await player.seekTo(0);
          } catch {
            /* ok */
          }
          player.play();
          setIsPlaying(true);
        }
      } else {
        setIsLoadingAudio(true);
        const p = createAudioPlayer(activeUrl);
        setPlayer(p);
        p.play();
        setIsPlaying(true);
        setIsLoadingAudio(false);
        p.addListener('playbackStatusUpdate', (s) => {
          if (!s.playing && s.currentTime >= (s.duration || 0) && (s.duration || 0) > 0) {
            setIsPlaying(false);
            try { p.seekTo(0); } catch {}
          }
        });
      }
    } catch (err) {
      console.warn('Playback error:', err);
      try {
        const p = createAudioPlayer(selectedSong.stream_url);
        setPlayer(p);
        p.play();
        setIsPlaying(true);
      } catch {}
      setIsLoadingAudio(false);
    }
  };

  const handleSelectSong = async (song: ActiveSongSelection) => {
    try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch { /* ok */ }

    if (player) {
      player.pause();
      player.remove();
      setPlayer(null);
      setIsPlaying(false);
    }

    const resolvedUrl = resolveStreamUrl(song.stream_url);
    setSelectedSong({ ...song, stream_url: resolvedUrl });

    if (resolvedUrl) {
      setIsLoadingAudio(true);
      try {
        const p = createAudioPlayer(resolvedUrl);
        setPlayer(p);
        p.play();
        setIsPlaying(true);
        p.addListener('playbackStatusUpdate', (s) => {
          if (!s.playing && s.currentTime >= (s.duration || 0) && (s.duration || 0) > 0) {
            setIsPlaying(false);
            try { p.seekTo(0); } catch {}
          }
        });
      } catch (err) {
        console.warn('Preview error:', err);
      } finally {
        setIsLoadingAudio(false);
      }
    }
  };

  // Vinyl match pop animation
  const vinylPopAnim = useRef(new Animated.Value(1)).current;
  const isMatched = Boolean(selectedSong.title && result.method !== 'none');

  useEffect(() => {
    if (isMatched) {
      Animated.sequence([
        Animated.spring(vinylPopAnim, { toValue: 1.06, friction: 5, tension: 300, useNativeDriver: true }),
        Animated.spring(vinylPopAnim, { toValue: 1.0, friction: 6, tension: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [result]);
  const confidence = Math.round((selectedSong.confidence ?? 0) * 100);

  const vinylRotation = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }]}>
      {isMatched ? (
        <>
          <View style={styles.eyebrowRow}>
            <Text style={styles.eyebrow}>
              {result.method === 'melody' ? 'HUM & MELODY MATCH' : 'ACOUSTIC RECOGNITION'}
            </Text>
          </View>

          {/* Minimalist Vinyl Art with Living Turntable Rotation */}
          <View style={styles.artArea}>
            <Animated.View style={[styles.vinylDisc, { transform: [{ rotate: vinylRotation }, { scale: vinylPopAnim }] }]}>
              <View style={styles.vinylGroove} />
              <View style={styles.vinylGrooveInner} />
              <View style={styles.vinylCenter}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill={THEME.colors.muted}>
                  <Path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </Svg>
              </View>
            </Animated.View>
          </View>

          {/* Track details */}
          <View style={styles.infoBlock}>
            <Text style={styles.songTitle} numberOfLines={2}>
              {selectedSong.title}
            </Text>
            <Text style={styles.artistName} numberOfLines={1}>
              {selectedSong.artist || 'Loveworld Song'}
            </Text>
            {confidence > 0 && (
              <View style={styles.badgeRow}>
                <Text style={styles.accuracyText}>{confidence}% confidence</Text>
              </View>
            )}
          </View>

          {/* Primary Action Button */}
          {selectedSong.stream_url ? (
            <TouchableOpacity
              style={styles.playBtn}
              onPress={togglePlayback}
              activeOpacity={0.85}
            >
              {isLoadingAudio ? (
                <ActivityIndicator size="small" color={THEME.colors.white} />
              ) : (
                <>
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill={THEME.colors.white}>
                    {isPlaying ? (
                      <Path d="M6 4h4v16H6zm8 0h4v16h-4z" />
                    ) : (
                      <Path d="M8 5v14l11-7z" />
                    )}
                  </Svg>
                  <Text style={styles.playBtnText}>
                    {isPlaying ? 'Pause Song' : 'Play Original Audio'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}

          {/* Multiple Candidates / Alternatives Section */}
          {result.alternatives && result.alternatives.length > 0 && (
            <View style={styles.altSection}>
              <View style={styles.altDivider} />

              <View style={styles.altHeader}>
                <Text style={styles.altHeaderTitle}>Other Potential Matches</Text>
                <Text style={styles.altBadge}>{result.alternatives.length + 1} candidates</Text>
              </View>

              {/* Show original #1 if an alternative is currently playing */}
              {selectedSong.title !== result.song && (
                <TouchableOpacity
                  style={[styles.altCard, styles.altCardPrimaryReturn]}
                  onPress={() => handleSelectSong({
                    title: result.song,
                    artist: result.artist,
                    confidence: result.confidence,
                    stream_url: result.stream_url,
                  })}
                  activeOpacity={0.7}
                >
                  <View style={styles.altLeft}>
                    <View style={styles.altRankPillTop}>
                      <Text style={styles.altRankTextTop}>#1</Text>
                    </View>
                    <View style={styles.altTextWrap}>
                      <Text style={styles.altTitle} numberOfLines={1}>{result.song}</Text>
                      <Text style={styles.altArtist} numberOfLines={1}>{result.artist || 'Loveworld Song'}</Text>
                    </View>
                  </View>

                  <View style={styles.altRight}>
                    <Text style={styles.altScore}>{Math.round((result.confidence ?? 0) * 100)}%</Text>
                    <View style={styles.altPlayCircleTop}>
                      <Svg width={10} height={10} viewBox="0 0 24 24" fill={THEME.colors.white}>
                        <Path d="M8 5v14l11-7z" />
                      </Svg>
                    </View>
                  </View>
                </TouchableOpacity>
              )}

              {/* Render alternative candidate rows */}
              {result.alternatives.map((alt, idx) => {
                const isSelected = selectedSong.title === alt.title;
                const altConf = Math.round((alt.confidence ?? 0) * 100);

                return (
                  <TouchableOpacity
                    key={alt.song_id || idx}
                    style={[styles.altCard, isSelected && styles.altCardActive]}
                    onPress={() => handleSelectSong({
                      title: alt.title,
                      artist: alt.artist,
                      confidence: alt.confidence,
                      stream_url: alt.stream_url,
                    })}
                    activeOpacity={0.7}
                  >
                    <View style={styles.altLeft}>
                      <View style={[styles.altRankPill, isSelected && styles.altRankPillActive]}>
                        <Text style={[styles.altRankText, isSelected && styles.altRankTextActive]}>
                          #{idx + 2}
                        </Text>
                      </View>
                      <View style={styles.altTextWrap}>
                        <Text style={[styles.altTitle, isSelected && styles.altTitleActive]} numberOfLines={1}>
                          {alt.title}
                        </Text>
                        <Text style={styles.altArtist} numberOfLines={1}>
                          {alt.artist || 'Loveworld Song'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.altRight}>
                      <Text style={[styles.altScore, isSelected && styles.altScoreActive]}>
                        {altConf}%
                      </Text>
                      <View style={[styles.altPlayCircle, isSelected && styles.altPlayCircleActive]}>
                        <Svg width={10} height={10} viewBox="0 0 24 24" fill={isSelected ? THEME.colors.white : THEME.colors.ink}>
                          <Path d="M8 5v14l11-7z" />
                        </Svg>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </>
      ) : (
        <View style={styles.noMatchBlock}>
          <Text style={styles.noMatchTitle}>No match found</Text>
          <Text style={styles.noMatchSub}>
            We couldn't catch that one. Try humming a clear 4–6 second phrase of the chorus a little louder.
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.white,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 3,
  },
  eyebrowRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.bronze,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  artArea: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    backgroundColor: '#F3EFE9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  vinylDisc: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#1E1D1B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  vinylGroove: {
    position: 'absolute',
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  vinylGrooveInner: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  vinylCenter: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EAE5DC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBlock: {
    alignItems: 'center',
    marginBottom: 18,
  },
  songTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: THEME.colors.ink,
    letterSpacing: -0.5,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 6,
  },
  artistName: {
    fontSize: 14,
    color: THEME.colors.muted,
    textAlign: 'center',
    marginBottom: 6,
  },
  badgeRow: {
    backgroundColor: 'rgba(201, 154, 69, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  accuracyText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.bronze,
    letterSpacing: 0.3,
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: THEME.colors.ink,
    borderRadius: 40,
    paddingVertical: 14,
  },
  playBtnText: {
    color: THEME.colors.white,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  altSection: {
    marginTop: 22,
  },
  altDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: THEME.colors.border,
    marginBottom: 16,
  },
  altHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  altHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.ink,
    letterSpacing: 0.2,
  },
  altBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.bronze,
    backgroundColor: 'rgba(201, 154, 69, 0.1)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  altSub: {
    fontSize: 12,
    color: THEME.colors.muted,
    lineHeight: 17,
    marginBottom: 12,
  },
  altCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  altCardActive: {
    backgroundColor: '#F5EFE6',
    borderColor: THEME.colors.bronze,
  },
  altCardPrimaryReturn: {
    backgroundColor: '#F5EFE6',
    borderColor: THEME.colors.bronze,
  },
  altLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  altRankPill: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(18, 17, 16, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  altRankPillActive: {
    backgroundColor: THEME.colors.bronze,
  },
  altRankPillTop: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: THEME.colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  altRankText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.ink,
  },
  altRankTextActive: {
    color: THEME.colors.white,
  },
  altRankTextTop: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.white,
  },
  altTextWrap: {
    flex: 1,
  },
  altTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.ink,
    marginBottom: 2,
  },
  altTitleActive: {
    color: THEME.colors.ink,
    fontWeight: '700',
  },
  altArtist: {
    fontSize: 11,
    color: THEME.colors.muted,
  },
  altRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  altScore: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.muted,
  },
  altScoreActive: {
    color: THEME.colors.bronze,
    fontWeight: '700',
  },
  altPlayCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(18, 17, 16, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  altPlayCircleActive: {
    backgroundColor: THEME.colors.bronze,
  },
  altPlayCircleTop: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: THEME.colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noMatchBlock: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  noMatchTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: THEME.colors.ink,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    fontStyle: 'italic',
    marginBottom: 8,
  },
  noMatchSub: {
    fontSize: 14,
    color: THEME.colors.muted,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 260,
  },
});
