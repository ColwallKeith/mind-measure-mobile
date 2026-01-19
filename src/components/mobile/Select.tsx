import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  disabled?: boolean;
  placeholder?: string;
}

export function Select({ value, onChange, options, disabled = false, placeholder }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
  };

  return (
    <div ref={selectRef} style={{ position: 'relative', width: '100%' }}>
      {/* Select Button */}
      <button
        type="button"
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
          }
        }}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '10px 12px',
          border: '1px solid #E0E0E0',
          borderRadius: '12px',
          fontSize: '14px',
          color: value ? '#1a1a1a' : '#999999',
          background: disabled ? '#FAFAFA' : 'white',
          textAlign: 'left',
          cursor: disabled ? 'default' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          outline: 'none',
          transition: 'border-color 0.2s',
          pointerEvents: disabled ? 'none' : 'auto'
        }}
      >
        <span>{value || placeholder}</span>
        <ChevronDown 
          size={18} 
          style={{ 
            color: '#999999',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            flexShrink: 0
          }} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: 'white',
            border: '1px solid #E0E0E0',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            maxHeight: '240px',
            overflowY: 'auto',
            zIndex: 1000,
            animation: 'slideDown 0.2s ease-out'
          }}
        >
          {options.map((option, index) => (
            <button
              key={option}
              type="button"
              onClick={() => handleSelect(option)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: 'none',
                background: value === option ? '#F0F0F0' : 'transparent',
                color: '#1a1a1a',
                fontSize: '14px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: index < options.length - 1 ? '1px solid #F5F5F5' : 'none',
                transition: 'background-color 0.15s'
              }}
              onMouseEnter={(e) => {
                if (value !== option) {
                  e.currentTarget.style.background = '#FAFAFA';
                }
              }}
              onMouseLeave={(e) => {
                if (value !== option) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <span>{option}</span>
              {value === option && (
                <Check size={16} style={{ color: '#5B8FED' }} />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Animation keyframes */}
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

