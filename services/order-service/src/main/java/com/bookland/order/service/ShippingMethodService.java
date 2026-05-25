package com.bookland.order.service;

import com.bookland.order.dto.request.ShippingMethodRequest;
import com.bookland.order.dto.response.ApiResponse;
import com.bookland.order.dto.response.PageResponse;
import com.bookland.order.dto.response.ShippingMethodDTO;
import com.bookland.order.entity.ShippingMethod;
import com.bookland.order.exception.AppException;
import com.bookland.order.exception.ErrorCode;
import com.bookland.order.repository.ShippingMethodRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ShippingMethodService {

    private final ShippingMethodRepository shippingMethodRepository;

    // ---------------------- CREATE ----------------------
    public ApiResponse<ShippingMethodDTO> create(ShippingMethodRequest request) {
        log.info("Creating shipping method: {}", request.getName());
        ShippingMethod entity = ShippingMethod.builder()
                .name(request.getName())
                .description(request.getDescription())
                .price(request.getPrice())
                .build();
        ShippingMethod saved = shippingMethodRepository.save(entity);
        log.info("Created shipping method id={}", saved.getId());
        return ApiResponse.<ShippingMethodDTO>builder()
                .message("Tạo phương thức vận chuyển thành công")
                .result(toDTO(saved))
                .build();
    }

    // ---------------------- UPDATE ----------------------
    public ApiResponse<ShippingMethodDTO> update(Long id, ShippingMethodRequest request) {
        log.info("Updating shipping method id={}", id);
        ShippingMethod entity = shippingMethodRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.SHIPPING_METHOD_NOT_FOUND));
        entity.setName(request.getName());
        entity.setDescription(request.getDescription());
        entity.setPrice(request.getPrice());
        ShippingMethod saved = shippingMethodRepository.save(entity);
        log.info("Updated shipping method id={}", saved.getId());
        return ApiResponse.<ShippingMethodDTO>builder()
                .message("Cập nhật phương thức vận chuyển thành công")
                .result(toDTO(saved))
                .build();
    }

    // ---------------------- DELETE ----------------------
    public ApiResponse<Void> delete(Long id) {
        log.info("Deleting shipping method id={}", id);
        if (!shippingMethodRepository.existsById(id)) {
            throw new AppException(ErrorCode.SHIPPING_METHOD_NOT_FOUND);
        }
        shippingMethodRepository.deleteById(id);
        log.info("Deleted shipping method id={}", id);
        return ApiResponse.<Void>builder()
                .message("Xóa phương thức vận chuyển thành công")
                .build();
    }

    // ---------------------- GET ONE ----------------------
    public ApiResponse<ShippingMethodDTO> getById(Long id) {
        ShippingMethod entity = shippingMethodRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.SHIPPING_METHOD_NOT_FOUND));
        return ApiResponse.<ShippingMethodDTO>builder()
                .result(toDTO(entity))
                .build();
    }

    // ---------------------- GET ALL (no paging) ----------------------
    public ApiResponse<List<ShippingMethodDTO>> getAll() {
        List<ShippingMethodDTO> list = shippingMethodRepository.findAll(Sort.by("id")).stream()
                .map(this::toDTO)
                .toList();
        return ApiResponse.<List<ShippingMethodDTO>>builder()
                .result(list)
                .build();
    }

    // ---------------------- GET PAGE ----------------------
    public ApiResponse<PageResponse<ShippingMethodDTO>> getPage(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        Page<ShippingMethodDTO> mapped = shippingMethodRepository.findAll(pageable).map(this::toDTO);
        return ApiResponse.<PageResponse<ShippingMethodDTO>>builder()
                .result(PageResponse.from(mapped))
                .build();
    }

    // ---------------------- MAPPER ----------------------
    private ShippingMethodDTO toDTO(ShippingMethod entity) {
        return ShippingMethodDTO.builder()
                .id(entity.getId())
                .name(entity.getName())
                .description(entity.getDescription())
                .price(entity.getPrice())
                .build();
    }
}
