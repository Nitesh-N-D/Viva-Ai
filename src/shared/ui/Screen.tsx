import React from "react";
import { voiceEngine } from "../voice/VoiceEngine";
import { t, useLangStore } from "../../i18n";

interface ScreenProps {
  title: string;
  speakText?: string; // full narration for this screen, read aloud on demand
  onBack?: () => void;
  children: React.ReactNode;
}

// Every screen gets: a back button, a persistent "speak this screen"
// control, and an offline banner when relevant — per UI/UX guidelines.
export function Screen({ title, speakText, onBack, children }: ScreenProps) {
  const lang = useLangStore((s) => s.lang);
  const isOffline = typeof navigator !== "undefined" && !navigator.onLine;

  return (
    <div className="min-h-screen bg-soil-50 flex flex-col">
      <header className="flex items-center justify-between p-4 bg-leaf-600 text-white">
        {onBack ? (
          <button onClick={onBack} className="text-2xl px-2" aria-label={t("common.back")}>
            ←
          </button>
        ) : (
          <span className="w-8" />
        )}
        <h1 className="font-display font-bold text-xl">{title}</h1>
        <button
          onClick={() => speakText && voiceEngine.speak(speakText, lang)}
          className="text-2xl px-2"
          aria-label={t("common.speakScreen")}
          title={t("common.speakScreen")}
        >
          🔊
        </button>
      </header>

      {isOffline && (
        <div className="bg-ember-400/20 text-ember-600 text-center text-sm py-1">
          {t("common.offline")}
        </div>
      )}

      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
