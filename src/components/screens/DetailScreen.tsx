import { useEffect } from "react";
import { useApp, actions, activeVisit } from "../../store";
import { itemType, scoreVisit, catScore, weightedScore, colorFor } from "../../lib/scoring";
import {
  formatThousands,
  normalizeUrl,
  prettyHost,
  contactHref,
  numPrice,
  numArea,
  numPpm,
  visitDates,
  fmtRu,
  mapsHref,
} from "../../lib/format";
import { ACCENT, ACCENT_SOFT, tagChip, redFlagChip, btnStyle, naChip } from "../../ui/styles";
import { usePhotoUrl } from "../../ui/usePhotoUrl";

function PhotoThumb({
  id,
  idx,
  isFloorPlan,
  name,
}: {
  id: string;
  idx: number;
  isFloorPlan: boolean;
  name: string;
}) {
  const url = usePhotoUrl(id);
  return (
    <div
      className="relative w-[78px] h-[78px] rounded-[9px] overflow-hidden bg-[#efedf3]"
      style={{ border: "1px solid " + (isFloorPlan ? ACCENT : "#e6e3ee") }}
    >
      {url ? (
        <img src={url} alt={name + " photo"} className="w-full h-full object-cover block" />
      ) : null}
      <button
        onClick={() => actions.toggleFloorPlan(id)}
        title={isFloorPlan ? "Планировка" : "Отметить как планировку"}
        aria-label={isFloorPlan ? "Убрать отметку планировки" : "Отметить как планировку"}
        aria-pressed={isFloorPlan}
        className="absolute top-[3px] left-[3px] h-[20px] min-w-[20px] border-none rounded-[5px] text-white text-[10px] font-extrabold leading-none cursor-pointer flex items-center justify-center gap-[3px]"
        style={{
          padding: isFloorPlan ? "0 6px" : "0",
          background: isFloorPlan ? ACCENT : "rgba(20,10,30,0.55)",
        }}
      >
        {isFloorPlan ? "▦ ПЛАН" : "▦"}
      </button>
      <button
        onClick={() => actions.removePhoto(idx)}
        aria-label="Удалить фото"
        className="absolute top-[3px] right-[3px] w-[20px] h-[20px] border-none rounded-full bg-[rgba(20,10,30,0.6)] text-white text-[12px] leading-none cursor-pointer"
      >
        ×
      </button>
    </div>
  );
}

