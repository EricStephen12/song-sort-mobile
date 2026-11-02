import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Svg, {
  Path,
  Circle,
  Ellipse,
  G,
  Rect,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import { THEME } from '../config';

interface MascotProps {
  focusedField: 'none' | 'name' | 'email' | 'password';
  emailLength?: number;
  isPasswordVisible?: boolean;
}

export const MascotCharacter: React.FC<MascotProps> = ({
  focusedField,
  emailLength = 0,
  isPasswordVisible = false,
}) => {
  // Animated values
  const eyeX = useRef(new Animated.Value(0)).current;
  const eyeY = useRef(new Animated.Value(0)).current;
  const handsY = useRef(new Animated.Value(60)).current; // 60 = down at rest, 0 = covering eyes
  const rightHandPeek = useRef(new Animated.Value(0)).current; // 0 = covering, 1 = peek
  const blinkAnim = useRef(new Animated.Value(1)).current; // 1 = open, 0.1 = closed
  const headBob = useRef(new Animated.Value(0)).current;

  // Gentle head bobbing loop
  useEffect(() => {
    const bob = Animated.loop(
      Animated.sequence([
        Animated.timing(headBob, {
          toValue: -3,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(headBob, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    bob.start();
    return () => bob.stop();
  }, [headBob]);

  // Periodic natural blinking
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const triggerBlink = () => {
      if (focusedField !== 'password') {
        Animated.sequence([
          Animated.timing(blinkAnim, {
            toValue: 0.1,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.timing(blinkAnim, {
            toValue: 1,
            duration: 120,
            useNativeDriver: true,
          }),
        ]).start();
      }
      const nextTime = Math.random() * 3000 + 2500;
      timeout = setTimeout(triggerBlink, nextTime);
    };

    timeout = setTimeout(triggerBlink, 2000);
    return () => clearTimeout(timeout);
  }, [focusedField, blinkAnim]);

  // Handle eye and hand movements based on user interaction
  useEffect(() => {
    if (focusedField === 'email') {
      // Calculate pupil horizontal shift based on email text length (range -5 to +5)
      const clampedLen = Math.min(Math.max(emailLength, 0), 30);
      const targetX = -5 + (clampedLen / 30) * 10;

      Animated.parallel([
        Animated.timing(eyeX, {
          toValue: targetX,
          duration: 120,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(eyeY, {
          toValue: 6, // Looking down at the email input
          duration: 200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(handsY, {
          toValue: 60, // Hands at rest
          friction: 7,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(rightHandPeek, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (focusedField === 'name') {
      Animated.parallel([
        Animated.timing(eyeX, {
          toValue: -3,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(eyeY, {
          toValue: 5,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(handsY, {
          toValue: 60,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(rightHandPeek, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (focusedField === 'password') {
      // Hands raise up to cover eyes
      Animated.parallel([
        Animated.spring(handsY, {
          toValue: 0, // Covering eyes
          friction: 6,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(rightHandPeek, {
          toValue: isPasswordVisible ? 1 : 0,
          duration: 200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(eyeX, {
          toValue: isPasswordVisible ? 3 : 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(eyeY, {
          toValue: isPasswordVisible ? 4 : 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Idle state
      Animated.parallel([
        Animated.timing(eyeX, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(eyeY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(handsY, {
          toValue: 60,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(rightHandPeek, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [focusedField, emailLength, isPasswordVisible]);

  // Derived transforms
  const leftHandTransform = [{ translateY: handsY }];
  const rightHandTransform = [
    { translateY: handsY },
    {
      translateY: rightHandPeek.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 18], // Peek down
      }),
    },
    {
      rotate: rightHandPeek.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '25deg'],
      }),
    },
  ];

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Rock / Podium base where the character perches */}
      <View style={styles.podium}>
        <Svg width={180} height={28} viewBox="0 0 180 28">
          <Defs>
            <LinearGradient id="rockGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#EADECB" />
              <Stop offset="100%" stopColor="#D9C9B2" />
            </LinearGradient>
          </Defs>
          <Path
            d="M 12 28 Q 20 8 45 4 Q 90 2 135 4 Q 160 8 168 28 Z"
            fill="url(#rockGrad)"
          />
          {/* Subtle ledge shadow */}
          <Path
            d="M 16 28 Q 90 14 164 28"
            stroke="rgba(18, 17, 16, 0.08)"
            strokeWidth={1.5}
            fill="none"
          />
        </Svg>
      </View>

      {/* Animated Character Body + Head */}
      <Animated.View
        style={[
          styles.characterWrapper,
          { transform: [{ translateY: headBob }] },
        ]}
      >
        <Svg width={140} height={130} viewBox="0 0 140 130">
          <Defs>
            {/* Skin Tone Gradient */}
            <LinearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#FFF7EC" />
              <Stop offset="100%" stopColor="#F7E6CE" />
            </LinearGradient>
            {/* Headphones Gold Gradient */}
            <LinearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#E2BA69" />
              <Stop offset="100%" stopColor="#B68735" />
            </LinearGradient>
          </Defs>

          {/* Headphone Arch over head */}
          <Path
            d="M 28 62 C 28 26 112 26 112 62"
            stroke="#121110"
            strokeWidth={6}
            fill="none"
            strokeLinecap="round"
          />
          <Path
            d="M 32 60 C 32 30 108 30 108 60"
            stroke="url(#goldGrad)"
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
          />

          {/* Torso / Sitting Body */}
          <Path
            d="M 46 104 C 42 120 30 128 24 128 L 116 128 C 110 128 98 120 94 104 Z"
            fill="#121110"
          />
          {/* Sweater Collar */}
          <Path
            d="M 52 104 Q 70 114 88 104"
            stroke="url(#goldGrad)"
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
          />

          {/* Head */}
          <Ellipse
            cx={70}
            cy={64}
            rx={38}
            ry={36}
            fill="url(#skinGrad)"
            stroke="#121110"
            strokeWidth={3.5}
          />

          {/* Hair / Stylish Quiff */}
          <Path
            d="M 40 46 C 46 28 68 28 80 32 C 92 28 102 34 104 46 C 96 38 78 38 68 42 C 58 40 48 42 40 46 Z"
            fill="#121110"
          />

          {/* Soft Cheeks */}
          <Circle cx={44} cy={74} r={6} fill="rgba(224, 122, 95, 0.35)" />
          <Circle cx={96} cy={74} r={6} fill="rgba(224, 122, 95, 0.35)" />

          {/* Cute Nose */}
          <Circle cx={70} cy={66} r={2.5} fill="#D4A373" />

          {/* Gentle Smile */}
          <Path
            d="M 64 76 Q 70 82 76 76"
            stroke="#121110"
            strokeWidth={2.5}
            strokeLinecap="round"
            fill="none"
          />

          {/* Headphone Ear Cushions */}
          <Rect
            x={22}
            y={50}
            width={12}
            height={28}
            rx={6}
            fill="url(#goldGrad)"
            stroke="#121110"
            strokeWidth={3}
          />
          <Rect
            x={106}
            y={50}
            width={12}
            height={28}
            rx={6}
            fill="url(#goldGrad)"
            stroke="#121110"
            strokeWidth={3}
          />
        </Svg>

        {/* Eyes Layer (with animated eye balls and pupils) */}
        <Animated.View
          style={[
            styles.eyesContainer,
            { transform: [{ scaleY: blinkAnim }] },
          ]}
        >
          {/* Left Eye White */}
          <View style={[styles.eyeSocket, { left: 47 }]}>
            <Animated.View
              style={[
                styles.pupil,
                { transform: [{ translateX: eyeX }, { translateY: eyeY }] },
              ]}
            >
              {/* Eye Catchlight (glossy shine) */}
              <View style={styles.catchlight} />
            </Animated.View>
          </View>

          {/* Right Eye White */}
          <View style={[styles.eyeSocket, { left: 77 }]}>
            <Animated.View
              style={[
                styles.pupil,
                { transform: [{ translateX: eyeX }, { translateY: eyeY }] },
              ]}
            >
              <View style={styles.catchlight} />
            </Animated.View>
          </View>
        </Animated.View>

        {/* Hands Layer (Raises over eyes on password) */}
        {/* Left Hand */}
        <Animated.View
          style={[
            styles.handWrapper,
            { left: 32, top: 48 },
            { transform: leftHandTransform },
          ]}
        >
          <Svg width={36} height={36} viewBox="0 0 36 36">
            <Defs>
              <LinearGradient id="handGradL" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#FFF7EC" />
                <Stop offset="100%" stopColor="#F7E6CE" />
              </LinearGradient>
            </Defs>
            <Ellipse
              cx={18}
              cy={18}
              rx={14}
              ry={11}
              fill="url(#handGradL)"
              stroke="#121110"
              strokeWidth={3}
              transform="rotate(-15 18 18)"
            />
            {/* Finger grooves */}
            <Path d="M 12 11 L 12 24" stroke="#121110" strokeWidth={1.5} strokeLinecap="round" opacity={0.6} />
            <Path d="M 18 10 L 18 25" stroke="#121110" strokeWidth={1.5} strokeLinecap="round" opacity={0.6} />
            <Path d="M 24 12 L 24 24" stroke="#121110" strokeWidth={1.5} strokeLinecap="round" opacity={0.6} />
          </Svg>
        </Animated.View>

        {/* Right Hand */}
        <Animated.View
          style={[
            styles.handWrapper,
            { left: 72, top: 48 },
            { transform: rightHandTransform },
          ]}
        >
          <Svg width={36} height={36} viewBox="0 0 36 36">
            <Defs>
              <LinearGradient id="handGradR" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#FFF7EC" />
                <Stop offset="100%" stopColor="#F7E6CE" />
              </LinearGradient>
            </Defs>
            <Ellipse
              cx={18}
              cy={18}
              rx={14}
              ry={11}
              fill="url(#handGradR)"
              stroke="#121110"
              strokeWidth={3}
              transform="rotate(15 18 18)"
            />
            {/* Finger grooves */}
            <Path d="M 12 12 L 12 24" stroke="#121110" strokeWidth={1.5} strokeLinecap="round" opacity={0.6} />
            <Path d="M 18 10 L 18 25" stroke="#121110" strokeWidth={1.5} strokeLinecap="round" opacity={0.6} />
            <Path d="M 24 11 L 24 24" stroke="#121110" strokeWidth={1.5} strokeLinecap="round" opacity={0.6} />
          </Svg>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 140,
    width: '100%',
    marginBottom: -16, // Snuggle onto card top
    zIndex: 10,
  },
  podium: {
    position: 'absolute',
    bottom: 0,
    alignItems: 'center',
  },
  characterWrapper: {
    width: 140,
    height: 130,
    position: 'relative',
  },
  eyesContainer: {
    position: 'absolute',
    top: 52,
    left: 0,
    width: 140,
    height: 20,
    flexDirection: 'row',
  },
  eyeSocket: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#121110',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pupil: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#121110',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    padding: 1,
  },
  catchlight: {
    width: 2.5,
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: '#FFFFFF',
  },
  handWrapper: {
    position: 'absolute',
    width: 36,
    height: 36,
    zIndex: 20,
  },
});
