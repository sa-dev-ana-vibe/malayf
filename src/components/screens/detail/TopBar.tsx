import { actions } from "../../../store";
import type { Visit } from "../../../types";

export function TopBar({ av }: { av: Visit }) {
  return (
    <div className="flex items-center gap-[6px] px-[10px] py-[11px] bg-card border-b border-line">
      <button
        onClick={() => actions.back()}
        aria-label="Назад"
        className="w-[34px] h-[34px] flex-none border-none bg-[#f2f0f7] rounded-[8px] text-[20px] font-bold text-muted-3 cursor-pointer leading-none"
      >
        ‹
      </button>
      <input
        value={av.name}
        onChange={(e) => actions.updateActive("name", e.target.value)}
        placeholder="Apartment name"
        aria-label="Apartment name"
        className="flex-1 min-w-0 border-none bg-transparent text-[17px] font-bold px-[2px] py-[4px]"
      />
      <button
        onClick={() => actions.deleteVisit(av.id)}
        className="flex-none border-none bg-transparent text-delete text-[11px] font-bold tracking-[0.04em] cursor-pointer px-[8px] py-[6px]"
      >
        DELETE
      </button>
    </div>
  );
}
