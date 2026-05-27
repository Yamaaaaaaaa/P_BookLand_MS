package com.bookland.search.service;

import com.bookland.search.client.BookClient;
import com.bookland.search.document.BookDocument;
import com.bookland.search.dto.ApiResponse;
import com.bookland.search.dto.BookDTO;
import com.bookland.search.dto.PageResponse;
import com.bookland.search.repository.BookSearchRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHit;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.data.elasticsearch.core.query.Criteria;
import org.springframework.data.elasticsearch.core.query.CriteriaQuery;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch.indices.AnalyzeResponse;
import co.elastic.clients.elasticsearch.indices.analyze.AnalyzeToken;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class SearchService {

    BookSearchRepository bookSearchRepository;
    BookClient bookClient;
    ElasticsearchOperations elasticsearchOperations;
    ElasticsearchClient elasticsearchClient;

    public String initData() {
        log.info("Starting synchronization of book data from MySQL to Elasticsearch...");

        // Fetch all books (up to 10000 for seeding)
        ApiResponse<PageResponse<BookDTO>> response = bookClient.getAllBooks(0, 10000, true);
        if (response == null || response.getResult() == null || response.getResult().getContent() == null) {
            log.error("Failed to fetch books from book-service or empty database.");
            return "No books found in book-service to synchronize.";
        }

        List<BookDTO> books = response.getResult().getContent();

        // Convert to BookDocument
        List<BookDocument> documents = books.stream()
                .map(this::toDocument)
                .collect(Collectors.toList());

        // Clear existing index
        bookSearchRepository.deleteAll();

        // Save in bulk
        bookSearchRepository.saveAll(documents);
        log.info("Successfully synchronized {} books to Elasticsearch.", documents.size());
        return "Synchronized " + documents.size() + " books to Elasticsearch successfully.";
    }

    public PageResponse<BookDTO> searchBooks(
            String keyword,
            List<Long> authorIds,
            List<Long> publisherIds,
            List<Long> seriesIds,
            List<Long> categoryIds,
            Double minPrice,
            Double maxPrice,
            Pageable pageable) {

        List<Criteria> criteriaList = new ArrayList<>();

        if (keyword != null && !keyword.trim().isEmpty()) {
            String cleanKw = keyword.trim();
            // Full-text matching across fields (using .is() which translates to match query for text fields)
            Criteria keywordCriteria = new Criteria("name").contains(cleanKw)
                    .or(new Criteria("description").contains(cleanKw))
                    .or(new Criteria("authorName").contains(cleanKw))
                    .or(new Criteria("publisherName").contains(cleanKw))
                    .or(new Criteria("seriesName").contains(cleanKw));
            criteriaList.add(keywordCriteria);
        }

        if (authorIds != null && !authorIds.isEmpty()) {
            criteriaList.add(new Criteria("authorId").in(authorIds));
        }

        if (publisherIds != null && !publisherIds.isEmpty()) {
            criteriaList.add(new Criteria("publisherId").in(publisherIds));
        }

        if (seriesIds != null && !seriesIds.isEmpty()) {
            criteriaList.add(new Criteria("seriesId").in(seriesIds));
        }

        if (categoryIds != null && !categoryIds.isEmpty()) {
            criteriaList.add(new Criteria("categoryIds").in(categoryIds));
        }

        if (minPrice != null) {
            criteriaList.add(new Criteria("finalPrice").greaterThanEqual(minPrice));
        }

        if (maxPrice != null) {
            criteriaList.add(new Criteria("finalPrice").lessThanEqual(maxPrice));
        }

        // Combine criteria
        Criteria combinedCriteria = new Criteria();
        if (!criteriaList.isEmpty()) {
            combinedCriteria = criteriaList.get(0);
            for (int i = 1; i < criteriaList.size(); i++) {
                combinedCriteria = combinedCriteria.and(criteriaList.get(i));
            }
        }

        CriteriaQuery query = new CriteriaQuery(combinedCriteria).setPageable(pageable);
        SearchHits<BookDocument> searchHits = elasticsearchOperations.search(query, BookDocument.class);

        // Convert search hits to BookDTO
        List<BookDTO> content = searchHits.getSearchHits().stream()
                .map(SearchHit::getContent)
                .map(this::toDTO)
                .collect(Collectors.toList());

        long totalElements = searchHits.getTotalHits();
        Page<BookDTO> page = new PageImpl<>(content, pageable, totalElements);

        return PageResponse.from(page);
    }

    public BookDocument getBookDocument(Long bookId) {
        return bookSearchRepository.findByBookId(bookId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy dữ liệu sách trong Elasticsearch cho ID: " + bookId));
    }

    public List<String> getBookKeywords(Long bookId) {
        BookDocument bookDoc;
        try {
            bookDoc = getBookDocument(bookId);
        } catch (Exception e) {
            log.info("Book ID {} not found in Elasticsearch. Fetching from book-service to index on the fly...", bookId);
            try {
                ApiResponse<BookDTO> bookResponse = bookClient.getBookById(bookId);
                if (bookResponse != null && bookResponse.getResult() != null) {
                    BookDTO bookDto = bookResponse.getResult();
                    indexBook(bookDto); // Save to ES on the fly
                    bookDoc = toDocument(bookDto);
                } else {
                    throw new RuntimeException("Book not found in MySQL for ID: " + bookId);
                }
            } catch (Exception ex) {
                log.error("Failed to fetch and index book ID {} from MySQL on the fly", bookId, ex);
                throw new RuntimeException("Không tìm thấy dữ liệu sách cho ID: " + bookId);
            }
        }

        List<String> texts = new ArrayList<>();
        if (bookDoc.getName() != null) texts.add(bookDoc.getName());
        if (bookDoc.getDescription() != null) texts.add(bookDoc.getDescription());
        if (bookDoc.getAuthorName() != null) texts.add(bookDoc.getAuthorName());
        if (bookDoc.getPublisherName() != null) texts.add(bookDoc.getPublisherName());
        if (bookDoc.getSeriesName() != null) texts.add(bookDoc.getSeriesName());

        try {
            AnalyzeResponse analyzeResponse = elasticsearchClient.indices().analyze(a -> a
                    .index("books")
                    .text(texts)
            );
            return analyzeResponse.tokens().stream()
                    .map(AnalyzeToken::token)
                    .distinct()
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Failed to analyze keywords for book ID {} via Elasticsearch, fallback to split tokenization.", bookId, e);
            return texts.stream()
                    .flatMap(text -> java.util.Arrays.stream(text.toLowerCase().split("\\P{L}+")))
                    .filter(token -> !token.isEmpty() && token.length() > 1)
                    .distinct()
                    .collect(Collectors.toList());
        }
    }

    // Realtime Sync methods (called from Kafka or internal service)
    public void indexBook(BookDTO bookDTO) {
        BookDocument doc = toDocument(bookDTO);
        bookSearchRepository.save(doc);
        log.info("Successfully indexed book ID {} to Elasticsearch.", bookDTO.getId());
    }

    public void removeBook(Long bookId) {
        bookSearchRepository.deleteByBookId(bookId);
        log.info("Successfully removed book ID {} from Elasticsearch.", bookId);
    }

    private BookDocument toDocument(BookDTO dto) {
        return BookDocument.builder()
                .id(dto.getId() != null ? dto.getId().toString() : null)
                .bookId(dto.getId())
                .name(dto.getName())
                .description(dto.getDescription())
                .originalCost(dto.getOriginalCost())
                .sale(dto.getSale())
                .finalPrice(dto.getFinalPrice())
                .stock(dto.getStock())
                .status(dto.getStatus() != null ? dto.getStatus().toString() : "ENABLE")
                .publishedDate(dto.getPublishedDate())
                .bookImageUrl(dto.getBookImageUrl())
                .pin(dto.getPin())
                .authorId(dto.getAuthorId())
                .authorName(dto.getAuthorName())
                .publisherId(dto.getPublisherId())
                .publisherName(dto.getPublisherName())
                .seriesId(dto.getSeriesId())
                .seriesName(dto.getSeriesName())
                .categoryIds(dto.getCategoryIds())
                .build();
    }

    private BookDTO toDTO(BookDocument doc) {
        return BookDTO.builder()
                .id(doc.getBookId())
                .name(doc.getName())
                .description(doc.getDescription())
                .originalCost(doc.getOriginalCost())
                .sale(doc.getSale())
                .finalPrice(doc.getFinalPrice())
                .stock(doc.getStock())
                .status(doc.getStatus())
                .publishedDate(doc.getPublishedDate())
                .bookImageUrl(doc.getBookImageUrl())
                .pin(doc.getPin())
                .authorId(doc.getAuthorId())
                .authorName(doc.getAuthorName())
                .publisherId(doc.getPublisherId())
                .publisherName(doc.getPublisherName())
                .seriesId(doc.getSeriesId())
                .seriesName(doc.getSeriesName())
                .categoryIds(doc.getCategoryIds())
                .build();
    }
}
