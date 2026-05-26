import type { Event } from './Event';

export const ImageType = {
    MAIN: 'MAIN',
    SUB: 'SUB'
} as const;

export type ImageType = (typeof ImageType)[keyof typeof ImageType];

export interface EventImage {
    id: number;
    event: Event;
    imageUrl: string;
    imageType: ImageType;
}
