import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { MascotCharacter } from '../components/MascotCharacter';
import { AboutModal } from '../components/AboutModal';
import { apiSignIn, apiSignUp, apiResetPassword, AuthUser } from '../services/auth';
import { THEME } from '../config';

interface AuthScreenProps {
  onAuthSuccess: (user: AuthUser) => void;
}

type AuthView = 'signin' | 'signup' | 'forgot';

// Maps raw API/network errors to user-friendly messages
function friendlyError(err: any): string {
  const msg: string = (err?.message || '').toLowerCase();
  // HTML response — server unreachable or ngrok warning page
  if (msg.includes('could not reach') || msg.includes('unexpected response')) {
    return err.message;
  }
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch') || msg.includes('timeout')) {
    return 'No internet connection. Please check your network and try again.';
  }
  if (msg.includes('already exists') || msg.includes('email taken')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (msg.includes('invalid email or password') || msg.includes('wrong password') || msg.includes('incorrect')) {
    return 'Incorrect email or password. Please try again.';
  }
  if (msg.includes('no account found') || msg.includes('not found')) {
    return 'No account found with that email. Check the email or create a new account.';
  }
  if (msg.includes('password') && (msg.includes('4') || msg.includes('characters'))) {
    return 'Password must be at least 4 characters.';
  }
  if (msg.includes('server') || msg.includes('500') || msg.includes('503')) {
    return 'The server is temporarily unavailable. Please try again in a moment.';
  }
  // Fall through — show the raw message from the server, it's already human-readable
  return err?.message || 'Something went wrong. Please try again.';
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<AuthView>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotNewPasswordConfirm, setForgotNewPasswordConfirm] = useState('');
  const [forgotPasswordVisible, setForgotPasswordVisible] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [focusedField, setFocusedField] = useState<'none' | 'name' | 'email' | 'password' | 'forgotEmail' | 'forgotPw' | 'forgotPwConfirm'>('none');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const [forgotDone, setForgotDone] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  // Shake animation for error feedback
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -4, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleSubmit = async () => {
    setErrorMessage(null);
    setFieldErrors({});

    const emailTrim = email.trim();
    const errors: { name?: string; email?: string; password?: string } = {};

    if (mode === 'signup' && !name.trim()) {
      errors.name = 'Please enter your full name.';
    }
    if (!emailTrim || !emailTrim.includes('@')) {
      errors.email = 'Please enter a valid email address.';
    }
    if (!password || password.length < 4) {
      errors.password = 'Password must be at least 4 characters.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      triggerShake();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      let session;
      if (mode === 'signup') {
        session = await apiSignUp(name.trim(), emailTrim, password);
      } else {
        session = await apiSignIn(emailTrim, password);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onAuthSuccess(session.user);
    } catch (err: any) {
      console.warn('[AuthScreen] Submit error:', err);
      const msg = friendlyError(err);
      setErrorMessage(msg);
      triggerShake();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = async () => {
    setErrorMessage(null);
    const emailTrim = forgotEmail.trim();

    if (!emailTrim || !emailTrim.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      triggerShake();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    if (!forgotNewPassword || forgotNewPassword.length < 4) {
      setErrorMessage('New password must be at least 4 characters.');
      triggerShake();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    if (forgotNewPassword !== forgotNewPasswordConfirm) {
      setErrorMessage('Passwords do not match.');
      triggerShake();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await apiResetPassword(emailTrim, forgotNewPassword);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setForgotDone(true);
    } catch (err: any) {
      setErrorMessage(friendlyError(err));
      triggerShake();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (newMode: AuthView) => {
    if (newMode === mode) return;
    Haptics.selectionAsync();
    setMode(newMode);
    setErrorMessage(null);
    setFieldErrors({});
    setForgotDone(false);
    setForgotEmail('');
    setForgotNewPassword('');
    setForgotNewPasswordConfirm('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Header */}
        <View style={styles.header}>
          <Text style={styles.brandTitle}>Song Sort</Text>
          <Text style={styles.brandSubtitle}>LOVEWORLD SONG IDENTIFIER</Text>
          <Text style={styles.hubSubtitle}>A PRODUCT OF LMAM REHEARSAL HUB</Text>
        </View>

        {/* Mascot Perched on Top of Card */}
        {mode !== 'forgot' && (
          <MascotCharacter
            focusedField={(['none', 'name', 'email', 'password'].includes(focusedField) ? focusedField : 'none') as 'none' | 'name' | 'email' | 'password'}
            emailLength={email.length}
            isPasswordVisible={isPasswordVisible}
          />
        )}

        {/* ── FORGOT PASSWORD VIEW ── */}
        {mode === 'forgot' ? (
          <Animated.View style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}>
            <TouchableOpacity
              onPress={() => switchMode('signin')}
              style={styles.backRow}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={THEME.colors.muted} strokeWidth={2}>
                <Path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={styles.backText}>Back to Sign In</Text>
            </TouchableOpacity>

            <Text style={styles.forgotTitle}>Reset Password</Text>
            <Text style={styles.forgotSub}>
              Enter your email and choose a new password.
            </Text>

            {forgotDone ? (
              <View style={styles.forgotSentBox}>
                <Text style={styles.forgotSentTitle}>Password updated.</Text>
                <Text style={styles.forgotSentText}>
                  You can now sign in with your new password.
                </Text>
                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={() => switchMode('signin')}
                  activeOpacity={0.88}
                >
                  <Text style={styles.submitBtnText}>Sign In</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.fieldsContainer}>
                {/* Email */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
                  <TextInput
                    style={[styles.input, focusedField === 'forgotEmail' && styles.inputFocused]}
                    placeholder="name@example.com"
                    placeholderTextColor={THEME.colors.muted}
                    value={forgotEmail}
                    onChangeText={setForgotEmail}
                    onFocus={() => setFocusedField('forgotEmail')}
                    onBlur={() => setFocusedField('none')}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                {/* New Password */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>NEW PASSWORD</Text>
                  <View style={[styles.passwordContainer, focusedField === 'forgotPw' && styles.inputFocused]}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Min. 4 characters"
                      placeholderTextColor={THEME.colors.muted}
                      value={forgotNewPassword}
                      onChangeText={setForgotNewPassword}
                      onFocus={() => setFocusedField('forgotPw')}
                      onBlur={() => setFocusedField('none')}
                      secureTextEntry={!forgotPasswordVisible}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      style={styles.eyeBtn}
                      onPress={() => { Haptics.selectionAsync(); setForgotPasswordVisible(p => !p); }}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={THEME.colors.ink} strokeWidth={2}>
                        {forgotPasswordVisible ? (
                          <>
                            <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round" />
                            <Path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" strokeLinecap="round" strokeLinejoin="round" />
                          </>
                        ) : (
                          <>
                            <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" strokeLinecap="round" strokeLinejoin="round" />
                            <Path d="M1 1l22 22" strokeLinecap="round" strokeLinejoin="round" />
                          </>
                        )}
                      </Svg>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Confirm New Password */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>CONFIRM NEW PASSWORD</Text>
                  <TextInput
                    style={[
                      styles.input,
                      focusedField === 'forgotPwConfirm' && styles.inputFocused,
                      forgotNewPasswordConfirm.length > 0 && forgotNewPassword !== forgotNewPasswordConfirm && styles.inputError,
                    ]}
                    placeholder="Re-enter new password"
                    placeholderTextColor={THEME.colors.muted}
                    value={forgotNewPasswordConfirm}
                    onChangeText={setForgotNewPasswordConfirm}
                    onFocus={() => setFocusedField('forgotPwConfirm')}
                    onBlur={() => setFocusedField('none')}
                    secureTextEntry={!forgotPasswordVisible}
                    autoCapitalize="none"
                  />
                  {forgotNewPasswordConfirm.length > 0 && forgotNewPassword !== forgotNewPasswordConfirm && (
                    <Text style={styles.fieldErrorText}>Passwords do not match.</Text>
                  )}
                </View>

                {errorMessage && (
                  <View style={styles.errorBox}>
                    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#EB5757" strokeWidth={2} style={{ marginRight: 8 }}>
                      <Path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinejoin="round" />
                      <Path d="M12 9v4M12 17h.01" strokeLinecap="round" />
                    </Svg>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
                  onPress={handleForgotSubmit}
                  disabled={isLoading}
                  activeOpacity={0.88}
                >
                  {isLoading ? (
                    <ActivityIndicator color={THEME.colors.white} size="small" />
                  ) : (
                    <Text style={styles.submitBtnText}>Reset Password</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        ) : (
          /* ── SIGN IN / SIGN UP VIEW ── */
          <Animated.View style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}>
            {/* Segmented Mode Selector */}
            <View style={styles.segmentContainer}>
              <TouchableOpacity
                style={[styles.segmentTab, mode === 'signin' && styles.segmentTabActive]}
                onPress={() => switchMode('signin')}
                activeOpacity={0.8}
              >
                <Text style={[styles.segmentText, mode === 'signin' && styles.segmentTextActive]}>
                  Sign In
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.segmentTab, mode === 'signup' && styles.segmentTabActive]}
                onPress={() => switchMode('signup')}
                activeOpacity={0.8}
              >
                <Text style={[styles.segmentText, mode === 'signup' && styles.segmentTextActive]}>
                  Create Account
                </Text>
              </TouchableOpacity>
            </View>

            {/* Form Fields */}
            <View style={styles.fieldsContainer}>
              {/* Full Name (Sign Up only) */}
              {mode === 'signup' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>FULL NAME</Text>
                  <TextInput
                    style={[
                      styles.input,
                      focusedField === 'name' && styles.inputFocused,
                      fieldErrors.name && styles.inputError,
                    ]}
                    placeholder="e.g. Sarah Jenkins"
                    placeholderTextColor={THEME.colors.muted}
                    value={name}
                    onChangeText={(t) => { setName(t); setFieldErrors(p => ({ ...p, name: undefined })); }}
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField('none')}
                    autoCapitalize="words"
                  />
                  {fieldErrors.name && <Text style={styles.fieldErrorText}>{fieldErrors.name}</Text>}
                </View>
              )}

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
                <TextInput
                  style={[
                    styles.input,
                    focusedField === 'email' && styles.inputFocused,
                    fieldErrors.email && styles.inputError,
                  ]}
                  placeholder="name@example.com"
                  placeholderTextColor={THEME.colors.muted}
                  value={email}
                  onChangeText={(t) => { setEmail(t); setFieldErrors(p => ({ ...p, email: undefined })); }}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField('none')}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {fieldErrors.email && <Text style={styles.fieldErrorText}>{fieldErrors.email}</Text>}
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>PASSWORD</Text>
                <View style={[
                  styles.passwordContainer,
                  focusedField === 'password' && styles.inputFocused,
                  fieldErrors.password && styles.inputError,
                ]}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="••••••••"
                    placeholderTextColor={THEME.colors.muted}
                    value={password}
                    onChangeText={(t) => { setPassword(t); setFieldErrors(p => ({ ...p, password: undefined })); }}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField('none')}
                    secureTextEntry={!isPasswordVisible}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => { Haptics.selectionAsync(); setIsPasswordVisible(prev => !prev); }}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={THEME.colors.ink} strokeWidth={2}>
                      {isPasswordVisible ? (
                        <>
                          <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round" />
                          <Path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" strokeLinecap="round" strokeLinejoin="round" />
                        </>
                      ) : (
                        <>
                          <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" strokeLinecap="round" strokeLinejoin="round" />
                          <Path d="M1 1l22 22" strokeLinecap="round" strokeLinejoin="round" />
                        </>
                      )}
                    </Svg>
                  </TouchableOpacity>
                </View>
                {fieldErrors.password && <Text style={styles.fieldErrorText}>{fieldErrors.password}</Text>}
              </View>

              {/* Forgot Password link — only on sign in */}
              {mode === 'signin' && (
                <TouchableOpacity
                  style={styles.forgotLink}
                  onPress={() => switchMode('forgot')}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.forgotLinkText}>Forgot password?</Text>
                </TouchableOpacity>
              )}

              {/* Global Error (network / server errors) */}
              {errorMessage && (
                <View style={styles.errorBox}>
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#EB5757" strokeWidth={2} style={{ marginRight: 8 }}>
                    <Path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinejoin="round" />
                    <Path d="M12 9v4M12 17h.01" strokeLinecap="round" />
                  </Svg>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              {/* Submit */}
              <TouchableOpacity
                style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={isLoading}
                activeOpacity={0.88}
              >
                {isLoading ? (
                  <ActivityIndicator color={THEME.colors.white} size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    {mode === 'signin' ? 'Sign In' : 'Create Account'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* Footer */}
        <View style={styles.footerNote}>
          <Text style={styles.footerNoteText}>
            Exclusive Access to Loveworld Kingdom Song Library
          </Text>
          <TouchableOpacity
            style={styles.aboutLinkBtn}
            onPress={() => { try { Haptics.selectionAsync(); } catch {} setIsAboutOpen(true); }}
            activeOpacity={0.7}
          >
            <Text style={styles.aboutLinkText}>About & Legal • LMAM Rehearsal Hub</Text>
          </TouchableOpacity>
        </View>

        <AboutModal visible={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: THEME.colors.cream,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
  header: {
    alignItems: 'center',
    marginBottom: 12,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: THEME.colors.ink,
    letterSpacing: 4,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.bronze,
    letterSpacing: 3,
    marginTop: 4,
  },
  hubSubtitle: {
    fontSize: 8.5,
    fontWeight: '700',
    color: THEME.colors.muted,
    letterSpacing: 1.5,
    marginTop: 3,
  },
  card: {
    backgroundColor: THEME.colors.cardBg,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(18, 17, 16, 0.08)',
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 4,
    zIndex: 1,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(18, 17, 16, 0.04)',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  segmentTabActive: {
    backgroundColor: THEME.colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.muted,
  },
  segmentTextActive: {
    color: THEME.colors.ink,
    fontWeight: '700',
  },
  fieldsContainer: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.muted,
    letterSpacing: 1.2,
  },
  input: {
    height: 48,
    borderRadius: 12,
    backgroundColor: THEME.colors.cream,
    borderWidth: 1,
    borderColor: 'rgba(18, 17, 16, 0.1)',
    paddingHorizontal: 14,
    fontSize: 14,
    color: THEME.colors.ink,
  },
  inputFocused: {
    borderColor: THEME.colors.ink,
    borderWidth: 1.5,
  },
  passwordContainer: {
    height: 48,
    borderRadius: 12,
    backgroundColor: THEME.colors.cream,
    borderWidth: 1,
    borderColor: 'rgba(18, 17, 16, 0.1)',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: THEME.colors.ink,
  },
  eyeBtn: {
    padding: 6,
  },
  errorBox: {
    backgroundColor: 'rgba(235, 87, 87, 0.08)',
    borderLeftWidth: 3,
    borderLeftColor: '#EB5757',
    padding: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 12,
    color: '#EB5757',
    fontWeight: '500',
    flex: 1,
  },
  fieldErrorText: {
    fontSize: 11,
    color: '#EB5757',
    fontWeight: '500',
    marginTop: 4,
    marginLeft: 2,
  },
  inputError: {
    borderColor: '#EB5757',
    borderWidth: 1.5,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    paddingVertical: 2,
  },
  forgotLinkText: {
    fontSize: 12,
    color: THEME.colors.muted,
    fontWeight: '500',
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  backText: {
    fontSize: 13,
    color: THEME.colors.muted,
    fontWeight: '500',
  },
  forgotTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.colors.ink,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    fontStyle: 'italic',
    marginBottom: 6,
  },
  forgotSub: {
    fontSize: 13,
    color: THEME.colors.muted,
    marginBottom: 22,
    lineHeight: 19,
  },
  forgotSentBox: {
    gap: 12,
  },
  forgotSentTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.ink,
  },
  forgotSentText: {
    fontSize: 13,
    color: THEME.colors.muted,
    lineHeight: 20,
  },
  forgotSentEmail: {
    color: THEME.colors.ink,
    fontWeight: '600',
  },
  submitBtn: {
    height: 50,
    backgroundColor: THEME.colors.ink,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: THEME.colors.white,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footerNote: {
    marginTop: 20,
    alignItems: 'center',
  },
  footerNoteText: {
    fontSize: 11,
    color: THEME.colors.muted,
    fontWeight: '500',
    textAlign: 'center',
  },
  aboutLinkBtn: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  aboutLinkText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: THEME.colors.ink,
    letterSpacing: 0.3,
    textDecorationLine: 'underline',
  },
});
