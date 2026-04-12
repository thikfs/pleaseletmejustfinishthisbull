import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import {
  createService,
  deleteService,
  fetchServices,
  seedServices,
  ServiceRow,
  updateService,
} from "@/lib/supabaseApi";
import { useTranslation } from "react-i18next";

type ServiceFormState = {
  name: string;
  price: string;
  duration: string;
};

const emptyForm: ServiceFormState = { name: "", price: "", duration: "" };

const sampleServices: Array<Omit<ServiceRow, "id">> = [
  { name: "Individual Therapy", price: 120, duration: 60 },
  { name: "Couples Counseling", price: 180, duration: 90 },
  { name: "Group Meditation", price: 40, duration: 45 },
];

export default function ServiceManager() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<ServiceRow | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ServiceFormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: services, isLoading, error } = useQuery({
    queryKey: ["services"],
    queryFn: fetchServices,
    enabled: isSupabaseConfigured,
  });

  const createMutation = useMutation({
    mutationFn: createService,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["services"] }),
  });

  const updateMutation = useMutation({
    mutationFn: updateService,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["services"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteService,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["services"] }),
  });

  const seedMutation = useMutation({
    mutationFn: seedServices,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["services"] }),
  });

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setOpen(true);
  };

  const openEdit = (s: ServiceRow) => {
    setEditing(s);
    setForm({
      name: s.name,
      price: s.price === null ? "" : String(s.price),
      duration: String(s.duration),
    });
    setFormError(null);
    setOpen(true);
  };

  const handleSave = async () => {
    setFormError(null);
    if (!form.name.trim()) {
      setFormError(t('name_required'));
      return;
    }
    const duration = Number(form.duration);
    if (!Number.isFinite(duration) || duration <= 0) {
      setFormError(t('duration_positive'));
      return;
    }
    const price = form.price.trim() ? Number(form.price) : null;
    if (form.price.trim() && (!Number.isFinite(price) || (price ?? 0) < 0)) {
      setFormError(t('price_valid'));
      return;
    }

    const payload = {
      name: form.name.trim(),
      price,
      duration,
    };

    try {
      if (editing) {
        await updateMutation.mutateAsync({ ...payload, id: editing.id });
      } else {
        await createMutation.mutateAsync(payload);
      }
      setOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('unable_save_service'));
    }
  };

  const handleDelete = async (service: ServiceRow) => {
    const confirmed = window.confirm(t('confirm_delete_service', { name: service.name }));
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync(service.id);
    } catch {
      // The query error alert will surface details.
    }
  };

  const handleSeed = async () => {
    const confirmed = window.confirm(t('confirm_seed_services'));
    if (!confirmed) return;
    try {
      await seedMutation.mutateAsync(sampleServices);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('unable_seed_services'));
    }
  };

  const saving = createMutation.isPending || updateMutation.isPending;
  const isSeeding = seedMutation.isPending;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">{t('nav_services')}</h1>
        <div className="flex items-center gap-2">
          {isSupabaseConfigured && (services?.length ?? 0) === 0 && (
            <Button variant="outline" onClick={handleSeed} disabled={isSeeding}>
              {isSeeding ? t('seeding') : t('add_sample_services')}
            </Button>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew} disabled={!isSupabaseConfigured}>
                <Plus className="mr-1 h-4 w-4" /> {t('add_new_service')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? t('edit_service') : t('new_service')}</DialogTitle>
                <DialogDescription>{t('fill_service_details')}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label>{t('name')}</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <Label>{t('price_dollar')}</Label>
                  <Input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                  />
                </div>
                <div>
                  <Label>{t('duration_mins')}</Label>
                  <Input
                    type="number"
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                  />
                </div>
              </div>
              {formError && <p className="text-sm text-destructive">{formError}</p>}
              <DialogFooter>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? t('saving') : t('save')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {!isSupabaseConfigured && (
        <Alert>
          <AlertTitle>{t('supabase_not_configured')}</AlertTitle>
          <AlertDescription>{t('supabase_config_message_services')}</AlertDescription>
        </Alert>
      )}

      {isSupabaseConfigured && error && (
        <Alert variant="destructive">
          <AlertTitle>{t('unable_load_services')}</AlertTitle>
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      )}

      <div className="mt-4 rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('service_name')}</TableHead>
              <TableHead>{t('service_price')}</TableHead>
              <TableHead>{t('service_duration')}</TableHead>
              <TableHead className="w-24 text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isSupabaseConfigured && isLoading && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                  {t('loading_services')}
                </TableCell>
              </TableRow>
            )}
            {isSupabaseConfigured && !isLoading && (services?.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                  {t('no_services_yet')}
                </TableCell>
              </TableRow>
            )}
            {services?.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.price === null ? t('dash') : `$${s.price}`}</TableCell>
                <TableCell>{s.duration} {t('min')}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => handleDelete(s)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
