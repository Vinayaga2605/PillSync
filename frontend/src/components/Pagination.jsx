const Pagination = ({ page, pages, onPage }) => {
  if (pages <= 1) return null;

  const prev = Math.max(page - 1, 1);
  const next = Math.min(page + 1, pages);

  return (
    <div className="pagination">
      <button
        className="action-btn action-btn--ghost"
        disabled={page <= 1}
        onClick={() => onPage(prev)}
      >
        ‹ Prev
      </button>
      <span className="pagination__info">
        Page {page} of {pages}
      </span>
      <button
        className="action-btn action-btn--ghost"
        disabled={page >= pages}
        onClick={() => onPage(next)}
      >
        Next ›
      </button>
    </div>
  );
};

export default Pagination;