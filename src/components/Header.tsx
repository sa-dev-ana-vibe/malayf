import { actions, useApp } from "../store";
import type { Screen } from "../types";
import { newVisitStyle, titleStyle } from "../ui/styles";

const TITLES: Record<Screen, string> = {
  visits: "Apartments",
  compare: "Compare",
  checklist: "Settings",
  tags: "Метки",
  redflags: "Red flags",
  detail: "Apartments",
};

/** Top bar for the tab views (the detail screen renders its own header). */
export default function Header() {
  const s = useApp();
  const isEditor = s.screen === "tags" || s.screen === "redflags";
  const isVisits = s.screen === "visits";
  return (
    <div className="flex items-center justify-between px-[16px] py-[13px] bg-card border-b border-line">
      <div className="flex items-center gap-[9px] min-w-0">
        {isEditor && (
          <button
            onClick={() => actions.backFromTags()}
            aria-label="Назад"
            className="w-[34px] h-[34px] flex-none border-none bg-[#f2f0f7] rounded-[8px] text-[20px] font-bold text-muted-3 cursor-pointer leading-none"
          >
            ‹
          </button>
        )}
        <div className="min-w-0">
          <div className="text-[11px] font-black tracking-[0.14em] text-brand uppercase">
            MALAYF
          </div>
          <div style={titleStyle}>{TITLES[s.screen]}</div>
        </div>
      </div>
      {isVisits && (
        <button onClick={() => actions.newVisit()} style={newVisitStyle}>
          + New appartment
        </button>
      )}
    </div>
  );
}
