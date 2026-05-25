package com.bookland.event.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {
    // Event errors
    EVENT_NOT_FOUND(2901, "Không tìm thấy sự kiện", HttpStatus.NOT_FOUND),
    EVENT_HAS_LOGS(2902, "Không thể xóa sự kiện đang có logs", HttpStatus.BAD_REQUEST),
    EVENT_INVALID_TIME(2903, "Thời gian bắt đầu phải trước thời gian kết thúc", HttpStatus.BAD_REQUEST),

    // Event Target errors
    EVENT_TARGET_BOOK_NOT_FOUND(2910, "Không tìm thấy sách mục tiêu", HttpStatus.NOT_FOUND),
    EVENT_TARGET_CATEGORY_NOT_FOUND(2911, "Không tìm thấy danh mục mục tiêu", HttpStatus.NOT_FOUND),
    EVENT_TARGET_SERIES_NOT_FOUND(2912, "Không tìm thấy bộ sách mục tiêu", HttpStatus.NOT_FOUND),
    EVENT_TARGET_AUTHOR_NOT_FOUND(2913, "Không tìm thấy tác giả mục tiêu", HttpStatus.NOT_FOUND),
    EVENT_TARGET_PUBLISHER_NOT_FOUND(2914, "Không tìm thấy nhà xuất bản mục tiêu", HttpStatus.NOT_FOUND),
    EVENT_TARGET_USER_NOT_FOUND(2915, "Không tìm thấy người dùng mục tiêu", HttpStatus.NOT_FOUND),
    USER_NOT_EXISTED(1005, "Người dùng không tồn tại", HttpStatus.NOT_FOUND),

    // File errors
    FILE_UPLOAD_FAILED(4001, "Upload file thất bại", HttpStatus.INTERNAL_SERVER_ERROR),
    FILE_DELETE_FAILED(4002, "Xóa file thất bại", HttpStatus.INTERNAL_SERVER_ERROR),
    FILE_TOO_LARGE(4003, "Kích thước file quá lớn", HttpStatus.BAD_REQUEST),
    FILE_INVALID_FORMAT(4004, "Định dạng file không hợp lệ", HttpStatus.BAD_REQUEST),

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
