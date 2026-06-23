import { actions } from "../../../store";
import type { Visit } from "../../../types";

export function ParamsSection({ av }: { av: Visit }) {
  return (
    <div>
      <div className="text-[11px] font-bold tracking-[0.06em] uppercase text-muted mb-[8px]">
        Параметры
      </div>
      <div className="bg-card border border-line rounded-[10px] p-[10px] grid grid-cols-2 gap-[8px]">
        <label className="flex flex-col gap-[3px]">
          <span className="text-[10.5px] text-muted font-semibold">Общая, м²</span>
          <input
            value={av.areaTotal}
            onChange={(e) => actions.updateActive("areaTotal", e.target.value)}
            inputMode="decimal"
            placeholder="—"
            aria-label="Общая площадь, м²"
            className="border border-line rounded-[7px] px-[9px] py-[7px] text-[13px] font-semibold w-full"
          />
        </label>
        <label className="flex flex-col gap-[3px]">
          <span className="text-[10.5px] text-muted font-semibold">Жилая, м²</span>
          <input
            value={av.areaLiving}
            onChange={(e) => actions.updateActive("areaLiving", e.target.value)}
            inputMode="decimal"
            placeholder="—"
            aria-label="Жилая площадь, м²"
            className="border border-line rounded-[7px] px-[9px] py-[7px] text-[13px] font-semibold w-full"
          />
        </label>
        <label className="flex flex-col gap-[3px]">
          <span className="text-[10.5px] text-muted font-semibold">Этаж</span>
          <input
            value={av.floor}
            onChange={(e) => actions.updateActive("floor", e.target.value)}
            inputMode="numeric"
            placeholder="—"
            aria-label="Этаж"
            className="border border-line rounded-[7px] px-[9px] py-[7px] text-[13px] font-semibold w-full"
          />
        </label>
        <label className="flex flex-col gap-[3px]">
          <span className="text-[10.5px] text-muted font-semibold">Этажей в доме</span>
          <input
            value={av.floorsTotal}
            onChange={(e) => actions.updateActive("floorsTotal", e.target.value)}
            inputMode="numeric"
            placeholder="—"
            aria-label="Этажей в доме"
            className="border border-line rounded-[7px] px-[9px] py-[7px] text-[13px] font-semibold w-full"
          />
        </label>
        <label className="flex flex-col gap-[3px]">
          <span className="text-[10.5px] text-muted font-semibold">Год постройки</span>
          <input
            value={av.yearBuilt}
            onChange={(e) => actions.updateActive("yearBuilt", e.target.value)}
            inputMode="numeric"
            placeholder="—"
            aria-label="Год постройки"
            className="border border-line rounded-[7px] px-[9px] py-[7px] text-[13px] font-semibold w-full"
          />
        </label>
        <label className="flex flex-col gap-[3px]">
          <span className="text-[10.5px] text-muted font-semibold">Тип дома</span>
          <select
            value={av.houseType}
            onChange={(e) => actions.updateActive("houseType", e.target.value)}
            aria-label="Тип дома"
            className="border border-line rounded-[7px] px-[6px] py-[7px] text-[13px] font-semibold bg-card w-full"
          >
            <option value="">—</option>
            <option value="Панельный">Панельный</option>
            <option value="Кирпичный">Кирпичный</option>
            <option value="Монолит">Монолит</option>
            <option value="Монолитно-кирпичный">Монолит-кирпич</option>
            <option value="Блочный">Блочный</option>
            <option value="Деревянный">Деревянный</option>
          </select>
        </label>
      </div>
    </div>
  );
}
