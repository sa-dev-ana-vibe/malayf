import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/**
 * Top-level error boundary (§10). A render-time throw anywhere in the tree shows
 * a recoverable fallback instead of a white screen — and reassures the user that
 * their data is safe (it lives in localStorage + IndexedDB, untouched by a render
 * crash) with a path forward (reload).
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("MALAYF crashed during render:", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="min-h-screen bg-page flex justify-center">
        <div className="w-full max-w-[430px] h-screen bg-surface flex flex-col items-center justify-center gap-[14px] px-[32px] text-center">
          <div className="w-[56px] h-[56px] rounded-[14px] bg-[#fbeceb] flex items-center justify-center text-[26px] text-fail">
            ⚠
          </div>
          <div className="text-[16px] font-bold">Что-то пошло не так</div>
          <div className="text-[13px] text-muted-2 leading-[1.5] max-w-[260px]">
            Приложение зависло, но ваши данные сохранены локально и в безопасности.
            Перезагрузите страницу, чтобы продолжить.
          </div>
          <button
            onClick={() => window.location.reload()}
            className="bg-accent text-white border-none rounded-[8px] px-[16px] py-[10px] text-[13px] font-bold cursor-pointer"
          >
            Перезагрузить
          </button>
        </div>
      </div>
    );
  }
}
