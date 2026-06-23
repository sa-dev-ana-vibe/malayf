import { actions } from "../../../store";
import { tagChip } from "../../../ui/styles";
import type { Tag, Visit } from "../../../types";

export function TagsSection({ av, tags }: { av: Visit; tags: Tag[] }) {
  return (
    <div>
      <div className="text-[11px] font-bold tracking-[0.06em] uppercase text-muted mb-[8px]">
        Метки
      </div>
      <div className="flex flex-wrap gap-[7px] bg-card border border-line rounded-[10px] px-[12px] py-[11px]">
        {tags.map((t) => (
          <button
            key={t.id}
            onClick={() => actions.toggleVisitTag(t.id)}
            aria-pressed={av.tagIds.includes(t.id)}
            style={tagChip(t.color, av.tagIds.includes(t.id), false)}
          >
            {t.name}
          </button>
        ))}
        <button
          onClick={() => actions.goTags()}
          className="px-[12px] py-[6px] rounded-[20px] border-[1.5px] border-dashed border-[#cdc8da] bg-card text-accent text-[12px] font-bold cursor-pointer whitespace-nowrap"
        >
          ✎ ред.
        </button>
      </div>
    </div>
  );
}
