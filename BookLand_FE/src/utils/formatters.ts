
/**
 * Formats a number as Vietnamese Dong (VND).
 * @param amount The amount to format.
 * @returns The formatted string (e.g., "100.000 ₫").
 */
export const formatCurrency = (amount: number): string => {
    // using 'vi-VN' locale automatically adds dots for thousands and uses '₫' symbol.
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};
