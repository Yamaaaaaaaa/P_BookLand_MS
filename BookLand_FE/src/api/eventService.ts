import axiosClient from './axiosClient';
import type { ApiResponse, Page } from '../types/api';
import type { Event, EventPayload } from '../types/Event';

interface EventQueryParams {
    keyword?: string;
    status?: string;
    type?: string;
    targetType?: string;
    actionType?: string;
    ruleType?: string;
    createdById?: number;
    minPriority?: number;
    activeOnly?: boolean;
    fromDate?: string; // date-time
    toDate?: string; // date-time
    page?: number;
    size?: number;
    sortBy?: string;
    sortDirection?: string;
}

export const eventService = {
    getAllEvents: (params?: EventQueryParams) => {
        return axiosClient.get<any, ApiResponse<Page<Event>>>('/api/events', { params });
    },
    getEventById: (id: number) => {
        return axiosClient.get<any, ApiResponse<Event>>(`/api/events/${id}`);
    },
    createEvent: (data: EventPayload) => {
        return axiosClient.post<any, ApiResponse<Event>>('/api/events', data);
    },
    updateEvent: (id: number, data: EventPayload) => {
        return axiosClient.put<any, ApiResponse<Event>>(`/api/events/${id}`, data);
    },
    deleteEvent: (id: number) => {
        return axiosClient.delete<any, ApiResponse<void>>(`/api/events/${id}`);
    },
    updateEventStatus: (id: number, status: string) => {
        return axiosClient.patch<any, ApiResponse<Event>>(`/api/events/${id}/status`, null, { params: { status } });
    },
    getHighestPriorityEvent: () => {
        return axiosClient.get<any, ApiResponse<Event>>('/api/events/highest-priority');
    }
};
