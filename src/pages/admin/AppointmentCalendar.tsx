import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import { fetchBookingsWithServices } from "@/lib/supabaseApi";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

export default function AppointmentCalendar() {
  const { t } = useTranslation();
  const { data: bookings, isLoading, error } = useQuery({
    queryKey: ["bookings", "upcoming"],
    queryFn: () => fetchBookingsWithServices({ upcomingOnly: true }),
    enabled: isSupabaseConfigured,
  });

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold">{t("nav_bookings")}</h1>

      {!isSupabaseConfigured && (
        <Alert>
          <AlertTitle>{t('supabase_not_configured')}</AlertTitle>
          <AlertDescription>{t('supabase_config_message')}</AlertDescription>
        </Alert>
      )}

      {isSupabaseConfigured && error && (
        <Alert variant="destructive">
          <AlertTitle>{t('unable_to_load_bookings')}</AlertTitle>
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      )}

      <div className="mt-4 rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('customer')}</TableHead>
              <TableHead>{t('service')}</TableHead>
              <TableHead>{t('date_time')}</TableHead>
              <TableHead>{t('contact')}</TableHead>
              <TableHead>{t('status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isSupabaseConfigured && isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  {t('loading_appointments')}
                </TableCell>
              </TableRow>
            )}
            {isSupabaseConfigured && !isLoading && (bookings?.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  {t('no_upcoming_appointments')}
                </TableCell>
              </TableRow>
            )}
            {bookings?.map((a) => {
              const date = new Date(a.datetime);
              const status = "upcoming";
              return (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.customer_name ?? t('unknown')}</TableCell>
                  <TableCell>{a.service?.name ?? `${t('service_prefix')}${a.service_id}`}</TableCell>
                  <TableCell>{format(date, "yyyy-MM-dd HH:mm")}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{a.email ?? t('dash')}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={status === "upcoming" ? "default" : "secondary"}>{t('status_upcoming')}</Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
