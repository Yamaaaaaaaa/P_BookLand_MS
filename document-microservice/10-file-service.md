# 10 — File Service

> Upload và quản lý file media (ảnh sách, avatar, banner sự kiện).

---

## 1. Tổng quan

**Port**: `8087` | **Storage**: `MinIO (dev/staging)` hoặc `Supabase/AWS S3 (production)`

Stateless service — không có database, chỉ tương tác với object storage.

---

## 2. Strategy

| Environment | Storage Backend |
|---|---|
| **Development** | MinIO (self-hosted Docker) |
| **Staging** | MinIO hoặc Supabase Storage |
| **Production** | AWS S3 hoặc Supabase Storage |

MinIO tương thích 100% với AWS S3 API → dễ switch sang S3 production.

---

## 3. API Endpoints

### Upload
```
POST /api/files/upload
Content-Type: multipart/form-data
Body: file (binary), bucket: "books|avatars|events"

Response 201:
{
  "fileId": "uuid-v4",
  "fileName": "book-cover-123.webp",
  "fileUrl": "http://localhost:9000/books/book-cover-123.webp",
  "size": 245678,
  "mimeType": "image/webp"
}
```

### Upload Multiple
```
POST /api/files/upload-multiple
Content-Type: multipart/form-data
Body: files[] (multiple)

Response 201: [ FileResponse, FileResponse, ... ]
```

### Delete
```
DELETE /api/files/{fileId}
Response 204: No Content
```

### File Info
```
GET /api/files/{fileId}/info
Response 200: { fileId, fileName, fileUrl, size, mimeType, uploadedAt }
```

---

## 4. Xử lý upload

```java
@Service
@RequiredArgsConstructor
public class FileService {

    private final MinioClient minioClient;

    public FileResponse upload(MultipartFile file, String bucket) {
        // 1. Validate file type
        validateFileType(file);

        // 2. Generate unique filename
        String extension = getExtension(file.getOriginalFilename());
        String fileName = UUID.randomUUID() + "." + extension;

        // 3. Convert to WebP (tối ưu dung lượng)
        InputStream processedStream = imageProcessor.convertToWebP(file.getInputStream());

        // 4. Upload lên MinIO
        minioClient.putObject(
            PutObjectArgs.builder()
                .bucket(bucket)
                .object(fileName)
                .stream(processedStream, processedStream.available(), -1)
                .contentType("image/webp")
                .build()
        );

        // 5. Trả về public URL
        String publicUrl = minioBaseUrl + "/" + bucket + "/" + fileName;
        return FileResponse.builder()
            .fileId(UUID.randomUUID().toString())
            .fileName(fileName)
            .fileUrl(publicUrl)
            .build();
    }
}
```

---

## 5. Docker MinIO Setup

```yaml
minio:
  image: minio/minio:latest
  ports:
    - "9000:9000"    # API (S3-compatible)
    - "9001:9001"    # Web Console
  environment:
    MINIO_ROOT_USER: bookland
    MINIO_ROOT_PASSWORD: bookland123
  command: server /data --console-address ":9001"
  volumes:
    - minio_data:/data
```

**MinIO Console**: http://localhost:9001
- Tạo buckets: `books`, `avatars`, `events`, `misc`
- Set bucket policy: Public read

---

## 6. Migration từ Supabase

Dự án hiện đang dùng **Supabase Storage** (`SupabaseStorageService.java`).

**Option 1**: Giữ Supabase — Chỉ wrap lại trong File Service (dễ nhất)
```java
// File Service gọi Supabase API thay vì MinIO
// Không cần thay đổi logic upload hiện tại
```

**Option 2**: Chuyển sang MinIO — Self-hosted, kiểm soát hoàn toàn

Khuyến nghị: **Option 1** trước (nhanh hơn), sau đó migrate sang MinIO khi cần.

---

*← [09 - Event Service](./09-event-service.md) | [11 - Search Service →](./11-search-service.md)*
