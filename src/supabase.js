import { createClient } from "@supabase/supabase-js";

// Claus del teu projecte Supabase (la clau anon és pública i segura al codi client)
const SUPABASE_URL = "https://nspadptistcyvpppfwhq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zcGFkcHRpc3RjeXZwcHBmd2hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNjM3ODQsImV4cCI6MjA5NTgzOTc4NH0.e36pu5MKDBFfWd_IyC-I01yQmb6hB-0-SKRGRO92IaM";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

// ─── Auth helpers ────────────────────────────────────────────────────────────
export const auth = {
  // Login amb email + contrasenya. Retorna null si OK, missatge d'error si falla.
  async signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const msg = error.message || "";
      if (msg.includes("Invalid login")) return "Email o contrasenya incorrectes";
      if (msg.includes("Email not confirmed")) return "Aquest email encara no està confirmat";
      return msg;
    }
    return null;
  },

  async signOut() {
    await supabase.auth.signOut();
  },

  // Sessió actual (síncron): retorna {user, ...} o null
  getUser() {
    return supabase.auth.getUser().then(({ data }) => data.user || null);
  },

  // Escolta canvis de sessió. callback rep (user|null)
  onAuthChange(callback) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user || null);
    });
    return () => subscription.unsubscribe();
  },
};

// ─── Magatzem clau-valor a Supabase (substitueix window.storage) ─────────────
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
