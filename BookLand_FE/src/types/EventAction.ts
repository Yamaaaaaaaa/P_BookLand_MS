import type { Event } from './Event';
import type { EventActionType } from './EventActionType';

export interface EventAction {
    id: number;
    event: Event;
    actionType: EventActionType;
    actionValue: string;
}
