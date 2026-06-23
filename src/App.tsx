import { useEffect, useRef } from "react";
import { activeVisit, useApp } from "./store";
import Header from "./components/Header";
import BottomNav from "./components/BottomNav";
import ApartmentsScreen from "./components/screens/ApartmentsScreen";
import CompareScreen from "./components/screens/CompareScreen";
import ChecklistScreen from "./components/screens/ChecklistScreen";
import TagsScreen from "./components/screens/TagsScreen";
import RedFlagsScreen from "./components/screens/RedFlagsScreen";
import DetailScreen from "./components/screens/DetailScreen";

function TabContent() {
  const s = useApp();
  switch (s.screen) {
    case "compare":
      return <CompareScreen />;
    case "checklist":
      return <ChecklistScreen />;
    case "tags":
      return <TagsScreen />;
    case "redflags":
      return <RedFlagsScreen />;
    default:
      return <ApartmentsScreen />;
  }
}

export default function App() {
  const s = useApp();
  const isDetail = s.screen === "detail" && !!activeVisit();

  // Focus management on screen transitions: when the view changes, move focus
  // to the top of the new view so keyboard/SR users don't drop to <body>.
  // Keyed on the actual screen value (tracked via a ref) so it fires only on a
  // real change, not on every render — and so StrictMode's double-invoke of the
  // effect doesn't re-steal focus on the same screen.
  const viewRef = useRef<HTMLDivElement>(null);
  const prevScreen = useRef<typeof s.screen | null>(null);
  useEffect(() => {
    if (prevScreen.current !== null && prevScreen.current !== s.screen) {
      viewRef.current?.focus();
    }
    prevScreen.current = s.screen;
  }, [s.screen]);

  return (
    <div className="min-h-screen bg-page flex justify-center">
      <div className="w-full max-w-[430px] h-screen bg-surface flex flex-col relative shadow-[0_0_40px_rgba(40,20,80,0.10)]">
        {isDetail ? (
          <div ref={viewRef} tabIndex={-1} className="flex flex-col h-full outline-none">
            <DetailScreen />
          </div>
        ) : (
          <div ref={viewRef} tabIndex={-1} className="flex flex-col h-full outline-none">
            <Header />
            <div className="flex-1 overflow-auto [-webkit-overflow-scrolling:touch]">
              <TabContent />
            </div>
            <BottomNav />
          </div>
        )}
      </div>
    </div>
  );
}
