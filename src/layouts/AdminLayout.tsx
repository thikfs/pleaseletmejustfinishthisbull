import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import i18n from "@/lib/i18n";
import { useTranslation } from "react-i18next";

function resolveUiLang(code: string | undefined) {
  const base = (code ?? "en").split("-")[0]?.toLowerCase() ?? "en";
  return base === "et" ? "et" : "en";
}

export default function AdminLayout() {
  const { t } = useTranslation();
  const [lang, setLang] = useState(() => resolveUiLang(i18n.language));
  const { user, signOut } = useAuth();

  useEffect(() => {
    const onLanguageChanged = (lng: string) => setLang(resolveUiLang(lng));
    i18n.on("languageChanged", onLanguageChanged);
    setLang(resolveUiLang(i18n.language));
    return () => {
      i18n.off("languageChanged", onLanguageChanged);
    };
  }, []);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AdminSidebar />
        <div className="flex flex-1 flex-col">
          <header className="flex h-14 items-center justify-between border-b px-4">
            <SidebarTrigger />
            <div className="flex items-center gap-3">
              {user?.email && <span className="text-sm text-muted-foreground">{user.email}</span>}
              <Select
                value={lang}
                onValueChange={(next) => {
                  void i18n.changeLanguage(next);
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="et">Eesti</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => signOut()}>
                {t("sign_out")}
              </Button>
            </div>
          </header>
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
