import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Truck,
    CreditCard,
    MapPin,
    User as UserIcon,
    Phone,
    Mail,
    CheckCircle,
    ArrowLeft,
    ChevronRight,
    ShoppingBag,
    Package
} from 'lucide-react';
import '../../styles/pages/checkout.css';
import { formatCurrency } from '../../utils/formatters';
import { getCurrentUserId } from '../../utils/auth';
import { toast } from 'react-toastify';
import cartService from '../../api/cartService';
import userService from '../../api/userService';
import billService from '../../api/billService';
import shippingMethodService from '../../api/shippingMethodService';
import paymentMethodService from '../../api/paymentMethodService';
import type { CartItem } from '../../types/CartItem';
import type { ShippingMethod } from '../../types/ShippingMethod';
import type { PaymentMethod } from '../../types/PaymentMethod';
import type { BillPreviewDTO } from '../../api/billService';
import { useTranslation } from 'react-i18next';

const CheckoutPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const checkoutData = location.state || {};
    const billPreview = checkoutData.billPreview as BillPreviewDTO;

    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [shippingMethod, setShippingMethod] = useState<ShippingMethod | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    // Form states
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        address: '',
        city: 'Hà Nội',
        notes: '',
    });

    useEffect(() => {
        const loadCheckoutData = async () => {
            const userId = getCurrentUserId();
            if (!userId) {
                toast.error(t('checkout.login_required'));
                navigate('/shop/login');
                return;
            }

            if (!checkoutData.selectedBookIds || checkoutData.selectedBookIds.length === 0) {
                toast.warning(t('checkout.no_items_warning'));
                navigate('/shop/cart');
                return;
            }

            setIsLoading(true);
            try {
                // Load User Info
                const userRes = await userService.getOwnProfile();
                if (userRes.result) {
                    const u = userRes.result;
                    setFormData(prev => ({
                        ...prev,
                        fullName: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username,
                        email: u.email,
                        phone: u.phone || '',
                        address: u.addresses?.[0]?.addressDetail || '',
                        city: 'Hà Nội', // Address type doesn't have city, defaulting to Hanoi
                    }));
                }

                // Load Cart Items
                const cartRes = await cartService.getUserCart(userId);
                if (cartRes.result) {
                    const selectedItems = cartRes.result.items.filter((item: CartItem) =>
                        checkoutData.selectedBookIds.includes(item.bookId)
                    );
                    setCartItems(selectedItems);
                }

                // Load Shipping Method
                if (checkoutData.shippingMethodId) {
                    const shipRes = await shippingMethodService.getShippingMethodById(checkoutData.shippingMethodId);
                    if (shipRes.result) setShippingMethod(shipRes.result);
                }

                // Load Payment Method
                if (checkoutData.paymentMethodId) {
                    const payRes = await paymentMethodService.getById(checkoutData.paymentMethodId);
                    if (payRes.result) setPaymentMethod(payRes.result);
                }

            } catch (error) {
                console.error('Failed to load checkout data:', error);
                toast.error(t('checkout.load_error'));
            } finally {
                setIsLoading(false);
            }
        };

        loadCheckoutData();
    }, [checkoutData, navigate, t]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmitOrder = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.fullName || !formData.phone || !formData.address) {
            toast.warning(t('checkout.missing_info_warning'));
            return;
        }

        if (!shippingMethod || !paymentMethod) {
            toast.warning(t('checkout.missing_methods_warning'));
            return;
        }

        setIsProcessing(true);
        try {
            const userId = getCurrentUserId();
            if (!userId) {
                toast.error(t('checkout.user_not_found'));
                return;
            }

            const billRequest = {
                userId: userId,
                fullName: formData.fullName,
                email: formData.email,
                phone: formData.phone,
                address: formData.address,
                city: formData.city,
                notes: formData.notes,
                paymentMethodId: paymentMethod.id,
                shippingMethodId: shippingMethod.id,
                books: cartItems.map(item => ({
                    bookId: item.bookId,
                    quantity: item.quantity
                }))
            };

            const response = await billService.createBill(billRequest);

            if (response.result) {
                // Clear the cart after successful order
                try {
                    await cartService.clearCart(userId);
                } catch (clearError) {
                    console.error('Failed to clear cart:', clearError);
                    // We don't block the user if clear cart fails, as the bill is already created
                }

                toast.success(t('checkout.success_message'));
                window.dispatchEvent(new Event('cart:updated'));

                // Redirect to the placeholder payment page
                navigate(`/shop/payment/${response.result.id}`);
            }
        } catch (error) {
            console.error('Failed to place order:', error);
            toast.error(t('checkout.error_message'));
        } finally {
            setIsProcessing(false);
        }
    };

    const subtotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
    const shippingFee = shippingMethod?.price || 0;
    const total = subtotal + shippingFee;

    if (isLoading) {
        return (
            <div className="checkout-page">
                <div className="shop-container">
                    <div className="loading-state">
                        <div className="loader"></div>
                        <p>{t('checkout.processing')}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="checkout-page">
            <div className="shop-container">
                {/* Breadcrumbs-style Progress */}
                <div className="checkout-steps">
                    <div className="step done" onClick={() => navigate('/shop/cart')}>
                        <span>{t('checkout.step_cart')}</span>
                        <ChevronRight size={16} />
                    </div>
                    <div className="step active">
                        <span>{t('checkout.step_payment')}</span>
                        <ChevronRight size={16} />
                    </div>
                    <div className="step">
                        <span>{t('checkout.step_finish')}</span>
                    </div>
                </div>

                <div className="checkout-title-row">
                    <button className="btn-back" onClick={() => navigate('/shop/cart')}>
                        <ArrowLeft size={20} />
                    </button>
                    <h1>{t('checkout.title')}</h1>
                </div>

                <form onSubmit={handleSubmitOrder} className="checkout-grid">
                    {/* Left Column: Info Forms */}
                    <div className="checkout-main-col">
                        {/* Shipping Address Section */}
                        <div className="checkout-card">
                            <div className="card-header">
                                <MapPin size={22} color="#C92127" />
                                <h2>{t('checkout.shipping_info_title')}</h2>
                            </div>
                            <div className="card-body">
                                <div className="form-group">
                                    <label>{t('checkout.label_fullname')}</label>
                                    <div className="input-with-icon">
                                        <UserIcon size={18} />
                                        <input
                                            name="fullName"
                                            value={formData.fullName}
                                            onChange={handleInputChange}
                                            placeholder={t('checkout.placeholder_fullname')}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>{t('checkout.label_phone')}</label>
                                        <div className="input-with-icon">
                                            <Phone size={18} />
                                            <input
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleInputChange}
                                                placeholder={t('checkout.placeholder_phone')}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>{t('checkout.label_email')}</label>
                                        <div className="input-with-icon">
                                            <Mail size={18} />
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                placeholder={t('checkout.placeholder_email')}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>{t('checkout.label_address')}</label>
                                    <div className="input-with-icon">
                                        <MapPin size={18} />
                                        <input
                                            name="address"
                                            value={formData.address}
                                            onChange={handleInputChange}
                                            placeholder={t('checkout.placeholder_address')}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>{t('checkout.label_notes')}</label>
                                    <textarea
                                        name="notes"
                                        value={formData.notes}
                                        onChange={handleInputChange}
                                        placeholder={t('checkout.placeholder_notes')}
                                        rows={3}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Review Methods Section */}
                        <div className="checkout-card">
                            <div className="card-header">
                                <Package size={22} color="#C92127" />
                                <h2>{t('checkout.methods_title')}</h2>
                            </div>
                            <div className="card-body methods-review">
                                <div className="method-review-item">
                                    <div className="icon-box"><Truck size={20} /></div>
                                    <div className="method-info">
                                        <span className="label">{t('checkout.label_shipping')}</span>
                                        <span className="value">{shippingMethod?.name}</span>
                                        <span className="price">({formatCurrency(shippingFee)})</span>
                                    </div>
                                </div>
                                <div className="method-review-item">
                                    <div className="icon-box"><CreditCard size={20} /></div>
                                    <div className="method-info">
                                        <span className="label">{t('checkout.label_payment')}</span>
                                        <span className="value">{paymentMethod?.name}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Order Summary */}
                    <div className="checkout-sidebar-col">
                        <div className="checkout-summary-card">
                            <div className="card-header">
                                <ShoppingBag size={20} color="#333" />
                                <h3>{t('checkout.order_summary_title')}</h3>
                            </div>

                            <div className="checkout-items-preview">
                                {(billPreview?.books || cartItems).map(item => {
                                    // Handle both CartItem (from local) and BillPreviewBookDTO (from API)
                                    const bookId = 'bookId' in item ? item.bookId : (item as any).book.id;
                                    const bookName = 'bookName' in item ? item.bookName : (item as any).book.name;
                                    const bookImageUrl = 'bookImageUrl' in item ? item.bookImageUrl : (item as any).book.bookImageUrl;
                                    const quantity = item.quantity;
                                    const subtotal = item.subtotal;
                                    const originalPrice = 'originalPrice' in item ? item.originalPrice : (item as any).book.originalCost;
                                    const finalPrice = 'finalPrice' in item ? item.finalPrice : (item as any).finalPrice;
                                    const hasEventDiscount = 'hasEventDiscount' in item ? item.hasEventDiscount : false;

                                    return (
                                        <div key={bookId} className="preview-item">
                                            <div className="item-img">
                                                <img src={bookImageUrl} alt={bookName} />
                                            </div>
                                            <div className="item-meta">
                                                <div className="name">{bookName}</div>
                                                <div className="price-row">
                                                    {hasEventDiscount && (
                                                        <span className="old-price" style={{ textDecoration: 'line-through', color: '#999', fontSize: '11px', marginRight: '5px' }}>
                                                            {formatCurrency(originalPrice)}
                                                        </span>
                                                    )}
                                                    <span className="current-price" style={{ color: hasEventDiscount ? '#C92127' : '#888' }}>
                                                        {formatCurrency(finalPrice)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="item-qty">
                                                x{quantity}
                                            </div>
                                            <div className="item-total">
                                                {formatCurrency(subtotal)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="summary-breakdown">
                                {billPreview?.appliedEventName && (
                                    <div className="row event-row" style={{ color: '#28a745', fontSize: '12px', border: '1px dashed #28a745', padding: '8px', borderRadius: '4px', marginBottom: '10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <Package size={14} />
                                            <span>{t('checkout.promo_applied', { name: billPreview.appliedEventName })}</span>
                                        </div>
                                    </div>
                                )}
                                <div className="row">
                                    <span>{t('checkout.summary_subtotal')}</span>
                                    <span>{formatCurrency(billPreview?.originalSubtotal || subtotal)}</span>
                                </div>
                                {billPreview && (billPreview.originalSubtotal - billPreview.discountedSubtotal) > 0 && (
                                    <div className="row" style={{ color: '#28a745' }}>
                                        <span>{t('checkout.summary_discount')}</span>
                                        <span>-{formatCurrency(billPreview.originalSubtotal - billPreview.discountedSubtotal)}</span>
                                    </div>
                                )}
                                <div className="row">
                                    <span>{t('checkout.summary_shipping')}</span>
                                    <span>{formatCurrency(billPreview?.shippingCost || shippingFee)}</span>
                                </div>
                                <div className="divider"></div>
                                <div className="row total">
                                    <span>{t('checkout.summary_total')}</span>
                                    <span className="final-total">{formatCurrency(billPreview?.grandTotal || total)}</span>
                                </div>
                                <div className="vat-notice">{t('checkout.vat_notice')}</div>
                            </div>

                            <button
                                type="submit"
                                className={`btn-place-order ${isProcessing ? 'loading' : ''}`}
                                disabled={isProcessing}
                            >
                                {isProcessing ? t('checkout.processing') : t('checkout.place_order_button')}
                            </button>

                            <div className="security-shield">
                                <CheckCircle size={14} />
                                {t('checkout.security_shield')}
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CheckoutPage;
