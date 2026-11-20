import React from 'react';
import './Pagination.css';

export default function Pagination({
  page = 1,
  totalPages = 1,
  total = 0,
  limit = 10,
  onPageChange,
  onLimitChange,
  itemName = 'records',
  pageSizeOptions = [5, 10],
}) {
  if (total <= 0) return null;

  const startRecord = Math.min((page - 1) * limit + 1, total);
  const endRecord = Math.min(page * limit, total);

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        Math.abs(i - page) <= 1
      ) {
        pages.push(i);
      }
    }

    const result = [];
    pages.forEach((p, idx) => {
      if (idx > 0 && p - pages[idx - 1] > 1) {
        result.push(`ellipsis-${p}`);
      }
      result.push(p);
    });

    return result;
  };

  return (
    <div className="pagination-container">
      <div className="pagination-info">
        <span className="pagination-text-summary">
          Showing <span className="pagination-highlight">{startRecord}</span> to{' '}
          <span className="pagination-highlight">{endRecord}</span> of{' '}
          <span className="pagination-highlight">{total}</span> {itemName}
        </span>

        {onLimitChange && (
          <>
            <span className="pagination-divider">|</span>
            <div className="pagination-limit-wrap">
              <span>Per page:</span>
              <select
                value={limit}
                onChange={(e) => onLimitChange(Number(e.target.value))}
                className="pagination-limit-select"
              >
                {pageSizeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      <div className="pagination-controls">
        <button
          type="button"
          className="pagination-btn pagination-nav-btn"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous Page"
        >
          ‹ <span className="pagination-nav-label">Previous</span>
        </button>

        {getPageNumbers().map((item) => {
          if (typeof item === 'string' && item.startsWith('ellipsis')) {
            return (
              <span key={item} className="pagination-ellipsis">
                …
              </span>
            );
          }
          const isCurrent = item === page;
          return (
            <button
              key={item}
              type="button"
              className={`pagination-btn ${isCurrent ? 'active' : ''}`}
              onClick={() => onPageChange(item)}
            >
              {item}
            </button>
          );
        })}

        <button
          type="button"
          className="pagination-btn pagination-nav-btn"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next Page"
        >
          <span className="pagination-nav-label">Next</span> ›
        </button>
      </div>
    </div>
  );
}

