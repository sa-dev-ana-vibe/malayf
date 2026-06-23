import { useApp, actions } from "../../store";

export default function RedFlagsScreen() {
  const { redFlagDefs } = useApp();

  return (
    <div className="p-[14px] flex flex-col gap-[10px]">
      <div className="text-[12px] text-[#8a8794] leading-[1.5]">
        Список ред-флагов. Их можно отмечать в карточке квартиры. Здесь —
        добавить, переименовать или удалить.
      </div>
      {redFlagDefs.map((label, idx) => (
        <div
          key={idx}
          className="flex items-center gap-[9px] bg-card border border-line rounded-[10px] px-[10px] py-[8px]"
        >
          <span className="flex-none w-[8px] h-[8px] rounded-full bg-fail" />
          <input
            value={label}
            onChange={(e) => actions.renameRedFlag(idx, e.target.value)}
            placeholder="Название ред-флага"
            aria-label="Название ред-флага"
            className="flex-1 min-w-0 border-none bg-transparent text-[13.5px] font-semibold"
          />
          <button
            onClick={() => actions.deleteRedFlag(idx)}
            aria-label="Удалить ред-флаг"
            className="flex-none w-[28px] h-[28px] border-none bg-transparent text-[#cbc6d6] text-[16px] cursor-pointer rounded-[6px]"
          >
            ×
          </button>
        </div>
      ))}
      <button
        onClick={() => actions.addRedFlag()}
        className="w-full p-[13px] border-[1.5px] border-dashed border-[#cdc8da] bg-soft rounded-[11px] text-accent text-[13px] font-bold cursor-pointer"
      >
        + Добавить ред-флаг
      </button>
      <div className="h-[8px]" />
    </div>
  );
}
