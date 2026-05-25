package com.bookland.event.enums;

public enum EventTargetType {
    // Sản phẩm
    BOOK("Áp dụng cho sách cụ thể"),

    // Phân loại
    CATEGORY("Áp dụng cho danh mục"),
    SERIES("Áp dụng cho bộ sách trong 1 Serie"),
    AUTHOR("Áp dụng cho tác giả"),
    PUBLISHER("Áp dụng cho nhà xuất bản"),

    // Khách hàng
    USER("Áp dụng cho user cụ thể"),
    USER_GROUP("Áp dụng cho nhóm user"),
    NEW_USER("Áp dụng cho user mới"),
    VIP_USER("Áp dụng cho VIP"),

    // Đơn hàng
    ALL_ORDERS("Áp dụng cho tất cả đơn hàng"),
    FIRST_ORDER("Áp dụng cho đơn đầu tiên"),

    // Khu vực
    LOCATION("Áp dụng theo khu vực/tỉnh thành"),

    // Khác
    ALL("Áp dụng cho tất cả");

    private final String description;

    EventTargetType(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
