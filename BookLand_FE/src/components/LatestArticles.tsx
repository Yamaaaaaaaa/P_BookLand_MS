import '../styles/pages/home.css';

const LatestArticles = () => {
    return (
        <section className="articles">
            <div className="shop-container">
                <div className="section-header">
                    <span className="section-header__subtitle">Read Our Blog</span>
                    <h2 className="section-header__title">Latest Articles</h2>
                </div>

                <div className="articles__grid">
                    {/* {articles.map((article) => (
                        <Link
                            key={article.id}
                            to={`/shop/articles/${article.slug}`}
                            className="article-card"
                        >
                            <img
                                src={article.image}
                                alt={article.title}
                                className="article-card__image"
                            />
                            <div className="article-card__content">
                                <span className="article-card__date">{article.date}</span>
                                <h3 className="article-card__title">{article.title}</h3>
                                <p className="article-card__excerpt">{article.excerpt}</p>
                            </div>
                        </Link>
                    ))} */}
                </div>
            </div>
        </section>
    );
};

export default LatestArticles;
