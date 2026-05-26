package com.bookland.order.service;

import com.bookland.order.client.BookClient;
import com.bookland.order.client.EventClient;
import com.bookland.order.client.UserClient;
import com.bookland.order.dto.event.NotificationEvent;
import com.bookland.order.dto.request.BillBookRequest;
import com.bookland.order.dto.request.CreateBillRequest;
import com.bookland.order.dto.request.UpdateBillStatusRequest;
import com.bookland.order.dto.response.*;
import com.bookland.order.entity.Bill;
import com.bookland.order.entity.Bill.BillStatus;
import com.bookland.order.entity.BillBook;
import com.bookland.order.entity.PaymentMethod;
import com.bookland.order.entity.ShippingMethod;
import com.bookland.order.entity.PaymentTransaction;
import com.bookland.order.config.VnpayConfig;
import com.bookland.order.exception.AppException;
import com.bookland.order.exception.ErrorCode;
import com.bookland.order.producer.NotificationProducer;
import com.bookland.order.repository.BillBookRepository;
import com.bookland.order.repository.BillRepository;
import com.bookland.order.repository.PaymentMethodRepository;
import com.bookland.order.repository.PaymentTransactionRepository;
import com.bookland.order.repository.ShippingMethodRepository;
import com.bookland.order.repository.specification.BillSpecification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import java.net.URLEncoder;
import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class BillService {

    private final BillRepository billRepository;
    private final BillBookRepository billBookRepository;
    private final PaymentMethodRepository paymentMethodRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final ShippingMethodRepository shippingMethodRepository;
    private final BookClient bookClient;
    private final EventClient eventClient;
    private final UserClient userClient;
    private final NotificationProducer notificationProducer;

    @Transactional(readOnly = true)
    public Page<BillDTO> getAllBills(Long userId, BillStatus status,
                                     LocalDateTime fromDate, LocalDateTime toDate,
                                     Double minCost, Double maxCost,
                                     Pageable pageable) {
        Specification<Bill> spec = Specification.where(null);

        if (userId != null) {
            spec = spec.and(BillSpecification.hasUser(userId));
        }

        if (status != null) {
            spec = spec.and(BillSpecification.hasStatus(status));
        }

        if (fromDate != null || toDate != null) {
            spec = spec.and(BillSpecification.createdBetween(fromDate, toDate));
        }

        if (minCost != null || maxCost != null) {
            spec = spec.and(BillSpecification.totalCostBetween(minCost, maxCost));
        }

        return billRepository.findAll(spec, pageable).map(this::convertToDTO);
    }

    @Transactional(readOnly = true)
    public Page<BillDTO> getOwnBills(Long userId, BillStatus status,
                                     LocalDateTime fromDate, LocalDateTime toDate,
                                     Double minCost, Double maxCost,
                                     Pageable pageable) {
        Specification<Bill> spec = BillSpecification.hasUser(userId);

        if (status != null) {
            spec = spec.and(BillSpecification.hasStatus(status));
        }

        if (fromDate != null || toDate != null) {
            spec = spec.and(BillSpecification.createdBetween(fromDate, toDate));
        }

        if (minCost != null || maxCost != null) {
            spec = spec.and(BillSpecification.totalCostBetween(minCost, maxCost));
        }

        return billRepository.findAll(spec, pageable).map(this::convertToDTO);
    }

    @Transactional(readOnly = true)
    public BillDTO getBillById(Long id) {
        Bill bill = billRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.BILL_NOT_FOUND));
        return convertToDTO(bill);
    }

    @Transactional
    public BillDTO createBill(Long userId, CreateBillRequest request) {
        PaymentMethod paymentMethod = paymentMethodRepository.findById(request.getPaymentMethodId())
                .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_METHOD_NOT_FOUND));

        ShippingMethod shippingMethod = shippingMethodRepository.findById(request.getShippingMethodId())
                .orElseThrow(() -> new AppException(ErrorCode.SHIPPING_METHOD_NOT_FOUND));

        // 1. Calculate temporary cost (before coupon check) and check stock limits
        double tempTotalCost = 0.0;
        int totalQuantity = 0;
        List<BookResponse> books = new ArrayList<>();
        Map<Long, Integer> quantities = new HashMap<>();

        for (BillBookRequest bookRequest : request.getBooks()) {
            BookResponse book = fetchBook(bookRequest.getBookId());

            if (book.getStock() < bookRequest.getQuantity()) {
                throw new AppException(ErrorCode.BOOK_OUT_OF_STOCK);
            }

            double price = book.getFinalPrice() != null ? book.getFinalPrice() : 0.0;
            tempTotalCost += price * bookRequest.getQuantity();
            totalQuantity += bookRequest.getQuantity();
            books.add(book);
            quantities.put(book.getId(), bookRequest.getQuantity());
        }

        // 2. Fetch Active Promotion & check rule eligibility
        EventResponse activeEvent = null;
        try {
            ApiResponse<EventResponse> response = eventClient.getHighestPriorityEvent();
            log.info("Fetched highest priority event response: {}", response);
            if (response != null && response.getResult() != null) {
                activeEvent = response.getResult();
            }
        } catch (Exception e) {
            log.error("Failed to fetch promo event from event-service", e);
        }

        EventResponse appliedEvent = null;
        Map<Long, Double> discountedPrices = new HashMap<>();
        int totalDiscountValue = 0;

        if (activeEvent != null) {
            log.info("Active event found: ID={}, Name={}, Rules={}, Targets={}, Actions={}",
                    activeEvent.getId(), activeEvent.getName(), activeEvent.getRules(),
                    activeEvent.getTargets(), activeEvent.getActions());
            boolean isEligible = checkEventRule(activeEvent, tempTotalCost, totalQuantity);
            log.info("Rule eligibility checked: isEligible={} for tempTotalCost={}, totalQuantity={}", isEligible, tempTotalCost, totalQuantity);
            if (isEligible) {
                for (BookResponse book : books) {
                    boolean inTarget = isBookInEventTarget(activeEvent, book.getId());
                    log.info("Checking book ID={} in event target: inTarget={}", book.getId(), inTarget);
                    if (inTarget) {
                        double originalPrice = book.getFinalPrice() != null ? book.getFinalPrice() : 0.0;
                        double discountedPrice = calculateDiscountedPrice(activeEvent, originalPrice);
                        int qty = quantities.get(book.getId());

                        discountedPrices.put(book.getId(), discountedPrice);
                        totalDiscountValue += (int) ((originalPrice - discountedPrice) * qty);
                        appliedEvent = activeEvent;
                        log.info("Applied discount for book ID={}: originalPrice={}, discountedPrice={}, qty={}, subtotalDiscount={}",
                                book.getId(), originalPrice, discountedPrice, qty, (int) ((originalPrice - discountedPrice) * qty));
                    }
                }
            }
        } else {
            log.info("No active event found (activeEvent is null)");
        }

        // 3. Recalculate final totals
        double finalBooksCost = 0.0;
        for (BookResponse book : books) {
            double price = discountedPrices.getOrDefault(book.getId(), book.getFinalPrice() != null ? book.getFinalPrice() : 0.0);
            finalBooksCost += price * quantities.get(book.getId());
        }

        double totalCost = finalBooksCost + shippingMethod.getPrice();

        // 4. Save Bill Entity
        Bill bill = Bill.builder()
                .userId(userId)
                .paymentMethod(paymentMethod)
                .shippingMethod(shippingMethod)
                .totalCost(totalCost)
                .status(BillStatus.PENDING)
                .build();

        Bill savedBill = billRepository.save(bill);

        // 5. Save BillBooks Snapshot and update Book Stock levels
        List<BillBook> billBooks = new ArrayList<>();
        for (BookResponse book : books) {
            double priceToSave = discountedPrices.getOrDefault(book.getId(), book.getFinalPrice() != null ? book.getFinalPrice() : 0.0);
            int qty = quantities.get(book.getId());

            BillBook billBook = BillBook.builder()
                    .bill(savedBill)
                    .bookId(book.getId())
                    .priceSnapshot(priceToSave)
                    .quantity(qty)
                    .build();

            billBookRepository.save(billBook);
            billBooks.add(billBook);

            // Subtract stock level atomically via bookClient call
            int newStock = book.getStock() - qty;
            try {
                bookClient.updateBookStock(book.getId(), newStock);
            } catch (Exception e) {
                log.error("Failed to update stock for book ID {} in book-service", book.getId(), e);
                throw new AppException(ErrorCode.INTERNAL_ERROR);
            }
        }
        savedBill.setBillBooks(billBooks);

        // 6. Kafka notification trigger
        sendOrderPlacedNotification(savedBill, totalDiscountValue);

        return convertToDTO(savedBill);
    }

    @Transactional(readOnly = true)
    public BillDTO previewBill(Long userId, CreateBillRequest request) {
        PaymentMethod paymentMethod = paymentMethodRepository.findById(request.getPaymentMethodId())
                .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_METHOD_NOT_FOUND));

        ShippingMethod shippingMethod = shippingMethodRepository.findById(request.getShippingMethodId())
                .orElseThrow(() -> new AppException(ErrorCode.SHIPPING_METHOD_NOT_FOUND));

        // 1. Calculate temporary cost (before coupon check) and check stock limits
        double tempTotalCost = 0.0;
        int totalQuantity = 0;
        List<BookResponse> books = new ArrayList<>();
        Map<Long, Integer> quantities = new HashMap<>();

        for (BillBookRequest bookRequest : request.getBooks()) {
            BookResponse book = fetchBook(bookRequest.getBookId());

            if (book.getStock() < bookRequest.getQuantity()) {
                throw new AppException(ErrorCode.BOOK_OUT_OF_STOCK);
            }

            double price = book.getFinalPrice() != null ? book.getFinalPrice() : 0.0;
            tempTotalCost += price * bookRequest.getQuantity();
            totalQuantity += bookRequest.getQuantity();
            books.add(book);
            quantities.put(book.getId(), bookRequest.getQuantity());
        }

        // 2. Fetch Active Promotion & check rule eligibility
        EventResponse activeEvent = null;
        try {
            ApiResponse<EventResponse> response = eventClient.getHighestPriorityEvent();
            log.info("Fetched highest priority event response for preview: {}", response);
            if (response != null && response.getResult() != null) {
                activeEvent = response.getResult();
            }
        } catch (Exception e) {
            log.error("Failed to fetch promo event from event-service for preview", e);
        }

        EventResponse appliedEvent = null;
        Map<Long, Double> discountedPrices = new HashMap<>();
        int totalDiscountValue = 0;

        if (activeEvent != null) {
            log.info("Active event found for preview: ID={}, Name={}, Rules={}, Targets={}, Actions={}",
                    activeEvent.getId(), activeEvent.getName(), activeEvent.getRules(),
                    activeEvent.getTargets(), activeEvent.getActions());
            boolean isEligible = checkEventRule(activeEvent, tempTotalCost, totalQuantity);
            log.info("Rule eligibility checked for preview: isEligible={} for tempTotalCost={}, totalQuantity={}", isEligible, tempTotalCost, totalQuantity);
            if (isEligible) {
                for (BookResponse book : books) {
                    boolean inTarget = isBookInEventTarget(activeEvent, book.getId());
                    log.info("Checking book ID={} in event target for preview: inTarget={}", book.getId(), inTarget);
                    if (inTarget) {
                        double originalPrice = book.getFinalPrice() != null ? book.getFinalPrice() : 0.0;
                        double discountedPrice = calculateDiscountedPrice(activeEvent, originalPrice);
                        int qty = quantities.get(book.getId());

                        discountedPrices.put(book.getId(), discountedPrice);
                        totalDiscountValue += (int) ((originalPrice - discountedPrice) * qty);
                        appliedEvent = activeEvent;
                        log.info("Applied discount for book ID={} in preview: originalPrice={}, discountedPrice={}, qty={}, subtotalDiscount={}",
                                book.getId(), originalPrice, discountedPrice, qty, (int) ((originalPrice - discountedPrice) * qty));
                    }
                }
            }
        } else {
            log.info("No active event found for preview (activeEvent is null)");
        }

        // 3. Recalculate final totals
        double finalBooksCost = 0.0;
        List<BillBookDTO> bookDTOs = new ArrayList<>();
        for (BookResponse book : books) {
            double price = discountedPrices.getOrDefault(book.getId(), book.getFinalPrice() != null ? book.getFinalPrice() : 0.0);
            int qty = quantities.get(book.getId());
            double subtotal = price * qty;
            finalBooksCost += subtotal;

            bookDTOs.add(BillBookDTO.builder()
                    .bookId(book.getId())
                    .bookName(book.getName())
                    .bookImageUrl(book.getBookImageUrl())
                    .priceSnapshot(price)
                    .quantity(qty)
                    .subtotal(subtotal)
                    .build());
        }

        double totalCost = finalBooksCost + shippingMethod.getPrice();

        String userName = "Người dùng";
        try {
            ApiResponse<UserProfileResponse> profileResponse = userClient.getProfile(userId);
            if (profileResponse != null && profileResponse.getResult() != null) {
                UserProfileResponse profile = profileResponse.getResult();
                userName = profile.getUsername() != null ? profile.getUsername() : (profile.getFirstName() + " " + profile.getLastName()).trim();
            }
        } catch (Exception e) {
            log.warn("Failed to enrich username for userId={} in preview: {}", userId, e.getMessage());
        }

        return BillDTO.builder()
                .userId(userId)
                .userName(userName)
                .paymentMethodId(paymentMethod.getId())
                .paymentMethodName(paymentMethod.getName())
                .shippingMethodId(shippingMethod.getId())
                .shippingMethodName(shippingMethod.getName())
                .shippingCost(shippingMethod.getPrice())
                .totalCost(totalCost)
                .books(bookDTOs)
                .build();
    }

    @Transactional
    public BillDTO updateBillStatus(Long id, UpdateBillStatusRequest request, String approverEmail) {
        Bill bill = billRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.BILL_NOT_FOUND));

        BillStatus oldStatus = bill.getStatus();
        BillStatus newStatus = request.getStatus();

        validateStatusTransition(oldStatus, newStatus);

        bill.setStatus(newStatus);

        if (newStatus == BillStatus.APPROVED) {
            String approver = request.getApprovedById() != null ? request.getApprovedById() : approverEmail;
            bill.setApprovedBy(approver);
            bill.setApprovedAt(LocalDateTime.now());
        }

        // Return stock levels to store if canceled
        if (newStatus == BillStatus.CANCELED) {
            for (BillBook billBook : bill.getBillBooks()) {
                try {
                    BookResponse book = fetchBook(billBook.getBookId());
                    int updatedStock = book.getStock() + billBook.getQuantity();
                    bookClient.updateBookStock(billBook.getBookId(), updatedStock);
                } catch (Exception e) {
                    log.error("Failed to restore stock for book ID {} during cancellation", billBook.getBookId(), e);
                }
            }
        }

        Bill updatedBill = billRepository.save(bill);

        // Notify user via Kafka
        sendOrderStatusUpdateNotification(updatedBill);

        return convertToDTO(updatedBill);
    }

    @Transactional
    public BillDTO confirmDelivered(Long id, String shipperEmail) {
        Bill bill = billRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.BILL_NOT_FOUND));

        if (bill.getStatus() != BillStatus.SHIPPING) {
            throw new AppException(ErrorCode.INVALID_STATUS_TRANSITION);
        }

        bill.setStatus(BillStatus.SHIPPED);
        Bill updatedBill = billRepository.save(bill);

        // Notify user via Kafka
        sendOrderStatusUpdateNotification(updatedBill);

        return convertToDTO(updatedBill);
    }

    @Transactional
    public void deleteBill(Long id) {
        Bill bill = billRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.BILL_NOT_FOUND));

        if (bill.getStatus() != BillStatus.PENDING && bill.getStatus() != BillStatus.CANCELED) {
            throw new RuntimeException("Can only delete pending or canceled orders");
        }

        // Return stock if pending order is deleted
        if (bill.getStatus() == BillStatus.PENDING) {
            for (BillBook billBook : bill.getBillBooks()) {
                try {
                    BookResponse book = fetchBook(billBook.getBookId());
                    int updatedStock = book.getStock() + billBook.getQuantity();
                    bookClient.updateBookStock(billBook.getBookId(), updatedStock);
                } catch (Exception e) {
                    log.error("Failed to restore stock during pending order deletion", e);
                }
            }
        }

        billRepository.delete(bill);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // RULE CHECKING & DISCOUNT HELPERS
    // ──────────────────────────────────────────────────────────────────────────

    private boolean checkEventRule(EventResponse event, Double orderValue, Integer totalQuantity) {
        if (event.getRules() == null || event.getRules().isEmpty()) {
            return true;
        }

        // Check first rule as per monolithic rule model
        EventResponse.EventRuleDTO rule = event.getRules().iterator().next();
        String value = rule.getRuleValue();

        try {
            switch (rule.getRuleType()) {
                case "MIN_ORDER_VALUE":
                    return orderValue >= Double.parseDouble(value);
                case "MAX_ORDER_VALUE":
                    return orderValue <= Double.parseDouble(value);
                case "MIN_QUANTITY":
                    return totalQuantity >= Integer.parseInt(value);
                case "MAX_QUANTITY":
                    return totalQuantity <= Integer.parseInt(value);
                case "EXACT_QUANTITY":
                    return totalQuantity == Integer.parseInt(value);
                case "MIN_ITEMS_IN_CART":
                    return totalQuantity >= Integer.parseInt(value);
                default:
                    return true;
            }
        } catch (Exception e) {
            log.error("Error parsing rule type {} with value {}", rule.getRuleType(), value, e);
            return false;
        }
    }

    private boolean isBookInEventTarget(EventResponse event, Long bookId) {
        if (event.getTargets() == null || event.getTargets().isEmpty()) {
            return false;
        }
        for (EventResponse.EventTargetDTO target : event.getTargets()) {
            if ("ALL".equalsIgnoreCase(target.getTargetType())) {
                return true;
            }
            if ("BOOK".equalsIgnoreCase(target.getTargetType()) && bookId.equals(target.getTargetId())) {
                return true;
            }
        }
        return false;
    }

    private Double calculateDiscountedPrice(EventResponse event, Double originalPrice) {
        if (event.getActions() == null || event.getActions().isEmpty()) {
            return originalPrice;
        }

        EventResponse.EventActionDTO action = event.getActions().iterator().next();
        try {
            if ("DISCOUNT_PERCENT".equalsIgnoreCase(action.getActionType())) {
                double percent = Double.parseDouble(action.getActionValue());
                return originalPrice * (1 - percent / 100);
            } else if ("DISCOUNT_AMOUNT".equalsIgnoreCase(action.getActionType())) {
                double amount = Double.parseDouble(action.getActionValue());
                double result = originalPrice - amount;
                return result > 0 ? result : 0.0;
            } else if ("DISCOUNT_FIXED_PRICE".equalsIgnoreCase(action.getActionType())) {
                double fixed = Double.parseDouble(action.getActionValue());
                return fixed < originalPrice ? fixed : originalPrice;
            }
        } catch (Exception e) {
            log.error("Failed to apply action price mapping", e);
        }
        return originalPrice;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // KAFKA NOTIFICATION SENDS
    // ──────────────────────────────────────────────────────────────────────────

    private void sendOrderPlacedNotification(Bill bill, int discountValue) {
        String userName = "Khách hàng";
        try {
            ApiResponse<UserProfileResponse> profileResponse = userClient.getProfile(bill.getUserId());
            if (profileResponse != null && profileResponse.getResult() != null) {
                UserProfileResponse profile = profileResponse.getResult();
                userName = profile.getUsername() != null ? profile.getUsername() : (profile.getFirstName() + " " + profile.getLastName()).trim();
            }
        } catch (Exception e) {
            log.warn("Failed to retrieve username for order placed event: {}", e.getMessage());
        }

        Map<String, Object> emailModel = new HashMap<>();
        emailModel.put("name", userName);
        emailModel.put("message", String.format("Cảm ơn bạn đã đặt hàng tại BookLand. Đơn hàng #%d đang được xử lý.", bill.getId()));
        emailModel.put("details", String.format("Mã đơn hàng: #%d. Tổng tiền thanh toán: %,.0f VNĐ. Giảm giá áp dụng: %,d VNĐ.",
                bill.getId(), bill.getTotalCost(), discountValue));
        emailModel.put("actionUrl", "http://localhost:5173");
        emailModel.put("actionText", "Truy cập BookLand");

        NotificationEvent event = NotificationEvent.builder()
                .toUserId(String.valueOf(bill.getUserId()))
                .type("ORDER")
                .title("Đặt hàng thành công!")
                .content(String.format("Đơn hàng #%d của bạn đã được đặt thành công và đang chờ xác thực.", bill.getId()))
                .sendEmail(true)
                .emailSubject(String.format("Xác nhận đơn hàng #%d - BookLand", bill.getId()))
                .emailTemplate("email-template")
                .emailTemplateModel(emailModel)
                .build();

        notificationProducer.sendNotification(event);
    }

    private void sendOrderStatusUpdateNotification(Bill bill) {
        String userName = "Khách hàng";
        try {
            ApiResponse<UserProfileResponse> profileResponse = userClient.getProfile(bill.getUserId());
            if (profileResponse != null && profileResponse.getResult() != null) {
                UserProfileResponse profile = profileResponse.getResult();
                userName = profile.getUsername() != null ? profile.getUsername() : (profile.getFirstName() + " " + profile.getLastName()).trim();
            }
        } catch (Exception e) {
            log.warn("Failed to retrieve username for order update event: {}", e.getMessage());
        }

        Map<String, Object> emailModel = new HashMap<>();
        emailModel.put("name", userName);
        emailModel.put("message", String.format("Đơn hàng #%d của bạn đã được chuyển sang trạng thái mới.", bill.getId()));
        emailModel.put("details", String.format("Trạng thái hiện tại: %s.", bill.getStatus().name()));
        emailModel.put("actionUrl", "http://localhost:5173");
        emailModel.put("actionText", "Truy cập BookLand");

        NotificationEvent event = NotificationEvent.builder()
                .toUserId(String.valueOf(bill.getUserId()))
                .type("ORDER")
                .title("Cập nhật trạng thái đơn hàng")
                .content(String.format("Đơn hàng #%d của bạn đã chuyển sang trạng thái: %s", bill.getId(), bill.getStatus().name()))
                .sendEmail(true)
                .emailSubject(String.format("Cập nhật trạng thái đơn hàng #%d - BookLand", bill.getId()))
                .emailTemplate("email-template")
                .emailTemplateModel(emailModel)
                .build();

        notificationProducer.sendNotification(event);
    }

    @Transactional
    public String createOnlinePaymentUrl(Long billId, String bankCode, String ipAddr) {
        Bill bill = billRepository.findById(billId)
                .orElseThrow(() -> new AppException(ErrorCode.BILL_NOT_FOUND));

        String vnp_TxnRef = VnpayConfig.getRandomNumber(8);
        long amount = (long) (bill.getTotalCost() * 100);

        PaymentMethod paymentMethod = bill.getPaymentMethod();
        if (paymentMethod == null) {
            paymentMethod = paymentMethodRepository.findByProviderCode("VNPAY")
                    .orElseGet(() -> {
                        PaymentMethod newMethod = PaymentMethod.builder()
                                .name("VNPay Online Payment")
                                .providerCode("VNPAY")
                                .isOnline(true)
                                .description("VNPay payment gateway")
                                .build();
                        return paymentMethodRepository.save(newMethod);
                    });
        }

        PaymentTransaction transaction = PaymentTransaction.builder()
                .bill(bill)
                .paymentMethod(paymentMethod)
                .provider("VNPAY")
                .amount(bill.getTotalCost())
                .transactionCode(vnp_TxnRef)
                .status(PaymentTransaction.TransactionStatus.PENDING)
                .build();
        paymentTransactionRepository.save(transaction);

        Map<String, String> vnp_Params = new HashMap<>();
        vnp_Params.put("vnp_Version", VnpayConfig.vnp_Version);
        vnp_Params.put("vnp_Command", "pay");
        vnp_Params.put("vnp_TmnCode", VnpayConfig.vnp_TmnCode);
        vnp_Params.put("vnp_Amount", String.valueOf(amount));
        vnp_Params.put("vnp_CurrCode", "VND");

        if (bankCode != null && !bankCode.isEmpty()) {
            vnp_Params.put("vnp_BankCode", bankCode);
        }
        vnp_Params.put("vnp_TxnRef", vnp_TxnRef);
        vnp_Params.put("vnp_OrderInfo", "Thanh toan don hang:" + bill.getId());
        vnp_Params.put("vnp_OrderType", "other");
        vnp_Params.put("vnp_ReturnUrl", VnpayConfig.vnp_ReturnUrl);
        vnp_Params.put("vnp_Locale", "vn");
        vnp_Params.put("vnp_IpAddr", ipAddr);

        Calendar cld = Calendar.getInstance(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
        java.text.SimpleDateFormat formatter = new java.text.SimpleDateFormat("yyyyMMddHHmmss");
        formatter.setTimeZone(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
        String vnp_CreateDate = formatter.format(cld.getTime());
        vnp_Params.put("vnp_CreateDate", vnp_CreateDate);

        cld.add(Calendar.MINUTE, 15);
        String vnp_ExpireDate = formatter.format(cld.getTime());
        vnp_Params.put("vnp_ExpireDate", vnp_ExpireDate);

        List<String> fieldNames = new ArrayList<>(vnp_Params.keySet());
        Collections.sort(fieldNames);
        StringBuilder hashData = new StringBuilder();
        StringBuilder query = new StringBuilder();
        Iterator<String> itr = fieldNames.iterator();
        while (itr.hasNext()) {
            String fieldName = itr.next();
            String fieldValue = vnp_Params.get(fieldName);
            if ((fieldValue != null) && (fieldValue.length() > 0)) {
                hashData.append(fieldName);
                hashData.append('=');
                try {
                    hashData.append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII.toString()));
                    query.append(URLEncoder.encode(fieldName, StandardCharsets.US_ASCII.toString()));
                    query.append('=');
                    query.append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII.toString()));
                } catch (UnsupportedEncodingException e) {
                    log.error("Failed to encode VNPAY parameter", e);
                }
                if (itr.hasNext()) {
                    query.append('&');
                    hashData.append('&');
                }
            }
        }
        String queryUrl = query.toString();
        String vnp_SecureHash = VnpayConfig.hmacSHA512(VnpayConfig.secretKey, hashData.toString());
        queryUrl += "&vnp_SecureHash=" + vnp_SecureHash;
        return VnpayConfig.vnp_PayUrl + "?" + queryUrl;
    }

    @Transactional
    public PaymentTransactionDTO completeOnlinePayment(String transactionCode, String responseCode, String providerTransactionId, String responseMessage) {
        PaymentTransactionDTO result = new PaymentTransactionDTO();

        PaymentTransaction transaction = paymentTransactionRepository.findByTransactionCode(transactionCode)
                .orElse(null);

        if (transaction == null) {
            result.setStatus("NO");
            result.setMessage("Transaction not found");
            return result;
        }

        transaction.setResponseCode(responseCode);
        transaction.setResponseMessage(responseMessage);
        transaction.setProviderTransactionId(providerTransactionId);

        if ("00".equals(responseCode)) {
            transaction.setStatus(PaymentTransaction.TransactionStatus.SUCCESS);
            transaction.setPaidAt(LocalDateTime.now());

            Bill bill = transaction.getBill();
            if (bill != null) {
                bill.setStatus(BillStatus.APPROVED);
                bill.setApprovedAt(LocalDateTime.now());
                bill.setPaymentStatus("SUCCESS");
                billRepository.save(bill);

                sendOrderStatusUpdateNotification(bill);
            }

            result.setStatus("OK");
            result.setMessage("Successfully");
        } else {
            transaction.setStatus(PaymentTransaction.TransactionStatus.FAILED);
            result.setStatus("NO");
            result.setMessage("Failed");
        }

        paymentTransactionRepository.save(transaction);
        return result;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // SERVICE HELPERS & CONVERTERS
    // ──────────────────────────────────────────────────────────────────────────

    private BookResponse fetchBook(Long bookId) {
        try {
            ApiResponse<BookResponse> response = bookClient.getBookById(bookId);
            if (response == null || response.getResult() == null) {
                throw new AppException(ErrorCode.BOOK_NOT_FOUND);
            }
            return response.getResult();
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to fetch book ID={} from book-service: {}", bookId, e.getMessage());
            throw new AppException(ErrorCode.BOOK_SERVICE_ERROR);
        }
    }

    private void validateStatusTransition(BillStatus oldStatus, BillStatus newStatus) {
        switch (oldStatus) {
            case PENDING:
                if (newStatus != BillStatus.APPROVED && newStatus != BillStatus.CANCELED) {
                    throw new AppException(ErrorCode.INVALID_STATUS_TRANSITION);
                }
                break;
            case APPROVED:
                if (newStatus != BillStatus.SHIPPING && newStatus != BillStatus.CANCELED) {
                    throw new AppException(ErrorCode.INVALID_STATUS_TRANSITION);
                }
                break;
            case SHIPPING:
                if (newStatus != BillStatus.SHIPPED && newStatus != BillStatus.CANCELED) {
                    throw new AppException(ErrorCode.INVALID_STATUS_TRANSITION);
                }
                break;
            case SHIPPED:
                if (newStatus != BillStatus.COMPLETED) {
                    throw new AppException(ErrorCode.INVALID_STATUS_TRANSITION);
                }
                break;
            case COMPLETED:
            case CANCELED:
                throw new AppException(ErrorCode.INVALID_STATUS_TRANSITION);
        }
    }

    private BillDTO convertToDTO(Bill bill) {
        List<BillBookDTO> bookDTOs = bill.getBillBooks().stream()
                .map(this::convertBillBookToDTO)
                .toList();

        String userName = "Người dùng";
        try {
            ApiResponse<UserProfileResponse> profileResponse = userClient.getProfile(bill.getUserId());
            if (profileResponse != null && profileResponse.getResult() != null) {
                UserProfileResponse profile = profileResponse.getResult();
                userName = profile.getUsername() != null ? profile.getUsername() : (profile.getFirstName() + " " + profile.getLastName()).trim();
            }
        } catch (Exception e) {
            log.warn("Failed to enrich username for userId={}: {}", bill.getUserId(), e.getMessage());
        }

        String approvedByName = null;
        if (bill.getApprovedBy() != null) {
            // approvedBy lưu email của approver — extract username từ email
            String approvedBy = bill.getApprovedBy();
            approvedByName = approvedBy.contains("@") ? approvedBy.split("@")[0] : approvedBy;
        }

        return BillDTO.builder()
                .id(bill.getId())
                .userId(bill.getUserId())
                .userName(userName)
                .paymentMethodId(bill.getPaymentMethod().getId())
                .paymentMethodName(bill.getPaymentMethod().getName())
                .shippingMethodId(bill.getShippingMethod().getId())
                .shippingMethodName(bill.getShippingMethod().getName())
                .shippingCost(bill.getShippingMethod().getPrice())
                .totalCost(bill.getTotalCost())
                .approvedById(bill.getApprovedBy())
                .approvedByName(approvedByName)
                .status(bill.getStatus())
                .books(bookDTOs)
                .createdAt(bill.getCreatedAt())
                .updatedAt(bill.getUpdatedAt())
                .approvedAt(bill.getApprovedAt())
                .paymentStatus(bill.getPaymentStatus())
                .build();
    }

    private BillBookDTO convertBillBookToDTO(BillBook billBook) {
        String bookName = "Không thể tải thông tin sách";
        String bookImageUrl = "";

        try {
            BookResponse book = fetchBook(billBook.getBookId());
            bookName = book.getName();
            bookImageUrl = book.getBookImageUrl();
        } catch (Exception e) {
            log.warn("Failed to enrich ordered book snapshot information for ID={}", billBook.getBookId());
        }

        double price = billBook.getPriceSnapshot() != null ? billBook.getPriceSnapshot() : 0.0;
        double subtotal = price * billBook.getQuantity();

        return BillBookDTO.builder()
                .bookId(billBook.getBookId())
                .bookName(bookName)
                .bookImageUrl(bookImageUrl)
                .priceSnapshot(price)
                .quantity(billBook.getQuantity())
                .subtotal(subtotal)
                .build();
    }

    @Transactional(readOnly = true)
    public boolean verifyPurchase(Long userId, Long bookId) {
        return billRepository.existsByUserIdAndBookIdAndStatusIn(
                userId, bookId, List.of(BillStatus.SHIPPED, BillStatus.COMPLETED)
        );
    }
}
