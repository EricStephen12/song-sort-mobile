import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { THEME } from '../config';

export type NavTab = 'find' | 'history' | 'library';

interface BottomNavBarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  paddingBottom: number;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onSelectTab,
  paddingBottom,
}) => {
  const handlePress = (tab: NavTab) => {
    if (tab === activeTab) return;
    try {
      Haptics.selectionAsync();
    } catch { /* optional */ }
    onSelectTab(tab);
  };

  const tabs: Array<{ id: NavTab; label: string }> = [
    { id: 'find', label: 'Find' },
    { id: 'history', label: 'History' },
    { id: 'library', label: 'Library' },
  ];

  return (
    <View style={[styles.container, { paddingBottom: Math.max(paddingBottom, 12) }]}>
      <View style={styles.tabRow}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const color = isActive ? THEME.colors.ink : THEME.colors.muted;

          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabItem}
              onPress={() => handlePress(tab.id)}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
            >
              {tab.id === 'find' && (
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={isActive ? 2.2 : 1.7}>
                  <Circle cx="12" cy="12" r="8" />
                  <Circle cx="12" cy="12" r="3" fill={isActive ? color : 'none'} />
                  <Path d="M12 2v2M12 20v2M2 12h2M20 12h2" strokeLinecap="round" />
                </Svg>
              )}

              {tab.id === 'history' && (
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={isActive ? 2.2 : 1.7}>
                  <Circle cx="12" cy="12" r="9" />
                  <Path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              )}

              {tab.id === 'library' && (
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={isActive ? 2.2 : 1.7}>
                  <Path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" />
                  <Path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" strokeLinecap="round" strokeLinejoin="round" />
                  <Path d="M9 7h7M9 11h5" strokeLinecap="round" />
                </Svg>
              )}

              <Text
                style={[
                  styles.tabLabel,
                  {
                    color,
                    fontWeight: isActive ? '600' : '400',
                    fontFamily: Platform.select({ ios: 'System', default: 'sans-serif' }),
                  },
                ]}
              >
                {tab.label}
              </Text>

              {isActive ? <View style={styles.activeDot} /> : <View style={styles.dotPlaceholder} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: THEME.colors.cream,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: THEME.colors.border,
    paddingTop: 10,
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    minWidth: 70,
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: 0.3,
    marginTop: 4,
    marginBottom: 4,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.colors.ink,
  },
  dotPlaceholder: {
    width: 4,
    height: 4,
  },
});
