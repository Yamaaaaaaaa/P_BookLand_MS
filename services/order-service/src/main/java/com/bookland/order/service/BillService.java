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
import com.bookland.order.exception.AppException;
import com.bookland.order.exception.ErrorCode;
import com.bookland.order.producer.NotificationProducer;
import com.bookland.order.repository.BillBookRepository;
import com.bookland.order.repository.BillRepository;
import com.bookland.order.repository.PaymentMethodRepository;
import com.bookland.order.repository.ShippingMethodRepository;
import com.bookland.order.repository.specification.BillSpecification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
    private final ShippingMethodRepository shippingMethodRepository;
    private final BookClient bookClient;
    private final EventClient eventClient;
    private final UserClient userClient;
    private final NotificationProducer notificationProducer;

    @Transactional(readOnly = true)
    public Page<BillDTO> getAllBills(String userId, BillStatus status,
                                     LocalDateTime fromDate, LocalDateTime toDate,
                                     Double minCost, Double maxCost,
                                     Pageable pageable) {
        Specification<Bill> spec = Specification.where(null);

        if (userId != null && !userId.trim().isEmpty()) {
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
    public Page<BillDTO> getOwnBills(String email, BillStatus status,
                                     LocalDateTime fromDate, LocalDateTime toDate,
                                     Double minCost, Double maxCost,
                                     Pageable pageable) {
        String resolvedUserId = resolveUserIdByEmail(email);
        Specification<Bill> spec = BillSpecification.hasUser(resolvedUserId);

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
    public BillDTO createBill(String email, CreateBillRequest request) {
        String resolvedUserId = resolveUserIdByEmail(email);
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
            if (response != null && response.getResult() != null) {
                activeEvent = response.getResult();
            }
        } catch (Exception e) {
            log.warn("Failed to fetch promo event from event-service: {}", e.getMessage());
        }

        EventResponse appliedEvent = null;
        Map<Long, Double> discountedPrices = new HashMap<>();
        int totalDiscountValue = 0;

        if (activeEvent != null) {
            boolean isEligible = checkEventRule(activeEvent, email, tempTotalCost, totalQuantity);
            if (isEligible) {
                for (BookResponse book : books) {
                    if (isBookInEventTarget(activeEvent, book.getId())) {
                        double originalPrice = book.getFinalPrice() != null ? book.getFinalPrice() : 0.0;
                        double discountedPrice = calculateDiscountedPrice(activeEvent, originalPrice);
                        int qty = quantities.get(book.getId());

                        discountedPrices.put(book.getId(), discountedPrice);
                        totalDiscountValue += (int) ((originalPrice - discountedPrice) * qty);
                        appliedEvent = activeEvent;
                    }
                }
            }
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
                .userId(resolvedUserId)
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

    private boolean checkEventRule(EventResponse event, String email, Double orderValue, Integer totalQuantity) {
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
                .toUserId(bill.getUserId())
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
                .toUserId(bill.getUserId())
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
            try {
                ApiResponse<UserProfileResponse> profileResponse = userClient.getProfile(bill.getApprovedBy());
                if (profileResponse != null && profileResponse.getResult() != null) {
                    UserProfileResponse profile = profileResponse.getResult();
                    approvedByName = profile.getUsername() != null ? profile.getUsername() : (profile.getFirstName() + " " + profile.getLastName()).trim();
                } else {
                    approvedByName = bill.getApprovedBy().split("@")[0];
                }
            } catch (Exception e) {
                approvedByName = bill.getApprovedBy().split("@")[0];
            }
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

    private String resolveUserIdByEmail(String email) {
        try {
            ApiResponse<UserProfileResponse> response = userClient.getMyProfile(email);
            if (response != null && response.getResult() != null) {
                UserProfileResponse profile = response.getResult();
                return profile.getUserId() != null ? profile.getUserId() : profile.getId();
            }
        } catch (Exception e) {
            log.error("Failed to resolve user ID for email: {}", email, e);
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        throw new AppException(ErrorCode.UNAUTHENTICATED);
    }
}
