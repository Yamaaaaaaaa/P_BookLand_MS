import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import { EventStatus } from '../../../types/Event';
import { EventType } from '../../../types/EventType';
import Pagination from '../../../components/admin/Pagination';
import MultiSelect from '../../../components/admin/MultiSelect';
import type { Event } from '../../../types/Event';
import { eventService } from '../../../api/eventService';
import '../../../styles/components/buttons.css';
import '../../../styles/pages/admin-management.css';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

const EventPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [events, setEvents] = useState<Event[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Filters
    const [selectedStatuses, setSelectedStatuses] = useState<(string | number)[]>([]);
    const [selectedTypes, setSelectedTypes] = useState<(string | number)[]>([]);

    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(0);

    // Filter Options
    const statusOptions = Object.values(EventStatus).map(status => ({ value: status, label: status }));
    const typeOptions = Object.values(EventType).map(type => ({ value: type, label: type.replace(/_/g, ' ') }));

    const fetchEvents = useCallback(async () => {
        setIsLoading(true);
        try {
            const params: any = {
                page: currentPage - 1, // API is 0-based
                size: itemsPerPage,
                keyword: searchTerm,
            };

            // Status Filter - assumes API can handle multiple or single status
            // If API expects single `status` param, we might need to adjust or send multiple query params
            // Based on service definition: status?: string. 
            // If multiple selected, we might only support one or need backend support.
            // For now, if multiple selected, we might not be able to send array.
            // Let's assume we send the first one or if the backend supports "status" appearing multiple times or comma separated.
            // Looking at other services, they used `Ids` arrays. Here it's `status` string.
            // Let's try sending comma separated if multiple, or just take the first one if strict.
            // Or better, filter locally if backend is limited? No, server side preferred.
            // Let's assume the backend 'status' param matches one of the ENUM values.
            if (selectedStatuses.length > 0) {
                // params.status = selectedStatuses[0]; // Restrict to single for now to be safe, or comma join
                params.status = selectedStatuses[0];
            }
            if (selectedTypes.length > 0) {
                params.type = selectedTypes[0];
            }

            if (sortConfig) {
                params.sortBy = sortConfig.key;
                params.sortDirection = sortConfig.direction;
            }

            const response = await eventService.getAllEvents(params);
            if (response.result) {
                setEvents(response.result.content);
                setTotalPages(response.result.totalPages);
            }
        } catch (error) {
            console.error('Error fetching events:', error);
            toast.error(t('admin.event.load_fail'));
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, itemsPerPage, searchTerm, selectedStatuses, selectedTypes, sortConfig]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchEvents();
        }, 500);
        return () => clearTimeout(timer);
    }, [fetchEvents]);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: string) => {
        if (sortConfig?.key !== key) return <ArrowUpDown size={14} className="sort-icon inactive" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp size={14} className="sort-icon active" />
            : <ArrowDown size={14} className="sort-icon active" />;
    };

    const handleDelete = async (id: number) => {
        if (window.confirm(t('admin.event.confirm_delete'))) {
            try {
                await eventService.deleteEvent(id);
                toast.success(t('admin.event.delete_success'));
                fetchEvents();
            } catch (error) {
                console.error('Error deleting event:', error);
                toast.error(t('admin.event.delete_fail'));
            }
        }
    };

    return (
        <div className="admin-container">
            <div className="admin-header">
                <div>
                    <h1 className="admin-title">{t('admin.event.title')}</h1>
                    <p className="admin-subtitle">{t('admin.event.subtitle')}</p>
                </div>
                <button
                    className="btn-primary"
                    onClick={() => navigate('/admin/manage-business/event/new')}
                >
                    <Plus size={18} />
                    {t('admin.event.add_btn')}
                </button>
            </div>

            <div className="admin-toolbar" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '1rem' }}>
                <div className="search-box">
                    <Search size={18} className="search-box-icon" />
                    <input
                        type="text"
                        className="search-input"
                        placeholder={t('admin.event.search_placeholder')}
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <MultiSelect
                            label={t('admin.event.filter.status_label')}
                            options={statusOptions}
                            value={selectedStatuses}
                            onChange={(vals) => {
                                setSelectedStatuses(vals);
                                setCurrentPage(1);
                            }}
                            placeholder={t('admin.event.filter.status_placeholder')}
                        />
                    </div>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <MultiSelect
                            label={t('admin.event.filter.type_label')}
                            options={typeOptions}
                            value={selectedTypes}
                            onChange={(vals) => {
                                setSelectedTypes(vals);
                                setCurrentPage(1);
                            }}
                            placeholder={t('admin.event.filter.type_placeholder')}
                        />
                    </div>

                    <button
                        onClick={() => {
                            setSearchTerm('');
                            setSelectedStatuses([]);
                            setSelectedTypes([]);
                            setSortConfig(null);
                            setCurrentPage(1);
                        }}
                        className="btn-secondary"
                        style={{ height: '42px', whiteSpace: 'nowrap', flexShrink: 0 }}
                    >
                        {t('admin.event.filter.clear_btn')}
                    </button>
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
                                <th className="sortable-header">
                                    <div className="th-content">{t('admin.event.table_header.name')}</div>
                                </th>
                                <th className="sortable-header">
                                    <div className="th-content">{t('admin.event.table_header.type')}</div>
                                </th>
                                <th onClick={() => handleSort('startTime')} className="sortable-header">
                                    <div className="th-content">{t('admin.event.table_header.start_date')} {getSortIcon('startTime')}</div>
                                </th>
                                <th onClick={() => handleSort('priority')} className="sortable-header">
                                    <div className="th-content">{t('admin.event.table_header.priority')} {getSortIcon('priority')}</div>
                                </th>
                                <th className="sortable-header">
                                    <div className="th-content">{t('admin.event.table_header.status')}</div>
                                </th>
                                <th style={{ textAlign: 'right' }}>{t('admin.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {events.map(event => (
                                <tr key={event.id}>
                                    <td>#{event.id}</td>
                                    <td style={{ fontWeight: 500 }}>{event.name}</td>
                                    <td>
                                        <span style={{
                                            backgroundColor: 'var(--shop-bg-secondary)',
                                            padding: '0.2rem 0.5rem',
                                            borderRadius: '4px',
                                            fontSize: '0.85rem'
                                        }}>
                                            {event.type.replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '0.9rem' }}>
                                            {new Date(event.startTime).toLocaleDateString()}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--shop-text-muted)' }}>
                                            {new Date(event.endTime).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td>{event.priority}</td>
                                    <td>
                                        <span style={{
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '999px',
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                            backgroundColor: event.status === 'ACTIVE' ? '#e6f4ea' : '#f1f3f4',
                                            color: event.status === 'ACTIVE' ? '#1e7e34' : '#5f6368'
                                        }}>
                                            {event.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button
                                                className="btn-icon"
                                                title="Edit"
                                                onClick={() => navigate(`/admin/manage-business/event/${event.id}`)}
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                className="btn-icon delete"
                                                title="Delete"
                                                onClick={() => handleDelete(event.id)}
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
                {!isLoading && events.length === 0 && (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--shop-text-muted)' }}>
                        {t('admin.event.empty_state')}
                    </div>
                )}
            </div>

            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            />
        </div>
    );
};

export default EventPage;
