import type { Event } from './Event';
import type { EventRuleType } from './EventRuleType';

export interface EventRule {
    id: number;
    event: Event;
    ruleType: EventRuleType;
    ruleValue: string;
}
