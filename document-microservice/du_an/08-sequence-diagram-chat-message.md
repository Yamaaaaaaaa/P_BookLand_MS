# Sơ đồ Sequence Diagram - Luồng Xử lý Tin nhắn Chat (BookLand Microservice)

Tài liệu này mô tả chi tiết luồng xử lý tin nhắn (Chat) trong hệ thống **BookLand Microservice**. Luồng xử lý chat được thiết kế dưới dạng kết hợp (Hybrid):
1. **Gửi tin nhắn qua REST API**: Đảm bảo tin nhắn được xử lý giao dịch (Transaction), lưu trữ vào database MySQL (`chat_db`) và tích hợp phân quyền Gateway dễ dàng.
2. **Nhận tin nhắn realtime qua WebSocket (STOMP/SockJS)**: Sử dụng kênh truyền hai chiều WebSocket để đẩy tin nhắn ngay lập tức tới người nhận và người gửi mà không cần tải lại trang.

---

## 1. Sơ đồ Sequence Diagram (Mermaid)

```mermaid
sequenceDiagram
    autonumber
    actor User as Khách hàng / Client 1 (FE)
    actor Admin as Admin / Staff / Client 2 (FE)
    participant GW as API Gateway (:8080)
    participant ChatSvc as Chat Service (:8089)
    participant UserSvc as User Service (:8082)
    participant WSBroker as WebSocket Broker (STOMP)
    database ChatDB as MySQL (chat_db)

    %% SECTION 1: ESTABLISH WEBSOCKET CONNECTION
    Note over User, WSBroker: PHẦN 1: THIẾT LẬP KẾT NỐI WEBSOCKET AUTHENTICATED
    
    rect rgb(240, 248, 255)
        User->>GW: Kết nối WebSocket /chat-ws (SockJS)<br/>Headers: Authorization: Bearer <JWT>
        activate GW
        GW->>ChatSvc: Forward handshake tới /chat-ws
        activate ChatSvc
        
        Note over ChatSvc: STOMP CONNECT Frame Interceptor:<br/>1. Đọc Authorization header từ STOMP Native Header<br/>2. Giải mã local JWT & trích xuất claim 'sub' (Email)
        
        Note over ChatSvc: 3. Thiết lập UsernamePasswordAuthenticationToken<br/>với Principal = email của User
        
        ChatSvc-->>GW: Trả về STOMP CONNECTED Frame
        GW-->>User: Kết nối thành công
        
        User->>WSBroker: SUBSCRIBE /user/queue/chat<br/>(Đăng ký nhận tin nhắn cá nhân)
        activate WSBroker
        WSBroker-->>User: Subscribe Ack
        deactivate WSBroker
    end

    rect rgb(255, 240, 245)
        Admin->>GW: Kết nối WebSocket /chat-ws (SockJS)<br/>Headers: Authorization: Bearer <JWT_Admin>
        GW->>ChatSvc: Forward handshake tới /chat-ws
        
        Note over ChatSvc: STOMP CONNECT Frame Interceptor:<br/>Giải mã Token → Lấy Email Admin (admin@bookland.com)
        
        ChatSvc-->>GW: Trả về STOMP CONNECTED Frame
        GW-->>Admin: Kết nối thành công
        deactivate ChatSvc
        deactivate GW
        
        Admin->>WSBroker: SUBSCRIBE /user/queue/chat<br/>(Đăng ký nhận tin nhắn cá nhân của Admin)
        activate WSBroker
        WSBroker-->>Admin: Subscribe Ack
        deactivate WSBroker
    end

    %% SECTION 2: SEND MESSAGE FLOW
    Note over User, ChatDB: PHẦN 2: GỬI TIN NHẮN REALTIME
    
    User->>GW: POST /api/chat/send (SendChatMessageRequest)<br/>Headers: Authorization: Bearer <JWT>, X-User-Id: 42<br/>Body: { "toEmail": "admin@bookland.com", "content": "Xin chào BookLand!" }
    activate GW
    GW->>ChatSvc: Forward POST /api/chat/send
    activate ChatSvc
    
    ChatSvc->>UserSvc: GET /api/users/profile/42 (Lấy Profile người gửi)
    activate UserSvc
    UserSvc-->>ChatSvc: Trả về UserProfileResponse (fromUser: user@gmail.com)
    deactivate UserSvc
    
    ChatSvc->>UserSvc: GET /api/users/profile/email?email=admin@bookland.com (Lấy Profile người nhận)
    activate UserSvc
    UserSvc-->>ChatSvc: Trả về UserProfileResponse (toUser: ID = 1)
    deactivate UserSvc
    
    Note over ChatSvc: Tạo thực thể ChatMessage (fromUserId: 42, toUserId: 1, isRead: false)
    ChatSvc->>ChatDB: Insert tin nhắn vào MySQL
    activate ChatDB
    ChatDB-->>ChatSvc: Xác nhận đã lưu (ChatMessageEntity với ID = 100)
    deactivate ChatDB
    
    Note over ChatSvc: Khởi tạo ChatMessageResponse (Dữ liệu trả về hiển thị)
    
    par Đẩy tin nhắn realtime tới Người nhận (Admin)
        ChatSvc->>WSBroker: convertAndSendToUser("admin@bookland.com", "/queue/chat", Response)
        activate WSBroker
        WSBroker-->>Admin: Đẩy STOMP MESSAGE Frame qua WS connection
        deactivate WSBroker
    and Đẩy tin nhắn realtime ngược về Người gửi (User) để cập nhật UI đồng bộ
        ChatSvc->>WSBroker: convertAndSendToUser("user@gmail.com", "/queue/chat", Response)
        activate WSBroker
        WSBroker-->>User: Đẩy STOMP MESSAGE Frame qua WS connection
        deactivate WSBroker
    end
    
    ChatSvc-->>GW: Trả về ApiResponse<ChatMessageResponse> (REST Response)
    deactivate ChatSvc
    GW-->>User: Trả về ApiResponse (REST Response)
    deactivate GW

    %% SECTION 3: HISTORY & MARK READ FLOW
    Note over Admin, ChatDB: PHẦN 3: ĐỌC LỊCH SỬ CHAT & ĐÁNH DẤU ĐÃ ĐỌC (MARK READ)
    
    Admin->>GW: GET /api/chat/history/42 (Admin đọc lịch sử chat với User ID 42)<br/>Headers: X-User-Id: 1 (Admin ID)
    activate GW
    GW->>ChatSvc: Forward GET /api/chat/history/42
    activate ChatSvc
    ChatSvc->>ChatDB: Query chat_messages WHERE (from=42 AND to=1) OR (from=1 AND to=42)
    activate ChatDB
    ChatDB-->>ChatSvc: Trả về danh sách tin nhắn
    deactivate ChatDB
    ChatSvc-->>GW: Trả về danh sách ChatMessageResponse
    deactivate ChatSvc
    GW-->>Admin: Trả về danh sách lịch sử chat
    deactivate GW

    Admin->>GW: PUT /api/chat/mark-read/42 (Đánh dấu đã đọc các tin nhắn từ User ID 42)<br/>Headers: X-User-Id: 1
    activate GW
    GW->>ChatSvc: Forward PUT /api/chat/mark-read/42
    activate ChatSvc
    ChatSvc->>ChatDB: UPDATE chat_messages SET is_read = true WHERE from_user_id = 42 AND to_user_id = 1 AND is_read = false
    activate ChatDB
    ChatDB-->>ChatSvc: Xác nhận cập nhật thành công
    deactivate ChatDB
    ChatSvc-->>GW: Trả về 200 OK (Messages marked as read)
    deactivate ChatSvc
    GW-->>Admin: Trả về Response 200 OK
    deactivate GW
```

