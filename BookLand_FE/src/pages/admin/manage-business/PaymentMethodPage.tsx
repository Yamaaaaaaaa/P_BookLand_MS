import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import Pagination from '../../../components/admin/Pagination';
import AdminModal, { type FieldConfig } from '../../../components/admin/AdminModal';
import type { PaymentMethod } from '../../../types/PaymentMethod';
import paymentMethodService from '../../../api/paymentMethodService';
import '../../../styles/components/buttons.css';
import '../../../styles/pages/admin-management.css';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

const PaymentMethodPage = () => {
    const { t } = useTranslation();
    const [methods, setMethods] = useState<PaymentMethod[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Sort State
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    // Server-side Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [itemsPerPage] = useState(10);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'update'>('create');
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);

    const fetchMethods = useCallback(async () => {
        setIsLoading(true);
        try {
            const params: any = {
                page: currentPage - 1,
                size: itemsPerPage,
                keyword: searchTerm || undefined
            };

            if (sortConfig) {
                params.sortBy = sortConfig.key;
                params.sortDirection = sortConfig.direction;
            }

            const response = await paymentMethodService.getAll(params);
            if (response.result) {
                if (response.result.content) {
                    setMethods(response.result.content);
                    // Use totalPages from API if available
                    setTotalPages(response.result.totalPages || 1);
                } else if (Array.isArray(response.result)) {
                    // Fallback if API returns list directly
                    setMethods(response.result);
                    setTotalPages(1);
                }
            }
        } catch (error) {
            console.error(error);
            toast.error(t('admin.payment_method.load_fail'));
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, itemsPerPage, searchTerm, sortConfig]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchMethods();
        }, 300);
        return () => clearTimeout(timer);
    }, [fetchMethods]);

    const handleSort = (key: string) => {
        setSortConfig(current => {
            let direction: 'asc' | 'desc' = 'asc';
            if (current && current.key === key && current.direction === 'asc') {
                direction = 'desc';
            }
            return { key, direction };
        });
    };

    const getSortIcon = (key: string) => {
        if (sortConfig?.key !== key) return <ArrowUpDown size={14} className="sort-icon inactive" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp size={14} className="sort-icon active" />
            : <ArrowDown size={14} className="sort-icon active" />;
    };

    const handleDelete = async (id: number) => {
        if (window.confirm(t('admin.payment_method.confirm_delete'))) {
            try {
                await paymentMethodService.delete(id);
                toast.success(t('admin.payment_method.delete_success'));
                fetchMethods();
            } catch (error) {
                console.error(error);
                toast.error(t('admin.payment_method.delete_fail'));
            }
        }
    };

    const handleEdit = (method: PaymentMethod) => {
        setSelectedMethod(method);
        setModalMode('update');
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setSelectedMethod(null);
        setModalMode('create');
        setIsModalOpen(true);
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    const handleModalSubmit = async (formData: any) => {
        try {
            const dataToSubmit = {
                ...formData,
                isOnline: formData.isOnline === 'true' || formData.isOnline === true
            };

            if (modalMode === 'create') {
                await paymentMethodService.create(dataToSubmit);
                toast.success(t('admin.payment_method.create_success'));
            } else {
                if (selectedMethod) {
                    await paymentMethodService.update(selectedMethod.id, dataToSubmit);
                    toast.success(t('admin.payment_method.update_success'));
                }
            }
            fetchMethods(); // Refresh list
            setIsModalOpen(false);
        } catch (error) {
            console.error(error);
            toast.error(modalMode === 'create' ? t('admin.payment_method.create_fail') : t('admin.payment_method.update_fail'));
        }
    };

    const modalFields: FieldConfig[] = [
        { name: 'name', label: t('admin.payment_method.modal.label_name'), type: 'text', required: true },
        { name: 'providerCode', label: t('admin.payment_method.modal.label_code'), type: 'text', required: true, placeholder: 'e.g. VISAMASTER, COD' },
        {
            name: 'isOnline',
            label: t('admin.payment_method.modal.label_type'),
            type: 'select',
            required: true,
            options: [
                { value: 'true', label: t('admin.payment_method.status.online') },
                { value: 'false', label: t('admin.payment_method.status.offline') }
            ]
        },
        { name: 'description', label: 'Description', type: 'textarea' }
    ];

    return (
        <div className="admin-container">
            <div className="admin-header">
                <div>
                    <h1 className="admin-title">{t('admin.payment_method.title')}</h1>
                    <p className="admin-subtitle">{t('admin.payment_method.subtitle')}</p>
                </div>
                <button
                    className="btn-primary"
                    onClick={handleAdd}
                >
                    <Plus size={18} />
                    {t('admin.payment_method.add_btn')}
                </button>
            </div>

            <div className="admin-toolbar">
                <div className="search-box">
                    <Search size={18} className="search-box-icon" />
                    <input
                        type="text"
                        className="search-input"
                        placeholder={t('admin.payment_method.search_placeholder')}
                        value={searchTerm}
                        onChange={handleSearchChange}
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
                                <th onClick={() => handleSort('id')} className="sortable-header">
                                    <div className="th-content">ID {getSortIcon('id')}</div>
                                </th>
                                <th onClick={() => handleSort('name')} className="sortable-header">
                                    <div className="th-content">{t('admin.payment_method.table_header.name')} {getSortIcon('name')}</div>
                                </th>
                                <th onClick={() => handleSort('providerCode')} className="sortable-header">
                                    <div className="th-content">{t('admin.payment_method.table_header.code')} {getSortIcon('providerCode')}</div>
                                </th>
                                <th className="sortable-header">
                                    <div className="th-content">{t('admin.payment_method.table_header.type')}</div>
                                </th>
                                <th>{t('admin.payment_method.table_header.description')}</th>
                                <th style={{ textAlign: 'right' }}>{t('admin.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {methods.map(method => (
                                <tr key={method.id}>
                                    <td>#{method.id}</td>
                                    <td style={{ fontWeight: 500 }}>{method.name}</td>
                                    <td>
                                        <span style={{
                                            fontFamily: 'monospace',
                                            backgroundColor: 'var(--shop-bg-secondary)',
                                            padding: '0.1rem 0.4rem',
                                            borderRadius: '4px',
                                            fontSize: '0.85rem'
                                        }}>
                                            {method.providerCode}
                                        </span>
                                    </td>
                                    <td>
                                        <span style={{
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '999px',
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                            backgroundColor: method.isOnline ? '#e8f0fe' : '#fce8e6',
                                            color: method.isOnline ? '#1967d2' : '#c5221f'
                                        }}>
                                            {method.isOnline ? t('admin.payment_method.status.online') : t('admin.payment_method.status.offline')}
                                        </span>
                                    </td>
                                    <td style={{ color: 'var(--shop-text-secondary)' }}>{method.description}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button
                                                className="btn-icon"
                                                title="Edit"
                                                onClick={() => handleEdit(method)}
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                className="btn-icon delete"
                                                title="Delete"
                                                onClick={() => handleDelete(method.id)}
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
                {!isLoading && methods.length === 0 && (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--shop-text-muted)' }}>
                        {t('admin.payment_method.empty_state')}
                    </div>
                )}
            </div>

            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            />

            <AdminModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleModalSubmit}
                mode={modalMode}
                title={modalMode === 'create' ? t('admin.payment_method.modal.add_title') : t('admin.payment_method.modal.edit_title')}
                fields={modalFields}
                initialData={selectedMethod ? {
                    ...selectedMethod,
                    isOnline: selectedMethod.isOnline ? 'true' : 'false'
                } : undefined}
            />
        </div>
    );
};

export default PaymentMethodPage;
