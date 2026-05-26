import type { Event } from './Event';
import type { Bill } from './Bill';
import type { User } from './User';

export interface EventLog {
    id: number;
    event: Event;
    user?: User;
    bill?: Bill;
    appliedValue?: number;
    createdAt?: string;
}
