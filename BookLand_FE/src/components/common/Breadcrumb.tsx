import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
    label: string;
    link?: string;
}

interface BreadcrumbProps {
    items: BreadcrumbItem[];
    className?: string;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className = '' }) => {
    return (
        <nav className={`breadcrumb-nav ${className}`} style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: '14px',
            color: '#666',
            marginBottom: '20px',
            flexWrap: 'wrap'
        }}>
            {items.map((item, index) => {
                const isLast = index === items.length - 1;

                return (
                    <React.Fragment key={index}>
                        {index > 0 && (
                            <ChevronRight size={14} style={{ margin: '0 8px', color: '#999' }} />
                        )}
                        {item.link && !isLast ? (
                            <Link
                                to={item.link}
                                style={{
                                    textDecoration: 'none',
                                    color: '#666',
                                    transition: 'color 0.2s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.color = '#C92127'}
                                onMouseOut={(e) => e.currentTarget.style.color = '#666'}
                            >
                                {item.label}
                            </Link>
                        ) : (
                            <span style={{
                                color: isLast ? '#C92127' : '#666',
                                fontWeight: isLast ? '500' : 'normal'
                            }}>
                                {item.label}
                            </span>
                        )}
                    </React.Fragment>
                );
            })}
        </nav>
    );
};

export default Breadcrumb;
