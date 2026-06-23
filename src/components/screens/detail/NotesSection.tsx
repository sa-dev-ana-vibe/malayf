import { actions } from "../../../store";
import type { Visit } from "../../../types";

export function NotesSection({ av }: { av: Visit }) {
  return (
    <div>
      <div className="text-[11px] font-bold tracking-[0.06em] uppercase text-muted mb-[8px]">
        Overall notes
      </div>
      <textarea
        value={av.notes}
        onChange={(e) => actions.updateActive("notes", e.target.value)}
        placeholder="Gut feeling, smell, neighbours, anything off…"
        rows={4}
        aria-label="Overall notes"
        className="w-full bg-card border border-line rounded-[10px] px-[14px] py-[12px] text-[14px] leading-[1.4]"
      />
    </div>
  );
}
