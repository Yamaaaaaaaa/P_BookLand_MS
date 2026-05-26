import type { User } from './User';
import type { EventImage } from './EventImage';
import type { EventTarget } from './EventTarget';
import type { EventRule } from './EventRule';
import type { EventAction } from './EventAction';
import type { EventLog } from './EventLog';
import type { EventType } from './EventType';

export const EventStatus = {
    DRAFT: 'DRAFT',
    ACTIVE: 'ACTIVE',
    PAUSED: 'PAUSED',
    EXPIRED: 'EXPIRED',
    DISABLED: 'DISABLED'
} as const;

export type EventStatus = (typeof EventStatus)[keyof typeof EventStatus];

export interface Event {
    id: number;
    name: string;
    description?: string;
    type: EventType;
    startTime: string;
    endTime: string;
    status: EventStatus;
    priority: number;
    createdBy?: User;
    createdAt?: string;
    images?: EventImage[];
    targets?: EventTarget[];
    rules?: EventRule[];
    actions?: EventAction[];
    logs?: EventLog[];
}

export interface EventRequest {
    name: string;
    description?: string;
    type: EventType;
    startTime: string;
    endTime: string;
    status: EventStatus;
    priority: number;
    images?: Omit<EventImage, 'id' | 'event'>[];
    targets?: Omit<EventTarget, 'id' | 'event'>[];
    rules?: Omit<EventRule, 'id' | 'event'>[];
    actions?: Omit<EventAction, 'id' | 'event'>[];
}

export interface EventPayload {
    name: string;
    description?: string;
    type: EventType;
    startTime: string;
    endTime: string;
    status: EventStatus;
    priority: number;
    createdById: number;
    mainImageUrls: string[];
    subImageUrls: string[];
    targets?: Omit<EventTarget, 'id' | 'event'>[];
    rules?: Omit<EventRule, 'id' | 'event'>[];
    actions?: Omit<EventAction, 'id' | 'event'>[];
}
