# Sơ đồ Sequence Diagram - Luồng Đồng bộ Search Index (BookLand Microservice)

Tài liệu này mô tả chi tiết cách hệ thống thực hiện đồng bộ hóa dữ liệu từ cơ sở dữ liệu quan hệ chính (MySQL `book_db` trong **Book Service**) sang công cụ tìm kiếm Elasticsearch trong **Search Service**. 

Hệ thống triển khai 3 kịch bản đồng bộ dữ liệu:
1. **Initial Sync / Full Sync**: Đồng bộ toàn bộ dữ liệu ban đầu từ MySQL sang Elasticsearch.
2. **Real-time Sync**: Đồng bộ hóa tức thời khi có các hành động Thêm/Sửa/Xóa sách hoặc cập nhật số lượng tồn kho.
3. **On-the-fly Sync (Đồng bộ chủ động khi thiếu dữ liệu)**: Tự động tải dữ liệu từ MySQL để index khi tìm kiếm/phân tích keyword của cuốn sách chưa có trong Elasticsearch.

---

## 1. Sơ đồ Sequence Diagram (Mermaid)

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin / Operator
    actor Client as Khách hàng / Frontend
    participant GW as API Gateway (:8080)
    participant SearchSvc as Search Service (:8088)
    participant BookSvc as Book Service (:8083)
    participant ES as Elasticsearch (Port 9200)
    database BookDB as MySQL (book_db)

    %% SECTION 1: INITIAL DATA SYNC
    Note over Admin, ES: PHẦN 1: ĐỒNG BỘ BAN ĐẦU (FULL DATA SYNC)
    Admin->>GW: POST /api/search/init-data
    activate GW
    GW->>SearchSvc: Forward POST /api/search/init-data
    activate SearchSvc
    
    SearchSvc->>BookSvc: GET /api/books (dbOnly=true, size=10000)
    activate BookSvc
    BookSvc->>BookDB: Truy vấn toàn bộ sách
    activate BookDB
    BookDB-->>BookSvc: Trả về danh sách thực thể Book
    deactivate BookDB
    BookSvc-->>SearchSvc: Trả về ApiResponse<PageResponse<BookDTO>>
    deactivate BookSvc
    
    Note over SearchSvc: 1. Làm sạch dữ liệu cũ trong Elasticsearch Index
    SearchSvc->>ES: Delete all documents (deleteAll)
    activate ES
    ES-->>SearchSvc: Xác nhận đã xóa sạch index
    deactivate ES
    
    Note over SearchSvc: 2. Chuyển đổi danh sách BookDTO sang BookDocument
    SearchSvc->>ES: Bulk Insert Documents (saveAll)
    activate ES
    ES-->>SearchSvc: Xác nhận hoàn thành index dữ liệu hàng loạt
    deactivate ES
    
    SearchSvc-->>GW: Trả về "Synchronized X books to Elasticsearch successfully."
    deactivate SearchSvc
    GW-->>Admin: Response 200 OK (Thông báo đồng bộ thành công)
    deactivate GW

    %% SECTION 2: REAL-TIME SYNCHRONIZATION
    Note over Client, ES: PHẦN 2: ĐỒNG BỘ THỜI GIAN THỰC (REAL-TIME SYNC ON CRUD)
    
    %% Scenario 2.1: Create Book
    alt Kịch bản 2.1: Thêm sách mới
        Admin->>GW: POST /api/books (BookRequest)
        activate GW
        GW->>BookSvc: Forward request
        activate BookSvc
        BookSvc->>BookDB: Insert bản ghi Book mới vào MySQL
        activate BookDB
        BookDB-->>BookSvc: Trả về Book Entity đã lưu
        deactivate BookDB
        
        Note over BookSvc: Gọi Feign Client đồng bộ sang Search Service
        BookSvc->>SearchSvc: Feign: POST /api/search/books (BookDTO)
        activate SearchSvc
        Note over SearchSvc: Map BookDTO -> BookDocument
        SearchSvc->>ES: Index Document (save)
        activate ES
        ES-->>SearchSvc: Document đã được lưu trong index
        deactivate ES
        SearchSvc-->>BookSvc: Trả về 200 OK (Indexed successfully)
        deactivate SearchSvc
        
        BookSvc-->>GW: Trả về BookDTO đã được tạo
        deactivate BookSvc
        GW-->>Admin: Response 200 OK
        deactivate GW
    end

    %% Scenario 2.2: Update Book Stock / Info
    alt Kịch bản 2.2: Cập nhật tồn kho hoặc chỉnh sửa thông tin sách
        Note over BookSvc: Ví dụ: Khi Đặt hàng, Hủy đơn, Nhập kho hoặc Sửa sách
        BookSvc->>BookDB: Cập nhật thông tin/tồn kho sách trong MySQL
        activate BookSvc
        activate BookDB
        BookDB-->>BookSvc: Xác nhận cập nhật thành công
        deactivate BookDB
        
        Note over BookSvc: Gọi Feign Client đồng bộ sang Search Service
        BookSvc->>SearchSvc: Feign: POST /api/search/books (BookDTO)
        activate SearchSvc
        SearchSvc->>ES: Ghi đè/Cập nhật document (save)
        activate ES
        ES-->>SearchSvc: Cập nhật index thành công
        deactivate ES
        SearchSvc-->>BookSvc: Trả về 200 OK
        deactivate SearchSvc
        deactivate BookSvc
    end

    %% Scenario 2.3: Delete Book
    alt Kịch bản 2.3: Xóa sách
        Admin->>GW: DELETE /api/books/{id}
        activate GW
        GW->>BookSvc: Forward request
        activate BookSvc
        BookSvc->>BookDB: Delete bản ghi trong MySQL
        activate BookDB
        BookDB-->>BookSvc: Xác nhận đã xóa thành công
        deactivate BookDB
        
        Note over BookSvc: Gọi Feign Client xóa khỏi Search Service
        BookSvc->>SearchSvc: Feign: DELETE /api/search/books/{id}
        activate SearchSvc
        SearchSvc->>ES: Delete Document (deleteByBookId)
        activate ES
        ES-->>SearchSvc: Document đã bị xóa khỏi index
        deactivate ES
        SearchSvc-->>BookSvc: Trả về 200 OK
        deactivate SearchSvc
        
        BookSvc-->>GW: Trả về kết quả xóa thành công
        deactivate BookSvc
        GW-->>Admin: Response 200 OK
        deactivate GW
    end

    %% SECTION 3: ON THE FLY INDEXING
    Note over Client, ES: PHẦN 3: ĐỒNG BỘ CHỦ ĐỘNG KHI THIẾU DỮ LIỆU (ON-THE-FLY SYNC)
    Client->>GW: GET /api/search/books/{bookId}/keywords
    activate GW
    GW->>SearchSvc: Forward request
    activate SearchSvc
    SearchSvc->>ES: Truy vấn document theo bookId trong index
    activate ES
    ES-->>SearchSvc: Trả về Rỗng (Không tìm thấy trong Elasticsearch)
    deactivate ES
    
    Note over SearchSvc: Phát hiện thiếu dữ liệu index! Kích hoạt đồng bộ tức thời
    SearchSvc->>BookSvc: GET /api/books/{id} (Truy vấn MySQL qua Feign Client)
    activate BookSvc
    BookSvc->>BookDB: Lấy thông tin sách chi tiết
    BookDB-->>BookSvc: Trả về Book Entity
    BookSvc-->>SearchSvc: Trả về BookDTO
    deactivate BookSvc
    
    SearchSvc->>ES: Index dữ liệu sách mới lấy được (save)
    activate ES
    ES-->>SearchSvc: Xác nhận đã lưu document vào index
    deactivate ES
    
    SearchSvc->>ES: Gọi Analyze API của Elasticsearch để tách từ khóa (Keywords)
    activate ES
    ES-->>SearchSvc: Trả về danh sách các từ khóa/tokens phân tích
    deactivate ES
    
    SearchSvc-->>GW: Trả về danh sách keywords
    deactivate SearchSvc
    GW-->>Client: Trả về danh sách keywords (200 OK)
    deactivate GW
