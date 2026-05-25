package com.bookland.event.enums;

public enum EventType {
    // Khuyến mãi giảm giá
    FLASH_SALE("Flash Sale - Giảm giá sốc"),
    SEASONAL_SALE("Giảm giá theo mùa"),
    CLEARANCE_SALE("Thanh lý kho"),

    // Sự kiện đặc biệt
    BLACK_FRIDAY("Black Friday"),
    CYBER_MONDAY("Cyber Monday"),
    NEW_YEAR("Tết Nguyên Đán"),
    BACK_TO_SCHOOL("Khai trường"),
    BOOK_DAY("Ngày sách Việt Nam"),

    // Khuyến mãi thành viên
    MEMBERSHIP_EXCLUSIVE("Ưu đãi thành viên"),
    VIP_SALE("Giảm giá VIP"),
    BIRTHDAY_PROMOTION("Ưu đãi sinh nhật"),

    // Combo & Bundle
    BUY_X_GET_Y("Mua X tặng Y"),
    BUNDLE_DEAL("Combo tiết kiệm"),

    // Free shipping
    FREE_SHIPPING("Miễn phí vận chuyển"),

    // Voucher & Coupon
    VOUCHER_CODE("Mã giảm giá"),
    FIRST_ORDER_DISCOUNT("Giảm giá đơn đầu"),

    // Special events
    AUTHOR_SIGNING("Ký tặng tác giả"),
    NEW_RELEASE("Ra mắt sách mới"),
    PRE_ORDER("Đặt trước"),

    // Other
    CUSTOM("Sự kiện tùy chỉnh");

    private final String description;

    EventType(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
