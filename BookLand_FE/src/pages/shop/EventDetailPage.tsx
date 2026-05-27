import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Calendar, Clock, Tag, Zap, ShieldCheck, Users,
    BookOpen, ChevronRight, ChevronLeft, AlertCircle
} from 'lucide-react';
import Breadcrumb from '../../components/common/Breadcrumb';
import BookGrid from '../../components/BooksGrid';
import { eventService } from '../../api/eventService';
import bookService from '../../api/bookService';
import type { Event } from '../../types/Event';
import type { Book } from '../../types/Book';
import type { Page } from '../../types/api';
import { EventTargetType } from '../../types/EventTargetType';
import { EventActionType } from '../../types/EventActionType';
import { EventRuleType } from '../../types/EventRuleType';
import '../../styles/pages/event-detail.css';
import '../../styles/components/book-card.css';
import '../../styles/pages/books.css';

/* ================================================================
   HELPERS
   ================================================================ */

function formatDate(dt: string) {
    return new Date(dt).toLocaleDateString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
}

function formatShortDate(dt: string) {
    return new Date(dt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}


function formatAction(type: string, value: string): string {
    switch (type) {
        case EventActionType.DISCOUNT_PERCENT:
            return `Giảm ${value}% trên giá gốc`;
        case EventActionType.DISCOUNT_AMOUNT:
            return `Giảm ${Number(value).toLocaleString('vi-VN')}₫`;
        case EventActionType.DISCOUNT_FIXED_PRICE:
            return `Giá cố định ${Number(value).toLocaleString('vi-VN')}₫`;
        case EventActionType.FREE_SHIPPING:
            return 'Miễn phí vận chuyển';
        case EventActionType.DISCOUNT_SHIPPING_PERCENT:
            return `Giảm ${value}% phí ship`;
        case EventActionType.DISCOUNT_SHIPPING_AMOUNT:
            return `Giảm ${Number(value).toLocaleString('vi-VN')}₫ phí ship`;
        case EventActionType.FREE_GIFT:
            return 'Tặng kèm quà';
        case EventActionType.FREE_GIFT_BY_POINT:
            return `Tặng ${value} điểm thưởng`;
        case EventActionType.BUY_X_GET_Y_FREE:
            return `Mua ${value.split(',')[0]} tặng ${value.split(',')[1]} sách`;
        case EventActionType.CASHBACK_PERCENT:
            return `Hoàn tiền ${value}%`;
        case EventActionType.CASHBACK_AMOUNT:
            return `Hoàn ${Number(value).toLocaleString('vi-VN')}₫`;
        case EventActionType.GENERATE_VOUCHER:
            return `Tặng voucher: ${value}`;
        case EventActionType.UPGRADE_MEMBERSHIP:
            return `Nâng hạng thành viên: ${value}`;
        default:
            return `${type}: ${value}`;
    }
}

function formatRule(type: string, value: string): string {
    switch (type) {
        case EventRuleType.MIN_ORDER_VALUE:
            return `Đơn tối thiểu ${Number(value).toLocaleString('vi-VN')}₫`;
        case EventRuleType.MAX_ORDER_VALUE:
            return `Đơn tối đa ${Number(value).toLocaleString('vi-VN')}₫`;
        case EventRuleType.MIN_QUANTITY:
            return `Mua ít nhất ${value} quyển`;
        case EventRuleType.MAX_QUANTITY:
            return `Tối đa ${value} quyển`;
        case EventRuleType.MIN_ITEMS_IN_CART:
            return `Giỏ hàng có ít nhất ${value} sản phẩm`;
        case EventRuleType.MAX_USAGE_PER_USER:
            return `Tối đa ${value} lần/người`;
        case EventRuleType.MAX_USAGE_TOTAL:
            return `Giới hạn ${value} lượt sử dụng`;
        case EventRuleType.NEW_USER_ONLY:
            return 'Chỉ dành cho người dùng mới';
        case EventRuleType.FIRST_PURCHASE:
            return 'Chỉ áp dụng lần mua đầu tiên';
        case EventRuleType.ONLINE_PAYMENT_ONLY:
            return 'Chỉ thanh toán online';
        case EventRuleType.COUPON_CODE_REQUIRED:
            return `Cần mã: ${value}`;
        case EventRuleType.TOTAL_SPENT_MIN:
            return `Đã chi tối thiểu ${Number(value).toLocaleString('vi-VN')}₫`;
        default:
            return `${type}: ${value}`;
    }
}


/* ================================================================
   COUNTDOWN HOOK
   ================================================================ */

function useCountdown(endTime: string) {
    const calcRemaining = useCallback(() => {
        const diff = new Date(endTime).getTime() - Date.now();
        if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, ended: true };
        const days = Math.floor(diff / 86400000);
        const hours = Math.floor((diff % 86400000) / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        return { days, hours, minutes, seconds, ended: false };
    }, [endTime]);

    const [remaining, setRemaining] = useState(calcRemaining);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        setRemaining(calcRemaining());
        timerRef.current = setInterval(() => setRemaining(calcRemaining()), 1000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [calcRemaining]);

    return remaining;
}

/* ================================================================
   MAIN COMPONENT
   ================================================================ */

const EventDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const labelEventType = (type: string) => {
        const key = `shop.event_detail.type_${type.toLowerCase()}`;
        const translated = t(key);
        return translated === key ? type : translated;
    };

    const statusLabel = (status: string) => {
        const key = `shop.event_detail.status_${status.toLowerCase()}`;
        const translated = t(key);
        return translated === key ? status : translated;
    };

    const formatTargetLabel = (type: string) => {
        const key = `shop.event_detail.target_${type.toLowerCase()}`;
        const translated = t(key);
        return translated === key ? type : translated;
    };


    const [event, setEvent] = useState<Event | null>(null);
    const [isPageLoading, setIsPageLoading] = useState(true);
    const [pageError, setPageError] = useState<string | null>(null);

    // Books state
    const [books, setBooks] = useState<Book[]>([]);
    const [booksPageData, setBooksPageData] = useState<Page<Book> | null>(null);
    const [isBooksLoading, setIsBooksLoading] = useState(false);
    const [booksPage, setBooksPage] = useState(0);
    const PAGE_SIZE = 8;

    // Sub image selection
    const [activeSubImg, setActiveSubImg] = useState<string | null>(null);

    // ── Fetch event ──────────────────────────────────────
    useEffect(() => {
        if (!id) return;
        setIsPageLoading(true);
        setPageError(null);
        eventService.getEventById(Number(id))
            .then(res => {
                if (res.result) setEvent(res.result);
                else setPageError(t('shop.event_detail.error_title'));
            })
            .catch(() => setPageError(t('shop.event_detail.error_title')))
            .finally(() => setIsPageLoading(false));
    }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Build book query from targets ──────────────────────
    const buildBookParams = useCallback((ev: Event, page: number) => {
        const targets = ev.targets || [];
        const params: Record<string, any> = { page, size: PAGE_SIZE, status: 'ENABLE' };

        const hasAll = targets.some(t => t.targetType === EventTargetType.ALL);
        if (hasAll || targets.length === 0) return params; // all books

        const categoryIds = targets.filter(t => t.targetType === EventTargetType.CATEGORY).map(t => t.targetId);
        const seriesIds = targets.filter(t => t.targetType === EventTargetType.SERIES).map(t => t.targetId);
        const authorIds = targets.filter(t => t.targetType === EventTargetType.AUTHOR).map(t => t.targetId);
        const publisherIds = targets.filter(t => t.targetType === EventTargetType.PUBLISHER).map(t => t.targetId);

        if (categoryIds.length) params.categoryIds = categoryIds;
        if (seriesIds.length) params.seriesIds = seriesIds;
        if (authorIds.length) params.authorIds = authorIds;
        if (publisherIds.length) params.publisherIds = publisherIds;

        return params;
    }, []);

    // ── Fetch books (handles BOOK target separately) ──────
    const fetchBooks = useCallback(async (ev: Event, page: number) => {
        setIsBooksLoading(true);
        try {
            const targets = ev.targets || [];
            const bookTargetIds = targets
                .filter(t => t.targetType === EventTargetType.BOOK)
                .map(t => t.targetId);

            const hasOnlyBookTargets =
                targets.length > 0 &&
                targets.every(t => t.targetType === EventTargetType.BOOK);

            if (hasOnlyBookTargets) {
                // Fetch individual books by id
                const fetches = bookTargetIds.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)
                    .map(bid => bookService.getBookById(bid).then(r => r.result).catch(() => null));
                const results = (await Promise.all(fetches)).filter(Boolean) as Book[];
                setBooks(results);
                setBooksPageData({
                    content: results,
                    totalElements: bookTargetIds.length,
                    totalPages: Math.ceil(bookTargetIds.length / PAGE_SIZE),
                    size: PAGE_SIZE,
                    number: page,
                    first: page === 0,
                    last: page >= Math.ceil(bookTargetIds.length / PAGE_SIZE) - 1,
                    empty: results.length === 0,
                    numberOfElements: results.length,
                } as Page<Book>);
            } else {
                const params = buildBookParams(ev, page);
                const res = await bookService.getAllBooks(params);
                if (res.result) {
                    setBooks(res.result.content);
                    setBooksPageData(res.result);
                }
            }
        } catch (err) {
            console.error('Failed to fetch event books:', err);
        } finally {
            setIsBooksLoading(false);
        }
    }, [buildBookParams]);

    useEffect(() => {
        if (event) fetchBooks(event, booksPage);
    }, [event, booksPage, fetchBooks]);

    // ── Countdown ─────────────────────────────────────────
    const countdown = useCountdown(event?.endTime ?? new Date(Date.now() + 10000).toISOString());

    // ── Handle page loading ───────────────────────────────
    if (isPageLoading) {
        return (
            <div className="event-page-loading">
                <div className="loader-spinner" style={{ width: 48, height: 48 }} />
                <p>{t('shop.event_detail.loading')}</p>
            </div>
        );
    }

    if (pageError || !event) {
        return (
            <div className="event-page-error">
                <AlertCircle size={56} color="#ef4444" />
                <h2>{t('shop.event_detail.error_title')}</h2>
                <p>{t('shop.event_detail.error_desc')}</p>
                <Link to="/shop/home" className="btn-back-events">
                    <ChevronLeft size={16} /> {t('shop.event_detail.back_home')}
                </Link>
            </div>
        );
    }

    // ── Derived values ────────────────────────────────────
    const mainImages = (event.images || []).filter(i => i.imageType === 'MAIN');
    const subImages = (event.images || []).filter(i => i.imageType === 'SUB');
    const heroImageUrl = activeSubImg || (mainImages[0]?.imageUrl ?? null);
    const statusKey = event.status?.toLowerCase() ?? 'draft';

    // Has product-level targets
    // - targets rỗng = áp dụng tất cả → luôn hiện sách
    // - có target ALL → hiện sách
    // - target BOOK/CATEGORY/SERIES/AUTHOR/PUBLISHER → hiện sách
    // - chỉ toàn target USER/ORDER related → ẩn sách
    const NON_PRODUCT_TYPES: string[] = [
        EventTargetType.USER, EventTargetType.USER_GROUP,
        EventTargetType.NEW_USER, EventTargetType.VIP_USER,
        EventTargetType.ALL_ORDERS, EventTargetType.FIRST_ORDER,
        EventTargetType.LOCATION,
    ];
    const targets = event.targets || [];
    const hasProductTargets =
        targets.length === 0 ||
        targets.some(t => !NON_PRODUCT_TYPES.includes(t.targetType));

    return (
        <div className="event-detail-page">
            {/* ======== HERO ======== */}
            <section className="event-hero">
                {heroImageUrl && (
                    <div
                        className="event-hero__bg"
                        style={{ backgroundImage: `url(${heroImageUrl})` }}
                    />
                )}
                <div className="event-hero__overlay" />

                <div className="event-hero__inner">
                    {/* Badges */}
                    <div className="event-hero__badges">
                        <span className="badge-type">{labelEventType(event.type)}</span>
                        <span className={`badge-status ${statusKey}`}>
                            <span className="status-dot" />
                            {statusLabel(event.status)}
                        </span>
                    </div>

                    {/* Title */}
                    <h1 className="event-hero__title">{event.name}</h1>

                    {/* Timeframe */}
                    <div className="event-hero__timeframe">
                        <Calendar size={15} />
                        <span>
                            {formatShortDate(event.startTime)} – {formatShortDate(event.endTime)}
                        </span>
                        <Clock size={15} style={{ marginLeft: 8 }} />
                        <span>{formatDate(event.endTime)}</span>
                    </div>

                    {/* Countdown */}
                    {countdown.ended ? (
                        <div className="event-ended-tag">
                            <AlertCircle size={16} /> {t('shop.event_detail.ended_tag')}
                        </div>
                    ) : (
                        <div className="event-countdown">
                            <span className="countdown-label">{t('shop.event_detail.countdown_label')}</span>
                            <div className="countdown-units">
                                <div className="countdown-unit">
                                    <span className="countdown-unit__value">
                                        {String(countdown.days).padStart(2, '0')}
                                    </span>
                                    <span className="countdown-unit__label">{t('shop.event_detail.countdown_days')}</span>
                                </div>
                                <span className="countdown-sep">:</span>
                                <div className="countdown-unit">
                                    <span className="countdown-unit__value">
                                        {String(countdown.hours).padStart(2, '0')}
                                    </span>
                                    <span className="countdown-unit__label">{t('shop.event_detail.countdown_hours')}</span>
                                </div>
                                <span className="countdown-sep">:</span>
                                <div className="countdown-unit">
                                    <span className="countdown-unit__value">
                                        {String(countdown.minutes).padStart(2, '0')}
                                    </span>
                                    <span className="countdown-unit__label">{t('shop.event_detail.countdown_minutes')}</span>
                                </div>
                                <span className="countdown-sep">:</span>
                                <div className="countdown-unit">
                                    <span className="countdown-unit__value">
                                        {String(countdown.seconds).padStart(2, '0')}
                                    </span>
                                    <span className="countdown-unit__label">{t('shop.event_detail.countdown_seconds')}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Sub image strip */}
                    {subImages.length > 0 && (
                        <div className="event-hero__sub-images">
                            {mainImages.slice(0, 1).map((img, i) => (
                                <img
                                    key={`main-${i}`}
                                    src={img.imageUrl}
                                    alt="main"
                                    className={`sub-thumb ${activeSubImg === null || activeSubImg === img.imageUrl ? 'active' : ''}`}
                                    onClick={() => setActiveSubImg(img.imageUrl)}
                                />
                            ))}
                            {subImages.map((img, i) => (
                                <img
                                    key={`sub-${i}`}
                                    src={img.imageUrl}
                                    alt={`sub-${i}`}
                                    className={`sub-thumb ${activeSubImg === img.imageUrl ? 'active' : ''}`}
                                    onClick={() => setActiveSubImg(img.imageUrl)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Breadcrumb */}
            <div className="event-breadcrumb-wrap">
                <Breadcrumb items={[
                    { label: t('shop.home_breadcrumb'), link: '/shop/home' },
                    { label: t('shop.event_detail.breadcrumb_events'), link: '/shop/home' },
                    { label: event.name },
                ]} />
            </div>

            {/* ======== BODY ======== */}
            <div className="event-detail-body">

                {/* Info Cards */}
                <div className="event-info-cards">

                    {/* Card 1: Discount / Actions */}
                    <div className="event-info-card">
                        <div className="eic-header">
                            <div className="eic-icon discount">
                                <Zap size={18} />
                            </div>
                            <span className="eic-title">{t('shop.event_detail.card_discount_title')}</span>
                        </div>
                        <div className="eic-content">
                            {(event.actions || []).length === 0 ? (
                                <span className="eic-empty">{t('shop.event_detail.no_action')}</span>
                            ) : (
                                (event.actions || []).map((a, idx) => (
                                    <div key={idx} className="eic-item">
                                        <span className="eic-item-dot discount" />
                                        {formatAction(a.actionType, a.actionValue)}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Card 2: Rules / Conditions */}
                    <div className="event-info-card">
                        <div className="eic-header">
                            <div className="eic-icon rule">
                                <ShieldCheck size={18} />
                            </div>
                            <span className="eic-title">{t('shop.event_detail.card_rule_title')}</span>
                        </div>
                        <div className="eic-content">
                            {(event.rules || []).length === 0 ? (
                                <span className="eic-empty">{t('shop.event_detail.no_rule')}</span>
                            ) : (
                                (event.rules || []).map((r, idx) => (
                                    <div key={idx} className="eic-item">
                                        <span className="eic-item-dot rule" />
                                        {formatRule(r.ruleType, r.ruleValue)}
                                    </div>
                                ))
                            )}
                        </div>
                        {event.description && (
                            <div className="eic-description">{event.description}</div>
                        )}
                    </div>

                    {/* Card 3: Targets */}
                    <div className="event-info-card">
                        <div className="eic-header">
                            <div className="eic-icon target">
                                <Users size={18} />
                            </div>
                            <span className="eic-title">{t('shop.event_detail.card_target_title')}</span>
                        </div>
                        <div className="eic-content">
                            {(event.targets || []).length === 0 ? (
                                <div className="target-all-chip">
                                    <Tag size={12} /> {t('shop.event_detail.target_all')}
                                </div>
                            ) : (event.targets || []).some(t2 => t2.targetType === EventTargetType.ALL) ? (
                                <div className="target-all-chip">
                                    <Tag size={12} /> {t('shop.event_detail.target_all')}
                                </div>
                            ) : (
                                // Group by type
                                Object.entries(
                                    (event.targets || []).reduce((acc, t2) => {
                                        const key = t2.targetType;
                                        if (!acc[key]) acc[key] = [];
                                        acc[key].push(t2.targetId);
                                        return acc;
                                    }, {} as Record<string, number[]>)
                                ).map(([type, ids]) => (
                                    <div key={type} className="eic-item">
                                        <span className="eic-item-dot target" />
                                        <span>
                                            <strong>{formatTargetLabel(type)}</strong>
                                            {ids.length > 0 && ` (${ids.length})`}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Books Section */}
                {hasProductTargets && (
                    <div className="event-books-section">
                        <div className="event-books-header">
                            <div className="event-books-title">
                                <div className="event-books-title-icon">
                                    <BookOpen size={20} />
                                </div>
                                <h2>{t('shop.event_detail.books_section_title')}</h2>
                                {booksPageData && (
                                    <span className="event-books-count">
                                        {t('shop.event_detail.books_count', { count: booksPageData.totalElements })}
                                    </span>
                                )}
                            </div>
                            <Link
                                to={`/shop/books`}
                                className="event-books-view-all"
                                onClick={e => {
                                    // Navigate to books page with relevant filters if possible
                                    const targets = event.targets || [];
                                    const catIds = targets
                                        .filter(t => t.targetType === EventTargetType.CATEGORY)
                                        .map(t => t.targetId);
                                    if (catIds.length === 1) {
                                        e.preventDefault();
                                        navigate(`/shop/books?category=${catIds[0]}`);
                                    }
                                }}
                            >
                                {t('shop.event_detail.view_all')} <ChevronRight size={16} />
                            </Link>
                        </div>

                        {isBooksLoading ? (
                            <div className="event-books-loading">
                                <div className="loader-spinner" />
                                <p>{t('shop.event_detail.books_loading')}</p>
                            </div>
                        ) : books.length === 0 ? (
                            <div className="event-books-empty">
                                <BookOpen size={56} />
                                <p>{t('shop.event_detail.books_empty')}</p>
                            </div>
                        ) : (
                            <>
                                <BookGrid books={books} columns={4} viewMode="grid" />

                                {/* Pagination */}
                                {booksPageData && booksPageData.totalPages > 1 && (
                                    <div className="event-books-pagination">
                                        <button
                                            className="pagination-btn"
                                            disabled={booksPageData.first}
                                            onClick={() => setBooksPage(p => p - 1)}
                                        >
                                            <ChevronLeft size={16} />
                                        </button>

                                        {Array.from({ length: booksPageData.totalPages }, (_, i) => {
                                            if (
                                                i === 0 ||
                                                i === booksPageData.totalPages - 1 ||
                                                (i >= booksPage - 1 && i <= booksPage + 1)
                                            ) {
                                                return (
                                                    <button
                                                        key={i}
                                                        className={`pagination-number ${booksPage === i ? 'active' : ''}`}
                                                        onClick={() => setBooksPage(i)}
                                                    >
                                                        {i + 1}
                                                    </button>
                                                );
                                            } else if (i === 1 || i === booksPageData.totalPages - 2) {
                                                return <span key={i} className="pagination-ellipsis">...</span>;
                                            }
                                            return null;
                                        })}

                                        <button
                                            className="pagination-btn"
                                            disabled={booksPageData.last}
                                            onClick={() => setBooksPage(p => p + 1)}
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EventDetailPage;