```

---

## 2. Giải thích chi tiết hoạt động đồng bộ hóa

### Pha 1: Đồng bộ toàn bộ dữ liệu ban đầu (Full Sync / Initial Sync)
Được sử dụng khi triển khai hệ thống lần đầu hoặc khi dữ liệu trong Elasticsearch bị sai lệch nặng so với database chính.
1. Admin gọi API `POST /api/search/init-data`.
2. **Search Service** gọi API nội bộ của **Book Service** (`GET /api/books`) với cờ `dbOnly=true` và kích thước trang lớn (`size=10000`) nhằm chỉ lấy dữ liệu từ MySQL và bỏ qua việc định tuyến ngược lại Elasticsearch.
3. Sau khi nhận danh sách sách (`BookDTO`), **Search Service** thực hiện xóa toàn bộ chỉ mục cũ trong Elasticsearch thông qua hàm `bookSearchRepository.deleteAll()` để đảm bảo tính nhất quán.
4. Ánh xạ danh sách `BookDTO` sang `BookDocument` (chứa các thông tin cấu trúc hóa hỗ trợ tìm kiếm như tên sách, mô tả, tên tác giả, danh mục, giá, v.v.).
5. Tiến hành lưu hàng loạt (Bulk Save) vào Elasticsearch thông qua `bookSearchRepository.saveAll(documents)`.

### Pha 2: Đồng bộ hóa thời gian thực (Real-time Sync)
Bất cứ khi nào có thay đổi trong Catalog sách, **Book Service** sẽ đóng vai trò kích hoạt tiến trình đồng bộ dữ liệu thông qua **Spring Cloud OpenFeign**:
* **Thêm sách (`createBook`) & Sửa sách (`updateBook`)**: Sau khi lưu thành công vào MySQL, Book Service gọi hàm `syncToElasticsearch(BookDTO)`. Hàm này kích hoạt Feign Client `searchClient.indexBook(dto)` gửi dữ liệu tới Search Service để thêm/ghi đè document trong Elasticsearch.
* **Cập nhật tồn kho (`updateBookStock`)**: Khi có sự kiện thanh toán, hủy đơn hoặc nhập kho làm thay đổi số lượng tồn kho sách trong MySQL, Book Service cũng cập nhật ngay lập tức sang Elasticsearch thông qua `syncToElasticsearch(BookDTO)`.
* **Xóa sách (`deleteBook`)**: Sau khi xóa bản ghi khỏi MySQL, Book Service gọi `deleteFromElasticsearch(id)` $\rightarrow$ Kích hoạt Feign Client `searchClient.removeBook(id)` $\rightarrow$ Search Service thực thi `bookSearchRepository.deleteByBookId(id)` để gỡ sách khỏi kết quả tìm kiếm.

### Pha 3: Đồng bộ chủ động khi thiếu dữ liệu (On-the-fly Sync)
Đây là cơ chế tự phục hồi (Self-healing) của Search Service khi xảy ra tình huống không tìm thấy bản ghi trong Elasticsearch:
1. Khi khách hàng hoặc hệ thống yêu cầu lấy danh sách keywords phân tích từ sách (`GET /api/search/books/{bookId}/keywords`).
2. **Search Service** truy vấn Elasticsearch bằng `bookSearchRepository.findByBookId(bookId)`.
3. Nếu không tìm thấy, hệ thống không báo lỗi ngay mà chủ động gửi request ngược về **Book Service** (`GET /api/books/{id}`) để lấy dữ liệu mới nhất từ MySQL.
4. Lưu dữ liệu sách vừa lấy được vào Elasticsearch (`indexBook(bookDto)`), giúp bù đắp phần index bị thiếu.
5. Cuối cùng, gọi API phân tích (`Analyze API`) của Elasticsearch để trích xuất các từ khóa và trả về kết quả cho Client.
