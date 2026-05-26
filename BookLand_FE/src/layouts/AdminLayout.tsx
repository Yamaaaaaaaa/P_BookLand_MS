import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { logoutAdmin, getAdminRefreshToken } from '../utils/auth';
import authService from '../api/authService';
import { LayoutDashboard, Users, CreditCard, Truck, Calendar, Book, Layers, Hash, LogOut, Receipt, ImageIcon, MessageCircle, Shield, ChevronDown, Mail } from 'lucide-react';
import '../styles/layouts/admin.css';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';

const AdminLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t, i18n } = useTranslation();
    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
        setIsLangMenuOpen(false);
    };

    const handleLogout = async () => {
        const refreshToken = getAdminRefreshToken();
        if (refreshToken) {
            try {
                await authService.logout({ token: refreshToken });
            } catch (error) {
                console.error("Logout failed", error);
            }
        }
        logoutAdmin();
        navigate('/admin/login');
    };

    const isActive = (path: string) => location.pathname.includes(path);

    return (
        <div className="admin-layout">
            <aside className="admin-sidebar">
                <div className="admin-sidebar-header">
                    <div className="admin-logo">{t('admin.title')}</div>
                </div>

                <nav className="admin-nav">
                    <div className="admin-nav-group">
                        <div className="admin-nav-title">{t('admin.overview')}</div>
                        <Link to="/admin/dashboard" className={`admin-nav-item ${isActive('/dashboard') ? 'active' : ''}`}>
                            <LayoutDashboard /> {t('admin.dashboard')}
                        </Link>
                    </div>

                    <div className="admin-nav-group">
                        <div className="admin-nav-title">{t('admin.business')}</div>
                        <Link to="/admin/manage-business/bills" className={`admin-nav-item ${isActive('/bills') ? 'active' : ''}`}>
                            <Receipt /> {t('admin.orders')}
                        </Link>
                        <Link to="/admin/manage-business/payment-method" className={`admin-nav-item ${isActive('/payment-method') ? 'active' : ''}`}>
                            <CreditCard /> {t('admin.payment_methods')}
                        </Link>
                        <Link to="/admin/manage-business/shipping-method" className={`admin-nav-item ${isActive('/shipping-method') ? 'active' : ''}`}>
                            <Truck /> {t('admin.shipping_methods')}
                        </Link>
                        <Link to="/admin/manage-business/event" className={`admin-nav-item ${isActive('/event') ? 'active' : ''}`}>
                            <Calendar /> {t('admin.events')}
                        </Link>
                    </div>

                    <div className="admin-nav-group">
                        <div className="admin-nav-title">{t('admin.catalog')}</div>
                        <Link to="/admin/manage-information/book" className={`admin-nav-item ${isActive('/book') ? 'active' : ''}`}>
                            <Book /> {t('admin.books')}
                        </Link>
                        <Link to="/admin/manage-information/category" className={`admin-nav-item ${isActive('/category') ? 'active' : ''}`}>
                            <Layers /> {t('admin.categories')}
                        </Link>
                        <Link to="/admin/manage-information/author" className={`admin-nav-item ${isActive('/author') ? 'active' : ''}`}>
                            <Users /> {t('admin.authors')}
                        </Link>
                        <Link to="/admin/manage-information/serie" className={`admin-nav-item ${isActive('/serie') ? 'active' : ''}`}>
                            <Hash /> {t('admin.series')}
                        </Link>
                    </div>

                    <div className="admin-nav-group">
                        <div className="admin-nav-title">{t('admin.users')}</div>
                        <Link to="/admin/manage-user" className={`admin-nav-item ${isActive('/manage-user') ? 'active' : ''}`}>
                            <Users /> {t('admin.user_management')}
                        </Link>
                        <Link to="/admin/manage-role" className={`admin-nav-item ${isActive('/manage-role') ? 'active' : ''}`}>
                            <Shield /> {t('admin.role_management')}
                        </Link>
                    </div>

                    <div className="admin-nav-group">
                        <div className="admin-nav-title">{t('admin.communication')}</div>
                        <Link to="/admin/chat" className={`admin-nav-item ${isActive('/chat') ? 'active' : ''}`}>
                            <MessageCircle /> {t('admin.chat.title')}
                        </Link>
                        <Link to="/admin/send-email" className={`admin-nav-item ${isActive('/send-email') ? 'active' : ''}`}>
                            <Mail /> Gửi Email
                        </Link>
                    </div>

                    <div className="admin-nav-group">
                        <div className="admin-nav-title">{t('admin.gallery')}</div>
                        <Link to="/admin/gallery" className={`admin-nav-item ${isActive('/gallery') ? 'active' : ''}`}>
                            <ImageIcon /> {t('admin.gallery_menu')}
                        </Link>
                    </div>
                </nav>

                <div className="admin-footer">
                    <div className="admin-lang-switcher" style={{ marginBottom: '10px', padding: '0 20px' }}>
                        <div
                            className="admin-lang-btn"
                            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                cursor: 'pointer',
                                padding: '8px',
                                borderRadius: '6px',
                                border: '1px solid var(--shop-border)',
                                backgroundColor: 'var(--shop-bg-secondary)',
                                color: 'var(--shop-text-primary)'
                            }}
                        >
                            <span style={{ fontSize: '18px' }}>{i18n.language === 'en' ? '🇬🇧' : '🇻🇳'}</span>
                            <span style={{ fontWeight: 500 }}>{i18n.language === 'en' ? 'English' : 'Tiếng Việt'}</span>
                            <ChevronDown size={14} style={{ marginLeft: 'auto', color: 'var(--shop-text-muted)' }} />
                        </div>
                        {isLangMenuOpen && (
                            <div className="admin-lang-dropdown" style={{
                                position: 'absolute',
                                bottom: '60px',
                                left: '20px',
                                width: '220px',
                                backgroundColor: 'var(--shop-bg-card)',
                                borderRadius: '8px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                border: '1px solid var(--shop-border)',
                                overflow: 'hidden',
                                zIndex: 1000
                            }}>
                                <div
                                    onClick={() => changeLanguage('vi')}
                                    style={{
                                        padding: '10px 15px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        cursor: 'pointer',
                                        color: 'var(--shop-text-primary)',
                                        backgroundColor: i18n.language === 'vi' ? 'var(--shop-bg-secondary)' : 'transparent'
                                    }}
                                >
                                    <span style={{ fontSize: '18px' }}>🇻🇳</span> Tiếng Việt
                                </div>
                                <div
                                    onClick={() => changeLanguage('en')}
                                    style={{
                                        padding: '10px 15px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        cursor: 'pointer',
                                        color: 'var(--shop-text-primary)',
                                        backgroundColor: i18n.language === 'en' ? 'var(--shop-bg-secondary)' : 'transparent'
                                    }}
                                >
                                    <span style={{ fontSize: '18px' }}>🇬🇧</span> English
                                </div>
                            </div>
                        )}
                    </div>
                    <button onClick={handleLogout} className="admin-logout-btn">
                        <LogOut size={18} /> {t('admin.logout')}
                    </button>
                </div>
            </aside>

            <main className="admin-main">
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;
