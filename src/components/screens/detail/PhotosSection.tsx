import { useEffect, useRef, useState } from "react";
import { actions } from "../../../store";
import { ACCENT } from "../../../ui/styles";
import { usePhotoUrl } from "../../../ui/usePhotoUrl";
import type { Visit } from "../../../types";

function PhotoLightbox({
  id,
  name,
  canNavigate,
  onClose,
  onNext,
  onPrev,
}: {
  id: string;
  name: string;
  canNavigate: boolean;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  const url = usePhotoUrl(id);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const prevButtonRef = useRef<HTMLButtonElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && canNavigate) onPrev();
      if (event.key === "ArrowRight" && canNavigate) onNext();
      if (event.key === "Tab") {
        const focusable = [
          closeButtonRef.current,
          canNavigate ? prevButtonRef.current : null,
          canNavigate ? nextButtonRef.current : null,
        ].filter((el): el is HTMLButtonElement => el != null);
        if (focusable.length === 0) return;
        const currentIndex = focusable.findIndex((el) => el === document.activeElement);
        const fallbackIndex = event.shiftKey ? focusable.length - 1 : 0;
        const nextIndex =
          currentIndex < 0
            ? fallbackIndex
            : (currentIndex + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length;
        event.preventDefault();
        focusable[nextIndex].focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canNavigate, onClose, onNext, onPrev]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Просмотр фото целиком"
      className="fixed inset-0 z-50 bg-[rgba(12,8,18,0.92)] flex items-center justify-center p-[14px]"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Закрыть просмотр фото фоном"
        tabIndex={-1}
        className="absolute inset-0 border-none bg-transparent cursor-zoom-out"
      />
      <button
        ref={closeButtonRef}
        type="button"
        onClick={onClose}
        aria-label="Закрыть просмотр фото"
        className="absolute top-[14px] right-[14px] w-[38px] h-[38px] border-none rounded-full bg-[rgba(255,255,255,0.16)] text-white text-[26px] leading-none cursor-pointer flex items-center justify-center z-[1]"
      >
        ×
      </button>
      {canNavigate ? (
        <>
          <button
            ref={prevButtonRef}
            type="button"
            onClick={onPrev}
            aria-label="Предыдущее фото"
            className="absolute left-[12px] top-1/2 z-[1] w-[34px] h-[34px] -translate-y-1/2 border-none rounded-full bg-[rgba(255,255,255,0.18)] text-white text-[24px] leading-none cursor-pointer flex items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,0.24)]"
          >
            ‹
          </button>
          <button
            ref={nextButtonRef}
            type="button"
            onClick={onNext}
            aria-label="Следующее фото"
            className="absolute right-[12px] top-1/2 z-[1] w-[34px] h-[34px] -translate-y-1/2 border-none rounded-full bg-[rgba(255,255,255,0.18)] text-white text-[24px] leading-none cursor-pointer flex items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,0.24)]"
          >
            ›
          </button>
        </>
      ) : null}
      {url ? (
        <img
          src={url}
          alt={name + " photo full size"}
          className="relative max-w-full max-h-full object-contain rounded-[12px] shadow-[0_18px_50px_rgba(0,0,0,0.45)]"
        />
      ) : (
        <div className="rounded-[12px] bg-white px-[18px] py-[14px] text-[13px] font-semibold text-ink">
          Фото недоступно
        </div>
      )}
    </div>
  );
}

function PhotoThumb({
  id,
  idx,
  isFloorPlan,
  name,
  onOpen,
}: {
  id: string;
  idx: number;
  isFloorPlan: boolean;
  name: string;
  onOpen: () => void;
}) {
  const url = usePhotoUrl(id);
  return (
    <div
      className="relative w-[78px] h-[78px] rounded-[9px] overflow-hidden bg-[#efedf3]"
      style={{ border: "1px solid " + (isFloorPlan ? ACCENT : "#e6e3ee") }}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={"Открыть фото целиком: " + name}
        className="w-full h-full border-none p-0 bg-transparent cursor-pointer block"
      >
        {url ? (
          <img src={url} alt={name + " photo"} className="w-full h-full object-cover block" />
        ) : null}
      </button>
      <button
        type="button"
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
        type="button"
        onClick={() => actions.removePhoto(idx)}
        aria-label="Удалить фото"
        className="absolute top-[3px] right-[3px] w-[20px] h-[20px] border-none rounded-full bg-[rgba(20,10,30,0.6)] text-white text-[12px] leading-none cursor-pointer"
      >
        ×
      </button>
    </div>
  );
}

export function PhotosSection({
  av,
  photoOrder,
}: {
  av: Visit;
  photoOrder: { src: string; i: number }[];
}) {
  const [openPhotoId, setOpenPhotoId] = useState<string | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const photoName = av.name || "Apartment";
  const openPhotoIndex = openPhotoId
    ? photoOrder.findIndex(({ src }) => src === openPhotoId)
    : -1;
  const hasMultiplePhotos = photoOrder.length > 1;
  const showNextPhoto = () => {
    if (!hasMultiplePhotos || openPhotoIndex < 0) return;
    const next = photoOrder[(openPhotoIndex + 1) % photoOrder.length];
    setOpenPhotoId(next.src);
  };
  const showPrevPhoto = () => {
    if (!hasMultiplePhotos || openPhotoIndex < 0) return;
    const prev = photoOrder[(openPhotoIndex - 1 + photoOrder.length) % photoOrder.length];
    setOpenPhotoId(prev.src);
  };
  const closeLightbox = () => {
    setOpenPhotoId(null);
    openerRef.current?.focus();
  };

  return (
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
            name={photoName}
            onOpen={() => {
              openerRef.current = document.activeElement instanceof HTMLButtonElement ? document.activeElement : null;
              setOpenPhotoId(src);
            }}
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
          type="button"
          onClick={() => void actions.pasteFromClipboard()}
          className="w-[78px] h-[78px] rounded-[9px] border-[1.5px] border-dashed border-[#cdc8da] bg-soft flex flex-col items-center justify-center gap-[3px] cursor-pointer text-muted-2 text-[11px] font-semibold"
        >
          <span className="text-[18px] leading-none text-faint">⎘</span>Вставить
        </button>
      </div>
      {openPhotoId && openPhotoIndex >= 0 ? (
        <PhotoLightbox
          id={openPhotoId}
          name={photoName}
          canNavigate={hasMultiplePhotos}
          onClose={closeLightbox}
          onNext={showNextPhoto}
          onPrev={showPrevPhoto}
        />
      ) : null}
    </div>
  );
}
