export interface ApiResponse<T> {
    code: number;
    message: string;
    result: T;
}

export interface SortObject {
    empty: boolean;
    unsorted: boolean;
    sorted: boolean;
}

export interface PageableObject {
    offset: number;
    sort: SortObject;
    paged: boolean;
    pageSize: number;
    pageNumber: number;
    unpaged: boolean;
}

export interface Page<T> {
    totalElements: number;
    totalPages: number;
    first: boolean;
    last: boolean;
    size: number;
    content: T[];
    number: number;
    sort: SortObject;
    numberOfElements: number;
    pageable: PageableObject;
    empty: boolean;
}
