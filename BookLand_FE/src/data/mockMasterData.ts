import type { Role } from '../types/Role';
import type { Category } from '../types/Category';
import type { Author } from '../types/Author';
import type { Publisher } from '../types/Publisher';
import type { Serie } from '../types/Serie';
import type { PaymentMethod } from '../types/PaymentMethod';
import type { ShippingMethod } from '../types/ShippingMethod';


// --- ROLES ---
export const mockRoles: Role[] = [
    { id: 1, name: 'ADMIN', description: 'Administrator with full access' },
    { id: 2, name: 'STAFF', description: 'Staff member with limited access' },
    { id: 3, name: 'CUSTOMER', description: 'Regular customer' },
];

// --- CATEGORIES ---
export const mockCategories: Category[] = [
    { id: 1, name: 'Fiction', description: 'Fictional literature' },
    { id: 2, name: 'Science Fiction', description: 'Sci-Fi and Fantasy' },
    { id: 3, name: 'Business', description: 'Business and Economics' },
    { id: 4, name: 'History', description: 'Historical accounts' },
    { id: 5, name: 'Technology', description: 'Computer Science and Tech' },
    { id: 6, name: 'Children', description: 'Books for kids' },
    { id: 7, name: 'Biography', description: 'Biographies and Memoirs' },
    { id: 8, name: 'Self-Help', description: 'Personal Development' },
    { id: 9, name: 'Romance', description: 'Love and relationships' },
    { id: 10, name: 'Thriller', description: 'Suspense and mystery' },
    { id: 11, name: 'Cookbooks', description: 'Recipes and culinary arts' },
    { id: 12, name: 'Art', description: 'Art history and photography' }
];

// --- AUTHORS ---
export const mockAuthors: Author[] = [
    { id: 1, name: 'J.K. Rowling', description: 'British author, best known for the Harry Potter series.', authorImage: 'https://upload.wikimedia.org/wikipedia/commons/5/5d/J._K._Rowling_2010.jpg' },
    { id: 2, name: 'George R.R. Martin', description: 'American novelist and short-story writer.', authorImage: 'https://upload.wikimedia.org/wikipedia/commons/e/ed/Portrait_photoshoot_at_Worldcon_75%2C_Helsinki%2C_before_the_Hugo_Awards_%E2%80%93_George_R._R._Martin.jpg' },
    { id: 3, name: 'Robert C. Martin', description: 'Uncle Bob, author of Clean Code.', authorImage: 'https://upload.wikimedia.org/wikipedia/commons/e/ee/Robert_Cecil_Martin.png' },
    { id: 4, name: 'Isaac Asimov', description: 'Prolific writer of science fiction.', authorImage: 'https://upload.wikimedia.org/wikipedia/commons/3/34/Isaac.Asimov01.jpg' },
    { id: 5, name: 'Stephen King', description: 'King of horror.', authorImage: 'https://upload.wikimedia.org/wikipedia/commons/e/e3/Stephen_King%2C_Comicon.jpg' },
    { id: 6, name: 'Agatha Christie', description: 'Best-selling novelist of all time.', authorImage: 'https://upload.wikimedia.org/wikipedia/commons/c/cf/Agatha_Christie.png' },
    { id: 7, name: 'Walter Isaacson', description: 'Biographer of Steve Jobs and Einstein.', authorImage: 'https://upload.wikimedia.org/wikipedia/commons/2/29/Walter_Isaacson_at_Miami_Book_Fair_International_2011.jpg' },
    { id: 8, name: 'Gordon Ramsay', description: 'British chef and restaurateur.', authorImage: 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Gordon_Ramsay.jpg' }
];

// --- PUBLISHERS ---
export const mockPublishers: Publisher[] = [
    { id: 1, name: 'Bloomsbury', description: 'British publishing house.' },
    { id: 2, name: 'Bantam Books', description: 'American publishing house.' },
    { id: 3, name: 'Prentice Hall', description: 'Educational publisher.' },
    { id: 4, name: 'O\'Reilly Media', description: 'American learning company.' },
    { id: 5, name: 'Penguin Random House', description: 'Global publishing giant.' },
    { id: 6, name: 'HarperCollins', description: 'One of the big five.' }
];

// --- SERIES ---
export const mockSeries: Serie[] = [
    { id: 1, name: 'Harry Potter', description: 'The famous wizarding world series.' },
    { id: 2, name: 'A Song of Ice and Fire', description: 'Epic fantasy series.' },
    { id: 3, name: 'Clean Code Collection', description: 'Software engineering best practices.' },
    { id: 4, name: 'Foundation', description: 'Asimovs sci-fi masterpiece.' },
    { id: 5, name: 'Poirot', description: 'Hercule Poirot mysteries.' }
];

// --- PAYMENT METHODS ---
export const mockPaymentMethods: PaymentMethod[] = [
    { id: 1, name: 'Cash On Delivery', providerCode: 'COD', isOnline: false, description: 'Pay when you receive' },
    { id: 2, name: 'VNPay', providerCode: 'VNPAY', isOnline: true, description: 'Online payment via VNPay' },
    { id: 3, name: 'Momo', providerCode: 'MOMO', isOnline: true, description: 'E-wallet payment' },
    { id: 4, name: 'Credit Card', providerCode: 'STRIPE', isOnline: true, description: 'Visa/Mastercard' }
];

// --- SHIPPING METHODS ---
export const mockShippingMethods: ShippingMethod[] = [
    { id: 1, name: 'Standard Shipping', price: 15000, description: '3-5 business days' },
    { id: 2, name: 'Express Shipping', price: 35000, description: '1-2 business days' },
    { id: 3, name: 'Same Day Delivery', price: 50000, description: 'Delivered today (Inner city only)' }
];
