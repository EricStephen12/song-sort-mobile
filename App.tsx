import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, G } from 'react-native-svg';

import { BottomNavBar, NavTab } from './src/components/BottomNavBar';
import { FindScreen } from './src/screens/FindScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { SplashScreen } from './src/components/SplashScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { AboutModal } from './src/components/AboutModal';
import { getStoredSession, clearSession, AuthUser } from './src/services/auth';
import { THEME } from './src/config';

function AppContent() {
  const insets = useSafeAreaInsets();
  const [isSplashActive, setIsSplashActive] = useState(true);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [activeTab, setActiveTab] = useState<NavTab>('find');
  const [activePlayingUrl, setActivePlayingUrl] = useState<string | null>(null);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  // Check stored session in background on launch
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const session = await getStoredSession();
        if (isMounted && session?.user) {
          setCurrentUser(session.user);
        }
      } catch (err) {
        console.warn('[App] Session check error:', err);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleTabChange = (tab: NavTab) => {
    setActiveTab(tab);
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      `Sign out of ${currentUser?.name || 'account'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await clearSession();
            setCurrentUser(null);
          },
        },
      ]
    );
  };

  // 1. Splash Screen active on first launch
  if (isSplashActive) {
    return <SplashScreen onFinish={() => setIsSplashActive(false)} />;
  }

  // 2. Auth Gate: Must sign in or create account if not authenticated
  if (!currentUser) {
    return <AuthScreen onAuthSuccess={(user) => setCurrentUser(user)} />;
  }

  // 3. Main Authenticated App
  const userInitial = (currentUser.name || currentUser.email || 'U')[0].toUpperCase();

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Top Wordmark Bar */}
        <View style={styles.topBar}>
          {/* Left Mini S Monogram */}
          <View style={styles.miniLogoBox}>
            <Svg width={24} height={24} viewBox="0 0 150 150">
              <Path
                d="M 90 56 C 90 40 76 34 62 34 C 44 34 34 45 34 60 C 34 84 96 80 96 108 C 96 124 82 134 64 134 C 48 134 34 122 34 106"
                stroke={THEME.colors.ink}
                strokeWidth={13}
                strokeLinecap="round"
                fill="none"
                transform="skewX(-8) translate(12, 0)"
              />
              <G transform="translate(86, 38) rotate(28)">
                <Path
                  d="M -22 -18 C -8 -34 20 -34 34 -18"
                  stroke={THEME.colors.bronze}
                  strokeWidth={4.5}
                  strokeLinecap="round"
                  fill="none"
                />
                <Path
                  d="M -14 -10 C -4 -22 14 -22 24 -10"
                  stroke={THEME.colors.ink}
                  strokeWidth={5}
                  strokeLinecap="round"
                  fill="none"
                />
              </G>
            </Svg>
          </View>

          {/* Center Wordmark */}
          <Text style={styles.wordmark}>Song Sort</Text>

          {/* Right Profile Action (Opens About & Account) */}
          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() => setIsAboutOpen(true)}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>{userInitial}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Active Screen */}
        <View style={styles.screenContainer}>
          {activeTab === 'find' && (
            <FindScreen
              onGoToHistory={() => setActiveTab('history')}
              onSetPlayingUrl={setActivePlayingUrl}
            />
          )}

          {activeTab === 'history' && (
            <HistoryScreen
              onGoToFind={() => setActiveTab('find')}
              activePlayingUrl={activePlayingUrl}
              onSetPlayingUrl={setActivePlayingUrl}
            />
          )}

          {activeTab === 'library' && (
            <LibraryScreen
              activePlayingUrl={activePlayingUrl}
              onSetPlayingUrl={setActivePlayingUrl}
            />
          )}
        </View>

        {/* Bottom 3-tab Bar matching Figma */}
        <BottomNavBar
          activeTab={activeTab}
          onSelectTab={handleTabChange}
          paddingBottom={insets.bottom}
        />

        {/* About & Legal Modal */}
        <AboutModal
          visible={isAboutOpen}
          onClose={() => setIsAboutOpen(false)}
          currentUser={currentUser}
          onSignOut={handleSignOut}
        />
      </SafeAreaView>
    </View>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: THEME.colors.cream,
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(18,17,16,0.06)',
  },
  miniLogoBox: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontSize: 21,
    fontWeight: '700',
    color: THEME.colors.ink,
    letterSpacing: -0.5,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    fontStyle: 'italic',
  },
  profileBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: THEME.colors.bronze,
  },
  avatarInitial: {
    color: THEME.colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  screenContainer: {
    flex: 1,
  },
});
