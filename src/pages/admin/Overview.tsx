import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, ListChecks, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import { fetchDashboardStats } from "@/lib/supabaseApi";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTranslation } from "react-i18next"; // 1. Import hook

export default function AdminOverview() {
  const { t } = useTranslation(); // 2. Initialize translation
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: fetchDashboardStats,
    enabled: isSupabaseConfigured,
  });

  const stats = [
    { label: t('stats_total'), value: data?.totalAppointments ?? 0, icon: CalendarDays },
    { label: t('stats_active'), value: data?.activeServices ?? 0, icon: ListChecks },
    { label: t('stats_upcoming'), value: data?.upcomingSessions ?? 0, icon: Clock },
  ];

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold">{t("overview_page_title")}</h1>
      
      {!isSupabaseConfigured && (
        <Alert className="mb-4">
          <AlertTitle>{t('supabase_not_configured')}</AlertTitle>
          <AlertDescription>{t('supabase_config_message_stats')}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : s.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <footer className="mt-8 text-center text-xs text-muted-foreground">
        AI Booking 2026 - Educational Project - [Serenity Booking Suite]
      </footer>
    </div>
  );
}