import React, { useRef, useState } from "react";
import { Screen } from "../../../shared/ui/Screen";
import { Button } from "../../../shared/ui/Button";
import { voiceEngine } from "../../../shared/voice/VoiceEngine";
import { classifySoil, type ClassificationResult } from "../../../lib/mockModel";
import { enqueue } from "../../../shared/offline-sync/SyncQueue";
import { t, useLangStore } from "../../../i18n";

interface SoilScanProps {
  location: { lat: number; lng: number };
  onClassified: (soilType: string) => void;
  onBack: () => void;
}

const CONFIDENCE_THRESHOLD = 0.6;

// Rounds GPS to ~1km precision before it ever leaves this component — the
// crowd-sourced dataset never sees an exact point. See spec Section 5.7.
function toGeoTile(lat: number, lng: number): string {
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

export function SoilScan({ location, onClassified, onBack }: SoilScanProps) {
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

    const classification = await classifySoil(imageData);
    setResult(classification);

    if (classification.confidence < CONFIDENCE_THRESHOLD) {
      voiceEngine.speak(t("soilScan.retake"), lang);
      return;
    }

    await voiceEngine.speak(t("soilScan.result", { soilType: classification.label }), lang);

    await enqueue("soilScans", {
      geoTile: toGeoTile(location.lat, location.lng),
      soilType: classification.label,
      confidence: classification.confidence,
      timestamp: Date.now(),
    });
  }

  return (
    <Screen title={t("soilScan.title")} speakText={t("soilScan.instruction")} onBack={onBack}>
      <div className="flex flex-col items-center gap-4">
        <p className="text-soil-700 text-center">{t("soilScan.instruction")}</p>

        <div className="w-full max-w-sm aspect-square bg-soil-100 rounded-tile overflow-hidden flex items-center justify-center">
          {!streaming && (
            <Button onClick={startCamera}>கேமரா திற</Button>
          )}
          <video ref={videoRef} className={streaming ? "w-full h-full object-cover" : "hidden"} muted playsInline />
        </div>
        <canvas ref={canvasRef} className="hidden" />

        {streaming && <Button onClick={capture}>புகைப்படம் எடு</Button>}

        {result && (
          <div className="bg-leaf-400/15 rounded-tile p-4 w-full max-w-sm text-center">
            <p className="font-display font-bold text-leaf-800">
              {t("soilScan.result", { soilType: result.label })}
            </p>
            <p className="text-xs text-soil-600">
              {result.modelSource === "mock"
                ? "(டெமோ மதிப்பீடு — பயிற்சி பெற்ற மாடல் இன்னும் இல்லை)"
                : `நம்பகத்தன்மை: ${Math.round(result.confidence * 100)}%`}
            </p>
            {result.confidence >= CONFIDENCE_THRESHOLD && (
              <Button className="mt-3" onClick={() => onClassified(result.label)}>
                பயிர் பரிந்துரை பார்க்க →
              </Button>
            )}
          </div>
        )}
      </div>
    </Screen>
  );
}
