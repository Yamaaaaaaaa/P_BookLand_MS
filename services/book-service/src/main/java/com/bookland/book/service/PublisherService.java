package com.bookland.book.service;

import com.bookland.book.dto.request.PublisherRequest;
import com.bookland.book.dto.response.PageResponse;
import com.bookland.book.dto.response.PublisherDTO;
import com.bookland.book.entity.Publisher;
import com.bookland.book.exception.AppException;
import com.bookland.book.exception.ErrorCode;
import com.bookland.book.repository.PublisherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PublisherService {
    private final PublisherRepository publisherRepository;

    @Transactional(readOnly = true)
    public PageResponse<PublisherDTO> getAllPublishers(String keyword, Pageable pageable) {
        return PageResponse.from(
                publisherRepository.searchByKeyword(keyword, pageable).map(this::toDTO)
        );
    }

    @Transactional(readOnly = true)
    public PublisherDTO getPublisherById(Long id) {
        return toDTO(publisherRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.PUBLISHER_NOT_FOUND)));
    }

    @Transactional
    public PublisherDTO createPublisher(PublisherRequest request) {
        Publisher publisher = Publisher.builder()
                .name(request.getName())
                .description(request.getDescription())
                .build();
        return toDTO(publisherRepository.save(publisher));
    }

    @Transactional
    public PublisherDTO updatePublisher(Long id, PublisherRequest request) {
        Publisher publisher = publisherRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.PUBLISHER_NOT_FOUND));
        publisher.setName(request.getName());
        publisher.setDescription(request.getDescription());
        return toDTO(publisherRepository.save(publisher));
    }

    @Transactional
    public void deletePublisher(Long id) {
        if (!publisherRepository.existsById(id)) {
            throw new AppException(ErrorCode.PUBLISHER_NOT_FOUND);
        }
        publisherRepository.deleteById(id);
    }

    public PublisherDTO toDTO(Publisher publisher) {
        return PublisherDTO.builder()
                .id(publisher.getId())
                .name(publisher.getName())
                .description(publisher.getDescription())
                .build();
    }
}
