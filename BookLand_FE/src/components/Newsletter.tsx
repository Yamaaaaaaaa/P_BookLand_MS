import { useState } from 'react';
import '../styles/components/newsletter.css';
import { useTranslation } from 'react-i18next';

const Newsletter = () => {
    const [email, setEmail] = useState('');
    const { t } = useTranslation();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Subscribing email:', email);
        setEmail('');
    };

    return (
        <section className="newsletter-section">
            <div className="newsletter-container">
                <div className="newsletter-inner">
                    <div className="newsletter-content">
                        <h2 className="newsletter-title">
                            {t('home.newsletter.title')}
                        </h2>
                        <p className="newsletter-description">
                            {t('home.newsletter.desc')}
                        </p>
                        <form className="newsletter-form-group" onSubmit={handleSubmit}>
                            <input
                                type="email"
                                className="newsletter-email-input"
                                placeholder={t('home.newsletter.placeholder')}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                            <button type="submit" className="newsletter-submit-btn">
                                {t('home.newsletter.btn')}
                            </button>
                        </form>
                    </div>
                    <div className="newsletter-image-box">
                        <img
                            src="https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&h=600&fit=crop"
                            alt="Reading books"
                        />
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Newsletter;
