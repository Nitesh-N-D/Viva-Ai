import React, { useMemo, useState } from "react";
import { Screen } from "../../../shared/ui/Screen";
import { Button } from "../../../shared/ui/Button";
import { Avatar } from "../../../shared/ui/Avatar";
import { voiceEngine } from "../../../shared/voice/VoiceEngine";
import {
  reportGrowthOnTrack,
  reportGrowthLagging,
  reportHarvestReady,
} from "../../../shared/avatar-engine/AvatarEngine";
import type { CropRecommendation } from "../../../types";
import { useLangStore } from "../../../i18n";

interface AvatarScreenProps {
  recommendation: CropRecommendation;
  plantedAt: number; // epoch ms, set when the farmer confirms planting date
  onBack: () => void;
}

function currentStage(rec: CropRecommendation, daysSincePlanting: number) {
  const stages = rec.crop.stages;
  let active = stages[0];
  for (const stage of stages) {
    if (daysSincePlanting >= stage.day) active = stage;
  }
  return active;
}

export function AvatarScreen({ recommendation, plantedAt, onBack }: AvatarScreenProps) {
  const lang = useLangStore((s) => s.lang);
  const daysSincePlanting = Math.floor((Date.now() - plantedAt) / 86_400_000);
  const stage = useMemo(() => currentStage(recommendation, daysSincePlanting), [recommendation, daysSincePlanting]);
  const [reported, setReported] = useState<"none" | "ontrack" | "lagging">("none");

  function reportOnTrack() {
    reportGrowthOnTrack();
    setReported("ontrack");
    if (daysSincePlanting >= recommendation.crop.growthDays) reportHarvestReady();
  }

  function reportLagging() {
    reportGrowthLagging(stage.tipTa);
    setReported("lagging");
    voiceEngine.speak(stage.tipTa, lang);
  }

  return (
    <Screen title={recommendation.crop.nameTa} speakText={stage.tipTa} onBack={onBack}>
      <div className="flex flex-col items-center gap-4">
        <Avatar skin="farm" />
        <p className="font-display font-bold text-lg text-leaf-800">{stage.nameTa}</p>
        <p className="text-sm text-soil-600">{daysSincePlanting} நாட்கள் ஆகிறது</p>

        <div className="w-full max-w-sm bg-soil-100 rounded-tile p-3">
          <p className="text-sm text-soil-800">இன்றைய குறிப்பு: {stage.tipTa}</p>
        </div>

        <div className="w-full max-w-sm flex flex-col gap-2 mt-2">
          <p className="text-center text-sm text-soil-600">உங்க பயிர் இந்த நிலையில் இருக்கா?</p>
          <div className="flex gap-3">
            <Button className="flex-1" onClick={reportOnTrack}>ஆமா, நல்லா இருக்கு</Button>
            <Button className="flex-1" variant="secondary" onClick={reportLagging}>
              இல்ல, பின்னாடி இருக்கு
            </Button>
          </div>
        </div>

        {reported === "lagging" && (
          <div className="bg-ember-400/15 rounded-tile p-3 w-full max-w-sm text-center">
            <p className="text-ember-600 text-sm">{stage.tipTa}</p>
          </div>
        )}

        <div className="w-full max-w-sm mt-4">
          <p className="text-xs text-soil-500 mb-2">வளர்ச்சி கால அட்டவணை</p>
          <ol className="border-l-2 border-leaf-600 pl-4 flex flex-col gap-2">
            {recommendation.crop.stages.map((s) => (
              <li key={s.day} className={daysSincePlanting >= s.day ? "text-leaf-800 font-semibold" : "text-soil-400"}>
                {s.day} நாள் — {s.nameTa}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Screen>
  );
}
