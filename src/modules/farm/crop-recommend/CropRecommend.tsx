import React, { useEffect, useMemo, useState } from "react";
import { Screen } from "../../../shared/ui/Screen";
import { Button } from "../../../shared/ui/Button";
import { voiceEngine } from "../../../shared/voice/VoiceEngine";
import { recommendCrops } from "../cropEngine";
import type { WeatherSnapshot } from "../../../lib/weather";
import type { CropRecommendation } from "../../../types";
import { t, useLangStore } from "../../../i18n";

interface CropRecommendProps {
  soilType: string;
  weather: WeatherSnapshot;
  onSelectCrop: (rec: CropRecommendation) => void;
  onBack: () => void;
}

export function CropRecommend({ soilType, weather, onSelectCrop, onBack }: CropRecommendProps) {
  const lang = useLangStore((s) => s.lang);
  const recommendations = useMemo(
    () => recommendCrops(soilType, weather, weather.district),
    [soilType, weather]
  );
  const [spokenOnce, setSpokenOnce] = useState(false);

  useEffect(() => {
    if (!spokenOnce && recommendations.length) {
      voiceEngine.speak(recommendations[0].explanationTa, lang);
      setSpokenOnce(true);
    }
  }, [recommendations, spokenOnce, lang]);

  const fullNarration = recommendations.map((r) => r.explanationTa).join(". ");

  return (
    <Screen title={t("cropRecommend.title")} speakText={fullNarration} onBack={onBack}>
      <div className="flex flex-col gap-4">
        {recommendations.map((rec, idx) => (
          <button
            key={rec.crop.id}
            onClick={() => onSelectCrop(rec)}
            className="text-left bg-leaf-400/15 border-2 border-leaf-600 rounded-tile p-4 flex items-center justify-between"
          >
            <div>
              <p className="font-display font-bold text-lg text-leaf-800">
                {idx + 1}. {rec.crop.nameTa}
              </p>
              <p className="text-sm text-soil-700">{rec.explanationTa}</p>
              <p className="text-xs text-soil-500 mt-1">பொருத்தம்: {Math.round(rec.score * 100)}%</p>
            </div>
            <span className="text-2xl">→</span>
          </button>
        ))}
      </div>
    </Screen>
  );
}
