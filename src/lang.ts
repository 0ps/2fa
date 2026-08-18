import { detectLang, isLang, STORAGE_LANG_KEY, type Lang } from "./i18n";

export interface LangResolution {
  lang: Lang;
  selectValue: string;
  redirectSearch?: string;
}

export function readStoredLang(): string | null {
  try {
    return localStorage.getItem(STORAGE_LANG_KEY);
  } catch {
    return null;
  }
}

export function writeStoredLang(value: string) {
  try {
    localStorage.setItem(STORAGE_LANG_KEY, value);
  } catch {
    /* ignore quota */
  }
}

export function resolveLang(search: string): LangResolution {
  const params = new URLSearchParams(search);
  const urlLang = params.get("lang");
  const stored = readStoredLang();

  if (stored && stored !== "auto" && isLang(stored)) {
    if (urlLang !== stored) {
      params.set("lang", stored);
      return { lang: stored, selectValue: stored, redirectSearch: params.toString() };
    }
    return { lang: stored, selectValue: stored };
  }

  if (urlLang && isLang(urlLang)) {
    if (!stored) writeStoredLang(urlLang);
    return { lang: urlLang, selectValue: stored === "auto" ? "auto" : urlLang };
  }

  return { lang: detectLang(), selectValue: stored === "auto" ? "auto" : "auto" };
}

export function applyLangChoice(choice: string, currentSearch: string): string {
  const params = new URLSearchParams(currentSearch);
  if (choice === "auto") {
    writeStoredLang("auto");
    params.delete("lang");
  } else if (isLang(choice)) {
    writeStoredLang(choice);
    params.set("lang", choice);
  }
  return params.toString();
}
