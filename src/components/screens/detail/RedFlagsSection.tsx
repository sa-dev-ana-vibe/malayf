import { actions } from "../../../store";
import { redFlagChip } from "../../../ui/styles";
import type { Visit } from "../../../types";

export function RedFlagsSection({
  av,
  redFlagDefs,
}: {
  av: Visit;
  redFlagDefs: string[];
}) {
  return (
    <div>
      <div className="flex items-center gap-[7px] mb-[8px]">
        <span className="text-[11px] font-bold tracking-[0.06em] uppercase text-muted">
          Red flags
        </span>
        {av.redFlags.length > 0 ? (
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-[5px] rounded-[9px] bg-fail text-white text-[11px] font-extrabold">
            {av.redFlags.length}
          </span>
        ) : null}
        <button
          onClick={() => actions.goRedFlags()}
          className="ml-auto border-none bg-transparent text-accent text-[12px] font-bold cursor-pointer px-[4px] py-[2px]"
        >
          ✎ ред.
        </button>
      </div>
      <div className="flex flex-wrap gap-[7px] bg-card border border-line rounded-[10px] px-[12px] py-[11px]">
        {redFlagDefs.map((label) => (
          <button
            key={label}
            onClick={() => actions.toggleRedFlag(label)}
            aria-pressed={av.redFlags.includes(label)}
            style={redFlagChip(av.redFlags.includes(label))}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
