import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  RadialGradient,
  Circle,
  G,
} from 'react-native-svg';
import { THEME } from '../config';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface SplashScreenProps {
  onFinish?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  // Animation drivers
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(-6)).current;

  // Sound Waves (3 ripples above S: do... do... do...)
  const wave1Scale = useRef(new Animated.Value(0.5)).current;
  const wave1Opacity = useRef(new Animated.Value(0)).current;

  const wave2Scale = useRef(new Animated.Value(0.5)).current;
  const wave2Opacity = useRef(new Animated.Value(0)).current;

  const wave3Scale = useRef(new Animated.Value(0.5)).current;
  const wave3Opacity = useRef(new Animated.Value(0)).current;

  // Title fade and reveal
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(12)).current;

  // Background glow pulse
  const glowScale = useRef(new Animated.Value(0.85)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Logo Spring Entrance
    Animated.parallel([
      Animated.timing(glowOpacity, {
        toValue: 0.7,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(glowScale, {
        toValue: 1.15,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 550,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 5,
        tension: 42,
        useNativeDriver: true,
      }),
      Animated.spring(logoRotate, {
        toValue: 0,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Sequential Wave Ripples (do... do... do...)
    const waveDelay = 350;

    // Wave 1 (inner)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(wave1Opacity, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.spring(wave1Scale, {
          toValue: 1,
          friction: 4,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start();
    }, waveDelay);

    // Wave 2 (middle)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(wave2Opacity, {
          toValue: 0.9,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.spring(wave2Scale, {
          toValue: 1,
          friction: 4,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start();
    }, waveDelay + 180);

    // Wave 3 (outer)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(wave3Opacity, {
          toValue: 0.8,
          duration: 380,
          useNativeDriver: true,
        }),
        Animated.spring(wave3Scale, {
          toValue: 1,
          friction: 4,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start();
    }, waveDelay + 360);

    // 3. Text Reveal
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 550,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 550,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    }, 750);

    // 4. Trigger Finish Callback
    const timer = setTimeout(() => {
      onFinish?.();
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const logoTransform = [
    { scale: logoScale },
    {
      rotate: logoRotate.interpolate({
        inputRange: [-6, 0],
        outputRange: ['-6deg', '0deg'],
      }),
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Ambient Warm Golden Glow */}
      <Animated.View
        style={[
          styles.ambientGlow,
          {
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          },
        ]}
      >
        <Svg width={360} height={360} viewBox="0 0 360 360">
          <Defs>
            <RadialGradient id="luxAmbient" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#DFC38E" stopOpacity={0.45} />
              <Stop offset="50%" stopColor="#EADECB" stopOpacity={0.2} />
              <Stop offset="100%" stopColor={THEME.colors.cream} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={180} cy={180} r={180} fill="url(#luxAmbient)" />
        </Svg>
      </Animated.View>

      {/* Center Logo Group */}
      <View style={styles.logoCenterGroup}>
        {/* Modern S Monogram with Right-Tilted Hat Sound Waves */}
        <Animated.View
          style={[
            styles.monogramWrapper,
            {
              opacity: logoOpacity,
              transform: logoTransform,
            },
          ]}
        >
          <Svg width={150} height={150} viewBox="0 0 150 150">
            <Defs>
              <LinearGradient id="hatWaveGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#FCE1A2" />
                <Stop offset="50%" stopColor="#C59B27" />
                <Stop offset="100%" stopColor="#9E6E1D" />
              </LinearGradient>
            </Defs>

            {/* Clean, Bold, Luxurious 'S' with Rightward Dynamic Tilt */}
            <Path
              d="M 90 56 C 90 40 76 34 62 34 C 44 34 34 45 34 60 C 34 84 96 80 96 108 C 96 124 82 134 64 134 C 48 134 34 122 34 106"
              stroke={THEME.colors.ink}
              strokeWidth={11}
              strokeLinecap="round"
              fill="none"
              transform="skewX(-8) translate(12, 0)"
            />

            {/* Acoustic Waves Tilted to the Right Like a Hat (perched at x=88, y=36, rotated 28 deg) */}
            <G transform="translate(86, 38) rotate(28)">
              {/* Wave 3 (Outer Arc) */}
              <AnimatedPath
                d="M -30 -26 C -12 -46 26 -46 44 -26"
                stroke={THEME.colors.bronze}
                strokeWidth={3}
                strokeLinecap="round"
                fill="none"
                opacity={wave3Opacity}
              />

              {/* Wave 2 (Middle Arc) */}
              <AnimatedPath
                d="M -22 -18 C -8 -34 20 -34 34 -18"
                stroke="url(#hatWaveGold)"
                strokeWidth={3.8}
                strokeLinecap="round"
                fill="none"
                opacity={wave2Opacity}
              />

              {/* Wave 1 (Inner Arc) */}
              <AnimatedPath
                d="M -14 -10 C -4 -22 14 -22 24 -10"
                stroke={THEME.colors.ink}
                strokeWidth={4.6}
                strokeLinecap="round"
                fill="none"
                opacity={wave1Opacity}
              />
            </G>
          </Svg>
        </Animated.View>

        {/* Clean Brand Title */}
        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }],
            },
          ]}
        >
          <Text style={styles.brandTitle}>Song Sort</Text>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ambientGlow: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCenterGroup: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wavesContainer: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: -6,
  },
  waveLayer: {
    position: 'absolute',
    bottom: 0,
    alignItems: 'center',
  },
  monogramWrapper: {
    width: 140,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 18,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: THEME.colors.ink,
    letterSpacing: -0.5,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    fontStyle: 'italic',
  },
});
