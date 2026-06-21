import React, { useRef, useState } from "react";
import { Screen } from "../../../shared/ui/Screen";
import { Button } from "../../../shared/ui/Button";
import { voiceEngine } from "../../../shared/voice/VoiceEngine";
import { classifyDisease, type ClassificationResult } from "../../../lib/mockModel";
import { t, useLangStore } from "../../../i18n";

interface DiseaseScanProps {
  onDetected: (label: string) => void;
  onBack: () => void;
}

export function DiseaseScan({ onDetected, onBack }: DiseaseScanProps) {
  const lang = useLangStore((s) => s.lang);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [streaming, setStreaming] = useState(false);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStreaming(true);
      }
    } catch {
      voiceEngine.speak("கேமரா அனுமதி தேவை", lang);
    }
  }

  async function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const classification = await classifyDisease(imageData);
    setResult(classification);

    if (classification.label === "ஆரோக்கியம்") {
      await voiceEngine.speak(t("diseaseScan.healthy"), lang);
    } else {
      await voiceEngine.speak(t("diseaseScan.remedyFound"), lang);
    }
  }

  return (
    <Screen title={t("diseaseScan.title")} onBack={onBack}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-full max-w-sm aspect-square bg-soil-100 rounded-tile overflow-hidden flex items-center justify-center">
          {!streaming && <Button onClick={startCamera}>கேமரா திற</Button>}
          <video ref={videoRef} className={streaming ? "w-full h-full object-cover" : "hidden"} muted playsInline />
        </div>
        <canvas ref={canvasRef} className="hidden" />
        {streaming && <Button onClick={capture}>புகைப்படம் எடு</Button>}

        {result && (
          <div className="bg-leaf-400/15 rounded-tile p-4 w-full max-w-sm text-center">
            <p className="font-display font-bold text-leaf-800">{result.label}</p>
            {result.label !== "ஆரோக்கியம்" && (
              <Button className="mt-3" onClick={() => onDetected(result.label)}>
                இயற்கை மருந்து பார்க்க →
              </Button>
            )}
          </div>
        )}
      </div>
    </Screen>
  );
}
