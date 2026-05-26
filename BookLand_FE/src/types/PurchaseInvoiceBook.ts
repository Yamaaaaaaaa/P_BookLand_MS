import type { PurchaseInvoice } from './PurchaseInvoice';
import type { Book } from './Book';

export interface PurchaseInvoiceBook {
    purchaseInvoice: PurchaseInvoice;
    book: Book;
    quantity: number;
    importPrice: number;
}
