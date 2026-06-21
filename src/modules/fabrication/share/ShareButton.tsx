import React from "react";
import { Button } from "../../../shared/ui/Button";
import { t } from "../../../i18n";

interface ShareButtonProps {
  sketchSvg: string;
  materialsListTa: string[];
}

// Section 6.6: a plain wa.me deep link, no WhatsApp Business API account
// or cost needed. The SVG itself isn't attachable via a deep link (that
// needs the Web Share API with a File, which not all WebViews support),
// so we share the materials list as text and tell the user to screenshot
// the sketch above — documented clearly rather than silently failing.
export function ShareButton({ sketchSvg, materialsListTa }: ShareButtonProps) {
  async function handleShare() {
    const message = `என் தயாரிப்பு உதவி வரைபடம்:\n\n${materialsListTa.join("\n")}\n\n(வரைபடத்தை ஸ்கிரீன்ஷாட் எடுத்து அனுப்பவும்)`;

    // Prefer the Web Share API with the SVG as a file when supported —
    // falls back to a wa.me text-only deep link otherwise.
    if (navigator.share && navigator.canShare) {
      try {
        const blob = new Blob([sketchSvg], { type: "image/svg+xml" });
        const file = new File([blob], "sketch.svg", { type: "image/svg+xml" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], text: message });
          return;
        }
      } catch {
        // fall through to wa.me link below
      }
    }

    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  }

  return <Button onClick={handleShare}>{t("maker.shareToMaker")}</Button>;
}
