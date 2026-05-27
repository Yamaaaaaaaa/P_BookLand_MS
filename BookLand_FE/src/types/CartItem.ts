export interface CartItem {
    bookId: number;
    bookName: string;
    bookImageUrl: string;
    originalPrice: number;
    salePrice: number; // Discount percentage or amount
    finalPrice: number; // The actual price after discount
    quantity: number;
    availableStock: number;
    subtotal: number; // finalPrice * quantity
}
