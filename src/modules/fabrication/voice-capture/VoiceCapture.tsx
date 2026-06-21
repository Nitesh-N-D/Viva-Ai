import React, { useState } from "react";
import { Screen } from "../../../shared/ui/Screen";
import { Button } from "../../../shared/ui/Button";
import { Avatar } from "../../../shared/ui/Avatar";
import { voiceEngine } from "../../../shared/voice/VoiceEngine";
import { extractIntent, extractIntentWithLLM } from "../intent-extraction/extractIntent";
import type { FabricationIntent } from "../../../types";
import { t, useLangStore } from "../../../i18n";

interface VoiceCaptureProps {
  onIntentReady: (intent: FabricationIntent) => void;
  onBack: () => void;
}

/**
 * Tries the optional LLM-backed extractor first (only if
 * VITE_LLM_EXTRACTION_ENABLED is on and a backend proxy is configured —
 * see extractIntentWithLLM's own guard clauses), and ALWAYS falls back to
 * the rule-based extractor on any failure. The user never sees a
 * difference between the two paths beyond accuracy.
 */
async function resolveIntent(text: string): Promise<FabricationIntent> {
  const llmResult = await extractIntentWithLLM(text);
  return llmResult ?? extractIntent(text);
}

export function VoiceCapture({ onIntentReady, onBack }: VoiceCaptureProps) {
  const lang = useLangStore((s) => s.lang);
  const [phase, setPhase] = useState<"idle" | "listening" | "clarifying" | "thinking">("idle");
  const [transcript, setTranscript] = useState("");

  async function startListening() {
    setPhase("listening");
    const heard = await voiceEngine.listen(lang);

    if (!heard) {
      // No STT available on this device — fall back to typed input rather
      // than dead-ending the flow.
      setPhase("idle");
      return;
    }

    setTranscript(heard);
    setPhase("thinking");
    const intent = await resolveIntent(heard);

    if (intent.missingField === "estimatedLoadKg") {
      setPhase("clarifying");
      await voiceEngine.speak(t("maker.clarify"), lang);
      const clarifyAnswer = await voiceEngine.listen(lang);
      setPhase("thinking");
      const merged = await resolveIntent(`${heard} ${clarifyAnswer}`);
      onIntentReady(merged);
    } else {
      onIntentReady(intent);
    }
  }

  return (
    <Screen title={t("maker.title")} onBack={onBack}>
      <div className="flex flex-col items-center gap-6 mt-6">
        <Avatar skin="maker" />
        <p className="text-soil-700 text-center text-sm">
          உதாரணம்: "2 இன்ச் பைப்பை இந்த கோணத்தில் பிடிக்க bracket வேணும்"
        </p>
        <Button onClick={startListening} disabled={phase !== "idle"}>
          {phase === "listening"
            ? t("maker.listening")
            : phase === "thinking"
              ? "..."
              : phase === "clarifying"
                ? t("maker.clarify")
                : t("maker.pressToSpeak")}
        </Button>
        {transcript && (
          <p className="text-xs text-soil-500 text-center">கேட்டது: "{transcript}"</p>
        )}

        {/* Typed fallback — always available, since browser STT support
            for ta-IN varies a lot across low-end Android devices. */}
        <details className="w-full max-w-sm">
          <summary className="text-sm text-leaf-600 text-center cursor-pointer">பேச முடியாதா? இங்கே தட்டச்சு செய்யவும்</summary>
          <TypedFallback onSubmit={async (text) => onIntentReady(await resolveIntent(text))} />
        </details>
      </div>
    </Screen>
  );
}

function TypedFallback({ onSubmit }: { onSubmit: (text: string) => Promise<void> }) {
  const [text, setText] = useState("");
  return (
    <div className="flex gap-2 mt-2">
      <input
        className="flex-1 border-2 border-soil-100 rounded-tile px-3 py-2"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="2 இன்ச் பைப் bracket..."
      />
      <Button onClick={() => onSubmit(text)} disabled={!text}>
        சரி
      </Button>
    </div>
  );
}
