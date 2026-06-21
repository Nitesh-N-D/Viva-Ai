import React, { useEffect, useState } from "react";
import { Onboarding } from "./modules/farm/onboarding/Onboarding";
import { HomeScreen, type HomeDestination } from "./app/HomeScreen";
import { SoilScan } from "./modules/farm/soil-scan/SoilScan";
import { CropRecommend } from "./modules/farm/crop-recommend/CropRecommend";
import { AvatarScreen } from "./modules/farm/avatar/AvatarScreen";
import { DiseaseScan } from "./modules/farm/disease-scan/DiseaseScan";
import { RemedyView } from "./modules/farm/remedies/RemedyView";
import { MandiPrices } from "./modules/farm/mandi-prices/MandiPrices";
import { SoilMap } from "./modules/farm/soil-map/SoilMap";
import { FabricationHome } from "./modules/fabrication/FabricationHome";
import { Screen } from "./shared/ui/Screen";
import { Button } from "./shared/ui/Button";
import { ensureAnonymousAuth, writeQueuedItem } from "./lib/firebase";
import { registerAutoFlush } from "./shared/offline-sync/SyncQueue";
import type { WeatherSnapshot } from "./lib/weather";
import type { CropRecommendation } from "./types";

type View =
  | { name: "onboarding" }
  | { name: "home" }
  | { name: "soilScan" }
  | { name: "cropRecommend"; soilType: string }
  | { name: "myFarm" }
  | { name: "diseaseScan" }
  | { name: "remedy"; diseaseLabel: string }
  | { name: "mandiPrices" }
  | { name: "soilMap" }
  | { name: "maker" }
  | { name: "needCropFirst" };

function NeedCropFirst({ onScanSoil, onBack }: { onScanSoil: () => void; onBack: () => void }) {
  return (
    <Screen title="முதலில் மண் பரிசோதனை செய்யவும்" onBack={onBack}>
      <div className="flex flex-col items-center gap-4 mt-8">
        <p className="text-soil-700 text-center">
          பயிர் பரிந்துரை இல்லாமல் இந்த பக்கத்தை பார்க்க முடியாது. முதலில் மண் பரிசோதனை செய்யவும்.
        </p>
        <Button onClick={onScanSoil}>மண் பரிசோதனைக்கு செல்</Button>
      </div>
    </Screen>
  );
}

export default function App() {
  const [view, setView] = useState<View>({ name: "onboarding" });
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [activeCrop, setActiveCrop] = useState<{ rec: CropRecommendation; plantedAt: number } | null>(null);

  // App-wide startup: anonymous auth + auto-flush of anything queued while
  // offline. Failing silently here is intentional — the app must work
  // with zero Firebase config (see lib/firebase.ts isFirebaseConfigured).
  useEffect(() => {
    ensureAnonymousAuth();
    registerAutoFlush(writeQueuedItem);
  }, []);

  if (view.name === "onboarding") {
    return (
      <Onboarding
        onComplete={(loc, w) => {
          setLocation(loc);
          setWeather(w);
          setView({ name: "home" });
        }}
      />
    );
  }

  if (!location || !weather) {
    // Shouldn't normally happen post-onboarding, but keeps every screen
    // below type-safe without optional chaining everywhere.
    return <Onboarding onComplete={(loc, w) => { setLocation(loc); setWeather(w); setView({ name: "home" }); }} />;
  }

  function handleHomeNavigate(dest: HomeDestination) {
    if (dest === "myFarm") {
      if (!activeCrop) {
        setView({ name: "needCropFirst" });
      } else {
        setView({ name: "myFarm" });
      }
      return;
    }
    if (dest === "mandiPrices" && !activeCrop) {
      setView({ name: "needCropFirst" });
      return;
    }
    // At this point `dest` is narrowed to exactly the View union's other
    // literal name members ("soilScan" | "diseaseScan" | "mandiPrices" |
    // "soilMap" | "maker"), so this assignment type-checks cleanly —
    // unlike the previous version, which tried to pass the *original*,
    // still-widened HomeDestination type straight into setView after an
    // early-return that TypeScript couldn't use to narrow the later
    // reference to `dest` in the closure.
    switch (dest) {
  case "soilScan":
    setView({ name: "soilScan" });
    break;
  case "diseaseScan":
    setView({ name: "diseaseScan" });
    break;
  case "mandiPrices":
    setView({ name: "mandiPrices" });
    break;
  case "soilMap":
    setView({ name: "soilMap" });
    break;
  case "maker":
    setView({ name: "maker" });
    break;
}
  }

  switch (view.name) {
    case "home":
      return <HomeScreen hasActiveCrop={Boolean(activeCrop)} onNavigate={handleHomeNavigate} />;

    case "needCropFirst":
      return (
        <NeedCropFirst
          onScanSoil={() => setView({ name: "soilScan" })}
          onBack={() => setView({ name: "home" })}
        />
      );

    case "soilScan":
      return (
        <SoilScan
          location={location}
          onBack={() => setView({ name: "home" })}
          onClassified={(soilType) => setView({ name: "cropRecommend", soilType })}
        />
      );

    case "cropRecommend":
      return (
        <CropRecommend
          soilType={view.soilType}
          weather={weather}
          onBack={() => setView({ name: "home" })}
          onSelectCrop={(rec) => {
            setActiveCrop({ rec, plantedAt: Date.now() });
            setView({ name: "myFarm" });
          }}
        />
      );

    case "myFarm":
      if (!activeCrop) {
        return <NeedCropFirst onScanSoil={() => setView({ name: "soilScan" })} onBack={() => setView({ name: "home" })} />;
      }
      return (
        <AvatarScreen
          recommendation={activeCrop.rec}
          plantedAt={activeCrop.plantedAt}
          onBack={() => setView({ name: "home" })}
        />
      );

    case "diseaseScan":
      return (
        <DiseaseScan
          onBack={() => setView({ name: "home" })}
          onDetected={(label) => setView({ name: "remedy", diseaseLabel: label })}
        />
      );

    case "remedy":
      return <RemedyView diseaseLabel={view.diseaseLabel} onBack={() => setView({ name: "diseaseScan" })} />;

   case "mandiPrices":
   window.open("https://agmarknet.gov.in", "_blank");
  setView({ name: "home" });
  return null;

    case "soilMap":
      return <SoilMap onBack={() => setView({ name: "home" })} />;

    case "maker":
      return <FabricationHome location={location} onExit={() => setView({ name: "home" })} />;

    default:
      return <HomeScreen hasActiveCrop={Boolean(activeCrop)} onNavigate={handleHomeNavigate} />;
  }
}
