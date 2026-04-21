import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    type: 'CLIENT',
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError(t('auth.errors.passwordMismatch'));
      return;
    }

    if (formData.password.length < 6) {
      setError(t('auth.errors.passwordLength'));
      return;
    }

    setLoading(true);

    try {
      const registrationData = { ...formData };
      delete registrationData.confirmPassword;
      await register({
        ...registrationData,
        passwordHash: registrationData.password,
      });
      navigate('/');
    } catch (err) {
      setError(err.message || t('auth.errors.register'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/90 p-6 shadow-2xl shadow-slate-900/10 backdrop-blur sm:p-8">
        <div className="absolute -left-16 -top-16 h-44 w-44 rounded-full bg-orange-200/50 blur-3xl" />
        <div className="relative z-10">
          <div className="mb-8 text-center">
            <h2 className="display-title text-3xl font-extrabold text-slate-900">{t('auth.registerTitle')}</h2>
            <p className="mt-2 text-sm text-slate-600">{t('auth.subtitle')}</p>
          </div>

          {error && <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}

          <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="type" className="text-sm font-semibold text-slate-700">{t('auth.accountType')}</label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
              >
                <option value="CLIENT">{t('auth.client')}</option>
                <option value="PROVIDER">{t('auth.provider')}</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-semibold text-slate-700">{t('auth.name')}</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder={t('auth.namePlaceholder')}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-semibold text-slate-700">{t('auth.email')}</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder={t('auth.emailPlaceholder')}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-semibold text-slate-700">{t('auth.phone')}</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder={t('auth.phonePlaceholder')}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-semibold text-slate-700">{t('auth.password')}</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-semibold text-slate-700">{t('auth.confirmPassword')}</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
              />
            </div>

            <button type="submit" className="sm:col-span-2 mt-2 w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60" disabled={loading}>
              {loading ? t('auth.registerLoading') : t('auth.registerButton')}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600">
            <p>
              {t('auth.haveAccount')}{' '}
              <Link to="/login" className="font-bold text-orange-700 hover:text-orange-600">{t('auth.loginLink')}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
