import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppBackground } from '@/components/servpro/AppBackground';
import { AppTheme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import type { UserType } from '@/services/authService';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const [type, setType] = useState<UserType>('CLIENT');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');

    if (password !== confirmPassword) {
      setError(t('auth.errors.passwordMismatch'));
      return;
    }

    if (password.length < 6) {
      setError(t('auth.errors.passwordLength'));
      return;
    }

    setLoading(true);
    try {
      await register({ type, name, email, phone, password });
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.errors.register'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppBackground>
      <View style={styles.wrapper}>
        <View style={styles.card}>
          <Text style={styles.title}>{t('auth.registerTitle')}</Text>
          <Text style={styles.subtitle}>{t('auth.subtitle', { defaultValue: t('hero.subtitle') })}</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.typeRow}>
            <Pressable
              onPress={() => setType('CLIENT')}
              style={[styles.typeBtn, type === 'CLIENT' && styles.typeBtnActive]}>
              <Text style={[styles.typeText, type === 'CLIENT' && styles.typeTextActive]}>{t('auth.client')}</Text>
            </Pressable>
            <Pressable
              onPress={() => setType('PROVIDER')}
              style={[styles.typeBtn, type === 'PROVIDER' && styles.typeBtnActive]}>
              <Text style={[styles.typeText, type === 'PROVIDER' && styles.typeTextActive]}>{t('auth.provider')}</Text>
            </Pressable>
          </View>

          <TextInput style={styles.input} placeholder={t('auth.name')} placeholderTextColor="#94a3b8" value={name} onChangeText={setName} />
          <TextInput
            style={styles.input}
            placeholder={t('auth.email')}
            placeholderTextColor="#94a3b8"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput style={styles.input} placeholder={t('auth.phone')} placeholderTextColor="#94a3b8" value={phone} onChangeText={setPhone} />
          <TextInput
            style={styles.input}
            placeholder={t('auth.password')}
            placeholderTextColor="#94a3b8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            placeholder={t('auth.confirmPassword')}
            placeholderTextColor="#94a3b8"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          <Pressable style={styles.button} onPress={handleSubmit} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? t('auth.registerLoading') : t('auth.registerButton')}</Text>
          </Pressable>

          <Text style={styles.footerText}>
            {t('auth.haveAccount')} <Link href={'/auth/login' as never} style={styles.link}>{t('auth.loginLink')}</Link>
          </Text>
        </View>
      </View>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  card: {
    borderRadius: AppTheme.radius.xl,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 18,
    ...AppTheme.shadow.card,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: AppTheme.colors.text,
  },
  subtitle: {
    marginTop: 6,
    color: AppTheme.colors.mutedText,
  },
  error: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    color: '#b91c1c',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontWeight: '600',
  },
  typeRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  typeBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
  },
  typeBtnActive: {
    borderColor: '#0f172a',
    backgroundColor: '#0f172a',
  },
  typeText: {
    color: '#475569',
    fontWeight: '700',
  },
  typeTextActive: {
    color: '#ffffff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 12,
    color: AppTheme.colors.text,
    marginTop: 10,
    backgroundColor: '#f8fafc',
    fontWeight: '600',
  },
  button: {
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  footerText: {
    marginTop: 12,
    color: AppTheme.colors.mutedText,
    textAlign: 'center',
  },
  link: {
    color: AppTheme.colors.secondary,
    fontWeight: '800',
  },
});
