import { createClient } from "@supabase/supabase-js";

// Claus del teu projecte Supabase (la clau anon és pública i segura al codi)
const SUPABASE_URL = "https://nspadptistcyvpppfwhq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zcGFkcHRpc3RjeXZwcHBmd2hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNjM3ODQsImV4cCI6MjA5NTgzOTc4NH0.e36pu5MKDBFfWd_IyC-I01yQmb6hB-0-SKRGRO92IaM";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Magatzem clau-valor: substitueix window.storage però compartit al núvol.
// El login dels amics segueix sent mote + contrasenya dins l'app.
export const db = {
  async get(key) {
    const { data, error } = await supabase
      .from("kv_store")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (error) { console.error("db.get", key, error); return null; }
    return data ? data.value : null;
  },

  async set(key, value) {
    const { error } = await supabase
      .from("kv_store")
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) { console.error("db.set", key, error); throw error; }
  },
};
