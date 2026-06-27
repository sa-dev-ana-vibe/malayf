import { useMemo, useState } from "react";
import { useApp, actions } from "../../store";
import { itemType } from "../../lib/scoring";
import { buildAppendPrompt } from "../../lib/prompt";
import type { ItemType } from "../../types";

export default function ChecklistScreen() {
  const { categories } = useApp();
  const [promptCopied, setPromptCopied] = useState(false);
  const [collapsedCategoryIds, setCollapsedCategoryIds] = useState<Set<string>>(
    new Set(),
  );

  const weightTotal = categories.reduce(
    (n, c) => n + (Number(c.weight) || 0),
    0,
  );
  const weightTotalColor = weightTotal === 100 ? "#1f9d63" : "#d6453f";
  const allCategoriesCollapsed =
    categories.length > 0 &&
    categories.every((cat) => collapsedCategoryIds.has(cat.id));

  const categoryItemCounts = useMemo(
    () => new Map(categories.map((cat) => [cat.id, cat.items.length])),
    [categories],
  );

  const toggleCategoryCollapsed = (categoryId: string) => {
    setCollapsedCategoryIds((current) => {
      const next = new Set(current);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const toggleAllCategories = () => {
    setCollapsedCategoryIds(
      allCategoriesCollapsed
        ? new Set()
        : new Set(categories.map((cat) => cat.id)),
    );
  };

  const copyPrompt = () => {
    const prompt = buildAppendPrompt();
    navigator.clipboard
      .writeText(prompt)
      .then(() => {
        setPromptCopied(true);
        setTimeout(() => setPromptCopied(false), 2000);
      })
      .catch(() => {
        // Clipboard blocked (insecure context / permissions) — log it so the
        // user can still copy it by hand.
        console.log(prompt);
        alert(
          "Не удалось скопировать автоматически — промпт выведен в консоль.",
        );
      });
  };

  return (
    <div className="p-[14px] flex flex-col gap-[12px]">
      <div className="text-[12px] text-muted-2 leading-[1.5]">
        Your master checklist, reused for every visit. Give each category a
        weight — they should add up to 100% and drive the overall score.
      </div>

      <div className="flex items-center justify-between gap-[8px] bg-card border border-line rounded-[10px] px-[12px] py-[10px]">
        <div className="text-[12px] font-bold text-ink-soft">
          Weights total:{" "}
          <span className="font-extrabold" style={{ color: weightTotalColor }}>
            {weightTotal}%
          </span>
        </div>
        <button
          onClick={() => actions.distributeWeights()}
          className="border border-line bg-soft rounded-[8px] px-[11px] py-[7px] text-accent text-[12px] font-bold cursor-pointer whitespace-nowrap"
        >
          Distribute evenly
        </button>
      </div>

      <div className="grid grid-cols-2 gap-[8px]">
        <button
          type="button"
          onClick={toggleAllCategories}
          className="border border-line bg-card rounded-[10px] px-[11px] py-[9px] text-accent text-[12px] font-bold cursor-pointer"
        >
          {allCategoriesCollapsed ? "Развернуть критерии" : "Свернуть критерии"}
        </button>
        <a
          href="#checklist-data-tools"
          className="border border-line bg-card rounded-[10px] px-[11px] py-[9px] text-accent text-[12px] font-bold text-center no-underline"
        >
          К импорту/экспорту ↓
        </a>
      </div>

      {categories.map((cat) => (
        <div
          key={cat.id}
          className="bg-card border border-line rounded-[11px] overflow-hidden"
        >
          <div className="flex items-center gap-[6px] pl-[10px] pr-[10px] py-[9px] bg-soft border-b border-line-faint">
            <button
              type="button"
              onClick={() => toggleCategoryCollapsed(cat.id)}
              aria-expanded={!collapsedCategoryIds.has(cat.id)}
              aria-label={
                collapsedCategoryIds.has(cat.id)
                  ? `Развернуть категорию ${cat.name}`
                  : `Свернуть категорию ${cat.name}`
              }
              className="flex-none w-[28px] h-[28px] border border-line bg-card rounded-[7px] text-accent text-[12px] font-bold cursor-pointer"
            >
              {collapsedCategoryIds.has(cat.id) ? "+" : "−"}
            </button>
            <input
              value={cat.name}
              onChange={(e) => actions.renameCategory(cat.id, e.target.value)}
              placeholder="Category name"
              aria-label="Category name"
              className="flex-1 min-w-0 border-none bg-transparent text-[13px] font-bold"
            />
            <div className="flex-none flex items-center gap-[1px] border border-line rounded-[7px] pl-[6px] pr-[5px] py-[2px] bg-card">
              <input
                type="number"
                value={typeof cat.weight === "number" ? cat.weight : 0}
                onChange={(e) => actions.setCatWeight(cat.id, e.target.value)}
                min={0}
                max={100}
                aria-label="Category weight"
                className="w-[46px] border-none bg-transparent text-[13px] font-bold text-right text-accent-dark"
              />
              <span className="text-[12px] font-bold text-muted">%</span>
            </div>
            <div className="flex-none text-[11px] font-bold text-muted whitespace-nowrap">
              {categoryItemCounts.get(cat.id) ?? 0} шт.
            </div>
            <button
              onClick={() => actions.deleteCategory(cat.id)}
              aria-label="Delete category"
              className="flex-none w-[28px] h-[28px] border-none bg-transparent text-delete text-[16px] cursor-pointer rounded-[6px]"
            >
              ×
            </button>
          </div>

          {!collapsedCategoryIds.has(cat.id) &&
            cat.items.map((it) => (
              <div
                key={it.id}
                className="pl-[14px] pr-[10px] py-[8px] border-b border-[#f4f2f8] flex flex-col gap-[7px]"
              >
                <div className="flex items-center gap-[6px]">
                  <span className="text-dashed text-[12px]">•</span>
                  <input
                    value={it.text}
                    onChange={(e) =>
                      actions.renameItem(cat.id, it.id, e.target.value)
                    }
                    placeholder="Requirement…"
                    aria-label="Requirement"
                    className="flex-1 min-w-0 border-none bg-transparent text-[13.5px] py-[4px]"
                  />
                  <select
                    value={itemType(it)}
                    onChange={(e) =>
                      actions.setItemType(
                        cat.id,
                        it.id,
                        e.target.value as ItemType,
                      )
                    }
                    aria-label="Item type"
                    className="flex-none border border-line rounded-[7px] p-[5px] text-[11.5px] font-semibold bg-soft text-muted-3"
                  >
                    <option value="ternary">Pass/Fail</option>
                    <option value="stars">★ Звёзды</option>
                    <option value="select">Список</option>
                  </select>
                  <button
                    onClick={() => actions.deleteItem(cat.id, it.id)}
                    aria-label="Delete item"
                    className="flex-none w-[26px] h-[26px] border-none bg-transparent text-[#cbc6d6] text-[15px] cursor-pointer rounded-[6px]"
                  >
                    ×
                  </button>
                </div>

                {itemType(it) === "select" && (
                  <div className="flex flex-col gap-[5px] pl-[16px]">
                    {(it.options ?? []).map((op) => (
                      <div key={op.id} className="flex items-center gap-[5px]">
                        <input
                          value={op.label}
                          onChange={(e) =>
                            actions.updateOption(
                              cat.id,
                              it.id,
                              op.id,
                              "label",
                              e.target.value,
                            )
                          }
                          placeholder="Вариант ответа…"
                          aria-label="Вариант ответа"
                          className="flex-1 min-w-0 border border-line rounded-[6px] px-[8px] py-[5px] text-[12.5px]"
                        />
                        <input
                          value={op.value}
                          onChange={(e) =>
                            actions.updateOption(
                              cat.id,
                              it.id,
                              op.id,
                              "value",
                              e.target.value,
                            )
                          }
                          inputMode="numeric"
                          placeholder="0"
                          aria-label="Значение варианта (0–100)"
                          className="flex-none w-[48px] border border-line rounded-[6px] px-[6px] py-[5px] text-[12.5px] font-bold text-center text-accent-dark"
                        />
                        <button
                          onClick={() =>
                            actions.deleteOption(cat.id, it.id, op.id)
                          }
                          aria-label="Удалить вариант"
                          className="flex-none w-[24px] h-[24px] border-none bg-transparent text-[#cbc6d6] text-[14px] cursor-pointer rounded-[5px]"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => actions.addOption(cat.id, it.id)}
                      className="self-start border-none bg-transparent text-accent text-[12px] font-bold cursor-pointer py-[2px]"
                    >
                      + Вариант (0–100)
                    </button>
                  </div>
                )}
              </div>
            ))}

          {!collapsedCategoryIds.has(cat.id) && (
            <button
              onClick={() => actions.addItem(cat.id)}
              className="w-full text-left px-[14px] py-[10px] border-none bg-transparent text-accent text-[12.5px] font-bold cursor-pointer"
            >
              + Add item
            </button>
          )}
        </div>
      ))}

      <button
        onClick={() => actions.addCategory()}
        className="w-full p-[13px] border-[1.5px] border-dashed border-[#cdc8da] bg-soft rounded-[11px] text-accent text-[13px] font-bold cursor-pointer"
      >
        + Add category
      </button>

      <div
        id="checklist-data-tools"
        className="mt-[6px] scroll-mt-[12px] border-t border-line pt-[14px]"
      >
        <div className="text-[11px] font-bold tracking-[0.06em] uppercase text-muted mb-[8px]">
          Данные
        </div>
        <div className="flex gap-[8px]">
          <button
            onClick={() => void actions.exportData()}
            className="flex-1 p-[11px] border border-line bg-card rounded-[10px] text-ink-soft text-[12.5px] font-bold cursor-pointer"
          >
            ⬇ Экспорт JSON
          </button>
          <label className="flex-1 p-[11px] border border-line bg-card rounded-[10px] text-ink-soft text-[12.5px] font-bold cursor-pointer text-center">
            ⬆ Импорт
            <input
              type="file"
              accept="application/json,.json"
              aria-label="Импорт JSON"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void actions.importData(f);
                e.currentTarget.value = "";
              }}
              className="hidden"
            />
          </label>
        </div>
        <button
          onClick={copyPrompt}
          className="mt-[8px] w-full p-[11px] border border-line bg-card rounded-[10px] text-ink-soft text-[12.5px] font-bold cursor-pointer"
        >
          {promptCopied ? "✓ Скопировано" : "📋 Скопировать промпт для LLM"}
        </button>
        <div className="mt-[8px] grid grid-cols-2 gap-[8px]">
          <label className="flex items-center justify-center p-[11px] border-[1.5px] border-dashed border-[#cdc8da] bg-soft rounded-[10px] text-accent text-[12.5px] font-bold cursor-pointer text-center">
            ➕ Добавить JSON
            <input
              type="file"
              accept="application/json,.json"
              aria-label="Добавить квартиры из JSON"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void actions.appendApartments(f);
                e.currentTarget.value = "";
              }}
              className="hidden"
            />
          </label>
          <button
            onClick={() => void actions.appendApartmentsFromClipboard()}
            className="p-[11px] border-[1.5px] border-dashed border-[#cdc8da] bg-soft rounded-[10px] text-accent text-[12.5px] font-bold cursor-pointer text-center"
          >
            📋 Вставить JSON
          </button>
        </div>
        <button
          onClick={() => actions.deleteAllVisits()}
          className="mt-[8px] w-full p-[11px] border border-[#fecaca] bg-[#fef2f2] rounded-[10px] text-[#b91c1c] text-[12.5px] font-bold cursor-pointer"
        >
          🗑 Удалить все квартиры
        </button>
        <div className="text-[11px] text-faint leading-[1.5] mt-[8px]">
          Экспорт сохранит все квартиры, чек-лист, метки и ред-флаги в файл.
          Импорт заменит текущие данные. 
          «Добавить квартиры из JSON» только дополнит список квартир из файла или буфера — чек-лист, метки и ред-флаги
          останутся как есть. 
          «Удалить все квартиры» очистит только список квартир после подтверждения.
          «Скопировать промпт для LLM» даст готовый промпт, чтобы превратить текст объявлений в такой JSON.
        </div>
      </div>

      <div className="h-[8px]" />
    </div>
  );
}
