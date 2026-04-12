import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

const en = {
  nav_overview: "Overview",
  nav_services: "Service Manager",
  nav_bookings: "Appointments",
  nav_agent_settings: "AI agent settings",
  overview_page_title: "Dashboard overview",
  stats_total: "Total appointments",
  stats_active: "Active services",
  stats_upcoming: "Upcoming sessions",
  btn_save: "Save changes",
  supabase_not_configured: "Supabase not configured",
  supabase_config_message_stats:
    "Connect Supabase to load live dashboard statistics.",
  supabase_config_message:
    "Connect Supabase to load appointments from your database.",
  supabase_config_message_services:
    "Connect Supabase to manage services in your database.",
  unable_to_load_bookings: "Unable to load appointments",
  customer: "Customer",
  service: "Service",
  date_time: "Date & time",
  contact: "Contact",
  status: "Status",
  loading_appointments: "Loading appointments…",
  no_upcoming_appointments: "No upcoming appointments.",
  unknown: "Unknown",
  service_prefix: "Service #",
  dash: "—",
  status_upcoming: "Upcoming",
  name_required: "Name is required.",
  duration_positive: "Duration must be a positive number.",
  price_valid: "Enter a valid price or leave it empty.",
  unable_save_service: "Could not save the service.",
  confirm_delete_service: "Delete service “{{name}}”? This cannot be undone.",
  confirm_seed_services:
    "Add sample services to your database? You can edit or remove them later.",
  unable_seed_services: "Could not add sample services.",
  seeding: "Adding…",
  add_sample_services: "Add sample services",
  add_new_service: "Add service",
  edit_service: "Edit service",
  new_service: "New service",
  fill_service_details: "Fill in the details below.",
  name: "Name",
  price_dollar: "Price ($)",
  duration_mins: "Duration (minutes)",
  saving: "Saving…",
  save: "Save",
  unable_load_services: "Unable to load services",
  service_name: "Name",
  service_price: "Price",
  service_duration: "Duration",
  actions: "Actions",
  loading_services: "Loading services…",
  no_services_yet: "No services yet.",
  min: "min",
  sign_out: "Sign out",
  admin_brand: "Serenity Admin",
  home_hero_title: "Your journey to mental wellness starts here",
  home_hero_subtitle:
    "Compassionate, professional therapy tailored to your needs.",
  home_services_heading: "Our therapeutic services",
  home_sample_services_hint:
    "Showing sample services. Connect Supabase to manage these dynamically.",
  home_loading_services: "Loading services…",
  home_unable_load_services: "Unable to load services.",
  home_empty_db_hint:
    "Showing sample services until you add your own in the dashboard.",
  home_service_card_blurb:
    "Speak with our team to tailor the right session for you.",
  home_price_contact: "Contact us",
  home_footer_credit:
    "AI Booking 2026 — Educational project — Serenity Booking Suite",
  home_chat_welcome: "Welcome to Serenity Minds. How can we help you today?",
  home_chat_quick_availability: "Check availability",
  home_chat_quick_specialties: "Our specialties",
  home_chat_quick_emergency: "Emergency contacts",
  home_chat_not_configured: "Chat is not configured yet (missing VITE_SUPABASE_URL).",
  home_chat_process_error: "Sorry, we could not process that request.",
  home_chat_network_error: "Network error. Please try again.",
  home_chat_aria_toggle: "Open or close therapy assistant chat",
  home_chat_title: "Therapy assistant",
  home_chat_subtitle: "We are here to help",
  home_chat_placeholder: "Type a message…",
} as const;

