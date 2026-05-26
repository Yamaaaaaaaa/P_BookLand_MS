package com.bookland.order.controller;

import com.bookland.order.config.VnpayConfig;
import com.bookland.order.dto.response.ApiResponse;
import com.bookland.order.dto.response.PaymentResponse;
import com.bookland.order.dto.response.PaymentTransactionDTO;
import com.bookland.order.service.BillService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.Enumeration;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/vnpay")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Payment APIs")
public class PaymentController {

    private final BillService billService;

    @PostMapping("/create-payment")
    @Operation(summary = "Tạo URL để thanh toán đơn hàng bằng VNPay")
    public ApiResponse<PaymentResponse> createPayment(
            HttpServletRequest req,
            @RequestParam("billId") Long billId
    ) {
        log.info("POST /vnpay/create-payment?billId={}", billId);
        String bankCode = req.getParameter("bankCode");
        String ipAddr = VnpayConfig.getIpAddress(req);

        String paymentUrl = billService.createOnlinePaymentUrl(billId, bankCode, ipAddr);

        PaymentResponse paymentResponse = PaymentResponse.builder()
                .status("OKE")
                .message("Successfully")
                .url(paymentUrl)
                .build();

        return ApiResponse.<PaymentResponse>builder()
                .result(paymentResponse)
                .build();
    }

    @GetMapping("/payment_infor")
    @Operation(summary = "VNPay Return URL callback")
    public ApiResponse<PaymentTransactionDTO> transaction(
            HttpServletRequest req,
            @RequestParam(value = "vnp_Amount") String amount,
            @RequestParam(value = "vnp_BankCode") String bankCode,
            @RequestParam(value = "vnp_OrderInfo") String order,
            @RequestParam(value = "vnp_ResponseCode") String responseCode
    ) {
        log.info("GET /vnpay/payment_infor?vnp_ResponseCode={}", responseCode);
        PaymentTransactionDTO transactionStatusDTO = new PaymentTransactionDTO();

        // 1. Validate Checksum
        Map<String, String> fields = new HashMap<>();
        for (Enumeration<String> params = req.getParameterNames(); params.hasMoreElements(); ) {
            String fieldName = params.nextElement();
            String fieldValue = req.getParameter(fieldName);
            if ((fieldValue != null) && (fieldValue.length() > 0)) {
                fields.put(fieldName, fieldValue);
            }
        }
        String vnp_SecureHash = req.getParameter("vnp_SecureHash");
        if (fields.containsKey("vnp_SecureHashType")) {
            fields.remove("vnp_SecureHashType");
        }
        if (fields.containsKey("vnp_SecureHash")) {
            fields.remove("vnp_SecureHash");
        }

        String signValue = VnpayConfig.hashAllFields(fields);
        if (!signValue.equals(vnp_SecureHash)) {
            log.error("Invalid Checksum calculated {} != received {}", signValue, vnp_SecureHash);
            transactionStatusDTO.setStatus("NO");
            transactionStatusDTO.setMessage("Invalid Checksum");
            transactionStatusDTO.setData("");
            return ApiResponse.<PaymentTransactionDTO>builder()
                    .result(transactionStatusDTO)
                    .build();
        }

        // 2. Process complete payment status updates
        String vnp_TxnRef = req.getParameter("vnp_TxnRef");
        String vnp_TransactionNo = req.getParameter("vnp_TransactionNo");
        String vnp_BankTranNo = req.getParameter("vnp_BankTranNo"); // Can serve as payUrl or standard transaction ID
        
        PaymentTransactionDTO status = billService.completeOnlinePayment(vnp_TxnRef, responseCode, vnp_TransactionNo, order);

        return ApiResponse.<PaymentTransactionDTO>builder()
                .result(status)
                .build();
    }
}
