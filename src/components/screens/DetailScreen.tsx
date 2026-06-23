import { useEffect } from "react";
import { useApp, actions, activeVisit } from "../../store";
import { scoreVisit, weightedScore } from "../../lib/scoring";
import { numPrice, numArea, numPpm, visitDates, fmtRu } from "../../lib/format";
import { TopBar } from "./detail/TopBar";
import { PriceBlock } from "./detail/PriceBlock";
import { ScoreHeader } from "./detail/ScoreHeader";
import { AddressSection } from "./detail/AddressSection";
import { LinksSection } from "./detail/LinksSection";
import { ParamsSection } from "./detail/ParamsSection";
import { InvestmentsSection } from "./detail/InvestmentsSection";
import { TagsSection } from "./detail/TagsSection";
import { RedFlagsSection } from "./detail/RedFlagsSection";
import { ContactsSection } from "./detail/ContactsSection";
import { DatesSection } from "./detail/DatesSection";
import { PhotosSection } from "./detail/PhotosSection";
import { ChecklistSection } from "./detail/ChecklistSection";
import { NotesSection } from "./detail/NotesSection";

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
      <TopBar av={av} />
      <PriceBlock av={av} hasPpm={hasPpm} ppm={ppm} />
      <ScoreHeader sc={sc} ws={ws} />

      {/* scroll content */}
      <div className="flex-1 overflow-auto p-[14px] flex flex-col gap-[16px]">
        <AddressSection av={av} />
        <LinksSection av={av} editLinkId={s.editLinkId} />
        <ParamsSection av={av} />
        <InvestmentsSection av={av} hasPpmGood={hasPpmGood} ppmGood={ppmGood} />
        <TagsSection av={av} tags={s.tags} />
        <RedFlagsSection av={av} redFlagDefs={s.redFlagDefs} />
        <ContactsSection av={av} />
        <DatesSection dates={dates} />
        <PhotosSection av={av} photoOrder={photoOrder} />
        <ChecklistSection av={av} categories={s.categories} />
        <NotesSection av={av} />

        <div className="h-[8px]" />
      </div>
    </div>
  );
}
