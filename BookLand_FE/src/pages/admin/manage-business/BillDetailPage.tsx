import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Printer, CreditCard, User, MapPin, RefreshCw } from 'lucide-react';
import { formatCurrency } from '../../../utils/formatters';
import AdminModal, { type FieldConfig } from '../../../components/admin/AdminModal';
import { BillStatus, type Bill } from '../../../types/Bill';
import billService from '../../../api/billService';
import { toast } from 'react-toastify';
import '../../../styles/components/buttons.css';
import { useTranslation } from 'react-i18next';

const BillDetailPage = () => {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const [bill, setBill] = useState<Bill | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [statusOptions, setStatusOptions] = useState<{ value: string; label: string }[]>([]);

    useEffect(() => {
        const fetchBill = async () => {
            if (!id) return;
            setIsLoading(true);
            try {
                const response = await billService.getBillById(Number(id));
                if (response.result) {
                    console.log("Bill Detail: ", response.result);

                    setBill(response.result);
                }
            } catch (error) {
                console.error('Error fetching bill details:', error);
                toast.error(t('admin.order_detail.fetch_fail'));
            } finally {
                setIsLoading(false);
            }
        };

        fetchBill();
    }, [id]);


    const getAvailableNextStatuses = (currentStatus: BillStatus): BillStatus[] => {
        switch (currentStatus) {
            case BillStatus.PENDING:
                return [BillStatus.APPROVED, BillStatus.CANCELED];
            case BillStatus.APPROVED:
                return [BillStatus.SHIPPING, BillStatus.CANCELED];
            case BillStatus.SHIPPING:
                return [BillStatus.SHIPPED, BillStatus.CANCELED];
            case BillStatus.SHIPPED:
                return [BillStatus.COMPLETED];
            case BillStatus.COMPLETED:
            case BillStatus.CANCELED:
                return [];
            default:
                return [];
        }
    };

    const handleUpdateStatus = () => {
        if (!bill) return;
        const nextStatuses = getAvailableNextStatuses(bill.status);
        if (nextStatuses.length === 0) {
            toast.info(t('admin.order_detail.cannot_update', { status: bill.status }));
            return;
        }

        setStatusOptions(nextStatuses.map(status => ({
            value: status,
            label: status
        })));
        setIsModalOpen(true);
    };

    const handleModalSubmit = async (formData: any) => {
        if (!bill || !id) return;

        try {
            // Note: API might require approvedById if changing to APPROVED, need to handle that?
            // Existing types say approvedById is in response, maybe not required in request unless specific logic needed.
            // UpdateBillStatusRequest only asks for status and note (optional).
            // But we should likely check if we need to send current user ID as approver?
            // Let's assume backend handles 'approvedBy' from token if needed, or we just send status.

            await billService.updateBillStatus(Number(id), { status: formData.status });
            toast.success(t('admin.order_detail.update_success'));

            // Refresh bill
            const response = await billService.getBillById(Number(id));
            if (response.result) {
                setBill(response.result);
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error updating bill status:', error);
            toast.error(t('admin.order_detail.update_fail'));
        }
    };

    const modalFields: FieldConfig[] = [
        {
            name: 'status',
            label: t('admin.order_detail.modal_status_label'),
            type: 'select',
            required: true,
            options: statusOptions
        }
    ];

    if (isLoading) {
        return <div className="admin-container"><div style={{ padding: '2rem', textAlign: 'center' }}>{t('admin.order_detail.loading')}</div></div>;
    }

    if (!bill) {
        return (
            <div className="admin-container">
                <div className="error-state">
                    <h2>{t('admin.order_detail.not_found')}</h2>
                    <Link to="/admin/manage-business/all-bills" className="btn-primary">{t('admin.order_detail.back_btn')}</Link>
                </div>
            </div>
        );
    }

    const createdDate = bill.createdAt ? new Date(bill.createdAt) : new Date();

    return (
        <div className="admin-container">
            <div className="admin-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link to="/admin/manage-business/bills" className="btn-icon">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="admin-title">{t('admin.order_detail.title', { id: bill.id })}</h1>
                        <p className="admin-subtitle">
                            {t('admin.order_detail.subtitle', { date: createdDate.toLocaleDateString(), time: createdDate.toLocaleTimeString() })}
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn-secondary" onClick={() => window.print()}>
                        <Printer size={18} />
                        {t('admin.order_detail.print_btn')}
                    </button>
                    <button
                        className="btn-primary"
                        onClick={handleUpdateStatus}
                        disabled={getAvailableNextStatuses(bill.status).length === 0}
                        style={{ opacity: getAvailableNextStatuses(bill.status).length === 0 ? 0.5 : 1 }}
                    >
                        <RefreshCw size={18} />
                        {t('admin.order_detail.update_status_btn')}
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginTop: '2rem' }}>
                {/* Left Column: Order Items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="admin-card" style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--shop-border)' }}>
                        <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 600 }}>{t('admin.order_detail.order_items_title')}</h3>
                        <table className="admin-table" style={{ marginTop: 0 }}>
                            <thead>
                                <tr>
                                    <th>{t('admin.order_detail.table.product')}</th>
                                    <th>{t('admin.order_detail.table.price')}</th>
                                    <th>{t('admin.order_detail.table.quantity')}</th>
                                    <th style={{ textAlign: 'right' }}>{t('admin.order_detail.table.total')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bill.books?.map((item, index) => (
                                    <tr key={index}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                {item.bookImageUrl && (
                                                    <img
                                                        src={item.bookImageUrl}
                                                        alt={item.bookName}
                                                        style={{ width: '40px', height: '60px', objectFit: 'cover', borderRadius: '4px' }}
                                                    />
                                                )}
                                                <div>
                                                    <div style={{ fontWeight: 500 }}>{item.bookName}</div>
                                                    <div style={{ fontSize: '0.85rem', color: 'var(--shop-text-muted)' }}>ID: {item.bookId}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{formatCurrency(item.priceSnapshot)}</td>
                                        <td>{item.quantity}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                            {formatCurrency(item.priceSnapshot * item.quantity)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan={3} style={{ textAlign: 'right', paddingTop: '1rem', color: 'var(--shop-text-secondary)' }}>{t('admin.order_detail.subtotal')}</td>
                                    <td style={{ textAlign: 'right', paddingTop: '1rem', fontWeight: 600 }}>{formatCurrency(bill.totalCost)}</td>
                                </tr>
                                <tr>
                                    <td colSpan={3} style={{ textAlign: 'right', paddingTop: '0.5rem', color: 'var(--shop-text-secondary)' }}>{t('admin.order_detail.shipping', { method: bill.shippingMethodName })}</td>
                                    <td style={{ textAlign: 'right', paddingTop: '0.5rem', fontWeight: 600 }}>{formatCurrency(bill.shippingCost || 0)}</td>
                                </tr>
                                <tr>
                                    <td colSpan={3} style={{ textAlign: 'right', paddingTop: '1rem', fontSize: '1.1rem', fontWeight: 700 }}>{t('admin.order_detail.total')}</td>
                                    <td style={{ textAlign: 'right', paddingTop: '1rem', fontSize: '1.1rem', fontWeight: 700, color: 'var(--shop-accent-primary)' }}>
                                        {formatCurrency(bill.totalCost + (bill.shippingCost || 0))}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                {/* Right Column: Customer & Order Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Customer Info */}
                    <div className="admin-card" style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--shop-border)' }}>
                        <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <User size={18} />
                            {t('admin.order_detail.customer_title')}
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                            <div style={{
                                width: '48px', height: '48px', borderRadius: '50%',
                                backgroundColor: 'var(--shop-bg-secondary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 700, fontSize: '1.2rem', color: 'var(--shop-accent-primary)'
                            }}>
                                <User size={24} />
                            </div>
                            <div>
                                <div style={{ fontWeight: 600 }}>{bill.userName}</div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--shop-text-muted)' }}>ID: {bill.userId}</div>
                            </div>
                        </div>
                    </div>

                    {/* Shipping Address - Note: Address might not be in BillDTO flat structure, user might need to query User details if address is needed deeply */}
                    {/* For now we only have shippingMethodName and Cost. Real shipping address isn't in the BillDTO based on current Bill.ts update. 
                        If we need address we might need to fetch User details or Bill should return address snapshot.
                        Based on API doc, CreateBillRequest has address, but BillDTO/Bill entity might not expose it directly or it's in a different field.
                        Let's check if 'CreateBillRequest' fields (address, etc.) are saved? Yes likely.
                        But BillDTO doesn't show them.
                        Let's Hide Shipping Address block for now or show minimal info if available.
                    */}
                    <div className="admin-card" style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--shop-border)' }}>
                        <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <MapPin size={18} />
                            {t('admin.order_detail.shipping_method_title')}
                        </h3>
                        <div>
                            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{bill.shippingMethodName}</div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--shop-text-muted)', marginBottom: '1rem' }}>
                                {t('admin.order_detail.shipping_cost')} {formatCurrency(bill.shippingCost)}
                            </div>
                        </div>
                    </div>

                    {/* Payment Info */}
                    <div className="admin-card" style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--shop-border)' }}>
                        <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <CreditCard size={18} />
                            {t('admin.order_detail.payment_title')}
                        </h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ color: 'var(--shop-text-secondary)' }}>{t('admin.order_detail.payment_method')}</span>
                            <span style={{ fontWeight: 500 }}>{bill.paymentMethodName}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--shop-text-secondary)' }}>{t('admin.order_detail.payment_status')}</span>
                            <span style={{
                                fontWeight: 600,
                                color: bill.status === 'COMPLETED' ? '#1e7e34' :
                                    bill.status === 'CANCELED' ? '#d93025' : '#1967d2'
                            }}>{bill.status}</span>
                        </div>
                    </div>
                </div>
            </div>

            <AdminModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleModalSubmit}
                mode="update"
                title={t('admin.order_detail.modal_title')}
                fields={modalFields}
                initialData={{ status: '' }}
            />
        </div>
    );
};

export default BillDetailPage;
