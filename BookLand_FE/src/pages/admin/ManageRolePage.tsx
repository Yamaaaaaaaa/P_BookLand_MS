import { useState, useEffect, useCallback } from 'react';
import { Search, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Loader2, Plus, Edit } from 'lucide-react';
import type { Role } from '../../types/Role';
import roleService from '../../api/roleService';
import Pagination from '../../components/admin/Pagination';
import { toast } from 'react-toastify';
import '../../styles/components/buttons.css';
import '../../styles/pages/admin-management.css';
import { useTranslation } from 'react-i18next';

const ManageRolePage = () => {
    const { t } = useTranslation();
    const [roles, setRoles] = useState<Role[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [itemsPerPage] = useState(10);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'id', direction: 'asc' });

    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [formData, setFormData] = useState({ name: '', description: '' });

    const fetchRoles = useCallback(async () => {
        setIsLoading(true);
        try {
            const params: any = {
                page: currentPage - 1,
                size: itemsPerPage,
                keyword: searchTerm,
            };

            if (sortConfig) {
                params.sortBy = sortConfig.key;
                params.sortDirection = sortConfig.direction;
            }

            const response = await roleService.getAllRoles(params);
            if (response.result) {
                setRoles(response.result.content);
                setTotalPages(response.result.totalPages);
            }
        } catch (error) {
            console.error('Error fetching roles:', error);
            toast.error(t('admin.manage_role_page.load_fail'));
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, itemsPerPage, searchTerm, sortConfig, t]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchRoles();
        }, 500);
        return () => clearTimeout(timer);
    }, [fetchRoles]);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleDelete = async (id: number) => {
        if (window.confirm(t('admin.manage_role_page.confirm_delete'))) {
            try {
                await roleService.deleteRole(id);
                toast.success(t('admin.manage_role_page.delete_success'));
                fetchRoles();
            } catch (error: any) {
                console.error('Error deleting role:', error);
                toast.error(error.response?.data?.message || t('admin.manage_role_page.delete_fail'));
            }
        }
    };

    const handleOpenCreateModal = () => {
        setModalMode('create');
        setFormData({ name: '', description: '' });
        setSelectedRole(null);
        setShowModal(true);
    };

    const handleOpenEditModal = (role: Role) => {
        setModalMode('edit');
        setSelectedRole(role);
        setFormData({ name: role.name, description: role.description || '' });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (modalMode === 'create') {
                await roleService.createRole(formData);
                toast.success(t('admin.manage_role_page.create_success'));
            } else if (selectedRole) {
                // Chỉ update description, không update name
                await roleService.updateRole(selectedRole.id, {
                    name: selectedRole.name, // Giữ nguyên name
                    description: formData.description
                });
                toast.success(t('admin.manage_role_page.update_success'));
            }
            setShowModal(false);
            fetchRoles();
        } catch (error: any) {
            console.error('Error saving role:', error);
            toast.error(error.response?.data?.message || t('admin.manage_role_page.save_fail'));
        }
    };

    const getSortIcon = (key: string) => {
        if (sortConfig?.key !== key) return <ArrowUpDown size={14} className="sort-icon inactive" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp size={14} className="sort-icon active" />
            : <ArrowDown size={14} className="sort-icon active" />;
    };

    return (
        <div className="admin-container">
            <div className="admin-header">
                <div>
                    <h1 className="admin-title">{t('admin.manage_role_page.title')}</h1>
                    <p className="admin-subtitle">{t('admin.manage_role_page.subtitle')}</p>
                </div>
                <button className="btn-primary" onClick={handleOpenCreateModal}>
                    <Plus size={20} />
                    {t('admin.manage_role_page.add_role')}
                </button>
            </div>

            {/* Search */}
            <div className="admin-toolbar">
                <div className="search-box">
                    <Search size={18} className="search-box-icon" />
                    <input
                        type="text"
                        className="search-input"
                        placeholder={t('admin.manage_role_page.search_placeholder')}
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                    />
                </div>
            </div>

            <div className="admin-table-container">
                {isLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                        <Loader2 className="animate-spin" size={32} />
                    </div>
                ) : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('id')} className="sortable-header" style={{ width: '80px' }}>
                                    <div className="th-content">
                                        {t('admin.manage_role_page.table.id')} {getSortIcon('id')}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('name')} className="sortable-header">
                                    <div className="th-content">
                                        {t('admin.manage_role_page.table.name')} {getSortIcon('name')}
                                    </div>
                                </th>
                                <th>{t('admin.manage_role_page.table.description')}</th>
                                <th style={{ textAlign: 'right' }}>{t('admin.manage_role_page.table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {roles.map(role => (
                                <tr key={role.id}>
                                    <td>#{role.id}</td>
                                    <td>
                                        <span style={{ fontWeight: 600, color: 'var(--shop-accent-primary)' }}>
                                            {role.name}
                                        </span>
                                    </td>
                                    <td>
                                        <span style={{ color: 'var(--shop-text-muted)' }}>
                                            {role.description || ''}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button className="btn-icon" title={t('admin.manage_role_page.edit_tooltip')} onClick={() => handleOpenEditModal(role)}>
                                                <Edit size={18} />
                                            </button>
                                            <button
                                                className="btn-icon delete"
                                                onClick={() => handleDelete(role.id)}
                                                title={t('admin.manage_role_page.delete_tooltip')}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                {!isLoading && roles.length === 0 && (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--shop-text-muted)' }}>
                        {t('admin.manage_role_page.no_roles')}
                    </div>
                )}
            </div>

            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            />

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>{modalMode === 'create'
                            ? t('admin.manage_role_page.modal.create_title')
                            : t('admin.manage_role_page.modal.edit_title')}</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>{t('admin.manage_role_page.modal.name_label')}</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    disabled={modalMode === 'edit'} // Không cho edit name
                                    style={{ backgroundColor: modalMode === 'edit' ? '#f3f4f6' : 'white' }}
                                />
                                {modalMode === 'edit' && (
                                    <small style={{ color: 'var(--shop-text-muted)' }}>{t('admin.manage_role_page.modal.name_immutable')}</small>
                                )}
                            </div>
                            <div className="form-group">
                                <label>{t('admin.manage_role_page.modal.desc_label')}</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                    placeholder={t('admin.manage_role_page.modal.desc_placeholder')}
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                                    {t('admin.manage_role_page.modal.cancel')}
                                </button>
                                <button type="submit" className="btn-primary">
                                    {modalMode === 'create'
                                        ? t('admin.manage_role_page.modal.create')
                                        : t('admin.manage_role_page.modal.update')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageRolePage;
