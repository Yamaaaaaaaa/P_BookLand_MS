import { Search } from 'lucide-react';
import '../styles/pages/books.css';

interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

const SearchBar = ({ value, onChange, placeholder = 'Search books...' }: SearchBarProps) => {
    return (
        <div className="search-bar">
            <Search size={20} className="search-bar__icon" />
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="search-bar__input"
            />
        </div>
    );
};

export default SearchBar;
