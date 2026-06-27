import { useApp, actions } from "../../store";
import { scoreVisit, weightedScore, colorFor } from "../../lib/scoring";
import {
  fmtDate,
  numPrice,
  numArea,
  numPpm,
  cmpNullsLast,
  latestDate,
  priceMillions,
  areaSquareMeters,
} from "../../lib/format";
import { tagChip, newVisitStyle } from "../../ui/styles";
import type { Visit, Tag, Category, SortBy } from "../../types";

export default function ApartmentsScreen() {
  const { visits, categories, tags, tagFilter, sortBy } = useApp();

  // Empty state ────────────────────────────────────────────────────────────
  if (visits.length === 0) {
    return (
      <div className="py-[60px] px-[32px] text-center flex flex-col items-center gap-[14px]">
        <div className="w-[56px] h-[56px] rounded-[14px] bg-[#efe9fb] flex items-center justify-center text-[26px] text-accent">
          ⌂
        </div>
        <div className="text-[16px] font-bold">No apartments yet</div>
        <div className="text-[13px] text-muted-2 leading-[1.5] max-w-[230px]">
          Add an appartment to run through your checklist room by room.
        </div>
        <button onClick={() => actions.newVisit()} style={newVisitStyle}>
          + Add first appartment
        </button>
      </div>
    );
  }

  // Derived data (port of the prototype's visits-list logic) ─────────────────
  const tagById: Record<string, Tag> = {};
  tags.forEach((t) => {
    tagById[t.id] = t;
  });

  const filterIds = tagFilter;
  const visibleVisits = visits.filter(
    (v) => filterIds.length === 0 || filterIds.some((id) => v.tagIds.includes(id)),
  );

  const sortedVisits = visibleVisits.slice();
  if (sortBy === "rating")
    sortedVisits.sort((x, y) =>
      cmpNullsLast(weightedScore(categories, x), weightedScore(categories, y), "desc"),
    );
  else if (sortBy === "price")
    sortedVisits.sort((x, y) => cmpNullsLast(numPrice(x), numPrice(y), "asc"));
  else if (sortBy === "ppm")
    sortedVisits.sort((x, y) => cmpNullsLast(numPpm(x), numPpm(y), "asc"));
  else if (sortBy === "area")
    sortedVisits.sort((x, y) => cmpNullsLast(numArea(x), numArea(y), "desc"));
  else if (sortBy === "date")
    sortedVisits.sort((x, y) => {
      const a = latestDate(x);
      const b = latestDate(y);
      if (!a && !b) return 0;
      if (!a) return 1;
      if (!b) return -1;
      return a < b ? 1 : a > b ? -1 : 0;
    });

  const showTagFilter = tags.length > 0;
  const noFilterMatch = filterIds.length > 0 && visibleVisits.length === 0;

  return (
    <>
      {showTagFilter && (
        <div className="flex items-center gap-[8px] px-[14px] pt-[11px]">
          <div className="flex-1 min-w-0 flex gap-[7px] overflow-x-auto pb-[2px]">
            {tags.map((t) => (
              <button
                key={t.id}
                onClick={() => actions.toggleFilter(t.id)}
                aria-pressed={tagFilter.includes(t.id)}
                style={{ ...tagChip(t.color, tagFilter.includes(t.id), false), flexShrink: 0 }}
              >
                {t.name}
              </button>
            ))}
          </div>
          <button
            onClick={() => actions.goTags()}
            aria-label="Редактировать метки"
            className="flex-none w-[32px] h-[32px] border border-line bg-card rounded-[8px] text-accent text-[14px] cursor-pointer"
          >
            ✎
          </button>
        </div>
      )}

      <div className="flex items-center gap-[8px] px-[14px] pt-[11px]">
        <span className="flex-none text-[11px] font-bold tracking-[0.06em] uppercase text-muted">
          Сорт.
        </span>
        <select
          value={sortBy}
          onChange={(e) => actions.setSortBy(e.target.value as SortBy)}
          aria-label="Сортировка квартир"
          className="flex-1 min-w-0 border border-line bg-card rounded-[8px] px-[10px] py-[8px] text-[13px] font-semibold text-ink-soft static"
        >
          <option value="default">По умолчанию</option>
          <option value="rating">Рейтинг (выше → ниже)</option>
          <option value="price">Цена (дешевле → дороже)</option>
          <option value="ppm">Цена за м² (меньше → больше)</option>
          <option value="area">Площадь (больше → меньше)</option>
          <option value="date">Последний визит (новее)</option>
        </select>
      </div>

      <div className="p-[14px] flex flex-col gap-[10px]">
        {sortedVisits.map((v) => (
          <VisitCard key={v.id} v={v} tagById={tagById} categories={categories} />
        ))}
        {noFilterMatch && (
          <div className="py-[24px] px-[12px] text-center text-faint text-[13px]">
            Нет квартир с выбранными метками.
          </div>
        )}
      </div>
    </>
  );
}

