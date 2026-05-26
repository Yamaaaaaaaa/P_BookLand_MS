import React, { useState, useEffect } from 'react';
import { X, Save, Image as ImageIcon } from 'lucide-react';
import GalleryModal from './GalleryModal';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import '../../styles/components/buttons.css';
import '../../styles/components/forms.css';
import '../../styles/pages/admin-management.css';

export interface FieldConfig {
    name: string;
    label: string;
    type: 'text' | 'number' | 'textarea' | 'image' | 'select' | 'checkbox';
    required?: boolean;
    options?: { value: string | number; label: string }[];
    placeholder?: string;
    disabled?: boolean;
}

interface AdminModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    mode: 'create' | 'update' | 'view';
    title: string;
    fields: FieldConfig[];
    initialData?: any;
}

const AdminModal: React.FC<AdminModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    mode,
    title,
    fields,
    initialData
}) => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState<any>({});
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [activeField, setActiveField] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            if (initialData && (mode === 'update' || mode === 'view')) {
                setFormData({ ...initialData });
            } else {
                // Reset for create mode
                const defaultData: any = {};
                fields.forEach(field => {
                    if (field.type === 'checkbox') defaultData[field.name] = false;
                    else defaultData[field.name] = '';
                });
                setFormData(defaultData);
            }
        }
    }, [isOpen, initialData, mode, fields]);

    if (!isOpen) return null;

    const handleChange = (name: string, value: any) => {
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    const handleOpenGallery = (fieldName: string) => {
        if (isViewMode) return;
        setActiveField(fieldName);
        setIsGalleryOpen(true);
    };

    const handleGallerySelect = (selectedImages: { id: string; name: string; url: string }[]) => {
        if (selectedImages && selectedImages.length > 0 && activeField) {
            handleChange(activeField, selectedImages[0].url);
            toast.success(t('admin.common_modal.image_selected'));
        }
    };

    const isViewMode = mode === 'view';

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h3 className="modal-title">{title}</h3>
                    <button onClick={onClose} className="modal-close">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    {fields.map((field) => (
                        <div key={field.name} className="form-group margin-bottom">
                            {field.type !== 'checkbox' && (
                                <label className="form-label">
                                    {field.label} {field.required && <span style={{ color: 'red' }}>*</span>}
                                </label>
                            )}

                            {field.type === 'textarea' ? (
                                <textarea
                                    className="form-textarea"
                                    rows={4}
                                    value={formData[field.name] || ''}
                                    onChange={(e) => handleChange(field.name, e.target.value)}
                                    placeholder={field.placeholder}
                                    disabled={isViewMode || field.disabled}
                                    required={field.required}
                                />
                            ) : field.type === 'select' ? (
                                <select
                                    className="form-select"
                                    value={formData[field.name] || ''}
                                    onChange={(e) => handleChange(field.name, e.target.value)}
                                    disabled={isViewMode || field.disabled}
                                    required={field.required}
                                >
                                    <option value="">Select {field.label}</option>
                                    {field.options?.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            ) : field.type === 'checkbox' ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input
                                        type="checkbox"
                                        id={`field-${field.name}`}
                                        checked={!!formData[field.name]}
                                        onChange={(e) => handleChange(field.name, e.target.checked)}
                                        disabled={isViewMode || field.disabled}
                                    />
                                    <label htmlFor={`field-${field.name}`} style={{ cursor: 'pointer' }}>{field.label}</label>
                                </div>
                            ) : field.type === 'image' ? (
                                <div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData[field.name] || ''}
                                            onChange={(e) => handleChange(field.name, e.target.value)}
                                            placeholder={field.placeholder || "https://..."}
                                            disabled={isViewMode || field.disabled}
                                            required={field.required}
                                        />
                                        {!isViewMode && !field.disabled && (
                                            <button
                                                type="button"
                                                className="btn-secondary"
                                                onClick={() => handleOpenGallery(field.name)}
                                                title="Select from Gallery"
                                            >
                                                <ImageIcon size={18} />
                                            </button>
                                        )}
                                    </div>
                                    {formData[field.name] && (
                                        <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'center' }}>
                                            <img
                                                src={formData[field.name]}
                                                alt="Preview"
                                                style={{
                                                    width: '80px',
                                                    height: '80px',
                                                    borderRadius: '50%',
                                                    objectFit: 'cover',
                                                    border: '2px solid var(--shop-border)'
                                                }}
                                                onError={(e) => (e.currentTarget.style.display = 'none')}
                                                onLoad={(e) => (e.currentTarget.style.display = 'block')}
                                            />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <input
                                    type={field.type}
                                    className="form-input"
                                    value={formData[field.name] || ''}
                                    onChange={(e) => handleChange(field.name, e.target.value)}
                                    placeholder={field.placeholder}
                                    disabled={isViewMode || field.disabled}
                                    required={field.required}
                                />
                            )}
                        </div>
                    ))}

                    {!isViewMode && (
                        <div className="modal-footer">
                            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                            <button type="submit" className="btn-primary">
                                <Save size={18} />
                                Save
                            </button>
                        </div>
                    )}
                </form>
            </div>

            <GalleryModal
                isOpen={isGalleryOpen}
                onClose={() => setIsGalleryOpen(false)}
                onSelect={handleGallerySelect}
                multiple={false}
                title={`Select ${activeField ? fields.find(f => f.name === activeField)?.label : 'Image'}`}
            />
        </div >
    );
};

export default AdminModal;