const et: Record<keyof typeof en, string> = {
  nav_overview: "Ülevaade",
  nav_services: "Teenuste haldur",
  nav_bookings: "Broneeringud",
  nav_agent_settings: "AI agendi seaded",
  overview_page_title: "Juhtpaneeli ülevaade",
  stats_total: "Broneeringuid kokku",
  stats_active: "Aktiivsed teenused",
  stats_upcoming: "Tulevased seansid",
  btn_save: "Salvesta muudatused",
  supabase_not_configured: "Supabase pole seadistatud",
  supabase_config_message_stats:
    "Ühendage Supabase, et laadida reaalajas statistikat.",
  supabase_config_message:
    "Ühendage Supabase, et laadida broneeringuid andmebaasist.",
  supabase_config_message_services:
    "Ühendage Supabase, et hallata teenuseid andmebaasis.",
  unable_to_load_bookings: "Broneeringuid ei õnnestunud laadida",
  customer: "Klient",
  service: "Teenus",
  date_time: "Kuupäev ja kellaaeg",
  contact: "Kontakt",
  status: "Olek",
  loading_appointments: "Laadin broneeringuid…",
  no_upcoming_appointments: "Tulevasi broneeringuid pole.",
  unknown: "Teadmata",
  service_prefix: "Teenus #",
  dash: "—",
  status_upcoming: "Tulekul",
  name_required: "Nimi on kohustuslik.",
  duration_positive: "Kestus peab olema positiivne arv.",
  price_valid: "Sisestage kehtiv hind või jätke tühjaks.",
  unable_save_service: "Teenust ei õnnestunud salvestada.",
  confirm_delete_service:
    "Kustutada teenus „{{name}}”? Seda ei saa tagasi võtta.",
  confirm_seed_services:
    "Lisada näidisteenused andmebaasi? Hiljem saate neid muuta või kustutada.",
  unable_seed_services: "Näidisteenuseid ei õnnestunud lisada.",
  seeding: "Lisan…",
  add_sample_services: "Lisa näidisteenused",
  add_new_service: "Lisa teenus",
  edit_service: "Muuda teenust",
  new_service: "Uus teenus",
  fill_service_details: "Täitke allolevad väljad.",
  name: "Nimi",
  price_dollar: "Hind ($)",
  duration_mins: "Kestus (minutites)",
  saving: "Salvestan…",
  save: "Salvesta",
  unable_load_services: "Teenuseid ei õnnestunud laadida",
  service_name: "Nimi",
  service_price: "Hind",
  service_duration: "Kestus",
  actions: "Tegevused",
  loading_services: "Laadin teenuseid…",
  no_services_yet: "Teenuseid veel pole.",
  min: "min",
  sign_out: "Logi välja",
  admin_brand: "Serenity admin",
  home_hero_title: "Teie teekond vaimse heaolu juurde algab siit",
  home_hero_subtitle:
    "Kaastundlik ja professionaalne teraapia, mis on kohandatud teie vajadustele.",
  home_services_heading: "Meie teraapiateenused",
  home_sample_services_hint:
    "Kuvatakse näidisteenused. Ühendage Supabase, et hallata neid dünaamiliselt.",
  home_loading_services: "Laadin teenuseid…",
  home_unable_load_services: "Teenuseid ei õnnestunud laadida.",
  home_empty_db_hint:
    "Kuvatakse näidisteenused, kuni lisate omad juhtpaneelil.",
  home_service_card_blurb:
    "Rääkige meie tiimiga, et leida teile sobiv sessioon.",
  home_price_contact: "Võtke ühendust",
  home_footer_credit:
    "AI Booking 2026 — Hariduslik projekt — Serenity Booking Suite",
  home_chat_welcome: "Tere tulemast Serenity Minds’i. Kuidas saame täna aidata?",
  home_chat_quick_availability: "Kontrolli vabad ajad",
  home_chat_quick_specialties: "Meie erialad",
  home_chat_quick_emergency: "Hädaabi kontaktid",
  home_chat_not_configured:
    "Vestlust pole veel seadistatud (puudub VITE_SUPABASE_URL).",
  home_chat_process_error: "Kahjuks ei õnnestunud seda päringut töödelda.",
  home_chat_network_error: "Võrguviga. Palun proovige uuesti.",
  home_chat_aria_toggle: "Ava või sulge teraapiaabilise vestlus",
  home_chat_title: "Teraapiaabiline",
  home_chat_subtitle: "Oleme siin, et aidata",
  home_chat_placeholder: "Kirjutage sõnum…",
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    supportedLngs: ["en", "et"],
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    resources: {
      en: { translation: en },
      et: { translation: et },
    },
  });

export default i18n;