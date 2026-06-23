import { colorFor } from "../../../lib/scoring";
import type { VisitScore } from "../../../types";

export function ScoreHeader({ sc, ws }: { sc: VisitScore; ws: number | null }) {
  return (
    <div className="flex items-center gap-[14px] px-[16px] py-[12px] bg-card border-b border-line">
      <div
        style={{
          color: colorFor(ws),
          fontSize: "28px",
          fontWeight: 800,
          lineHeight: "1",
          minWidth: "58px",
        }}
      >
        {ws != null ? ws + "%" : "–"}
      </div>
      <div className="flex-1">
        <div className="text-[10px] text-muted font-bold tracking-[0.07em]">
          SCORE · {sc.answered + "/" + sc.total + " rated"}
        </div>
        <div className="flex gap-[14px] mt-[5px]">
          <span className="text-[12px] text-pass font-bold">{sc.pass} pass</span>
          <span className="text-[12px] text-fail font-bold">{sc.fail} fail</span>
          <span className="text-[12px] text-muted-2 font-bold">{sc.na} n/a</span>
        </div>
      </div>
    </div>
  );
}
