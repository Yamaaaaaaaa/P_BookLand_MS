package com.bookland.book.repository.specification;

import com.bookland.book.entity.Book;
import com.bookland.book.entity.Book.BookStatus;
import com.bookland.book.entity.Category;
import jakarta.persistence.criteria.Join;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

public class BookSpecification {

    public static Specification<Book> searchByKeyword(String keyword) {
        return (root, query, cb) -> {
            if (keyword == null || keyword.isBlank()) return cb.conjunction();
            String pattern = "%" + keyword.toLowerCase() + "%";
            return cb.like(cb.lower(root.get("name")), pattern);
        };
    }

    public static Specification<Book> hasStatus(BookStatus status) {
        return (root, query, cb) ->
                status == null ? cb.conjunction() : cb.equal(root.get("status"), status);
    }

    public static Specification<Book> hasAuthors(List<Long> authorIds) {
        return (root, query, cb) ->
                (authorIds == null || authorIds.isEmpty())
                        ? cb.conjunction()
                        : root.get("author").get("id").in(authorIds);
    }

    public static Specification<Book> hasPublishers(List<Long> publisherIds) {
        return (root, query, cb) ->
                (publisherIds == null || publisherIds.isEmpty())
                        ? cb.conjunction()
                        : root.get("publisher").get("id").in(publisherIds);
    }

    public static Specification<Book> hasSeries(List<Long> seriesIds) {
        return (root, query, cb) ->
                (seriesIds == null || seriesIds.isEmpty())
                        ? cb.conjunction()
                        : root.get("series").get("id").in(seriesIds);
    }

    public static Specification<Book> hasCategories(List<Long> categoryIds) {
        return (root, query, cb) -> {
            if (categoryIds == null || categoryIds.isEmpty()) return cb.conjunction();
            if (query != null) query.distinct(true);
            Join<Book, Category> join = root.join("categories");
            return join.get("id").in(categoryIds);
        };
    }

    public static Specification<Book> isPinned(Boolean pinned) {
        return (root, query, cb) ->
                pinned == null ? cb.conjunction() : cb.equal(root.get("pin"), pinned);
    }

    public static Specification<Book> priceBetween(Double minPrice, Double maxPrice) {
        return (root, query, cb) -> {
            if (minPrice == null && maxPrice == null) return cb.conjunction();
            if (minPrice != null && maxPrice != null)
                return cb.between(root.get("originalCost"), minPrice, maxPrice);
            if (minPrice != null) return cb.greaterThanOrEqualTo(root.get("originalCost"), minPrice);
            return cb.lessThanOrEqualTo(root.get("originalCost"), maxPrice);
        };
    }
}
