import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setShipperToken, setShipperRefreshToken } from '../../../utils/auth';
import authService from '../../../api/authService';
import '../../../styles/pages/shipper.css';
import { toast } from 'react-toastify';

const ShipperLoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            // Shipper dùng cùng endpoint login như customer (ROLE_USER + ROLE_SHIPPER)
            const response = await authService.login({ email, password });
            if (response.result) {
                const { accessToken, refreshToken } = response.result;

                // Kiểm tra token có role SHIPPER không
                const payload = JSON.parse(atob(accessToken.split('.')[1]));
                const scope: string = payload.scope || '';
                if (!scope.includes('ROLE_SHIPPER')) {
                    setError('Tài khoản này không có quyền Shipper. Vui lòng liên hệ Admin.');
                    toast.error('Tài khoản không có quyền Shipper');
                    setLoading(false);
                    return;
                }

                setShipperToken(accessToken);
                setShipperRefreshToken(refreshToken);
                toast.success('Đăng nhập thành công! Chào mừng Shipper.');
                navigate('/shop/shipper');
            }
        } catch (err: any) {
            console.error(err);
            setError('Email hoặc mật khẩu không chính xác.');
            toast.error('Đăng nhập thất bại');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="shipper-login-page">
            <div className="shipper-login-card">
                <div className="shipper-login-header">
                    <div className="shipper-login-icon">🚚</div>
                    <h1 className="shipper-login-title">Shipper Portal</h1>
                    <p className="shipper-login-subtitle">Đăng nhập để quản lý đơn giao hàng</p>
                </div>

                <form className="shipper-form" onSubmit={handleSubmit}>
                    <div className="shipper-form-group">
                        <label className="shipper-form-label">Email</label>
                        <div className="shipper-input-wrapper">
                            <span className="shipper-input-icon">✉</span>
                            <input
                                id="shipper-email"
                                type="email"
                                className="shipper-input"
                                placeholder="Nhập email của bạn"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                            />
                        </div>
                    </div>

                    <div className="shipper-form-group">
                        <label className="shipper-form-label">Mật khẩu</label>
                        <div className="shipper-input-wrapper">
                            <span className="shipper-input-icon">🔒</span>
                            <input
                                id="shipper-password"
                                type={showPassword ? 'text' : 'password'}
                                className="shipper-input"
                                placeholder="Nhập mật khẩu"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                className="shipper-toggle-password"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex={-1}
                            >
                                {showPassword ? '🙈' : '👁'}
                            </button>
                        </div>
                    </div>

                    {error && <div className="shipper-login-error">{error}</div>}

                    <button
                        id="shipper-login-submit"
                        type="submit"
                        className="shipper-submit-btn"
                        disabled={loading}
                    >
                        {loading ? 'Đang đăng nhập...' : '🚀 Đăng nhập'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ShipperLoginPage;
