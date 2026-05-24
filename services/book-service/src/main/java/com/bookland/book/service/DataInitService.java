package com.bookland.book.service;

import com.bookland.book.entity.*;
import com.bookland.book.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

/**
 * DataInitService — Seed dữ liệu mẫu cho book-service.
 * Được gọi thủ công qua API: POST /api/admin/init-data
 * (Không tự động chạy khi khởi động)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DataInitService {

    private final AuthorRepository authorRepository;
    private final PublisherRepository publisherRepository;
    private final SerieRepository serieRepository;
    private final CategoryRepository categoryRepository;
    private final BookRepository bookRepository;

    @Transactional
    public String initData() {
        if (bookRepository.count() > 0) {
            log.warn("Dữ liệu đã được khởi tạo trước đó, bỏ qua.");
            return "Dữ liệu đã tồn tại, không cần khởi tạo lại.";
        }

        log.info("Bắt đầu khởi tạo dữ liệu book-service...");

        // 1. Tạo Authors
        Author author1 = authorRepository.save(Author.builder()
                .name("J.K. Rowling")
                .description("Tác giả người Anh, nổi tiếng với series Harry Potter")
                .authorImage("jk_rowling.jpg")
                .build());
        Author author2 = authorRepository.save(Author.builder()
                .name("Fujiko F. Fujio")
                .description("Bút danh của Hiroshi Fujimoto, tác giả truyện Doraemon")
                .authorImage("fujiko.jpg")
                .build());
        Author author3 = authorRepository.save(Author.builder()
                .name("Nguyễn Nhật Ánh")
                .description("Nhà văn Việt Nam nổi tiếng với các tác phẩm thiếu nhi")
                .authorImage("nguyen_nhat_anh.jpg")
                .build());
        Author author4 = authorRepository.save(Author.builder()
                .name("Bộ Giáo dục và Đào tạo")
                .description("Tác giả các sách giáo khoa Việt Nam")
                .authorImage("bgddt.jpg")
                .build());
        log.info("✓ Authors seeded.");

        // 2. Tạo Publishers
        Publisher publisher1 = publisherRepository.save(Publisher.builder()
                .name("NXB Kim Đồng")
                .description("Nhà xuất bản chuyên sách thiếu nhi Việt Nam")
                .build());
        Publisher publisher2 = publisherRepository.save(Publisher.builder()
                .name("NXB Trẻ")
                .description("Nhà xuất bản văn học và thiếu nhi")
                .build());
        Publisher publisher3 = publisherRepository.save(Publisher.builder()
                .name("NXB Giáo dục Việt Nam")
                .description("Nhà xuất bản sách giáo khoa")
                .build());
        publisherRepository.save(Publisher.builder()
                .name("Bloomsbury Publishing")
                .description("Nhà xuất bản Harry Potter bản tiếng Anh")
                .build());
        log.info("✓ Publishers seeded.");

        // 3. Tạo Series
        Serie serie1 = serieRepository.save(Serie.builder()
                .name("Harry Potter")
                .description("Bộ tiểu thuyết giả tưởng 7 tập về phù thủy Harry Potter")
                .build());
        Serie serie2 = serieRepository.save(Serie.builder()
                .name("Doraemon")
                .description("Bộ truyện tranh dài về chú mèo máy đến từ tương lai")
                .build());
        Serie[] gradeSeries = new Serie[12];
        for (int i = 1; i <= 12; i++) {
            gradeSeries[i - 1] = serieRepository.save(Serie.builder()
                    .name("Sách Giáo Khoa Lớp " + i)
                    .description("Bộ sách giáo khoa lớp " + i)
                    .build());
        }
        log.info("✓ Series seeded.");

        // 4. Tạo Categories
        Category category1 = categoryRepository.save(Category.builder()
                .name("Tiểu thuyết giả tưởng")
                .imageUrl("https://scvvtnvriucbhkrstung.supabase.co/storage/v1/object/public/book-images/tieu_thuyet_gia_tuong.png")
                .description("Sách thuộc thể loại giả tưởng, phép thuật")
                .pin(true).build());
        Category category2 = categoryRepository.save(Category.builder()
                .name("Truyện tranh")
                .imageUrl("https://scvvtnvriucbhkrstung.supabase.co/storage/v1/object/public/book-images/truyen-tranh.png")
                .description("Manga, Comic")
                .pin(true).build());
        Category category3 = categoryRepository.save(Category.builder()
                .name("Văn học thiếu nhi")
                .imageUrl("https://scvvtnvriucbhkrstung.supabase.co/storage/v1/object/public/book-images/van_hoc_thieu_nhi.png")
                .description("Sách dành cho thiếu nhi")
                .pin(true).build());
        Category category4 = categoryRepository.save(Category.builder()
                .name("Sách giáo khoa")
                .imageUrl("https://scvvtnvriucbhkrstung.supabase.co/storage/v1/object/public/book-images/sach_giao_khoa.png")
                .description("Sách giáo khoa phổ thông")
                .pin(true).build());
        Category category5 = categoryRepository.save(Category.builder()
                .name("Văn học Việt Nam")
                .description("Tác phẩm văn học của tác giả Việt Nam")
                .pin(true).build());
        log.info("✓ Categories seeded.");

        // 5. Tạo Books — Harry Potter (7 tập)
        Set<Category> harryPotterCats = Set.of(category1);
        String[][] harryPotterData = {
            {"Harry Potter và Hòn đá Phù thủy", "Tập 1: Harry Potter khám phá thế giới phù thuật", "120000", "10", "50", "1997-06-26",
             "https://scvvtnvriucbhkrstung.supabase.co/storage/v1/object/public/book-images/4591ca46-374f-4896-b824-6d4a6c05b8ff-nxbtre_full_21042022_030444.jpg"},
            {"Harry Potter và Phòng chứa Bí mật", "Tập 2: Bí mật trong trường Hogwarts", "130000", "10", "45", "1998-07-02",
             "https://scvvtnvriucbhkrstung.supabase.co/storage/v1/object/public/book-images/95c45d12-4825-4008-8460-d2f344a12d73-nxbtre_full_21472017_034753.jpg"},
            {"Harry Potter và Tên tù nhân ngục Azkaban", "Tập 3: Sirius Black trốn thoát", "135000", "10", "40", "1999-07-08",
             "https://scvvtnvriucbhkrstung.supabase.co/storage/v1/object/public/book-images/0ac2c531-8d88-49e5-abad-5c275efe33b6-nxbtre_full_24342024_033441.jpg"},
            {"Harry Potter và Chiếc cốc lửa", "Tập 4: Giải đấu Tam Pháp thuật", "150000", "10", "35", "2000-07-08",
             "https://scvvtnvriucbhkrstung.supabase.co/storage/v1/object/public/book-images/fb84ad97-6106-4f06-9e74-4de8fe75edb8-nxbtre_full_20342017_033410.jpg"},
            {"Harry Potter và Hội Phượng Hoàng", "Tập 5: Sự trở lại của Voldemort", "160000", "10", "30", "2003-06-21",
             "https://scvvtnvriucbhkrstung.supabase.co/storage/v1/object/public/book-images/a333cea6-e2ed-4966-ba16-89cac8497952-nxbtre_full_28042023_110430.jpg"},
            {"Harry Potter và Hoàng tử lai", "Tập 6: Bí mật về Voldemort", "155000", "10", "25", "2005-07-16",
             "https://scvvtnvriucbhkrstung.supabase.co/storage/v1/object/public/book-images/31b0f59e6131b88cf5f7d52870cc42a3.jpg"},
            {"Harry Potter và Bảo bối Tử thần", "Tập 7: Trận chiến cuối cùng", "170000", "10", "20", "2007-07-21",
             "https://scvvtnvriucbhkrstung.supabase.co/storage/v1/object/public/book-images/7390ee2e-3bee-4d19-9c51-f2fea42d5cf8-images%20(2).jpg"},
        };
        for (String[] d : harryPotterData) {
            bookRepository.save(Book.builder()
                    .name(d[0]).description(d[1])
                    .originalCost(Double.parseDouble(d[2]))
                    .sale(Double.parseDouble(d[3]))
                    .stock(Integer.parseInt(d[4]))
                    .publishedDate(LocalDate.parse(d[5]))
                    .bookImageUrl(d[6])
                    .pin(true)
                    .author(author1).publisher(publisher2).series(serie1)
                    .categories(new HashSet<>(harryPotterCats))
                    .build());
        }
        log.info("✓ Harry Potter books seeded.");

        // 6. Tạo Books — Doraemon (45 tập)
        Set<Category> doraemonCats = Set.of(category2);
        for (String[] d : DORAEMON_DATA) {
            bookRepository.save(Book.builder()
                    .name(d[0]).description(d[1])
                    .originalCost(25000.0).sale(5.0)
                    .stock(Integer.parseInt(d[2]))
                    .publishedDate(LocalDate.parse(d[3]))
                    .bookImageUrl(d[4])
                    .pin(false)
                    .author(author2).publisher(publisher1).series(serie2)
                    .categories(new HashSet<>(doraemonCats))
                    .build());
        }
        log.info("✓ Doraemon books seeded.");

        // 7. Tạo Books — Sách giáo khoa
        Set<Category> textbookCats = Set.of(category4);
        for (Object[] d : TEXTBOOK_DATA) {
            bookRepository.save(Book.builder()
                    .name((String) d[0]).description((String) d[1])
                    .originalCost((Double) d[2])
                    .sale(0.0).stock((Integer) d[3])
                    .publishedDate(LocalDate.of(2020, 6, 1))
                    .bookImageUrl((String) d[4])
                    .pin(false)
                    .author(author4).publisher(publisher3)
                    .series(gradeSeries[(Integer) d[5] - 1])
                    .categories(new HashSet<>(textbookCats))
                    .build());
        }
        log.info("✓ Textbook books seeded.");

        // 8. Tạo Books — Nguyễn Nhật Ánh
        Set<Category> nnaCats = Set.of(category5);
        String[][] nnaData = {
            {"Tôi thấy hoa vàng trên cỏ xanh", "Câu chuyện tuổi thơ miền Trung", "90000", "15", "120", "2010-12-01", "nna_hoa_vang.jpg", "true"},
            {"Mắt biếc", "Chuyện tình đầu dang dở", "85000", "15", "110", "1990-01-01", "nna_mat_biec.jpg", "true"},
            {"Cho tôi xin một vé đi tuổi thơ", "Hồi ức tuổi thơ", "75000", "10", "100", "2008-01-01", "nna_ve_tuoi_tho.jpg", "false"},
        };
        for (String[] d : nnaData) {
            bookRepository.save(Book.builder()
                    .name(d[0]).description(d[1])
                    .originalCost(Double.parseDouble(d[2]))
                    .sale(Double.parseDouble(d[3]))
                    .stock(Integer.parseInt(d[4]))
                    .publishedDate(LocalDate.parse(d[5]))
                    .bookImageUrl(d[6])
                    .pin(Boolean.parseBoolean(d[7]))
                    .author(author3).publisher(publisher2).series(null)
                    .categories(new HashSet<>(nnaCats))
                    .build());
        }
        log.info("✓ Nguyễn Nhật Ánh books seeded.");

        long total = bookRepository.count();
        String msg = String.format("Khởi tạo dữ liệu thành công! Tổng số sách: %d", total);
        log.info(msg);
        return msg;
    }

    // ========== Doraemon data ==========
    private static final String[][] DORAEMON_DATA = {
        {"Doraemon - Truyện dài - Tập 1: Khủng long của Nobita","Nobita tìm thấy trứng khủng long","100","1980-01-01","https://scvvtnvriucbhkrstung.supabase.co/storage/v1/object/public/book-images/images%20(8).jpg"},
        {"Doraemon - Truyện dài - Tập 2: Lịch sử khai phá vũ trụ","Cuộc phiêu lưu ngoài vũ trụ","95","1981-01-01","https://scvvtnvriucbhkrstung.supabase.co/storage/v1/object/public/book-images/31b0f59e6131b88cf5f7d52870cc42a3.jpg"},
        {"Doraemon - Truyện dài - Tập 3: Lâu đài dưới đáy biển","Khám phá đại dương","90","1983-01-01","https://scvvtnvriucbhkrstung.supabase.co/storage/v1/object/public/book-images/images%20(10).jpg"},
        {"Doraemon - Truyện dài - Tập 4: Xứ sở ma thuật","Thế giới phép thuật kỳ diệu","88","1984-01-01","dora_td4.jpg"},
        {"Doraemon - Truyện dài - Tập 5: Chuyến phiêu lưu ở miền Tây hoang dã","Cuộc phiêu lưu miền Viễn Tây","85","1982-01-01","dora_td5.jpg"},
        {"Doraemon - Truyện dài - Tập 6: Cuộc đại thủy chiến ở xứ sở người cá","Thế giới dưới nước","82","1983-03-01","https://scvvtnvriucbhkrstung.supabase.co/storage/v1/object/public/book-images/doraemon_-_nobita_va_cuoc_chien_dai_thuy_o_xu_so_nguoi_ca_-_tb_2020_dd53b454cee444e6a6a4b03c35e4c3f7_1024x1024.jpg"},
        {"Doraemon - Truyện dài - Tập 7: Binh đoàn người sắt","Robot xâm lược Trái Đất","80","1986-01-01","https://scvvtnvriucbhkrstung.supabase.co/storage/v1/object/public/book-images/images%20(4).jpg"},
        {"Doraemon - Truyện dài - Tập 8: Những hiệp sĩ không gian","Chiến đấu trong vũ trụ","78","1985-01-01","https://scvvtnvriucbhkrstung.supabase.co/storage/v1/object/public/book-images/images%20(9).jpg"},
        {"Doraemon - Truyện dài - Tập 9: Vua quỷ ở thành phố ngầm","Thế giới ngầm bí ẩn","76","1983-08-01","dora_td9.jpg"},
        {"Doraemon - Truyện dài - Tập 10: Cuộc chiến ở xứ sở người bé nhỏ","Nobita bị teo nhỏ","74","1985-03-01","dora_td10.jpg"},
        {"Doraemon - Truyện dài - Tập 11: Cuộc phiêu lưu vào rừng xanh","Phiêu lưu trong rừng nhiệt đới","72","1992-01-01","dora_td11.jpg"},
        {"Doraemon - Truyện dài - Tập 12: Vương quốc trên mây","Thế giới trên mây","70","1992-03-01","dora_td12.jpg"},
        {"Doraemon - Truyện dài - Tập 13: Mê cung thiếc","Cuộc phiêu lưu trong mê cung","68","1993-01-01","https://scvvtnvriucbhkrstung.supabase.co/storage/v1/object/public/book-images/21f9c55bb574784671984443bb3d2bc5.jpg"},
        {"Doraemon - Truyện dài - Tập 14: Những vị thần bí ẩn","Hành tinh thần bí","66","1997-01-01","dora_td14.jpg"},
        {"Doraemon - Truyện dài - Tập 15: Cuộc phiêu lưu ở Xứ sở Nghìn lẻ một đêm","Thế giới Nghìn lẻ một đêm","64","1991-01-01","https://scvvtnvriucbhkrstung.supabase.co/storage/v1/object/public/book-images/-c4-90-c3-aam-truy-e1-bb-87n-d-c3-a0i_d5199fa0c4fe492ab3ccebada0685094_49f42c39a8be4340ba0ce26643d07715_1024x1024.jpg"},
        {"Doraemon - Truyện dài - Tập 16: Chuyến tàu tốc hành ngân hà","Du hành vũ trụ bằng tàu hỏa","62","1996-01-01","https://scvvtnvriucbhkrstung.supabase.co/storage/v1/object/public/book-images/doraemon-truyen-dai-tap-16_8f959adc4ba148f3a657fa1b2cd108d9.jpg"},
        {"Doraemon - Truyện dài - Tập 17: Truyền thuyết về vua mặt trời","Khám phá nền văn minh cổ đại","60","2000-01-01","https://scvvtnvriucbhkrstung.supabase.co/storage/v1/object/public/book-images/Nobita_va_truyen_thuyet_vua_mat_troi.jpg"},
        {"Doraemon - Truyện dài - Tập 18: Lịch sử khai phá miền Tây","Lập nghiệp ở miền Tây","58","2001-01-01","dora_td18.jpg"},
        {"Doraemon - Truyện dài - Tập 19: Cuộc chiến ngoài hành tinh","Chiến đấu với người ngoài hành tinh","56","1985-08-01","dora_td19.jpg"},
        {"Doraemon - Truyện dài - Tập 20: Viện bảo tàng bảo bối bí mật","Kho báu bí ẩn của Doraemon","54","2013-01-01","dora_td20.jpg"},
        {"Doraemon - Truyện dài - Tập 21: Hòn đảo kỳ bí","Phiêu lưu trên đảo hoang","52","1998-01-01","dora_td21.jpg"},
        {"Doraemon - Truyện dài - Tập 22: Nobita và những bạn khủng long mới","Gặp lại những chú khủng long","50","2006-01-01","dora_td22.jpg"},
        {"Doraemon - Truyện dài - Tập 23: Cuộc phiêu lưu trên đảo giấu vàng","Tìm kho báu trên đảo","48","2018-01-01","https://scvvtnvriucbhkrstung.supabase.co/storage/v1/object/public/book-images/14778-doraemon-cuoc-phieu-luu-den-dao-giau-vang-1.jpg"},
        {"Doraemon - Truyện dài - Tập 24: Chú chó của Nobita và cuộc phiêu lưu châu Phi","Phiêu lưu ở châu Phi","46","1998-03-01","dora_td24.jpg"},
        {"Doraemon - Truyện dài - Tập 25: Nobita ở vương quốc Rô-bốt","Thế giới robot","44","2002-01-01","https://scvvtnvriucbhkrstung.supabase.co/storage/v1/object/public/book-images/images%20(5).jpg"},
        {"Doraemon - Truyện dài - Tập 26: Nobita và hành tinh màu tím","Hành tinh bí ẩn","42","1990-01-01","dora_td26.jpg"},
        {"Doraemon - Truyện dài - Tập 27: Nobita và binh đoàn người sắt mới","Phần tiếp theo binh đoàn người sắt","40","2011-01-01","dora_td27.jpg"},
        {"Doraemon - Truyện dài - Tập 28: Người cá ngoài đại dương","Đại dương xanh thẳm","38","2010-01-01","dora_td28.jpg"},
        {"Doraemon - Truyện dài - Tập 29: Nobita và chuyến thám hiểm Nam Cực","Khám phá Nam Cực","36","2017-01-01","dora_td29.jpg"},
        {"Doraemon - Truyện dài - Tập 30: Người sinh sống trên mặt trăng","Cuộc sống trên mặt trăng","34","2019-01-01","dora_td30.jpg"},
        {"Doraemon - Truyện dài - Tập 31: Nobita và chuyến tàu thời gian","Du hành xuyên thời gian","32","1987-01-01","dora_td31.jpg"},
        {"Doraemon - Truyện dài - Tập 32: Nobita và những dũng sĩ có cánh","Thế giới có cánh","30","2001-03-01","https://scvvtnvriucbhkrstung.supabase.co/storage/v1/object/public/book-images/images%20(7).jpg"},
        {"Doraemon - Truyện dài - Tập 33: Nobita và hành tinh động vật","Hành tinh của động vật","28","1990-03-01","https://scvvtnvriucbhkrstung.supabase.co/storage/v1/object/public/book-images/doraemon-tap-10---nobita-va-hanh-tinh-muong-thu---tb-2023.jpg"},
        {"Doraemon - Truyện dài - Tập 34: Nobita và vùng đất lý tưởng trên bầu trời","Xây dựng thiên đường","26","2016-01-01","dora_td34.jpg"},
        {"Doraemon - Truyện dài - Tập 35: Nobita và người khổng lồ xanh","Cuộc phiêu lưu với người khổng lồ","24","2008-01-01","https://scvvtnvriucbhkrstung.supabase.co/storage/v1/object/public/book-images/8935244878202.webp"},
        {"Doraemon - Truyện dài - Tập 36: Nobita và chuyến du hành biển phương Nam","Thám hiểm biển phương Nam","22","1998-08-01","https://scvvtnvriucbhkrstung.supabase.co/storage/v1/object/public/book-images/Truy-n-doremon-dai-t-p-du-hanh-bi-n-ph-ng-nam-1-2048.webp"},
        {"Doraemon - Truyện dài - Tập 37: Nobita và những hiệp sĩ rô-bốt","Hiệp sĩ thời đại mới","20","2014-01-01","dora_td37.jpg"},
        {"Doraemon - Truyện dài - Tập 38: Nobita và Nước Nhật thời nguyên thủy","Du hành về thời tiền sử","18","1989-01-01","https://scvvtnvriucbhkrstung.supabase.co/storage/v1/object/public/book-images/dai_9_0c60f94482714499bb6f8432f9ad6af0_master.jpg"},
        {"Doraemon - Truyện dài - Tập 39: Nobita và Chú khủng long mới","Chú khủng long được sinh ra","16","2020-01-01","https://scvvtnvriucbhkrstung.supabase.co/storage/v1/object/public/book-images/doraemon-truyen-dai-1-chu-khung-long-cua-nobita_27a58b414f0644ea9f510ab240d9b58d.jpg"},
        {"Doraemon - Truyện dài - Tập 40: Nobita và những thợ săn vàng","Săn tìm kho báu","14","1994-01-01","dora_td40.jpg"},
        {"Doraemon - Truyện dài - Tập 41: Nobita và vương quốc trên mây","Tái hiện vương quốc trên mây","12","2023-01-01","https://scvvtnvriucbhkrstung.supabase.co/storage/v1/object/public/book-images/8cbf9ec4321c4.jpg"},
        {"Doraemon - Truyện dài - Tập 42: Nobita và bản giao hưởng Địa Cầu","Cứu lấy Trái Đất","10","2024-01-01","dora_td42.jpg"},
        {"Doraemon - Truyện dài - Tập 43: Nobita ở đảo giấu vàng","Phiên bản mới đảo giấu vàng","8","2018-08-01","dora_td43.jpg"},
        {"Doraemon - Truyện dài - Tập 44: Nobita và Mặt Trăng phiêu lưu ký","Phiêu lưu trên mặt trăng","6","2019-08-01","dora_td44.jpg"},
        {"Doraemon - Truyện dài - Tập 45: Nobita và cuộc đại thủy chiến","Chiến đấu dưới nước","4","2010-08-01","dora_td45.jpg"},
    };

    // ========== Textbook data: {name, desc, cost, stock, image, grade} ==========
    private static final Object[][] TEXTBOOK_DATA = {
        {"Toán 1","Sách giáo khoa Toán lớp 1",15000.0,200,"https://scvvtnvriucbhkrstung.supabase.co/storage/v1/object/public/book-images/AHc89lMuEtkPbVIlJQNWZIYItWNZQ3s5.jpg",1},
        {"Tiếng Việt 1","Sách giáo khoa Tiếng Việt lớp 1",20000.0,200,"https://scvvtnvriucbhkrstung.supabase.co/storage/v1/object/public/book-images/images%20(9).jpg",1},
        {"Toán 2","Sách giáo khoa Toán lớp 2",15000.0,200,"https://scvvtnvriucbhkrstung.supabase.co/storage/v1/object/public/book-images/images%20(10).jpg",2},
        {"Tiếng Việt 2","Sách giáo khoa Tiếng Việt lớp 2",20000.0,200,"https://scvvtnvriucbhkrstung.supabase.co/storage/v1/object/public/book-images/download%20(1).jpg",2},
        {"Toán 3","Sách giáo khoa Toán lớp 3",16000.0,200,"https://scvvtnvriucbhkrstung.supabase.co/storage/v1/object/public/book-images/toan-3.jpg",3},
        {"Tiếng Việt 3","Sách giáo khoa Tiếng Việt lớp 3",21000.0,200,"sgk_tv3.jpg",3},
        {"Lịch Sử và Địa lý 3","Sách giáo khoa Lịch Sử và Địa lý lớp 3",18000.0,200,"sgk_ls3.jpg",3},
        {"Toán 4","Sách giáo khoa Toán lớp 4",17000.0,200,"sgk_toan4.jpg",4},
        {"Tiếng Việt 4","Sách giáo khoa Tiếng Việt lớp 4",22000.0,200,"sgk_tv4.jpg",4},
        {"Lịch Sử và Địa lý 4","Sách giáo khoa Lịch Sử và Địa lý lớp 4",19000.0,200,"sgk_ls4.jpg",4},
        {"Toán 5","Sách giáo khoa Toán lớp 5",18000.0,200,"https://scvvtnvriucbhkrstung.supabase.co/storage/v1/object/public/book-images/bc1bf9ca-2c59-43f3-95f0-9a7ba916d636-download%20(5).jpg",5},
        {"Tiếng Việt 5","Sách giáo khoa Tiếng Việt lớp 5",23000.0,200,"sgk_tv5.jpg",5},
        {"Lịch Sử và Địa lý 5","Sách giáo khoa Lịch Sử và Địa lý lớp 5",20000.0,200,"sgk_ls5.jpg",5},
        {"Toán 6","Sách giáo khoa Toán lớp 6",25000.0,180,"sgk_toan6.jpg",6},
        {"Ngữ Văn 6","Sách giáo khoa Ngữ Văn lớp 6",28000.0,180,"sgk_van6.jpg",6},
        {"Lịch Sử 6","Sách giáo khoa Lịch Sử lớp 6",22000.0,180,"sgk_ls6.jpg",6},
        {"Toán 7","Sách giáo khoa Toán lớp 7",26000.0,180,"sgk_toan7.jpg",7},
        {"Ngữ Văn 7","Sách giáo khoa Ngữ Văn lớp 7",29000.0,180,"sgk_van7.jpg",7},
        {"Lịch Sử 7","Sách giáo khoa Lịch Sử lớp 7",23000.0,180,"sgk_ls7.jpg",7},
        {"Toán 8","Sách giáo khoa Toán lớp 8",27000.0,180,"sgk_toan8.jpg",8},
        {"Ngữ Văn 8","Sách giáo khoa Ngữ Văn lớp 8",30000.0,180,"sgk_van8.jpg",8},
        {"Lịch Sử 8","Sách giáo khoa Lịch Sử lớp 8",24000.0,180,"sgk_ls8.jpg",8},
        {"Vật Lý 8","Sách giáo khoa Vật Lý lớp 8",25000.0,180,"sgk_ly8.jpg",8},
        {"Toán 9","Sách giáo khoa Toán lớp 9",28000.0,180,"sgk_toan9.jpg",9},
        {"Ngữ Văn 9","Sách giáo khoa Ngữ Văn lớp 9",31000.0,180,"sgk_van9.jpg",9},
        {"Lịch Sử 9","Sách giáo khoa Lịch Sử lớp 9",25000.0,180,"sgk_ls9.jpg",9},
        {"Vật Lý 9","Sách giáo khoa Vật Lý lớp 9",26000.0,180,"sgk_ly9.jpg",9},
        {"Hóa Học 9","Sách giáo khoa Hóa Học lớp 9",26000.0,180,"sgk_hoa9.jpg",9},
        {"Toán 10","Sách giáo khoa Toán lớp 10",32000.0,160,"sgk_toan10.jpg",10},
        {"Ngữ Văn 10","Sách giáo khoa Ngữ Văn lớp 10",35000.0,160,"sgk_van10.jpg",10},
        {"Lịch Sử 10","Sách giáo khoa Lịch Sử lớp 10",28000.0,160,"sgk_ls10.jpg",10},
        {"Vật Lý 10","Sách giáo khoa Vật Lý lớp 10",30000.0,160,"sgk_ly10.jpg",10},
        {"Hóa Học 10","Sách giáo khoa Hóa Học lớp 10",30000.0,160,"sgk_hoa10.jpg",10},
        {"Toán 11","Sách giáo khoa Toán lớp 11",33000.0,160,"sgk_toan11.jpg",11},
        {"Ngữ Văn 11","Sách giáo khoa Ngữ Văn lớp 11",36000.0,160,"sgk_van11.jpg",11},
        {"Lịch Sử 11","Sách giáo khoa Lịch Sử lớp 11",29000.0,160,"sgk_ls11.jpg",11},
        {"Vật Lý 11","Sách giáo khoa Vật Lý lớp 11",31000.0,160,"sgk_ly11.jpg",11},
        {"Hóa Học 11","Sách giáo khoa Hóa Học lớp 11",31000.0,160,"sgk_hoa11.jpg",11},
        {"Toán 12","Sách giáo khoa Toán lớp 12",35000.0,160,"sgk_toan12.jpg",12},
        {"Ngữ Văn 12","Sách giáo khoa Ngữ Văn lớp 12",38000.0,160,"sgk_van12.jpg",12},
        {"Lịch Sử 12","Sách giáo khoa Lịch Sử lớp 12",30000.0,160,"sgk_ls12.jpg",12},
        {"Vật Lý 12","Sách giáo khoa Vật Lý lớp 12",32000.0,160,"sgk_ly12.jpg",12},
        {"Hóa Học 12","Sách giáo khoa Hóa Học lớp 12",32000.0,160,"sgk_hoa12.jpg",12},
    };
}
