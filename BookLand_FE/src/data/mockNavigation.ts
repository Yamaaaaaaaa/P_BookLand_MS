export interface NavLink {
  label: string;
  href: string;
}

export const mainNavLinks: NavLink[] = [
  { label: 'header.home', href: '/shop/home' },
  // { label: 'Pages', href: '/shop/pages' },
  { label: 'header.shop', href: '/shop/books' },
  { label: 'header.articles', href: '/shop/articles' },
  { label: 'footer.company.about_us', href: '/shop/about' },
  // { label: 'Contact', href: '/shop/contact' }
];

export const footerLinks = {
  shop: [
    { label: 'footer.shop.home', href: '/shop/home' },
    { label: 'footer.shop.books', href: '/shop/books' },
    { label: 'footer.shop.articles', href: '/shop/articles' },
    { label: 'footer.shop.about', href: '/shop/about' }
  ],
  help: [
    { label: 'footer.help.contact_us', href: '/shop/contact' },
    { label: 'footer.help.faqs', href: '/shop/faqs' },
    { label: 'footer.help.terms', href: '/shop/terms' },
    { label: 'footer.help.privacy', href: '/shop/privacy' }
  ],
  account: [
    { label: 'footer.account.login', href: '/auth/login' },
    { label: 'footer.account.profile', href: '/shop/profile' },
    { label: 'footer.account.orders', href: '/shop/my-orders' },
    { label: 'footer.account.wishlist', href: '/shop/wishlist' }
  ]
};
