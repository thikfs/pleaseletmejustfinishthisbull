/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type ChatRole = "user" | "assistant";
type IncomingMessage = { role: ChatRole; content: string };
type ChatRequest = { messages: IncomingMessage[] };

type ServiceRow = { id: string; name: string; price: number | null; duration: number };
type BookingRow = { id: string; service_id: string; customer_name: string | null; email: string | null; datetime: string };
type AgentSettingsRow = { system_prompt: string | null; toggles: Record<string, unknown> | null };

type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

type OpenAiChatMessage =
  | { role: "system" | "user" | "assistant"; content: string; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": Deno.env.get("CORS_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json; charset=utf-8" },
  });
}

function getRequiredEnv(name: string) {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function isIsoDateOnly(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function dateOnlyFromAnyInput(s: string) {
  if (isIsoDateOnly(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date input: ${s}`);
  return d.toISOString().slice(0, 10);
}

function addMinutes(d: Date, minutes: number): Date {
  return new Date(d.getTime() + minutes * 60_000);
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

function parseTimeHHMM(s: string): { hh: number; mm: number } {
  const m = /^(\d{2}):(\d{2})$/.exec(s);
  if (!m) throw new Error(`Invalid HH:MM time: ${s}`);
  return { hh: Number(m[1]), mm: Number(m[2]) };
}

function bookingHtml(booking: BookingRow, service: ServiceRow | null): string {
  const when = new Date(booking.datetime).toISOString();
  const serviceName = service?.name ?? booking.service_id;
  const duration = service?.duration ? `${service.duration} min` : "";
  const price = service?.price != null ? `$${service.price}` : "";
  return `
  <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;">
    <h2 style="margin:0 0 12px 0;">Booking confirmed</h2>
    <p style="margin:0 0 16px 0;">Hi ${booking.customer_name ?? "there"}, your appointment is confirmed.</p>
    <table style="border-collapse:collapse; width:100%; max-width:640px;">
      <tr><td style="padding:8px 0; color:#555;">Service</td><td style="padding:8px 0;"><strong>${serviceName}</strong></td></tr>
      <tr><td style="padding:8px 0; color:#555;">When (UTC)</td><td style="padding:8px 0;"><strong>${when}</strong></td></tr>
      <tr><td style="padding:8px 0; color:#555;">Duration</td><td style="padding:8px 0;">${duration}</td></tr>
      <tr><td style="padding:8px 0; color:#555;">Price</td><td style="padding:8px 0;">${price}</td></tr>
      <tr><td style="padding:8px 0; color:#555;">Booking ID</td><td style="padding:8px 0;">${booking.id}</td></tr>
    </table>
  </div>
  `.trim();
}

function looksLikeMissingColumnError(msg: string, column: string) {
  const m = msg.toLowerCase();
  const c = column.toLowerCase();
  return m.includes(`column "${c}"`) && m.includes("does not exist");
}

async function sendResendEmail(params: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
}) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${params.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: params.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Resend error (${res.status}): ${text}`);
  }
}

async function openAiChat(params: {
  apiKey: string;
  baseUrl: string;
  model: string;
  messages: OpenAiChatMessage[];
  tools: unknown[];
}) {
  const res = await fetch(`${params.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${params.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: params.model,
      messages: params.messages,
      tools: params.tools,
      tool_choice: "auto",
      temperature: 0.2,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`LLM error (${res.status}): ${text}`);
  }
  return (await res.json()) as any;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = (await req.json().catch(() => null)) as ChatRequest | null;
    if (!body || !Array.isArray(body.messages)) {
      return json({ error: "Invalid request payload. Expected { messages: [{role,content},...] }." }, 400);
    }

    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    // Prefer service role for server-side tools (bypasses RLS). Fall back to anon to avoid "mystery" 400s when
    // the service role secret was never configured.
    const supabaseKey =
      (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim() ||
      (Deno.env.get("SUPABASE_ANON_KEY") ?? "").trim() ||
      getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"); // throw a clear error message if both are missing/blank

    const openAiKey = getRequiredEnv("OPENAI_API_KEY");
    const resendKey = getRequiredEnv("RESEND_API_KEY");
    const teamSlug = getRequiredEnv("TEAM_SLUG");
    const ownerEmail = getRequiredEnv("OWNER_EMAIL");
    const fromEmail = getRequiredEnv("FROM_EMAIL");


    const openAiBaseUrl = Deno.env.get("OPENAI_BASE_URL") ?? "https://api.openai.com/v1";
    const openAiModel = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";

    const businessHoursStart = Deno.env.get("BUSINESS_HOURS_START") ?? "09:00";
    const businessHoursEnd = Deno.env.get("BUSINESS_HOURS_END") ?? "17:00";
    const availabilityStepMinutes = Number(Deno.env.get("AVAILABILITY_STEP_MINUTES") ?? "30");

    const { hh: startH, mm: startM } = parseTimeHHMM(businessHoursStart);
    const { hh: endH, mm: endM } = parseTimeHHMM(businessHoursEnd);

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    let settings: AgentSettingsRow = { system_prompt: null, toggles: null };
    const { data: settingsRow, error: settingsErr } = await supabase
      .from("agent_settings")
      .select("system_prompt,toggles")
      .order("id")
      .limit(1)
      .maybeSingle();
    if (settingsErr) {
      // Support older schema where `agent_settings` uses `full_booking` boolean instead of `toggles` json.
      if (looksLikeMissingColumnError(settingsErr.message, "toggles")) {
        const { data: legacyRow, error: legacyErr } = await supabase
          .from("agent_settings")
          .select("system_prompt,full_booking")
          .order("id")
          .limit(1)
          .maybeSingle();
        if (legacyErr) throw new Error(`Failed to load agent_settings: ${legacyErr.message}`);
        settings = {
          system_prompt: (legacyRow as any)?.system_prompt ?? null,
          toggles: { full_booking: Boolean((legacyRow as any)?.full_booking) },
        };
      } else {
        throw new Error(`Failed to load agent_settings: ${settingsErr.message}`);
      }
    } else {
      settings = (settingsRow ?? { system_prompt: null, toggles: null }) as AgentSettingsRow;
    }

    const systemPrompt = (settings.system_prompt ?? "").trim()
      ? (settings.system_prompt ?? "").trim()
      : "You are an AI booking assistant. Be concise and professional.";

    const tools = [
      {
        type: "function",
        function: {
          name: "check_availability",
          description:
            "Check free time slots for a given date. Returns available slots (UTC ISO) that do not overlap existing bookings.",
          parameters: {
            type: "object",
            properties: {
              date: { type: "string", description: "Date in YYYY-MM-DD format (preferred). Also accepts ISO datetime." },
              service_id: { type: "string", description: "Service ID (UUID). If omitted, use 60 minutes." },
            },
            required: ["date"],
            additionalProperties: false,
          },
        },
      },
      {
        type: "function",
        function: {
          name: "create_booking",
          description: "Create a booking after availability is checked. Inserts into bookings table.",
          parameters: {
            type: "object",
            properties: {
              service_id: { type: "string", description: "Service ID (UUID)" },
              customer_name: { type: "string", description: "Customer full name" },
              email: { type: "string", description: "Customer email" },
              datetime: { type: "string", description: "Start time as ISO datetime (UTC)" },
            },
            required: ["service_id", "customer_name", "email", "datetime"],
            additionalProperties: false,
          },
        },
      },
    ];

    const assistantRules = [
      systemPrompt,
      "",
      "Rules:",
      "- You MUST call check_availability before confirming a time or calling create_booking.",
      "- You MUST collect: service, date/time, customer_name, email before booking.",
      "- Keep responses concise and professional.",
      "- Use UTC ISO datetimes for tool calls.",
    ].join("\n");

    let messages: OpenAiChatMessage[] = [
      { role: "system", content: assistantRules },
      ...body.messages.map((m) => ({ role: m.role, content: m.content })) as OpenAiChatMessage[],
    ];

    const maxRounds = 6;
    for (let round = 0; round < maxRounds; round++) {
      const resp = await openAiChat({
        apiKey: openAiKey,
        baseUrl: openAiBaseUrl,
        model: openAiModel,
        messages,
        tools,
      });

      const choice = resp?.choices?.[0];
      const msg = choice?.message;
      const content = String(msg?.content ?? "");
      const toolCalls = (msg?.tool_calls ?? []) as ToolCall[];

      if (!toolCalls.length) {
        const reply = content.trim();
        if (!reply) throw new Error("Empty assistant reply");
        return json({ reply });
      }

      messages = [...messages, { role: "assistant", content, tool_calls: toolCalls }];

      for (const tc of toolCalls) {
        const toolName = tc.function.name;
        let toolArgs: Record<string, unknown> = {};
        try {
          toolArgs = JSON.parse(tc.function.arguments || "{}");
        } catch {
          toolArgs = {};
        }

        if (toolName === "check_availability") {
          const dateOnly = dateOnlyFromAnyInput(String(toolArgs.date ?? ""));
          const serviceId = typeof toolArgs.service_id === "string" ? toolArgs.service_id : null;

          const { data: services, error: svcErr } = await supabase
            .from("services")
            .select("id,name,price,duration")
            .order("name");
          if (svcErr) throw new Error(`Failed to load services: ${svcErr.message}`);

          const service = serviceId ? (services ?? []).find((s: any) => s.id === serviceId) ?? null : null;
          const duration = service?.duration ? Number(service.duration) : 60;

          const dayStart = new Date(Date.UTC(Number(dateOnly.slice(0, 4)), Number(dateOnly.slice(5, 7)) - 1, Number(dateOnly.slice(8, 10)), startH, startM, 0, 0));
          const dayEnd = new Date(Date.UTC(Number(dateOnly.slice(0, 4)), Number(dateOnly.slice(5, 7)) - 1, Number(dateOnly.slice(8, 10)), endH, endM, 0, 0));

          const startBound = new Date(`${dateOnly}T00:00:00.000Z`).toISOString();
          const endBound = new Date(`${dateOnly}T23:59:59.999Z`).toISOString();
          let bookings: Array<{ id: string; service_id: string; datetime: string }> = [];
          {
            const { data, error: bErr } = await supabase
              .from("bookings")
              .select("id,service_id,datetime")
              .gte("datetime", startBound)
              .lte("datetime", endBound);
            if (bErr) {
              // Support older schema using `appointment_time` instead of `datetime`
              if (looksLikeMissingColumnError(bErr.message, "datetime")) {
                const { data: legacy, error: legacyErr } = await supabase
                  .from("bookings")
                  .select("id,service_id,appointment_time")
                  .gte("appointment_time", startBound)
                  .lte("appointment_time", endBound);
                if (legacyErr) throw new Error(`Failed to load bookings: ${legacyErr.message}`);
                bookings = (legacy ?? []).map((b: any) => ({
                  id: String(b.id),
                  service_id: String(b.service_id),
                  datetime: String(b.appointment_time),
                }));
              } else {
                throw new Error(`Failed to load bookings: ${bErr.message}`);
              }
            } else {
              bookings = (data ?? []).map((b: any) => ({
                id: String(b.id),
                service_id: String(b.service_id),
                datetime: String(b.datetime),
              }));
            }
          }

          const durationByServiceId = new Map<string, number>(
            (services ?? []).map((s: any) => [String(s.id), Number(s.duration)]),
          );
          const slots: Array<{ start: string; end: string }> = [];
          for (let cursor = new Date(dayStart); addMinutes(cursor, duration) <= dayEnd; cursor = addMinutes(cursor, availabilityStepMinutes)) {
            const slotStart = cursor;
            const slotEnd = addMinutes(cursor, duration);

            let ok = true;
            for (const b of bookings) {
              const bStart = new Date(b.datetime);
              const bDuration = durationByServiceId.get(b.service_id) ?? duration;
              const bEnd = addMinutes(bStart, bDuration);
              if (overlaps(slotStart, slotEnd, bStart, bEnd)) {
                ok = false;
                break;
              }
            }
            if (ok) slots.push({ start: slotStart.toISOString(), end: slotEnd.toISOString() });
          }

          messages = [
            ...messages,
            { role: "tool", tool_call_id: tc.id, content: JSON.stringify({ date: dateOnly, service, slots }) },
          ];
          continue;
        }

        if (toolName === "create_booking") {
          const serviceId = String(toolArgs.service_id ?? "");
          const customerName = String(toolArgs.customer_name ?? "");
          const email = String(toolArgs.email ?? "");
          const datetime = String(toolArgs.datetime ?? "");
          const start = new Date(datetime);
          if (!serviceId || !customerName || !email || Number.isNaN(start.getTime())) {
            messages = [
              ...messages,
              { role: "tool", tool_call_id: tc.id, content: JSON.stringify({ ok: false, error: "Invalid booking input" }) },
            ];
            continue;
          }

          const { data: svc, error: svcErr } = await supabase
            .from("services")
            .select("id,name,price,duration")
            .eq("id", serviceId)
            .maybeSingle();
          if (svcErr) throw new Error(`Failed to load service: ${svcErr.message}`);
          if (!svc) throw new Error("Unknown service_id");

          const duration = Number((svc as any).duration);
          const end = addMinutes(start, duration);
          const dateOnly = start.toISOString().slice(0, 10);

          const startBound = new Date(`${dateOnly}T00:00:00.000Z`).toISOString();
          const endBound = new Date(`${dateOnly}T23:59:59.999Z`).toISOString();
          let sameDay: Array<{ id: string; service_id: string; datetime: string }> = [];
          {
            const { data, error: bErr } = await supabase
              .from("bookings")
              .select("id,service_id,datetime")
              .gte("datetime", startBound)
              .lte("datetime", endBound);
            if (bErr) {
              if (looksLikeMissingColumnError(bErr.message, "datetime")) {
                const { data: legacy, error: legacyErr } = await supabase
                  .from("bookings")
                  .select("id,service_id,appointment_time")
                  .gte("appointment_time", startBound)
                  .lte("appointment_time", endBound);
                if (legacyErr) throw new Error(`Failed to check availability: ${legacyErr.message}`);
                sameDay = (legacy ?? []).map((b: any) => ({
                  id: String(b.id),
                  service_id: String(b.service_id),
                  datetime: String(b.appointment_time),
                }));
              } else {
                throw new Error(`Failed to check availability: ${bErr.message}`);
              }
            } else {
              sameDay = (data ?? []).map((b: any) => ({
                id: String(b.id),
                service_id: String(b.service_id),
                datetime: String(b.datetime),
              }));
            }
          }

          if (sameDay.some((b) => {
            const bStart = new Date(b.datetime);
            const bServiceId = String(b.service_id);
            // We only know duration for the booked service if we fetch it; approximate by using the requested duration.
            const bEnd = addMinutes(bStart, duration);
            return bServiceId && overlaps(start, end, bStart, bEnd);
          })) {
            messages = [
              ...messages,
              { role: "tool", tool_call_id: tc.id, content: JSON.stringify({ ok: false, reason: "overlap" }) },
            ];
            continue;
          }

          let booking: BookingRow | null = null;
          {
            const { data: created, error: insErr } = await supabase
              .from("bookings")
              .insert({
                service_id: serviceId,
                customer_name: customerName,
                email,
                datetime: start.toISOString(),
              })
              .select("id,service_id,customer_name,email,datetime")
              .single();

            if (insErr) {
              // Support older schema with `appointment_time` + `customer_email`
              const msg = insErr.message ?? "";
              const shouldTryLegacy =
                looksLikeMissingColumnError(msg, "datetime") ||
                looksLikeMissingColumnError(msg, "email") ||
                looksLikeMissingColumnError(msg, "customer_name");
              if (!shouldTryLegacy) throw new Error(`Failed to create booking: ${insErr.message}`);

              const { data: legacyCreated, error: legacyErr } = await supabase
                .from("bookings")
                .insert({
                  service_id: serviceId,
                  customer_name: customerName,
                  customer_email: email,
                  appointment_time: start.toISOString(),
                })
                .select("id,service_id,customer_name,customer_email,appointment_time")
                .single();
              if (legacyErr) throw new Error(`Failed to create booking: ${legacyErr.message}`);
              booking = {
                id: String((legacyCreated as any).id),
                service_id: String((legacyCreated as any).service_id),
                customer_name: (legacyCreated as any).customer_name ?? null,
                email: (legacyCreated as any).customer_email ?? null,
                datetime: String((legacyCreated as any).appointment_time),
              };
            } else {
              booking = created as BookingRow;
            }
          }
          if (!booking) throw new Error("Failed to create booking: unknown error");

          const subject = `[BOOKING-2026] ${teamSlug}`;
          const html = bookingHtml(booking, svc as any);
          const from = `${teamSlug} <${fromEmail}>`;
          await sendResendEmail({ apiKey: resendKey, from, to: email, subject, html });
          await sendResendEmail({ apiKey: resendKey, from, to: ownerEmail, subject, html });

          messages = [
            ...messages,
            { role: "tool", tool_call_id: tc.id, content: JSON.stringify({ ok: true, booking }) },
          ];
          continue;
        }

        messages = [
          ...messages,
          { role: "tool", tool_call_id: tc.id, content: JSON.stringify({ ok: false, error: `Unknown tool: ${toolName}` }) },
        ];
      }
    }

    throw new Error("LLM tool loop did not converge");
  } catch (err) {
    return json({ error: "Internal server error", details: { message: err instanceof Error ? err.message : String(err) } }, 500);
  }
});
