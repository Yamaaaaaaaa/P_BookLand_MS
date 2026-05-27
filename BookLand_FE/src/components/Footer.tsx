import { Link } from 'react-router-dom';
import { Facebook, Instagram, Youtube, Phone, Mail, MapPin, BookOpen } from 'lucide-react';
import '../styles/components/footer.css';
import { footerLinks } from '../data/mockNavigation';
import { useTranslation } from 'react-i18next';

const Footer = () => {
    const { t } = useTranslation();

    return (
        <footer className="shop-footer">
            <div className="shop-container">
                <div className="shop-footer__grid">
                    {/* Brand & About */}
                    <div className="shop-footer__brand">
                        <div className="shop-footer__logo">
                            <BookOpen size={22} className="shop-footer__logo-icon" />
                            <span>P-BookLand</span>
                        </div>
                        <p className="shop-footer__description">
                            {t('footer.description')}
                        </p>
                        <div className="shop-footer__contact">
                            <a href="tel:19001000" className="shop-footer__contact-item">
                                <Phone size={14} />
                                <span>1900 1000</span>
                            </a>
                            <a href="mailto:support@bookland.vn" className="shop-footer__contact-item">
                                <Mail size={14} />
                                <span>support@bookland.vn</span>
                            </a>
                            <div className="shop-footer__contact-item">
                                <MapPin size={14} />
                                <span>Hà Nội, Việt Nam</span>
                            </div>
                        </div>
                        <div className="shop-footer__social">
                            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="shop-footer__social-link" aria-label="Facebook">
                                <Facebook size={16} />
                            </a>
                            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="shop-footer__social-link" aria-label="Instagram">
                                <Instagram size={16} />
                            </a>
                            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="shop-footer__social-link" aria-label="Youtube">
                                <Youtube size={16} />
                            </a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="shop-footer__column-title">{t('footer.shop.title')}</h4>
                        <div className="shop-footer__links">
                            {footerLinks.shop.map((link) => (
                                <Link key={link.href} to={link.href} className="shop-footer__link">
                                    {t(link.label)}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Support */}
                    <div>
                        <h4 className="shop-footer__column-title">{t('footer.help.title')}</h4>
                        <div className="shop-footer__links">
                            {footerLinks.help.map((link) => (
                                <Link key={link.href} to={link.href} className="shop-footer__link">
                                    {t(link.label)}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Account */}
                    <div>
                        <h4 className="shop-footer__column-title">{t('footer.account.title')}</h4>
                        <div className="shop-footer__links">
                            {footerLinks.account.map((link) => (
                                <Link key={link.href} to={link.href} className="shop-footer__link">
                                    {t(link.label)}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="shop-footer__bottom">
                    <p className="shop-footer__copyright">
                        {t('footer.copyright')}
                    </p>
                    <div className="shop-footer__payment">
                        <span className="shop-footer__payment-label">{t('footer.payment_methods')}</span>
                        <div className="shop-footer__payment-badges">
                            <span className="shop-footer__payment-badge shop-footer__payment-badge--vnpay">VNPay</span>
                            <span className="shop-footer__payment-badge shop-footer__payment-badge--cod">COD</span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
