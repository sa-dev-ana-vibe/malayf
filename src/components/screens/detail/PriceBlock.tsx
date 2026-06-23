import { actions } from "../../../store";
import { formatThousands } from "../../../lib/format";
import type { Visit } from "../../../types";

export function PriceBlock({
  av,
  hasPpm,
  ppm,
}: {
  av: Visit;
  hasPpm: boolean;
  ppm: string;
}) {
  return (
    <div className="px-[16px] pt-[13px] pb-[12px] bg-card border-b border-line-soft">
      <input
        value={formatThousands(av.price)}
        onChange={(e) => actions.setPrice(e.target.value)}
        inputMode="numeric"
        placeholder="Цена"
        aria-label="Цена"
        className="w-full border-none bg-transparent text-[30px] font-extrabold text-accent-dark p-0 tracking-[-0.01em]"
      />
      {hasPpm ? (
        <div className="text-[12px] font-bold text-muted-2 mt-[3px]">{ppm} за м²</div>
      ) : null}
    </div>
  );
}
