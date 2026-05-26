import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag, Truck, CreditCard, Loader2 } from 'lucide-react';
import Breadcrumb from '../../components/common/Breadcrumb';
import '../../styles/pages/cart.css';
import cartService from '../../api/cartService';
import billService from '../../api/billService';
import shippingMethodService from '../../api/shippingMethodService';
import paymentMethodService from '../../api/paymentMethodService';
import { getCurrentUserId } from '../../utils/auth';
import { toast } from 'react-toastify';
import { formatCurrency } from '../../utils/formatters';
import type { CartItem } from '../../types/CartItem';
import type { ShippingMethod } from '../../types/ShippingMethod';
import type { PaymentMethod } from '../../types/PaymentMethod';
import { useTranslation } from 'react-i18next';

const CartPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
    const [selectedShippingId, setSelectedShippingId] = useState<number | null>(null);
    const [isShippingLoading, setIsShippingLoading] = useState(true);

    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(null);

    const fetchData = async () => {
        const userId = getCurrentUserId();
        if (!userId) {
            toast.warning(t('cart.login_required'));
            navigate('/shop/login');
            return;
        }

        setIsLoading(true);
        setIsShippingLoading(true);
        try {
            // Fetch cart
            const cartRes = await cartService.getMyCart();
            if (cartRes.result && cartRes.result.items) {
                setCartItems(cartRes.result.items);
                if (selectedIds.length === 0) {
                    setSelectedIds(cartRes.result.items.map((item: CartItem) => item.bookId));
                }
            }
        } catch (error) {
            console.error('Failed to fetch cart data:', error);
            toast.error(t('product.load_error'));
        } finally {
            setIsLoading(false);
        }

        try {
            // Fetch shipping and payment methods concurrently
            const [shipRes, payRes] = await Promise.all([
                shippingMethodService.getAllShippingMethods(),
                paymentMethodService.getAll()
            ]);

            if (shipRes.result && shipRes.result.content) {
                setShippingMethods(shipRes.result.content);
                if (shipRes.result.content.length > 0) {
                    setSelectedShippingId(shipRes.result.content[0].id);
                }
            }

            if (payRes.result && payRes.result.content) {
                setPaymentMethods(payRes.result.content);
                if (payRes.result.content.length > 0) {
                    setSelectedPaymentId(payRes.result.content[0].id);
                }
            }
        } catch (error) {
            console.error('Failed to fetch shipping/payment methods:', error);
        } finally {
            setIsShippingLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [t]);

    // Debounce timers: bookId -> NodeJS.Timeout
    const debounceTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

    const updateQuantity = (bookId: number, currentQuantity: number, delta: number) => {
        const item = cartItems.find(i => i.bookId === bookId);
        if (!item) return;

        const newQuantity = currentQuantity + delta;
        if (newQuantity < 1) return;
        if (newQuantity > item.availableStock) return;

        // Snapshot state cũ để rollback nếu API lỗi
        const previousItems = cartItems;

        // Optimistic update: cập nhật UI ngay
        setCartItems(prev => prev.map(i =>
            i.bookId === bookId
                ? { ...i, quantity: newQuantity, subtotal: i.finalPrice * newQuantity }
                : i
        ));

        // Hủy timer cũ nếu user vẫn đang nhấn
        if (debounceTimers.current[bookId]) {
            clearTimeout(debounceTimers.current[bookId]);
        }

        // Gọi API ngầm sau 600ms dừng nhấn
        const userId = getCurrentUserId();
        if (!userId) return;
        debounceTimers.current[bookId] = setTimeout(async () => {
            try {
                await cartService.updateCartItem(userId, bookId, { quantity: newQuantity });
            } catch (error) {
                console.error('Failed to sync quantity:', error);
                toast.error(t('cart.update_error'));
                // Rollback về state cũ nếu API lỗi
                setCartItems(previousItems);
            }
        }, 600);
    };

    const removeItem = async (bookId: number) => {
        try {
            await cartService.removeMultipleFromMyCart([bookId]);
            setCartItems(items => items.filter(item => item.bookId !== bookId));
            setSelectedIds(ids => ids.filter(id => id !== bookId));
            toast.success(t('cart.remove_success'));
            window.dispatchEvent(new Event('cart:updated'));
        } catch (error) {
            console.error('Failed to remove item:', error);
            toast.error(t('cart.remove_error'));
        }
    };

    const removeSelectedItems = async () => {
        if (selectedIds.length === 0) return;
        try {
            await cartService.removeMultipleFromMyCart(selectedIds);
            setCartItems(items => items.filter(item => !selectedIds.includes(item.bookId)));
            setSelectedIds([]);
            toast.success(t('cart.remove_selected_success'));
            window.dispatchEvent(new Event('cart:updated'));
        } catch (error) {
            console.error('Failed to remove selected items:', error);
            toast.error(t('cart.remove_error'));
        }
    };

    const toggleSelect = (bookId: number) => {
        setSelectedIds(prev =>
            prev.includes(bookId) ? prev.filter(id => id !== bookId) : [...prev, bookId]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === cartItems.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(cartItems.map(item => item.bookId));
        }
    };

    const handleConfirmOrder = async () => {
        if (selectedIds.length === 0) return;
        if (!selectedShippingId || !selectedPaymentId) {
            toast.warning(t('cart.select_shipping_payment_warning'));
            return;
        }

        setIsLoading(true);
        try {
            const previewRequest = {
                books: selectedItemsList.map(item => ({
                    bookId: item.bookId,
                    quantity: item.quantity
                })),
                shippingMethodId: selectedShippingId
            };

            const response = await billService.previewBill(previewRequest);
            if (response.result) {
                navigate('/shop/checkout', {
                    state: {
                        selectedBookIds: selectedIds,
                        shippingMethodId: selectedShippingId,
                        paymentMethodId: selectedPaymentId,
                        billPreview: response.result
                    }
                });
            }
        } catch (error) {
            console.error('Failed to preview bill:', error);
            toast.error(t('checkout.load_error'));
        } finally {
            setIsLoading(false);
        }
    };

    const selectedItemsList = useMemo(() => {
        return cartItems.filter(item => selectedIds.includes(item.bookId));
    }, [cartItems, selectedIds]);

    const itemsSubtotal = useMemo(() => {
        return selectedItemsList.reduce((sum, item) => sum + item.subtotal, 0);
    }, [selectedItemsList]);

    const shippingPrice = useMemo(() => {
        const selectedShipping = shippingMethods.find(s => s.id === selectedShippingId);
        return selectedShipping ? selectedShipping.price : 0;
    }, [shippingMethods, selectedShippingId]);

    const totalAmount = useMemo(() => itemsSubtotal + shippingPrice, [itemsSubtotal, shippingPrice]);

    if (isLoading && cartItems.length === 0) {
        return (
            <div className="cart-page">
                <div className="shop-container">
                    <div className="loading-state">
                        <div className="loader"></div>
                        <p>{t('shop.loading')}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="cart-page">
            <div className="shop-container">
                <Breadcrumb
                    items={[
                        { label: t('shop.home_breadcrumb'), link: '/shop/home' },
                        { label: t('cart.breadcrumb') }
                    ]}
                />
                <div className="cart-header-title">
                    {t('cart.title')} <span>{t('cart.item_count', { count: cartItems.length })}</span>
                </div>

                {cartItems.length === 0 ? (
                    <div className="cart-empty-state">
                        <ShoppingBag size={80} color="#ddd" />
                        <p>{t('cart.empty')}</p>
                        <Link to="/shop/home" className="btn-go-shopping">{t('cart.go_shopping')}</Link>
                    </div>
                ) : (
                    <div className="cart-grid-layout">
                        {/* Left Column: Items */}
                        <div className="cart-main-col">
                            <div className="cart-select-all-bar">
                                <label className="cart-checkbox-wrapper">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.length === cartItems.length && cartItems.length > 0}
                                        onChange={toggleSelectAll}
                                    />
                                    <span className="checkmark"></span>
                                    {t('cart.select_all')} ({t('cart.item_count', { count: cartItems.length })})
                                </label>
                                {selectedIds.length > 0 && (
                                    <button
                                        className="btn-delete-selected"
                                        onClick={removeSelectedItems}
                                    >
                                        <Trash2 size={14} />
                                        {t('cart.remove_selected', { count: selectedIds.length })}
                                    </button>
                                )}
                                <div className="bar-labels">
                                    <span className="bar-label-qty">{t('cart.label_quantity')}</span>
                                    <span className="bar-label-subtotal">{t('cart.label_subtotal')}</span>
                                    <div className="bar-label-spacer"></div>
                                </div>
                            </div>

                            <div className="cart-items-list">
                                {cartItems.map(item => (
                                    <div key={item.bookId} className="cart-item-card">
                                        <div className="item-checkbox">
                                            <label className="cart-checkbox-wrapper">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(item.bookId)}
                                                    onChange={() => toggleSelect(item.bookId)}
                                                />
                                                <span className="checkmark"></span>
                                            </label>
                                        </div>
                                        <div className="item-image">
                                            <img src={item.bookImageUrl || 'https://via.placeholder.com/150'} alt={item.bookName} />
                                        </div>
                                        <div className="item-info">
                                            <Link to={`/shop/book-detail/${item.bookId}`} className="item-name">
                                                {item.bookName}
                                            </Link>
                                            <div className="item-price-row">
                                                <span className="item-current-price">
                                                    {formatCurrency(item.finalPrice)}
                                                </span>
                                                {item.salePrice > 0 && (
                                                    <span className="item-old-price">
                                                        {formatCurrency(item.originalPrice)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="item-quantity-col">
                                            <div className="item-quantity-control">
                                                <button
                                                    onClick={() => updateQuantity(item.bookId, item.quantity, -1)}
                                                    disabled={item.quantity <= 1}
                                                ><Minus size={14} /></button>
                                                <input type="text" value={item.quantity} readOnly />
                                                <button
                                                    onClick={() => updateQuantity(item.bookId, item.quantity, 1)}
                                                    disabled={item.quantity >= item.availableStock}
                                                ><Plus size={14} /></button>
                                            </div>
                                            <div className="item-available-stock">
                                                {t('cart.available_stock', { count: item.availableStock })}
                                            </div>
                                        </div>
                                        <div className="item-subtotal-col">
                                            <span className="item-subtotal">
                                                {formatCurrency(item.subtotal)}
                                            </span>
                                        </div>
                                        <div className="item-remove-col">
                                            <button className="btn-remove-item" onClick={() => removeItem(item.bookId)}>
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right Column: Checkout Config & Summary */}
                        <div className="cart-sidebar-col">
                            <div className="checkout-config-card">
                                {/* Shipping Method */}
                                <div className="config-section">
                                    <div className="config-title">
                                        <Truck size={18} color="#C92127" />
                                        <span>{t('cart.shipping_method_title')}</span>
                                    </div>
                                    <div className="config-options">
                                        {isShippingLoading ? (
                                            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
                                                <Loader2 className="animate-spin" size={24} color="#C92127" />
                                            </div>
                                        ) : (
                                            shippingMethods.map(method => (
                                                <label
                                                    key={method.id}
                                                    className={`option-item ${selectedShippingId === method.id ? 'active' : ''}`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="shippingMethod"
                                                        className="option-radio"
                                                        checked={selectedShippingId === method.id}
                                                        onChange={() => setSelectedShippingId(method.id)}
                                                    />
                                                    <div className="option-info">
                                                        <span className="option-name">{method.name}</span>
                                                        <span className="option-price">{formatCurrency(method.price)}</span>
                                                        {method.description && <span className="option-desc">{method.description}</span>}
                                                    </div>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Payment Method */}
                                <div className="config-section">
                                    <div className="config-title">
                                        <CreditCard size={18} color="#C92127" />
                                        <span>{t('cart.payment_method_title')}</span>
                                    </div>
                                    <div className="config-options">
                                        {isShippingLoading ? (
                                            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
                                                <Loader2 className="animate-spin" size={24} color="#C92127" />
                                            </div>
                                        ) : (
                                            paymentMethods.map(method => (
                                                <label
                                                    key={method.id}
                                                    className={`option-item ${selectedPaymentId === method.id ? 'active' : ''}`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="paymentMethod"
                                                        className="option-radio"
                                                        checked={selectedPaymentId === method.id}
                                                        onChange={() => setSelectedPaymentId(method.id)}
                                                    />
                                                    <div className="option-info">
                                                        <span className="option-name">{method.name}</span>
                                                        {method.description && <span className="option-desc">{method.description}</span>}
                                                    </div>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="cart-summary-card">
                                <div className="summary-row">
                                    <span>{t('cart.summary_subtotal')}</span>
                                    <span>{formatCurrency(itemsSubtotal)}</span>
                                </div>
                                <div className="summary-row">
                                    <span>{t('cart.summary_shipping')}</span>
                                    <span>{formatCurrency(shippingPrice)}</span>
                                </div>
                                <div className="summary-total-row">
                                    <span>{t('cart.summary_total')}</span>
                                    <span className="total-value">{formatCurrency(totalAmount)}</span>
                                </div>
                                <button
                                    className={`btn-checkout ${selectedIds.length === 0 ? 'disabled' : ''}`}
                                    disabled={selectedIds.length === 0}
                                    onClick={handleConfirmOrder}
                                >
                                    {t('cart.confirm_order')}
                                </button>
                                <div className="checkout-note">{t('cart.checkout_note')}</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CartPage;
