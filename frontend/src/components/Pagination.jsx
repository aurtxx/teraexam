import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Pagination({ count, currentPage, pageSize = 10, onPageChange }) {
  const totalPages = Math.ceil(count / pageSize) || 1;

  if (totalPages <= 1) return null;

  const startItem = count === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, count);

  return (
    <div className="pagination-container">
      <div className="pagination-info">
        Showing <span className="font-semibold">{startItem}</span> to{' '}
        <span className="font-semibold">{endItem}</span> of{' '}
        <span className="font-semibold">{count}</span> results
      </div>
      <div className="pagination-controls">
        <button
          className="btn-pagination"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Previous Page"
        >
          <ChevronLeft size={16} />
          <span>Prev</span>
        </button>
        <span className="pagination-page-indicator">
          Page {currentPage} of {totalPages}
        </span>
        <button
          className="btn-pagination"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Next Page"
        >
          <span>Next</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