---

## 2. Giải thích chi tiết các thành phần và luồng hoạt động

### Pha 1: Thiết lập kết nối WebSocket có Xác thực (Authentication)
Vì hệ thống chạy theo kiến trúc Microservice, kết nối WebSocket được định tuyến qua **API Gateway** và đi trực tiếp tới **Chat Service** (tại endpoint `/chat-ws`). Để đảm bảo an toàn bảo mật:
1. Khi thiết lập kết nối (handshake), Client (Frontend) gửi yêu cầu kết nối WebSocket chứa header bảo mật `Authorization: Bearer <JWT>` lồng vào trong frame CONNECT của giao thức STOMP.
2. **ChannelInterceptor** cấu hình trong `WebSocketConfig.java` sẽ bắt lấy frame `CONNECT` trước khi nó được xử lý.
3. Chat Service thực hiện giải mã token JWT bằng cách lấy phần Payload (Base64) và phân tích trường `sub` (chứa email người dùng). Điều này giúp Chat Service thực hiện xác thực trực tiếp mà không cần phải gọi API Gateway kiểm tra JWT cho mọi frame tin nhắn sau đó.
4. Sau khi lấy được email người dùng (ví dụ: `user@gmail.com`), hệ thống khởi tạo đối tượng `UsernamePasswordAuthenticationToken` và gán nó làm User Principal của phiên (session) WebSocket đó.
5. Client thực hiện đăng ký (Subscribe) vào kênh cá nhân `/user/queue/chat` (tương đương với địa chỉ đích thực tế là `/user/{email}/queue/chat`). Lúc này, WebSocket Broker sẽ quản lý kết nối và biết chính xác địa chỉ IP/phiên nào tương ứng với email nào.

