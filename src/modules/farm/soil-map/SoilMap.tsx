import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Screen } from "../../../shared/ui/Screen";
import { getMapTiles } from "../../../lib/firebase";
import { t } from "../../../i18n";

interface SoilMapProps {
  onBack: () => void;
}

const SOIL_COLORS: Record<string, string> = {
  "செம்மண்": "#B98447",
  "கருமண்": "#4A2F18",
  "வண்டல் மண்": "#7C9A6E",
  "லேட்டரைட் மண்": "#E0C28A",
};

interface MapPoint {
  lat: number;
  lng: number;
  soilType: string;
  scanCount?: number;
}

// Shown only until real scans accumulate — see getMapTiles() in
// lib/firebase.ts, which reads the actual crowd-sourced collection the
// moment Firebase is configured and at least one soil scan has synced.
const SAMPLE_POINTS: MapPoint[] = [
  { lat: 11.0168, lng: 76.9558, soilType: "செம்மண்" }, // Coimbatore
  { lat: 11.3410, lng: 77.7172, soilType: "கருமண்" }, // Erode
  { lat: 10.7905, lng: 78.7047, soilType: "வண்டல் மண்" }, // Tiruchirappalli
  { lat: 11.6643, lng: 78.1460, soilType: "லேட்டரைட் மண்" }, // Salem
  { lat: 9.9252, lng: 78.1198, soilType: "வண்டல் மண்" }, // Madurai
  { lat: 11.1085, lng: 78.6569, soilType: "செம்மண்" }, // Karur
];

function parseGeoTile(geoTile: string): { lat: number; lng: number } | null {
  const [lat, lng] = geoTile.split(",").map(Number);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}

export function SoilMap({ onBack }: SoilMapProps) {
  const [points, setPoints] = useState<MapPoint[]>(SAMPLE_POINTS);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    getMapTiles().then((tiles) => {
      if (tiles.length === 0) return; // keep sample points — nothing real yet
      const real = tiles
        .map((tile): MapPoint | null => {
          const coords = parseGeoTile(tile.geoTile);
          return coords ? { ...coords, soilType: tile.dominantSoilType, scanCount: tile.scanCount } : null;
        })
        .filter((p): p is MapPoint => p !== null);

      if (real.length > 0) {
        setPoints(real);
        setIsLive(true);
      }
    });
  }, []);

  return (
    <Screen title={t("home.soilMap")} onBack={onBack}>
      <div className="rounded-tile overflow-hidden h-[60vh] w-full">
        <MapContainer center={[11.0, 78.0]} zoom={7} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {points.map((p, i) => (
            <CircleMarker
              key={i}
              center={[p.lat, p.lng]}
              radius={14}
              pathOptions={{ color: SOIL_COLORS[p.soilType] ?? "#7C9A6E", fillOpacity: 0.6 }}
            >
              <Popup>
                {p.soilType}
                {p.scanCount ? ` — ${p.scanCount} ஸ்கேன்கள்` : ""}
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
      <p className="text-xs text-soil-500 mt-2 text-center">
        {isLive
          ? "உண்மையான பயனர் தகவல்"
          : "இது மாதிரி தகவல் — உண்மையான வரைபடம் பயனர் ஸ்கேன்களால் உருவாகும்"}
      </p>
    </Screen>
  );
}
