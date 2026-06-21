import React, { useState } from "react";
import { VoiceCapture } from "./voice-capture/VoiceCapture";
import { SketchView } from "./sketch-render/SketchView";
import type { FabricationIntent } from "../../types";

interface FabricationHomeProps {
  location: { lat: number; lng: number };
  onExit: () => void;
}

type Step = { name: "capture" } | { name: "sketch"; intent: FabricationIntent };

export function FabricationHome({ location, onExit }: FabricationHomeProps) {
  const [step, setStep] = useState<Step>({ name: "capture" });

  if (step.name === "capture") {
    return (
      <VoiceCapture
        onIntentReady={(intent) => setStep({ name: "sketch", intent })}
        onBack={onExit}
      />
    );
  }

  return (
    <SketchView
      intent={step.intent}
      location={location}
      onBack={() => setStep({ name: "capture" })}
    />
  );
}
