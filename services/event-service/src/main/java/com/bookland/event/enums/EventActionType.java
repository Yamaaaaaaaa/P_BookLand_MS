package com.bookland.event.enums;

public enum EventActionType {
    // Giảm giá theo %
    DISCOUNT_PERCENT("Giảm theo % (value: 0-100)"),

    // Giảm giá cố định
    DISCOUNT_AMOUNT("Giảm theo số tiền (VNĐ)"),
    DISCOUNT_FIXED_PRICE("Giá cố định (VNĐ)"),

    // Miễn phí vận chuyển
    FREE_SHIPPING("Miễn phí ship"),
    DISCOUNT_SHIPPING_PERCENT("Giảm phí ship theo %"),
    DISCOUNT_SHIPPING_AMOUNT("Giảm phí ship theo số tiền"),

    // Tặng quà
    FREE_GIFT("Tặng sản phẩm (value: bookId)"),
    FREE_GIFT_BY_POINT("Tặng điểm thưởng (value: points)"),

    // Combo deals
    BUY_X_GET_Y_FREE("Mua X tặng Y (value: X,Y)"),
    BUY_X_GET_Y_DISCOUNT("Mua X giảm Y% (value: X,Y)"),

    // Cashback
    CASHBACK_PERCENT("Hoàn tiền theo % (value: 0-100)"),
    CASHBACK_AMOUNT("Hoàn tiền cố định (VNĐ)"),

    // Voucher
    GENERATE_VOUCHER("Tạo voucher (value: voucherCode)"),

    // Upgrade membership
    UPGRADE_MEMBERSHIP("Nâng cấp thành viên (value: tierName)"),

    // Special pricing
    BUNDLE_PRICE("Giá combo (value: totalPrice)"),
    TIERED_DISCOUNT("Giảm giá theo bậc (value: tier1:10,tier2:20)");

    private final String description;

    EventActionType(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
