/**
 * Advanced pagination: first, back 5, prev, page numbers, next, fwd 5, last.
 */
export default function Pagination({
  page,
  limit,
  total,
  onPageChange,
  onLimitChange,
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const pageNumbers = [];
  const windowStart = Math.max(1, page - 2);
  const windowEnd = Math.min(totalPages, page + 2);
  for (let p = windowStart; p <= windowEnd; p++) pageNumbers.push(p);

  return (
    <div className="pagination">
      <span>
        Showing {start}-{end} of {total} results
      </span>
      <div className="pagination-controls">
        <select value={limit} onChange={(e) => onLimitChange(Number(e.target.value))}>
          {[10, 20, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n} / page
            </option>
          ))}
        </select>
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(1)} title="First">
          |&lt;
        </button>
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 5))}
          title="Back 5"
        >
          &lt;5
        </button>
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          title="Previous"
        >
          &lt;
        </button>
        {pageNumbers.map((p) => (
          <button
            key={p}
            type="button"
            className={p === page ? 'active' : ''}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          title="Next"
        >
          &gt;
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 5))}
          title="Forward 5"
        >
          5&gt;
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(totalPages)}
          title="Last"
        >
          &gt;|
        </button>
      </div>
    </div>
  );
}
