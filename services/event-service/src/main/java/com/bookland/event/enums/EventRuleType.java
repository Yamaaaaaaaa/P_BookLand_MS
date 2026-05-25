package com.bookland.event.enums;

public enum EventRuleType {
    // Giá trị đơn hàng
    MIN_ORDER_VALUE("Giá trị đơn tối thiểu (VNĐ)"),
    MAX_ORDER_VALUE("Giá trị đơn tối đa (VNĐ)"),

    // Số lượng sản phẩm
    MIN_QUANTITY("Số lượng sản phẩm tối thiểu"),
    MAX_QUANTITY("Số lượng sản phẩm tối đa"),
    EXACT_QUANTITY("Số lượng chính xác"),

    // Số lượng items trong giỏ
    MIN_ITEMS_IN_CART("Số items trong giỏ tối thiểu"),

    // Giới hạn sử dụng
    MAX_USAGE_PER_USER("Số lần dùng tối đa/user"),
    MAX_USAGE_TOTAL("Tổng số lần dùng tối đa"),
    MAX_USAGE_PER_DAY("Số lần dùng tối đa/ngày"),

    // Thời gian
    TIME_RANGE("Khung giờ áp dụng (HH:mm-HH:mm)"),
    DAY_OF_WEEK("Ngày trong tuần (MON,TUE,...)"),

    // User conditions
    USER_LEVEL("Cấp độ user (value: BRONZE,SILVER,GOLD,PLATINUM)"),
    USER_REGISTERED_BEFORE("User đăng ký trước ngày (yyyy-MM-dd)"),
    USER_REGISTERED_AFTER("User đăng ký sau ngày (yyyy-MM-dd)"),
    NEW_USER_ONLY("Chỉ user mới (value: true/false)"),

    // Purchase history
    FIRST_PURCHASE("Đơn hàng đầu tiên (value: true/false)"),
    PURCHASED_BEFORE("Đã mua trước đây (value: true/false)"),
    TOTAL_SPENT_MIN("Tổng chi tiêu tối thiểu (VNĐ)"),

    // Payment method
    PAYMENT_METHOD("Phương thức thanh toán (value: methodId)"),
    ONLINE_PAYMENT_ONLY("Chỉ thanh toán online (value: true/false)"),

    // Location
    SHIPPING_LOCATION("Khu vực giao hàng (value: provinceCode)"),

    // Product conditions
    BOOK_CATEGORY("Danh mục sách (value: categoryId)"),
    BOOK_PRICE_MIN("Giá sách tối thiểu (VNĐ)"),
    BOOK_PUBLISHED_AFTER("Sách xuất bản sau (yyyy-MM-dd)"),

    // Inventory
    IN_STOCK_ONLY("Chỉ sách còn hàng (value: true/false)"),

    // Combination rules
    MUST_INCLUDE_BOOK("Phải có sách cụ thể (value: bookId)"),
    MUST_INCLUDE_CATEGORY("Phải có danh mục (value: categoryId)"),

    // Exclusion rules
    EXCLUDE_SALE_ITEMS("Loại trừ sách đang sale (value: true/false)"),
    EXCLUDE_BOOKS("Loại trừ sách (value: bookId1,bookId2)"),

    // Other
    COUPON_CODE_REQUIRED("Yêu cầu mã coupon (value: code)"),
    NEWSLETTER_SUBSCRIBED("Đã đăng ký nhận tin (value: true/false)");

    private final String description;

    EventRuleType(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
