import { useApp, actions } from "../../store";

export default function TagsScreen() {
  const { tags } = useApp();

  return (
    <div className="p-[14px] flex flex-col gap-[10px]">
      <div className="text-[12px] text-muted-2 leading-[1.5]">
        Метки статуса для квартир. Назначайте их в карточке и фильтруйте список. Цвет
        можно поменять, нажав на квадрат.
      </div>
      {tags.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-[9px] bg-card border border-line rounded-[10px] px-[10px] py-[8px]"
        >
          <label
            className="relative w-[30px] h-[30px] rounded-[8px] flex-none overflow-hidden cursor-pointer border border-[rgba(0,0,0,0.12)]"
            style={{ background: t.color }}
          >
            <input
              type="color"
              value={t.color}
              onChange={(e) => actions.recolorTag(t.id, e.target.value)}
              aria-label="Цвет метки"
              className="absolute left-0 top-0 w-full h-full opacity-0 cursor-pointer border-none p-0"
            />
          </label>
          <input
            value={t.name}
            onChange={(e) => actions.renameTag(t.id, e.target.value)}
            placeholder="Название метки"
            aria-label="Название метки"
            className="flex-1 min-w-0 border-none bg-transparent text-[13.5px] font-semibold"
          />
          <button
            onClick={() => actions.deleteTag(t.id)}
            aria-label="Удалить метку"
            className="flex-none w-[28px] h-[28px] border-none bg-transparent text-[#cbc6d6] text-[16px] cursor-pointer rounded-[6px]"
          >
            ×
          </button>
        </div>
      ))}
      <button
        onClick={() => actions.addTag()}
        className="w-full p-[13px] border-[1.5px] border-dashed border-[#cdc8da] bg-soft rounded-[11px] text-accent text-[13px] font-bold cursor-pointer"
      >
        + Добавить метку
      </button>
      <div className="h-[8px]" />
    </div>
  );
}
