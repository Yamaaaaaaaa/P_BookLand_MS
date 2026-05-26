import { useState, useEffect } from 'react';
import {
    User,
    ClipboardList,
    Bell,
    ChevronDown,
    Info,
    MapPin,
    Loader2,
    MessageSquare,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../../styles/pages/profile.css';
import userService from '../../api/userService';
import { getCurrentUserId } from '../../utils/auth';
import type { User as UserType } from '../../types/User';
import { toast } from 'react-toastify';
import { useTranslation, Trans } from 'react-i18next';

type TabType = 'profile' | 'addresses' | 'notifications' | 'password';

const ProfilePage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const userId = getCurrentUserId();
    const [activeTab, setActiveTab] = useState<TabType>('profile');
    const [userData, setUserData] = useState<UserType | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    // Form states
    const [profileForm, setProfileForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        dob: '',
    });

    const [passwordForm, setPasswordForm] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    useEffect(() => {
        if (userId) {
            fetchUserData();
        }
    }, [userId]);

    const fetchUserData = async () => {
        try {
            const response = await userService.getOwnProfile();
            if (response.result) {
                setUserData(response.result);
                setProfileForm({
                    firstName: response.result.firstName || '',
                    lastName: response.result.lastName || '',
                    email: response.result.email || '',
                    phone: response.result.phone || '',
                    dob: response.result.dob || '',
                });
            }
        } catch (error) {
            console.error('Failed to fetch user data:', error);
            toast.error(t('profile.update_fail'));
        } finally {
            setIsLoading(false);
        }
    };




    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) return;

        setIsProcessing(true);
        try {
            const response = await userService.updateUser(userId, {
                firstName: profileForm.firstName.trim(),
                lastName: profileForm.lastName.trim(),
                phone: profileForm.phone.trim(),
                dob: profileForm.dob,
            });
            if (response.result) {
                setUserData(response.result);
                toast.success(t('profile.update_success'));
            }
        } catch (error) {
            console.error('Update profile error:', error);
            toast.error(t('profile.update_fail'));
        } finally {
            setIsProcessing(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            toast.error(t('profile.password_mismatch'));
            return;
        }

        setIsProcessing(true);
        try {
            // Backend update user allows password change
            const response = await userService.updateUser(userId!, {
                password: passwordForm.newPassword
            });
            if (response.result) {
                toast.success(t('profile.change_password_success'));
                setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
                setActiveTab('profile');
            }
        } catch (error) {
            console.error('Change password error:', error);
            toast.error(t('profile.change_password_fail'));
        } finally {
            setIsProcessing(false);
        }
    };



    if (isLoading) {
        return (
            <div className="profile-loading" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f0f0' }}>
                <Loader2 className="animate-spin" size={48} color="#C92127" />
            </div>
        );
    }

    return (
        <div className="profile-page">
            <div className="shop-container">
                <div className="profile-layout">
                    {/* Sidebar */}
                    <aside className="profile-sidebar">
                        <div className="user-summary-card">
                            <div className="avatar-section-centered">
                                <div className="large-avatar-wrapper">
                                    <div className="avatar-circle">
                                        <User size={48} color="#ccd0d5" />
                                    </div>
                                </div>
                                <div className="user-info-centered">
                                    <h3>{userData?.firstName} {userData?.lastName}</h3>
                                </div>
                            </div>
                        </div>

                        <nav className="profile-nav">
                            <div className="nav-section">
                                <div className={`nav-item ${(activeTab === 'profile' || activeTab === 'addresses' || activeTab === 'password') ? 'active' : ''}`}>
                                    <div className="nav-item-header" onClick={() => setActiveTab('profile')}>
                                        <div className="nav-item-wrapper">
                                            <User size={20} />
                                            <span>{t('profile.profile_tab_title')}</span>
                                        </div>
                                        <ChevronDown size={14} className="arrow" />
                                    </div>
                                    <div className="sub-nav">
                                        <div className={`sub-nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>{t('profile.profile_tab_title')}</div>
                                        <div className={`sub-nav-item ${activeTab === 'addresses' ? 'active' : ''}`} onClick={() => setActiveTab('addresses')}>{t('profile.addresses_tab')}</div>
                                        <div className={`sub-nav-item ${activeTab === 'password' ? 'active' : ''}`} onClick={() => setActiveTab('password')}>{t('profile.change_password_tab')}</div>
                                    </div>
                                </div>
                                <div className="nav-item" onClick={() => navigate('/shop/my-orders')}>
                                    <div className="nav-item-header">
                                        <div className="nav-item-wrapper">
                                            <ClipboardList size={20} />
                                            <span>{t('profile.my_orders')}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="nav-item" onClick={() => navigate('/shop/my-reviews')}>
                                    <div className="nav-item-header">
                                        <div className="nav-item-wrapper">
                                            <MessageSquare size={20} />
                                            <span>{t('profile.my_reviews')}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className={`nav-item ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => setActiveTab('notifications')}>
                                    <div className="nav-item-header">
                                        <div className="nav-item-wrapper">
                                            <Bell size={20} />
                                            <span>{t('profile.notifications_tab')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </nav>
                    </aside>

                    {/* Main Content */}
                    <main className="profile-main">
                        {/* Membership Banner (Stats) */}
                        <div className="membership-banner">
                            <div className="banner-alert">
                                <Info size={16} />
                                <span><Trans i18nKey="profile.welcome_back" values={{ name: userData?.username || '' }} components={{ b: <b /> }} /></span>
                            </div>
                            <div className="banner-content">
                                <div className="mascot-section">
                                    <div className="mascot-container">
                                        <img src="https://cdn0.fahasa.com/skin/frontend/ma_fahasa7/default/images/fahasa-mascot.png" alt="Mascot" />
                                    </div>
                                </div>
                                <div className="stats-grid">
                                    <div className="stat-card">
                                        <h4>{t('profile.achievement')}</h4>
                                        <div className="stat-items">
                                            {/* Stats removed as they require separate API calls now or moved to respective pages */}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Profile Tab */}
                        {activeTab === 'profile' && (
                            <div className="profile-form-section">
                                <h2 className="section-title">{t('profile.profile_tab_title')}</h2>
                                <form className="profile-form" onSubmit={handleUpdateProfile}>
                                    <div className="form-group-row">
                                        <label>{t('profile.first_name')}</label>
                                        <input
                                            type="text"
                                            value={profileForm.firstName}
                                            onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                                            placeholder={t('profile.enter_first_name')}
                                            required
                                        />
                                    </div>
                                    <div className="form-group-row">
                                        <label>{t('profile.last_name')}</label>
                                        <input
                                            type="text"
                                            value={profileForm.lastName}
                                            onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                                            placeholder={t('profile.enter_last_name')}
                                            required
                                        />
                                    </div>
                                    <div className="form-group-row">
                                        <label>{t('profile.phone')}</label>
                                        <input
                                            type="text"
                                            value={profileForm.phone}
                                            onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                                            placeholder={t('profile.enter_phone')}
                                        />
                                    </div>
                                    <div className="form-group-row">
                                        <label>Email</label>
                                        <input
                                            type="email"
                                            value={profileForm.email}
                                            disabled
                                            style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                                        />
                                    </div>
                                    <div className="form-group-row">
                                        <label>{t('profile.dob')}</label>
                                        <input
                                            type="date"
                                            value={profileForm.dob ? profileForm.dob.split('T')[0] : ''}
                                            onChange={(e) => setProfileForm({ ...profileForm, dob: e.target.value })}
                                            style={{ height: '36px', padding: '0 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}
                                        />
                                    </div>
                                    <div className="form-actions">
                                        <button type="submit" className="btn-save-profile" disabled={isProcessing}>
                                            {isProcessing ? t('profile.saving') : t('profile.save_changes')}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Password Tab */}
                        {activeTab === 'password' && (
                            <div className="profile-form-section">
                                <h2 className="section-title">{t('profile.change_password_tab')}</h2>
                                <form className="profile-form" onSubmit={handleChangePassword}>
                                    <div className="form-group-row">
                                        <label>{t('profile.new_password')}</label>
                                        <input
                                            type="password"
                                            value={passwordForm.newPassword}
                                            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                            placeholder={t('profile.enter_new_password')}
                                            required
                                        />
                                    </div>
                                    <div className="form-group-row">
                                        <label>{t('profile.confirm_password')}</label>
                                        <input
                                            type="password"
                                            value={passwordForm.confirmPassword}
                                            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                            placeholder={t('profile.enter_confirm_password')}
                                            required
                                        />
                                    </div>
                                    <div className="form-actions" style={{ marginTop: '20px' }}>
                                        <button type="submit" className="btn-save-profile" disabled={isProcessing}>
                                            {isProcessing ? t('profile.updating') : t('profile.change_password_btn')}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}




                        {/* Addresses Placeholder */}
                        {activeTab === 'addresses' && (
                            <div className="profile-form-section">
                                <h2 className="section-title">{t('profile.address_book_title')}</h2>
                                <div className="empty-state" style={{ textAlign: 'center', padding: '40px' }}>
                                    <MapPin size={48} color="#ddd" style={{ marginBottom: '10px' }} />
                                    <p color="#666">{t('profile.address_developing')}</p>
                                </div>
                            </div>
                        )}

                        {/* Notifications Placeholder */}
                        {activeTab === 'notifications' && (
                            <div className="profile-form-section">
                                <h2 className="section-title">{t('profile.notifications_title')}</h2>
                                <div className="empty-state" style={{ textAlign: 'center', padding: '40px' }}>
                                    <Bell size={48} color="#ddd" style={{ marginBottom: '10px' }} />
                                    <p color="#666">{t('profile.no_notifications')}</p>
                                </div>
                            </div>
                        )}
                    </main>
                </div>
            </div>


        </div>
    );
};

export default ProfilePage;
