import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, User, Mail, Phone, Lock, Calendar } from 'lucide-react';
import userService from '../../../api/userService';
import roleService from '../../../api/roleService';
import { toast } from 'react-toastify';
import type { UserRequest, UserUpdateRequest, UserStatus } from '../../../types/User';
import type { Role } from '../../../types/Role';
import '../../../styles/components/buttons.css';
import '../../../styles/components/forms.css';
import '../../../styles/pages/admin-management.css';
import { useTranslation } from 'react-i18next';

const AdminUserDetailPage = () => {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isEditMode = id !== 'new';

    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState<UserRequest & { status: UserStatus }>({
        username: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        dob: '',
        password: '',
        status: 'ENABLE',
        roleIds: []
    });

    // Fetch available roles from API
    const [availableRoles, setAvailableRoles] = useState<Role[]>([]);

    useEffect(() => {
        fetchRoles();
    }, []);

    useEffect(() => {
        if (isEditMode && id) {
            fetchUser(parseInt(id));
        }
    }, [isEditMode, id]);

    const fetchRoles = async () => {
        try {
            const response = await roleService.getAllRoles({ size: 100 }); // Get all roles
            if (response.result) {
                setAvailableRoles(response.result.content);
            }
        } catch (error) {
            console.error('Error fetching roles:', error);
            toast.error(t('admin.user_detail.toast.load_roles_fail'));
        }
    };

    const fetchUser = async (userId: number) => {
        setIsLoading(true);
        try {
            const response: any = await userService.adminGetUserById(userId);
            // Check if response is wrapped in 'result' or returned directly
            const user = response.result ? response.result : response;

            if (user && user.username) {
                setFormData({
                    username: user.username,
                    firstName: user.firstName || '',
                    lastName: user.lastName || '',
                    email: user.email,
                    phone: user.phone || '',
                    dob: user.dob || '',
                    password: '', // Don't populate password
                    status: user.status,
                    roleIds: user.roles?.map((r: any) => r.id) || []
                });
            }
        } catch (error) {
            console.error('Error fetching user:', error);
            toast.error(t('admin.user_detail.toast.load_fail'));
            navigate('/admin/manage-user');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleRoleChange = (roleId: number) => {
        setFormData(prev => {
            const currentRoles = prev.roleIds || [];
            if (currentRoles.includes(roleId)) {
                return { ...prev, roleIds: currentRoles.filter(id => id !== roleId) };
            } else {
                return { ...prev, roleIds: [...currentRoles, roleId] };
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Find ADMIN_LOGIN and USER role IDs
            const adminLoginRole = availableRoles.find(role => role.name === 'ADMIN_LOGIN');
            const userRole = availableRoles.find(role => role.name === 'USER');

            // Only add ADMIN_LOGIN if user doesn't have USER role (i.e., they are admin/staff/supporter)
            let finalRoleIds = formData.roleIds || [];
            const hasUserRole = userRole && finalRoleIds.includes(userRole.id);

            // If user is NOT a regular USER (i.e., they are admin/staff), ensure ADMIN_LOGIN is included
            if (!hasUserRole && adminLoginRole && !finalRoleIds.includes(adminLoginRole.id)) {
                finalRoleIds = [...finalRoleIds, adminLoginRole.id];
            }

            if (isEditMode && id) {
                // Update
                const updateData: UserUpdateRequest = {
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    dob: formData.dob,
                    email: formData.email,
                    phone: formData.phone,
                    status: formData.status,
                    roleIds: finalRoleIds
                };
                // Only include password if provided
                if (formData.password) {
                    updateData.password = formData.password;
                }

                await userService.adminUpdateUser(parseInt(id), updateData);
                await userService.adminUpdateUserRoles(parseInt(id), finalRoleIds);
                await userService.adminUpdateUserStatus(parseInt(id), formData.status);

                toast.success(t('admin.user_detail.toast.update_success'));
            } else {
                // Create
                const createData = {
                    ...formData,
                    roleIds: finalRoleIds
                };
                await userService.adminCreateUser(createData);
                toast.success(t('admin.user_detail.toast.create_success'));
            }
            navigate('/admin/manage-user');
        } catch (error) {
            console.error('Error saving user:', error);
            toast.error(t('admin.user_detail.toast.save_fail'));
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading && isEditMode && !formData.email) {
        return <div className="admin-container">Loading...</div>;
    }

    return (
        <div className="admin-container">
            <div className="admin-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button onClick={() => navigate('/admin/manage-user')} className="btn-icon">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="admin-title">{isEditMode ? t('admin.user_detail.title.edit') : t('admin.user_detail.title.add')}</h1>
                        <p className="admin-subtitle">{isEditMode ? t('admin.user_detail.subtitle.edit', { username: formData.username }) : t('admin.user_detail.subtitle.add')}</p>
                    </div>
                </div>
            </div>

            <div className="admin-content-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
                <form onSubmit={handleSubmit} className="card" style={{ padding: '2rem' }}>

                    {/* Account Info */}
                    <h3 className="section-title">{t('admin.user_detail.form.account_info')}</h3>
                    <div className="grid-2-cols">
                        <div className="form-group margin-bottom">
                            <label className="form-label">{t('admin.user_detail.form.username')} <span style={{ color: 'red' }}>*</span></label>
                            <div className="input-group">
                                <User size={18} className="input-icon" />
                                <input
                                    type="text"
                                    name="username"
                                    className="form-input"
                                    value={formData.username}
                                    onChange={handleChange}
                                    disabled={isEditMode}
                                    required
                                    placeholder="johndoe"
                                />
                            </div>
                        </div>
                        <div className="form-group margin-bottom">
                            <label className="form-label">{t('admin.user_detail.form.password')} {isEditMode && t('admin.user_detail.form.password_hint')} {!isEditMode && <span style={{ color: 'red' }}>*</span>}</label>
                            <div className="input-group">
                                <Lock size={18} className="input-icon" />
                                <input
                                    type="password"
                                    name="password"
                                    className="form-input"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required={!isEditMode}
                                    placeholder="********"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-group margin-bottom">
                        <label className="form-label">{t('admin.user_detail.form.email')} <span style={{ color: 'red' }}>*</span></label>
                        <div className="input-group">
                            <Mail size={18} className="input-icon" />
                            <input
                                type="email"
                                name="email"
                                className="form-input"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                placeholder="john@example.com"
                            />
                        </div>
                    </div>

                    {/* Personal Info */}
                    <h3 className="section-title margin-top">{t('admin.user_detail.form.personal_info')}</h3>
                    <div className="grid-2-cols">
                        <div className="form-group margin-bottom">
                            <label className="form-label">{t('admin.user_detail.form.firstName')}</label>
                            <input
                                type="text"
                                name="firstName"
                                className="form-input"
                                value={formData.firstName}
                                onChange={handleChange}
                                placeholder="John"
                            />
                        </div>
                        <div className="form-group margin-bottom">
                            <label className="form-label">{t('admin.user_detail.form.lastName')}</label>
                            <input
                                type="text"
                                name="lastName"
                                className="form-input"
                                value={formData.lastName}
                                onChange={handleChange}
                                placeholder="Doe"
                            />
                        </div>
                    </div>

                    <div className="grid-2-cols">
                        <div className="form-group margin-bottom">
                            <label className="form-label">{t('admin.user_detail.form.phone')}</label>
                            <div className="input-group">
                                <Phone size={18} className="input-icon" />
                                <input
                                    type="text"
                                    name="phone"
                                    className="form-input"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="+123..."
                                />
                            </div>
                        </div>
                        <div className="form-group margin-bottom">
                            <label className="form-label">{t('admin.user_detail.form.dob')}</label>
                            <div className="input-group">
                                <Calendar size={18} className="input-icon" />
                                <input
                                    type="date"
                                    name="dob"
                                    className="form-input"
                                    value={formData.dob}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Roles & Status */}
                    <h3 className="section-title margin-top">{t('admin.user_detail.form.role_status')}</h3>

                    <div className="form-group margin-bottom">
                        <label className="form-label">{t('admin.user_detail.form.status')} <span style={{ color: 'red' }}>*</span></label>
                        <select
                            name="status"
                            className="form-select"
                            value={formData.status}
                            onChange={handleChange}
                            required
                        >
                            <option value="ENABLE">{t('admin.user_detail.form.status_active')}</option>
                            <option value="DISABLE">{t('admin.user_detail.form.status_blocked')}</option>
                        </select>
                    </div>

                    <div className="form-group margin-bottom">
                        <label className="form-label">{t('admin.user_detail.form.roles')} <span style={{ color: 'red' }}>*</span></label>
                        {(() => {
                            const userRole = availableRoles.find(role => role.name === 'USER');
                            const hasUserRole = userRole && formData.roleIds?.includes(userRole.id);

                            return (
                                <>
                                    {!hasUserRole && (
                                        <p style={{ fontSize: '0.875rem', color: 'var(--shop-text-secondary)', marginBottom: '0.5rem' }}>
                                            {t('admin.user_detail.form.admin_login_note')}
                                        </p>
                                    )}
                                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                        {availableRoles.map(role => {
                                            const isAdminLogin = role.name === 'ADMIN_LOGIN';

                                            // Hide ADMIN_LOGIN if user has USER role
                                            if (isAdminLogin && hasUserRole) {
                                                return null;
                                            }

                                            const isChecked = formData.roleIds?.includes(role.id) || (isAdminLogin && !hasUserRole);

                                            return (
                                                <label key={role.id} style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                    padding: '0.5rem 1rem',
                                                    backgroundColor: isChecked ? 'var(--shop-bg-secondary)' : 'transparent',
                                                    border: '1px solid var(--shop-border)',
                                                    borderRadius: 'var(--radius-md)',
                                                    cursor: isAdminLogin ? 'not-allowed' : 'pointer',
                                                    opacity: isAdminLogin ? 0.7 : 1
                                                }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => !isAdminLogin && handleRoleChange(role.id)}
                                                        disabled={isAdminLogin}
                                                        style={{ cursor: isAdminLogin ? 'not-allowed' : 'pointer' }}
                                                    />
                                                    {role.name}
                                                    {isAdminLogin && <span style={{ fontSize: '0.75rem', color: 'var(--shop-text-secondary)' }}>{t('admin.user_detail.form.required_role')}</span>}
                                                </label>
                                            );
                                        })}
                                    </div>
                                </>
                            );
                        })()}
                    </div>

                    <div className="form-actions" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                        <button type="button" className="btn-secondary" onClick={() => navigate('/admin/manage-user')}>
                            {t('admin.user_detail.form.cancel')}
                        </button>
                        <button type="submit" className="btn-primary" disabled={isLoading}>
                            <Save size={18} />
                            {isLoading ? t('admin.user_detail.form.saving') : t('admin.user_detail.form.save')}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default AdminUserDetailPage;
