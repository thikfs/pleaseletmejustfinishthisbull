import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "react-i18next";
import { LanguageSelect } from "@/components/LanguageSelect";

export default function AdminLayout() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AdminSidebar />
        <div className="flex flex-1 flex-col">
          <header className="flex h-14 items-center justify-between border-b px-4">
            <SidebarTrigger />
            <div className="flex items-center gap-3">
              {user?.email && <span className="text-sm text-muted-foreground">{user.email}</span>}
              <LanguageSelect />
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