### Pha 2: Gửi và Đẩy tin nhắn Realtime (Send Message Flow)
Luồng gửi tin nhắn sử dụng một kiến trúc lai (Hybrid) cực kỳ tối ưu:
1. **Gửi tin nhắn (Client $\rightarrow$ Server)**: Thay vì gửi qua WebSocket frame (dễ bị mất gói, khó bắt lỗi và khó đi qua bộ lọc Auth của API Gateway), Client gửi qua giao thức HTTP REST thông thường tới endpoint `POST /api/chat/send`. Request được API Gateway kiểm tra Token JWT, chèn thêm header `X-User-Id` của người gửi và forward tới **Chat Service**.
2. **Xử lý nghiệp vụ tại Chat Service**:
   * Lấy profile chi tiết người gửi (`fromUser`) từ **User Service** thông qua ID nhận từ header.
   * Lấy profile người nhận (`toUser`) từ **User Service** thông qua địa chỉ email nhận được trong Request Body (`toEmail`).
   * Tạo bản ghi `ChatMessage` và lưu trữ vào MySQL (`chat_db`). Thao tác này được đặt trong một transaction `@Transactional` để đảm bảo dữ liệu luôn được ghi nhận an toàn trước khi đẩy đi.
3. **Đẩy tin nhắn Realtime (Server $\rightarrow$ Client)**:
   * Chat Service gọi `SimpMessagingTemplate.convertAndSendToUser(toUser.getEmail(), "/queue/chat", response)` để đẩy tin nhắn realtime tới hàng đợi (queue) của người nhận. WS Broker sẽ tìm kết nối active có Email trùng với `toUser.getEmail()` để đẩy tin nhắn qua WebSocket.
   * Đồng thời, Chat Service cũng gửi một bản sao của tin nhắn này về hàng đợi của người gửi (`fromUser.getEmail()`) nhằm thông báo cho giao diện người gửi cập nhật tin nhắn vừa gửi thành công lên màn hình chat.
   * Phương thức HTTP REST trả về phản hồi `200 OK` cho người gửi.

### Pha 3: Xem lịch sử & Đánh dấu đã đọc (History & Mark Read)
Để hiển thị trạng thái tin nhắn và số lượng tin nhắn chưa đọc chính xác:
* **Tải lịch sử chat (`GET /api/chat/history/{otherUserId}`)**: Khi người dùng hoặc Admin mở hộp thoại chat, Frontend gọi API này để Chat Service lấy toàn bộ tin nhắn qua lại giữa hai người từ database MySQL và trả về hiển thị.
* **Đánh dấu đã đọc (`PUT /api/chat/mark-read/{otherUserId}`)**: Khi người dùng xem tin nhắn mới, Frontend gửi yêu cầu đánh dấu đã đọc. **Chat Service** thực hiện truy vấn và cập nhật tất cả tin nhắn gửi từ `otherUserId` tới `currentUserId` đang ở trạng thái `is_read = false` chuyển thành `true`.
* **Đếm số tin nhắn chưa đọc (`GET /api/chat/unread-count`)**: Trả về số lượng tin nhắn gửi tới user hiện tại nhưng chưa được đọc để hiển thị badge thông báo (ví dụ: số 1, 2, 3 đỏ trên icon chat).
