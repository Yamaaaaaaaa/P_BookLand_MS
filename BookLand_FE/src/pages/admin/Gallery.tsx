import { useState, useEffect } from 'react';
import { Copy, Eye, Trash2, Loader2, Upload, X, Image as ImageIcon } from 'lucide-react';
import Pagination from '../../components/admin/Pagination';
import uploadService from '../../api/uploadService';
import { toast } from 'react-toastify';
import '../../styles/components/buttons.css';
import { useTranslation } from 'react-i18next';

interface GalleryImage {
    id: string;
    name: string;
    url: string;
}

const Gallery = () => {
    const { t } = useTranslation();
    const [images, setImages] = useState<GalleryImage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [page, setPage] = useState(0);
    const [size] = useState(10);
    const [totalPages, setTotalPages] = useState(0);

    const fetchImages = async () => {
        setIsLoading(true);
        try {
            const response = await uploadService.getAllImages({ page, size, sortBy: 'created_at', sortDirection: 'DESC' });
            if (response.result && response.result.content) {
                const imageList: GalleryImage[] = response.result.content.map((item: any) => ({
                    id: item.id,
                    name: item.name,
                    url: item.publicUrl
                }));
                setImages(imageList);
                if (response.result.totalPages !== undefined) {
                    setTotalPages(response.result.totalPages);
                }
            }
        } catch (error) {
            console.error('Error fetching images:', error);
            toast.error(t('admin.gallery_page.load_fail'));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchImages();
    }, [page, size]);

    const handleCopyUrl = (url: string) => {
        navigator.clipboard.writeText(url);
        toast.success(t('admin.gallery_page.copy_success'));
    };

    const handleDelete = async (fileName: string) => {
        if (window.confirm(t('admin.gallery_page.confirm_delete', { name: fileName }))) {
            try {
                await uploadService.deleteImage(fileName);
                toast.success(t('admin.gallery_page.delete_success'));
                fetchImages();
            } catch (error) {
                console.error('Error deleting image:', error);
                toast.error(t('admin.gallery_page.delete_fail'));
            }
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            setIsUploading(true);
            try {
                await uploadService.uploadMultipleImages(files);
                toast.success(t('admin.gallery_page.upload_success'));
                fetchImages();
            } catch (error) {
                console.error('Error uploading images:', error);
                toast.error(t('admin.gallery_page.upload_fail'));
            } finally {
                setIsUploading(false);
                // Reset input
                e.target.value = '';
            }
        }
    };

    return (
        <div className="admin-container">
            <div className="admin-header">
                <div>
                    <h1 className="admin-title">{t('admin.gallery_page.title')}</h1>
                    <p className="admin-subtitle">{t('admin.gallery_page.subtitle')}</p>
                </div>
                <div>
                    <input
                        type="file"
                        id="gallery-upload"
                        style={{ display: 'none' }}
                        accept="image/*"
                        multiple
                        onChange={handleFileUpload}
                        disabled={isUploading}
                    />
                    <label htmlFor="gallery-upload" className="btn-primary" style={{ cursor: isUploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {isUploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                        {isUploading ? t('admin.gallery_page.uploading') : t('admin.gallery_page.upload_btn')}
                    </label>
                </div>
            </div>

            <div className="admin-table-container">
                {isLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                        <Loader2 className="animate-spin" size={40} />
                    </div>
                ) : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th style={{ width: '50px' }}>{t('admin.gallery_page.table.stt')}</th>
                                <th style={{ width: '100px' }}>{t('admin.gallery_page.table.image')}</th>
                                <th>{t('admin.gallery_page.table.name')}</th>
                                <th style={{ width: '150px', textAlign: 'right' }}>{t('admin.gallery_page.table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {images.map((img, index) => (
                                <tr key={index}>
                                    <td>{page * size + index + 1}</td>
                                    <td>
                                        <div
                                            style={{
                                                width: '60px',
                                                height: '60px',
                                                borderRadius: '8px',
                                                overflow: 'hidden',
                                                border: '1px solid var(--shop-border-color)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                backgroundColor: '#f8f9fa'
                                            }}
                                        >
                                            <img
                                                src={img.url}
                                                alt={img.name}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = 'https://placehold.co/60x60?text=No+Image';
                                                }}
                                            />
                                        </div>
                                    </td>
                                    <td style={{ fontWeight: 500, wordBreak: 'break-all' }}>{img.name}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button
                                                className="btn-icon"
                                                title={t('admin.gallery_page.tooltips.copy')}
                                                onClick={() => handleCopyUrl(img.url)}
                                            >
                                                <Copy size={18} />
                                            </button>
                                            <button
                                                className="btn-icon"
                                                title={t('admin.gallery_page.tooltips.view')}
                                                onClick={() => setPreviewImage(img.url)}
                                            >
                                                <Eye size={18} />
                                            </button>
                                            <button
                                                className="btn-icon delete"
                                                title={t('admin.gallery_page.tooltips.delete')}
                                                onClick={() => handleDelete(img.name)}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                {!isLoading && images.length === 0 && (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--shop-text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                        <ImageIcon size={48} opacity={0.5} />
                        <p>{t('admin.gallery_page.no_images')}</p>
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            {!isLoading && totalPages > 0 && (
                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <Pagination
                        currentPage={page + 1}
                        totalPages={totalPages}
                        onPageChange={(p) => setPage(p - 1)}
                    />
                </div>
            )}

            {/* Image Preview Modal */}
            {previewImage && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.85)',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '2rem'
                    }}
                    onClick={() => setPreviewImage(null)}
                >
                    <button
                        style={{
                            position: 'absolute',
                            top: '20px',
                            right: '20px',
                            background: 'none',
                            border: 'none',
                            color: 'white',
                            cursor: 'pointer'
                        }}
                        onClick={() => setPreviewImage(null)}
                    >
                        <X size={32} />
                    </button>
                    <img
                        src={previewImage}
                        alt="Preview"
                        style={{
                            maxWidth: '100%',
                            maxHeight: '90vh',
                            borderRadius: '8px',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
};

export default Gallery;
