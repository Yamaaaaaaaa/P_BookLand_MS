package com.bookland.book.service;

import com.bookland.book.dto.request.CategoryRequest;
import com.bookland.book.dto.response.CategoryDTO;
import com.bookland.book.dto.response.PageResponse;
import com.bookland.book.entity.Category;
import com.bookland.book.exception.AppException;
import com.bookland.book.exception.ErrorCode;
import com.bookland.book.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CategoryService {
    private final CategoryRepository categoryRepository;

    @Transactional(readOnly = true)
    public PageResponse<CategoryDTO> getAllCategories(String keyword, Boolean pinned, Pageable pageable) {
        return PageResponse.from(
                categoryRepository.searchByKeywordAndPin(keyword, pinned, pageable).map(this::toDTO)
        );
    }

    @Transactional(readOnly = true)
    public CategoryDTO getCategoryById(Long id) {
        return toDTO(categoryRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_FOUND)));
    }

    @Transactional
    public CategoryDTO createCategory(CategoryRequest request) {
        if (categoryRepository.existsByName(request.getName())) {
            throw new AppException(ErrorCode.CATEGORY_ALREADY_EXISTS);
        }
        Category category = Category.builder()
                .name(request.getName())
                .description(request.getDescription())
                .pin(request.getPin() != null ? request.getPin() : false)
                .imageUrl(request.getImageUrl())
                .build();
        return toDTO(categoryRepository.save(category));
    }

    @Transactional
    public CategoryDTO updateCategory(Long id, CategoryRequest request) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_FOUND));
        category.setName(request.getName());
        category.setDescription(request.getDescription());
        if (request.getPin() != null) category.setPin(request.getPin());
        if (request.getImageUrl() != null) category.setImageUrl(request.getImageUrl());
        return toDTO(categoryRepository.save(category));
    }

    @Transactional
    public void deleteCategory(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_FOUND));
        if (!category.getBooks().isEmpty()) {
            throw new AppException(ErrorCode.CATEGORY_HAS_BOOKS);
        }
        categoryRepository.deleteById(id);
    }

    public CategoryDTO toDTO(Category category) {
        return CategoryDTO.builder()
                .id(category.getId())
                .name(category.getName())
                .description(category.getDescription())
                .pin(category.getPin())
                .imageUrl(category.getImageUrl())
                .build();
    }
}
