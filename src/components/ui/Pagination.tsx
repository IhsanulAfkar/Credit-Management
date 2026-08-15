import Link from "next/link";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
}

export function Pagination({ currentPage, totalPages, basePath }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      Math.abs(i - currentPage) <= 1
    ) {
      pages.push(i);
    }
  }

  const href = (page: number) =>
    page === 1 ? basePath : `${basePath}?page=${page}`;

  return (
    <nav className="flex items-center justify-center gap-1 px-5 py-4">
      {currentPage > 1 ? (
        <Link
          href={href(currentPage - 1)}
          className="rounded-md px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
        >
          Sebelumnya
        </Link>
      ) : (
        <span className="rounded-md px-2.5 py-1.5 text-sm text-slate-300">
          Sebelumnya
        </span>
      )}

      {pages.map((p, idx) => {
        // Add ellipsis between non-consecutive pages
        const prev = pages[idx - 1];
        const showEllipsis = prev !== undefined && p - prev > 1;
        return (
          <span key={p} className="flex items-center gap-1">
            {showEllipsis && <span className="px-1 text-sm text-slate-400">…</span>}
            {p === currentPage ? (
              <span className="rounded-md bg-indigo-600 px-2.5 py-1.5 text-sm font-medium text-white">
                {p}
              </span>
            ) : (
              <Link
                href={href(p)}
                className="rounded-md px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
              >
                {p}
              </Link>
            )}
          </span>
        );
      })}

      {currentPage < totalPages ? (
        <Link
          href={href(currentPage + 1)}
          className="rounded-md px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
        >
          Berikutnya
        </Link>
      ) : (
        <span className="rounded-md px-2.5 py-1.5 text-sm text-slate-300">
          Berikutnya
        </span>
      )}
    </nav>
  );
}