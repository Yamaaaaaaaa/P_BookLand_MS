package com.bookland.file.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {
    // File errors
    FILE_UPLOAD_FAILED(4001, "Upload file thất bại", HttpStatus.INTERNAL_SERVER_ERROR),
    FILE_DELETE_FAILED(4002, "Xóa file thất bại", HttpStatus.INTERNAL_SERVER_ERROR),
    FILE_TOO_LARGE(4003, "Kích thước file quá lớn (tối đa 5MB)", HttpStatus.BAD_REQUEST),
    FILE_INVALID_FORMAT(4004, "Định dạng file không hợp lệ", HttpStatus.BAD_REQUEST),

    // General
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
