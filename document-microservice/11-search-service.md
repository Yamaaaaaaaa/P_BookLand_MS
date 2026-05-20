# 11 — Search Service (Elasticsearch)

> Tìm kiếm nâng cao cho sách — Full-text, filter, autocomplete.

---

## 1. Tổng quan

**Port**: `8088` | **Database**: `Elasticsearch 8.x` | **Kafka**: Consumer

Service này **không có MySQL** — chỉ Elasticsearch làm data store và Kafka để nhận updates từ Book Service.

---

## 2. Elasticsearch Index Schema

```json
PUT /bookland-books
{
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 0,
    "analysis": {
      "analyzer": {
        "vietnamese_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "asciifolding"]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "bookId":       { "type": "keyword" },
      "title":        { "type": "text", "analyzer": "vietnamese_analyzer", "boost": 3 },
      "description":  { "type": "text", "analyzer": "vietnamese_analyzer" },
      "authorName":   { "type": "text", "analyzer": "vietnamese_analyzer", "boost": 2 },
      "categoryName": { "type": "keyword" },
      "categoryId":   { "type": "integer" },
      "publisherName":{ "type": "text" },
      "price":        { "type": "double" },
      "stock":        { "type": "integer" },
      "rating":       { "type": "float" },
      "soldCount":    { "type": "integer" },
      "coverImage":   { "type": "keyword", "index": false },
      "status":       { "type": "keyword" },
      "createdAt":    { "type": "date" }
    }
  }
}
```

---

## 2. Kafka Consumer

```java
@KafkaListener(topics = "book.created", groupId = "search-service")
public void onBookCreated(BookCreatedEvent event) {
    BookDocument doc = BookDocument.builder()
        .bookId(event.getBookId().toString())
        .title(event.getTitle())
        .authorName(event.getAuthorName())
        .categoryName(event.getCategoryName())
        .price(event.getPrice())
        .stock(event.getStock())
        .coverImage(event.getCoverImage())
        .status("ACTIVE")
        .createdAt(event.getCreatedAt())
        .build();
    bookSearchRepository.save(doc);
}

@KafkaListener(topics = "book.stock.updated", groupId = "search-service")
public void onStockUpdated(BookStockUpdatedEvent event) {
    // Chỉ update field stock, không overwrite toàn bộ document
    bookSearchRepository.updateStock(event.getBookId().toString(), event.getNewStock());
}

@KafkaListener(topics = "book.deleted", groupId = "search-service")
public void onBookDeleted(BookDeletedEvent event) {
    bookSearchRepository.deleteById(event.getBookId().toString());
}
```

---

## 3. API Endpoints

### Full-text Search
```
GET /api/search/books
    ?q=harry potter           ← Full-text query
    &category=fantasy         ← Filter theo category
    &authorId=5               ← Filter theo tác giả
    &minPrice=50000
    &maxPrice=500000
    &inStock=true             ← Chỉ sách còn hàng
    &sort=price,asc | rating,desc | createdAt,desc
    &page=0&size=20

Response:
{
  "total": 245,
  "page": 0,
  "size": 20,
  "books": [
    {
      "bookId": "1",
      "title": "Harry Potter và Hòn Đá Phù Thủy",
      "authorName": "J.K. Rowling",
      "price": 120000,
      "stock": 50,
      "rating": 4.8,
      "coverImage": "https://..."
    }
  ],
  "facets": {
    "categories": [
      { "name": "Fantasy", "count": 45 },
      { "name": "Fiction", "count": 30 }
    ],
    "priceRanges": [...]
  }
}
```

### Autocomplete
```
GET /api/search/books/suggest?q=harr

Response:
{
  "suggestions": [
    "Harry Potter",
    "Harry Houdini",
    "Harvard Business Review"
  ]
}
```

### Trending
```
GET /api/search/books/trending?limit=10

← Dựa trên soldCount (cập nhật từ Kafka khi order completed)
```

---

## 4. Search Service Repository

```java
@Repository
public interface BookSearchRepository
    extends ElasticsearchRepository<BookDocument, String> {

    // Spring Data Elasticsearch tự generate query
    List<BookDocument> findByCategoryNameAndStockGreaterThan(
        String categoryName, int stock);

    // Custom query cho full-text
    @Query("""
        {
          "bool": {
            "must": [
              {
                "multi_match": {
                  "query": "?0",
                  "fields": ["title^3", "authorName^2", "description"],
                  "fuzziness": "AUTO"
                }
              }
            ],
            "filter": [
              { "range": { "price": { "gte": ?1, "lte": ?2 } } },
              { "term": { "status": "ACTIVE" } }
            ]
          }
        }
        """)
    Page<BookDocument> searchBooks(String query, double minPrice, double maxPrice,
                                    Pageable pageable);
}
```

---

## 5. Initial Data Sync

Khi dựng Search Service lần đầu, cần sync toàn bộ data từ Book Service:

```java
@Component
@Slf4j
public class InitialIndexSync implements ApplicationRunner {

    @Override
    public void run(ApplicationArguments args) {
        if (bookSearchRepository.count() == 0) {
            log.info("Elasticsearch index empty — starting initial sync...");

            // Gọi Book Service để lấy tất cả sách
            List<BookDto> allBooks = bookServiceClient.getAllBooks();
            List<BookDocument> docs = allBooks.stream()
                .map(this::toDocument)
                .collect(toList());

            bookSearchRepository.saveAll(docs);
            log.info("Synced {} books to Elasticsearch", docs.size());
        }
    }
}
```

---

*← [10 - File Service](./10-file-service.md) | [12 - Giao tiếp →](./12-communication.md)*
