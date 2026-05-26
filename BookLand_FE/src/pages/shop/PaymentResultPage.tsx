import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle } from 'lucide-react';
import Breadcrumb from '../../components/common/Breadcrumb';
import paymentApi from '../../api/paymentApi';
import { useTranslation } from 'react-i18next';

const PaymentResultPage = () => {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const verifyPayment = async () => {
            try {
                // Get all params from URL
                const params = searchParams.toString();
                const response = await paymentApi.getPaymentInfo(params);

                if (response.result.status === 'OK') {
                    setStatus('success');
                    setMessage(t('payment.success_msg'));
                } else {
                    setStatus('failed');
                    setMessage(t('payment.failed_msg'));
                }
            } catch (error) {
                console.error("Payment verification failed", error);
                setStatus('failed');
                setMessage(t('payment.verification_error'));
            }
        };

        verifyPayment();
    }, [searchParams, t]);

    return (
        <div className="payment-result-page" style={{ padding: '60px 0', minHeight: '80vh', backgroundColor: '#f0f0f0' }}>
            <div className="shop-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
                <Breadcrumb
                    items={[
                        { label: t('shop.home_breadcrumb'), link: '/shop/home' },
                        { label: t('shop.payment_result_breadcrumb', 'Result Payment') }
                    ]}
                />
                <div className="result-card" style={{ background: 'white', padding: '40px', borderRadius: '8px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>

                    {status === 'loading' && (
                        <div>
                            <h2>{t('payment.verifying')}</h2>
                        </div>
                    )}

                    {status === 'success' && (
                        <>
                            <div className="status-icon" style={{ marginBottom: '20px' }}>
                                <CheckCircle size={80} color="#28a745" />
                            </div>
                            <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '10px', color: '#28a745' }}>{t('payment.success_title')}</h1>
                            <p style={{ color: '#666', marginBottom: '30px' }}>{message}</p>
                        </>
                    )}

                    {status === 'failed' && (
                        <>
                            <div className="status-icon" style={{ marginBottom: '20px' }}>
                                <XCircle size={80} color="#dc3545" />
                            </div>
                            <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '10px', color: '#dc3545' }}>{t('payment.failed_title')}</h1>
                            <p style={{ color: '#666', marginBottom: '30px' }}>{message}</p>
                        </>
                    )}

                    <div className="actions" style={{ marginTop: '30px' }}>
                        <button
                            onClick={() => navigate('/shop/home')}
                            style={{
                                padding: '10px 20px',
                                background: '#333',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            {t('payment.back_home')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentResultPage;
