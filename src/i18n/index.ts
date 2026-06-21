import { create } from "zustand";
import ta from "./ta.json";
import en from "./en.json";

type Dict = typeof ta;
const dictionaries: Record<"ta" | "en", Dict> = { ta, en };

interface LangStore {
  lang: "ta" | "en";
  setLang: (lang: "ta" | "en") => void;
}

// Tamil is the default per HARD CONSTRAINT #3 — English is an explicit
// opt-in toggle, never the starting state.
export const useLangStore = create<LangStore>((set) => ({
  lang: "ta",
  setLang: (lang) => set({ lang }),
}));

function getPath(obj: any, path: string): string | undefined {
  return path.split(".").reduce((acc, key) => (acc ? acc[key] : undefined), obj);
}

/**
 * t("home.soilScan") -> "மண் பரிசோதனை" (or English equivalent)
 * Supports simple {placeholder} interpolation: t("soilScan.result", { soilType: "சிவப்பு" })
 */
export function t(
  key: string,
  vars?: Record<string, string>,
  lang: "ta" | "en" = useLangStore.getState().lang
): string {
  const dict = dictionaries[lang];
  let str = getPath(dict, key) ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(`{${k}}`, v);
    }
  }
  return str;
}
