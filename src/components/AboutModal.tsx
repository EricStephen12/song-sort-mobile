import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { THEME } from '../config';
import { AuthUser } from '../services/auth';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AboutModalProps {
  visible: boolean;
  onClose: () => void;
  currentUser?: AuthUser | null;
  onSignOut?: () => void;
}

type ModalSection = 'about' | 'legal' | 'privacy';

export const AboutModal: React.FC<AboutModalProps> = ({
  visible,
  onClose,
  currentUser,
  onSignOut,
}) => {
  const [activeSection, setActiveSection] = useState<ModalSection>('about');
  const sheetAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

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
          duration: 240,
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

  const handleDismiss = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    Animated.parallel([
      Animated.timing(sheetAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  const handleSelectSection = (section: ModalSection) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setActiveSection(section);
  };

  if (!visible) return null;

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

        {/* Sliding Bottom Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY: sheetAnim }] },
          ]}
        >
          {/* Pill handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Top Bar */}
          <View style={styles.topHeader}>
            <View style={styles.brandRow}>
              {/* Mini Tilted Hat S Monogram */}
              <View style={styles.miniLogoBox}>
                <Svg width={22} height={22} viewBox="0 0 150 150">
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
              <View>
                <Text style={styles.sheetTitle}>Song Sort</Text>
                <Text style={styles.sheetSubtitle}>LOVEWORLD SONG IDENTIFIER</Text>
                <Text style={styles.hubBadge}>A PRODUCT OF LMAM REHEARSAL HUB</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={handleDismiss}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={THEME.colors.ink} strokeWidth={2}>
                <Path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </TouchableOpacity>
          </View>

          {/* User Profile Card (if authenticated) */}
          {currentUser && (
            <View style={styles.userCard}>
              <View style={styles.userAvatar}>
                <Text style={styles.userInitial}>
                  {(currentUser.name || currentUser.email || 'U')[0].toUpperCase()}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName} numberOfLines={1}>
                  {currentUser.name || 'Loveworld Member'}
                </Text>
                <Text style={styles.userEmail} numberOfLines={1}>
                  {currentUser.email}
                </Text>
              </View>
              {onSignOut && (
                <TouchableOpacity
                  style={styles.signOutBtn}
                  onPress={() => {
                    handleDismiss();
                    onSignOut();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Section Selector Pills */}
          <View style={styles.sectionTabs}>
            <TouchableOpacity
              style={[styles.sectionTab, activeSection === 'about' && styles.sectionTabActive]}
              onPress={() => handleSelectSection('about')}
              activeOpacity={0.7}
            >
              <Text style={[styles.sectionTabText, activeSection === 'about' && styles.sectionTabTextActive]}>
                About
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sectionTab, activeSection === 'legal' && styles.sectionTabActive]}
              onPress={() => handleSelectSection('legal')}
              activeOpacity={0.7}
            >
              <Text style={[styles.sectionTabText, activeSection === 'legal' && styles.sectionTabTextActive]}>
                Legal & Rights
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sectionTab, activeSection === 'privacy' && styles.sectionTabActive]}
              onPress={() => handleSelectSection('privacy')}
              activeOpacity={0.7}
            >
              <Text style={[styles.sectionTabText, activeSection === 'privacy' && styles.sectionTabTextActive]}>
                Privacy
              </Text>
            </TouchableOpacity>
          </View>

          {/* Scrollable Content */}
          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {activeSection === 'about' && (
              <View style={styles.sectionBody}>
                <Text style={styles.heading}>The Definitive Song Identifier</Text>
                <Text style={styles.paragraph}>
                  A product of <Text style={styles.boldText}>LMAM Rehearsal Hub</Text>, Song Sort is designed for the <Text style={styles.boldText}>Loveworld Kingdom</Text>, empowering worship leaders, choir ministers, and believers to instantly recognize, discover, and play beloved ministry songs.
                </Text>

                <View style={styles.featureBox}>
                  <Text style={styles.featureTitle}>Key Capabilities</Text>
                  <Text style={styles.featureText}>
                    • <Text style={styles.boldText}>Instant Audio Recognition:</Text> Effortlessly identify Loveworld songs playing in services, meetings, and rehearsals.
                  </Text>
                  <Text style={styles.featureText}>
                    • <Text style={styles.boldText}>Hum & Melody Finder:</Text> Sing, hum, or whistle any tune to quickly discover the song on your heart.
                  </Text>
                  <Text style={styles.featureText}>
                    • <Text style={styles.boldText}>Living Turntable Player:</Text> Collector's edition vinyl turntable experience with real-time audio playback.
                  </Text>
                  <Text style={styles.featureText}>
                    • <Text style={styles.boldText}>Curated Song Catalog:</Text> Search, preview, and revisit your discovery history anytime.
                  </Text>
                </View>
              </View>
            )}

            {activeSection === 'legal' && (
              <View style={styles.sectionBody}>
                <Text style={styles.heading}>Copyright & Attribution</Text>
                <Text style={styles.paragraph}>
                  All song titles, lyrics, sound recordings, and compositions remain the exclusive copyright property of the <Text style={styles.boldText}>Loveworld Music and Arts Ministry (LMAM)</Text>, Loveworld Records, and their respective music ministers and copyright owners.
                </Text>

                <Text style={styles.subheading}>LMAM Rehearsal Hub</Text>
                <Text style={styles.paragraph}>
                  Song Sort is developed and maintained by the LMAM Rehearsal Hub, dedicated to advancing worship excellence across the Loveworld Kingdom worldwide.
                </Text>

                <Text style={styles.subheading}>Audio Samples</Text>
                <Text style={styles.paragraph}>
                  Audio catalog excerpts and streams are provided for recognition, rehearsal reference, and ministry worship.
                </Text>
              </View>
            )}

            {activeSection === 'privacy' && (
              <View style={styles.sectionBody}>
                <Text style={styles.heading}>Privacy & Data Protection</Text>
                <Text style={styles.paragraph}>
                  We respect the privacy of every member. Song Sort does not track your location, sell your information, or record private ambient speech.
                </Text>

                <View style={styles.privacyBullet}>
                  <Text style={styles.bulletTitle}>Microphone Access</Text>
                  <Text style={styles.bulletDesc}>
                    Audio is listened to only when you actively identify a song, processed temporarily in memory, and immediately discarded. No audio is ever recorded or saved.
                  </Text>
                </View>

                <View style={styles.privacyBullet}>
                  <Text style={styles.bulletTitle}>Account Security</Text>
                  <Text style={styles.bulletDesc}>
                    Your member credentials and personal details are encrypted and kept strictly confidential.
                  </Text>
                </View>

                <View style={styles.privacyBullet}>
                  <Text style={styles.bulletTitle}>Discovery History</Text>
                  <Text style={styles.bulletDesc}>
                    Your identified songs are saved privately on your device. You can view or clear your history at any time.
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.footerBrand}>
              <Text style={styles.footerHubText}>A PRODUCT OF LMAM REHEARSAL HUB</Text>
              <Text style={styles.footerCopy}>© 2026 Loveworld Kingdom. All Rights Reserved.</Text>
            </View>
          </ScrollView>
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
    backgroundColor: 'rgba(18, 17, 16, 0.5)',
  },
  sheet: {
    backgroundColor: THEME.colors.cream,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: SCREEN_HEIGHT * 0.88,
    paddingTop: 12,
    paddingBottom: Platform.select({ ios: 38, android: 24, default: 24 }),
    borderWidth: 1,
    borderColor: THEME.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 24,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 6,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.colors.subtle,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: THEME.colors.borderLight,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniLogoBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: THEME.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.ink,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    fontStyle: 'italic',
  },
  sheetSubtitle: {
    fontSize: 9.5,
    fontWeight: '700',
    color: THEME.colors.muted,
    letterSpacing: 1.5,
    marginTop: 1,
  },
  hubBadge: {
    fontSize: 8.5,
    fontWeight: '700',
    color: THEME.colors.bronze,
    letterSpacing: 1.0,
    marginTop: 3,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(18, 17, 16, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.white,
    marginHorizontal: 20,
    marginTop: 14,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userInitial: {
    color: THEME.colors.cream,
    fontSize: 16,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
    paddingRight: 8,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.ink,
  },
  userEmail: {
    fontSize: 12,
    color: THEME.colors.muted,
    marginTop: 1,
  },
  signOutBtn: {
    backgroundColor: 'rgba(18, 17, 16, 0.06)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  signOutText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.ink,
  },
  sectionTabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 8,
  },
  sectionTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(18, 17, 16, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTabActive: {
    backgroundColor: THEME.colors.ink,
  },
  sectionTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.muted,
  },
  sectionTabTextActive: {
    color: THEME.colors.white,
  },
  contentScroll: {
    maxHeight: SCREEN_HEIGHT * 0.58,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 28,
  },
  sectionBody: {
    paddingTop: 4,
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.ink,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    fontStyle: 'italic',
    marginBottom: 8,
  },
  subheading: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.ink,
    marginTop: 14,
    marginBottom: 4,
  },
  paragraph: {
    fontSize: 13,
    lineHeight: 20,
    color: '#44413E',
    marginBottom: 10,
  },
  boldText: {
    fontWeight: '700',
    color: THEME.colors.ink,
  },
  featureBox: {
    backgroundColor: THEME.colors.white,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    marginTop: 6,
    marginBottom: 14,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.ink,
    marginBottom: 6,
  },
  featureText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#44413E',
    marginBottom: 6,
  },
  privacyBullet: {
    backgroundColor: THEME.colors.white,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    marginBottom: 10,
  },
  bulletTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.ink,
    marginBottom: 3,
  },
  bulletDesc: {
    fontSize: 12,
    lineHeight: 18,
    color: '#44413E',
  },
  footerBrand: {
    alignItems: 'center',
    paddingTop: 18,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: THEME.colors.borderLight,
    marginTop: 14,
  },
  footerHubText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.bronze,
    letterSpacing: 1.4,
  },
  footerCopy: {
    fontSize: 11,
    color: THEME.colors.subtle,
    marginTop: 4,
  },
});
