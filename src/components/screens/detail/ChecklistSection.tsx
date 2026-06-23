import { actions } from "../../../store";
import { itemType, catScore } from "../../../lib/scoring";
import { ACCENT, ACCENT_SOFT, btnStyle, naChip } from "../../../ui/styles";
import type { Category, Visit } from "../../../types";

export function ChecklistSection({
  av,
  categories,
}: {
  av: Visit;
  categories: Category[];
}) {
  return (
    <div>
      <div className="text-[11px] font-bold tracking-[0.06em] uppercase text-muted mb-[8px]">
        Checklist
      </div>
      <div className="flex flex-col gap-[12px]">
        {categories.map((cat) => {
          const cs = catScore(av, cat);
          const summary = cs.answered
            ? cs.pass + "/" + cs.answered + " pass"
            : "not rated";
          return (
            <div
              key={cat.id}
              className="bg-card border border-line rounded-[10px] overflow-hidden"
            >
              <div className="flex justify-between items-center px-[14px] py-[11px] bg-soft border-b border-line-faint">
                <span className="text-[13px] font-bold text-ink">{cat.name}</span>
                <span className="text-[11px] text-muted font-semibold">{summary}</span>
              </div>
              {cat.items.map((it) => {
                const r = av.results[it.id];
                const type = itemType(it);
                const naOn = r === "na";
                const text = it.text || "(unnamed item)";
                return (
                  <div
                    key={it.id}
                    className="px-[14px] py-[11px] border-b border-line-soft flex flex-col gap-[9px]"
                  >
                    <span className="text-[13.5px] text-ink-soft leading-[1.35]">{text}</span>
                    {type === "ternary" ? (
                      <div className="flex gap-[7px]">
                        <button
                          onClick={() => actions.setResult(it.id, "pass")}
                          aria-pressed={r === "pass"}
                          style={btnStyle(r === "pass", "pass")}
                        >
                          Pass
                        </button>
                        <button
                          onClick={() => actions.setResult(it.id, "fail")}
                          aria-pressed={r === "fail"}
                          style={btnStyle(r === "fail", "fail")}
                        >
                          Fail
                        </button>
                        <button
                          onClick={() => actions.setResult(it.id, "na")}
                          aria-pressed={r === "na"}
                          style={btnStyle(r === "na", "na")}
                        >
                          N/A
                        </button>
                      </div>
                    ) : null}
                    {type === "stars" ? (
                      <div className="flex items-center gap-[8px]">
                        <div className="flex items-center gap-[2px]">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              onClick={() => actions.setResultForce(it.id, n)}
                              aria-label={`Поставить оценку ${n} из 5`}
                              aria-pressed={n <= (Number(r) || 0)}
                              className="border-none bg-transparent cursor-pointer text-[27px] leading-none px-[1px]"
                              style={{ color: n <= (Number(r) || 0) ? "#e6a817" : "#dcd8e4" }}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                        {(Number(r) || 0) > 0 ? (
                          <button
                            onClick={() => actions.clearResult(it.id)}
                            className="border-none bg-transparent text-faint text-[11.5px] font-semibold cursor-pointer"
                          >
                            сброс
                          </button>
                        ) : null}
                        <button
                          onClick={() => actions.setResult(it.id, "na")}
                          aria-pressed={naOn}
                          style={naChip(naOn)}
                        >
                          N/A
                        </button>
                      </div>
                    ) : null}
                    {type === "select" ? (
                      <div className="flex flex-col gap-[6px] items-start">
                        {(it.options ?? []).map((o) => {
                          const on = r === o.id;
                          const value =
                            o.value === "" || o.value == null ? "0" : String(o.value);
                          return (
                            <button
                              key={o.id}
                              onClick={() => actions.setResult(it.id, o.id)}
                              aria-pressed={on}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "9px",
                                width: "100%",
                                textAlign: "left",
                                cursor: "pointer",
                                border: "1px solid " + (on ? ACCENT : "#e6e3ee"),
                                background: on ? ACCENT_SOFT : "#fff",
                                borderRadius: "8px",
                                padding: "9px 11px",
                                fontSize: "13px",
                                fontWeight: on ? 700 : 600,
                                color: on ? ACCENT : "#332f3d",
                                lineHeight: "1.3",
                              }}
                            >
                              <span className="flex-1 min-w-0">
                                {o.label || "(без названия)"}
                              </span>
                              <span
                                style={{
                                  flex: "none",
                                  minWidth: "34px",
                                  textAlign: "center",
                                  fontSize: "12px",
                                  fontWeight: 800,
                                  color: on ? ACCENT : "#9b97a6",
                                }}
                              >
                                {value}
                              </span>
                            </button>
                          );
                        })}
                        <button
                          onClick={() => actions.setResult(it.id, "na")}
                          aria-pressed={naOn}
                          style={naChip(naOn)}
                        >
                          N/A — не применимо
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
