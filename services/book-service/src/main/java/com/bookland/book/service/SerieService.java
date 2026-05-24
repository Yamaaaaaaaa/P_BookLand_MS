package com.bookland.book.service;

import com.bookland.book.dto.request.SerieRequest;
import com.bookland.book.dto.response.PageResponse;
import com.bookland.book.dto.response.SerieDTO;
import com.bookland.book.entity.Serie;
import com.bookland.book.exception.AppException;
import com.bookland.book.exception.ErrorCode;
import com.bookland.book.repository.SerieRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SerieService {
    private final SerieRepository serieRepository;

    @Transactional(readOnly = true)
    public PageResponse<SerieDTO> getAllSeries(String keyword, Pageable pageable) {
        return PageResponse.from(
                serieRepository.searchByKeyword(keyword, pageable).map(this::toDTO)
        );
    }

    @Transactional(readOnly = true)
    public SerieDTO getSerieById(Long id) {
        return toDTO(serieRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.SERIE_NOT_FOUND)));
    }

    @Transactional
    public SerieDTO createSerie(SerieRequest request) {
        if (serieRepository.existsByName(request.getName())) {
            throw new AppException(ErrorCode.SERIE_ALREADY_EXISTS);
        }
        Serie serie = Serie.builder()
                .name(request.getName())
                .description(request.getDescription())
                .build();
        return toDTO(serieRepository.save(serie));
    }

    @Transactional
    public SerieDTO updateSerie(Long id, SerieRequest request) {
        Serie serie = serieRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.SERIE_NOT_FOUND));
        serie.setName(request.getName());
        serie.setDescription(request.getDescription());
        return toDTO(serieRepository.save(serie));
    }

    @Transactional
    public void deleteSerie(Long id) {
        if (!serieRepository.existsById(id)) {
            throw new AppException(ErrorCode.SERIE_NOT_FOUND);
        }
        serieRepository.deleteById(id);
    }

    public SerieDTO toDTO(Serie serie) {
        return SerieDTO.builder()
                .id(serie.getId())
                .name(serie.getName())
                .description(serie.getDescription())
                .build();
    }
}
