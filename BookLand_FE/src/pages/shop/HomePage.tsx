
import HeroSection from '../../components/HeroSection';
import FlashSale from '../../components/FlashSale';
import TrendingSection from '../../components/TrendingSection';
import FeaturedBookcases from '../../components/FeaturedBookcases';
import WeeklyBestseller from '../../components/WeeklyBestseller';
import Recommendations from '../../components/Recommendations';
import Newsletter from '../../components/Newsletter';
import '../../styles/pages/home.css';
import '../../styles/components/book-card.css';

const HomePage = () => {
    return (
        <div>
            <HeroSection />
            <div id="super-sale-section">
                <FlashSale />
            </div>
            <div id="trending-section">
                <TrendingSection />
            </div>
            <div id="featured-section">
                <FeaturedBookcases />
            </div>
            <div id="bestseller-section">
                <WeeklyBestseller />
            </div>
            <div id="recommendation-section">
                <Recommendations />
            </div>
            <Newsletter />
        </div>
    );
};

export default HomePage;
