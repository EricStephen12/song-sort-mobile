import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

interface MicTriggerProps {
  isListening: boolean;
  onPress: () => void;
  disabled?: boolean;
  size?: number;
}

export const MicTrigger: React.FC<MicTriggerProps> = ({
  isListening,
  onPress,
  disabled = false,
  size = 110,
}) => {
  const scalePress = useRef(new Animated.Value(1)).current;

  // Idle organic breathing animation
  const breathAnim = useRef(new Animated.Value(0)).current;
  const breathLoop = useRef<Animated.CompositeAnimation | null>(null);

  // Active listening pulse animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0)).current;
  const listenLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isListening) {
      // Stop idle breathing
      breathLoop.current?.stop();
      breathAnim.setValue(0);

      // Start active listening waves
      listenLoop.current = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.6,
              duration: 1300,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, { toValue: 1, duration: 0, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(pulseOpacity, {
              toValue: 0.16,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(pulseOpacity, {
              toValue: 0,
              duration: 1100,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
        ])
      );
      listenLoop.current.start();
    } else {
      // Stop active pulse
      listenLoop.current?.stop();
      pulseOpacity.setValue(0);
      pulseAnim.setValue(1);

      // Start calm resting breath (4.4s full cycle matching calm human respiration)
      breathLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(breathAnim, {
            toValue: 1,
            duration: 2200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(breathAnim, {
            toValue: 0,
            duration: 2200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
      breathLoop.current.start();
    }

    return () => {
      breathLoop.current?.stop();
      listenLoop.current?.stop();
    };
  }, [isListening]);

  const handlePressIn = () => {
    Animated.spring(scalePress, {
      toValue: 0.92,
      friction: 6,
      tension: 300,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scalePress, {
      toValue: 1,
      friction: 5,
      tension: 200,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    try {
      Haptics.impactAsync(
        isListening
          ? Haptics.ImpactFeedbackStyle.Light
          : Haptics.ImpactFeedbackStyle.Medium
      );
    } catch { /* optional */ }
    onPress();
  };

  // Idle breath interpolations
  const idleHaloScale1 = breathAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1.02, 1.22],
  });
  const idleHaloOpacity1 = breathAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.05, 0.14],
  });

  const idleHaloScale2 = breathAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1.1, 1.42],
  });
  const idleHaloOpacity2 = breathAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.0, 0.07],
  });

  const idleButtonSubtleScale = breathAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.99, 1.015],
  });

  const buttonBg = isListening ? '#1C1C1E' : '#121110';
  const iconColor = '#FFFFFF';

  return (
    <View style={[styles.wrapper, { width: size + 60, height: size + 60 }]}>
      {/* ── Idle Breathing Outer Halo ── */}
      {!isListening && (
        <>
          <Animated.View
            style={[
              styles.haloRing,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                opacity: idleHaloOpacity2,
                transform: [{ scale: idleHaloScale2 }],
                backgroundColor: '#121110',
              },
            ]}
          />
          <Animated.View
            style={[
              styles.haloRing,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                opacity: idleHaloOpacity1,
                transform: [{ scale: idleHaloScale1 }],
                backgroundColor: '#121110',
              },
            ]}
          />
        </>
      )}

      {/* ── Active Listening Pulse Wave ── */}
      {isListening && (
        <Animated.View
          style={[
            styles.haloRing,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              opacity: pulseOpacity,
              transform: [{ scale: pulseAnim }],
              backgroundColor: '#121110',
            },
          ]}
        />
      )}

      {/* ── Physical Button with Tactile Press & Idle Life ── */}
      <Animated.View
        style={{
          transform: [
            { scale: isListening ? scalePress : Animated.multiply(scalePress, idleButtonSubtleScale) },
          ],
        }}
      >
        <TouchableOpacity
          activeOpacity={1}
          disabled={disabled}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handlePress}
          style={[
            styles.button,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: buttonBg,
              opacity: disabled ? 0.4 : 1,
            },
          ]}
        >
          <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"
              fill={iconColor}
            />
            <Path
              d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"
              fill={iconColor}
            />
          </Svg>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  haloRing: {
    position: 'absolute',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 8,
  },
});
