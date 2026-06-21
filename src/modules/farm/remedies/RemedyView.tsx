import React, { useEffect, useMemo } from "react";
import { Screen } from "../../../shared/ui/Screen";
import { voiceEngine } from "../../../shared/voice/VoiceEngine";
import remedies from "../data/remedies.json";
import type { RemedyEntry } from "../../../types";
import { useLangStore } from "../../../i18n";

interface RemedyViewProps {
  diseaseLabel: string;
  onBack: () => void;
}

const remedyList = remedies as RemedyEntry[];

// Disease classifier labels map 1:1 to a remedy entry's pestOrDiseaseTa
// field. If a future model adds new disease classes, add a matching
// remedy entry to data/remedies.json — the lookup itself needs no change.
function findRemedy(diseaseLabel: string): RemedyEntry | undefined {
  return remedyList.find((r) => r.pestOrDiseaseTa === diseaseLabel);
}

export function RemedyView({ diseaseLabel, onBack }: RemedyViewProps) {
  const lang = useLangStore((s) => s.lang);
  const remedy = useMemo(() => findRemedy(diseaseLabel), [diseaseLabel]);

  const narration = remedy
    ? [remedy.pestOrDiseaseTa, ...remedy.stepsTa, remedy.frequencyTa].join(". ")
    : "இந்த நோய்க்கு இயற்கை மருந்து இன்னும் சேர்க்கப்படவில்லை";

  useEffect(() => {
    voiceEngine.speak(narration, lang);
  }, [narration, lang]);

  if (!remedy) {
    return (
      <Screen title={diseaseLabel} onBack={onBack} speakText={narration}>
        <p className="text-soil-700">{narration}</p>
      </Screen>
    );
  }

  return (
    <Screen title={remedy.pestOrDiseaseTa} onBack={onBack} speakText={narration}>
      <div className="flex flex-col gap-4">
        <section>
          <p className="font-display font-bold text-leaf-800 mb-1">தேவையான பொருட்கள்</p>
          <ul className="list-disc list-inside text-soil-700">
            {remedy.ingredients.map((ing, i) => (
              <li key={i}>
                {ing.nameTa} — {ing.quantity}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <p className="font-display font-bold text-leaf-800 mb-1">செய்முறை</p>
          <ol className="list-decimal list-inside text-soil-700">
            {remedy.stepsTa.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </section>
        <section className="bg-leaf-400/15 rounded-tile p-3">
          <p className="text-leaf-800 font-semibold">எத்தனை முறை: {remedy.frequencyTa}</p>
        </section>
      </div>
    </Screen>
  );
}
