import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, Bell, User, Menu, X, ChevronDown, LayoutGrid } from 'lucide-react';
import '../styles/components/header.css';
import { categories, userMenuItems, mockUser } from '../../mockNewUI/headerMockData';
import notificationService from '../api/notificationService';
import { getCurrentUserId } from '../utils/auth';
import type { Notification } from '../types/Notification';
import { toast } from 'react-toastify';
import { useWebSocket } from '../context/WebSocketContext';
import { useTranslation } from 'react-i18next';

interface HeaderProps {
    onLogout: () => void;
    cartItemCount?: number;
    isAuthenticated: boolean;
}

const Header = ({ onLogout, cartItemCount = 3, isAuthenticated }: HeaderProps) => {
    const { t, i18n } = useTranslation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);
    const [notificationsList, setNotificationsList] = useState<Notification[]>([]);
    const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
    const navigate = useNavigate();
    const userId = getCurrentUserId();
    const { subscribe, isConnected } = useWebSocket();
    const categoryMenuRef = useRef<HTMLDivElement>(null);
    const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);

    const notificationRef = useRef<HTMLDivElement>(null);
    const userMenuRef = useRef<HTMLDivElement>(null);
    const langMenuRef = useRef<HTMLDivElement>(null);

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
        setIsLangMenuOpen(false);
    };

    // Fetch unread count and set up polling/click logic
    useEffect(() => {
        if (userId && isAuthenticated) {
            fetchUnreadCount();
        }
    }, [userId, isAuthenticated]);

    const isNotificationOpenRef = useRef(isNotificationOpen);

    useEffect(() => {
        isNotificationOpenRef.current = isNotificationOpen;
    }, [isNotificationOpen]);

    // WebSocket subscription for real-time notifications
    useEffect(() => {
        if (isConnected && userId && isAuthenticated) {
            console.log('Registering WebSocket subscription for notifications...');
            const unsubscribe = subscribe(`/user/queue/notifications`, (message) => {
                try {
                    const newNotification: Notification = JSON.parse(message.body);
                    console.log('Received new notification via WebSocket:', newNotification);

                    setNotificationsList(prev => [newNotification, ...prev]);
                    setUnreadCount(prev => prev + 1);

                    // If it's a bill status notification, refresh the count from server
                    if (newNotification.type === 'BILL_STATUS') {
                        fetchUnreadCount();
                    }

                    if (!isNotificationOpenRef.current) {
                        toast.info(
                            <div>
                                <h4 style={{ margin: 0, fontSize: '14px' }}>{newNotification.title}</h4>
                                <p style={{ margin: '4px 0 0', fontSize: '12px' }}>{newNotification.content}</p>
                            </div>,
                            {
                                icon: <span>🔔</span>,
                                onClick: () => {
                                    handleToggleNotification();
                                }
                            }
                        );
                    }
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            });
            return () => {
                if (unsubscribe) unsubscribe();
            };
        }
    }, [isConnected, userId, isAuthenticated]);

    const fetchUnreadCount = async () => {
        if (!userId) return;
        try {
            const response = await notificationService.getUnreadCount(userId);
            if (response.code === 1000) {
                setUnreadCount(response.result);
            }
        } catch (error) {
            console.error('Failed to fetch unread count:', error);
        }
    };

    const fetchNotifications = async () => {
        if (!userId || isLoadingNotifications) return;
        setIsLoadingNotifications(true);
        try {
            const response = await notificationService.getNotifications(userId, 0, 100);

            // Log to debug if needed (user reported toast.error even with data)
            console.log('Notification API Response:', response);

            if (response && response.code === 1000) {
                if (response.result && response.result.content) {
                    setNotificationsList(response.result.content);
                } else {
                    setNotificationsList([]);
                }
            } else {
                console.error('API returned non-1000 code:', response?.code);
                toast.error(t('header.notifications.load_error'));
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
            toast.error(t('header.notifications.load_error'));
        } finally {
            setIsLoadingNotifications(false);
        }
    };

    const handleToggleNotification = () => {
        const nextState = !isNotificationOpen;
        setIsNotificationOpen(nextState);
        if (nextState && isAuthenticated) {
            fetchNotifications();
        }
    };

    const handleMarkAsRead = async (id: number) => {
        try {
            const response = await notificationService.markAsRead(id);
            if (response.code === 1000) {
                // Update local state to show as read
                setNotificationsList(prev =>
                    prev.map(n => n.id === id ? { ...n, status: 'READ' } : n)
                );
                // Refresh unread count
                fetchUnreadCount();
            }
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        if (!userId) return;
        try {
            const response = await notificationService.markAllAsRead(userId);
            if (response.code === 1000) {
                setNotificationsList(prev => prev.map(n => ({ ...n, status: 'READ' })));
                setUnreadCount(0);
                toast.success(t('header.notifications.mark_all_read_success'));
            }
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const handleDeleteAllRead = async () => {
        if (!userId) return;
        try {
            const response = await notificationService.deleteAllReadNotifications(userId);
            if (response.code === 1000) {
                setNotificationsList(prev => prev.filter(n => n.status === 'UNREAD'));
                toast.success(t('header.notifications.delete_all_success'));
            }
        } catch (error) {
            console.error('Failed to delete all read notifications:', error);
            toast.error(t('header.notifications.delete_error'));
        }
    };

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (categoryMenuRef.current && !categoryMenuRef.current.contains(event.target as Node)) {
                setIsCategoryMenuOpen(false);
            }
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setIsNotificationOpen(false);
            }
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setIsUserMenuOpen(false);
            }
            if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
                setIsLangMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/shop/books?keyword=${encodeURIComponent(searchQuery.trim())}`);
        } else {
            navigate('/shop/books');
        }
    };

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
    };


    return (
        <header className="new-header">
            <div className="new-header__container">
                {/* Top Bar */}
                <div className="new-header__top">
                    {/* Mobile Menu Button */}
                    <button
                        className="new-header__mobile-menu-btn"
                        onClick={toggleMobileMenu}
                        aria-label="Toggle menu"
                    >
                        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>

                    {/* Logo */}
                    <Link to="/shop/home" className="new-header__logo" style={{ display: 'flex', alignItems: 'center' }}>
                        <img src="/logo.png" alt="BookLand" style={{ height: '40px', width: 'auto' }} />
                    </Link>

                    {/* Search Group (Category + Search) */}
                    <div className="new-header__search-group">
                        <div className="new-header__category-wrapper" ref={categoryMenuRef}>
                            <button
                                className="new-header__category-btn"
                                onClick={() => navigate('/shop/books')}
                                title={t('header.book_categories')}
                            >
                                <LayoutGrid size={28} color="#7A7E7F" strokeWidth={1.5} />
                            </button>

                            {/* Category Mega Menu */}
                            {isCategoryMenuOpen && (
                                <div className="new-header__mega-menu">
                                    {/* Left Sidebar - Categories */}
                                    <div className="new-header__mega-menu-sidebar">
                                        <h3 className="new-header__mega-menu-title">{t('header.book_categories')}</h3>
                                        <div className="new-header__mega-menu-categories">
                                            {categories.map((category) => (
                                                <Link
                                                    key={category.id}
                                                    to={`/shop/category/${category.id}`}
                                                    className="new-header__mega-menu-category"
                                                >
                                                    {t(`category.${category.id}`) || category.name}
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                    {/* ... Mega Menu Content (Simplified for brevity, keeping structure) ... */}
                                    {/* Right Panel - Featured Content */}
                                    <div className="new-header__mega-menu-content">
                                        {/* ... (Keeping existing mega menu content logic if needed or can be simplified) ... */}
                                        {/* For now, I'll keep the static structure but ideally this should be dynamic or translated too if hardcoded */}
                                        <div className="new-header__mega-menu-header">
                                            <div className="new-header__mega-menu-badge">
                                                <span className="new-header__mega-menu-badge-icon">📚</span>
                                                <span className="new-header__mega-menu-badge-text">Sách Trong Nước</span>
                                            </div>
                                        </div>
                                        {/* ... Rest of mega menu ... */}
                                    </div>
                                </div>
                            )}
                        </div>

                        <form className="new-header__search" onSubmit={handleSearchSubmit}>
                            <input
                                type="text"
                                className="new-header__search-input"
                                placeholder={t('header.search_placeholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <button className="new-header__search-btn" type="submit" aria-label="Search">
                                <Search size={20} color="white" />
                            </button>
                        </form>
                    </div>

                    {/* Actions */}
                    <div className="new-header__actions">
                        {/* Notification Bell */}
                        <div className="new-header__notification-wrapper" ref={notificationRef}>
                            <button
                                className="new-header__icon-btn"
                                onClick={handleToggleNotification}
                                aria-label="Notifications"
                            >
                                <Bell size={20} />
                                {isAuthenticated && unreadCount > 0 && (
                                    <span className="new-header__badge">{unreadCount}</span>
                                )}
                                <span className="new-header__icon-label">{t('header.notification')}</span>
                            </button>

                            {/* Notification Dropdown */}
                            {isNotificationOpen && (
                                <div className="new-header__notification-dropdown">
                                    <div className="new-header__notification-header">
                                        <h3>{t('header.notification')} ({isAuthenticated ? unreadCount : 0})</h3>
                                        <div className="new-header__notification-header-actions">
                                            {isAuthenticated && unreadCount > 0 && (
                                                <button onClick={handleMarkAllAsRead} className="new-header__mark-all">
                                                    {t('header.mark_all_read')}
                                                </button>
                                            )}
                                            {isAuthenticated && notificationsList.some(n => n.status === 'READ') && (
                                                <button onClick={handleDeleteAllRead} className="new-header__delete-all">
                                                    {t('header.delete_read')}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="new-header__notification-list">
                                        {isAuthenticated ? (
                                            isLoadingNotifications ? (
                                                <div className="new-header__notification-loading">
                                                    <div className="spinner"></div>
                                                    <p>Đang tải...</p>
                                                </div>
                                            ) : notificationsList.length > 0 ? (
                                                notificationsList.map((notification) => (
                                                    <div
                                                        key={notification.id}
                                                        className={`new-header__notification-item ${notification.status === 'UNREAD' ? 'new-header__notification-item--unread' : ''}`}
                                                        onClick={() => {
                                                            if (notification.status === 'UNREAD') handleMarkAsRead(notification.id);
                                                        }}
                                                    >
                                                        <div className="new-header__notification-icon">
                                                            <Bell size={16} />
                                                        </div>
                                                        <div className="new-header__notification-content">
                                                            <h4>{notification.title}</h4>
                                                            <p>{notification.content}</p>
                                                            <span className="new-header__notification-time">
                                                                {new Date(notification.createdAt).toLocaleString('vi-VN')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="new-header__notification-empty">
                                                    <p>{t('header.no_notifications')}</p>
                                                </div>
                                            )
                                        ) : (
                                            <div className="new-header__notification-empty">
                                                <div className="new-header__notification-lock">
                                                    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                                                        <circle cx="32" cy="32" r="32" fill="#F0F0F0" />
                                                        <path d="M32 20C28.686 20 26 22.686 26 26V30H24C22.895 30 22 30.895 22 32V42C22 43.105 22.895 44 24 44H40C41.105 44 42 43.105 42 42V32C42 30.895 41.105 30 40 30H38V26C38 22.686 35.314 20 32 20ZM32 22C34.206 22 36 23.794 36 26V30H28V26C28 23.794 29.794 22 32 22Z" fill="#999" />
                                                    </svg>
                                                </div>
                                                <p className="new-header__notification-empty-text">{t('header.login_to_view_notifications')}</p>
                                                <div className="new-header__notification-actions">
                                                    <Link to="/shop/login" className="new-header__notification-login-btn">
                                                        {t('header.login')}
                                                    </Link>
                                                    <Link to="/shop/register" className="new-header__notification-register-btn">
                                                        {t('header.register')}
                                                    </Link>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Cart */}
                        <Link to="/shop/cart" className="new-header__icon-btn">
                            <ShoppingCart size={20} />
                            {cartItemCount > 0 && (
                                <span className="new-header__badge">{cartItemCount}</span>
                            )}
                            <span className="new-header__icon-label">{t('header.cart')}</span>
                        </Link>

                        {/* User Account */}
                        <div className="new-header__user-wrapper" ref={userMenuRef}>
                            <button
                                className="new-header__user-btn"
                                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                            >
                                <User size={20} />
                                <span className="new-header__icon-label">{t('header.account')}</span>
                            </button>

                            {/* User Menu Dropdown */}
                            {isUserMenuOpen && (
                                <div className="new-header__user-dropdown">
                                    {isAuthenticated ? (
                                        <>
                                            <Link to="/shop/profile" className="new-header__user-info" onClick={() => setIsUserMenuOpen(false)}>
                                                <div className="new-header__user-avatar">
                                                    <User size={24} />
                                                </div>
                                                <div className="new-header__user-details">
                                                    <h4>{mockUser.name}</h4>
                                                    <p>{mockUser.role}</p>
                                                </div>
                                            </Link>
                                            <div className="new-header__user-menu-list">
                                                {userMenuItems.map((item) => (
                                                    item.id === 'logout' ? (
                                                        <button
                                                            key={item.id}
                                                            onClick={onLogout}
                                                            className="new-header__user-menu-item"
                                                        >
                                                            <span className="new-header__user-menu-icon">{item.icon}</span>
                                                            <span>{t(`header.${item.id}`) || item.label}</span>
                                                        </button>
                                                    ) : (
                                                        <Link
                                                            key={item.id}
                                                            to={item.href}
                                                            className="new-header__user-menu-item"
                                                        >
                                                            <span className="new-header__user-menu-icon">{item.icon}</span>
                                                            <span>{t(`header.${item.id}`) || item.label}</span>
                                                        </Link>
                                                    )
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="new-header__auth-dropdown-content">
                                            <Link to="/shop/login" className="new-header__auth-dropdown-btn new-header__auth-dropdown-btn--login">
                                                {t('header.login')}
                                            </Link>
                                            <Link to="/shop/register" className="new-header__auth-dropdown-btn new-header__auth-dropdown-btn--register">
                                                {t('header.register')}
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Language Switcher */}
                        <div className="new-header__lang-selector" ref={langMenuRef} onClick={() => setIsLangMenuOpen(!isLangMenuOpen)} style={{ cursor: 'pointer', position: 'relative' }}>
                            <span style={{ fontSize: '20px' }}>{i18n.language === 'vi' ? '🇻🇳' : '🇬🇧'}</span>
                            <ChevronDown size={14} color="#7A7E7F" />

                            {isLangMenuOpen && (
                                <div className="new-header__lang-dropdown" style={{
                                    position: 'absolute',
                                    top: '100%',
                                    right: 0,
                                    backgroundColor: 'white',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                    padding: '8px',
                                    zIndex: 1002,
                                    minWidth: '120px',
                                    marginTop: '8px'
                                }}>
                                    <div
                                        onClick={() => changeLanguage('vi')}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', cursor: 'pointer', borderRadius: '4px', backgroundColor: i18n.language === 'vi' ? '#f5f5f5' : 'transparent' }}
                                    >
                                        <span style={{ fontSize: '20px' }}>🇻🇳</span>
                                        <span style={{ fontSize: '14px', fontWeight: 500 }}>VN</span>
                                    </div>
                                    <div
                                        onClick={() => changeLanguage('en')}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', cursor: 'pointer', borderRadius: '4px', backgroundColor: i18n.language === 'en' ? '#f5f5f5' : 'transparent' }}
                                    >
                                        <span style={{ fontSize: '20px' }}>🇬🇧</span>
                                        <span style={{ fontSize: '14px', fontWeight: 500 }}>EN</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="new-header__mobile-overlay" onClick={closeMobileMenu} />
            )}

            {/* Mobile Menu */}
            <div className={`new-header__mobile-menu ${isMobileMenuOpen ? 'new-header__mobile-menu--open' : ''}`}>
                {/* Mobile Header */}
                <div className="new-header__mobile-header">
                    <Link to="/shop/home" className="new-header__mobile-logo" onClick={closeMobileMenu}>
                        <img src="/logo.png" alt="BookLand" style={{ height: '32px', width: 'auto' }} />
                    </Link>
                    <button onClick={closeMobileMenu} className="new-header__mobile-close">
                        <X size={24} />
                    </button>
                </div>

                {/* Mobile Search */}
                <div className="new-header__mobile-search-wrapper">
                    <form className="new-header__mobile-search" onSubmit={(e) => { handleSearchSubmit(e); closeMobileMenu(); }}>
                        <input
                            type="text"
                            className="new-header__mobile-search-input"
                            placeholder={t('header.search_placeholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button className="new-header__mobile-search-btn" type="submit" aria-label="Search">
                            <Search size={18} color="white" />
                        </button>
                    </form>
                </div>

                {/* Mobile Nav Links */}
                <div className="new-header__mobile-nav">
                    <Link to="/shop/home" className="new-header__mobile-nav-link" onClick={closeMobileMenu}>
                        🏠 <span>{t('header.home') || 'Trang chủ'}</span>
                    </Link>
                    <Link to="/shop/books" className="new-header__mobile-nav-link" onClick={closeMobileMenu}>
                        📚 <span>{t('header.books')}</span>
                    </Link>
                    <Link to="/shop/wishlist" className="new-header__mobile-nav-link" onClick={closeMobileMenu}>
                        ❤️ <span>{t('header.wishlist') || 'Yêu thích'}</span>
                    </Link>
                    <Link to="/shop/cart" className="new-header__mobile-nav-link" onClick={closeMobileMenu}>
                        🛒 <span>{t('header.cart')}</span>
                        {cartItemCount > 0 && (
                            <span className="new-header__mobile-nav-badge">{cartItemCount}</span>
                        )}
                    </Link>
                </div>

                {/* Mobile User / Auth Section */}
                <div className="new-header__mobile-section-title">{t('header.account')}</div>
                <div className="new-header__mobile-user-section">
                    {isAuthenticated ? (
                        <>
                            <Link to="/shop/profile" className="new-header__user-info" style={{ textDecoration: 'none' }} onClick={closeMobileMenu}>
                                <div className="new-header__user-avatar">
                                    <User size={24} />
                                </div>
                                <div className="new-header__user-details">
                                    <h4 style={{ margin: '0 0 4px', fontSize: '15px', color: '#333' }}>{mockUser.name}</h4>
                                    <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>{mockUser.role}</p>
                                </div>
                            </Link>
                            {userMenuItems.map((item) => (
                                item.id === 'logout' ? (
                                    <button
                                        key={item.id}
                                        onClick={() => { onLogout(); closeMobileMenu(); }}
                                        className="new-header__mobile-nav-link new-header__mobile-nav-link--danger"
                                    >
                                        <span>{item.icon}</span>
                                        <span>{t(`header.${item.id}`) || item.label}</span>
                                    </button>
                                ) : (
                                    <Link
                                        key={item.id}
                                        to={item.href}
                                        className="new-header__mobile-nav-link"
                                        onClick={closeMobileMenu}
                                    >
                                        <span>{item.icon}</span>
                                        <span>{t(`header.${item.id}`) || item.label}</span>
                                    </Link>
                                )
                            ))}
                        </>
                    ) : (
                        <div className="new-header__mobile-auth-btns">
                            <Link to="/shop/login" className="new-header__auth-dropdown-btn new-header__auth-dropdown-btn--login" onClick={closeMobileMenu}>
                                {t('header.login')}
                            </Link>
                            <Link to="/shop/register" className="new-header__auth-dropdown-btn new-header__auth-dropdown-btn--register" onClick={closeMobileMenu}>
                                {t('header.register')}
                            </Link>
                        </div>
                    )}
                </div>

                {/* Mobile Language Switcher */}
                <div className="new-header__mobile-lang">
                    <span className="new-header__mobile-section-title">{t('header.language') || 'Ngôn ngữ'}</span>
                    <div className="new-header__mobile-lang-btns">
                        <button
                            className={`new-header__mobile-lang-btn ${i18n.language === 'vi' ? 'active' : ''}`}
                            onClick={() => changeLanguage('vi')}
                        >
                            🇻🇳 VN
                        </button>
                        <button
                            className={`new-header__mobile-lang-btn ${i18n.language === 'en' ? 'active' : ''}`}
                            onClick={() => changeLanguage('en')}
                        >
                            🇬🇧 EN
                        </button>
                    </div>
                </div>
            </div>
        </header >
    );
};

export default Header;
