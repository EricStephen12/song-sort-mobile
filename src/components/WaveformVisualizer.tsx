import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';

interface WaveformVisualizerProps {
  isListening: boolean;
  barCount?: number;
  color?: string;
  height?: number;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  isListening,
  barCount = 30,
  color = '#121110',
  height = 54,
}) => {
  const bars = useRef<Animated.Value[]>(
    Array.from({ length: barCount }, () => new Animated.Value(0.12))
  ).current;

  const animationsRef = useRef<Animated.CompositeAnimation[]>([]);

  useEffect(() => {
    // Stop any existing animations
    animationsRef.current.forEach((a) => a.stop());
    animationsRef.current = [];

    if (isListening) {
      bars.forEach((bar, i) => {
        // Natural sine curve envelope (peaks in middle, tapers smoothly at sides)
        const envelope = Math.sin((Math.PI * (i + 1)) / (barCount + 1));
        const minHeight = 0.12;
        const targetPeak = Math.max(0.2, minHeight + envelope * 0.85);

        const duration = 400 + Math.random() * 300;
        const delay = (i / barCount) * 450 + Math.random() * 120;

        const anim = Animated.loop(
          Animated.sequence([
            Animated.delay(delay % 250),
            Animated.timing(bar, {
              toValue: targetPeak,
              duration,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(bar, {
              toValue: minHeight + envelope * 0.25,
              duration,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ])
        );
        anim.start();
        animationsRef.current.push(anim);
      });
    } else {
      // Return gracefully to subtle resting curve
      bars.forEach((bar, i) => {
        const envelope = Math.sin((Math.PI * (i + 1)) / (barCount + 1));
        const anim = Animated.spring(bar, {
          toValue: 0.08 + envelope * 0.12,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        });
        anim.start();
        animationsRef.current.push(anim);
      });
    }

    return () => {
      animationsRef.current.forEach((a) => a.stop());
    };
  }, [isListening, barCount]);

  return (
    <View style={[styles.container, { height }]}>
      {bars.map((bar, i) => {
        const scaleY = bar.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 1],
        });
        return (
          <Animated.View
            key={i}
            style={[
              styles.bar,
              {
                height,
                backgroundColor: color,
                opacity: isListening ? 0.9 : 0.25,
                transform: [{ scaleY }],
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3.5,
    width: '100%',
  },
  bar: {
    width: 2.8,
    borderRadius: 2,
  },
});
