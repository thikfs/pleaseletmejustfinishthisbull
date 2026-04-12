import { useTranslation } from "react-i18next";
// ... other imports

export default function ServiceManager() {
  const { t } = useTranslation();
  // ... state and query logic

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">{t('nav_services')}</h1>
        {/* ... action buttons */}
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('service_name')}</TableHead>
              <TableHead>{t('service_price')}</TableHead>
              <TableHead>{t('service_duration')}</TableHead>
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={4} className="text-center">{t('msg_loading')}</TableCell>
              </TableRow>
            )}
            {/* ... map through services */}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}