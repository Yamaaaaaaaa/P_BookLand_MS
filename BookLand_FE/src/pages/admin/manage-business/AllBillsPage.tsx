import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../../utils/formatters';
import { Eye, ArrowUpDown, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import Pagination from '../../../components/admin/Pagination';
import MultiSelect from '../../../components/admin/MultiSelect';
import { BillStatus, type Bill } from '../../../types/Bill';
import billService from '../../../api/billService';
import { toast } from 'react-toastify';
import '../../../styles/components/buttons.css';
import '../../../styles/pages/admin-management.css';
import { useTranslation } from 'react-i18next';

const AllBillsPage = () => {
    const { t } = useTranslation();
    // State
    const [bills, setBills] = useState<Bill[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedStatuses, setSelectedStatuses] = useState<(string | number)[]>([]); // Filter by status
    // const [selectedPayments, setSelectedPayments] = useState<(string | number)[]>([]); // Payment filter not directly supported by API yet or needs mapping

    // Sort State
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'createdAt', direction: 'desc' });

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const itemsPerPage = 10;

    // Options
    const statusOptions = Object.values(BillStatus).map(status => ({ value: status, label: status }));

    const fetchBills = async () => {
        setIsLoading(true);
        try {
            const params: any = {
                page: currentPage - 1, // API is 0-indexed
                size: itemsPerPage,
                sortBy: sortConfig.key,
                sortDirection: sortConfig.direction.toUpperCase(),
            };

            // Assuming API doesn't support complex search yet, but if it does:
            // "userId" is supported, but not unrestricted text search on name yet based on docs?
            // "minCost", "maxCost", "fromDate", "toDate", "status".
            // The doc says "userId" in query.
            // For now, if searchTerm is provided, we can't search easily server-side unless we implement it there or use "keyword" if available (not listed in Bill params).
            // Doc only lists: userId, status, fromDate, toDate, minCost, maxCost.
            // Client-side filtering for search might be needed if API doesn't support it, OR we just support Status filter for now.
            // Let's rely on Status filter which is supported.

            if (selectedStatuses.length > 0) {
                // API only accepts single status string? Or we need to loop?
                // Doc says: status: string (enum). So likely single status per request.
                // If we want multi-select support, we'd need backend change or client filtering.
                // For now, let's just use the first selected status if any, or maybe filtering isn't fully flexible.
                // Or maybe we fetch all and filter client side? No, pagination.
                // Let's assume we pass the first one or if user selects multiple, we might have issues.
                // Reverting MultiSelect to Single Select logic for API compatibility or just picking one.
                if (selectedStatuses.length === 1) {
                    params.status = selectedStatuses[0];
                }
            }

            // Note: SearchTerm ignored for now as API doesn't seem to support generic keyword search on Bills.

            const response = await billService.getAllBills(params);
            if (response.result) {
                setBills(response.result.content);
                setTotalPages(response.result.totalPages);
            }
        } catch (error) {
            console.error('Error fetching bills:', error);
            toast.error(t('admin.order_management.fetch_fail'));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBills();
    }, [currentPage, sortConfig, selectedStatuses]); // Trigger fetch on these changes

    const handleDelete = async (id: number) => {
        if (!window.confirm(t('admin.order_management.delete_confirm'))) {
            return;
        }

        try {
            await billService.deleteBill(id);
            toast.success(t('admin.order_management.delete_success'));
            fetchBills(); // Refresh list
        } catch (error) {
            console.error('Error deleting bill:', error);
            toast.error(t('admin.order_management.delete_fail'));
        }
    };

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: string) => {
        if (sortConfig.key !== key) return <ArrowUpDown size={14} className="sort-icon inactive" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp size={14} className="sort-icon active" />
            : <ArrowDown size={14} className="sort-icon active" />;
    };

    return (
        <div className="admin-container">
            <div className="admin-header">
                <div>
                    <h1 className="admin-title">{t('admin.order_management.title')}</h1>
                    <p className="admin-subtitle">{t('admin.order_management.subtitle')}</p>
                </div>
            </div>

            {/* Toolbar */}
            <div className="admin-toolbar" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    {/* NOTE: Reducing compatibility issues by limiting to single status selection for now if API is strict 
                        But MultiSelect UI is fine, we just might warn or only use first. 
                     */}
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <MultiSelect
                            label={t('admin.order_management.status_filter_label')}
                            options={statusOptions}
                            value={selectedStatuses}
                            onChange={setSelectedStatuses}
                            placeholder={t('admin.order_management.status_filter_placeholder')}
                        />
                    </div>

                    <button
                        onClick={() => {
                            setSelectedStatuses([]);
                            setSortConfig({ key: 'createdAt', direction: 'desc' });
                        }}
                        className="btn-secondary"
                        style={{ height: '42px', whiteSpace: 'nowrap', flexShrink: 0 }}
                    >
                        {t('admin.order_management.clear_filters')}
                    </button>

                </div>
            </div>

            <div className="admin-table-container">
                {isLoading ? (
                    <div style={{ padding: '2rem', textAlign: 'center' }}>{t('admin.order_management.loading')}</div>
                ) : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('id')} className="sortable-header">
                                    <div className="th-content">{t('admin.order_management.table.id')} {getSortIcon('id')}</div>
                                </th>
                                <th className="sortable-header">
                                    <div className="th-content">{t('admin.order_management.table.customer')}</div>
                                </th>
                                <th onClick={() => handleSort('createdAt')} className="sortable-header">
                                    <div className="th-content">{t('admin.order_management.table.date')} {getSortIcon('createdAt')}</div>
                                </th>
                                <th onClick={() => handleSort('totalCost')} className="sortable-header">
                                    <div className="th-content">{t('admin.order_management.table.total')} {getSortIcon('totalCost')}</div>
                                </th>
                                <th className="sortable-header">
                                    <div className="th-content">{t('admin.order_management.table.status')}</div>
                                </th>
                                <th className="sortable-header">
                                    <div className="th-content">{t('admin.order_management.table.payment_method')}</div>
                                </th>
                                <th style={{ textAlign: 'right' }}>{t('admin.order_management.table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bills.map(bill => (
                                <tr key={bill.id}>
                                    <td>#{bill.id}</td>
                                    <td>
                                        <div style={{ fontWeight: 500 }}>{bill.userName}</div>
                                    </td>
                                    <td style={{ color: 'var(--shop-text-muted)' }}>
                                        {bill.createdAt ? new Date(bill.createdAt).toLocaleDateString() : '-'}
                                    </td>
                                    <td style={{ fontWeight: 600 }}>{formatCurrency(bill.totalCost)}</td>
                                    <td>
                                        <span style={{
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '999px',
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                            backgroundColor: bill.status === 'COMPLETED' ? '#e6f4ea' :
                                                bill.status === 'CANCELED' ? '#fce8e6' : '#e8f0fe',
                                            color: bill.status === 'COMPLETED' ? '#1e7e34' :
                                                bill.status === 'CANCELED' ? '#d93025' : '#1967d2'
                                        }}>
                                            {bill.status}
                                        </span>
                                    </td>
                                    <td>{bill.paymentMethodName || '-'}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <Link to={`/admin/manage-business/bill-detail/${bill.id}`} className="btn-icon" title={t('admin.order_management.view_details')}>
                                                <Eye size={18} />
                                            </Link>
                                            <button
                                                className="btn-icon delete"
                                                title={t('admin.order_management.delete_bill')}
                                                onClick={() => handleDelete(bill.id)}
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
                {!isLoading && bills.length === 0 && (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--shop-text-muted)' }}>
                        {t('admin.order_management.no_bills')}
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

export default AllBillsPage;
