package com.bookland.order.config;

import com.bookland.order.entity.PaymentMethod;
import com.bookland.order.entity.ShippingMethod;
import com.bookland.order.repository.PaymentMethodRepository;
import com.bookland.order.repository.ShippingMethodRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class ApplicationInitConfig {

    // ===== Default Payment Methods =====
    private static final List<PaymentMethod> DEFAULT_PAYMENT_METHODS = List.of(
            PaymentMethod.builder()
                    .name("VNPay")
                    .providerCode("VNPAY")
                    .isOnline(true)
                    .description("Thanh toán qua cổng VNPay")
                    .build(),
            PaymentMethod.builder()
                    .name("Momo")
                    .providerCode("MOMO")
                    .isOnline(true)
                    .description("Thanh toán qua Ví Momo")
                    .build(),
            PaymentMethod.builder()
                    .name("ZaloPay")
                    .providerCode("ZALOPAY")
                    .isOnline(true)
                    .description("Thanh toán qua ZaloPay")
                    .build(),
            PaymentMethod.builder()
                    .name("Thanh toán khi nhận hàng")
                    .providerCode("COD")
                    .isOnline(false)
                    .description("Thanh toán tiền mặt khi nhận hàng (COD)")
                    .build()
    );

    // ===== Default Shipping Methods =====
    private static final List<ShippingMethod> DEFAULT_SHIPPING_METHODS = List.of(
            ShippingMethod.builder()
                    .name("Giao hàng tiêu chuẩn")
                    .description("Giao hàng trong 3-5 ngày làm việc")
                    .price(30000.0)
                    .build(),
            ShippingMethod.builder()
                    .name("Giao hàng nhanh")
                    .description("Giao hàng trong 1-2 ngày làm việc")
                    .price(50000.0)
                    .build(),
            ShippingMethod.builder()
                    .name("Giao hàng hỏa tốc")
                    .description("Giao hàng trong ngày (nội thành)")
                    .price(80000.0)
                    .build(),
            ShippingMethod.builder()
                    .name("Miễn phí vận chuyển")
                    .description("Miễn phí vận chuyển cho đơn hàng đủ điều kiện")
                    .price(0.0)
                    .build()
    );

    @Bean
    ApplicationRunner initOrderData(PaymentMethodRepository paymentMethodRepository,
                                    ShippingMethodRepository shippingMethodRepository) {
        log.info("Initializing order-service default data...");
        return args -> {
            // Seed PaymentMethod nếu bảng trống
            if (paymentMethodRepository.count() == 0) {
                paymentMethodRepository.saveAll(DEFAULT_PAYMENT_METHODS);
                log.info("Seeded {} default payment methods.", DEFAULT_PAYMENT_METHODS.size());
            } else {
                log.info("Payment methods already exist, skipping seed.");
            }

            // Seed ShippingMethod nếu bảng trống
            if (shippingMethodRepository.count() == 0) {
                shippingMethodRepository.saveAll(DEFAULT_SHIPPING_METHODS);
                log.info("Seeded {} default shipping methods.", DEFAULT_SHIPPING_METHODS.size());
            } else {
                log.info("Shipping methods already exist, skipping seed.");
            }

            log.info("Order-service data initialization completed.");
        };
    }
}
