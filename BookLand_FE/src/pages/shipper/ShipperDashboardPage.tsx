import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import billService from '../../api/billService';
import { getShipperEmailFromToken, logoutShipper } from '../../utils/auth';
import type { Bill } from '../../types/Bill';
import '../../styles/pages/shipper.css';
import { toast } from 'react-toastify';

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const ShipperDashboardPage = () => {
    const navigate = useNavigate();
    const [bills, setBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(true);
    const [confirmingId, setConfirmingId] = useState<number | null>(null);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const shipperEmail = getShipperEmailFromToken();
    const PAGE_SIZE = 10;

    const fetchOrders = useCallback(async (pageNum = 0) => {
        setLoading(true);
        try {
            const res = await billService.getShippingList({
                page: pageNum,
                size: PAGE_SIZE,
                sortBy: 'createdAt',
                sortDirection: 'DESC',
            });
            if (res.result) {
                setBills(res.result.content);
                setTotalPages(res.result.totalPages);
                setTotalElements(res.result.totalElements);
            }
        } catch (err) {
            console.error(err);
            toast.error('Không thể tải danh sách đơn hàng.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrders(page);
    }, [fetchOrders, page]);

    const handleConfirmDelivered = async (billId: number) => {
        if (confirmingId) return;
        setConfirmingId(billId);
        try {
            await billService.confirmDelivered(billId);
            toast.success(`✅ Đơn hàng #${billId} đã được xác nhận giao thành công!`);
            // Xóa đơn khỏi list ngay lập tức
            setBills((prev) => prev.filter((b) => b.id !== billId));
            setTotalElements((prev) => prev - 1);
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Xác nhận thất bại. Vui lòng thử lại.';
            toast.error(msg);
        } finally {
            setConfirmingId(null);
        }
    };

    const handleLogout = () => {
        logoutShipper();
        toast.info('Đã đăng xuất');
        navigate('/shop/shipper/login');
    };

    // formatCurrency and formatDate moved outside component

    return (
        <div className="shipper-dashboard">
            {/* Navbar */}
            <nav className="shipper-navbar">
                <div className="shipper-navbar-brand">
                    <span className="shipper-navbar-brand-icon">🚚</span>
                    BookLand Shipper
                </div>
                <div className="shipper-navbar-right">
                    <div className="shipper-navbar-user">
                        <span>👤</span>
                        <span>{shipperEmail || 'Shipper'}</span>
                    </div>
                    <button
                        id="shipper-logout-btn"
                        className="shipper-logout-btn"
                        onClick={handleLogout}
                    >
                        <span>🚪</span> Đăng xuất
                    </button>
                </div>
            </nav>

            <main className="shipper-main">
                {/* Header */}
                <div className="shipper-page-header">
                    <h1 className="shipper-page-title">Danh sách đơn hàng đang giao</h1>
                    <p className="shipper-page-subtitle">
                        Bấm "Xác nhận đã giao" sau khi giao hàng thành công cho khách
                    </p>
                </div>

                {/* Stats */}
                <div className="shipper-stats">
                    <div className="shipper-stat-card">
                        <span className="shipper-stat-icon">📦</span>
                        <div className="shipper-stat-content">
                            <div className="shipper-stat-value">{loading ? '—' : totalElements}</div>
                            <div className="shipper-stat-label">Đơn đang vận chuyển</div>
                        </div>
                    </div>
                    <div className="shipper-stat-card">
                        <span className="shipper-stat-icon">📄</span>
                        <div className="shipper-stat-content">
                            <div className="shipper-stat-value">{loading ? '—' : bills.length}</div>
                            <div className="shipper-stat-label">Hiển thị trang này</div>
                        </div>
                    </div>
                    <div className="shipper-stat-card">
                        <span className="shipper-stat-icon">🗂️</span>
                        <div className="shipper-stat-content">
                            <div className="shipper-stat-value">{page + 1} / {loading ? '—' : Math.max(totalPages, 1)}</div>
                            <div className="shipper-stat-label">Trang hiện tại</div>
                        </div>
                    </div>
                </div>

                {/* Orders Table */}
                <div className="shipper-orders-section">
                    <div className="shipper-orders-header">
                        <h2 className="shipper-orders-title">
                            📋 Đơn đang giao
                            {!loading && <span className="shipper-badge">{totalElements}</span>}
                        </h2>
                        <button
                            id="shipper-refresh-btn"
                            className="shipper-refresh-btn"
                            onClick={() => fetchOrders(page)}
                            disabled={loading}
                        >
                            🔄 {loading ? 'Đang tải...' : 'Làm mới'}
                        </button>
                    </div>

                    {loading ? (
                        <div className="shipper-loading">
                            <div className="shipper-spinner" />
                            <span>Đang tải danh sách đơn hàng...</span>
                        </div>
                    ) : bills.length === 0 ? (
                        <div className="shipper-empty-state">
                            <div className="shipper-empty-icon">🎉</div>
                            <p className="shipper-empty-text">Không còn đơn hàng nào cần giao!</p>
                            <p className="shipper-empty-sub">Tất cả đơn hàng đã được xử lý.</p>
                        </div>
                    ) : (
                        <div className="shipper-order-list">
                            {bills.map((bill) => (
                                <div key={bill.id} className="shipper-order-card">
                                    <div className="shipper-order-info">
                                        <p className="shipper-order-id">
                                            Đơn hàng #{bill.id}
                                            {' '}
                                            <span className="status-shipping">🚚 ĐANG GIAO</span>
                                        </p>
                                        <div className="shipper-order-meta">
                                            <span className="shipper-order-meta-item">
                                                👤 {bill.userName || `User #${bill.userId}`}
                                            </span>
                                            <span className="shipper-order-meta-item">
                                                📦 {bill.shippingMethodName}
                                            </span>
                                            <span className="shipper-order-meta-item">
                                                🕐 {formatDate(bill.createdAt)}
                                            </span>
                                        </div>
                                        {bill.books && bill.books.length > 0 && (
                                            <div className="shipper-order-books">
                                                📚 {bill.books.map((b) => `${b.bookName} x${b.quantity}`).join(' · ')}
                                            </div>
                                        )}
                                    </div>
                                    <div className="shipper-order-actions">
                                        <span className="shipper-order-cost">
                                            {formatCurrency(bill.totalCost)}
                                        </span>
                                        <button
                                            id={`shipper-confirm-btn-${bill.id}`}
                                            className="shipper-confirm-btn"
                                            onClick={() => handleConfirmDelivered(bill.id)}
                                            disabled={confirmingId === bill.id}
                                        >
                                            {confirmingId === bill.id ? (
                                                '⏳ Đang xử lý...'
                                            ) : (
                                                '✅ Xác nhận đã giao'
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {!loading && totalPages > 1 && (
                        <div className="shipper-pagination">
                            <span>
                                Trang {page + 1} / {totalPages} &nbsp;·&nbsp; Tổng {totalElements} đơn
                            </span>
                            <div className="shipper-pagination-btns">
                                <button
                                    id="shipper-prev-page"
                                    className="shipper-pagination-btn"
                                    onClick={() => setPage((p) => p - 1)}
                                    disabled={page === 0}
                                >
                                    ← Trước
                                </button>
                                <button
                                    id="shipper-next-page"
                                    className="shipper-pagination-btn"
                                    onClick={() => setPage((p) => p + 1)}
                                    disabled={page >= totalPages - 1}
                                >
                                    Tiếp →
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ShipperDashboardPage;
