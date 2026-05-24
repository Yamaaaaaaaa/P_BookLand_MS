package com.bookland.book.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {
    // Book errors
    BOOK_NOT_FOUND(4040, "Không tìm thấy sách", HttpStatus.NOT_FOUND),
    BOOK_HAS_ORDERS(4001, "Không thể xóa sách đã có đơn hàng", HttpStatus.BAD_REQUEST),

    // Author errors
    AUTHOR_NOT_FOUND(4041, "Không tìm thấy tác giả", HttpStatus.NOT_FOUND),
    AUTHOR_ALREADY_EXISTS(4002, "Tên tác giả đã tồn tại", HttpStatus.BAD_REQUEST),

    // Category errors
    CATEGORY_NOT_FOUND(4042, "Không tìm thấy danh mục", HttpStatus.NOT_FOUND),
    CATEGORY_ALREADY_EXISTS(4003, "Tên danh mục đã tồn tại", HttpStatus.BAD_REQUEST),
    CATEGORY_HAS_BOOKS(4004, "Không thể xóa danh mục đang có sách", HttpStatus.BAD_REQUEST),

    // Publisher errors
    PUBLISHER_NOT_FOUND(4043, "Không tìm thấy nhà xuất bản", HttpStatus.NOT_FOUND),

    // Serie errors
    SERIE_NOT_FOUND(4044, "Không tìm thấy bộ sách", HttpStatus.NOT_FOUND),
    SERIE_ALREADY_EXISTS(4005, "Tên bộ sách đã tồn tại", HttpStatus.BAD_REQUEST),

    // General
    UNAUTHENTICATED(4010, "Chưa xác thực", HttpStatus.UNAUTHORIZED),
    FORBIDDEN(4030, "Không có quyền truy cập", HttpStatus.FORBIDDEN),
    INVALID_REQUEST(4000, "Yêu cầu không hợp lệ", HttpStatus.BAD_REQUEST),
    DATA_ALREADY_INITIALIZED(4006, "Dữ liệu đã được khởi tạo trước đó", HttpStatus.BAD_REQUEST),
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
