import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Save, ArrowLeft, Loader2, Image as ImageIcon } from 'lucide-react';
import GalleryModal from '../../../components/admin/GalleryModal';
import { BookStatus } from '../../../types/Book';
import type { BookRequest } from '../../../types/Book';
import type { Author } from '../../../types/Author';
import type { Publisher } from '../../../types/Publisher';
import type { Category } from '../../../types/Category';
import type { Serie } from '../../../types/Serie';
import bookService from '../../../api/bookService';
import authorService from '../../../api/authorService';
import publisherService from '../../../api/publisherService';
import categoryService from '../../../api/categoryService';
import serieService from '../../../api/serieService';
import '../../../styles/components/buttons.css';
import '../../../styles/components/forms.css';
import '../../../styles/pages/admin-management.css';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

const AdminBookDetailPage = () => {
    const { t } = useTranslation();
    const { id } = useParams();
    const navigate = useNavigate();
    const isNew = id === 'new';
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);

    // Dropdown Options
    const [authors, setAuthors] = useState<Author[]>([]);
    const [publishers, setPublishers] = useState<Publisher[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [series, setSeries] = useState<Serie[]>([]);

    const [formData, setFormData] = useState<BookRequest>({
        name: '',
        description: '',
        originalCost: 0,
        sale: 0,
        stock: 0,
        status: BookStatus.ENABLE,
        publishedDate: new Date().toISOString().split('T')[0],
        bookImageUrl: '',
        pin: false,
        authorId: 0,
        publisherId: 0,
        seriesId: undefined,
        categoryIds: []
    });

    // Fetch Options on Mount
    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const [authRes, pubRes, catRes, serRes] = await Promise.all([
                    authorService.getAllAuthors({ size: 100 }),
                    publisherService.getAllPublishers({ size: 100 }),
                    categoryService.getAll({ size: 100 }),
                    serieService.getAllSeries({ size: 100 })
                ]);

                if (authRes.result?.content) setAuthors(authRes.result.content);
                if (pubRes.result) setPublishers(pubRes.result.content); // Check response structure for publishers
                if (catRes.result?.content) setCategories(catRes.result.content);
                if (serRes.result?.content) setSeries(serRes.result.content);

            } catch (error) {
                console.error('Error fetching options:', error);
                toast.error(t('admin.book_detail.options_fail'));
            }
        };
        fetchOptions();
    }, []);

    // Fetch Book Data if Edit Mode
    useEffect(() => {
        if (!isNew && id) {
            const fetchBook = async () => {
                setIsLoading(true);
                try {
                    const response = await bookService.getBookById(Number(id));
                    if (response.result) {
                        const book = response.result;
                        setFormData({
                            name: book.name,
                            description: book.description || '',
                            originalCost: book.originalCost,
                            sale: book.sale,
                            stock: book.stock,
                            status: book.status,
                            publishedDate: book.publishedDate ? book.publishedDate.split('T')[0] : new Date().toISOString().split('T')[0],
                            bookImageUrl: book.bookImageUrl || '',
                            pin: book.pin,
                            authorId: book.authorId,
                            publisherId: book.publisherId,
                            seriesId: book.seriesId,
                            categoryIds: book.categoryIds || []
                        });
                    }
                } catch (error) {
                    console.error('Error fetching book:', error);
                    toast.error(t('admin.book_detail.fetch_fail'));
                    navigate('/admin/manage-information/book');
                } finally {
                    setIsLoading(false);
                }
            };
            fetchBook();
        }
    }, [id, isNew, navigate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        if (type === 'number') {
            setFormData(prev => ({ ...prev, [name]: Number(value) }));
        } else if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedOptions = Array.from(e.target.selectedOptions, option => Number(option.value));
        setFormData(prev => ({ ...prev, categoryIds: selectedOptions }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Basic Validation
        if (!formData.name || !formData.authorId || !formData.publisherId) {
            toast.error(t('admin.book_detail.validation_error'));
            return;
        }

        setIsSaving(true);
        try {
            if (isNew) {
                await bookService.createBook(formData);
                toast.success(t('admin.book_detail.create_success'));
            } else {
                await bookService.updateBook(Number(id), formData);
                toast.success(t('admin.book_detail.update_success'));
            }
            navigate('/admin/manage-information/book');
        } catch (error) {
            console.error('Error saving book:', error);
            toast.error(t('admin.book_detail.save_fail'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleGallerySelect = (selectedImages: { id: string; name: string; url: string }[]) => {
        if (selectedImages && selectedImages.length > 0) {
            setFormData(prev => ({ ...prev, bookImageUrl: selectedImages[0].url }));
            toast.success(t('admin.gallery_page.tooltips.copy_success')); // Or generic success
        }
    };

    if (isLoading) {
        return (
            <div className="admin-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <Loader2 className="animate-spin" size={48} />
            </div>
        );
    }

    return (
        <div className="admin-container">
            <div className="admin-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link to="/admin/manage-information/book" className="btn-secondary" style={{ padding: '0.5rem' }}>
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="admin-title">{isNew ? t('admin.book_detail.add_title') : t('admin.book_detail.edit_title')}</h1>
                        <p className="admin-subtitle">{isNew ? t('admin.book_detail.add_subtitle') : t('admin.book_detail.edit_subtitle', { id })}</p>
                    </div>
                </div>
                <button className="btn-primary" onClick={handleSubmit} disabled={isSaving}>
                    {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                    {isSaving ? t('admin.book_detail.saving') : t('admin.book_detail.save_btn')}
                </button>
            </div>

            <div className="form-container" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                {/* Left Column: Main Info */}
                <div className="card" style={{ padding: '1.5rem', backgroundColor: 'var(--shop-bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--shop-border)' }}>
                    <div className="form-group margin-bottom">
                        <label className="form-label">{t('admin.book_detail.form.name')}</label>
                        <input
                            type="text"
                            name="name"
                            className="form-input"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group margin-bottom">
                        <label className="form-label">{t('admin.book_detail.form.description')}</label>
                        <textarea
                            name="description"
                            className="form-textarea"
                            rows={5}
                            value={formData.description || ''}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="grid-2 margin-bottom" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label className="form-label">{t('admin.book_detail.form.original_price')}</label>
                            <input
                                type="number"
                                name="originalCost"
                                className="form-input"
                                value={formData.originalCost}
                                onChange={handleChange}
                                min={0}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('admin.book_detail.form.sale')}</label>
                            <input
                                type="number"
                                name="sale"
                                className="form-input"
                                value={formData.sale}
                                onChange={handleChange}
                                min={0}
                                max={100}
                            />
                        </div>
                    </div>

                    <div className="grid-2 margin-bottom" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label className="form-label">{t('admin.book_detail.form.stock')}</label>
                            <input
                                type="number"
                                name="stock"
                                className="form-input"
                                value={formData.stock}
                                onChange={handleChange}
                                min={0}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('admin.book_detail.form.published_date')}</label>
                            <input
                                type="date"
                                name="publishedDate"
                                className="form-input"
                                value={formData.publishedDate || ''}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                </div>

                {/* Right Column: Classification & Image */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="card" style={{ padding: '1.5rem', backgroundColor: 'var(--shop-bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--shop-border)' }}>
                        <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 600 }}>{t('admin.book_detail.form.status_visibility')}</h3>

                        <div className="form-group margin-bottom">
                            <label className="form-label">{t('admin.book_detail.form.status')}</label>
                            <select
                                name="status"
                                className="form-select"
                                value={formData.status}
                                onChange={handleChange}
                            >
                                <option value={BookStatus.ENABLE}>{t('admin.book_detail.form.status_enabled')}</option>
                                <option value={BookStatus.DISABLE}>{t('admin.book_detail.form.status_disabled')}</option>
                            </select>
                        </div>

                        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                                type="checkbox"
                                name="pin"
                                id="pin"
                                checked={formData.pin}
                                onChange={handleChange}
                                style={{ width: '1.2rem', height: '1.2rem' }}
                            />
                            <label htmlFor="pin" style={{ cursor: 'pointer' }}>{t('admin.book_detail.form.pin_homepage')}</label>
                        </div>
                    </div>

                    <div className="card" style={{ padding: '1.5rem', backgroundColor: 'var(--shop-bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--shop-border)' }}>
                        <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 600 }}>{t('admin.book_detail.form.classification')}</h3>

                        <div className="form-group margin-bottom">
                            <label className="form-label">{t('admin.book_detail.form.author')}</label>
                            <select
                                name="authorId"
                                className="form-select"
                                value={formData.authorId}
                                onChange={handleChange}
                                required
                            >
                                <option value={0}>{t('admin.book_detail.form.select_author')}</option>
                                {authors.map(a => (
                                    <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group margin-bottom">
                            <label className="form-label">{t('admin.book_detail.form.publisher')}</label>
                            <select
                                name="publisherId"
                                className="form-select"
                                value={formData.publisherId}
                                onChange={handleChange}
                                required
                            >
                                <option value={0}>{t('admin.book_detail.form.select_publisher')}</option>
                                {publishers.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group margin-bottom">
                            <label className="form-label">{t('admin.book_detail.form.categories')}</label>
                            <select
                                multiple
                                className="form-select"
                                style={{ height: '100px' }}
                                value={formData.categoryIds.map(String)}
                                onChange={handleCategoryChange}
                            >
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            <small style={{ color: 'var(--shop-text-muted)', fontSize: '0.8rem' }}>{t('admin.book_detail.form.categories_help')}</small>
                        </div>

                        <div className="form-group">
                            <label className="form-label">{t('admin.book_detail.form.series')}</label>
                            <select
                                name="seriesId"
                                className="form-select"
                                value={formData.seriesId || ''}
                                onChange={handleChange}
                            >
                                <option value="">{t('admin.book_detail.form.series_none')}</option>
                                {series.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="card" style={{ padding: '1.5rem', backgroundColor: 'var(--shop-bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--shop-border)' }}>
                        <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 600 }}>{t('admin.book_detail.form.book_image')}</h3>
                        <div className="form-group margin-bottom">
                            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>{t('admin.book_detail.form.image_url')}</span>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => setIsGalleryOpen(true)}
                                    style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', height: 'auto', minHeight: 'auto' }}
                                >
                                    <ImageIcon size={14} style={{ marginRight: '0.25rem' }} />
                                    {t('admin.book_detail.form.select_gallery')}
                                </button>
                            </label>
                            <input
                                type="text"
                                name="bookImageUrl"
                                className="form-input"
                                value={formData.bookImageUrl || ''}
                                onChange={handleChange}
                                placeholder="https://..."
                            />
                        </div>

                        {formData.bookImageUrl && (
                            <div style={{ width: '100%', height: '200px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--shop-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--shop-bg-secondary)' }}>
                                <img src={formData.bookImageUrl} alt="Preview" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <GalleryModal
                isOpen={isGalleryOpen}
                onClose={() => setIsGalleryOpen(false)}
                onSelect={handleGallerySelect}
                multiple={false}
                title={t('admin.book_detail.form.select_gallery')}
            />
        </div>
    );
};

export default AdminBookDetailPage;
