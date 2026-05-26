import '../../styles/pages/admin-management.css';
import { useTranslation } from 'react-i18next';

const DashboardPage = () => {
    const { t } = useTranslation();

    return (
        <div className="admin-container">
            <div className="admin-header">
                <div>
                    <h1 className="admin-title">{t('admin.dashboard_page.title')}</h1>
                    <p className="admin-subtitle">{t('admin.dashboard_page.subtitle')}</p>
                </div>
            </div>

            <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--shop-text-muted)', backgroundColor: 'var(--shop-bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--shop-border)' }}>
                {t('admin.dashboard_page.placeholder')}
            </div>
        </div>
    );
};

export default DashboardPage;
