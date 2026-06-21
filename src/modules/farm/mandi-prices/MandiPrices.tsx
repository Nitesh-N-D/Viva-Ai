import React, { useEffect, useState } from "react";
import { Screen } from "../../../shared/ui/Screen";
import { voiceEngine } from "../../../shared/voice/VoiceEngine";
import { getMandiPrices, type MandiPrice } from "../../../lib/mandi";
import { t, useLangStore } from "../../../i18n";

interface MandiPricesProps {
  cropId: string;
  cropNameTa: string;
  district: string;
  onBack: () => void;
}

export function MandiPrices({ cropId, cropNameTa, district, onBack }: MandiPricesProps) {
  const lang = useLangStore((s) => s.lang);
  const [prices, setPrices] = useState<MandiPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<"live" | "cached" | "mock" | null>(null);

  useEffect(() => {
    setLoading(true);
    getMandiPrices(cropId, district).then((p) => {
      setPrices(p);
      setLoading(false);

      // Determine dominant source for banner
      if (p.length > 0) {
        const src = p[0].source;
        setDataSource(src);
      }

      const best = [...p].sort((a, b) => b.pricePerQuintal - a.pricePerQuintal)[0];
      if (best) {
        voiceEngine.speak(
          `${best.market} இல் ${cropNameTa} விலை குவிண்டாலுக்கு ${best.pricePerQuintal} ரூபாய்`,
          lang
        );
      }
    });
  }, [cropId, district, cropNameTa, lang]);

  const sourceLabel =
    dataSource === "live"
      ? { text: "🟢 நேரடி விலை தகவல்", cls: "bg-green-100 text-green-800" }
      : dataSource === "cached"
      ? { text: "🟡 சேமிக்கப்பட்ட தகவல் (சில மணி நேரம் பழையது)", cls: "bg-yellow-100 text-yellow-800" }
      : dataSource === "mock"
      ? { text: "ℹ️ மாதிரி தகவல் (இணைப்பு இல்லை)", cls: "bg-blue-100 text-blue-800" }
      : null;

  return (
    <Screen title={t("mandi.title")} onBack={onBack}>
      {loading ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <div className="w-8 h-8 border-4 border-leaf-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-soil-600 text-center">விலை தகவல் பெறுகிறோம்…</p>
        </div>
      ) : prices.length === 0 ? (
        <p className="text-soil-600 text-center py-8">இந்த பகுதிக்கு விலை தகவல் இல்லை</p>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Source banner */}
          {sourceLabel && (
            <div className={`rounded-lg px-3 py-2 text-xs font-medium ${sourceLabel.cls}`}>
              {sourceLabel.text}
            </div>
          )}

          {prices
            .sort((a, b) => b.pricePerQuintal - a.pricePerQuintal)
            .map((p, idx) => (
              <div
                key={idx}
                className={`rounded-tile p-4 border-2 ${
                  idx === 0 ? "border-leaf-600 bg-leaf-400/15" : "border-soil-100 bg-soil-50"
                }`}
              >
                <p className="font-display font-bold">{p.market}</p>
                <p className="text-soil-700">{p.commodity}</p>
                <p className="text-lg font-bold text-leaf-800">₹{p.pricePerQuintal.toLocaleString("ta-IN")} / குவிண்டால்</p>
                {p.distanceKm > 0 && (
                  <p className="text-xs text-soil-500">{p.distanceKm} கிமீ தொலைவு</p>
                )}
                {idx === 0 && (
                  <p className="text-xs text-leaf-600 font-semibold mt-1">{t("mandi.bestPrice")}</p>
                )}
              </div>
            ))}
        </div>
      )}
    </Screen>
  );
}
