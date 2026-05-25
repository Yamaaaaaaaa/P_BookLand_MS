package com.bookland.order.service;

import com.bookland.order.dto.request.PaymentMethodRequest;
import com.bookland.order.dto.response.ApiResponse;
import com.bookland.order.dto.response.PageResponse;
import com.bookland.order.dto.response.PaymentMethodDTO;
import com.bookland.order.entity.PaymentMethod;
import com.bookland.order.exception.AppException;
import com.bookland.order.exception.ErrorCode;
import com.bookland.order.repository.PaymentMethodRepository;
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
public class PaymentMethodService {

    private final PaymentMethodRepository paymentMethodRepository;

    // ---------------------- CREATE ----------------------
    public ApiResponse<PaymentMethodDTO> create(PaymentMethodRequest request) {
        log.info("Creating payment method: {}", request.getName());
        PaymentMethod entity = PaymentMethod.builder()
                .name(request.getName())
                .providerCode(request.getProviderCode())
                .isOnline(request.getIsOnline())
                .description(request.getDescription())
                .build();
        PaymentMethod saved = paymentMethodRepository.save(entity);
        log.info("Created payment method id={}", saved.getId());
        return ApiResponse.<PaymentMethodDTO>builder()
                .message("Tạo phương thức thanh toán thành công")
                .result(toDTO(saved))
                .build();
    }

    // ---------------------- UPDATE ----------------------
    public ApiResponse<PaymentMethodDTO> update(Long id, PaymentMethodRequest request) {
        log.info("Updating payment method id={}", id);
        PaymentMethod entity = paymentMethodRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_METHOD_NOT_FOUND));
        entity.setName(request.getName());
        entity.setProviderCode(request.getProviderCode());
        entity.setIsOnline(request.getIsOnline());
        entity.setDescription(request.getDescription());
        PaymentMethod saved = paymentMethodRepository.save(entity);
        log.info("Updated payment method id={}", saved.getId());
        return ApiResponse.<PaymentMethodDTO>builder()
                .message("Cập nhật phương thức thanh toán thành công")
                .result(toDTO(saved))
                .build();
    }

    // ---------------------- DELETE ----------------------
    public ApiResponse<Void> delete(Long id) {
        log.info("Deleting payment method id={}", id);
        if (!paymentMethodRepository.existsById(id)) {
            throw new AppException(ErrorCode.PAYMENT_METHOD_NOT_FOUND);
        }
        paymentMethodRepository.deleteById(id);
        log.info("Deleted payment method id={}", id);
        return ApiResponse.<Void>builder()
                .message("Xóa phương thức thanh toán thành công")
                .build();
    }

    // ---------------------- GET ONE ----------------------
    public ApiResponse<PaymentMethodDTO> getById(Long id) {
        PaymentMethod entity = paymentMethodRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_METHOD_NOT_FOUND));
        return ApiResponse.<PaymentMethodDTO>builder()
                .result(toDTO(entity))
                .build();
    }

    // ---------------------- GET ALL (no paging) ----------------------
    public ApiResponse<List<PaymentMethodDTO>> getAll() {
        List<PaymentMethodDTO> list = paymentMethodRepository.findAll(Sort.by("id")).stream()
                .map(this::toDTO)
                .toList();
        return ApiResponse.<List<PaymentMethodDTO>>builder()
                .result(list)
                .build();
    }

    // ---------------------- GET PAGE ----------------------
    public ApiResponse<PageResponse<PaymentMethodDTO>> getPage(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        Page<PaymentMethodDTO> mapped = paymentMethodRepository.findAll(pageable).map(this::toDTO);
        return ApiResponse.<PageResponse<PaymentMethodDTO>>builder()
                .result(PageResponse.from(mapped))
                .build();
    }

    // ---------------------- MAPPER ----------------------
    private PaymentMethodDTO toDTO(PaymentMethod entity) {
        return PaymentMethodDTO.builder()
                .id(entity.getId())
                .name(entity.getName())
                .providerCode(entity.getProviderCode())
                .isOnline(entity.getIsOnline())
                .description(entity.getDescription())
                .build();
    }
}
