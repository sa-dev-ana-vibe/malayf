import { actions } from "../../../store";
import { normalizeUrl, prettyHost } from "../../../lib/format";
import type { Visit } from "../../../types";

export function LinksSection({
  av,
  editLinkId,
}: {
  av: Visit;
  editLinkId: string | null;
}) {
  return (
    <div>
      <div className="text-[11px] font-bold tracking-[0.06em] uppercase text-muted mb-[8px]">
        Listing links
      </div>
      <div className="flex flex-col gap-[8px]">
        {av.links.map((l) => {
          const editing = editLinkId === l.id || !l.url;
          const href = normalizeUrl(l.url);
          const displayLabel = l.label || prettyHost(l.url) || l.url;
          return (
            <div
              key={l.id}
              className="flex items-center gap-[8px] bg-card border border-line rounded-[10px] pl-[12px] pr-[10px] py-[9px]"
            >
              {editing ? (
                <>
                  <input
                    value={l.url}
                    onChange={(e) => actions.updateLink(l.id, "url", e.target.value)}
                    placeholder="https://… (Avito, Cian, Idealista)"
                    aria-label="Listing URL"
                    className="flex-1 min-w-0 border-none bg-transparent text-[13px] font-semibold text-accent w-full"
                  />
                  {l.url ? (
                    <button
                      onClick={() => actions.setEditLinkId(null)}
                      aria-label="Готово"
                      className="flex-none w-[30px] h-[30px] flex items-center justify-center rounded-[7px] bg-accent-soft text-accent border-none text-[15px] cursor-pointer"
                    >
                      ✓
                    </button>
                  ) : null}
                </>
              ) : (
                <>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-0 flex items-center gap-[7px] no-underline"
                  >
                    <span className="flex-none w-[24px] h-[24px] flex items-center justify-center rounded-[6px] bg-accent-soft text-accent text-[12px]">
                      ↗
                    </span>
                    <span className="min-w-0 text-[13px] font-bold text-accent-dark whitespace-nowrap overflow-hidden text-ellipsis">
                      {displayLabel}
                    </span>
                  </a>
                  <button
                    onClick={() => actions.setEditLinkId(l.id)}
                    aria-label="Редактировать ссылку"
                    className="flex-none w-[28px] h-[28px] flex items-center justify-center rounded-[7px] bg-transparent text-faint border-none text-[13px] cursor-pointer"
                  >
                    ✎
                  </button>
                </>
              )}
              <button
                onClick={() => actions.removeLink(l.id)}
                aria-label="Удалить ссылку"
                className="flex-none w-[26px] h-[26px] border-none bg-transparent text-[#cbc6d6] text-[15px] cursor-pointer rounded-[6px]"
              >
                ×
              </button>
            </div>
          );
        })}
        <button
          onClick={() => actions.addLink()}
          className="w-full text-left px-[14px] py-[11px] border-[1.5px] border-dashed border-[#cdc8da] bg-soft rounded-[10px] text-accent text-[12.5px] font-bold cursor-pointer"
        >
          + Add listing link
        </button>
      </div>
    </div>
  );
}
