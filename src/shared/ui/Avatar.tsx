import React from "react";
import { useAvatarStore } from "../avatar-engine/AvatarEngine";

// Original, simple plant-sprout mascot. Same character is reused for the
// Fabrication module with a "tool-belt" accent swapped in via the `skin`
// prop, per the spec's "one avatar, two jobs" instruction.
export function Avatar({ skin = "farm" }: { skin?: "farm" | "maker" }) {
  const state = useAvatarStore((s) => s.state);

  const faceColor =
    state === "concerned" ? "#C2611E" : state === "celebrating" ? "#5B7553" : "#374A31";
  const bounce = state === "celebrating" ? "animate-bounce" : "";
  const leanAngle = state === "concerned" ? -8 : 0;

  return (
    <div className={`flex flex-col items-center ${bounce}`}>
      <svg
        viewBox="0 0 120 140"
        width="120"
        height="140"
        role="img"
        aria-label={`avatar state: ${state}`}
      >
        <ellipse cx="60" cy="128" rx="34" ry="8" fill="#B98447" opacity="0.4" />
        <g transform={`rotate(${leanAngle} 60 90)`}>
          <rect x="54" y="70" width="12" height="50" rx="6" fill="#7C9A6E" />
          <circle cx="60" cy="55" r="28" fill="#A9C79A" />
          <circle cx="50" cy="48" r="5" fill={faceColor} />
          <circle cx="70" cy="48" r="5" fill={faceColor} />
          <path
            d={state === "celebrating" ? "M48 62 Q60 74 72 62" : "M48 64 Q60 58 72 64"}
            stroke={faceColor}
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          {skin === "maker" && (
            <rect x="42" y="80" width="36" height="10" rx="3" fill="#E0823D" />
          )}
        </g>
      </svg>
    </div>
  );
}
