package com.bookland.file.controller;

import com.bookland.file.dto.response.ApiResponse;
import com.bookland.file.exception.AppException;
import com.bookland.file.exception.ErrorCode;
import com.bookland.file.service.SupabaseStorageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/uploads")
@RequiredArgsConstructor
@SecurityRequirement(name = "BearerAuth")
@Tag(name = "Upload", description = "API quản lý upload file")
public class UploadController {

    private final SupabaseStorageService storageService;

    private static final List<String> ALLOWED_IMAGE_TYPES = Arrays.asList(
            "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"
    );

    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024;

    @GetMapping("/images")
    @Operation(
            summary = "Lấy danh sách ảnh đã upload",
            description = "Trả về toàn bộ ảnh trong Supabase Storage bucket (có phân trang)"
    )
    public ApiResponse<Page<Map<String, Object>>> getAllImages(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "created_at") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection
    ) {
        try {
            Sort.Direction direction = sortDirection.equalsIgnoreCase("ASC")
                    ? Sort.Direction.ASC
                    : Sort.Direction.DESC;
            Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));

            Page<Map<String, Object>> images = storageService.listImages(pageable);
            return ApiResponse.<Page<Map<String, Object>>>builder()
                    .result(images)
                    .build();
        } catch (Exception e) {
             throw new RuntimeException(e.getMessage());
        }
    }

    @PostMapping(value = "/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(
            summary = "Upload ảnh lên Supabase Storage",
            description = "Upload một ảnh lên Supabase Storage. Hỗ trợ: JPG, JPEG, PNG, GIF, WEBP. Tối đa 5MB."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Upload thành công",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(example = "{\"url\": \"https://supabase.co/storage/v1/object/public/images/abc123.jpg\"}")
                    )
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "File không hợp lệ"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Chưa đăng nhập"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "Lỗi server")
    })
    public ApiResponse<Map<String, Object>> uploadImage(
            @Parameter(
                    description = "File ảnh cần upload (JPG, PNG, GIF, WEBP - Max 5MB)",
                    required = true,
                    content = @Content(mediaType = MediaType.MULTIPART_FORM_DATA_VALUE)
            )
            @RequestParam("file") MultipartFile file
    ) throws IOException {

        if (file == null || file.isEmpty()) {
             throw new AppException(ErrorCode.FILE_UPLOAD_FAILED);
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_IMAGE_TYPES.contains(contentType.toLowerCase())) {
             throw new AppException(ErrorCode.FILE_INVALID_FORMAT);
        }

        if (file.getSize() > MAX_FILE_SIZE) {
             throw new AppException(ErrorCode.FILE_TOO_LARGE);
        }

        try {
            String imageUrl = storageService.uploadImage(file);

            Map<String, Object> response = new HashMap<>();
            response.put("url", imageUrl);
            response.put("fileName", file.getOriginalFilename());
            response.put("fileSize", file.getSize());
            response.put("contentType", file.getContentType());

            return ApiResponse.<Map<String, Object>>builder().result(response).build();

        } catch (Exception e) {
             throw new AppException(ErrorCode.FILE_UPLOAD_FAILED);
        }
    }

    @PostMapping(value = "/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(
            summary = "Upload nhiều ảnh cùng lúc",
            description = "Upload nhiều ảnh lên Supabase Storage. Tối đa 10 ảnh, mỗi ảnh max 5MB."
    )
    public ApiResponse<Map<String, Object>> uploadMultipleImages(
            @Parameter(description = "Danh sách file ảnh (Max 10 files, mỗi file max 5MB)")
            @RequestParam("files") List<MultipartFile> files
    ) {

        if (files == null || files.isEmpty()) {
             throw new AppException(ErrorCode.FILE_UPLOAD_FAILED);
        }

        if (files.size() > 10) {
             throw new AppException(ErrorCode.FILE_UPLOAD_FAILED);
        }

        try {
            List<Map<String, Object>> uploadedFiles = files.stream()
                    .map(file -> {
                        try {
                            if (file.getSize() > MAX_FILE_SIZE) {
                                Map<String, Object> error = new HashMap<>();
                                error.put("fileName", file.getOriginalFilename());
                                error.put("error", "File quá lớn");
                                return error;
                            }

                            String url = storageService.uploadImage(file);

                            Map<String, Object> result = new HashMap<>();
                            result.put("url", url);
                            result.put("fileName", file.getOriginalFilename());
                            result.put("fileSize", file.getSize());
                            result.put("success", true);
                            return result;

                        } catch (Exception e) {
                            Map<String, Object> error = new HashMap<>();
                            error.put("fileName", file.getOriginalFilename());
                            error.put("error", e.getMessage());
                            error.put("success", false);
                            return error;
                        }
                    })
                    .toList();

            return ApiResponse.<Map<String, Object>>builder().result(Map.of("files", uploadedFiles)).build();

        } catch (Exception e) {
             throw new AppException(ErrorCode.FILE_UPLOAD_FAILED);
        }
    }

    @DeleteMapping("/image")
    @Operation(summary = "Xóa ảnh khỏi Supabase Storage")
    public ApiResponse<Void> deleteImage(@RequestParam String fileName) {
        try {
            storageService.deleteImage(fileName);
            return ApiResponse.<Void>builder().build();
        } catch (Exception e) {
            throw new AppException(ErrorCode.FILE_DELETE_FAILED);
        }
    }
}
