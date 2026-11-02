import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Platform,
  Animated,
  Easing,
  ScrollView,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import Svg, { Path, Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

import { MicTrigger } from '../components/MicTrigger';
import { ResultCard } from '../components/ResultCard';
import { WaveformVisualizer } from '../components/WaveformVisualizer';
import {
  API_BASE_URL,
  POLL_INTERVAL_MS,
  POLL_TIMEOUT_MS,
  IdentifyResult,
  THEME,
} from '../config';
import { saveHistoryItem } from '../services/historyStorage';

interface FindScreenProps {
  onGoToHistory: () => void;
  onSetPlayingUrl: (url: string | null) => void;
}

type AppState = 'idle' | 'listening' | 'analyzing' | 'result';

export const FindScreen: React.FC<FindScreenProps> = ({
  onSetPlayingUrl,
}) => {
  const recorder = useAudioRecorder({
    extension: '.wav',
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 64000,
    android: {
      extension: '.wav',
      outputFormat: 'default',
      audioEncoder: 'default',
      sampleRate: 16000,
      numberOfChannels: 1,
    },
    ios: {
      extension: '.wav',
      outputFormat: 'lpcm',
      sampleRate: 16000,
      numberOfChannels: 1,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
  });

  const [currentMode, setCurrentMode] = useState<AppState>('idle');
  const [result, setResult] = useState<IdentifyResult | null>(null);

  const maxRecordTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isProcessingRef = useRef(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Transitions
  const idleFade = useRef(new Animated.Value(1)).current;
  const listenFade = useRef(new Animated.Value(0)).current;
  const analyzeFade = useRef(new Animated.Value(0)).current;
  const resultFade = useRef(new Animated.Value(0)).current;

  // Analyzing — arc draw animation (strokeDashoffset style, driven by Animated)
  const arcAnim = useRef(new Animated.Value(0)).current;
  const arcLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    requestRecordingPermissionsAsync().catch(console.warn);
    return () => {
      maxRecordTimeout.current && clearTimeout(maxRecordTimeout.current);
      pollIntervalRef.current && clearInterval(pollIntervalRef.current);
    };
  }, []);

  const transitionTo = (next: AppState) => {
    setCurrentMode(next);
    const targets: Record<AppState, Animated.Value> = {
      idle: idleFade,
      listening: listenFade,
      analyzing: analyzeFade,
      result: resultFade,
    };
    const all: AppState[] = ['idle', 'listening', 'analyzing', 'result'];
    const fadeOuts = all
      .filter((s) => s !== next)
      .map((s) =>
        Animated.timing(targets[s], { toValue: 0, duration: 200, useNativeDriver: true })
      );

    Animated.parallel([
      ...fadeOuts,
      Animated.timing(targets[next], { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => {
    if (currentMode === 'analyzing') {
      arcAnim.setValue(0);
      arcLoop.current = Animated.loop(
        Animated.timing(arcAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        })
      );
      arcLoop.current.start();
    } else {
      arcLoop.current?.stop();
    }
  }, [currentMode]);

  const startRecording = async () => {
    try {
      onSetPlayingUrl(null);
      setResult(null);

      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Microphone permission',
          'Please turn on microphone access in your settings so Song Sort can listen.'
        );
        return;
      }
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch { /* ok */ }

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();

      transitionTo('listening');
      maxRecordTimeout.current = setTimeout(() => stopRecordingAndIdentify(), 10_000);
    } catch (err: any) {
      Alert.alert('Microphone error', err.message || 'Could not start recording.');
      transitionTo('idle');
    }
  };

  const stopRecordingAndIdentify = async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    maxRecordTimeout.current && clearTimeout(maxRecordTimeout.current);
    transitionTo('analyzing');

    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) throw new Error('No audio was captured.');
      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists) throw new Error('Audio file missing.');
      await uploadAndIdentify(uri);
    } catch (err: any) {
      Alert.alert('Something went wrong', err.message || 'Please try again.');
      transitionTo('idle');
    } finally {
      isProcessingRef.current = false;
    }
  };

  const uploadAndIdentify = async (audioUri: string) => {
    try {
      const uploadPromise = FileSystem.uploadAsync(`${API_BASE_URL}/identify`, audioUri, {
        fieldName: 'audio',
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        headers: { 'Bypass-Tunnel-Reminder': 'true', 'ngrok-skip-browser-warning': 'true' },
        parameters: { mode: 'auto', user_id: 'anonymous' },
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Search timed out. Please check your connection and try again.')), 15000)
      );

      const upload = await Promise.race([uploadPromise, timeoutPromise]);

      if (upload.status === 402) {
        transitionTo('idle');
        Alert.alert('Limit reached', "You've reached your free searches for this month.");
        return;
      }
      if (upload.status < 200 || upload.status >= 300) {
        throw new Error(`Server returned status ${upload.status}`);
      }

      const data: IdentifyResult = JSON.parse(upload.body);
      if (['queued', 'processing', 'pending'].includes(data.status || '')) {
        await pollForResult((data as any).job_id);
        return;
      }

      try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch { /* ok */ }
      setResult(data);
      if (data.song) {
        await saveHistoryItem(data);
      }
      transitionTo('result');
    } catch (err: any) {
      Alert.alert('Notice', err.message || 'Could not reach the server. Please check your internet connection.');
      transitionTo('idle');
    }
  };

  const pollForResult = async (jobId: string) => {
    const t0 = Date.now();
    await new Promise<void>((resolve) => {
      pollIntervalRef.current = setInterval(async () => {
        if (Date.now() - t0 > POLL_TIMEOUT_MS) {
          clearInterval(pollIntervalRef.current!);
          transitionTo('idle');
          Alert.alert('No response', 'Search timed out. Please try singing or playing again.');
          resolve();
          return;
        }
        try {
          const res = await fetch(`${API_BASE_URL}/result/${jobId}`, {
            headers: { 'ngrok-skip-browser-warning': 'true' }
          });
          const data: IdentifyResult = await res.json();
          if (data.status === 'done') {
            clearInterval(pollIntervalRef.current!);
            try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch { /* ok */ }
            setResult(data);
            if (data.song) {
              await saveHistoryItem(data);
            }
            transitionTo('result');
            resolve();
          } else if (data.status === 'failed') {
            clearInterval(pollIntervalRef.current!);
            transitionTo('idle');
            Alert.alert('No match', 'We couldn’t identify this song. Try humming again.');
            resolve();
          }
        } catch { /* retry quietly */ }
      }, POLL_INTERVAL_MS);
    });
  };

  const handleCancelListening = async () => {
    isProcessingRef.current = true;
    maxRecordTimeout.current && clearTimeout(maxRecordTimeout.current);
    try { await recorder.stop(); } catch { /* ok */ }
    isProcessingRef.current = false;
    transitionTo('idle');
    try { await Haptics.selectionAsync(); } catch { /* ok */ }
  };

  const handleDismissResult = async () => {
    setResult(null);
    transitionTo('idle');
    try { await Haptics.selectionAsync(); } catch { /* ok */ }
  };

  const spin = arcAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.container}>
      {/* ── IDLE STATE (Matching Figma Screen 1) ── */}
      <Animated.View
        style={[styles.stateLayer, { opacity: idleFade }]}
        pointerEvents={currentMode === 'idle' ? 'auto' : 'none'}
      >
        <View style={styles.idleContent}>
          <View style={styles.headerBlock}>
            <Text style={styles.headline}>Find your song.</Text>
            <Text style={styles.subtext}>Sing or hum a song</Text>
          </View>

          {/* Centered Hero Mic Button */}
          <View style={styles.heroButtonWrapper}>
            <MicTrigger
              isListening={false}
              onPress={startRecording}
              disabled={false}
              size={110}
            />
            <Text style={styles.tapPrompt}>Tap to listen</Text>
          </View>

          {/* Clean spacer */}
          <View style={styles.bottomSpacer} />
        </View>
      </Animated.View>

      {/* ── LISTENING STATE (Matching Figma Screen 2) ── */}
      <Animated.View
        style={[styles.stateLayer, { opacity: listenFade }]}
        pointerEvents={currentMode === 'listening' ? 'auto' : 'none'}
      >
        <View style={styles.listeningContent}>
          <Text style={styles.listeningHeadline}>Listening.</Text>
          <Text style={styles.listeningSubtext}>Keep playing, singing, or humming...</Text>

          {/* Dynamic Waveform */}
          <View style={styles.liveWaveformWrapper}>
            <WaveformVisualizer
              isListening={currentMode === 'listening'}
              barCount={30}
              height={72}
              color={THEME.colors.ink}
            />
          </View>

          {/* Simple human cancel button */}
          <TouchableOpacity
            style={styles.cancelLink}
            onPress={handleCancelListening}
            activeOpacity={0.65}
            hitSlop={{ top: 16, bottom: 16, left: 24, right: 24 }}
          >
            <View style={styles.cancelDot} />
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ── ANALYZING STATE ── */}
      <Animated.View
        style={[styles.stateLayer, { opacity: analyzeFade }]}
        pointerEvents={currentMode === 'analyzing' ? 'auto' : 'none'}
      >
        <View style={styles.analyzingContent}>
          {/* Two concentric hairline rings rotating at different speeds */}
          <View style={styles.ringsWrapper}>
            <Animated.View style={[
              styles.ringOuter,
              { transform: [{ rotate: arcAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }
            ]} />
            <Animated.View style={[
              styles.ringInner,
              { transform: [{ rotate: arcAnim.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] }) }] }
            ]} />
            <View style={styles.ringDot} />
          </View>

          <Text style={styles.analyzingHeadline}>Searching...</Text>
          <Text style={styles.analyzingSub}>Listening for a match</Text>
        </View>
      </Animated.View>

      {/* ── RESULT STATE (Matching Figma Screen 3) ── */}
      <Animated.View
        style={[styles.stateLayer, styles.resultLayer, { opacity: resultFade }]}
        pointerEvents={currentMode === 'result' ? 'auto' : 'none'}
      >
        {result && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.resultScrollContent}
            bounces
          >
            <ResultCard result={result} onDismiss={handleDismissResult} />

            <View style={styles.resultActions}>
              <TouchableOpacity
                style={styles.searchAgainBtn}
                onPress={handleDismissResult}
                activeOpacity={0.75}
              >
                <Text style={styles.searchAgainText}>Find another song</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: THEME.colors.cream,
  },
  stateLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  resultLayer: {
    justifyContent: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 16,
  },

  // Idle
  idleContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 24,
    flex: 1,
  },
  headerBlock: {
    alignItems: 'center',
    marginTop: 24,
  },
  headline: {
    fontSize: 40,
    fontWeight: '700',
    color: THEME.colors.ink,
    letterSpacing: -1.2,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtext: {
    fontSize: 15,
    color: THEME.colors.muted,
    textAlign: 'center',
  },
  heroButtonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tapPrompt: {
    fontSize: 13,
    color: THEME.colors.muted,
    marginTop: 18,
    letterSpacing: 0.4,
    fontWeight: '400',
  },
  bottomSpacer: {
    height: 40,
  },

  // Listening
  listeningContent: {
    width: '100%',
    alignItems: 'center',
  },
  listeningHeadline: {
    fontSize: 36,
    fontWeight: '700',
    color: THEME.colors.ink,
    letterSpacing: -1,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    fontStyle: 'italic',
    marginBottom: 6,
  },
  listeningSubtext: {
    fontSize: 15,
    color: THEME.colors.muted,
    marginBottom: 44,
  },
  liveWaveformWrapper: {
    width: '100%',
    marginBottom: 44,
  },
  cancelLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  cancelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.muted,
  },
  cancelText: {
    fontSize: 14,
    color: THEME.colors.muted,
    fontWeight: '500',
  },

  // Analyzing
  analyzingContent: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  ringsWrapper: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  ringOuter: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: THEME.colors.ink,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
  },
  ringInner: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  ringDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.colors.ink,
  },
  analyzingHeadline: {
    fontSize: 22,
    fontWeight: '600',
    color: THEME.colors.ink,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 6,
  },
  analyzingSub: {
    fontSize: 14,
    color: THEME.colors.muted,
    textAlign: 'center',
  },

  // Result
  resultScrollContent: {
    paddingBottom: 24,
  },
  resultActions: {
    marginTop: 18,
    alignItems: 'center',
  },
  searchAgainBtn: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.white,
  },
  searchAgainText: {
    fontSize: 14,
    color: THEME.colors.inkSoft,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
});
