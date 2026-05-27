import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import authService from '../../../api/authService';
import '../../../styles/pages/auth.css';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

const RegisterPage = () => {
    const { t } = useTranslation();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError(t('auth.error_password_match'));
            return;
        }

        try {
            await authService.register({
                username,
                email,
                password
            });
            toast.success(t('auth.toast_register_success'));
            navigate('/shop/login');
        } catch (err) {
            console.error(err);
            setError(t('auth.error_register'));
            toast.error(t('auth.error_register'));
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                {/* Tabs */}
                <div className="auth-tabs">
                    <Link
                        to="/shop/login"
                        className={`auth-tab-item ${location.pathname === '/shop/login' ? 'active' : ''}`}
                    >
                        {t('auth.login_tab')}
                    </Link>
                    <Link
                        to="/shop/register"
                        className={`auth-tab-item ${location.pathname === '/shop/register' ? 'active' : ''}`}
                    >
                        {t('auth.register_tab')}
                    </Link>
                </div>

                {/* Register Form */}
                <div className="auth-form-content">
                    <form onSubmit={handleSubmit} className="auth-form__form">
                        <div className="form-group">
                            <label className="form-group__label">{t('auth.label_username')}</label>
                            <div className="form-group__input-wrapper">
                                <input
                                    type="text"
                                    className="form-group__input"
                                    placeholder={t('auth.placeholder_username')}
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-group__label">{t('auth.label_email')}</label>
                            <div className="form-group__input-wrapper">
                                <input
                                    type="email"
                                    className="form-group__input"
                                    placeholder={t('auth.placeholder_email')}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-group__label">{t('auth.label_password')}</label>
                            <div className="form-group__input-wrapper">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className="form-group__input"
                                    placeholder={t('auth.placeholder_password')}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    className="btn-toggle-password"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? t('auth.hide_password') : t('auth.show_password')}
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-group__label">{t('auth.label_confirm_password')}</label>
                            <div className="form-group__input-wrapper">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    className="form-group__input"
                                    placeholder={t('auth.placeholder_confirm_password')}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    className="btn-toggle-password"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    {showConfirmPassword ? t('auth.hide_password') : t('auth.show_password')}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="auth-form__error">
                                {error}
                            </div>
                        )}

                        <button type="submit" className="btn-auth-submit">
                            {t('auth.register_button')}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
