import { actions } from "../../../store";
import { mapsHref } from "../../../lib/format";
import type { Visit } from "../../../types";

export function AddressSection({ av }: { av: Visit }) {
  return (
    <div>
      <div className="text-[11px] font-bold tracking-[0.06em] uppercase text-muted mb-[8px]">
        Address
      </div>
      <div className="flex flex-col gap-[8px] bg-card border border-line rounded-[10px] px-[14px] py-[12px]">
        <input
          value={av.address}
          onChange={(e) => actions.updateActive("address", e.target.value)}
          placeholder="Street, number, city…"
          aria-label="Address"
          className="border-none bg-transparent text-[14px] w-full"
        />
        {av.address ? (
          <a
            href={mapsHref(av.address)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] font-bold text-accent no-underline"
          >
            Открыть в 2ГИС ↗
          </a>
        ) : null}
      </div>
    </div>
  );
}
