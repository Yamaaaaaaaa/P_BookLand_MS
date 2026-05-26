import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle, ShoppingBag } from 'lucide-react';
import paymentApi from '../../api/paymentApi';
import { useTranslation, Trans } from 'react-i18next';
import { toast } from 'react-toastify';

const PaymentPage = () => {
    const { t } = useTranslation();
    const { billId } = useParams<{ billId: string }>();
    const navigate = useNavigate();

    const handlePayment = async () => {
        if (!billId) return;
        try {
            const response = await paymentApi.createPayment(Number(billId));
            if (response.result) {
                window.location.href = response.result.url;
            }
        } catch (error) {
            console.error("Payment creation failed", error);
            toast.error(t('payment.create_error'));
        }
    };

    return (
        <div className="payment-page" style={{ padding: '60px 0', minHeight: '80vh', backgroundColor: '#f0f0f0' }}>
            <div className="shop-container" style={{ maxWidth: '600px', margin: '0 auto' }}>
                <div className="payment-card" style={{ background: 'white', padding: '40px', borderRadius: '8px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    <div className="status-icon" style={{ marginBottom: '20px' }}>
                        <CheckCircle size={80} color="#28a745" />
                    </div>
                    <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '10px' }}>{t('payment.pending_title')}</h1>
                    <p style={{ color: '#666', marginBottom: '30px' }}>
                        <Trans i18nKey="payment.pending_msg" values={{ id: billId }} components={{ strong: <strong /> }} />
                    </p>

                    <div className="payment-actions" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <button
                            onClick={handlePayment}
                            style={{
                                width: '100%',
                                height: '48px',
                                background: '#005baa', // VnPay blue
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            {t('payment.pay_vnpay')}
                        </button>
                        <button
                            onClick={() => navigate('/shop/profile')}
                            style={{
                                width: '100%',
                                height: '48px',
                                background: 'white',
                                color: '#666',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontWeight: '700',
                                cursor: 'pointer'
                            }}
                        >
                            {t('payment.view_history')}
                        </button>
                        <button
                            onClick={() => navigate('/shop/home')}
                            style={{
                                width: '100%',
                                height: '48px',
                                background: 'white',
                                color: '#666',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            <ShoppingBag size={18} />
                            {t('payment.continue_shopping')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentPage;
