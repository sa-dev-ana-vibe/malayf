import { actions } from "../../../store";
import { formatThousands } from "../../../lib/format";
import type { Visit } from "../../../types";

export function InvestmentsSection({
  av,
  hasPpmGood,
  ppmGood,
}: {
  av: Visit;
  hasPpmGood: boolean;
  ppmGood: string;
}) {
  return (
    <div>
      <div className="text-[11px] font-bold tracking-[0.06em] uppercase text-muted mb-[8px]">
        Вложения
      </div>
      <div className="bg-card border border-line rounded-[10px] p-[10px] flex flex-col gap-[9px]">
        <div className="grid grid-cols-2 gap-[8px]">
          <label className="flex flex-col gap-[3px]">
            <span className="text-[10.5px] text-muted font-semibold">До «жить»</span>
            <input
              value={formatThousands(av.invLive)}
              onChange={(e) =>
                actions.updateActive("invLive", formatThousands(e.target.value))
              }
              inputMode="numeric"
              placeholder="—"
              aria-label="Вложения до «жить»"
              className="border border-line rounded-[7px] px-[9px] py-[7px] text-[13px] font-bold text-ink-soft w-full"
            />
          </label>
          <label className="flex flex-col gap-[3px]">
            <span className="text-[10.5px] text-muted font-semibold">До «хорошо»</span>
            <input
              value={formatThousands(av.invGood)}
              onChange={(e) =>
                actions.updateActive("invGood", formatThousands(e.target.value))
              }
              inputMode="numeric"
              placeholder="—"
              aria-label="Вложения до «хорошо»"
              className="border border-line rounded-[7px] px-[9px] py-[7px] text-[13px] font-bold text-ink-soft w-full"
            />
          </label>
        </div>
        {hasPpmGood ? (
          <div className="bg-[#f3eefc] rounded-[8px] px-[11px] py-[8px] flex items-baseline justify-between gap-[8px]">
            <span className="text-[11.5px] font-bold text-accent">Цена за м² до «хорошо»</span>
            <span className="text-[15px] font-extrabold text-accent-dark">{ppmGood}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
