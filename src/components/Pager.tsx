import { Meta } from "@/lib/client";

export default function Pager({ meta, onPage }: { meta: Meta; onPage: (p: number) => void }) {
  return (
    <div className="pager">
      <button className="secondary" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>Previous</button>
      <span className="muted">Page {meta.page} of {meta.totalPages} ({meta.total} total)</span>
      <button className="secondary" disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)}>Next</button>
    </div>
  );
}
