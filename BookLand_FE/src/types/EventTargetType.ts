export const EventTargetType = {
    BOOK: 'BOOK',
    CATEGORY: 'CATEGORY',
    SERIES: 'SERIES',
    AUTHOR: 'AUTHOR',
    PUBLISHER: 'PUBLISHER',
    USER: 'USER',
    USER_GROUP: 'USER_GROUP',
    NEW_USER: 'NEW_USER',
    VIP_USER: 'VIP_USER',
    ALL_ORDERS: 'ALL_ORDERS',
    FIRST_ORDER: 'FIRST_ORDER',
    LOCATION: 'LOCATION',
    ALL: 'ALL'
} as const;

export type EventTargetType = (typeof EventTargetType)[keyof typeof EventTargetType];