function VisitCard({
  v,
  tagById,
  categories,
}: {
  v: Visit;
  tagById: Record<string, Tag>;
  categories: Category[];
}) {
  const sc = scoreVisit(categories, v);
  const ws = weightedScore(categories, v);
  const vtags = v.tagIds.map((id) => tagById[id]).filter(Boolean);
  const pw = sc.total ? (sc.pass / sc.total) * 100 : 0;
  const fw = sc.total ? (sc.fail / sc.total) * 100 : 0;
  const nw = sc.total ? (sc.na / sc.total) * 100 : 0;
  const priceM = priceMillions(v.price);
  const area = areaSquareMeters(v.areaTotal);
  const date = latestDate(v);
  const metaLabel =
    (date ? fmtDate(date) : "No date") + " · " + sc.answered + "/" + sc.total + " rated";

  return (
    <button
      onClick={() => actions.openVisit(v.id)}
      className="flex gap-[12px] items-stretch w-full text-left bg-card border border-line rounded-[11px] px-[14px] py-[13px] cursor-pointer"
    >
      <div className="flex-1 min-w-0 flex flex-col gap-[7px]">
        <div className="text-[15px] font-bold text-ink whitespace-nowrap overflow-hidden text-ellipsis">
          {v.name || v.address || "Untitled apartment"}
        </div>
        <div className="text-[12px] text-muted-2 whitespace-nowrap overflow-hidden text-ellipsis">
          {v.address || "No address yet"}
        </div>
        <div className="flex h-[6px] rounded-[4px] overflow-hidden bg-[#efedf3] mt-[1px]">
          <div style={{ width: pw + "%", height: "100%", background: "#1f9d63" }} />
          <div style={{ width: fw + "%", height: "100%", background: "#d6453f" }} />
          <div style={{ width: nw + "%", height: "100%", background: "#c9c5d3" }} />
        </div>
        <div className="text-[11px] text-muted">{metaLabel}</div>
        {vtags.length > 0 && (
          <div className="flex flex-wrap gap-[5px] mt-[1px]">
            {vtags.map((t) => (
              <span key={t.id} style={tagChip(t.color, false, true)}>
                {t.name}
              </span>
            ))}
          </div>
        )}
        {v.redFlags.length > 0 && (
          <div className="inline-flex items-center gap-[4px] self-start bg-[#fbeceb] text-fail border border-[rgba(214,69,63,0.35)] rounded-[20px] px-[9px] py-[2px] text-[10.5px] font-bold mt-[1px]">
            ⚑ {v.redFlags.length} red flags
          </div>
        )}
      </div>
      <div className="flex flex-col items-end justify-center min-w-[52px]">
        {(priceM || area) && (
          <div className="flex flex-col items-end gap-[2px] mb-[6px] whitespace-nowrap">
            {priceM && <div className="text-[14px] font-extrabold text-accent-dark">{priceM}</div>}
            {area && <div className="text-[11px] font-bold text-muted-2">{area}</div>}
          </div>
        )}
        <div
          style={{
            color: colorFor(ws),
            fontSize: "22px",
            fontWeight: 800,
            lineHeight: "1",
          }}
        >
          {ws != null ? ws + "%" : "–"}
        </div>
        <div className="text-[9px] text-faint font-bold tracking-[0.06em] mt-[2px]">
          SCORE
        </div>
      </div>
    </button>
  );
}
