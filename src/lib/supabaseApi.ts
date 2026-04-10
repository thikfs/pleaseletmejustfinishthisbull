import { requireSupabase } from "@/lib/supabaseClient";

export type ServiceRow = {
  id: string;
  name: string;
  price: number | null;
  duration: number;
};

export type BookingRow = {
  id: string;
  service_id: string;
  customer_name: string | null;
  email: string | null;
  datetime: string;
  service?: ServiceRow | null;
};

function looksLikeMissingColumnError(msg: string, column: string) {
  const m = msg.toLowerCase();
  const c = column.toLowerCase();
  return m.includes(`column "${c}"`) && m.includes("does not exist");
}

export async function fetchServices() {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("services")
    .select("id,name,price,duration")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ServiceRow[];
}

export async function createService(input: Omit<ServiceRow, "id">) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("services")
    .insert({
      name: input.name,
      price: input.price,
      duration: input.duration,
    })
    .select("id,name,price,duration")
    .limit(1)
    .single();
  if (error) throw error;
  return data as ServiceRow;
}

export async function seedServices(inputs: Array<Omit<ServiceRow, "id">>) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("services")
    .insert(
      inputs.map((s) => ({
        name: s.name,
        price: s.price,
        duration: s.duration,
      })),
    )
    .select("id,name,price,duration");
  if (error) throw error;
  return (data ?? []) as ServiceRow[];
}

export async function updateService(input: ServiceRow) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("services")
    .update({
      name: input.name,
      price: input.price,
      duration: input.duration,
    })
    .eq("id", input.id)
    .select("id,name,price,duration")
    .limit(1)
    .single();
  if (error) throw error;
  return data as ServiceRow;
}

export async function deleteService(id: string) {
  const supabase = requireSupabase();
  const { error } = await supabase.from("services").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchBookingsWithServices(options?: { upcomingOnly?: boolean }) {
  const supabase = requireSupabase();
  const upcomingOnly = options?.upcomingOnly ?? false;
  const now = new Date().toISOString();
  // Prefer the schema shown in your DB (datetime + email).
  const primary = await supabase
    .from("bookings")
    .select("id,service_id,customer_name,email,datetime")
    .order("datetime", { ascending: true })
    .gte("datetime", upcomingOnly ? now : "1900-01-01T00:00:00.000Z");

  let rows: BookingRow[] = [];
  if (!primary.error) {
    rows = (primary.data ?? []) as BookingRow[];
  } else {
    // Back-compat: some deployments used `appointment_time` + `customer_email`.
    const msg = primary.error.message ?? "";
    if (looksLikeMissingColumnError(msg, "datetime") || looksLikeMissingColumnError(msg, "email")) {
      const legacy = await supabase
        .from("bookings")
        .select("id,service_id,customer_name,customer_email,appointment_time")
        .order("appointment_time", { ascending: true })
        .gte("appointment_time", upcomingOnly ? now : "1900-01-01T00:00:00.000Z");
      if (legacy.error) throw legacy.error;
      rows = (legacy.data ?? []).map((b: any) => ({
        id: String(b.id),
        service_id: String(b.service_id),
        customer_name: (b.customer_name ?? null) as string | null,
        email: (b.customer_email ?? null) as string | null,
        datetime: String(b.appointment_time),
      }));
    } else {
      throw primary.error;
    }
  }

  const ids = Array.from(new Set(rows.map((b) => b.service_id).filter((id) => typeof id === "string" && id.length)));
  if (ids.length === 0) return rows;

  const { data: services, error: servicesError } = await supabase
    .from("services")
    .select("id,name,price,duration")
    .in("id", ids);
  if (servicesError) throw servicesError;
  const serviceMap = new Map((services ?? []).map((s) => [s.id, s as ServiceRow]));

  return rows.map((b) => ({
    ...b,
    service: serviceMap.get(b.service_id) ?? null,
  }));
}

export async function fetchDashboardStats() {
  const supabase = requireSupabase();
  const now = new Date().toISOString();
  const [totalAppointments, activeServices] = await Promise.all([
    supabase.from("bookings").select("id", { count: "exact", head: true }),
    supabase.from("services").select("id", { count: "exact", head: true }),
  ]);

  if (totalAppointments.error) throw totalAppointments.error;
  if (activeServices.error) throw activeServices.error;

  // Prefer `datetime` (your current schema), fall back to `appointment_time` (legacy schema).
  const upcomingPrimary = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .gte("datetime", now);
  let upcomingCount = upcomingPrimary.count ?? 0;
  if (upcomingPrimary.error) {
    const msg = upcomingPrimary.error.message ?? "";
    if (looksLikeMissingColumnError(msg, "datetime")) {
      const upcomingLegacy = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .gte("appointment_time", now);
      if (upcomingLegacy.error) throw upcomingLegacy.error;
      upcomingCount = upcomingLegacy.count ?? 0;
    } else {
      throw upcomingPrimary.error;
    }
  }

  return {
    totalAppointments: totalAppointments.count ?? 0,
    activeServices: activeServices.count ?? 0,
    upcomingSessions: upcomingCount,
  };
}
