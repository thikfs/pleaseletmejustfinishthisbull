import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import i18n from "@/lib/i18n";

export function resolveUiLang(code: string | undefined) {
  const base = (code ?? "en").split("-")[0]?.toLowerCase() ?? "en";
  return base === "et" ? "et" : "en";
}

export function LanguageSelect({ className }: { className?: string }) {
  const [lang, setLang] = useState(() => resolveUiLang(i18n.language));

  useEffect(() => {
    const onLanguageChanged = (lng: string) => setLang(resolveUiLang(lng));
    i18n.on("languageChanged", onLanguageChanged);
    setLang(resolveUiLang(i18n.language));
    return () => {
      i18n.off("languageChanged", onLanguageChanged);
    };
  }, []);

  return (
    <Select
      value={lang}
      onValueChange={(next) => {
        void i18n.changeLanguage(next);
      }}
    >
      <SelectTrigger className={className ?? "w-32"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">English</SelectItem>
        <SelectItem value="et">Eesti</SelectItem>
      </SelectContent>
    </Select>
  );
}
