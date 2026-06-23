import { useApp, actions } from "../../store";
import { catScore, weightedScore } from "../../lib/scoring";
import { numPrice, numArea, fmtRu } from "../../lib/format";
import { compareChip, infoCell, cellOf } from "../../ui/styles";
import type { Visit } from "../../types";

export default function CompareScreen() {
  const { visits, categories, compareIds } = useApp();

  const compareNoVisits = visits.length === 0;
  const showSelectHint = visits.length > 0 && compareIds.length === 0;

  const selVisits = compareIds
    .map((id) => visits.find((v) => v.id === id))
    .filter((v): v is Visit => Boolean(v));

  const infoRows = [
    {
      name: "Цена",
      cells: selVisits.map((v) => {
        const p = numPrice(v);
        return infoCell(p != null ? fmtRu(p) : "");
      }),
    },
    {
      name: "Цена за м²",
      cells: selVisits.map((v) => {
        const p = numPrice(v);
        const a = numArea(v);
        return infoCell(p && a ? fmtRu(p / a) : "");
      }),
    },
    {
      name: "Площадь, м²",
      cells: selVisits.map((v) => {
        const a = numArea(v);
        return infoCell(a != null ? String(a).replace(".", ",") : "");
      }),
    },
  ];

  const rows = categories.map((cat) => ({
    name: cat.name,
    cells: selVisits.map((v) => cellOf(catScore(v, cat))),
  }));

  const overallCells = selVisits.map((v) => {
    const ws = weightedScore(categories, v);
    const cell = cellOf({ answered: ws != null ? 1 : 0, pct: ws ?? 0 });
    return {
      label: cell.label,
      style: {
        ...cell.style,
        background: ws != null ? cell.style.background : "#f5f1fd",
        borderTop: "1px solid #e6e3ee",
        fontWeight: 800,
      },
    };
  });

  return (
    <div className="p-[14px] flex flex-col gap-[14px]">
      {compareNoVisits && (
        <div className="px-[32px] py-[50px] text-center text-[#8a8794] text-[13px] leading-[1.5]">
          Add a couple of apartment visits first, then come back here to compare their scores side by side.
        </div>
      )}
      {visits.length > 0 && (
        <div>
          <div className="text-[11px] font-bold tracking-[0.06em] uppercase text-muted mb-[9px]">
            Pick apartments
          </div>
          <div className="flex flex-wrap gap-[8px]">
            {visits.map((v) => (
              <button
                key={v.id}
                onClick={() => actions.toggleCompare(v.id)}
                style={compareChip(compareIds.includes(v.id))}
              >
                {v.name || "Untitled"}
              </button>
            ))}
          </div>
        </div>
      )}
      {showSelectHint && (
        <div className="px-[20px] py-[30px] text-center text-[#b0aabf] text-[13px]">
          Select one or more to build the comparison table.
        </div>
      )}
      {selVisits.length > 0 && (
        <>
          <div className="overflow-x-auto border border-line rounded-[11px] bg-card">
            <table className="border-collapse w-full">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-[#faf9fc] text-left px-[12px] py-[9px] text-[11px] font-bold text-muted tracking-[0.04em] border-b border-line z-[2] min-w-[128px]">
                    CATEGORY
                  </th>
                  {selVisits.map((v) => (
                    <th
                      key={v.id}
                      className="p-0 border-b border-line border-l border-[#f1eff5] max-w-[96px]"
                    >
                      <button
                        onClick={() => actions.openVisit(v.id)}
                        className="flex items-center justify-center gap-[3px] w-full border-none bg-transparent px-[8px] py-[9px] text-[11px] font-bold text-accent-dark cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis"
                      >
                        <span className="min-w-0 overflow-hidden text-ellipsis">
                          {v.name || v.address || "Untitled"}
                        </span>
                        <span className="flex-none text-[11px]">↗</span>
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {infoRows.map((row) => (
                  <tr key={row.name}>
                    <td className="sticky left-0 bg-[#faf9fc] px-[12px] py-[9px] text-[12px] font-bold text-muted-3 border-b border-[#eeecf3] z-[1]">
                      {row.name}
                    </td>
                    {row.cells.map((cell, ci) => (
                      <td key={ci} style={cell.style}>
                        {cell.label}
                      </td>
                    ))}
                  </tr>
                ))}
                {rows.map((row, ri) => (
                  <tr key={ri}>
                    <td className="sticky left-0 bg-card px-[12px] py-[9px] text-[12px] font-semibold text-ink-soft border-b border-[#f1eff5] z-[1]">
                      {row.name}
                    </td>
                    {row.cells.map((cell, ci) => (
                      <td key={ci} style={cell.style}>
                        {cell.label}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td className="sticky left-0 bg-[#f5f1fd] px-[12px] py-[11px] text-[12px] font-extrabold text-accent-dark border-t border-line z-[1]">
                    OVERALL
                  </td>
                  {overallCells.map((cell, ci) => (
                    <td key={ci} style={cell.style}>
                      {cell.label}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <div className="text-[11px] text-[#b0aabf] leading-[1.5]">
            Нажмите на название квартиры ↗, чтобы открыть карточку. Балл категории — средний по ответам, без N/A.
          </div>
        </>
      )}
    </div>
  );
}
