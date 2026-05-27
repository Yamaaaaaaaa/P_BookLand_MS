import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, X, ImageIcon, Loader2 } from 'lucide-react';
import GalleryModal from '../../../components/admin/GalleryModal';
import { EventStatus } from '../../../types/Event';
import { EventType } from '../../../types/EventType';
import { EventRuleType } from '../../../types/EventRuleType';
import { EventTargetType } from '../../../types/EventTargetType';
import { EventActionType } from '../../../types/EventActionType';
import { ImageType } from '../../../types/EventImage';
import type { EventRequest, EventPayload } from '../../../types/Event';
import type { Category } from '../../../types/Category';
import type { PaymentMethod } from '../../../types/PaymentMethod';
import { eventService } from '../../../api/eventService';
import categoryService from '../../../api/categoryService';
import paymentMethodService from '../../../api/paymentMethodService';
import userService from '../../../api/userService';
import '../../../styles/components/forms.css';
import '../../../styles/components/buttons.css';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

const EventFormPage = () => {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isNew = id === 'new';

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Dropdown options
    const [categories, setCategories] = useState<Category[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);

    // Auth / Creator info
    const [currentUserId, setCurrentUserId] = useState<number>(0);
    const [creatorName, setCreatorName] = useState<string>('');

    const [formData, setFormData] = useState<EventRequest>({
        name: '',
        description: '',
        type: EventType.SEASONAL_SALE,
        startTime: new Date().toISOString().slice(0, 16),
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
        status: EventStatus.DRAFT,
        priority: 0,
        rules: [],
        actions: [],
        targets: [],
        images: []
    });

    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const [catRes, pmRes] = await Promise.all([
                    categoryService.getAll({ size: 100 }),
                    paymentMethodService.getAll({ size: 100 })
                ]);

                if (catRes.result?.content) setCategories(catRes.result.content);
                if (pmRes.result?.content) setPaymentMethods(pmRes.result.content);

            } catch (error) {
                console.error('Error fetching options:', error);
                toast.error(t('admin.book_detail.options_fail'));
            }
        };
        fetchOptions();

        // Fetch current user info from token
        const fetchCurrentUser = async () => {
            const token = localStorage.getItem('adminToken');
            if (token) {
                try {
                    const userRes = await userService.getOwnProfile();
                    if (userRes.result) {
                        const user = userRes.result;
                        setCurrentUserId(user.id);
                        setCreatorName(`${user.firstName || ''} ${user.lastName || ''} (${user.username || user.email})`.trim());
                    }
                } catch (error) {
                    console.error('Error fetching current user:', error);
                }
            }
        };
        fetchCurrentUser();
    }, []);

    useEffect(() => {
        if (!isNew && id) {
            const fetchEvent = async () => {
                setIsLoading(true);
                try {
                    const response = await eventService.getEventById(Number(id));
                    if (response.result) {
                        const event = response.result;
                        // If editing, try to show the original creator if available, otherwise fallback or just show who is editing?
                        // Requirement: "Display a field of the person who created the event". 
                        // If the event has a createdBy field (User object), use it.
                        if (event.createdBy) {
                            setCreatorName(`${event.createdBy.firstName || ''} ${event.createdBy.lastName || ''} (${event.createdBy.username || event.createdBy.email})`.trim());
                            // Note: We might NOT want to overwrite currentUserId if we want to track who is *updating* it, 
                            // but usually CreatedBy is static. The BE DTO requires 'createdById' which implying setting the owner.
                            // If we are just updating, we probably should keep the original owner OR update it to the current editor.
                            // User requirement: "Person updating appends API from Token". 
                            // This implies the 'updatedBy' concept, but the DTO only has 'createdById'. 
                            // If 'createdById' implies ownership, we should probably keep it as the original creator unless we want to change ownership.
                            // HOWEVER, user said: "Ng cập nhật/ người tạo thì gửi API sẽ lấy từ Token". 
                            // This suggests ensuring the payload always has the *current* user's ID as 'createdById' or similar? 
                            // Actually, typically 'createdById' shouldn't change on update. 
                            // Let's assume for now we use the *current logged in user* as the actor. 
                            // But for DISPLAY, we show the original creator from the event details.
                        }

                        setFormData({
                            name: event.name,
                            description: event.description,
                            type: event.type,
                            startTime: event.startTime.slice(0, 16),
                            endTime: event.endTime.slice(0, 16),
                            status: event.status,
                            priority: event.priority,
                            rules: event.rules?.map(({ id, event, ...rest }) => rest) || [],
                            actions: event.actions?.map(({ id, event, ...rest }) => rest) || [],
                            targets: event.targets?.map(({ id, event, ...rest }) => rest) || [],
                            images: event.images?.map(({ id, event, ...rest }) => rest) || []
                        });
                    }
                } catch (error) {
                    console.error('Error fetching event:', error);
                    toast.error(t('admin.event.load_detail_fail'));
                    navigate('/admin/manage-business/event');
                } finally {
                    setIsLoading(false);
                }
            };
            fetchEvent();
        }
    }, [id, isNew, navigate]);

    const handleGallerySelect = (selectedImages: { id: string; name: string; url: string }[]) => {
        const newImages = selectedImages.map(img => ({
            imageUrl: img.url,
            imageType: ImageType.SUB // Default to SUB
        }));

        setFormData(prev => {
            // Filter out duplicates based on imageUrl
            const existingUrls = new Set(prev.images?.map(i => i.imageUrl));
            const uniqueNewImages = newImages.filter(i => !existingUrls.has(i.imageUrl));

            return {
                ...prev,
                images: [...(prev.images || []), ...uniqueNewImages]
            };
        });
        toast.success(t('admin.event.add_images_success', { count: newImages.length }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.startTime || !formData.endTime) {
            toast.error(t('admin.book_detail.validation_error'));
            return;
        }

        setIsSaving(true);
        try {
            // Get user ID from state (fetched on mount)
            let createdById = currentUserId;

            if (!createdById) {
                toast.error(t('admin.event.user_missing'));
                setIsSaving(false);
                return;
            }

            const mainImageUrls = formData.images?.filter(i => i.imageType === ImageType.MAIN).map(i => i.imageUrl) || [];
            const subImageUrls = formData.images?.filter(i => i.imageType === ImageType.SUB).map(i => i.imageUrl) || [];

            const submitData: EventPayload = {
                name: formData.name,
                description: formData.description,
                type: formData.type,
                startTime: new Date(formData.startTime).toISOString(),
                endTime: new Date(formData.endTime).toISOString(),
                status: formData.status,
                priority: formData.priority,
                createdById: Number(createdById),
                mainImageUrls: mainImageUrls,
                subImageUrls: subImageUrls,
                targets: formData.targets,
                rules: formData.rules,
                actions: formData.actions
            };

            if (isNew) {
                await eventService.createEvent(submitData);
                toast.success(t('admin.event.create_success'));
            } else {
                await eventService.updateEvent(Number(id), submitData);
                toast.success(t('admin.event.update_success'));
            }
            navigate('/admin/manage-business/event');
        } catch (error) {
            console.error('Error saving event:', error);
            toast.error(isNew ? t('admin.event.create_fail') : t('admin.event.update_fail'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'priority' ? Number(value) : value
        }));
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
                    <Link to="/admin/manage-business/event" className="btn-icon">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="admin-title">{isNew ? 'Create New Event' : 'Edit Event'}</h1>
                    </div>
                </div>
            </div>

            <div className="admin-content-card">
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Event Name *</label>
                        <input
                            type="text"
                            name="name"
                            className="form-input"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    {/* Creator Display */}
                    <div className="form-group">
                        <label className="form-label" style={{ color: 'var(--shop-text-muted)', fontSize: '0.85rem' }}>
                            Created/Modified By
                        </label>
                        <div style={{ padding: '0.5rem', background: '#f3f4f6', borderRadius: '4px', color: '#374151' }}>
                            {creatorName || 'Loading...'}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Event Type</label>
                            <select
                                name="type"
                                className="form-select"
                                value={formData.type}
                                onChange={handleChange}
                            >
                                {Object.values(EventType).map(type => (
                                    <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Status</label>
                            <select
                                name="status"
                                className="form-select"
                                value={formData.status}
                                onChange={handleChange}
                            >
                                {Object.values(EventStatus).map(status => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Start Time *</label>
                            <input
                                type="datetime-local"
                                name="startTime"
                                className="form-input"
                                value={formData.startTime}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">End Time *</label>
                            <input
                                type="datetime-local"
                                name="endTime"
                                className="form-input"
                                value={formData.endTime}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Priority (Higher runs first)</label>
                        <input
                            type="number"
                            name="priority"
                            className="form-input"
                            value={formData.priority}
                            onChange={handleChange}
                            min="0"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Description</label>
                        <textarea
                            name="description"
                            className="form-textarea"
                            rows={4}
                            value={formData.description || ''}
                            onChange={handleChange}
                        />
                    </div>

                    {/* Images Section */}
                    <div className="form-section">
                        <div className="section-header">
                            <h3 className="section-title">Event Images</h3>
                            <h3 className="section-title">Event Images</h3>
                            <button type="button" className="btn-secondary" onClick={() => setIsGalleryOpen(true)}>
                                <ImageIcon size={16} /> Select from Gallery
                            </button>
                            <div style={{ display: 'none' }}>
                                {/* Hidden inputs or other controls if needed */}
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '1rem' }}>
                            {formData.images?.map((img, index) => (
                                <div key={index} style={{
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                    padding: '1rem',
                                    width: '250px',
                                    position: 'relative',
                                    backgroundColor: '#fff'
                                }}>
                                    <button
                                        type="button"
                                        className="btn-icon delete"
                                        style={{ position: 'absolute', top: '0.5rem', right: '0.5rem' }}
                                        onClick={() => {
                                            const newImages = formData.images?.filter((_, i) => i !== index);
                                            setFormData(prev => ({ ...prev, images: newImages }));
                                        }}
                                    >
                                        <X size={16} />
                                    </button>

                                    <div style={{ aspectRatio: '16/9', backgroundColor: '#f3f4f6', marginBottom: '0.5rem', borderRadius: '4px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {img.imageUrl ? (
                                            <img src={img.imageUrl} alt="Event" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>No Image</span>
                                        )}
                                    </div>

                                    <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                                        <label className="form-label" style={{ fontSize: '0.8rem' }}>URL</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={img.imageUrl}
                                            onChange={(e) => {
                                                const newImages = [...(formData.images || [])];
                                                newImages[index].imageUrl = e.target.value;
                                                setFormData(prev => ({ ...prev, images: newImages }));
                                            }}
                                            style={{ fontSize: '0.85rem', padding: '0.4rem' }}
                                        />
                                    </div>

                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: '0.8rem' }}>Type</label>
                                        <select
                                            className="form-select"
                                            value={img.imageType}
                                            onChange={(e) => {
                                                const newImages = [...(formData.images || [])];
                                                newImages[index].imageType = e.target.value as any;
                                                setFormData(prev => ({ ...prev, images: newImages }));
                                            }}
                                            style={{ fontSize: '0.85rem', padding: '0.4rem' }}
                                        >
                                            {Object.values(ImageType).map(type => (
                                                <option key={type} value={type}>{type}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Rules Section */}
                    {/* ... (Previous Rules Section Code remains but I need to include it or rewrite it. I'll include the whole file to be safe) ... */}
                    {/* REUSING PREVIOUS LOGIC FOR RULES */}
                    <div className="form-section">
                        <div className="section-header">
                            <h3 className="section-title">Event Rules</h3>
                            {(!formData.rules || formData.rules.length === 0) && (
                                <button type="button" className="btn-secondary" onClick={() => {
                                    setFormData(prev => ({
                                        ...prev,
                                        rules: [...(prev.rules || []), { ruleType: EventRuleType.MIN_ORDER_VALUE, ruleValue: '' }]
                                    }));
                                }}>
                                    <Plus size={16} /> Add Rule
                                </button>
                            )}
                        </div>
                        {formData.rules?.map((rule, index) => (
                            <div key={index} className="dynamic-row">
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label">Rule Type</label>
                                    <select
                                        className="form-select"
                                        value={rule.ruleType}
                                        onChange={(e) => {
                                            const newRules = [...(formData.rules || [])];
                                            newRules[index].ruleType = e.target.value as any;
                                            setFormData(prev => ({ ...prev, rules: newRules }));
                                        }}
                                    >
                                        {Object.values(EventRuleType).map(type => (
                                            <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label">Value</label>
                                    {(() => {
                                        const handleValueChange = (val: string) => {
                                            const newRules = [...(formData.rules || [])];
                                            newRules[index].ruleValue = val;
                                            setFormData(prev => ({ ...prev, rules: newRules }));
                                        };

                                        // Date Types
                                        if (([
                                            EventRuleType.USER_REGISTERED_BEFORE,
                                            EventRuleType.USER_REGISTERED_AFTER,
                                            EventRuleType.BOOK_PUBLISHED_AFTER
                                        ] as EventRuleType[]).includes(rule.ruleType)) {
                                            return (
                                                <input
                                                    type="date"
                                                    className="form-input"
                                                    value={rule.ruleValue}
                                                    onChange={(e) => handleValueChange(e.target.value)}
                                                />
                                            );
                                        }

                                        // Numeric Types
                                        if (([
                                            EventRuleType.MIN_ORDER_VALUE,
                                            EventRuleType.MAX_ORDER_VALUE,
                                            EventRuleType.MIN_QUANTITY,
                                            EventRuleType.MAX_QUANTITY,
                                            EventRuleType.EXACT_QUANTITY,
                                            EventRuleType.MIN_ITEMS_IN_CART,
                                            EventRuleType.MAX_USAGE_PER_USER,
                                            EventRuleType.MAX_USAGE_TOTAL,
                                            EventRuleType.MAX_USAGE_PER_DAY,
                                            EventRuleType.TOTAL_SPENT_MIN,
                                            EventRuleType.BOOK_PRICE_MIN
                                        ] as EventRuleType[]).includes(rule.ruleType)) {
                                            return (
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    value={rule.ruleValue}
                                                    placeholder="0"
                                                    onChange={(e) => handleValueChange(e.target.value)}
                                                />
                                            );
                                        }

                                        // Boolean / Toggle Types
                                        if (([
                                            EventRuleType.NEW_USER_ONLY,
                                            EventRuleType.FIRST_PURCHASE,
                                            EventRuleType.PURCHASED_BEFORE,
                                            EventRuleType.ONLINE_PAYMENT_ONLY,
                                            EventRuleType.IN_STOCK_ONLY,
                                            EventRuleType.EXCLUDE_SALE_ITEMS,
                                            EventRuleType.NEWSLETTER_SUBSCRIBED
                                        ] as EventRuleType[]).includes(rule.ruleType)) {
                                            return (
                                                <select
                                                    className="form-select"
                                                    value={rule.ruleValue}
                                                    onChange={(e) => handleValueChange(e.target.value)}
                                                >
                                                    <option value="">Select...</option>
                                                    <option value="true">True</option>
                                                    <option value="false">False</option>
                                                </select>
                                            );
                                        }

                                        // Payment Method Select
                                        if (rule.ruleType === EventRuleType.PAYMENT_METHOD) {
                                            return (
                                                <select
                                                    className="form-select"
                                                    value={rule.ruleValue}
                                                    onChange={(e) => handleValueChange(e.target.value)}
                                                >
                                                    <option value="">Select Payment Method...</option>
                                                    {paymentMethods.map(pm => (
                                                        <option key={pm.id} value={pm.name}>{pm.name}</option>
                                                    ))}
                                                </select>
                                            );
                                        }

                                        // Category Select
                                        if (rule.ruleType === EventRuleType.BOOK_CATEGORY || rule.ruleType === EventRuleType.MUST_INCLUDE_CATEGORY) {
                                            return (
                                                <select
                                                    className="form-select"
                                                    value={rule.ruleValue}
                                                    onChange={(e) => handleValueChange(e.target.value)}
                                                >
                                                    <option value="">Select Category...</option>
                                                    {categories.map(cat => (
                                                        <option key={cat.id} value={cat.id.toString()}>{cat.name}</option>
                                                    ))}
                                                </select>
                                            );
                                        }

                                        // Default Text Input
                                        return (
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={rule.ruleValue}
                                                placeholder="Value"
                                                onChange={(e) => handleValueChange(e.target.value)}
                                            />
                                        );
                                    })()}
                                </div>
                                <button
                                    type="button"
                                    className="btn-icon delete"
                                    onClick={() => {
                                        const newRules = formData.rules?.filter((_, i) => i !== index);
                                        setFormData(prev => ({ ...prev, rules: newRules }));
                                    }}
                                    style={{ marginTop: '1.5rem' }}
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                        {(!formData.rules || formData.rules.length === 0) && (
                            <p className="empty-text">No rules configured.</p>
                        )}
                    </div>

                    {/* Targets Section */}
                    <div className="form-section">
                        <div className="section-header">
                            <h3 className="section-title">Event Targets</h3>
                            <button type="button" className="btn-secondary" onClick={() => {
                                setFormData(prev => ({
                                    ...prev,
                                    targets: [...(prev.targets || []), { targetType: EventTargetType.CATEGORY, targetId: 0 }]
                                }));
                            }}>
                                <Plus size={16} /> Add Target
                            </button>
                        </div>
                        {formData.targets?.map((target, index) => (
                            <div key={index} className="dynamic-row">
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label">Target Type</label>
                                    <select
                                        className="form-select"
                                        value={target.targetType}
                                        onChange={(e) => {
                                            const newTargets = [...(formData.targets || [])];
                                            newTargets[index].targetType = e.target.value as any;
                                            setFormData(prev => ({ ...prev, targets: newTargets }));
                                        }}
                                    >
                                        {Object.values(EventTargetType).map(type => (
                                            <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label">Target ID</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={target.targetId}
                                        placeholder="ID (e.g. Category ID)"
                                        onChange={(e) => {
                                            const newTargets = [...(formData.targets || [])];
                                            newTargets[index].targetId = parseInt(e.target.value) || 0;
                                            setFormData(prev => ({ ...prev, targets: newTargets }));
                                        }}
                                    />
                                </div>
                                <button
                                    type="button"
                                    className="btn-icon delete"
                                    onClick={() => {
                                        const newTargets = formData.targets?.filter((_, i) => i !== index);
                                        setFormData(prev => ({ ...prev, targets: newTargets }));
                                    }}
                                    style={{ marginTop: '1.5rem' }}
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                        {(!formData.targets || formData.targets.length === 0) && (
                            <p className="empty-text">No targets configured.</p>
                        )}
                    </div>

                    {/* Actions Section */}
                    <div className="form-section">
                        <div className="section-header">
                            <h3 className="section-title">Event Actions</h3>
                            {(!formData.actions || formData.actions.length === 0) && (
                                <button type="button" className="btn-secondary" onClick={() => {
                                    setFormData(prev => ({
                                        ...prev,
                                        actions: [...(prev.actions || []), { actionType: EventActionType.DISCOUNT_PERCENT, actionValue: '' }]
                                    }));
                                }}>
                                    <Plus size={16} /> Add Action
                                </button>
                            )}
                        </div>
                        {formData.actions?.map((action, index) => (
                            <div key={index} className="dynamic-row">
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label">Action Type</label>
                                    <select
                                        className="form-select"
                                        value={action.actionType}
                                        onChange={(e) => {
                                            const newActions = [...(formData.actions || [])];
                                            newActions[index].actionType = e.target.value as any;
                                            setFormData(prev => ({ ...prev, actions: newActions }));
                                        }}
                                    >
                                        {Object.values(EventActionType).map(type => (
                                            <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label">Value</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={action.actionValue}
                                        placeholder="e.g. 10 (for 10%)"
                                        onChange={(e) => {
                                            const newActions = [...(formData.actions || [])];
                                            newActions[index].actionValue = e.target.value;
                                            setFormData(prev => ({ ...prev, actions: newActions }));
                                        }}
                                    />
                                </div>
                                <button
                                    type="button"
                                    className="btn-icon delete"
                                    onClick={() => {
                                        const newActions = formData.actions?.filter((_, i) => i !== index);
                                        setFormData(prev => ({ ...prev, actions: newActions }));
                                    }}
                                    style={{ marginTop: '1.5rem' }}
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                        {(!formData.actions || formData.actions.length === 0) && (
                            <p className="empty-text">No actions configured.</p>
                        )}
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn-secondary" onClick={() => navigate('/admin/manage-business/event')}>
                            Cancel
                        </button>

                        <button type="submit" className="btn-primary" disabled={isSaving}>
                            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
            <GalleryModal
                isOpen={isGalleryOpen}
                onClose={() => setIsGalleryOpen(false)}
                onSelect={handleGallerySelect}
                multiple={true}
                title="Select Event Images"
            />
        </div>
    );
};

export default EventFormPage;
