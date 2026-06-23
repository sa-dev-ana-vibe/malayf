import { actions, useApp } from "../store";
import { tabStyle } from "../ui/styles";

/** The 3-tab bottom navigation. Counts mirror the prototype: apartments,
 *  selected-for-compare, and total checklist items. */
export default function BottomNav() {
  const s = useApp();
  const itemCount = s.categories.reduce((n, c) => n + c.items.length, 0);
  return (
    <div className="flex bg-card border-t border-line">
      <button
        onClick={() => actions.go("visits")}
        style={tabStyle(s.screen === "visits")}
      >
        <span className="text-[15px] font-extrabold leading-none">
          {s.visits.length}
        </span>
        <span>Appartments</span>
      </button>
      <button
        onClick={() => actions.go("compare")}
        style={tabStyle(s.screen === "compare")}
      >
        <span className="text-[15px] font-extrabold leading-none">
          {s.compareIds.length}
        </span>
        <span>Compare</span>
      </button>
      <button
        onClick={() => actions.go("checklist")}
        style={tabStyle(s.screen === "checklist")}
      >
        <span className="text-[15px] font-extrabold leading-none">{itemCount}</span>
        <span>Settings</span>
      </button>
    </div>
  );
}
