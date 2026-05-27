export interface BillBook {
    bookId: number;
    bookName: string;
    bookImageUrl?: string;
    priceSnapshot: number;
    quantity: number;
    subtotal?: number;
}
    