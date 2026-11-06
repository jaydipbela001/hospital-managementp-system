import React, { useState, useRef, useEffect } from 'react';
import './CustomSelect.css';

export function CustomSelect({
  label,
  value,
  onChange,
  options = [], // [{ value, label, subtext, badge }]
  placeholder = 'Select an option',
  searchable = true,
  disabled = false,
  required = false,
  error = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen, searchable]);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = options.filter((opt) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const matchLabel = opt.label?.toLowerCase().includes(term);
    const matchSubtext = opt.subtext?.toLowerCase().includes(term);
    return matchLabel || matchSubtext;
  });

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className={`custom-select-group ${error ? 'has-error' : ''}`} ref={wrapperRef}>
      {label && (
        <label className="custom-select-label">
          {label} {required && <span className="required-star">*</span>}
        </label>
      )}

      <button
        type="button"
        className={`custom-select-trigger ${isOpen ? 'is-open' : ''} ${!selectedOption ? 'is-placeholder' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="custom-select-selected-content">
          {selectedOption ? (
            <span className="selected-item-text">
              <span className="item-main-title">{selectedOption.label}</span>
              {selectedOption.subtext && (
                <span className="item-sub-tag">{selectedOption.subtext}</span>
              )}
            </span>
          ) : (
            <span className="placeholder-text">{placeholder}</span>
          )}
        </span>
        <svg
          className={`custom-select-arrow ${isOpen ? 'rotated' : ''}`}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="custom-select-menu">
          {searchable && (
            <div className="custom-select-search-box">
              <svg
                className="search-icon"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="custom-select-search-input"
              />
              {searchTerm && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setSearchTerm('')}
                >
                  &times;
                </button>
              )}
            </div>
          )}

          <div className="custom-select-options-list" role="listbox">
            {filteredOptions.length === 0 ? (
              <div className="custom-select-no-options">No matches found</div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <div
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    className={`custom-select-option ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => handleSelect(opt.value)}
                  >
                    <div className="option-info">
                      <div className="option-title">{opt.label}</div>
                      {opt.subtext && <div className="option-subtext">{opt.subtext}</div>}
                    </div>
                    {isSelected && (
                      <svg
                        className="check-icon"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {error && <p className="custom-select-error">{error}</p>}
    </div>
  );
}

export default CustomSelect;

