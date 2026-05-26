import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useEffect, useRef } from 'react';
import i18n from '../i18n';

interface ProtectedRouteProps {
    children?: React.ReactNode;
    checkAuth: () => boolean;
    redirectPath: string;
}

const ProtectedRoute = ({ children, checkAuth, redirectPath }: ProtectedRouteProps) => {
    const location = useLocation();
    const hasShownToast = useRef(false);

    const isAuthenticated = checkAuth();

    useEffect(() => {
        if (!isAuthenticated && !hasShownToast.current) {
            hasShownToast.current = true;
            toast.warn(i18n.t('auth.toast_login_required'), {
                toastId: 'login-required',
            });
        }
    }, [isAuthenticated]);

    if (!isAuthenticated) {
        return <Navigate to={redirectPath} state={{ from: location.pathname }} replace />;
    }

    return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
