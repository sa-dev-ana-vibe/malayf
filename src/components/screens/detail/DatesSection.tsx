import { actions } from "../../../store";

export function DatesSection({ dates }: { dates: string[] }) {
  return (
    <div>
      <div className="text-[11px] font-bold tracking-[0.06em] uppercase text-muted mb-[8px]">
        Даты визитов
      </div>
      <div className="flex flex-wrap gap-[7px] items-center bg-card border border-line rounded-[10px] px-[12px] py-[11px]">
        {dates.map((d, i) => (
          <div
            key={i}
            className="flex items-center gap-[4px] border border-line bg-soft rounded-[8px] pl-[9px] pr-[4px] py-[4px]"
          >
            <input
              type="date"
              value={d}
              onChange={(e) => actions.updateDate(i, e.target.value)}
              aria-label="Дата визита"
              className="border-none bg-transparent text-[13px] font-semibold text-ink-soft"
            />
            <button
              onClick={() => actions.removeDate(i)}
              aria-label="Удалить дату"
              className="flex-none w-[22px] h-[22px] border-none bg-transparent text-[#cbc6d6] text-[14px] cursor-pointer rounded-[5px]"
            >
              ×
            </button>
          </div>
        ))}
        <button
          onClick={() => actions.addDate()}
          className="border-[1.5px] border-dashed border-[#cdc8da] bg-card rounded-[8px] px-[12px] py-[7px] text-accent text-[12.5px] font-bold cursor-pointer"
        >
          + Дата
        </button>
      </div>
    </div>
  );
}
