"use client";

import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";
import { useContext } from "react";
import { LanguageContext } from "@/lib/i18n";

export function LanguageToggle() {
  const { locale } = useTranslation();
  const { setLocale } = useContext(LanguageContext);

  const toggle = () => {
    setLocale(locale === "en" ? "tr" : "en");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      title="Switch language"
      className="relative gap-1"
    >
      <Globe className="h-4 w-4" />
      <span className="text-[10px] font-bold uppercase">{locale}</span>
    </Button>
  );
}
