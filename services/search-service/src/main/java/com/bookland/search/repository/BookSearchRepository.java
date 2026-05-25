package com.bookland.search.repository;

import com.bookland.search.document.BookDocument;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BookSearchRepository extends ElasticsearchRepository<BookDocument, String> {
    Optional<BookDocument> findByBookId(Long bookId);
    void deleteByBookId(Long bookId);
}
