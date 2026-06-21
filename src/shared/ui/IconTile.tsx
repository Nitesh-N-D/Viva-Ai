import React from "react";

interface IconTileProps {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  accent?: "leaf" | "steel";
}

// Large icon tiles, not a text menu — per UI/UX guideline #2: navigation
// for users who may not read fluently should lead with icons.
export function IconTile({ label, icon, onClick, accent = "leaf" }: IconTileProps) {
  const accentClasses =
    accent === "leaf"
      ? "bg-leaf-400/15 border-leaf-600 text-leaf-800"
      : "bg-steel-400/15 border-steel-600 text-steel-800";

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-2 rounded-tile border-2 p-4 min-h-[120px] w-full ${accentClasses}`}
    >
      <span className="text-4xl" aria-hidden="true">
        {icon}
      </span>
      <span className="font-display font-semibold text-base text-center">{label}</span>
    </button>
  );
}
