import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { Author } from '../../../types/Author';
import authorService from '../../../api/authorService';
import AdminModal, { type FieldConfig } from '../../../components/admin/AdminModal';
import Pagination from '../../../components/admin/Pagination';
import '../../../styles/components/buttons.css';
import '../../../styles/components/forms.css';
import '../../../styles/pages/admin-management.css';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

const AuthorPage = () => {
    const { t } = useTranslation();
    const [authors, setAuthors] = useState<Author[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Server-side Pagination & Sort State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [itemsPerPage] = useState(5);
    const [sortConfig, setSortConfig] = useState<{ key: keyof Author; direction: 'asc' | 'desc' } | null>({ key: 'id', direction: 'asc' });

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'update' | 'view'>('create');
    const [selectedAuthor, setSelectedAuthor] = useState<Author | null>(null);

    const fetchAuthors = async () => {
        try {
            const params: any = {
                page: currentPage - 1,
                size: itemsPerPage,
                keyword: searchTerm || undefined
            };

            if (sortConfig) {
                params.sortBy = sortConfig.key;
                params.sortDirection = sortConfig.direction.toUpperCase();
            }

            const response = await authorService.getAllAuthors(params);
            if (response.result) {
                if (response.result.content && typeof response.result.totalPages === 'number') {
                    setAuthors(response.result.content);
                    setTotalPages(response.result.totalPages);
                } else if (Array.isArray(response.result)) {
                    setAuthors(response.result);
                    setTotalPages(1);
                }
            }
        } catch (error) {
            console.error(error);
            toast.error(t('admin.author.toast.load_fail'));
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchAuthors();
        }, 300);
        return () => clearTimeout(timer);
    }, [currentPage, sortConfig, searchTerm]);

    const fieldConfig: FieldConfig[] = [
        { name: 'name', label: t('admin.author.modal.name_label'), type: 'text', required: true, placeholder: t('admin.author.modal.name_placeholder') },
        { name: 'authorImage', label: t('admin.author.modal.image_label'), type: 'image', placeholder: t('admin.author.modal.image_placeholder') },
        { name: 'description', label: t('admin.author.modal.desc_label'), type: 'textarea', placeholder: t('admin.author.modal.desc_placeholder') }
    ];

    const handleSort = (key: keyof Author) => {
        setSortConfig(current => {
            let direction: 'asc' | 'desc' = 'asc';
            if (current && current.key === key && current.direction === 'asc') {
                direction = 'desc';
            }
            return { key, direction };
        });
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    const openModal = (mode: 'create' | 'update' | 'view', author?: Author) => {
        setModalMode(mode);
        setSelectedAuthor(author || null);
        setIsModalOpen(true);
    };

    const handleModalSubmit = async (data: any) => {
        try {
            if (modalMode === 'update' && selectedAuthor) {
                await authorService.updateAuthor(selectedAuthor.id, data);
                toast.success(t('admin.author.toast.update_success'));
            } else if (modalMode === 'create') {
                await authorService.createAuthor(data);
                toast.success(t('admin.author.toast.create_success'));
            }
            fetchAuthors();
            setIsModalOpen(false);
        } catch (error) {
            console.error(error);
            toast.error(t('admin.author.toast.action_fail'));
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm(t('admin.author.toast.delete_confirm'))) {
            try {
                await authorService.deleteAuthor(id);
                toast.success(t('admin.author.toast.delete_success'));
                fetchAuthors();
            } catch (error) {
                console.error(error);
                toast.error(t('admin.author.toast.delete_fail'));
            }
        }
    };

    const getSortIcon = (key: keyof Author) => {
        if (sortConfig?.key !== key) return <ArrowUpDown size={14} className="sort-icon inactive" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp size={14} className="sort-icon active" />
            : <ArrowDown size={14} className="sort-icon active" />;
    };

    const getModalTitle = () => {
        switch (modalMode) {
            case 'create': return t('admin.author.modal.create_title');
            case 'update': return t('admin.author.modal.update_title');
            case 'view': return t('admin.author.modal.view_title');
            default: return '';
        }
    };

    return (
        <div className="admin-container">
            <div className="admin-header">
                <div>
                    <h1 className="admin-title">{t('admin.author.title')}</h1>
                    <p className="admin-subtitle">{t('admin.author.subtitle')}</p>
                </div>
                <button className="btn-primary" onClick={() => openModal('create')}>
                    <Plus size={20} />
                    {t('admin.author.add_btn')}
                </button>
            </div>

            <div className="admin-toolbar">
                <div className="search-box">
                    <Search size={18} className="search-box-icon" />
                    <input
                        type="text"
                        className="search-input"
                        placeholder={t('admin.author.search_placeholder')}
                        value={searchTerm}
                        onChange={handleSearchChange}
                    />
                </div>
            </div>

            <div className="admin-table-container margin-top">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('id')} className="sortable-header" style={{ width: '80px' }}>
                                <div className="th-content">
                                    {t('admin.author.table.id')}
                                    {getSortIcon('id')}
                                </div>
                            </th>
                            <th>{t('admin.author.table.image')}</th>
                            <th onClick={() => handleSort('name')} className="sortable-header">
                                <div className="th-content">
                                    {t('admin.author.table.name')}
                                    {getSortIcon('name')}
                                </div>
                            </th>
                            <th onClick={() => handleSort('description')} className="sortable-header">
                                <div className="th-content">
                                    {t('admin.author.table.description')}
                                    {getSortIcon('description')}
                                </div>
                            </th>
                            <th style={{ textAlign: 'right' }}>{t('admin.author.table.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {authors.map(author => (
                            <tr key={author.id}>
                                <td>#{author.id}</td>
                                <td>
                                    {author.authorImage ? (
                                        <img src={author.authorImage} alt={author.name} className="info-image" />
                                    ) : (
                                        <div className="info-image" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{author.name.charAt(0)}</span>
                                        </div>
                                    )}
                                </td>
                                <td style={{ fontWeight: 500 }}>{author.name}</td>
                                <td style={{ color: 'var(--shop-text-muted)' }}>{author.description ? (author.description.length > 50 ? author.description.substring(0, 50) + '...' : author.description) : '-'}</td>
                                <td style={{ textAlign: 'right' }}>
                                    <div className="action-buttons">
                                        <button className="btn-icon" onClick={() => openModal('view', author)}>
                                            <Eye size={18} />
                                        </button>
                                        <button className="btn-icon" onClick={() => openModal('update', author)}>
                                            <Edit size={18} />
                                        </button>
                                        <button className="btn-icon delete" onClick={() => handleDelete(author.id)}>
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {authors.length === 0 && (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                                    {t('admin.author.no_data')}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
            />

            <AdminModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleModalSubmit}
                mode={modalMode}
                title={getModalTitle()}
                fields={fieldConfig}
                initialData={selectedAuthor}
            />
        </div>
    );
};

export default AuthorPage;
