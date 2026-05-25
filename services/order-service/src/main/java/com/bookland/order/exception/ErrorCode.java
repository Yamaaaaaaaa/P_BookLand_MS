package com.bookland.order.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {
    PAYMENT_METHOD_NOT_FOUND(5040, "Không tìm thấy phương thức thanh toán", HttpStatus.NOT_FOUND),
    SHIPPING_METHOD_NOT_FOUND(5041, "Không tìm thấy phương thức vận chuyển", HttpStatus.NOT_FOUND),

    // Cart
    CART_NOT_FOUND(5042, "Không tìm thấy giỏ hàng", HttpStatus.NOT_FOUND),
    CART_ITEM_NOT_FOUND(5043, "Không tìm thấy sản phẩm trong giỏ hàng", HttpStatus.NOT_FOUND),
    BOOK_NOT_FOUND(5044, "Không tìm thấy sách", HttpStatus.NOT_FOUND),
    BOOK_OUT_OF_STOCK(5045, "Sách không đủ số lượng trong kho", HttpStatus.BAD_REQUEST),
    BOOK_SERVICE_ERROR(5046, "Lỗi kết nối đến dịch vụ sách", HttpStatus.SERVICE_UNAVAILABLE),

    // General
    UNAUTHENTICATED(4010, "Chưa xác thực", HttpStatus.UNAUTHORIZED),
    FORBIDDEN(4030, "Không có quyền truy cập", HttpStatus.FORBIDDEN),
    INVALID_REQUEST(4000, "Yêu cầu không hợp lệ", HttpStatus.BAD_REQUEST),
    INTERNAL_ERROR(5000, "Lỗi hệ thống", HttpStatus.INTERNAL_SERVER_ERROR);

    private final int code;
    private final String message;
    private final HttpStatus httpStatus;

    ErrorCode(int code, String message, HttpStatus httpStatus) {
        this.code = code;
        this.message = message;
        this.httpStatus = httpStatus;
    }
}
