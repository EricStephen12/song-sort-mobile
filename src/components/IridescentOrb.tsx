import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, TouchableOpacity } from 'react-native';
import Svg, {
  Defs,
  RadialGradient,
  LinearGradient,
  Stop,
  Circle,
  Ellipse,
  Path,
  G,
} from 'react-native-svg';

interface IridescentOrbProps {
  isListening: boolean;
  onPress?: () => void;
  size?: number;
}

export const IridescentOrb: React.FC<IridescentOrbProps> = ({
  isListening,
  onPress,
  size = 250,
}) => {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Subtle floating breathing animation
  useEffect(() => {
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -9,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 4,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    floatLoop.start();
    return () => floatLoop.stop();
  }, [floatAnim]);

  // Dynamic listening pulse & glow animation
  useEffect(() => {
    if (isListening) {
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.07,
            duration: 800,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.98,
            duration: 800,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();
      return () => pulseLoop.stop();
    } else {
      Animated.spring(pulseAnim, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }).start();
    }
  }, [isListening, pulseAnim]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          transform: [
            { translateY: floatAnim },
            { scale: pulseAnim },
          ],
        },
      ]}
    >
      <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.touchable}>
        {/* Soft Ambient Caustic Halo behind sphere */}
        <View
          style={[
            styles.ambientGlow,
            {
              width: size + 50,
              height: size + 50,
              borderRadius: (size + 50) / 2,
              backgroundColor: isListening
                ? 'rgba(180, 215, 255, 0.45)'
                : 'rgba(230, 220, 250, 0.35)',
            },
          ]}
        />

        {/* Photorealistic 3D Liquid Glass Optical Sphere */}
        <Svg width={size} height={size} viewBox="0 0 250 250">
          <Defs>
            {/* Core glass volume gradient */}
            <RadialGradient
              id="coreGlassGrad"
              cx="40%"
              cy="32%"
              rx="60%"
              ry="60%"
              fx="40%"
              fy="32%"
            >
              <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <Stop offset="26%" stopColor="#f4f7fe" stopOpacity="0.65" />
              <Stop offset="50%" stopColor="#e3ecfa" stopOpacity="0.35" />
              <Stop offset="76%" stopColor="#cfe0f6" stopOpacity="0.2" />
              <Stop offset="100%" stopColor="#ffffff" stopOpacity="0.6" />
            </RadialGradient>

            {/* Rainbow Prismatic Edge Dispersion */}
            <LinearGradient id="rainbowPrismGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#ffb3c6" stopOpacity="0.65" />
              <Stop offset="25%" stopColor="#ffe4a0" stopOpacity="0.6" />
              <Stop offset="50%" stopColor="#bbf2f6" stopOpacity="0.75" />
              <Stop offset="75%" stopColor="#b4c7ff" stopOpacity="0.7" />
              <Stop offset="100%" stopColor="#e5b8ff" stopOpacity="0.65" />
            </LinearGradient>

            {/* Specular White Top Reflection Glare */}
            <LinearGradient id="topReflectionGrad" x1="50%" y1="0%" x2="50%" y2="100%">
              <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.98" />
              <Stop offset="35%" stopColor="#ffffff" stopOpacity="0.75" />
              <Stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
            </LinearGradient>

            {/* Bottom Caustic Pool */}
            <RadialGradient
              id="bottomCausticGrad"
              cx="50%"
              cy="50%"
              rx="50%"
              ry="50%"
            >
              <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <Stop offset="45%" stopColor="#cde4ff" stopOpacity="0.8" />
              <Stop offset="75%" stopColor="#f5d5ec" stopOpacity="0.45" />
              <Stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
            </RadialGradient>

            {/* Internal Caustic Wave */}
            <RadialGradient
              id="internalCausticGrad"
              cx="50%"
              cy="60%"
              rx="50%"
              ry="40%"
            >
              <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
              <Stop offset="40%" stopColor="#d2e8ff" stopOpacity="0.4" />
              <Stop offset="70%" stopColor="#fbe5ed" stopOpacity="0.2" />
              <Stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
            </RadialGradient>

            {/* Bottom Arc Reflection */}
            <LinearGradient id="bottomArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.0" />
              <Stop offset="50%" stopColor="#ffffff" stopOpacity="0.98" />
              <Stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
            </LinearGradient>
          </Defs>

          {/* Base Orb Body */}
          <Circle
            cx="125"
            cy="125"
            r="123"
            fill="url(#coreGlassGrad)"
            stroke="#ffffff"
            strokeWidth="1.5"
          />

          {/* Internal Caustic Prismatic Wave */}
          <G transform="rotate(-14 125 125)">
            <Ellipse
              cx="120"
              cy="135"
              rx="95"
              ry="55"
              fill="url(#internalCausticGrad)"
            />
          </G>

          {/* Top-Left Rainbow Prismatic Edge Arc */}
          <G transform="rotate(-8 125 125)">
            <Path
              d="M 40 45 C 70 20, 160 20, 205 50 C 185 85, 80 85, 40 45 Z"
              fill="url(#rainbowPrismGrad)"
            />
          </G>

          {/* Primary Sharp Specular Glare (Top) */}
          <G transform="rotate(-8 125 125)">
            <Path
              d="M 50 35 C 75 18, 150 18, 185 40 C 165 72, 75 70, 50 35 Z"
              fill="url(#topReflectionGrad)"
            />
          </G>

          {/* Secondary Pin-point Glare Sparkles */}
          <Ellipse
            cx="180"
            cy="52"
            rx="9"
            ry="5.5"
            transform="rotate(25 180 52)"
            fill="#ffffff"
            opacity={0.95}
          />
          <Circle cx="192" cy="72" r="3.2" fill="#ffffff" opacity={0.95} />

          {/* Bottom Prismatic Fresnel Caustic Pool */}
          <Ellipse
            cx="125"
            cy="212"
            rx="68"
            ry="24"
            fill="url(#bottomCausticGrad)"
          />

          {/* Razor-thin Bottom Specular Arc */}
          <Path
            d="M 68 226 C 95 234, 155 234, 182 226 C 160 229, 90 229, 68 226 Z"
            fill="url(#bottomArcGrad)"
          />
        </Svg>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#a0b4d2',
    shadowOffset: { width: 0, height: 26 },
    shadowOpacity: 0.38,
    shadowRadius: 28,
    elevation: 14,
  },
  touchable: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ambientGlow: {
    position: 'absolute',
    opacity: 0.8,
  },
});
