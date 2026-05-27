package com.bookland.chat.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {
    USER_NOT_EXISTED(4041, "Người dùng không tồn tại", HttpStatus.NOT_FOUND),
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
