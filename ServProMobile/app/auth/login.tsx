import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppBackground } from '@/components/servpro/AppBackground';
import { AppTheme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.errors.login'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppBackground>
      <View style={styles.wrapper}>
        <View style={styles.card}>
          <Text style={styles.title}>{t('auth.loginTitle')}</Text>
          <Text style={styles.subtitle}>{t('auth.subtitle', { defaultValue: t('hero.subtitle') })}</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TextInput
            style={styles.input}
            placeholder={t('auth.email')}
            placeholderTextColor="#94a3b8"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder={t('auth.password')}
            placeholderTextColor="#94a3b8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Pressable style={styles.button} onPress={handleSubmit} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? t('auth.loginLoading') : t('auth.loginButton')}</Text>
          </Pressable>

          <Text style={styles.footerText}>
            {t('auth.noAccount')} <Link href={'/auth/register' as never} style={styles.link}>{t('auth.signupLink')}</Link>
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
    fontSize: 30,
    fontWeight: '900',
    color: AppTheme.colors.text,
  },
  subtitle: {
    marginTop: 6,
    color: AppTheme.colors.mutedText,
  },
  error: {
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    color: '#b91c1c',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    height: 46,
    paddingHorizontal: 12,
    color: AppTheme.colors.text,
    marginTop: 12,
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
    color: AppTheme.colors.primary,
    fontWeight: '800',
  },
});
