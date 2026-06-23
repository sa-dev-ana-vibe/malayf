import { actions } from "../../../store";
import { contactHref } from "../../../lib/format";
import type { Visit } from "../../../types";

export function ContactsSection({ av }: { av: Visit }) {
  return (
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
  );
}
