import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Platform,
  Easing,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { THEME, resolveStreamUrl } from '../config';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface PlayableSong {
  id?: number | string;
  title: string;
  artist?: string | null;
  stream_url?: string | null;
  r2_url?: string | null;
}

interface SongPlayerModalProps {
  visible: boolean;
  song: PlayableSong | null;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
  onPlaybackChange?: (isPlaying: boolean, songId?: number | string) => void;
}

export const SongPlayerModal: React.FC<SongPlayerModalProps> = ({
  visible,
  song,
  onClose,
  onNext,
  onPrev,
  hasNext = false,
  hasPrev = false,
  onPlaybackChange,
}) => {
  const [player, setPlayer] = useState<AudioPlayer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Animations
  const sheetAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  // Turntable vinyl spinning animation (Native driven)
  const spinAnim = useRef(new Animated.Value(0)).current;
  const spinLoop = useRef<Animated.CompositeAnimation | null>(null);

  // Turntable vinyl shifting colorways phase animation (100% Native driven)
  const discPhaseAnim = useRef(new Animated.Value(0)).current;
  const colorLoop = useRef<Animated.CompositeAnimation | null>(null);

  const activeAudioUrl = resolveStreamUrl(song?.stream_url || song?.r2_url);

  // Slide-up and fade-in when visible
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(sheetAnim, {
          toValue: 0,
          friction: 9,
          tension: 75,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(sheetAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // Load and play song when it changes or modal opens
  useEffect(() => {
    const audioUrl = song?.stream_url || song?.r2_url;
    if (!visible || !audioUrl) {
      cleanupPlayer();
      return;
    }

    let isCancelled = false;
    cleanupPlayer();

    setIsLoading(true);
    setCurrentTime(0);
    setDuration(0);

    try {
      const p = createAudioPlayer(audioUrl);
      setPlayer(p);
      p.play();
      setIsPlaying(true);
      setIsLoading(false);
      onPlaybackChange?.(true, song?.id);

      p.addListener('playbackStatusUpdate', (status) => {
        if (isCancelled) return;

        if (status.currentTime !== undefined) {
          setCurrentTime(status.currentTime);
        }
        if (status.duration !== undefined && status.duration > 0) {
          setDuration(status.duration);
        }
        if (status.playing !== undefined) {
          setIsPlaying(status.playing);
          onPlaybackChange?.(status.playing, song?.id);
        }

        // Auto-advance or stop at track end
        if (
          !status.playing &&
          status.currentTime !== undefined &&
          status.duration !== undefined &&
          status.currentTime >= status.duration &&
          status.duration > 0
        ) {
          setIsPlaying(false);
          setCurrentTime(0);
          try {
            p.seekTo(0);
          } catch {
            /* ok */
          }
          onPlaybackChange?.(false, song?.id);
          if (hasNext && onNext) {
            onNext();
          }
        }
      });
    } catch (err) {
      console.warn('[PlayerModal] Audio player init error:', err);
      setIsLoading(false);
      setIsPlaying(false);
      onPlaybackChange?.(false, song?.id);
    }

    return () => {
      isCancelled = true;
    };
  }, [visible, song?.id, song?.stream_url, song?.r2_url]);

  // Handle vinyl spin animation sync with isPlaying (100% Native Driver)
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

  // Living turntable vinyl collector's spectrum cycling (10 magnificent luxury shades)
  // 100% Native Driver: Animates discPhaseAnim (0 -> 1 -> 2 -> ... -> 10 -> 0)
  useEffect(() => {
    if (visible && isPlaying) {
      const STEP_HOLD = 2600;
      const STEP_MORPH = 1200;

      colorLoop.current = Animated.loop(
        Animated.sequence([
          // 0: Obsidian Black -> 1: Crimson Velvet
          Animated.delay(STEP_HOLD),
          Animated.timing(discPhaseAnim, { toValue: 1, duration: STEP_MORPH, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          // 1: Crimson Velvet -> 2: Burnt Tangerine
          Animated.delay(STEP_HOLD),
          Animated.timing(discPhaseAnim, { toValue: 2, duration: STEP_MORPH, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          // 2: Burnt Tangerine -> 3: Imperial Amber Gold
          Animated.delay(STEP_HOLD),
          Animated.timing(discPhaseAnim, { toValue: 3, duration: STEP_MORPH, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          // 3: Imperial Amber Gold -> 4: Forest Emerald
          Animated.delay(STEP_HOLD),
          Animated.timing(discPhaseAnim, { toValue: 4, duration: STEP_MORPH, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          // 4: Forest Emerald -> 5: Caribbean Teal
          Animated.delay(STEP_HOLD),
          Animated.timing(discPhaseAnim, { toValue: 5, duration: STEP_MORPH, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          // 5: Caribbean Teal -> 6: Electric Sapphire
          Animated.delay(STEP_HOLD),
          Animated.timing(discPhaseAnim, { toValue: 6, duration: STEP_MORPH, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          // 6: Electric Sapphire -> 7: Cosmic Royal Indigo
          Animated.delay(STEP_HOLD),
          Animated.timing(discPhaseAnim, { toValue: 7, duration: STEP_MORPH, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          // 7: Cosmic Royal Indigo -> 8: Mystic Violet Amethyst
          Animated.delay(STEP_HOLD),
          Animated.timing(discPhaseAnim, { toValue: 8, duration: STEP_MORPH, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          // 8: Mystic Violet Amethyst -> 9: Hot Magenta Wine
          Animated.delay(STEP_HOLD),
          Animated.timing(discPhaseAnim, { toValue: 9, duration: STEP_MORPH, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          // 9: Hot Magenta Wine -> 10: Obsidian Black
          Animated.delay(STEP_HOLD),
          Animated.timing(discPhaseAnim, { toValue: 10, duration: STEP_MORPH, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          // Instantly reset to 0 (which is also Obsidian Black) so next loop starts seamlessly
          Animated.timing(discPhaseAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );
      colorLoop.current.start();
    } else {
      colorLoop.current?.stop();
    }
  }, [visible, isPlaying]);

  const cleanupPlayer = () => {
    if (player) {
      try {
        player.pause();
        player.remove();
      } catch {
        /* ok */
      }
      setPlayer(null);
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  };

  const handleDismiss = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      /* ok */
    }
    cleanupPlayer();
    onPlaybackChange?.(false);
    onClose();
  };

  const togglePlayPause = async () => {
    try {
      await Haptics.selectionAsync();
    } catch {
      /* ok */
    }

    const audioUrl = song?.stream_url || song?.r2_url;
    if (!audioUrl) return;

    if (!player) {
      try {
        setIsLoading(true);
        const p = createAudioPlayer(audioUrl);
        setPlayer(p);
        p.play();
        setIsPlaying(true);
        setIsLoading(false);
        onPlaybackChange?.(true, song?.id);

        p.addListener('playbackStatusUpdate', (status) => {
          if (status.currentTime !== undefined) {
            setCurrentTime(status.currentTime);
          }
          if (status.duration !== undefined && status.duration > 0) {
            setDuration(status.duration);
          }
          if (status.playing !== undefined) {
            setIsPlaying(status.playing);
            onPlaybackChange?.(status.playing, song?.id);
          }

          // Auto-advance or stop at track end
          if (
            !status.playing &&
            status.currentTime !== undefined &&
            status.duration !== undefined &&
            status.currentTime >= status.duration &&
            status.duration > 0
          ) {
            setIsPlaying(false);
            setCurrentTime(0);
            try {
              p.seekTo(0);
            } catch {
              /* ok */
            }
            onPlaybackChange?.(false, song?.id);
            if (hasNext && onNext) {
              onNext();
            }
          }
        });
      } catch (err) {
        console.warn('[PlayerModal] Start error:', err);
        setIsLoading(false);
      }
      return;
    }

    try {
      if (isPlaying) {
        player.pause();
        setIsPlaying(false);
        onPlaybackChange?.(false, song?.id);
      } else {
        // If track completed or at end, rewind to start!
        if (duration > 0 && currentTime >= duration - 0.5) {
          try {
            await player.seekTo(0);
            setCurrentTime(0);
          } catch {
            /* ok */
          }
        }
        player.play();
        setIsPlaying(true);
        onPlaybackChange?.(true, song?.id);
      }
    } catch (err) {
      console.warn('[PlayerModal] Toggle error, re-creating player:', err);
      try {
        const p = createAudioPlayer(audioUrl);
        setPlayer(p);
        p.play();
        setIsPlaying(true);
        onPlaybackChange?.(true, song?.id);
      } catch (e) {
        console.warn('[PlayerModal] Recovery failed:', e);
      }
    }
  };

  const seekRelative = (deltaSeconds: number) => {
    if (!player) return;
    try {
      Haptics.selectionAsync();
    } catch {
      /* ok */
    }
    const target = Math.max(0, Math.min(duration || 9999, currentTime + deltaSeconds));
    try {
      player.seekTo(target);
      setCurrentTime(target);
    } catch (err) {
      console.warn('[PlayerModal] Seek error:', err);
    }
  };

  const handleScrubberPress = (evt: any) => {
    if (!player || duration <= 0) return;
    const { locationX } = evt.nativeEvent;
    const width = Dimensions.get('window').width - 56; // 28 padding on each side
    const ratio = Math.max(0, Math.min(1, locationX / width));
    const target = ratio * duration;
    try {
      Haptics.selectionAsync();
      player.seekTo(target);
      setCurrentTime(target);
    } catch (err) {
      console.warn('[PlayerModal] Scrubber seek error:', err);
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const vinylRotation = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // 10-Color Collector's Edition Vinyl Palette (100% Native Driver)
  const crimsonOpacity = discPhaseAnim.interpolate({
    inputRange: [0, 0.4, 1, 1.6, 2],
    outputRange: [0, 0, 1, 0, 0],
    extrapolate: 'clamp',
  });
  const tangerineOpacity = discPhaseAnim.interpolate({
    inputRange: [1, 1.4, 2, 2.6, 3],
    outputRange: [0, 0, 1, 0, 0],
    extrapolate: 'clamp',
  });
  const amberOpacity = discPhaseAnim.interpolate({
    inputRange: [2, 2.4, 3, 3.6, 4],
    outputRange: [0, 0, 1, 0, 0],
    extrapolate: 'clamp',
  });
  const emeraldOpacity = discPhaseAnim.interpolate({
    inputRange: [3, 3.4, 4, 4.6, 5],
    outputRange: [0, 0, 1, 0, 0],
    extrapolate: 'clamp',
  });
  const tealOpacity = discPhaseAnim.interpolate({
    inputRange: [4, 4.4, 5, 5.6, 6],
    outputRange: [0, 0, 1, 0, 0],
    extrapolate: 'clamp',
  });
  const sapphireOpacity = discPhaseAnim.interpolate({
    inputRange: [5, 5.4, 6, 6.6, 7],
    outputRange: [0, 0, 1, 0, 0],
    extrapolate: 'clamp',
  });
  const indigoOpacity = discPhaseAnim.interpolate({
    inputRange: [6, 6.4, 7, 7.6, 8],
    outputRange: [0, 0, 1, 0, 0],
    extrapolate: 'clamp',
  });
  const violetOpacity = discPhaseAnim.interpolate({
    inputRange: [7, 7.4, 8, 8.6, 9],
    outputRange: [0, 0, 1, 0, 0],
    extrapolate: 'clamp',
  });
  const magentaOpacity = discPhaseAnim.interpolate({
    inputRange: [8, 8.4, 9, 9.6, 10],
    outputRange: [0, 0, 1, 0, 0],
    extrapolate: 'clamp',
  });

  if (!visible && !song) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <View style={styles.modalRoot}>
        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={handleDismiss}>
          <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]} />
        </TouchableWithoutFeedback>

        {/* Sliding Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY: sheetAnim }] },
          ]}
        >
          {/* Top Pill Handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Header Bar */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={handleDismiss}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={THEME.colors.ink} strokeWidth={2}>
                <Path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </TouchableOpacity>

            <View style={styles.headerTitleBox}>
              <Text style={styles.eyebrow}>NOW PLAYING</Text>
            </View>

            <View style={styles.headerRightSpacer} />
          </View>

          {/* Minimalist Vinyl Art with Living Turntable Rotation & Shifting Colorways (100% Native Driver) */}
          <View style={styles.artArea}>
            <Animated.View
              style={[
                styles.vinylDisc,
                { transform: [{ rotate: vinylRotation }] },
              ]}
            >
              {/* Base Obsidian Black Layer */}
              <View style={[StyleSheet.absoluteFill, styles.vinylColorBase, { backgroundColor: '#1E1D1B' }]} />

              {/* Shifting Collector's Edition Color Overlays (100% Native Driver Opacity Blends) */}
              <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.vinylColorBase, { backgroundColor: '#781326', opacity: crimsonOpacity }]} />
              <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.vinylColorBase, { backgroundColor: '#853612', opacity: tangerineOpacity }]} />
              <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.vinylColorBase, { backgroundColor: '#735010', opacity: amberOpacity }]} />
              <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.vinylColorBase, { backgroundColor: '#124729', opacity: emeraldOpacity }]} />
              <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.vinylColorBase, { backgroundColor: '#0D5254', opacity: tealOpacity }]} />
              <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.vinylColorBase, { backgroundColor: '#153A6D', opacity: sapphireOpacity }]} />
              <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.vinylColorBase, { backgroundColor: '#282069', opacity: indigoOpacity }]} />
              <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.vinylColorBase, { backgroundColor: '#4B195C', opacity: violetOpacity }]} />
              <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.vinylColorBase, { backgroundColor: '#611545', opacity: magentaOpacity }]} />

              {/* Subtle Vinyl Gloss Sheen Reflection */}
              <View pointerEvents="none" style={styles.vinylSheen} />

              {/* Outer Grooves */}
              <View style={styles.vinylGroove} />
              <View style={styles.vinylGrooveMid} />
              <View style={styles.vinylGrooveInner} />

              {/* Center Label */}
              <View style={styles.vinylCenter}>
                <Svg width={22} height={22} viewBox="0 0 24 24" fill={THEME.colors.muted}>
                  <Path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </Svg>
              </View>
            </Animated.View>
          </View>

          {/* Track Info */}
          <View style={styles.trackInfo}>
            <Text style={styles.songTitle} numberOfLines={2}>
              {song?.title || 'Unknown Track'}
            </Text>
            <Text style={styles.artistName} numberOfLines={1}>
              {song?.artist || 'Loveworld Song'}
            </Text>
          </View>

          {/* Scrubber Progress Bar */}
          <TouchableWithoutFeedback onPress={handleScrubberPress}>
            <View style={styles.scrubberContainer}>
              <View style={styles.scrubberTrack}>
                <View style={[styles.scrubberFill, { width: `${progressPercent}%` }]} />
              </View>
              <View style={styles.timeRow}>
                <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                <Text style={styles.timeText}>{formatTime(duration)}</Text>
              </View>
            </View>
          </TouchableWithoutFeedback>

          {/* Playback Controls */}
          <View style={styles.controlsRow}>
            {/* Previous or -15s */}
            <TouchableOpacity
              style={[styles.skipBtn, !hasPrev && styles.skipBtnDisabled]}
              onPress={() => {
                if (hasPrev && onPrev) onPrev();
                else seekRelative(-10);
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Svg width={22} height={22} viewBox="0 0 24 24" fill={THEME.colors.ink}>
                <Path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
              </Svg>
            </TouchableOpacity>

            {/* Quick 10s Rewind */}
            <TouchableOpacity
              style={styles.seekStepBtn}
              onPress={() => seekRelative(-10)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={THEME.colors.ink} strokeWidth={1.8}>
                <Path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M3 3v5h5" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <View style={styles.seekStepOverlay} pointerEvents="none">
                <Text style={styles.seekStepText}>10</Text>
              </View>
            </TouchableOpacity>

            {/* Central Play / Pause Button */}
            <TouchableOpacity
              style={styles.playPauseBtn}
              onPress={togglePlayPause}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={THEME.colors.white} />
              ) : (
                <Svg width={22} height={22} viewBox="0 0 24 24" fill={THEME.colors.white}>
                  {isPlaying ? (
                    <Path d="M6 4h4v16H6zm8 0h4v16h-4z" />
                  ) : (
                    <Path d="M8 5v14l11-7z" />
                  )}
                </Svg>
              )}
            </TouchableOpacity>

            {/* Quick 10s Forward */}
            <TouchableOpacity
              style={styles.seekStepBtn}
              onPress={() => seekRelative(10)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={THEME.colors.ink} strokeWidth={1.8}>
                <Path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M21 3v5h-5" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <View style={styles.seekStepOverlay} pointerEvents="none">
                <Text style={styles.seekStepText}>10</Text>
              </View>
            </TouchableOpacity>

            {/* Next or +10s */}
            <TouchableOpacity
              style={[styles.skipBtn, !hasNext && styles.skipBtnDisabled]}
              onPress={() => {
                if (hasNext && onNext) onNext();
                else seekRelative(10);
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Svg width={22} height={22} viewBox="0 0 24 24" fill={THEME.colors.ink}>
                <Path d="m6 18 8.5-6L6 6v12zM16 6v12h2V6h-2z" />
              </Svg>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(18, 17, 16, 0.45)',
  },
  sheet: {
    backgroundColor: THEME.colors.cream,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingBottom: Platform.select({ ios: 42, android: 28, default: 28 }),
    paddingHorizontal: 28,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 8,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.colors.subtle,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(18, 17, 16, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleBox: {
    alignItems: 'center',
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.muted,
    letterSpacing: 2.0,
  },
  headerRightSpacer: {
    width: 36,
  },
  artArea: {
    width: '100%',
    height: 220,
    borderRadius: 20,
    backgroundColor: '#F3EFE9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  vinylDisc: {
    width: 170,
    height: 170,
    borderRadius: 85,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  vinylColorBase: {
    width: '100%',
    height: '100%',
    borderRadius: 85,
  },
  vinylGroove: {
    position: 'absolute',
    width: 142,
    height: 142,
    borderRadius: 71,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  vinylGrooveMid: {
    position: 'absolute',
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  vinylGrooveInner: {
    position: 'absolute',
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  vinylSheen: {
    position: 'absolute',
    width: 220,
    height: 38,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    transform: [{ rotate: '-45deg' }],
  },
  vinylCenter: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EAE5DC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  songTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: THEME.colors.ink,
    letterSpacing: -0.6,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 6,
  },
  artistName: {
    fontSize: 15,
    color: THEME.colors.muted,
    textAlign: 'center',
  },
  scrubberContainer: {
    width: '100%',
    paddingVertical: 10,
    marginBottom: 12,
  },
  scrubberTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(18, 17, 16, 0.08)',
    overflow: 'hidden',
  },
  scrubberFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: THEME.colors.ink,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeText: {
    fontSize: 12,
    color: THEME.colors.muted,
    fontWeight: '500',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  skipBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtnDisabled: {
    opacity: 0.3,
  },
  seekStepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(18, 17, 16, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  seekStepOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 1.5,
  },
  seekStepText: {
    fontSize: 8.5,
    fontWeight: '700',
    color: THEME.colors.ink,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    letterSpacing: -0.2,
  },
  playPauseBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: THEME.colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
});