export default function DetailScreen() {
  const s = useApp();

  // Ctrl/Cmd-V anywhere on the detail screen pastes a clipboard image as a photo
  // (synchronizing with the document's paste event — a legitimate external effect).
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (!activeVisit() || !e.clipboardData) return;
      for (const item of Array.from(e.clipboardData.items)) {
        if (item.type.startsWith("image")) {
          const file = item.getAsFile();
          if (file) {
            void actions.addPhotoFile(file);
            e.preventDefault();
            return;
          }
        }
      }
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, []);

  const av = activeVisit();
  if (!av) return null;

  const sc = scoreVisit(s.categories, av);
  const ws = weightedScore(s.categories, av);

  const priceNum = numPrice(av);
  const areaNum = numArea(av);
  const hasPpm = numPpm(av) != null;
  const ppm = hasPpm ? fmtRu(numPpm(av)) : "";

  const invGoodNum = parseFloat(String(av.invGood ?? "").replace(/[^\d.]/g, "")) || 0;
  const totalGood = priceNum && priceNum > 0 ? priceNum + invGoodNum : 0;
  const hasPpmGood = totalGood > 0 && areaNum != null && areaNum > 0 && invGoodNum > 0;
  const ppmGood = hasPpmGood && areaNum ? fmtRu(totalGood / areaNum) : "";

  const dates = visitDates(av);

  const photoOrder = av.photos
    .map((src, i) => ({ src, i }))
    .sort((a, b) => (a.src === av.floorPlan ? 0 : 1) - (b.src === av.floorPlan ? 0 : 1));

  return (
    <div className="flex flex-col h-full">
      {/* top bar */}
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

      {/* price block */}
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

      {/* score header */}
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

      {/* scroll content */}
      <div className="flex-1 overflow-auto p-[14px] flex flex-col gap-[16px]">
        {/* Address */}
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

        {/* Listing links */}
        <div>
          <div className="text-[11px] font-bold tracking-[0.06em] uppercase text-muted mb-[8px]">
            Listing links
          </div>
          <div className="flex flex-col gap-[8px]">
            {av.links.map((l) => {
              const editing = s.editLinkId === l.id || !l.url;
              const href = normalizeUrl(l.url);
              const displayLabel = l.label || prettyHost(l.url) || l.url;
              return (
                <div
                  key={l.id}
                  className="flex items-center gap-[8px] bg-card border border-line rounded-[10px] pl-[12px] pr-[10px] py-[9px]"
                >
                  {editing ? (
                    <>
                      <input
                        value={l.url}
                        onChange={(e) => actions.updateLink(l.id, "url", e.target.value)}
                        placeholder="https://… (Avito, Cian, Idealista)"
                        aria-label="Listing URL"
                        className="flex-1 min-w-0 border-none bg-transparent text-[13px] font-semibold text-accent w-full"
                      />
                      {l.url ? (
                        <button
                          onClick={() => actions.setEditLinkId(null)}
                          aria-label="Готово"
                          className="flex-none w-[30px] h-[30px] flex items-center justify-center rounded-[7px] bg-accent-soft text-accent border-none text-[15px] cursor-pointer"
                        >
                          ✓
                        </button>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 min-w-0 flex items-center gap-[7px] no-underline"
                      >
                        <span className="flex-none w-[24px] h-[24px] flex items-center justify-center rounded-[6px] bg-accent-soft text-accent text-[12px]">
                          ↗
                        </span>
                        <span className="min-w-0 text-[13px] font-bold text-accent-dark whitespace-nowrap overflow-hidden text-ellipsis">
                          {displayLabel}
                        </span>
                      </a>
                      <button
                        onClick={() => actions.setEditLinkId(l.id)}
                        aria-label="Редактировать ссылку"
                        className="flex-none w-[28px] h-[28px] flex items-center justify-center rounded-[7px] bg-transparent text-faint border-none text-[13px] cursor-pointer"
                      >
                        ✎
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => actions.removeLink(l.id)}
                    aria-label="Удалить ссылку"
                    className="flex-none w-[26px] h-[26px] border-none bg-transparent text-[#cbc6d6] text-[15px] cursor-pointer rounded-[6px]"
                  >
                    ×
                  </button>
                </div>
              );
            })}
            <button
              onClick={() => actions.addLink()}
              className="w-full text-left px-[14px] py-[11px] border-[1.5px] border-dashed border-[#cdc8da] bg-soft rounded-[10px] text-accent text-[12.5px] font-bold cursor-pointer"
            >
              + Add listing link
            </button>
          </div>
        </div>

        {/* Параметры */}
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

        {/* Вложения */}
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

        {/* Метки */}
        <div>
          <div className="text-[11px] font-bold tracking-[0.06em] uppercase text-muted mb-[8px]">
            Метки
          </div>
          <div className="flex flex-wrap gap-[7px] bg-card border border-line rounded-[10px] px-[12px] py-[11px]">
            {s.tags.map((t) => (
              <button
                key={t.id}
                onClick={() => actions.toggleVisitTag(t.id)}
                aria-pressed={av.tagIds.includes(t.id)}
                style={tagChip(t.color, av.tagIds.includes(t.id), false)}
              >
                {t.name}
              </button>
            ))}
            <button
              onClick={() => actions.goTags()}
              className="px-[12px] py-[6px] rounded-[20px] border-[1.5px] border-dashed border-[#cdc8da] bg-card text-accent text-[12px] font-bold cursor-pointer whitespace-nowrap"
            >
              ✎ ред.
            </button>
          </div>
        </div>

        {/* Red flags */}
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
            {s.redFlagDefs.map((label) => (
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

        {/* Contacts */}
        <div>
          <div className="text-[11px] font-bold tracking-[0.06em] uppercase text-muted mb-[8px]">
            Contacts
          </div>
          <div className="flex flex-col gap-[8px]">
            {av.contacts.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-[8px] bg-card border border-line rounded-[10px] pl-[12px] pr-[10px] py-[9px]"
              >
                <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
                  <input
                    value={c.name}
                    onChange={(e) => actions.updateContact(c.id, "name", e.target.value)}
                    placeholder="Name / role (e.g. Owner, Agent)"
                    aria-label="Имя / роль контакта"
                    className="border-none bg-transparent text-[13px] font-semibold w-full"
                  />
                  <input
                    value={c.value}
                    onChange={(e) => actions.updateContact(c.id, "value", e.target.value)}
                    placeholder="Phone or email"
                    aria-label="Телефон или email"
                    className="border-none bg-transparent text-[12px] text-muted-3 w-full"
                  />
                </div>
                {c.value ? (
                  <a
                    href={contactHref(c.value)}
                    className="flex-none w-[30px] h-[30px] flex items-center justify-center rounded-[7px] bg-[#eef5f1] text-pass text-[13px] no-underline"
                    aria-label={c.value.includes("@") ? "Написать письмо" : "Позвонить"}
                  >
                    {c.value.includes("@") ? "✉" : "☎"}
                  </a>
                ) : null}
                <button
                  onClick={() => actions.removeContact(c.id)}
                  aria-label="Удалить контакт"
                  className="flex-none w-[26px] h-[26px] border-none bg-transparent text-[#cbc6d6] text-[15px] cursor-pointer rounded-[6px]"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              onClick={() => actions.addContact()}
              className="w-full text-left px-[14px] py-[11px] border-[1.5px] border-dashed border-[#cdc8da] bg-soft rounded-[10px] text-accent text-[12.5px] font-bold cursor-pointer"
            >
              + Add contact
            </button>
          </div>
        </div>

        {/* Даты визитов */}
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

        {/* Photos */}
        <div>
          <div className="text-[11px] font-bold tracking-[0.06em] uppercase text-muted mb-[8px]">
            Photos
          </div>
          <div className="flex flex-wrap gap-[8px]">
            {photoOrder.map(({ src, i }) => (
              <PhotoThumb
                key={i}
                id={src}
                idx={i}
                isFloorPlan={src === av.floorPlan}
                name={av.name || "Apartment"}
              />
            ))}
            <label className="w-[78px] h-[78px] rounded-[9px] border-[1.5px] border-dashed border-[#cdc8da] bg-soft flex flex-col items-center justify-center gap-[3px] cursor-pointer text-muted-2 text-[11px] font-semibold">
              <span className="text-[20px] leading-none text-faint">+</span>Photo
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void actions.addPhotoFile(f);
                  e.currentTarget.value = "";
                }}
                className="hidden"
              />
            </label>
            <button
              onClick={() => void actions.pasteFromClipboard()}
              className="w-[78px] h-[78px] rounded-[9px] border-[1.5px] border-dashed border-[#cdc8da] bg-soft flex flex-col items-center justify-center gap-[3px] cursor-pointer text-muted-2 text-[11px] font-semibold"
            >
              <span className="text-[18px] leading-none text-faint">⎘</span>Вставить
            </button>
          </div>
        </div>

        {/* Checklist */}
        <div>
          <div className="text-[11px] font-bold tracking-[0.06em] uppercase text-muted mb-[8px]">
            Checklist
          </div>
          <div className="flex flex-col gap-[12px]">
            {s.categories.map((cat) => {
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

        {/* Overall notes */}
        <div>
          <div className="text-[11px] font-bold tracking-[0.06em] uppercase text-muted mb-[8px]">
            Overall notes
          </div>
          <textarea
            value={av.notes}
            onChange={(e) => actions.updateActive("notes", e.target.value)}
            placeholder="Gut feeling, smell, neighbours, anything off…"
            rows={4}
            aria-label="Overall notes"
            className="w-full bg-card border border-line rounded-[10px] px-[14px] py-[12px] text-[14px] leading-[1.4]"
          />
        </div>

        <div className="h-[8px]" />
      </div>
    </div>
  );
}
