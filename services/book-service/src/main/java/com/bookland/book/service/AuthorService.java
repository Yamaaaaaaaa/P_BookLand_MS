package com.bookland.book.service;

import com.bookland.book.dto.request.AuthorRequest;
import com.bookland.book.dto.response.AuthorDTO;
import com.bookland.book.dto.response.PageResponse;
import com.bookland.book.entity.Author;
import com.bookland.book.exception.AppException;
import com.bookland.book.exception.ErrorCode;
import com.bookland.book.repository.AuthorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthorService {
    private final AuthorRepository authorRepository;

    @Transactional(readOnly = true)
    public PageResponse<AuthorDTO> getAllAuthors(String keyword, Pageable pageable) {
        return PageResponse.from(
                authorRepository.searchByKeyword(keyword, pageable).map(this::toDTO)
        );
    }

    @Transactional(readOnly = true)
    public AuthorDTO getAuthorById(Long id) {
        return toDTO(authorRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.AUTHOR_NOT_FOUND)));
    }

    @Transactional
    public AuthorDTO createAuthor(AuthorRequest request) {
        if (authorRepository.existsByName(request.getName())) {
            throw new AppException(ErrorCode.AUTHOR_ALREADY_EXISTS);
        }
        Author author = Author.builder()
                .name(request.getName())
                .description(request.getDescription())
                .authorImage(request.getAuthorImage())
                .build();
        return toDTO(authorRepository.save(author));
    }

    @Transactional
    public AuthorDTO updateAuthor(Long id, AuthorRequest request) {
        Author author = authorRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.AUTHOR_NOT_FOUND));
        author.setName(request.getName());
        author.setDescription(request.getDescription());
        author.setAuthorImage(request.getAuthorImage());
        return toDTO(authorRepository.save(author));
    }

    @Transactional
    public void deleteAuthor(Long id) {
        if (!authorRepository.existsById(id)) {
            throw new AppException(ErrorCode.AUTHOR_NOT_FOUND);
        }
        authorRepository.deleteById(id);
    }

    public AuthorDTO toDTO(Author author) {
        return AuthorDTO.builder()
                .id(author.getId())
                .name(author.getName())
                .description(author.getDescription())
                .authorImage(author.getAuthorImage())
                .build();
    }
}
