import React, { useState, useEffect } from 'react';
import { X, Upload, Check, Loader2, Image as ImageIcon } from 'lucide-react';
import uploadService from '../../api/uploadService';
import Pagination from './Pagination';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import '../../styles/components/gallery-modal.css';

interface GalleryImage {
    id: string;
    name: string;
    url: string;
}

interface GalleryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (selectedImages: GalleryImage[]) => void;
    multiple?: boolean;
    maxSelection?: number;
    title?: string;
}

const GalleryModal: React.FC<GalleryModalProps> = ({
    isOpen,
    onClose,
    onSelect,
    multiple = true,
    maxSelection,
    title = 'Select Images'
}) => {
    const { t } = useTranslation();
    const [images, setImages] = useState<GalleryImage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [page, setPage] = useState(0);
    const [size] = useState(10); // Slightly larger page size for modal grid
    const [totalPages, setTotalPages] = useState(0);

    const [selectedImages, setSelectedImages] = useState<GalleryImage[]>([]);

    useEffect(() => {
        if (isOpen) {
            fetchImages();
            setSelectedImages([]); // Reset selection on open
        }
    }, [isOpen, page]); // Fetch when opened or page changes

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
            toast.error(t('admin.common_modal.load_images_fail'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            setIsUploading(true);
            try {
                await uploadService.uploadMultipleImages(files);
                toast.success(t('admin.common_modal.upload_images_success'));
                // Refresh images immediately after upload
                setPage(0); // Go to first page to see new uploads
                fetchImages();
            } catch (error) {
                console.error('Error uploading images:', error);
                toast.error(t('admin.common_modal.upload_images_fail'));
            } finally {
                setIsUploading(false);
                e.target.value = '';
            }
        }
    };

    const toggleSelection = (img: GalleryImage) => {
        if (multiple) {
            const isSelected = selectedImages.some(item => item.id === img.id);
            if (isSelected) {
                setSelectedImages(selectedImages.filter(item => item.id !== img.id));
            } else {
                if (maxSelection && selectedImages.length >= maxSelection) {
                    toast.warning(t('admin.common_modal.max_selection_warning', { count: maxSelection }));
                    return;
                }
                setSelectedImages([...selectedImages, img]);
            }
        } else {
            setSelectedImages([img]);
        }
    };

    const handleConfirm = () => {
        onSelect(selectedImages);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="gallery-modal-overlay">
            <div className="gallery-modal-content">
                <div className="gallery-modal-header">
                    <div className="gallery-modal-title">{title}</div>
                    <button className="btn-icon" onClick={onClose} title="Close">
                        <X size={24} />
                    </button>
                </div>

                <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        {selectedImages.length > 0 && (
                            <span style={{ fontWeight: 500, color: 'var(--shop-primary-color)' }}>
                                {selectedImages.length} image{selectedImages.length !== 1 ? 's' : ''} selected
                            </span>
                        )}
                    </div>
                    <div>
                        <input
                            type="file"
                            id="modal-upload"
                            style={{ display: 'none' }}
                            accept="image/*"
                            multiple
                            onChange={handleFileUpload}
                            disabled={isUploading}
                        />
                        <label htmlFor="modal-upload" className="btn-primary" style={{ cursor: isUploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                            {isUploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                            {isUploading ? 'Uploading...' : 'Upload New'}
                        </label>
                    </div>
                </div>

                <div className="gallery-modal-body">
                    {isLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', flex: 1, alignItems: 'center' }}>
                            <Loader2 className="animate-spin" size={40} />
                        </div>
                    ) : images.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#aaa' }}>
                            <ImageIcon size={48} opacity={0.5} />
                            <p style={{ marginTop: '1rem' }}>No images found.</p>
                        </div>
                    ) : (
                        <div className="gallery-grid">
                            {images.map((img) => {
                                const isSelected = selectedImages.some(item => item.id === img.id);
                                return (
                                    <div
                                        key={img.id}
                                        className={`gallery-item ${isSelected ? 'selected' : ''}`}
                                        onClick={() => toggleSelection(img)}
                                    >
                                        <img src={img.url} alt={img.name} loading="lazy" />
                                        {isSelected && (
                                            <div className="gallery-item-overlay">
                                                <div className="check-icon">
                                                    <Check size={20} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="gallery-modal-footer">
                    <div style={{ flex: 1 }}>
                        {totalPages > 0 && (
                            <Pagination
                                currentPage={page + 1}
                                totalPages={totalPages}
                                onPageChange={(p) => setPage(p - 1)}
                            />
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button className="btn-secondary" onClick={onClose}>Cancel</button>
                        <button
                            className="btn-primary"
                            onClick={handleConfirm}
                            disabled={selectedImages.length === 0}
                        >
                            Confirm Selection ({selectedImages.length})
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GalleryModal;
