import type { Event } from '../types/Event';
import { EventStatus } from '../types/Event';
import { EventType } from '../types/EventType';
import type { EventImage } from '../types/EventImage';
import { ImageType } from '../types/EventImage';
import { mockUsers } from './mockUsers';
import { EventActionType } from '../types/EventActionType';
import { EventRuleType } from '../types/EventRuleType';
import { EventTargetType } from '../types/EventTargetType';

const image1: EventImage = {
    id: 1,
    event: undefined as any,
    imageUrl: 'https://cdn0.fahasa.com/media/wysiwyg/Thang-05-2023/Tuan-02/Banner-Slide-840x320.jpg',
    imageType: ImageType.MAIN
};

const image2: EventImage = {
    id: 2,
    event: undefined as any,
    imageUrl: 'https://cdn0.fahasa.com/media/wysiwyg/Thang-05-2023/Tuan-02/Banner-Safe-840x320.jpg',
    imageType: ImageType.MAIN
};

export const mockEvents: Event[] = [
    {
        id: 1,
        name: 'Summer Sale',
        description: 'Big discounts for summer.',
        type: EventType.SEASONAL_SALE,
        startTime: '2023-06-01T00:00:00Z',
        endTime: '2023-08-31T23:59:59Z',
        status: EventStatus.ACTIVE,
        priority: 1,
        createdBy: mockUsers[0],
        images: [image1],
        rules: [
            { id: 1, event: undefined as any, ruleType: EventRuleType.MIN_ORDER_VALUE, ruleValue: '200000' }
        ],
        actions: [
            { id: 1, event: undefined as any, actionType: EventActionType.DISCOUNT_PERCENT, actionValue: '20' } // 20% off
        ],
        targets: [
            { id: 1, event: undefined as any, targetType: EventTargetType.ALL_ORDERS, targetId: 0 }
        ]
    },
    {
        id: 2,
        name: 'Back to School',
        description: 'Prepare for the new year.',
        type: EventType.BACK_TO_SCHOOL,
        startTime: '2023-08-15T00:00:00Z',
        endTime: '2023-09-15T23:59:59Z',
        status: EventStatus.ACTIVE,
        priority: 2,
        createdBy: mockUsers[0],
        images: [image2],
        rules: [
            { id: 2, event: undefined as any, ruleType: EventRuleType.BOOK_CATEGORY, ruleValue: '5' } // Category 5 (Tech) or similar
        ],
        actions: [
            { id: 2, event: undefined as any, actionType: EventActionType.DISCOUNT_AMOUNT, actionValue: '50000' } // 50k off
        ],
        targets: [
            { id: 2, event: undefined as any, targetType: EventTargetType.CATEGORY, targetId: 5 }
        ]
    },
    {
        id: 3,
        name: 'Flash Sale Weekend',
        description: 'Limited time offer!',
        type: EventType.FLASH_SALE,
        startTime: '2023-10-01T00:00:00Z',
        endTime: '2023-10-03T23:59:59Z',
        status: EventStatus.ACTIVE,
        priority: 3,
        createdBy: mockUsers[0],
        images: [],
        rules: [],
        actions: [
            { id: 3, event: undefined as any, actionType: EventActionType.FREE_SHIPPING, actionValue: 'true' }
        ],
        targets: [
             { id: 3, event: undefined as any, targetType: EventTargetType.ALL_ORDERS, targetId: 0 }
        ]
    },
    {
        id: 4,
        name: 'New User Welcome',
        description: 'Special gift for new members.',
        type: EventType.FIRST_ORDER_DISCOUNT,
        startTime: '2023-01-01T00:00:00Z',
        endTime: '2023-12-31T23:59:59Z',
        status: EventStatus.ACTIVE,
        priority: 1,
        createdBy: mockUsers[0],
        images: [],
        rules: [
             { id: 4, event: undefined as any, ruleType: EventRuleType.NEW_USER_ONLY, ruleValue: 'true' }
        ],
        actions: [
             { id: 4, event: undefined as any, actionType: EventActionType.DISCOUNT_PERCENT, actionValue: '10' }
        ],
        targets: [
             { id: 4, event: undefined as any, targetType: EventTargetType.USER, targetId: 0 }
        ]
    }
];

// Fix circular refs
mockEvents.forEach(evt => {
    if (evt.images) evt.images.forEach(img => img.event = evt);
    if (evt.rules) evt.rules.forEach(r => r.event = evt);
    if (evt.actions) evt.actions.forEach(a => a.event = evt);
    if (evt.targets) evt.targets.forEach(t => t.event = evt);
});
