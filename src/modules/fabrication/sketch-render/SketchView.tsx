import React, { useEffect, useMemo } from "react";
import { Screen } from "../../../shared/ui/Screen";
import { voiceEngine } from "../../../shared/voice/VoiceEngine";
import { generateSketch } from "../shape-library/shapeTemplates";
import { reportSketchCompleted } from "../../../shared/avatar-engine/AvatarEngine";
import { enqueue } from "../../../shared/offline-sync/SyncQueue";
import { ShareButton } from "../share/ShareButton";
import type { FabricationIntent } from "../../../types";
import { t, useLangStore } from "../../../i18n";

interface SketchViewProps {
  intent: FabricationIntent;
  location: { lat: number; lng: number };
  onBack: () => void;
}

function toGeoTile(lat: number, lng: number): string {
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

export function SketchView({ intent, location, onBack }: SketchViewProps) {
  const lang = useLangStore((s) => s.lang);
  const result = useMemo(() => generateSketch(intent), [intent]);

  const narration = [
    t("maker.sketchReady"),
    ...result.materialsListTa,
    `மதிப்பிடப்பட்ட எடை ${result.estimatedWeightKg} கிலோ`,
  ].join(". ");

  useEffect(() => {
    voiceEngine.speak(narration, lang);
    reportSketchCompleted();
    enqueue("fabricationRequests", {
      geoTile: toGeoTile(location.lat, location.lng),
      shapeType: intent.shapeType,
      objectType: intent.holds.objectType,
      timestamp: Date.now(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Screen title={t("maker.sketchReady")} onBack={onBack} speakText={narration}>
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-full max-w-sm bg-white rounded-tile border-2 border-steel-600 p-2"
          dangerouslySetInnerHTML={{ __html: result.svg }}
        />

        <div className="w-full max-w-sm bg-steel-400/15 rounded-tile p-4">
          <p className="font-display font-bold text-steel-800 mb-2">தேவையான பொருட்கள்</p>
          <ul className="list-disc list-inside text-soil-700">
            {result.materialsListTa.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
          <p className="text-sm text-soil-600 mt-2">மதிப்பிடப்பட்ட எடை: {result.estimatedWeightKg} கிலோ</p>
        </div>

        <ShareButton sketchSvg={result.svg} materialsListTa={result.materialsListTa} />
      </div>
    </Screen>
  );
}
