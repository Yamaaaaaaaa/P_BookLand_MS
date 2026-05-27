import type { Event } from './Event';
import type { EventTargetType } from './EventTargetType';

export interface EventTarget {
    id: number;
    event: Event;
    targetType: EventTargetType;
    targetId: number;
}
