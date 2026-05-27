// Mock data for new header design

export interface Category {
  id: string;
  name: string;
  icon?: string;
  subcategories?: Subcategory[];
}

export interface Subcategory {
  id: string;
  name: string;
  items?: string[];
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  timestamp: Date;
}

export interface UserMenuItem {
  id: string;
  label: string;
  icon: string;
  href: string;
}

// Categories for mega menu
export const categories: Category[] = [
  {
    id: 'sach-trong-nuoc',
    name: 'Sách Trong Nước',
  },
  {
    id: 'foreign-books',
    name: 'FOREIGN BOOKS',
  },
  {
    id: 'vpp',
    name: 'VPP - Dụng Cụ Học Sinh',
  },
  {
    id: 'do-choi',
    name: 'Đồ Chơi',
  },
  {
    id: 'lam-dep',
    name: 'Làm Đẹp - Sức Khỏe',
  },
  {
    id: 'sach-giao-khoa',
    name: 'Sách Giáo Khoa 2025',
  },
  {
    id: 'vpp-dchs',
    name: 'VPP - DCHS Theo Thương Hiệu',
  },
  {
    id: 'do-choi-thuong-hieu',
    name: 'Đồ Chơi Theo Thương Hiệu',
  },
  {
    id: 'bach-hoa',
    name: 'Bách Hóa Online - Lưu Niệm',
  }
];

// Mega menu content - displayed when category menu is open
export interface MegaMenuSection {
  title: string;
  items: string[];
  highlight?: boolean;
}

export const megaMenuContent: Record<string, MegaMenuSection[]> = {
  'sach-trong-nuoc': [
    {
      title: 'VĂN HỌC',
      items: ['Tiểu Thuyết', 'Truyện Ngắn - Tản Văn', 'Light Novel', 'Ngôn Tình', 'Xem tất cả']
    },
    {
      title: 'KINH TẾ',
      items: ['Nhân Vật - Bài Học Kinh Doanh', 'Quản Trị - Lãnh Đạo', 'Marketing - Bán Hàng', 'Phân Tích Kinh Tế', 'Xem tất cả']
    },
    {
      title: 'TÂM LÝ - KỸ NĂNG SỐNG',
      items: ['Kỹ Năng Sống', 'Rèn Luyện Nhân Cách', 'Tâm Lý', 'Sách Cho Tuổi Mới Lớn', 'Xem tất cả']
    },
    {
      title: 'NUÔI DẠY CON',
      items: ['Cẩm Nang Làm Cha Mẹ', 'Phương Pháp Giáo Dục Trẻ ...', 'Phát Triển Trí Tuệ Cho Trẻ', 'Phát Triển Kỹ Năng Cho Trẻ', 'Xem tất cả']
    },
    {
      title: 'SÁCH THIẾU NHI',
      items: ['Manga - Comic', 'Kiến Thức Bách Khoa', 'Sách Tranh Kỹ Năng Sống C...', 'Vừa Học - Vừa Học Vừa Cho...', 'Xem tất cả']
    },
    {
      title: 'TIỂU SỬ - HỒI KÝ',
      items: ['Các Chuyện Cuộc Đời', 'Chính Trị', 'Kinh Tế', 'Nghệ Thuật - Giải Trí', 'Xem tất cả']
    },
    {
      title: 'GIÁO KHOA - THAM KHẢO',
      items: ['Sách Giáo Khoa', 'Sách Tham Khảo', 'Luyện Thi THPT Quốc Gia', 'Mẫu Giáo', 'Xem tất cả']
    },
    {
      title: 'SÁCH HỌC NGOẠI NGỮ',
      items: ['Tiếng Anh', 'Tiếng Nhật', 'Tiếng Hoa', 'Tiếng Hàn', 'Xem tất cả']
    }
  ]
};

// Notifications
export const notifications: Notification[] = [
  {
    id: '1',
    title: 'Cập nhật email ngay',
    message: 'Bạn vừa đăng kí tài khoản tại Fahasa.c Hãy cập nhật email ngay để nhận được các thông báo...',
    read: false,
    timestamp: new Date()
  },
  {
    id: '2',
    title: 'Đơn hàng đã được xác nhận',
    message: 'Đơn hàng #12345 của bạn đã được xác nhận và đang được xử lý',
    read: true,
    timestamp: new Date(Date.now() - 86400000)
  }
];

// User menu items (when logged in)
export const userMenuItems: UserMenuItem[] = [
  // {
  //   id: 'orders',
  //   label: 'Đơn hàng của tôi',
  //   icon: '📋',
  //   href: '/shop/orders'
  // },
  {
    id: 'profile',
    label: 'Tài khoản của tôi',
    icon: '👤',
    href: '/shop/profile'
  },
  {
    id: 'my-orders',
    label: 'Đơn hàng của tôi',
    icon: '📋',
    href: '/shop/my-orders'
  },
  {
    id: 'my-reviews',
    label: 'Đánh giá của tôi',
    icon: '⭐',
    href: '/shop/my-reviews'
  },
  {
    id: 'wishlist',
    label: 'Sản phẩm yêu thích',
    icon: '❤️',
    href: '/shop/wishlist'
  },
  // {
  //   id: 'voucher',
  //   label: 'Wallet Voucher',
  //   icon: '🎁',
  //   href: '/shop/vouchers'
  // },
  // {
  //   id: 'fpoint',
  //   label: 'Tài khoản F-point',
  //   icon: 'F',
  //   href: '/shop/fpoint'
  // },
  {
    id: 'logout',
    label: 'Thoát tài khoản',
    icon: '🚪',
    href: '/logout'
  }
];

// User info (mock)
export const mockUser = {
  name: 'Sơn Trần Xuân',
  role: 'Thành viên Fahasa',
  avatar: null
};
