import React from "react";
import { IconTile } from "../shared/ui/IconTile";
import { Avatar } from "../shared/ui/Avatar";
import { useLangStore, t } from "../i18n";

export type HomeDestination =
  | "soilScan"
  | "diseaseScan"
  | "mandiPrices"
  | "soilMap"
  | "maker"
  | "myFarm";

interface HomeScreenProps {
  hasActiveCrop: boolean;
  onNavigate: (dest: HomeDestination) => void;
}

export function HomeScreen({ hasActiveCrop, onNavigate }: HomeScreenProps) {
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);

  return (
    <div className="min-h-screen bg-soil-50 flex flex-col">
      <header className="flex items-center justify-between p-4">
        <h1 className="font-display font-bold text-2xl text-leaf-800">{t("appName")}</h1>
        <button
          onClick={() => setLang(lang === "ta" ? "en" : "ta")}
          className="text-sm font-semibold border-2 border-leaf-600 text-leaf-800 rounded-tile px-3 py-1"
        >
          {lang === "ta" ? "EN" : "தமிழ்"}
        </button>
      </header>

      <div className="flex justify-center -mt-2 mb-2">
        <Avatar skin="farm" />
      </div>

      <main className="grid grid-cols-2 gap-4 p-4">
        {hasActiveCrop && (
          <div className="col-span-2">
            <IconTile label={t("home.myFarm")} icon="🌱" accent="leaf" onClick={() => onNavigate("myFarm")} />
          </div>
        )}
        <IconTile label={t("home.soilScan")} icon="📷" accent="leaf" onClick={() => onNavigate("soilScan")} />
        <IconTile label={t("home.diseaseScan")} icon="🍃" accent="leaf" onClick={() => onNavigate("diseaseScan")} />
        <IconTile label={t("home.mandiPrices")} icon="₹" accent="leaf" onClick={() => onNavigate("mandiPrices")} />
        <IconTile label={t("home.soilMap")} icon="🗺️" accent="leaf" onClick={() => onNavigate("soilMap")} />
        <div className="col-span-2">
          <IconTile label={t("home.makerMode")} icon="🔧" accent="steel" onClick={() => onNavigate("maker")} />
        </div>
      </main>
    </div>
  );
}
