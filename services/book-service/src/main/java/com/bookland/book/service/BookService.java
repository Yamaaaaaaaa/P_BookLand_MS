package com.bookland.book.service;

import com.bookland.book.dto.request.BookRequest;
import com.bookland.book.dto.response.BookDTO;
import com.bookland.book.dto.response.PageResponse;
import com.bookland.book.entity.*;
import com.bookland.book.entity.Book.BookStatus;
import com.bookland.book.exception.AppException;
import com.bookland.book.exception.ErrorCode;
import com.bookland.book.repository.*;
import com.bookland.book.repository.specification.BookSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BookService {
    private final BookRepository bookRepository;
    private final AuthorRepository authorRepository;
    private final PublisherRepository publisherRepository;
    private final SerieRepository serieRepository;
    private final CategoryRepository categoryRepository;

    @Transactional(readOnly = true)
    public PageResponse<BookDTO> getAllBooks(
            String keyword, BookStatus status, List<Long> authorIds,
            List<Long> publisherIds, List<Long> seriesIds, List<Long> categoryIds,
            Boolean pinned, Double minPrice, Double maxPrice, Pageable pageable) {

        Specification<Book> spec = BookSpecification.searchByKeyword(keyword)
                .and(BookSpecification.hasStatus(status))
                .and(BookSpecification.hasAuthors(authorIds))
                .and(BookSpecification.hasPublishers(publisherIds))
                .and(BookSpecification.hasSeries(seriesIds))
                .and(BookSpecification.hasCategories(categoryIds))
                .and(BookSpecification.isPinned(pinned))
                .and(BookSpecification.priceBetween(minPrice, maxPrice));

        return PageResponse.from(bookRepository.findAll(spec, pageable).map(this::toDTO));
    }

    @Transactional(readOnly = true)
    public PageResponse<BookDTO> getBestSellingBooks(
            String keyword, Double minPrice, Double maxPrice,
            List<Long> categoryIds, List<Long> authorIds,
            List<Long> publisherIds, List<Long> seriesIds, Pageable pageable) {

        return PageResponse.from(
                bookRepository.findBestSellingBooks(
                        keyword, minPrice, maxPrice,
                        categoryIds, authorIds, publisherIds, seriesIds, pageable
                ).map(this::toDTO)
        );
    }

    @Transactional(readOnly = true)
    public BookDTO getBookById(Long id) {
        return toDTO(bookRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.BOOK_NOT_FOUND)));
    }

    @Transactional
    public BookDTO createBook(BookRequest request) {
        Author author = authorRepository.findById(request.getAuthorId())
                .orElseThrow(() -> new AppException(ErrorCode.AUTHOR_NOT_FOUND));
        Publisher publisher = publisherRepository.findById(request.getPublisherId())
                .orElseThrow(() -> new AppException(ErrorCode.PUBLISHER_NOT_FOUND));
        Serie series = null;
        if (request.getSeriesId() != null) {
            series = serieRepository.findById(request.getSeriesId())
                    .orElseThrow(() -> new AppException(ErrorCode.SERIE_NOT_FOUND));
        }
        Set<Category> categories = resolveCategories(request.getCategoryIds());

        Book book = Book.builder()
                .name(request.getName())
                .description(request.getDescription())
                .originalCost(request.getOriginalCost())
                .sale(request.getSale() != null ? request.getSale() : 0.0)
                .stock(request.getStock() != null ? request.getStock() : 0)
                .status(request.getStatus() != null ? request.getStatus() : BookStatus.ENABLE)
                .publishedDate(request.getPublishedDate())
                .bookImageUrl(request.getBookImageUrl())
                .pin(request.getPin() != null ? request.getPin() : false)
                .author(author)
                .publisher(publisher)
                .series(series)
                .categories(categories)
                .build();

        return toDTO(bookRepository.save(book));
    }

    @Transactional
    public BookDTO updateBook(Long id, BookRequest request) {
        Book book = bookRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.BOOK_NOT_FOUND));

        Author author = authorRepository.findById(request.getAuthorId())
                .orElseThrow(() -> new AppException(ErrorCode.AUTHOR_NOT_FOUND));
        Publisher publisher = publisherRepository.findById(request.getPublisherId())
                .orElseThrow(() -> new AppException(ErrorCode.PUBLISHER_NOT_FOUND));
        Serie series = null;
        if (request.getSeriesId() != null) {
            series = serieRepository.findById(request.getSeriesId())
                    .orElseThrow(() -> new AppException(ErrorCode.SERIE_NOT_FOUND));
        }

        book.setName(request.getName());
        book.setDescription(request.getDescription());
        book.setOriginalCost(request.getOriginalCost());
        book.setSale(request.getSale() != null ? request.getSale() : 0.0);
        if (request.getStock() != null) book.setStock(request.getStock());
        if (request.getStatus() != null) book.setStatus(request.getStatus());
        book.setPublishedDate(request.getPublishedDate());
        book.setBookImageUrl(request.getBookImageUrl());
        if (request.getPin() != null) book.setPin(request.getPin());
        book.setAuthor(author);
        book.setPublisher(publisher);
        book.setSeries(series);
        book.getCategories().clear();
        book.getCategories().addAll(resolveCategories(request.getCategoryIds()));

        return toDTO(bookRepository.save(book));
    }

    @Transactional
    public BookDTO updateBookStock(Long id, Integer quantity) {
        Book book = bookRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.BOOK_NOT_FOUND));
        book.setStock(quantity);
        return toDTO(bookRepository.save(book));
    }

    @Transactional
    public void deleteBook(Long id) {
        if (!bookRepository.existsById(id)) {
            throw new AppException(ErrorCode.BOOK_NOT_FOUND);
        }
        bookRepository.deleteById(id);
    }

    private Set<Category> resolveCategories(Set<Long> categoryIds) {
        if (categoryIds == null || categoryIds.isEmpty()) return new HashSet<>();
        return categoryIds.stream()
                .map(catId -> categoryRepository.findById(catId)
                        .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_FOUND)))
                .collect(Collectors.toSet());
    }

    public BookDTO toDTO(Book book) {
        return BookDTO.builder()
                .id(book.getId())
                .name(book.getName())
                .description(book.getDescription())
                .originalCost(book.getOriginalCost())
                .sale(book.getSale())
                .finalPrice(book.getFinalPrice())
                .stock(book.getStock())
                .status(book.getStatus())
                .publishedDate(book.getPublishedDate())
                .bookImageUrl(book.getBookImageUrl())
                .pin(book.getPin())
                .authorId(book.getAuthor().getId())
                .authorName(book.getAuthor().getName())
                .publisherId(book.getPublisher().getId())
                .publisherName(book.getPublisher().getName())
                .seriesId(book.getSeries() != null ? book.getSeries().getId() : null)
                .seriesName(book.getSeries() != null ? book.getSeries().getName() : null)
                .categoryIds(book.getCategories().stream()
                        .map(Category::getId).collect(Collectors.toSet()))
                .createdAt(book.getCreatedAt())
                .updatedAt(book.getUpdatedAt())
                .build();
    }
}
