import React, { useEffect, useState } from "react";
import { Screen } from "../../../shared/ui/Screen";
import { Button } from "../../../shared/ui/Button";
import { Avatar } from "../../../shared/ui/Avatar";
import { voiceEngine } from "../../../shared/voice/VoiceEngine";
import { getWeather, type WeatherSnapshot } from "../../../lib/weather";
import { t, useLangStore } from "../../../i18n";

interface OnboardingProps {
  onComplete: (location: { lat: number; lng: number }, weather: WeatherSnapshot) => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const lang = useLangStore((s) => s.lang);
  const [status, setStatus] = useState<"idle" | "requesting" | "fetching" | "error">("idle");

  useEffect(() => {
    voiceEngine.speak(t("greeting"), lang);
  }, [lang]);

  async function handleAllow() {
    setStatus("requesting");
    if (!("geolocation" in navigator)) {
      setStatus("error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setStatus("fetching");
        const { latitude, longitude } = pos.coords;
        const weather = await getWeather(latitude, longitude);
        onComplete({ lat: latitude, lng: longitude }, weather);
      },
      () => setStatus("error"),
      { timeout: 8000 }
    );
  }

  return (
    <Screen title={t("appName")} speakText={t("greeting")}>
      <div className="flex flex-col items-center gap-6 mt-8">
        <Avatar skin="farm" />
        <p className="text-center font-display text-lg text-soil-900">{t("greeting")}</p>
        <p className="text-center text-sm text-soil-600">{t("locationPermissionReason")}</p>
        <Button onClick={handleAllow} disabled={status === "requesting" || status === "fetching"}>
          {status === "fetching" ? "..." : "சரி, அனுமதிக்கிறேன்"}
        </Button>
        {status === "error" && (
          <p className="text-ember-600 text-sm text-center">
            இடத்தை கண்டுபிடிக்க முடியவில்லை — பின்னர் முயற்சிக்கவும்
          </p>
        )}
      </div>
    </Screen>
  );
}
