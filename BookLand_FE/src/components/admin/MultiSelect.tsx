import React, { useState, useRef, useEffect } from 'react';
import { Check } from 'lucide-react';
import '../../styles/components/forms.css';

interface Option {
    value: string | number;
    label: string;
}

interface MultiSelectProps {
    options: Option[];
    value: (string | number)[];
    onChange: (value: (string | number)[]) => void;
    placeholder?: string;
    label?: string;
}

const MultiSelect: React.FC<MultiSelectProps> = ({
    options,
    value,
    onChange,
    placeholder = 'Select...',
    label
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const toggleOption = (optionValue: string | number) => {
        const newValue = value.includes(optionValue)
            ? value.filter(v => v !== optionValue)
            : [...value, optionValue];
        onChange(newValue);
    };

    const handleSelectAll = () => {
        if (value.length === options.length) {
            onChange([]);
        } else {
            onChange(options.map(o => o.value));
        }
    };

    return (
        <div className="form-group" ref={containerRef} style={{ marginBottom: 0, position: 'relative', minWidth: '200px' }}>
            {label && <label className="form-label">{label}</label>}
            <div
                className="form-select"
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingRight: '0.5rem',
                    height: '42px', // Match standard input height
                    backgroundColor: 'var(--shop-bg-primary)'
                }}
            >
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '0.5rem' }}>
                    {value.length > 0
                        ? `${value.length} selected`
                        : <span style={{ color: 'var(--shop-text-muted)' }}>{placeholder}</span>
                    }
                </div>

            </div>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 100,
                    backgroundColor: 'var(--shop-bg-card)',
                    border: '1px solid var(--shop-border)',
                    borderRadius: 'var(--radius-md)',
                    marginTop: '4px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    maxHeight: '250px',
                    overflowY: 'auto'
                }}>
                    <div
                        onClick={handleSelectAll}
                        style={{
                            padding: '0.5rem 1rem',
                            borderBottom: '1px solid var(--shop-border)',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            color: 'var(--shop-accent-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        {value.length === options.length ? 'Clear All' : 'Select All'}
                    </div>
                    {options.map(option => (
                        <div
                            key={option.value}
                            onClick={() => toggleOption(option.value)}
                            style={{
                                padding: '0.5rem 1rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                transition: 'background-color 0.1s',
                                backgroundColor: value.includes(option.value) ? 'var(--shop-bg-secondary)' : 'transparent'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--shop-bg-secondary)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = value.includes(option.value) ? 'var(--shop-bg-secondary)' : 'transparent'}
                        >
                            <div style={{
                                width: '16px',
                                height: '16px',
                                border: `1px solid ${value.includes(option.value) ? 'var(--shop-accent-primary)' : 'var(--shop-text-muted)'}`,
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: value.includes(option.value) ? 'var(--shop-accent-primary)' : 'transparent',
                                flexShrink: 0
                            }}>
                                {value.includes(option.value) && <Check size={12} color="white" />}
                            </div>
                            <span style={{ fontSize: '0.9rem', color: 'var(--shop-text-primary)' }}>{option.label}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MultiSelect;
