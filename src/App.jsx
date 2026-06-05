// ═══════════════════════════════════════════════════════════════════════════
//  BIRRAPORRA FC — La porra dels teus colegues
//  v1.5 · Català · Combo Europa gratis · Reorganització nav · Sense torneig/robatori
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from "react";
import { supabase, db, auth } from "./supabase.js";

// ─────────────────────────── 1. CONFIG ────────────────────────────────────
const CFG = {
  ADMIN_PASS: "gol2024",
  ENTRY_EUR: 10.00, START_BIRRAS: 150, BIRRA_EUR: 0.10, BEER_EUR: 2.50,
  PRIZES: [0.40, 0.30, 0.20, 0.10],
  EXACT_BONUS: 1.5,
  // Cara o Creu
  COIN_ENTRY: 5, COIN_MAX_DOUBLES: 3,
  // Jackpot Espanya: cost mínim d'apostar al jackpot per partit d'Espanya (en birres)
  ESPANYA_MIN_BET: 5,
  DOUBLE_BONUS: 0.20,
};

const C = {
  bg: "#F4F6FA", card: "#FFFFFF", card2: "#EEF2FB", border: "#E8ECF4",
  gold: "#F5A623", amber: "#D97706", muted: "#8A96A8", txt: "#0F1923",
  red: "#E4151B", green: "#059669", blue: "#003DA5", blue2: "#1A56C4",
  purple: "#7C3AED", rose: "#F43F5E", cyan: "#0EA5E9",
  // colors addicionals C+
  hdr: "#003DA5",       // header blau FIFA
  hdrtxt: "#FFFFFF",    // text sobre header
  hdrfade: "rgba(255,255,255,0.12)",
  success: "#059669",
  bluePale: "#EEF2FB",
};

const LEAGUES = ["Fase de Grup", "1/16", "Vuitens", "Quarts", "Semifinal", "Final"];
const AVATAR_EMOJIS = ["🍺", "⚽", "🔥", "🏆", "😈", "🎯", "👑", "💪", "🦁", "🐂", "🦅", "🐺", "⚡", "💀", "🤘", "🍀"];

// Seleccions del Mundial: nom, codi 3 lletres, emoji bandera
const NATIONS = [
  { n: "Espanya", c: "ESP", f: "🇪🇸" },
  { n: "Argentina", c: "ARG", f: "🇦🇷" },
  { n: "França", c: "FRA", f: "🇫🇷" },
  { n: "Brasil", c: "BRA", f: "🇧🇷" },
  { n: "Anglaterra", c: "ENG", f: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { n: "Portugal", c: "POR", f: "🇵🇹" },
  { n: "Alemanya", c: "GER", f: "🇩🇪" },
  { n: "Països Baixos", c: "NED", f: "🇳🇱" },
  { n: "Itàlia", c: "ITA", f: "🇮🇹" },
  { n: "Bèlgica", c: "BEL", f: "🇧🇪" },
  { n: "Croàcia", c: "CRO", f: "🇭🇷" },
  { n: "Uruguai", c: "URU", f: "🇺🇾" },
  { n: "Aràbia Saudí", c: "KSA", f: "🇸🇦" },
  { n: "Cap Verd", c: "CPV", f: "🇨🇻" },
  { n: "Mèxic", c: "MEX", f: "🇲🇽" },
  { n: "Estats Units", c: "USA", f: "🇺🇸" },
  { n: "Canadà", c: "CAN", f: "🇨🇦" },
  { n: "Japó", c: "JPN", f: "🇯🇵" },
  { n: "Corea del Sud", c: "KOR", f: "🇰🇷" },
  { n: "Marroc", c: "MAR", f: "🇲🇦" },
  { n: "Colòmbia", c: "COL", f: "🇨🇴" },
  { n: "Equador", c: "ECU", f: "🇪🇨" },
  { n: "Suïssa", c: "SUI", f: "🇨🇭" },
  { n: "Senegal", c: "SEN", f: "🇸🇳" },
  { n: "Ghana", c: "GHA", f: "🇬🇭" },
  { n: "Nigèria", c: "NGA", f: "🇳🇬" },
  { n: "Camerun", c: "CMR", f: "🇨🇲" },
  { n: "Austràlia", c: "AUS", f: "🇦🇺" },
  { n: "Polònia", c: "POL", f: "🇵🇱" },
  { n: "Dinamarca", c: "DEN", f: "🇩🇰" },
  { n: "Sèrbia", c: "SRB", f: "🇷🇸" },
  { n: "Gal·les", c: "WAL", f: "🏴󠁧󠁢󠁷󠁬󠁳󠁿" },
  { n: "Àustria", c: "AUT", f: "🇦🇹" },
  { n: "Noruega", c: "NOR", f: "🇳🇴" },
  { n: "Turquia", c: "TUR", f: "🇹🇷" },
  { n: "Egipte", c: "EGY", f: "🇪🇬" },
  { n: "Iran", c: "IRN", f: "🇮🇷" },
  { n: "Qatar", c: "QAT", f: "🇶🇦" },
];
const NATION_NAMES = NATIONS.map(x => x.n);
const findNation = (name) => {
  if (!name) return null;
  const key = name.trim().toLowerCase();
  return NATIONS.find(x => x.n.toLowerCase() === key || x.c.toLowerCase() === key) || null;
};
// Codi de 3 lletres (es veu a tot arreu, sense problemes d'emoji)
const teamCode = (name) => { const n = findNation(name); return n ? n.c : ""; };
const teamFlag = (name) => { const n = findNation(name); return n ? n.f : ""; };


// ─────────────────────────── 2. STORAGE & UTILS ───────────────────────────
// Totes les dades es guarden en UN sol document a Supabase ("bporra_v10_all").
// Així el polling fa 1 petició en lloc de 9. Les KEYS són les claus internes
// dins d'aquest document.
const DOC_KEY = "bporra_v10_all";
const KEYS = {
  accounts: "accounts",
  groups: "groups",
  members: "members",
  matches: "matches",
  bets: "bets",
  clasico: "clasico",
  europa: "europa",
  chats: "chats",
  coinflips: "coinflips",
};

// Caché local del document sencer
let _docCache = null;
async function _loadDoc() {
  try {
    const doc = await db.get(DOC_KEY);
    _docCache = doc && typeof doc === "object" ? doc : {};
  } catch { _docCache = {}; }
  return _docCache;
}
async function dbGet(k) {
  // Llegeix una clau del document. Si no hi ha caché, carrega el document sencer.
  if (_docCache === null) await _loadDoc();
  return _docCache[k] ?? null;
}
async function dbSet(k, v) {
  // Actualitza una clau i desa el document sencer (read-modify-write sobre caché)
  if (_docCache === null) await _loadDoc();
  _docCache = { ..._docCache, [k]: v };
  try { await db.set(DOC_KEY, _docCache); } catch (e) { console.error("dbSet error", e); }
}
// Recarrega el document sencer de Supabase (1 petició) i retorna totes les claus
async function dbReloadAll() {
  await _loadDoc();
  return _docCache;
}

const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i); return String(h >>> 0); };
const fmtDate = s => !s ? "" : new Date(s).toLocaleDateString("ca-ES", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const fmtTime = ts => new Date(ts).toLocaleTimeString("ca-ES", { hour: "2-digit", minute: "2-digit" });
const fmtChatDate = ts => {
  const d = new Date(ts);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dDay = new Date(d); dDay.setHours(0, 0, 0, 0);
  if (dDay.getTime() === today.getTime()) return fmtTime(ts);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (dDay.getTime() === yesterday.getTime()) return `Ahir ${fmtTime(ts)}`;
  return d.toLocaleDateString("ca-ES", { day: "numeric", month: "short" }) + " " + fmtTime(ts);
};
const fmtEUR = n => (Math.round(n * 100) / 100).toFixed(2) + "€";
const eurToBeers = eur => Math.floor((eur / CFG.BEER_EUR) * 10) / 10;
const getOutcome = (h, a) => h > a ? "H" : h < a ? "A" : "D";
const scoreKey = (h, a) => `${h}-${a}`;
const daysSince = ts => !ts ? Infinity : Math.floor((Date.now() - ts) / 86400000);
const weekKey = (ts = Date.now()) => { const d = new Date(ts); d.setHours(0,0,0,0); const day = d.getDay() || 7; d.setDate(d.getDate() - day + 1); return d.toISOString().slice(0,10); };
const matchStarted = m => m.date && new Date(m.date).getTime() <= Date.now();

// Compte enrere fins a una data. Retorna {text, urgent} o null si ja ha passat
const countdown = (dateStr) => {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const d = Math.floor(h / 24);
  let text;
  if (d >= 1) text = `${d}d ${h % 24}h`;
  else if (h >= 1) text = `${h}h ${m}min`;
  else text = `${m}min`;
  return { text, urgent: h < 3 };
};
const canBet = m => m.status !== "finished" && !matchStarted(m);
const isMondayMorning = () => { const d = new Date(); return d.getDay() === 1 && d.getHours() >= 8 && d.getHours() < 13; };

function shareToWhatsApp(text) {
  const encoded = encodeURIComponent(text);
  window.open(`https://wa.me/?text=${encoded}`, "_blank");
}

// ─────────────────────────── 3. BETTING MATH ──────────────────────────────
function calcPayout(bet, match) {
  if (!match.result) return null;
  const winOutcome = getOutcome(match.result.home, match.result.away);
  const winScore = scoreKey(match.result.home, match.result.away);
  if (bet.outcome !== winOutcome) return 0;
  let cuota = match.cuotas[bet.outcome];
  let payout = bet.amount * cuota;
  if (bet.exactScore && bet.exactScore === winScore) payout *= CFG.EXACT_BONUS;
  return Math.round(payout);
}
function settleBets(allBets, match) {
  return allBets.map(b => b.matchId !== match.id ? b : { ...b, payout: calcPayout(b, match), settled: true });
}

// ─────────────────────────── 4. STYLES & ATOMS ────────────────────────────
const sty = {
  btnPrimary: { background: C.blue, color: "#fff", border: "none", borderRadius: 12, padding: "14px 16px", fontFamily: "var(--pff2)", fontWeight: 700, fontSize: 16, letterSpacing: 1, cursor: "pointer", boxShadow: "0 4px 14px rgba(0,61,165,0.25)" },
  btnGhost: { background: "transparent", color: C.muted, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", fontFamily: "var(--pff2)", fontWeight: 700, fontSize: 15, cursor: "pointer" },
  btnRed: { background: C.red, color: "#fff", border: "none", borderRadius: 12, padding: "14px 16px", fontFamily: "var(--pff2)", fontWeight: 700, fontSize: 16, letterSpacing: 1, cursor: "pointer", boxShadow: "0 4px 14px rgba(228,21,27,0.25)" },
  card: { background: C.card, borderRadius: 16, padding: 16, marginBottom: 10, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" },
  sectionH: { fontFamily: "var(--pff)", fontSize: 16, color: C.blue, letterSpacing: 2, marginBottom: 10 },
  label: { fontFamily: "var(--pff2)", fontSize: 10, color: C.muted, letterSpacing: 2, fontWeight: 700 },
  input: { width: "100%", background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", color: C.txt, fontSize: 15, fontFamily: "Inter, sans-serif", outline: "none" },
};

function Chip({ children, color = C.muted, bg = C.card2, border }) {
  return <span style={{ background: bg, color, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 4, letterSpacing: 1, fontFamily: "var(--pff)", border: border ? `1px solid ${border}` : "none", whiteSpace: "nowrap" }}>{children}</span>;
}
const SuperChip = () => <Chip color={C.gold} bg="#FEF3C7" border={C.amber}>⚡ SÚPER BONUS</Chip>;
const EuropaChip = () => <Chip color={C.purple} bg="#F3E8FF" border={C.purple}>🌍 TOP 5 EUROPA</Chip>;
const JokerChip = () => <Chip color={C.blue} bg={C.bluePale} border={C.blue}>🃏 JOKER ×2</Chip>;
const ClasicoChip = () => <Chip color={C.rose} bg="#FFE4E6" border={C.rose}>🏆 JACKPOT</Chip>;
const LockedChip = () => <Chip color={C.muted} bg={C.card2} border={C.border}>🔒 TANCAT</Chip>;

function Cuota({ value, big }) {
  return <span style={{ fontFamily: "var(--pff)", fontSize: big ? 24 : 18, color: C.blue, lineHeight: 1 }}>×{Number(value).toFixed(2)}</span>;
}
function WAButton({ text, label = "📲 Compartir al WhatsApp", small }) {
  return <button onClick={() => shareToWhatsApp(text)} style={{ ...sty.btnWA, padding: small ? "6px 10px" : "8px 14px", fontSize: small ? 11 : 13 }}>{label}</button>;
}
function Toast({ toast }) {
  if (!toast) return null;
  const palette = { success: { bg: "#DCFCE7", border: C.success, txt: "#166534" }, info: { bg: C.bluePale, border: C.blue, txt: C.blue }, warn: { bg: "#FEF3C7", border: C.gold, txt: "#92400E" }, error: { bg: "#FEE2E2", border: C.red, txt: "#7F1D1D" } }[toast.type] || { bg: C.card, border: C.border, txt: C.txt };
  return <div style={{ position: "fixed", top: 90, left: "50%", transform: "translateX(-50%)", background: palette.bg, color: palette.txt, padding: "12px 20px", borderRadius: 12, border: `1px solid ${palette.border}`, zIndex: 400, fontSize: 14, fontWeight: 700, animation: "slideUp 0.3s ease", maxWidth: "90vw", boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}>{toast.msg}</div>;
}

function Confetti() {
  const pieces = ["🎉", "🍺", "🏆", "⚽", "🥇", "🎊", "✨", "🇪🇸"];
  const items = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    emoji: pieces[i % pieces.length],
    left: Math.random() * 100,
    delay: Math.random() * 0.8,
    dur: 1.8 + Math.random() * 1.4,
    size: 16 + Math.random() * 16,
  }));
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 500, overflow: "hidden" }}>
      {items.map(it => (
        <span key={it.id} style={{ position: "absolute", top: 0, left: `${it.left}%`, fontSize: it.size, animation: `confettiFall ${it.dur}s ${it.delay}s ease-in forwards` }}>{it.emoji}</span>
      ))}
    </div>
  );
}

function EmojiPicker({ value, onChange, compact }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
      {AVATAR_EMOJIS.map(e => (
        <button key={e} type="button" onClick={() => onChange(e)} style={{
          width: compact ? 36 : 44, height: compact ? 36 : 44, borderRadius: "50%",
          background: value === e ? C.gold : C.card2,
          border: value === e ? `2px solid ${C.amber}` : `1px solid ${C.border}`,
          fontSize: compact ? 18 : 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        }}>{e}</button>
      ))}
    </div>
  );
}

// ─────────────────────────── 5. SUPABASE LOGIN SCREEN ─────────────────────
function SupabaseLoginScreen({ onAdmin }) {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🍺");
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [taps, setTaps] = useState(0);

  const doSubmit = async () => {
    setErr(""); setInfo("");
    if (!email || !pass) { setErr("Posa email i contrasenya"); return; }
    if (mode === "signup" && !name.trim()) { setErr("Posa el teu nom"); return; }
    setLoading(true);
    let error;
    if (mode === "login") {
      error = await auth.signIn(email.trim().toLowerCase(), pass);
    } else {
      error = await auth.signUp(email.trim().toLowerCase(), pass, name.trim(), emoji);
      if (!error) {
        // Auto-login després del signup (perquè a Supabase tens "Confirm email" desactivat)
        const loginErr = await auth.signIn(email.trim().toLowerCase(), pass);
        if (loginErr) {
          setInfo("Compte creat! Comprova el correu per confirmar.");
          setMode("login"); setPass(""); setName("");
        }
      }
    }
    setLoading(false);
    if (error) setErr(error);
  };

  const onLogoTap = () => {
    const n = taps + 1; setTaps(n);
    if (n >= 5) { setTaps(0); onAdmin(); }
  };

  const EMOJI_OPTIONS = ["🍺","⚽","🔥","🏆","😈","🎯","👑","💪","🦁","🐂","🦅","🐺","⚡","💀","🤘","🍀"];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, position: "relative" }}>
      <div className="mundial-stripe" style={{ position: "absolute", top: 0, left: 0, right: 0 }} />

      <div onClick={onLogoTap} style={{ textAlign: "center", marginBottom: 28, cursor: "pointer", userSelect: "none" }}>
        <Logo26 size={88} />
        <div style={{ fontFamily: "var(--pff)", fontSize: 32, color: C.gold, letterSpacing: 3, lineHeight: 1, marginTop: 8 }}>BIRRAPORRA</div>
        <div style={{ fontFamily: "var(--pff2)", fontSize: 12, color: C.muted, letterSpacing: 5, marginTop: 4, fontWeight: 600 }}>WE ARE 26</div>
        <div style={{ display: "inline-block", background: "linear-gradient(90deg,#c8102e,#f5c518,#1d9e75)", color: "#fff", fontFamily: "var(--pff2)", fontSize: 9, letterSpacing: 3, padding: "3px 12px", borderRadius: 3, marginTop: 10, fontWeight: 700 }}>CANADA · MEXICO · USA</div>
      </div>

      <div style={{ width: "100%", maxWidth: 340, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22, position: "relative", overflow: "hidden" }}>
        <div className="mundial-stripe" style={{ position: "absolute", top: 0, left: 0, right: 0 }} />

        {/* Pestanyes login / signup */}
        <div style={{ display: "flex", marginBottom: 18, background: C.bg, borderRadius: 8, padding: 3, gap: 2 }}>
          <button
            onClick={() => { setMode("login"); setErr(""); setInfo(""); }}
            style={{ flex: 1, padding: "8px", background: mode === "login" ? C.gold : "transparent", color: mode === "login" ? "#062310" : C.muted, border: "none", borderRadius: 6, fontFamily: "var(--pff2)", fontSize: 11, letterSpacing: 2, fontWeight: 700, cursor: "pointer" }}
          >ENTRAR</button>
          <button
            onClick={() => { setMode("signup"); setErr(""); setInfo(""); }}
            style={{ flex: 1, padding: "8px", background: mode === "signup" ? C.gold : "transparent", color: mode === "signup" ? "#062310" : C.muted, border: "none", borderRadius: 6, fontFamily: "var(--pff2)", fontSize: 11, letterSpacing: 2, fontWeight: 700, cursor: "pointer" }}
          >REGISTRAR-SE</button>
        </div>

        {mode === "signup" && (
          <input
            type="text" placeholder="El teu nom o mote" value={name}
            onChange={e => setName(e.target.value)} maxLength={20}
            style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 14px", color: C.txt, fontSize: 15, marginBottom: 10, fontFamily: "Inter, sans-serif", outline: "none" }}
          />
        )}

        <input
          type="email" placeholder="el-teu@email.com" value={email}
          onChange={e => setEmail(e.target.value)} autoComplete="email"
          style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 14px", color: C.txt, fontSize: 15, marginBottom: 10, fontFamily: "Inter, sans-serif", outline: "none" }}
        />
        <input
          type="password" placeholder={mode === "signup" ? "contrasenya (6+ caràcters)" : "contrasenya"} value={pass}
          onChange={e => setPass(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") doSubmit(); }}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 14px", color: C.txt, fontSize: 15, marginBottom: 14, fontFamily: "Inter, sans-serif", outline: "none" }}
        />

        {err && <div style={{ background: "#3d0c0c", border: `1px solid ${C.red}`, borderRadius: 6, padding: "8px 10px", color: "#fcb4b4", fontSize: 13, marginBottom: 12 }}>{err}</div>}
        {info && <div style={{ background: "#0d2200", border: `1px solid ${C.green}`, borderRadius: 6, padding: "8px 10px", color: "#a8e6a0", fontSize: 13, marginBottom: 12 }}>{info}</div>}

        <button onClick={doSubmit} disabled={loading}
          style={{ width: "100%", background: loading ? C.muted : C.gold, color: "#062310", border: "none", borderRadius: 8, padding: "14px", fontFamily: "var(--pff)", fontSize: 22, letterSpacing: 3, cursor: loading ? "not-allowed" : "pointer" }}>
          {loading ? (mode === "login" ? "ENTRANT..." : "CREANT...") : (mode === "login" ? "ENTRAR" : "CREAR COMPTE")}
        </button>
      </div>

      <div className="mundial-stripe" style={{ position: "absolute", bottom: 0, left: 0, right: 0 }} />
    </div>
  );
}

// ─────────────────────────── 5c. GROUP PICKER ─────────────────────────────
function GroupPicker({ account, groups, members, matches = [], adminMode, onJoinGroup, onCreateGroup, onSelectGroup, onLogout, onAdminLogin }) {
  const [mode, setMode] = useState("list"); // "list" | "join" | "create"
  const [code, setCode] = useState("");
  const [groupName, setGroupName] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [taps, setTaps] = useState(0);

  // Grups dels quals ja és membre
  const myGroups = groups.filter(g => members.some(m => m.accountId === account.id && m.groupId === g.id));

  const onLogoTap = () => {
    const n = taps + 1; setTaps(n);
    if (n >= 5) { setTaps(0); onAdminLogin(); }
  };

  const doJoin = async () => {
    setErr(""); setLoading(true);
    await onJoinGroup({ code }, setErr);
    setLoading(false);
  };
  const doCreate = async () => {
    setErr(""); setLoading(true);
    await onCreateGroup({ name: groupName }, setErr);
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", padding: "20px 16px 40px", position: "relative" }}>
      <div className="mundial-stripe" style={{ position: "absolute", top: 0, left: 0, right: 0 }} />

      {/* Header */}
      <div onClick={onLogoTap} style={{ textAlign: "center", marginTop: 20, marginBottom: 24, cursor: "pointer", userSelect: "none" }}>
        <Logo26 size={56} />
        <div style={{ fontFamily: "var(--pff)", fontSize: 26, color: C.gold, letterSpacing: 2, lineHeight: 1, marginTop: 8 }}>ELS TEUS GRUPS</div>
        <div style={{ fontFamily: "var(--pff2)", fontSize: 11, color: C.muted, letterSpacing: 3, marginTop: 6, fontWeight: 600 }}>
          {account.emoji} {account.name.toUpperCase()}{adminMode && " · 🛠 ADMIN"}
        </div>
      </div>

      {/* Llista de grups (si en té) */}
      {mode === "list" && (
        <div style={{ width: "100%", maxWidth: 360, margin: "0 auto" }}>
          {myGroups.length > 0 && (
            <>
              <div style={{ fontFamily: "var(--pff2)", fontSize: 10, color: C.muted, letterSpacing: 2.5, marginBottom: 10, fontWeight: 600 }}>SELECCIONA UN GRUP</div>
              {myGroups.map(g => {
                const memberCount = members.filter(m => m.groupId === g.id).length;
                const nextMatch = matches
                  .filter(m => m.groupId === g.id && m.status !== "finished" && m.date && new Date(m.date).getTime() > Date.now())
                  .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
                return (
                  <button key={g.id} onClick={() => onSelectGroup(g.id)}
                    style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px", marginBottom: 8, cursor: "pointer", textAlign: "left", position: "relative", overflow: "hidden" }}>
                    <div className="mundial-stripe" style={{ position: "absolute", top: 0, left: 0, right: 0 }} />
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "var(--pff)", fontSize: 22, color: C.txt, letterSpacing: 1, lineHeight: 1.1 }}>{g.name}</div>
                        <div style={{ fontFamily: "var(--pff2)", fontSize: 11, color: C.muted, marginTop: 4, fontWeight: 600 }}>
                          💰 {fmtEUR(g.bote_EUR || 0)} · 👥 {memberCount} {memberCount === 1 ? "jugador" : "jugadors"}
                        </div>
                        {g.joinCode && adminMode && <div style={{ fontFamily: "var(--pff2)", fontSize: 10, color: C.amber, letterSpacing: 2, marginTop: 3, fontWeight: 600 }}>CODI: {g.joinCode}</div>}
                      </div>
                      <span style={{ color: C.gold, fontSize: 22, flexShrink: 0, marginLeft: 8 }}>→</span>
                    </div>
                    {nextMatch && (
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}`, fontSize: 12, color: C.muted }}>
                        <span style={{ color: C.amber, fontFamily: "var(--pff2)", fontWeight: 600, letterSpacing: 1 }}>PRÒXIM:</span> {nextMatch.home} vs {nextMatch.away}
                      </div>
                    )}
                  </button>
                );
              })}
              <div style={{ height: 16 }} />
            </>
          )}

          {myGroups.length === 0 && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 14, textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🏟️</div>
              <div style={{ fontFamily: "var(--pff2)", fontSize: 11, color: C.muted, letterSpacing: 2, fontWeight: 600 }}>ENCARA NO ETS A CAP GRUP</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>Utilitza un codi de grup que t'hagi donat l'admin</div>
            </div>
          )}

          <button onClick={() => { setMode("join"); setErr(""); }}
            style={{ width: "100%", background: C.gold, color: "#062310", border: "none", borderRadius: 10, padding: "14px", fontFamily: "var(--pff)", fontSize: 20, letterSpacing: 2, cursor: "pointer", marginBottom: 8 }}>
            🔑 UNIR-ME AMB CODI
          </button>

          {adminMode && (
            <button onClick={() => { setMode("create"); setErr(""); }}
              style={{ width: "100%", background: C.red, color: "#fff", border: "none", borderRadius: 10, padding: "14px", fontFamily: "var(--pff)", fontSize: 18, letterSpacing: 2, cursor: "pointer", marginBottom: 8 }}>
              ➕ CREAR GRUP NOU (ADMIN)
            </button>
          )}

          <button onClick={onLogout}
            style={{ width: "100%", background: "transparent", color: C.muted, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px", fontFamily: "var(--pff2)", fontSize: 13, letterSpacing: 2, cursor: "pointer", marginTop: 14, fontWeight: 600 }}>
            🚪 TANCAR SESSIÓ
          </button>
        </div>
      )}

      {/* Form: unir-se amb codi */}
      {mode === "join" && (
        <div style={{ width: "100%", maxWidth: 360, margin: "0 auto", background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22, position: "relative", overflow: "hidden" }}>
          <div className="mundial-stripe" style={{ position: "absolute", top: 0, left: 0, right: 0 }} />
          <div style={{ fontFamily: "var(--pff2)", fontSize: 11, color: C.muted, letterSpacing: 3, marginBottom: 14, fontWeight: 600 }}>🔑 CODI DEL GRUP</div>
          <input
            type="text" placeholder="ABC123" value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            maxLength={6} autoCapitalize="characters"
            style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "14px", color: C.gold, fontSize: 26, fontFamily: "var(--pff)", letterSpacing: 6, textAlign: "center", marginBottom: 12, outline: "none" }}
          />
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 14, textAlign: "center", lineHeight: 1.5 }}>L'admin t'ha de donar el codi del grup</div>
          {err && <div style={{ background: "#3d0c0c", border: `1px solid ${C.red}`, borderRadius: 6, padding: "8px 10px", color: "#fcb4b4", fontSize: 13, marginBottom: 12 }}>{err}</div>}
          <button onClick={doJoin} disabled={loading || !code}
            style={{ width: "100%", background: (loading || !code) ? C.muted : C.gold, color: "#062310", border: "none", borderRadius: 8, padding: "14px", fontFamily: "var(--pff)", fontSize: 20, letterSpacing: 2, cursor: (loading || !code) ? "not-allowed" : "pointer", marginBottom: 8 }}>
            {loading ? "UNINT..." : "UNIR-ME"}
          </button>
          <button onClick={() => { setMode("list"); setErr(""); setCode(""); }}
            style={{ width: "100%", background: "transparent", color: C.muted, border: "none", padding: "10px", fontFamily: "var(--pff2)", fontSize: 12, letterSpacing: 2, cursor: "pointer", fontWeight: 600 }}>
            ← TORNAR
          </button>
        </div>
      )}

      {/* Form: crear grup (només admin) */}
      {mode === "create" && (
        <div style={{ width: "100%", maxWidth: 360, margin: "0 auto", background: C.card, border: `1px solid ${C.red}`, borderRadius: 14, padding: 22, position: "relative", overflow: "hidden" }}>
          <div className="mundial-stripe" style={{ position: "absolute", top: 0, left: 0, right: 0 }} />
          <div style={{ fontFamily: "var(--pff2)", fontSize: 11, color: C.red, letterSpacing: 3, marginBottom: 14, fontWeight: 600 }}>➕ CREAR GRUP NOU</div>
          <input
            type="text" placeholder="Ex: Mundial colla del bar" value={groupName}
            onChange={e => setGroupName(e.target.value)} maxLength={40}
            style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 14px", color: C.txt, fontSize: 15, marginBottom: 12, fontFamily: "Inter, sans-serif", outline: "none" }}
          />
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 14, lineHeight: 1.5 }}>Es generarà un codi de 6 caràcters perquè els amics s'uneixin.</div>
          {err && <div style={{ background: "#3d0c0c", border: `1px solid ${C.red}`, borderRadius: 6, padding: "8px 10px", color: "#fcb4b4", fontSize: 13, marginBottom: 12 }}>{err}</div>}
          <button onClick={doCreate} disabled={loading || !groupName.trim()}
            style={{ width: "100%", background: (loading || !groupName.trim()) ? C.muted : C.red, color: "#fff", border: "none", borderRadius: 8, padding: "14px", fontFamily: "var(--pff)", fontSize: 20, letterSpacing: 2, cursor: (loading || !groupName.trim()) ? "not-allowed" : "pointer", marginBottom: 8 }}>
            {loading ? "CREANT..." : "CREAR GRUP"}
          </button>
          <button onClick={() => { setMode("list"); setErr(""); setGroupName(""); }}
            style={{ width: "100%", background: "transparent", color: C.muted, border: "none", padding: "10px", fontFamily: "var(--pff2)", fontSize: 12, letterSpacing: 2, cursor: "pointer", fontWeight: 600 }}>
            ← TORNAR
          </button>
        </div>
      )}

      <div className="mundial-stripe" style={{ position: "absolute", bottom: 0, left: 0, right: 0 }} />
    </div>
  );
}



// ─────────────────────────── 7. RULES SCREEN ──────────────────────────────
function RulesScreen({ onClose, firstTime }) {
  const rules = [
    ["🍺", `Comences amb ${CFG.START_BIRRAS} birres`, `Cada birra val ${(CFG.BIRRA_EUR * 100).toFixed(0)} cèntims. L'admin et pot recarregar.`],
    ["🎯", "Aposta a l'1X2", "A cada partit tries Local, Empat o Visitant amb una quota. Si l'encertes: birres × quota."],
    ["⭐", "Marcador exacte BONUS", `En apostar pots escriure també el marcador exacte (gratis). Si encertes guanyador I marcador: guanys ×${CFG.EXACT_BONUS}!`],
    ["🔒", "Tancament automàtic", "Quan comença el partit la teva porra es tanca i ja no es pot tocar. Aposta abans!"],
    ["🇪🇸", "Jackpot Selecció Espanyola", `Als partits d'Espanya pots apostar birres + predir el resultat exacte. Qui el clava s'emporta TOT el pot. Si ningú no encerta, s'acumula pel pròxim partit.`],
    ["🪙", "Cara o Creu", `Un cop per setmana! ${CFG.COIN_ENTRY}🍺 d'entrada i dobles fins a ${CFG.COIN_MAX_DOUBLES} cops. Si falles, ho perds tot.`],
    ["🏅", "Insígnies", "Desbloqueja medalles: primera victòria, endeví, ratxa de 3 i 5, líder del ranking i més."],
    ["🏆", "Premi final EN BIRRES", `El pot del grup es reparteix: 🥇 40% · 🥈 30% · 🥉 20% · 4t 10%.`],
  ];
  return (
    <div style={{ position: "fixed", inset: 0, background: C.bg, overflowY: "auto", zIndex: 200 }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: 20 }}>
        <div style={{ textAlign: "center", marginBottom: 20, paddingTop: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 4 }}>📖</div>
          <div style={{ fontFamily: "var(--pff)", fontWeight: 900, fontSize: 30, color: C.gold, letterSpacing: 2 }}>NORMES DEL JOC</div>
        </div>
        {rules.map(([emoji, title, desc], i) => (
          <div key={i} style={{ ...sty.card, marginBottom: 10, display: "flex", gap: 12 }}>
            <div style={{ fontSize: 28, flexShrink: 0 }}>{emoji}</div>
            <div>
              <div style={{ fontFamily: "var(--pff)", fontWeight: 800, fontSize: 17, color: C.gold, marginBottom: 2 }}>{title}</div>
              <div style={{ fontSize: 13, color: C.txt, lineHeight: 1.5 }}>{desc}</div>
            </div>
          </div>
        ))}
        <button onClick={onClose} style={{ ...sty.btnPrimary, width: "100%", marginTop: 10, marginBottom: 30 }}>{firstTime ? "ENTESOS, A JUGAR! 🍺" : "TORNAR"}</button>
      </div>
    </div>
  );
}

// Badge de selecció amb codi de 3 lletres + emoji bandera quan el dispositiu el suporta
function FlagBadge({ name, size = 12 }) {
  const nation = findNation(name);
  if (!nation) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: C.bluePale, color: C.blue, fontFamily: "var(--pff2)", fontWeight: 700, fontSize: size, letterSpacing: 1, padding: "2px 7px", borderRadius: 20, marginTop: 4 }}>
      <span style={{ fontSize: size + 2 }}>{nation.f}</span>
      <span>{nation.c}</span>
    </span>
  );
}

// Logo "26" estilitzat (el 2 apilat sobre el 6) inspirat en l'oficial Mundial 2026
function Logo26({ size = 80, showTrophy = true }) {
  const stripe = "linear-gradient(135deg, #E4151B 0%, #E4151B 33%, #F5A623 33%, #F5A623 66%, #006847 66%, #006847 100%)";
  const onBlue = !showTrophy; // hi serà sobre el header blau quan showTrophy és false
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", lineHeight: 0.8, fontFamily: "var(--pff)", position: "relative" }}>
      <span style={{ fontSize: size, color: onBlue ? "#fff" : "transparent", background: onBlue ? "transparent" : stripe, WebkitBackgroundClip: onBlue ? "border-box" : "text", backgroundClip: onBlue ? "border-box" : "text", fontWeight: 900, letterSpacing: -size * 0.05, lineHeight: 0.85 }}>2</span>
      <span style={{ fontSize: size, color: onBlue ? "#fff" : "transparent", background: onBlue ? "transparent" : stripe, WebkitBackgroundClip: onBlue ? "border-box" : "text", backgroundClip: onBlue ? "border-box" : "text", fontWeight: 900, marginTop: -size * 0.25, letterSpacing: -size * 0.05, lineHeight: 0.85 }}>6</span>
      {showTrophy && <span style={{ position: "absolute", top: size * 0.45, fontSize: size * 0.55, filter: "drop-shadow(0 0 4px rgba(245,166,35,0.5))" }}>🏆</span>}
    </div>
  );
}

// ─────────────────────────── PODIUM SPOT ──────────────────────────────────
function PodiumSpot({ user, rank, isMe, height }) {
  const medals = { 1: "🥇", 2: "🥈", 3: "🥉" };
  const colors = { 1: C.gold, 2: "#c0c0c0", 3: "#cd7f32" };
  const col = colors[rank];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, maxWidth: 110 }}>
      {rank === 1 && <div style={{ fontSize: 22, marginBottom: 2, animation: "foam 2s ease-in-out infinite" }}>👑</div>}
      <div style={{ width: rank === 1 ? 54 : 44, height: rank === 1 ? 54 : 44, borderRadius: "50%", background: isMe ? C.gold : C.card2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: rank === 1 ? 28 : 22, border: `2px solid ${col}`, marginBottom: 4 }}>{user.emoji}</div>
      <div style={{ fontFamily: "var(--pff2)", fontSize: 11, fontWeight: 700, color: C.txt, textAlign: "center", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: 0.5 }}>{user.name}{isMe ? " 👈" : ""}</div>
      <div style={{ fontFamily: "var(--pff)", fontSize: rank === 1 ? 22 : 18, color: col, lineHeight: 1.1 }}>{user.birras}🍺</div>
      <div style={{ width: "100%", height, background: `linear-gradient(180deg, ${col}33, ${C.card})`, border: `1px solid ${col}`, borderBottom: "none", borderRadius: "8px 8px 0 0", marginTop: 6, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 8 }}>
        <span style={{ fontSize: 26 }}>{medals[rank]}</span>
      </div>
    </div>
  );
}

// ─────────────────────────── 8. MATCH CARD ────────────────────────────────
function MatchCard({ match, userBet, onBet, member }) {
  const done = match.status === "finished";
  const started = matchStarted(match) && !done;
  const cd = (!done && !started) ? countdown(match.date) : null;
  const betOutcomeText = userBet ? (userBet.outcome === "H" ? `${match.home} guanya` : userBet.outcome === "A" ? `${match.away} guanya` : "Empat") : "";
  const accentColor = match.spain ? C.red : (done && userBet?.settled) ? (userBet.payout > 0 ? C.success : C.muted) : userBet ? C.gold : C.blue;

  return (
    <div style={{ background: C.card, borderRadius: 16, marginBottom: 10, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", display: "flex", overflow: "hidden" }}>
      <div style={{ width: 4, background: accentColor, flexShrink: 0 }} />
      <div style={{ flex: 1, padding: "14px 14px 14px 12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 4 }}>
          <span style={{ fontFamily: "var(--pff2)", fontSize: 11, color: C.muted, letterSpacing: 1.5, fontWeight: 700 }}>{match.league}{match.date ? ` · ${fmtDate(match.date)}` : ""}</span>
          <div style={{ display: "flex", gap: 5 }}>
            {match.spain && <span style={{ background: "#FEE2E2", color: C.red, fontFamily: "var(--pff2)", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>🇪🇸 ESPANYA</span>}
            {done ? <span style={{ background: C.bg, color: C.muted, fontFamily: "var(--pff2)", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>✓ FINALITZAT</span> : started ? <span style={{ background: "#FEE2E2", color: C.red, fontFamily: "var(--pff2)", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, animation: "pulse 1.5s infinite" }}>🔴 EN JOC</span> : <span style={{ background: "#DCFCE7", color: C.green, fontFamily: "var(--pff2)", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>🟢 OBERT</span>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <div style={{ flex: 1, textAlign: "right" }}>
            <div style={{ fontFamily: "var(--pff)", fontSize: 24, color: C.txt, letterSpacing: 1, lineHeight: 1 }}>{match.home}</div>
            <FlagBadge name={match.home} size={11} />
          </div>
          <div style={{ minWidth: 56, textAlign: "center" }}>
            {match.result
              ? <div style={{ background: C.txt, borderRadius: 8, padding: "3px 10px", display: "inline-block" }}><span style={{ fontFamily: "var(--pff)", fontSize: 24, color: "#fff", letterSpacing: 2 }}>{match.result.home}–{match.result.away}</span></div>
              : <span style={{ fontFamily: "var(--pff2)", fontSize: 13, color: C.muted, fontWeight: 700 }}>VS</span>}
          </div>
          <div style={{ flex: 1, textAlign: "left" }}>
            <div style={{ fontFamily: "var(--pff)", fontSize: 24, color: C.txt, letterSpacing: 1, lineHeight: 1 }}>{match.away}</div>
            <FlagBadge name={match.away} size={11} />
          </div>
        </div>
        {cd && (
          <div style={{ marginBottom: 10 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: cd.urgent ? "#FEE2E2" : C.bg, color: cd.urgent ? C.red : C.muted, fontFamily: "var(--pff2)", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, animation: cd.urgent ? "pulse 1.5s infinite" : "none" }}>⏱ Tanca en {cd.text}</span>
          </div>
        )}
        {!done && !started && (
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {[["H", match.home], ["D", "Empat"], ["A", match.away]].map(([k, lbl]) => (
              <div key={k} style={{ flex: 1, background: C.bluePale, borderRadius: 10, padding: "8px 4px", textAlign: "center" }}>
                <div style={{ fontFamily: "var(--pff2)", fontSize: 10, color: C.muted, letterSpacing: 0.5, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", marginBottom: 3, fontWeight: 600 }}>{lbl}</div>
                <div style={{ fontFamily: "var(--pff)", fontSize: 22, color: C.blue }}>{match.cuotas[k]?.toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}
        {userBet && (
          <div style={{ background: C.bluePale, border: `1px solid #C7D5F3`, borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>
            <div style={{ fontFamily: "var(--pff2)", fontSize: 9, color: C.blue, letterSpacing: 2, fontWeight: 700, marginBottom: 5 }}>LA TEVA PORRA</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "var(--pff2)", fontSize: 14, fontWeight: 700, color: C.txt }}>{betOutcomeText}</span>
                {userBet.exactScore && <span style={{ background: C.gold, color: "#fff", fontFamily: "var(--pff2)", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>{userBet.exactScore.replace("-","–")} ⭐</span>}
              </div>
              <span style={{ fontFamily: "var(--pff)", fontSize: 22, color: C.blue }}>{userBet.amount}🍺</span>
            </div>
            {userBet.settled && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Resultat</span>
                <span style={{ fontFamily: "var(--pff)", fontSize: 22, color: userBet.payout > 0 ? C.success : C.red }}>{userBet.payout > 0 ? `+${userBet.payout - userBet.amount}🍺 ✓` : `−${userBet.amount}🍺 ✗`}</span>
              </div>
            )}
          </div>
        )}
        {!done && !started && onBet && (
          <button onClick={() => onBet(match)} disabled={member.birras < 1}
            style={{ width: "100%", background: "transparent", color: member.birras < 1 ? C.muted : C.blue, border: `1.5px solid ${member.birras < 1 ? C.border : C.blue}`, borderRadius: 10, padding: "11px", fontFamily: "var(--pff2)", fontSize: 14, fontWeight: 700, letterSpacing: 1, cursor: member.birras < 1 ? "not-allowed" : "pointer" }}>
            {userBet ? "✏️ Editar porra" : "⚽ Fer porra"}
          </button>
        )}
        {started && !userBet && <div style={{ color: C.muted, fontSize: 12, textAlign: "center", padding: 4, fontWeight: 600 }}>🔒 El partit ha começat</div>}
        {done && !userBet && <div style={{ color: C.muted, fontSize: 12, textAlign: "center", padding: 4, fontWeight: 600 }}>No hi vas participar</div>}
      </div>
    </div>
  );
}
function BetModal({ match, member, existing, jokerAvailable, onSubmit, onClose }) {
  const [outcome, setOutcome] = useState(existing?.outcome || "H");
  const [exactH, setExactH] = useState(existing?.exactScore?.split("-")[0] ?? "");
  const [exactA, setExactA] = useState(existing?.exactScore?.split("-")[1] ?? "");
  const [amount, setAmount] = useState(existing?.amount ?? Math.min(10, member.birras));
  const [err, setErr] = useState("");

  const refund = existing?.amount || 0;
  const maxBet = member.birras + refund;
  const baseCuota = match.cuotas[outcome];
  const hasExact = exactH !== "" && exactA !== "" && !isNaN(parseInt(exactH)) && !isNaN(parseInt(exactA));
  const finalCuota = baseCuota * (hasExact ? CFG.EXACT_BONUS : 1);
  const potentialWin = Math.round(amount * finalCuota);

  const submit = () => {
    if (amount < 1) return setErr("Mínim 1🍺");
    if (amount > maxBet) return setErr(`Només tens ${maxBet}🍺`);
    let exactScore = null;
    if (exactH !== "" || exactA !== "") {
      const h = parseInt(exactH), a = parseInt(exactA);
      if (isNaN(h) || isNaN(a) || h < 0 || a < 0) return setErr("Marcador no vàlid");
      exactScore = scoreKey(h, a);
    }
    onSubmit({ outcome, amount, exactScore, joker: false });
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "flex-end", zIndex: 100 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.card, borderRadius: "20px 20px 0 0", padding: 22, width: "100%", maxWidth: 480, margin: "0 auto", maxHeight: "94vh", overflowY: "auto" }}>
        <div style={{ width: 40, height: 4, background: C.border, borderRadius: 2, margin: "0 auto 14px" }} />
        <div style={{ fontFamily: "var(--pff2)", fontSize: 11, color: C.gold, letterSpacing: 3, textAlign: "center", fontWeight: 600 }}>{match.league}</div>
        <div style={{ textAlign: "center", fontFamily: "var(--pff)", fontSize: 24, color: C.txt, marginBottom: 2, letterSpacing: 1 }}>{match.home} <span style={{ color: C.muted, fontSize: 14 }}>VS</span> {match.away}</div>
        <div style={{ textAlign: "center", fontSize: 12, color: C.muted, marginBottom: 14 }}>Disponible: {maxBet}🍺</div>
        <div style={{ ...sty.label, textAlign: "center" }}>1 · TRIA GUANYADOR</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {[["H", match.home], ["D", "Empat"], ["A", match.away]].map(([k, lbl]) => {
            const sel = outcome === k;
            const c = match.cuotas[k];
            return (
              <button key={k} onClick={() => setOutcome(k)} style={{ flex: 1, padding: 14, borderRadius: 10, border: `2px solid ${sel ? C.gold : C.border}`, background: sel ? C.bluePale : C.card2, cursor: "pointer", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: C.muted, fontFamily: "var(--pff2)", letterSpacing: 1, marginBottom: 6, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", fontWeight: 600 }}>{lbl}</div>
                <Cuota value={c} big />
              </button>
            );
          })}
        </div>
        <div style={{ ...sty.label, textAlign: "center" }}>2 · MARCADOR EXACTE (opcional)</div>
        <div style={{ background: C.card2, borderRadius: 10, padding: 12, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 6 }}>
            <input type="number" min="0" max="15" placeholder="?" value={exactH} onChange={e => setExactH(e.target.value)} style={{ width: 56, height: 56, textAlign: "center", fontSize: 26, fontFamily: "var(--pff)", background: C.bg, border: `2px solid ${exactH !== "" ? C.amber : C.border}`, borderRadius: 10, color: C.amber, outline: "none" }} />
            <span style={{ fontSize: 24, color: C.border, fontFamily: "var(--pff)" }}>–</span>
            <input type="number" min="0" max="15" placeholder="?" value={exactA} onChange={e => setExactA(e.target.value)} style={{ width: 56, height: 56, textAlign: "center", fontSize: 26, fontFamily: "var(--pff)", background: C.bg, border: `2px solid ${exactA !== "" ? C.amber : C.border}`, borderRadius: 10, color: C.amber, outline: "none" }} />
          </div>
          <div style={{ textAlign: "center", fontSize: 11, color: hasExact ? C.amber : C.muted }}>
            {hasExact ? `⭐ Si claves el marcador, guanys ×${CFG.EXACT_BONUS}` : "Buit si només apostes al guanyador"}
          </div>
        </div>
        <div style={{ ...sty.label, textAlign: "center" }}>3 · QUANTES BIRRES</div>
        <div style={{ background: C.card2, borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <button onClick={() => setAmount(Math.max(1, amount - 5))} style={{ width: 32, height: 32, borderRadius: 6, background: C.bg, border: `1px solid ${C.border}`, color: C.txt, cursor: "pointer", fontWeight: 700, fontSize: 18 }}>–</button>
            <span style={{ fontFamily: "var(--pff)", fontSize: 30, color: C.gold, minWidth: 90, textAlign: "center" }}>{amount}🍺</span>
            <button onClick={() => setAmount(Math.min(maxBet, amount + 5))} style={{ width: 32, height: 32, borderRadius: 6, background: C.bg, border: `1px solid ${C.border}`, color: C.txt, cursor: "pointer", fontWeight: 700, fontSize: 18 }}>+</button>
          </div>
          <input type="range" min="1" max={Math.max(1, maxBet)} value={amount} onChange={e => setAmount(parseInt(e.target.value))} style={{ width: "100%", accentColor: C.gold, marginBottom: 10 }} />
          {/* Botons ràpids */}
          <div style={{ display: "flex", gap: 6 }}>
            {[5, 10, 25, 50].filter(v => v <= maxBet).map(v => (
              <button key={v} onClick={() => setAmount(v)} style={{ flex: 1, padding: "8px 4px", borderRadius: 8, background: amount === v ? C.gold : C.bg, color: amount === v ? "#000" : C.txt, border: `1px solid ${amount === v ? C.gold : C.border}`, fontFamily: "var(--pff2)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{v}🍺</button>
            ))}
            <button onClick={() => setAmount(maxBet)} style={{ flex: 1, padding: "8px 4px", borderRadius: 8, background: amount === maxBet ? C.red : C.bg, color: amount === maxBet ? "#fff" : C.red, border: `1px solid ${C.red}`, fontFamily: "var(--pff2)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>MÀX</button>
          </div>
        </div>
        <div style={{ background: "linear-gradient(135deg,#0d2200,#0a1500)", border: `1px solid ${C.green}`, borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 10, color: C.muted, fontFamily: "var(--pff2)", letterSpacing: 1, fontWeight: 600 }}>SI ENCERTES GUANYES</div>
              <div style={{ fontFamily: "var(--pff)", fontSize: 30, color: C.green, lineHeight: 1 }}>+{potentialWin - amount}🍺</div>
            </div>
            <div style={{ textAlign: "right", fontSize: 11, color: C.muted, fontFamily: "var(--pff2)", fontWeight: 600 }}>
              <div>Quota: ×{finalCuota.toFixed(2)}</div>
              <div>Total: {potentialWin}🍺</div>
            </div>
          </div>
        </div>
        {err && <p style={{ color: C.red, fontSize: 12, textAlign: "center", marginBottom: 8 }}>⚠ {err}</p>}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ ...sty.btnGhost, flex: 1 }}>CANCEL·LAR</button>
          <button onClick={submit} style={{ ...sty.btnPrimary, flex: 2 }}>{existing ? "DESAR" : "APOSTAR!"} 🍺</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────── 10. JACKPOT ESPANYA MODAL ────────────────────────────
// Cada partit d'Espanya té el seu pot. Els jugadors aposten birres + prediuen
// resultat exacte. Qui l'encerta s'emporta TOT (incl. acumulat anterior). Si
// ningú encerta, les birres es perden i s'arrosseguen al següent partit.
function EspanyaModal({ match, currentPot, carryPot, member, existing, onSubmit, onClose }) {
  const [home, setHome] = useState(existing?.home ?? "");
  const [away, setAway] = useState(existing?.away ?? "");
  const [err, setErr] = useState("");
  const [showHow, setShowHow] = useState(false);

  const bet = CFG.ESPANYA_MIN_BET; // aposta FIXA per tothom
  const alreadyPaid = existing?.amount ?? 0;
  const needed = existing ? 0 : bet; // si ja ha apostat, només canvia el pronòstic (gratis)
  const canAfford = existing ? true : member.birras >= bet;

  const submit = () => {
    setErr("");
    const h = parseInt(home), a = parseInt(away);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) return setErr("Posa el resultat exacte");
    if (!canAfford) return setErr(`Necessites ${bet}🍺 per jugar`);
    onSubmit({ home: h, away: a, amount: bet });
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "flex-end", zIndex: 100 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#180510", borderRadius: "20px 20px 0 0", padding: 22, width: "100%", maxWidth: 480, margin: "0 auto", maxHeight: "94vh", overflowY: "auto", border: `1px solid ${C.red}` }}>
        <div style={{ width: 40, height: 4, background: C.border, borderRadius: 2, margin: "0 auto 14px" }} />
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 36, marginBottom: 4 }}>🇪🇸</div>
          <div style={{ fontFamily: "var(--pff)", fontSize: 26, color: C.red, letterSpacing: 3 }}>JACKPOT ESPANYA</div>
          <button onClick={() => setShowHow(!showHow)} style={{ background: "none", border: `1px solid ${C.muted}`, color: C.muted, borderRadius: 20, padding: "4px 14px", fontSize: 12, fontFamily: "var(--pff2)", fontWeight: 600, letterSpacing: 1, cursor: "pointer", marginTop: 8 }}>
            ℹ️ COM FUNCIONA?
          </button>
        </div>

        {showHow && (
          <div style={{ background: C.card2, borderRadius: 12, padding: 16, marginBottom: 14, border: `1px solid ${C.red}` }}>
            <div style={{ fontSize: 14, color: C.txt, lineHeight: 1.7 }}>
              <p style={{ marginBottom: 8 }}>🎯 Tothom aposta <b style={{ color: C.red }}>{bet}🍺 fixes</b> i prediu el <b>resultat exacte</b> del partit d'Espanya.</p>
              <p style={{ marginBottom: 8 }}>🏆 Qui encerti el marcador exacte <b style={{ color: C.gold }}>s'emporta TOT el pot</b> acumulat.</p>
              <p style={{ marginBottom: 8 }}>🔄 Si ningú no l'encerta, les birres <b>s'acumulen</b> pel pròxim partit d'Espanya.</p>
              <p>✏️ Pots canviar el teu pronòstic fins que comenci el partit (sense pagar més).</p>
            </div>
          </div>
        )}

        {/* Pot acumulat */}
        <div style={{ background: "linear-gradient(135deg,'#FEE2E2','#FCA5A5')", borderRadius: 14, padding: 16, marginBottom: 14, textAlign: "center", border: `1px solid ${C.red}` }}>
          <div style={{ fontFamily: "var(--pff2)", fontSize: 11, color: C.red, letterSpacing: 3, fontWeight: 600 }}>POT TOTAL EN JOC</div>
          <div style={{ fontFamily: "var(--pff)", fontSize: 52, color: C.gold, lineHeight: 1, marginTop: 4 }}>{currentPot + carryPot}🍺</div>
          {carryPot > 0 && <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>({carryPot}🍺 acumulats + {currentPot}🍺 d'aquest partit)</div>}
        </div>

        {/* Partit */}
        <div style={{ background: C.card, borderRadius: 12, padding: 14, marginBottom: 14, border: `1px solid ${C.border}` }}>
          <div style={{ fontFamily: "var(--pff2)", fontSize: 10, color: C.muted, letterSpacing: 2, marginBottom: 10, fontWeight: 600 }}>{match.league}{match.date ? ` · ${fmtDate(match.date)}` : ""}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span style={{ flex: 1, fontFamily: "var(--pff)", fontSize: 24, color: C.txt, textAlign: "right" }}>{match.home}</span>
            <span style={{ color: C.muted, fontFamily: "var(--pff2)", fontSize: 13, fontWeight: 700 }}>VS</span>
            <span style={{ flex: 1, fontFamily: "var(--pff)", fontSize: 24, color: C.txt, textAlign: "left" }}>{match.away}</span>
          </div>
          <div style={{ fontFamily: "var(--pff2)", fontSize: 11, color: C.muted, letterSpacing: 2, textAlign: "center", marginBottom: 10, fontWeight: 600 }}>EL TEU PRONÒSTIC EXACTE</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
            <input type="number" min="0" max="15" placeholder="?" value={home}
              onChange={e => setHome(e.target.value)}
              style={{ width: 70, height: 70, textAlign: "center", fontSize: 34, fontFamily: "var(--pff)", background: C.bg, border: `2px solid ${home !== "" ? C.red : C.border}`, borderRadius: 10, color: C.red, outline: "none" }} />
            <span style={{ fontSize: 28, color: C.border, fontFamily: "var(--pff)" }}>–</span>
            <input type="number" min="0" max="15" placeholder="?" value={away}
              onChange={e => setAway(e.target.value)}
              style={{ width: 70, height: 70, textAlign: "center", fontSize: 34, fontFamily: "var(--pff)", background: C.bg, border: `2px solid ${away !== "" ? C.red : C.border}`, borderRadius: 10, color: C.red, outline: "none" }} />
          </div>
        </div>

        {/* Aposta fixa */}
        <div style={{ background: C.card2, borderRadius: 12, padding: "14px 16px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: "var(--pff2)", fontSize: 11, color: C.muted, letterSpacing: 2, fontWeight: 600 }}>APOSTA FIXA</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{existing ? "Ja has pagat · només canvies el pronòstic" : `Tens ${member.birras}🍺`}</div>
          </div>
          <div style={{ fontFamily: "var(--pff)", fontSize: 36, color: C.red }}>{existing ? "✓" : `${bet}🍺`}</div>
        </div>

        {err && <p style={{ color: C.red, fontSize: 13, textAlign: "center", marginBottom: 10 }}>⚠ {err}</p>}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ ...sty.btnGhost, flex: 1 }}>CANCEL·LAR</button>
          <button onClick={submit} style={{ ...sty.btnPrimary, flex: 2, background: C.red, color: "#fff" }}>{existing ? "DESAR PRONÒSTIC" : "A PEL POT! 🏆"}</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── 11. COIN FLIP MODAL ──────────────────────────
function CoinFlipModal({ member, current, onPlay, onCashout, onClose }) {
  const [flipping, setFlipping] = useState(false);
  const [picked, setPicked] = useState(null);
  const inGame = current && !current.lost && !current.cashedOut;
  const currentBote = inGame ? current.currentBote : 0;
  const doubles = inGame ? current.doubles : 0;
  const canDouble = doubles < CFG.COIN_MAX_DOUBLES;
  const canStart = !inGame && !current && member.birras >= CFG.COIN_ENTRY;
  const alreadyPlayed = current && (current.lost || current.cashedOut);

  const flipCoin = (choice) => {
    setPicked(choice); setFlipping(true);
    setTimeout(() => {
      const result = Math.random() < 0.5 ? "cara" : "creu";
      onPlay(choice, result);
      setFlipping(false);
      setTimeout(() => setPicked(null), 600);
    }, 1400);
  };

  return (
    <div onClick={() => !flipping && onClose()} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "flex-end", zIndex: 100 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.card, borderRadius: "20px 20px 0 0", padding: 24, width: "100%", maxWidth: 480, margin: "0 auto", maxHeight: "94vh", overflowY: "auto", border: `1px solid ${C.amber}` }}>
        <div style={{ width: 40, height: 4, background: C.border, borderRadius: 2, margin: "0 auto 14px" }} />
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 50, marginBottom: 4, animation: flipping ? "spin 0.4s linear infinite" : "none" }}>🪙</div>
          <div style={{ fontFamily: "var(--pff)", fontWeight: 900, fontSize: 26, color: C.amber, letterSpacing: 2 }}>CARA O CREU</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Setmanal · 50% probabilitat</div>
        </div>

        {alreadyPlayed && (
          <div style={{ background: current.lost ? "#2a0000" : "#0d2200", border: `1px solid ${current.lost ? C.red : C.green}`, borderRadius: 10, padding: 14, marginBottom: 14, textAlign: "center", color: current.lost ? C.red : C.green, fontSize: 14, fontWeight: 700 }}>
            {current.lost ? `Aquesta setmana ja has perdut. Torna dilluns!` : `Has agafat ${current.currentBote}🍺 aquesta setmana ✓`}
          </div>
        )}

        {!inGame && !alreadyPlayed && (
          <>
            <div style={{ background: C.card2, borderRadius: 12, padding: 16, marginBottom: 16, textAlign: "center" }}>
              <div style={{ fontSize: 11, color: C.muted, fontFamily: "var(--pff)", letterSpacing: 1, marginBottom: 4 }}>ENTRADA</div>
              <div style={{ fontFamily: "var(--pff)", fontWeight: 900, fontSize: 32, color: C.amber }}>{CFG.COIN_ENTRY}🍺</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
                Si encertes guanyes {CFG.COIN_ENTRY * 2}🍺.<br />
                Pots plantar-te o doblar fins {CFG.COIN_MAX_DOUBLES} cops (fins {CFG.COIN_ENTRY * Math.pow(2, CFG.COIN_MAX_DOUBLES + 1)}🍺).<br />
                Si falles, ho perds tot.
              </div>
            </div>
            {!canStart && member.birras < CFG.COIN_ENTRY && (
              <p style={{ color: C.red, fontSize: 12, textAlign: "center", marginBottom: 10 }}>⚠ No tens prou birres ({CFG.COIN_ENTRY}🍺 mínim)</p>
            )}
            <div style={{ ...sty.label, textAlign: "center" }}>TRIA CARA O CREU</div>
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              {["cara", "creu"].map(c => (
                <button key={c} onClick={() => canStart && flipCoin(c)} disabled={!canStart || flipping}
                  style={{ flex: 1, padding: 18, borderRadius: 12, background: picked === c ? C.amber : C.card2, color: picked === c ? "#FFFFFF" : C.txt, border: `2px solid ${picked === c ? C.gold : C.border}`, fontFamily: "var(--pff)", fontWeight: 900, fontSize: 22, letterSpacing: 2, cursor: canStart && !flipping ? "pointer" : "not-allowed", opacity: !canStart ? 0.4 : 1 }}>
                  {c === "cara" ? "🟡 CARA" : "⚪ CREU"}
                </button>
              ))}
            </div>
          </>
        )}

        {inGame && (
          <>
            <div style={{ background: "linear-gradient(135deg,#3a2800,#1a1200)", borderRadius: 12, padding: 18, marginBottom: 16, textAlign: "center", border: `1px solid ${C.gold}` }}>
              <div style={{ fontSize: 11, color: C.amber, fontFamily: "var(--pff)", letterSpacing: 2 }}>POT ACUMULAT</div>
              <div style={{ fontFamily: "var(--pff)", fontWeight: 900, fontSize: 50, color: C.gold, lineHeight: 1, animation: "pulse 2s ease-in-out infinite" }}>{currentBote}🍺</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                {doubles === 0 && "Has guanyat el primer tirar"}
                {doubles > 0 && `${doubles} dobl${doubles === 1 ? "ada" : "adas"} seguid${doubles === 1 ? "a" : "es"} 🔥`}
              </div>
            </div>
            {canDouble ? (
              <>
                <div style={{ background: C.card2, borderRadius: 10, padding: 12, marginBottom: 14, fontSize: 12, color: C.muted, textAlign: "center" }}>
                  Si dobles i encertes: <span style={{ color: C.green, fontWeight: 700 }}>{currentBote * 2}🍺</span><br />
                  Si dobles i falles: <span style={{ color: C.red, fontWeight: 700 }}>perds {currentBote}🍺</span>
                </div>
                <div style={{ ...sty.label, textAlign: "center" }}>DOBLA O PLANTA'T</div>
                <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                  {["cara", "creu"].map(c => (
                    <button key={c} onClick={() => flipCoin(c)} disabled={flipping}
                      style={{ flex: 1, padding: 18, borderRadius: 12, background: picked === c ? C.amber : C.card2, color: picked === c ? "#FFFFFF" : C.txt, border: `2px solid ${picked === c ? C.gold : C.border}`, fontFamily: "var(--pff)", fontWeight: 900, fontSize: 18, letterSpacing: 1, cursor: flipping ? "not-allowed" : "pointer" }}>
                      DOBLAR<br />{c === "cara" ? "🟡 CARA" : "⚪ CREU"}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ background: "#2a1800", border: `1px solid ${C.amber}`, borderRadius: 10, padding: 14, marginBottom: 14, textAlign: "center", fontSize: 13, color: C.amber }}>
                🎯 Has arribat al màxim de {CFG.COIN_MAX_DOUBLES} dobladas. T'has de plantar.
              </div>
            )}
            <button onClick={onCashout} style={{ ...sty.btnPrimary, width: "100%", background: C.green, color: "#fff", marginBottom: 8 }}>
              💰 PLANTAR-ME I AGAFAR {currentBote}🍺
            </button>
          </>
        )}
        <button onClick={onClose} style={{ ...sty.btnGhost, width: "100%" }}>TANCAR</button>
      </div>
    </div>
  );
}

// ─────────────────────────── EMOJI MODAL ──────────────────────────────────

function EmojiChangeModal({ current, onSave, onClose }) {
  const [emoji, setEmoji] = useState(current);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 150, padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.card, borderRadius: 16, padding: 22, width: "100%", maxWidth: 380 }}>
        <div style={{ fontFamily: "var(--pff)", fontWeight: 800, fontSize: 22, color: C.gold, marginBottom: 14, textAlign: "center" }}>CANVIA EL TEU EMOJI</div>
        <div style={{ background: C.card2, padding: 12, borderRadius: 10, marginBottom: 14 }}>
          <EmojiPicker value={emoji} onChange={setEmoji} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ ...sty.btnGhost, flex: 1 }}>CANCEL·LAR</button>
          <button onClick={() => onSave(emoji)} style={{ ...sty.btnPrimary, flex: 1 }}>DESAR</button>
        </div>
      </div>
    </div>
  );
}



function AdminPassModal({ onSubmit, onClose }) {
  const [pass, setPass] = useState("");
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.93)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 20 }}>
      <div style={{ background: C.card, borderRadius: 16, padding: 24, width: "100%", maxWidth: 320 }}>
        <div style={{ fontFamily: "var(--pff)", fontWeight: 800, fontSize: 22, color: C.amber, marginBottom: 14 }}>🔐 ADMIN</div>
        <input type="password" placeholder="Contrasenya admin" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === "Enter" && onSubmit(pass)} style={{ ...sty.input, marginBottom: 12 }} autoFocus />
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ ...sty.btnGhost, flex: 1 }}>CANCEL·LAR</button>
          <button onClick={() => onSubmit(pass)} style={{ ...sty.btnPrimary, flex: 1 }}>ENTRAR</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── 13. ADMIN PANEL ──────────────────────────────
function AdminPanel({ data, handlers, onClose }) {
  const { groups, members, accounts, matches } = data;
  const [tab, setTab] = useState("matches");
  const [selGroupId, setSelGroupId] = useState(groups[0]?.id || "");
  const [nm, setNm] = useState({ home: "", away: "", date: "", league: LEAGUES[0], cuotas: { H: "1.50", D: "3.00", A: "5.00" }, spain: false, applyToAllGroups: true });
  const [results, setResults] = useState({});
  const [saved, setSaved] = useState({});
  const [rechargeMember, setRechargeMember] = useState("");
  const [rechargeEUR, setRechargeEUR] = useState(CFG.ENTRY_EUR);

  const group = groups.find(g => g.id === selGroupId);
  const groupMatches = matches.filter(m => m.groupId === selGroupId);
  const groupMembers = members.filter(m => m.groupId === selGroupId);
  const pending = groupMatches.filter(m => m.status !== "finished");
  const memberLabel = mid => { const m = members.find(m => m.id === mid); const a = accounts.find(a => a.id === m?.accountId); return `${a?.emoji || "🍺"} ${a?.name || "?"}`; };

  const submitMatch = async () => {
    if (!nm.home.trim() || !nm.away.trim()) return;
    if (nm.home.trim() === nm.away.trim()) return alert("Equip local i visitant no poden ser iguals");
    if (!nm.applyToAllGroups && !selGroupId) return alert("Selecciona un grup");
    const cuotas = { H: parseFloat(nm.cuotas.H), D: parseFloat(nm.cuotas.D), A: parseFloat(nm.cuotas.A) };
    if ([cuotas.H, cuotas.D, cuotas.A].some(c => isNaN(c) || c < 1)) return alert("Quotes no vàlides");
    await handlers.addMatch({ ...nm, cuotas, groupId: selGroupId });
    setNm({ home: "", away: "", date: "", league: nm.league, cuotas: { H: "1.50", D: "3.00", A: "5.00" }, spain: false, applyToAllGroups: nm.applyToAllGroups });
  };
  const prefillSpain = async () => {
    if (groups.length === 0) { alert("Crea un grup primer"); return; }
    if (!confirm("Afegir els 3 partits d'Espanya de la fase de grups a TOTS els grups?")) return;
    // Dates oficials Mundial 2026 (horari peninsular aproximat)
    const spainMatches = [
      { home: "Espanya", away: "Cap Verd", date: "2026-06-15T18:00", league: "Fase de Grup", cuotas: { H: 1.25, D: 5.5, A: 11.0 } },
      { home: "Espanya", away: "Aràbia Saudí", date: "2026-06-21T18:00", league: "Fase de Grup", cuotas: { H: 1.35, D: 4.5, A: 8.0 } },
      { home: "Espanya", away: "Uruguai", date: "2026-06-26T03:00", league: "Fase de Grup", cuotas: { H: 1.9, D: 3.3, A: 3.8 } },
    ];
    for (const m of spainMatches) {
      await handlers.addMatch({ ...m, spain: true, applyToAllGroups: true, groupId: selGroupId });
    }
    alert("✓ 3 partits d'Espanya afegits a tots els grups!");
  };
  const submitResult = async (id) => {
    const r = results[id]; if (!r || r.home === "" || r.away === "") return;
    await handlers.setResult(id, { home: parseInt(r.home), away: parseInt(r.away) });
    setSaved(p => ({ ...p, [id]: true }));
  };
  const submitRecharge = async () => {
    const eur = parseFloat(rechargeEUR);
    if (!rechargeMember || isNaN(eur) || eur < 0) return;
    await handlers.recharge(rechargeMember, eur);
    setRechargeEUR(CFG.ENTRY_EUR);
  };

  const tabs = [["matches", "⚽"], ["results", `✅ (${pending.length})`], ["recharge", "💶"], ["month", "📅"]];

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "flex-end", zIndex: 200 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#100c08", border: `1px solid ${C.amber}`, borderRadius: "20px 20px 0 0", padding: 22, width: "100%", maxWidth: 480, margin: "0 auto", maxHeight: "94vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontFamily: "var(--pff)", fontWeight: 900, fontSize: 22, color: C.amber }}>🛠 PANELL ADMIN</span>
          <button onClick={onClose} style={{ background: C.card2, border: "none", color: C.txt, width: 32, height: 32, borderRadius: "50%", cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>
        <label style={sty.label}>GRUP</label>
        <select value={selGroupId} onChange={e => setSelGroupId(e.target.value)} style={{ ...sty.input, marginBottom: 14 }}>
          {groups.length === 0 && <option value="">(cap grup)</option>}
          {groups.map(g => <option key={g.id} value={g.id}>{g.name} — {fmtEUR(g.bote_EUR)}</option>)}
        </select>
        <div style={{ display: "flex", gap: 4, marginBottom: 16, overflowX: "auto" }}>
          {tabs.map(([id, l]) => (
            <button key={id} onClick={() => setTab(id)} style={{ flexShrink: 0, padding: "9px 14px", borderRadius: 8, border: "none", background: tab === id ? C.gold : C.card2, color: tab === id ? "#FFFFFF" : C.muted, fontFamily: "var(--pff)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{l}</button>
          ))}
        </div>

        {tab === "matches" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: C.muted, fontFamily: "var(--pff2)", letterSpacing: 1.5, marginBottom: 4, fontWeight: 600 }}>EQUIP LOCAL</div>
              <select value={nm.home} onChange={e => setNm(p => ({ ...p, home: e.target.value }))} style={sty.input}>
                <option value="">— Selecciona —</option>
                {NATION_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 10, color: C.muted, fontFamily: "var(--pff2)", letterSpacing: 1.5, marginBottom: 4, fontWeight: 600 }}>EQUIP VISITANT</div>
              <select value={nm.away} onChange={e => setNm(p => ({ ...p, away: e.target.value }))} style={sty.input}>
                <option value="">— Selecciona —</option>
                {NATION_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <select value={nm.league} onChange={e => setNm(p => ({ ...p, league: e.target.value }))} style={sty.input}>
              {LEAGUES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <input type="datetime-local" value={nm.date} onChange={e => setNm(p => ({ ...p, date: e.target.value }))} style={sty.input} />
            <div style={{ background: C.card2, borderRadius: 10, padding: 12 }}>
              <div style={{ ...sty.label, marginBottom: 8 }}>QUOTES (1X2)</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                {[
                  { lbl: "🏠 Local favorit", c: { H: "1.40", D: "4.00", A: "7.00" } },
                  { lbl: "⚖️ Igualat", c: { H: "2.50", D: "3.20", A: "2.70" } },
                  { lbl: "✈️ Visit. favorit", c: { H: "7.00", D: "4.00", A: "1.40" } },
                ].map(p => (
                  <button key={p.lbl} type="button" onClick={() => setNm(prev => ({ ...prev, cuotas: p.c }))}
                    style={{ flex: "1 1 30%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 4px", color: C.muted, fontSize: 11, fontFamily: "var(--pff2)", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                    {p.lbl}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {[["H", "Local"], ["D", "Empat"], ["A", "Visit."]].map(([k, lbl]) => (
                  <div key={k} style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>{lbl}</div>
                    <input type="number" step="0.10" min="1" value={nm.cuotas[k]} onChange={e => setNm(p => ({ ...p, cuotas: { ...p.cuotas, [k]: e.target.value } }))} style={{ ...sty.input, textAlign: "center", padding: "8px 4px", color: C.gold, fontWeight: 700, fontSize: 16 }} />
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 8, textAlign: "center" }}>💡 Toca un preset per omplir-les automàticament, o edita-les a mà</div>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 10, background: "#0d2200", padding: 12, borderRadius: 8, cursor: "pointer", border: `1px solid ${C.green}` }}>
              <input type="checkbox" checked={nm.applyToAllGroups} onChange={e => setNm(p => ({ ...p, applyToAllGroups: e.target.checked }))} style={{ accentColor: C.green, width: 18, height: 18 }} />
              <div><div style={{ fontFamily: "var(--pff)", fontSize: 16, color: C.green, letterSpacing: 1 }}>🌐 AFEGIR A TOTS ELS GRUPS</div><div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>El partit es crearà a tots els grups existents ({groups.length}). Si desactives, només al grup seleccionat.</div></div>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 10, background: "#FEE2E2", padding: 12, borderRadius: 8, cursor: "pointer", border: `1px solid ${C.red}` }}>
              <input type="checkbox" checked={nm.spain} onChange={e => setNm(p => ({ ...p, spain: e.target.checked }))} style={{ accentColor: C.red, width: 18, height: 18 }} />
              <div><div style={{ fontFamily: "var(--pff)", fontSize: 16, color: C.red, letterSpacing: 1 }}>🇪🇸 PARTIT D'ESPANYA</div><div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Compta pel Jackpot Selecció Espanyola</div></div>
            </label>
            <button onClick={submitMatch} style={sty.btnPrimary}>➕ AFEGIR PARTIT</button>

            <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 8, paddingTop: 14 }}>
              <div style={{ fontFamily: "var(--pff2)", fontSize: 10, color: C.muted, letterSpacing: 2, marginBottom: 8, fontWeight: 600 }}>SNACK RÀPID</div>
              <button onClick={prefillSpain} style={{ ...sty.btnGhost, width: "100%", background: "#FEE2E2", color: C.red, border: `1px solid ${C.red}` }}>
                🇪🇸 PRECARREGAR PARTITS D'ESPANYA (FASE DE GRUPS)
              </button>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>Afegeix els 3 partits: Espanya–Cap Verd (15/6), Espanya–Aràbia Saudí (21/6) i Espanya–Uruguai (26/6). Marcats com a partit d'Espanya.</div>
            </div>
          </div>
        )}

        {tab === "results" && (
          <div>
            {pending.length === 0 ? <p style={{ color: C.muted, textAlign: "center", padding: 24 }}>Cap pendent ✅</p> :
              pending.map(m => (
                <div key={m.id} style={{ ...sty.card, marginBottom: 10 }}>
                  <div style={{ display: "flex", gap: 4, marginBottom: 6, flexWrap: "wrap" }}>
                    {m.spain && <Chip color={C.red} bg="#FEE2E2" border={C.red}>🇪🇸 ESPANYA</Chip>}
                  </div>
                  <div style={{ fontFamily: "var(--pff)", fontWeight: 700, fontSize: 16, marginBottom: 8, color: C.txt }}>{m.home} vs {m.away}</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input type="number" min="0" placeholder="0" value={results[m.id]?.home ?? ""} onChange={e => setResults(p => ({ ...p, [m.id]: { ...p[m.id], home: e.target.value } }))} style={{ width: 56, height: 50, textAlign: "center", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.gold, fontSize: 22, fontWeight: 700, fontFamily: "var(--pff)", outline: "none" }} />
                    <span style={{ color: C.muted, fontFamily: "var(--pff)" }}>–</span>
                    <input type="number" min="0" placeholder="0" value={results[m.id]?.away ?? ""} onChange={e => setResults(p => ({ ...p, [m.id]: { ...p[m.id], away: e.target.value } }))} style={{ width: 56, height: 50, textAlign: "center", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.gold, fontSize: 22, fontWeight: 700, fontFamily: "var(--pff)", outline: "none" }} />
                    <button onClick={() => submitResult(m.id)} style={{ flex: 1, padding: "13px 8px", background: saved[m.id] ? C.muted : C.green, color: "#fff", border: "none", borderRadius: 8, fontFamily: "var(--pff)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{saved[m.id] ? "✅" : "DESAR"}</button>
                  </div>
                </div>
              ))}
          </div>
        )}

        {tab === "recharge" && (
          <div>
            <div style={{ ...sty.card, marginBottom: 14 }}>
              <div style={{ fontFamily: "var(--pff)", fontWeight: 700, fontSize: 15, color: C.gold, marginBottom: 10 }}>Recàrrega</div>
              <select value={rechargeMember} onChange={e => setRechargeMember(e.target.value)} style={{ ...sty.input, marginBottom: 8 }}>
                <option value="">Jugador...</option>
                {groupMembers.map(m => <option key={m.id} value={m.id}>{memberLabel(m.id)} ({m.birras}🍺)</option>)}
              </select>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <span style={{ color: C.muted, fontSize: 13 }}>Va pagar:</span>
                <input type="number" step="0.50" value={rechargeEUR} onChange={e => setRechargeEUR(e.target.value)} style={{ flex: 1, ...sty.input, textAlign: "center", color: C.gold, fontWeight: 700, fontSize: 18, fontFamily: "var(--pff)" }} />
                <span style={{ color: C.muted }}>€</span>
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>→ +{Math.round(parseFloat(rechargeEUR || 0) / CFG.BIRRA_EUR)}🍺 i {fmtEUR(parseFloat(rechargeEUR || 0))} al pot</div>
              <button onClick={submitRecharge} style={{ ...sty.btnPrimary, width: "100%", background: C.green, color: "#fff" }}>➕ CONFIRMAR</button>
            </div>
            <div style={{ ...sty.label, marginBottom: 8 }}>SALDOS</div>
            {[...groupMembers].sort((a, b) => b.birras - a.birras).map(m => (
              <div key={m.id} style={{ background: C.card, borderRadius: 8, padding: "10px 14px", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: C.txt }}>{memberLabel(m.id)}</span>
                <span style={{ fontFamily: "var(--pff)", fontWeight: 900, fontSize: 20, color: m.birras > 0 ? C.gold : C.red }}>{m.birras}🍺</span>
              </div>
            ))}
          </div>
        )}

        {tab === "month" && group && (
          <div>
            <div style={{ ...sty.card, marginBottom: 14, textAlign: "center", background: "linear-gradient(135deg,#2a1d00,#16110a)" }}>
              <div style={{ fontSize: 11, color: C.muted, fontFamily: "var(--pff)", letterSpacing: 2 }}>POT ACTUAL</div>
              <div style={{ fontFamily: "var(--pff)", fontWeight: 900, fontSize: 44, color: C.gold, lineHeight: 1 }}>{fmtEUR(group.bote_EUR)}</div>
              <div style={{ fontSize: 13, color: C.amber, marginTop: 4 }}>🍺 {eurToBeers(group.bote_EUR)} birres</div>
            </div>
            <div style={{ background: C.card2, borderRadius: 10, padding: 14, marginBottom: 12, fontSize: 12, color: C.muted }}>
              <div style={{ marginBottom: 6, fontWeight: 700, color: C.txt }}>Repartiment:</div>
              {CFG.PRIZES.map((p, i) => {
                const eur = group.bote_EUR * p;
                return <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                  <span>{["🥇 1r", "🥈 2n", "🥉 3r", "4️⃣ 4t"][i]} ({Math.round(p * 100)}%)</span>
                  <span style={{ color: C.gold, fontFamily: "var(--pff)", fontWeight: 700 }}>{fmtEUR(eur)} · {eurToBeers(eur)}🍺</span>
                </div>;
              })}
            </div>
            {/* Botons tancar mes i doblar eliminats: es farà manualment al final del Mundial */}

            {/* Zona perillosa: esborrar grup */}
            <div style={{ borderTop: `1px solid ${C.red}`, paddingTop: 16, marginTop: 8 }}>
              <div style={{ fontFamily: "var(--pff2)", fontSize: 10, color: C.red, letterSpacing: 2, marginBottom: 8, fontWeight: 700 }}>⚠ ZONA PERILLOSA</div>
              <button
                onClick={async () => {
                  if (!confirm(`Esborrar el grup "${group.name}"?\n\nAixò eliminarà:\n· Tots els membres del grup\n· Tots els partits del grup\n· Totes les porres del grup\n· El Jackpot acumulat`)) return;
                  if (!confirm("Ho confirmes? Aquesta acció NO es pot desfer.")) return;
                  await handlers.deleteGroup(selGroupId);
                  // Tancar panell o canviar de grup seleccionat
                  const remaining = groups.filter(g => g.id !== selGroupId);
                  setSelGroupId(remaining[0]?.id || "");
                }}
                style={{ width: "100%", background: "#2a0000", color: C.red, border: `1px solid ${C.red}`, borderRadius: 10, padding: "12px", fontFamily: "var(--pff)", fontSize: 16, letterSpacing: 2, cursor: "pointer" }}>
                🗑️ ESBORRAR GRUP
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//                              MAIN APP
// ═══════════════════════════════════════════════════════════════════════════
export default function App() {
  const [accounts, setAccounts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [members, setMembers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [bets, setBets] = useState([]);
  const [clasico, setClasico] = useState({});
  const [europa, setEuropa] = useState({});
  const [chats, setChats] = useState({});
  const [coinflips, setCoinflips] = useState({});
  const [loaded, setLoaded] = useState(false);

  const [account, setAccount] = useState(null);
  const [activeGroupId, setActiveGroupIdRaw] = useState(() => {
    try { return localStorage.getItem("birraporra_gid") || null; } catch { return null; }
  });
  const setActiveGroupId = (gid) => {
    try {
      if (gid) localStorage.setItem("birraporra_gid", gid);
      else localStorage.removeItem("birraporra_gid");
    } catch {}
    setActiveGroupIdRaw(gid);
  };

  const [tab, setTab] = useState("matches");
  const [betMatch, setBetMatch] = useState(null);
  const [showClasico, setShowClasico] = useState(false);
  const [showCoin, setShowCoin] = useState(false);
  const [matchSection, setMatchSection] = useState("open"); // "open" | "live" | "done"
  const [doneFilter, setDoneFilter] = useState("all"); // "all" | "hit" | "miss" | "no_bet"
  const [showRules, setShowRules] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showEuropa, setShowEuropa] = useState(false);
  const [showEmojiChange, setShowEmojiChange] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [toast, setToast] = useState(null);
  const [tick, setTick] = useState(0);
  const [confetti, setConfetti] = useState(false);
  const seenWinsRef = useRef(null);

  useEffect(() => {
    const link = document.createElement("link"); link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Oswald:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
    const s = document.createElement("style");
    s.textContent = `:root{--pff:'Bebas Neue',sans-serif;--pff2:'Oswald',sans-serif}*{box-sizing:border-box;margin:0;padding:0}body{background:${C.bg};font-family:'Inter',sans-serif;color:${C.txt};-webkit-tap-highlight-color:transparent}.card-shadow{box-shadow:0 2px 12px rgba(0,0,0,0.07)}input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes spin{to{transform:rotate(360deg)}}@keyframes foam{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}}@keyframes flagShine{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}@keyframes confettiFall{0%{transform:translateY(-20px) rotate(0deg);opacity:1}100%{transform:translateY(380px) rotate(720deg);opacity:0}}button:active{transform:scale(0.97)}.mundial-stripe{background:linear-gradient(90deg,#E4151B 0%,#E4151B 33%,#006847 33%,#006847 66%,#003DA5 66%,#003DA5 100%);height:4px;width:100%}.hosts-stripe{background:linear-gradient(90deg,#e4151b,#009a5b,#0038a8);height:4px;width:100%}`;
    document.head.appendChild(s);
    const loadShared = async () => {
      // 1 SOLA petició: recarrega el document sencer i reparteix les claus
      const doc = await dbReloadAll();
      setAccounts(doc.accounts || []); setGroups(doc.groups || []); setMembers(doc.members || []);
      setMatches(doc.matches || []); setBets(doc.bets || []); setClasico(doc.clasico || {});
      setEuropa(doc.europa || {}); setChats(doc.chats || {}); setCoinflips(doc.coinflips || {});
    };
    // Càrrega inicial: quan acaba, marca loaded=true
    loadShared().then(() => setLoaded(true));
    // Polling cada 8s: només actualitza dades compartides, mai toca account/activeGroupId
    const t1 = setInterval(loadShared, 8000);
    const t2 = setInterval(() => setTick(t => t + 1), 30000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, []);


  // Detectar resultats nous i notificar + confeti si guanyes
  useEffect(() => {
    if (!account || !activeGroupId) { seenWinsRef.current = null; return; }
    const mem = members.find(m => m.accountId === account.id && m.groupId === activeGroupId);
    if (!mem) return;
    const settledBets = bets.filter(b => b.memberId === mem.id && b.settled);
    const settledCount = settledBets.length;
    const wins = settledBets.filter(b => b.payout > 0).length;
    if (seenWinsRef.current === null) {
      // Primera càrrega: guardem l'estat actual sense notificar
      seenWinsRef.current = { wins, settled: settledCount };
      return;
    }
    const prev = seenWinsRef.current;
    if (settledCount > prev.settled) {
      // Hi ha resultats nous des de l'última vegada
      const newWins = wins - prev.wins;
      const newResults = settledCount - prev.settled;
      if (newWins > 0) {
        // Calcular guany total dels nous encerts
        setConfetti(true);
        setTimeout(() => setConfetti(false), 3000);
        showToast(`🎉 Has guanyat ${newWins} porra${newWins > 1 ? "es" : ""}!`, "success");
      } else if (newResults > 0) {
        showToast(`📋 ${newResults} resultat${newResults > 1 ? "s" : ""} nou${newResults > 1 ? "s" : ""}. Mira "Les meves porres"`, "info");
      }
      seenWinsRef.current = { wins, settled: settledCount };
    }
  }, [bets, members, account, activeGroupId]);

  // ── SUPABASE AUTH: escoltar sessió i sincronitzar amb 'account' ───────────
  // S'executa en muntar el component, independentment de 'loaded'
  useEffect(() => {
    let cancelled = false;

    const syncFromUser = async (user) => {
      if (cancelled) return;
      if (!user) { setAccount(null); setActiveGroupId(null); return; }

      // Carreguem comptes, grups i membres de cop per evitar retards
      const [latestAccounts, latestGroups, latestMembers] = await Promise.all([
        dbGet(KEYS.accounts), dbGet(KEYS.groups), dbGet(KEYS.members),
      ]);
      let accs = latestAccounts || [];

      // Busquem el compte per authId (ID de Supabase)
      let acc = accs.find(a => a.authId === user.id);
      if (!acc) {
        const displayName = (user.user_metadata?.name || user.email.split("@")[0]).slice(0, 20);
        const emoji = user.user_metadata?.emoji || "🍺";
        acc = {
          id: uid(),
          authId: user.id,
          name: displayName,
          email: user.email,
          emoji,
          createdAt: Date.now(),
        };
        accs = [...accs, acc];
        await dbSet(KEYS.accounts, accs);
      }

      if (cancelled) return;
      setAccounts(accs);
      if (latestGroups) setGroups(latestGroups);
      if (latestMembers) setMembers(latestMembers);
      setAccount(acc);
      // NO setActiveGroupId aquí: que l'usuari triï grup a continuació
    };

    auth.getUser().then(syncFromUser);
    const unsubscribe = auth.onAuthChange(syncFromUser);
    return () => { cancelled = true; unsubscribe(); };
  }, []); // [] = s'executa 1 cop al muntar, el listener de Supabase ja gestiona els canvis

  // ── GRUPS V4: unir-se amb codi o crear (només admin) ──────────────────────
  const doJoinGroupV4 = async ({ code }, setErr) => {
    if (!code || !code.trim()) { setErr("Codi buit"); return; }
    const latestGroups = await dbGet(KEYS.groups);
    let grps = latestGroups || [];
    const trimmedCode = code.trim().toUpperCase();
    const found = grps.find(g => (g.joinCode || "").toUpperCase() === trimmedCode);
    if (!found) { setErr("Codi de grup incorrecte"); return; }

    // Crear membre si no existeix
    const latestMembers = await dbGet(KEYS.members);
    let mbs = latestMembers || [];
    const existing = mbs.find(m => m.accountId === account.id && m.groupId === found.id);
    if (!existing) {
      const newMember = {
        id: uid(),
        accountId: account.id,
        groupId: found.id,
        birras: CFG.START_BIRRAS,
        racha: 0,
        seenWelcome: false,
        joinedAt: Date.now(),
      };
      mbs = [...mbs, newMember];
      // +10€ al pot del grup automàticament
      grps = grps.map(g => g.id === found.id ? { ...g, bote_EUR: (g.bote_EUR || 0) + CFG.ENTRY_EUR } : g);
      await Promise.all([
        dbSet(KEYS.members, mbs),
        dbSet(KEYS.groups, grps),
      ]);
      setMembers(mbs);
    }
    setGroups(grps);
    setActiveGroupId(found.id);
  };

  const doCreateGroupV4 = async ({ name }, setErr) => {
    if (!adminMode) { setErr("Només l'admin pot crear grups"); return; }
    if (!name || !name.trim()) { setErr("Posa un nom"); return; }
    const latestGroups = await dbGet(KEYS.groups);
    let grps = latestGroups || [];
    // Generar codi únic de 6 caràcters
    const genCode = () => Array.from({ length: 6 }, () =>
      "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
    let joinCode;
    do { joinCode = genCode(); } while (grps.find(g => g.joinCode === joinCode));

    const newGroup = {
      id: uid(),
      name: name.trim(),
      joinCode,
      createdBy: account.id,
      createdAt: Date.now(),
      bote_EUR: 0,
    };
    grps = [...grps, newGroup];
    await dbSet(KEYS.groups, grps);

    // L'admin també es membre automàticament
    const latestMembers = await dbGet(KEYS.members);
    let mbs = latestMembers || [];
    const newMember = {
      id: uid(),
      accountId: account.id,
      groupId: newGroup.id,
      birras: CFG.START_BIRRAS,
      racha: 0,
      seenWelcome: false,
      joinedAt: Date.now(),
    };
    mbs = [...mbs, newMember];
    await dbSet(KEYS.members, mbs);

    setGroups(grps);
    setMembers(mbs);
    setActiveGroupId(newGroup.id);
  };

  const showToast = (msg, type = "info") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  // ── AUTH ─────────────────────────────────────────────────────────────────
  const doLogin = ({ name, pass }, setErr) => {
    const a = accounts.find(a => a.name.toLowerCase() === name.toLowerCase());
    if (!a) return setErr("Aquest compte no existeix");
    if (a.passHash !== hash(pass)) return setErr("Contrasenya incorrecta");
    setAccount(a);
  };
  const doSignup = async ({ name, pass, emoji }, setErr) => {
    if (accounts.find(a => a.name.toLowerCase() === name.toLowerCase())) return setErr("Aquest mote ja existeix");
    const newAcc = { id: uid(), name, passHash: hash(pass), emoji: emoji || "🍺", createdAt: Date.now() };
    const updated = [...accounts, newAcc];
    setAccounts(updated); await dbSet(KEYS.accounts, updated);
    setAccount(newAcc);
  };
  const updateEmoji = async (newEmoji) => {
    const updated = accounts.map(a => a.id === account.id ? { ...a, emoji: newEmoji } : a);
    setAccounts(updated); await dbSet(KEYS.accounts, updated);
    setAccount({ ...account, emoji: newEmoji });
    setShowEmojiChange(false);
    showToast(`Emoji canviat a ${newEmoji}`, "success");
  };

  const doJoin = async ({ groupId, groupPass, alreadyMember }, setErr) => {
    if (alreadyMember) {
      setActiveGroupId(groupId);
      const member = members.find(m => m.accountId === account.id && m.groupId === groupId);
      if (member && !member.seenWelcome) setShowRules(true);
      return;
    }
    const g = groups.find(g => g.id === groupId);
    if (!g) return setErr("Grup no trobat");
    if (g.passHash !== hash(groupPass)) return setErr("Contrasenya incorrecta");
    const newMember = { id: uid(), accountId: account.id, groupId, birras: CFG.START_BIRRAS, racha: 0, lastRobbery: 0, jokerWeek: null, seenWelcome: false, joinedAt: Date.now() };
    const updatedMembers = [...members, newMember];
    const updatedGroups = groups.map(gx => gx.id === groupId ? { ...gx, bote_EUR: gx.bote_EUR + CFG.ENTRY_EUR } : gx);
    setMembers(updatedMembers); setGroups(updatedGroups);
    await dbSet(KEYS.members, updatedMembers); await dbSet(KEYS.groups, updatedGroups);
    setActiveGroupId(groupId); setShowRules(true);
    showToast(`Endins! Paga ${fmtEUR(CFG.ENTRY_EUR)} a l'admin 🍺`);
  };
  const doCreate = async ({ name, pass }, setErr) => {
    const g = { id: uid(), name, passHash: hash(pass), createdAt: Date.now(), bote_EUR: CFG.ENTRY_EUR };
    const newMember = { id: uid(), accountId: account.id, groupId: g.id, birras: CFG.START_BIRRAS, racha: 0, lastRobbery: 0, jokerWeek: null, seenWelcome: false, joinedAt: Date.now() };
    const updatedGroups = [...groups, g];
    const updatedMembers = [...members, newMember];
    setGroups(updatedGroups); setMembers(updatedMembers);
    await dbSet(KEYS.groups, updatedGroups); await dbSet(KEYS.members, updatedMembers);
    setActiveGroupId(g.id); setShowRules(true);
    showToast(`Grup creat 🍺`);
  };

  const submitBet = async ({ outcome, amount, exactScore, joker }) => {
    if (!canBet(betMatch)) { setBetMatch(null); showToast("El partit ja ha començat", "error"); return; }
    const member = members.find(m => m.accountId === account.id && m.groupId === activeGroupId);
    const existing = bets.find(b => b.matchId === betMatch.id && b.memberId === member.id);
    const refund = existing?.amount || 0;
    if (member.birras + refund < amount) return;
    const newBet = { id: existing?.id || uid(), memberId: member.id, matchId: betMatch.id, outcome, amount, exactScore, joker: !!joker, payout: null, settled: false, createdAt: existing?.createdAt || Date.now() };
    const updatedBets = existing ? bets.map(b => b.id === existing.id ? newBet : b) : [...bets, newBet];
    let updatedMember = { ...member, birras: member.birras + refund - amount };
    if (joker) updatedMember.jokerWeek = weekKey();
    const updatedMembers = members.map(m => m.id === member.id ? updatedMember : m);
    setBets(updatedBets); setMembers(updatedMembers);
    await dbSet(KEYS.bets, updatedBets); await dbSet(KEYS.members, updatedMembers);
    setBetMatch(null);
    showToast("Porra registrada! 🎯", "success");
  };

  // CHAT eliminat — usuari prefereix WhatsApp

  // Jackpot Espanya: cada partit té el seu pot. L'usuari pot apostar una
  // quantitat de birres + predicció exacta. Edita per pujar la quantitat.
  const submitEspanya = async ({ home, away, amount }) => {
    const m = members.find(m => m.accountId === account.id && m.groupId === activeGroupId);
    const match = espanyaActiveMatch;
    if (!match || matchStarted(match)) { setShowClasico(false); showToast("Partit ja ha començat", "error"); return; }
    const groupData = clasico[activeGroupId] || { byMatch: {}, settled: {}, carry: 0 };
    const matchPot = groupData.byMatch[match.id] || { entries: [], total: 0 };
    const existing = matchPot.entries.find(e => e.memberId === m.id);
    const alreadyPaid = existing?.amount || 0;
    const delta = amount - alreadyPaid;
    if (delta < 0) { showToast("No pots reduir l'aposta", "error"); return; }
    if (m.birras < delta) { showToast(`Et falten ${delta - m.birras}🍺`, "error"); return; }

    let updatedEntries;
    if (existing) {
      updatedEntries = matchPot.entries.map(e => e.memberId === m.id
        ? { ...e, home, away, amount, updatedAt: Date.now() }
        : e);
    } else {
      updatedEntries = [...matchPot.entries, { memberId: m.id, home, away, amount, createdAt: Date.now() }];
    }
    const updatedMatchPot = { entries: updatedEntries, total: matchPot.total + delta };
    const updatedData = { ...groupData, byMatch: { ...groupData.byMatch, [match.id]: updatedMatchPot } };
    const updatedClasico = { ...clasico, [activeGroupId]: updatedData };
    const updatedMember = { ...m, birras: m.birras - delta };
    const updatedMembers = members.map(x => x.id === m.id ? updatedMember : x);
    setClasico(updatedClasico); setMembers(updatedMembers);
    await dbSet(KEYS.clasico, updatedClasico); await dbSet(KEYS.members, updatedMembers);
    setShowClasico(false);
    showToast(existing ? `Pronòstic actualitzat 🇪🇸` : `Endins al pot amb ${amount}🍺! 🇪🇸`, "success");
  };
  const submitClasico = submitEspanya; // alies retrocompatible

  const submitEuropa = async () => {}; // eliminat en v3
  const _unused_submitEuropa = async ({ predictions }) => {
    const member = members.find(m => m.accountId === account.id && m.groupId === activeGroupId);
    const wk = null;
    if (false) {
      setShowEuropa(false);
      showToast("Algun partit ja ha començat", "error");
      return;
    }
    const groupEuropa = europa[activeGroupId] || { entries: {}, settled: {} };
    const weekEntries = groupEuropa.entries[wk] || [];
    const existing = weekEntries.find(e => e.memberId === member.id);
    let updatedEntries;
    if (existing) updatedEntries = weekEntries.map(e => e.memberId === member.id ? { ...e, predictions } : e);
    else updatedEntries = [...weekEntries, { memberId: member.id, predictions, createdAt: Date.now() }];
    const updatedEuropa = { ...europa, [activeGroupId]: { ...groupEuropa, entries: { ...groupEuropa.entries, [wk]: updatedEntries } } };
    setEuropa(updatedEuropa); await dbSet(KEYS.europa, updatedEuropa);
    setShowEuropa(false);
    showToast(existing ? "Predicció actualitzada 🌍" : "Predicció enviada! 🌍", "success");
  };

  const playCoin = async (choice, result) => {
    const member = members.find(m => m.accountId === account.id && m.groupId === activeGroupId);
    const wk = weekKey();
    const myCoin = coinflips[member.id] || {};
    const inGame = myCoin.week === wk && !myCoin.lost && !myCoin.cashedOut;
    if (!inGame) {
      if (member.birras < CFG.COIN_ENTRY) return;
      const updatedMembers = members.map(m => m.id === member.id ? { ...m, birras: m.birras - CFG.COIN_ENTRY } : m);
      if (choice === result) {
        const newCoin = { week: wk, currentBote: CFG.COIN_ENTRY * 2, doubles: 0, lost: false, cashedOut: false };
        const uc = { ...coinflips, [member.id]: newCoin };
        setCoinflips(uc); setMembers(updatedMembers);
        await dbSet(KEYS.coinflips, uc); await dbSet(KEYS.members, updatedMembers);
        showToast(`✓ ${result.toUpperCase()}! Tens ${newCoin.currentBote}🍺`, "success");
      } else {
        const newCoin = { week: wk, currentBote: 0, doubles: 0, lost: true, cashedOut: false };
        const uc = { ...coinflips, [member.id]: newCoin };
        setCoinflips(uc); setMembers(updatedMembers);
        await dbSet(KEYS.coinflips, uc); await dbSet(KEYS.members, updatedMembers);
        showToast(`✗ ${result.toUpperCase()}! Has perdut ${CFG.COIN_ENTRY}🍺`, "error");
      }
    } else {
      if (choice === result) {
        const newBote = myCoin.currentBote * 2;
        const newCoin = { ...myCoin, currentBote: newBote, doubles: myCoin.doubles + 1 };
        const uc = { ...coinflips, [member.id]: newCoin };
        setCoinflips(uc); await dbSet(KEYS.coinflips, uc);
        showToast(`✓ ${result.toUpperCase()}! Doblat a ${newBote}🍺! 🔥`, "success");
      } else {
        const newCoin = { ...myCoin, currentBote: 0, lost: true };
        const uc = { ...coinflips, [member.id]: newCoin };
        setCoinflips(uc); await dbSet(KEYS.coinflips, uc);
        showToast(`✗ ${result.toUpperCase()}! Has perdut ${myCoin.currentBote}🍺`, "error");
      }
    }
  };
  const cashoutCoin = async () => {
    const member = members.find(m => m.accountId === account.id && m.groupId === activeGroupId);
    const myCoin = coinflips[member.id];
    if (!myCoin || myCoin.lost || myCoin.cashedOut) return;
    const won = myCoin.currentBote;
    const updatedMembers = members.map(m => m.id === member.id ? { ...m, birras: m.birras + won } : m);
    const newCoin = { ...myCoin, cashedOut: true };
    const uc = { ...coinflips, [member.id]: newCoin };
    setCoinflips(uc); setMembers(updatedMembers);
    await dbSet(KEYS.coinflips, uc); await dbSet(KEYS.members, updatedMembers);
    setShowCoin(false);
    showToast(`💰 Has agafat ${won}🍺!`, "success");
    if (won >= CFG.COIN_ENTRY * 4) {
    }
  };

  const markSeenWelcome = async () => {
    const member = members.find(m => m.accountId === account.id && m.groupId === activeGroupId);
    if (!member) { setShowRules(false); return; }
    const updated = { ...member, seenWelcome: true };
    const um = members.map(m => m.id === member.id ? updated : m);
    setMembers(um); await dbSet(KEYS.members, um);
    setShowRules(false);
  };

  const tryAdmin = (pass) => {
    if (pass === CFG.ADMIN_PASS) { setAdminMode(true); setShowAdminLogin(false); }
    else alert("Contrasenya incorrecta. Pista: gol2024");
  };
  const adminAddMatch = async (data) => {
    // Si applyToAllGroups, crea una còpia del partit a cada grup existent.
    // Tots els partits comparteixen el mateix matchKey perquè el resultat es propagui després.
    const ts = new Date(data.date).getTime() || Date.now();
    const matchKey = data.matchKey || uid(); // identificador compartit entre còpies
    const baseMatch = {
      home: data.home.trim(), away: data.away.trim(), date: data.date,
      league: data.league, cuotas: data.cuotas,
      spain: !!data.spain,
      status: "open", result: null, settledAt: null,
      matchKey, // per propagar resultats entre còpies
    };

    let toAdd = [];
    if (data.applyToAllGroups) {
      const targetGroups = groups.length > 0 ? groups : [{ id: data.groupId }];
      toAdd = targetGroups.map(g => ({ ...baseMatch, id: uid(), groupId: g.id }));
    } else {
      toAdd = [{ ...baseMatch, id: uid(), groupId: data.groupId }];
    }
    const updated = [...matches, ...toAdd];
    setMatches(updated); await dbSet(KEYS.matches, updated);
    const label = data.applyToAllGroups
      ? `Partit afegit a ${toAdd.length} grup${toAdd.length === 1 ? "" : "s"} ${data.spain ? "🇪🇸" : "⚽"}`
      : (data.spain ? "Partit d'Espanya afegit 🇪🇸" : "Partit afegit ⚽");
    showToast(label, "success");
  };

  const adminSetResult = async (matchId, result) => {
    const sourceMatch = matches.find(m => m.id === matchId);
    if (!sourceMatch) return;
    // Trobar totes les còpies (si té matchKey, totes les que comparteixen clau; si no, només aquesta)
    const sameMatches = sourceMatch.matchKey
      ? matches.filter(m => m.matchKey === sourceMatch.matchKey && m.status !== "finished")
      : [sourceMatch];

    let updatedMatches = [...matches];
    let newBets = [...bets];
    let updatedMembers = [...members];
    let updatedClasico = clasico;
    const espanyaToasts = [];

    for (const match of sameMatches) {
      const updatedMatch = { ...match, status: "finished", result, settledAt: Date.now() };
      updatedMatches = updatedMatches.map(m => m.id === match.id ? updatedMatch : m);

      // 1. Settlement de les porres normals d'aquesta còpia
      newBets = settleBets(newBets, updatedMatch);
      const matchBets = newBets.filter(b => b.matchId === match.id);
      for (const b of matchBets) {
        if (b.payout > 0) updatedMembers = updatedMembers.map(m => m.id === b.memberId ? { ...m, birras: m.birras + b.payout } : m);
      }

      // 2. Settlement del Jackpot Espanya per aquesta còpia
      if (updatedMatch.spain) {
        const gid = updatedMatch.groupId;
        const groupData = updatedClasico[gid] || { byMatch: {}, settled: {}, carry: 0 };
        const matchPot = groupData.byMatch[match.id] || { entries: [], total: 0 };
        const alreadySettled = groupData.settled?.[match.id];
        if (!alreadySettled) {
          const winners = matchPot.entries.filter(e => e.home === result.home && e.away === result.away);
          const totalPot = (matchPot.total || 0) + (groupData.carry || 0);
          let newCarry = groupData.carry || 0;
          if (winners.length > 0 && totalPot > 0) {
            const totalWinnersBet = winners.reduce((s, w) => s + w.amount, 0);
            for (const w of winners) {
              const share = Math.floor(totalPot * (w.amount / totalWinnersBet));
              updatedMembers = updatedMembers.map(m => m.id === w.memberId ? { ...m, birras: m.birras + share } : m);
            }
            newCarry = 0;
            espanyaToasts.push(`🇪🇸 JACKPOT! ${winners.length} guanyador(s) reparteixen ${totalPot}🍺`);
          } else if (matchPot.total > 0) {
            newCarry = totalPot;
            espanyaToasts.push(`🇪🇸 Ningú no ha encertat. ${totalPot}🍺 s'acumulen`);
          }
          updatedClasico = {
            ...updatedClasico,
            [gid]: {
              ...groupData,
              carry: newCarry,
              settled: {
                ...(groupData.settled || {}),
                [match.id]: {
                  winners: winners.map(w => ({ memberId: w.memberId, amount: w.amount })),
                  totalPot, date: Date.now(),
                },
              },
            },
          };
        }
      }
    }

    setMatches(updatedMatches); setBets(newBets); setMembers(updatedMembers); setClasico(updatedClasico);
    await dbSet(KEYS.matches, updatedMatches);
    await dbSet(KEYS.bets, newBets);
    await dbSet(KEYS.members, updatedMembers);
    await dbSet(KEYS.clasico, updatedClasico);
    const n = sameMatches.length;
    showToast(`Resultat desat ${n > 1 ? `a ${n} grups` : ""} 💰`, "success");
    espanyaToasts.slice(0, 1).forEach((t, i) => setTimeout(() => showToast(t, "success"), 1200 + i * 800));
  };

  const adminRecharge = async (memberId, eur) => {
    const birrasGained = Math.round(eur / CFG.BIRRA_EUR);
    const target = members.find(m => m.id === memberId);
    const um = members.map(m => m.id === memberId ? { ...m, birras: m.birras + birrasGained } : m);
    const ug = groups.map(g => g.id === target.groupId ? { ...g, bote_EUR: g.bote_EUR + eur } : g);
    setMembers(um); setGroups(ug);
    await dbSet(KEYS.members, um); await dbSet(KEYS.groups, ug);
    showToast(`+${birrasGained}🍺 · +${fmtEUR(eur)} pot`, "success");
  };
  const adminCloseMonth = async (groupId) => {
    const um = members.map(m => m.groupId === groupId ? { ...m, birras: CFG.START_BIRRAS, racha: 0 } : m);
    const ug = groups.map(g => g.id === groupId ? { ...g, bote_EUR: 0 } : g);
    setMembers(um); setGroups(ug);
    await dbSet(KEYS.members, um); await dbSet(KEYS.groups, ug);
    showToast("Mes tancat! 🏆", "success");
  };
  const adminDouble = async (groupId) => {
    const um = members.map(m => m.groupId === groupId ? { ...m, birras: Math.floor(m.birras * (1 + CFG.DOUBLE_BONUS)) } : m);
    setMembers(um); await dbSet(KEYS.members, um);
    showToast(`Doblat! +${Math.round(CFG.DOUBLE_BONUS * 100)}% 🎲`, "success");
  };
  const adminDeleteGroup = async (groupId) => {
    // Esborra el grup i totes les dades relacionades (membres, partits, porres, jackpot)
    const ug = groups.filter(g => g.id !== groupId);
    const um = members.filter(m => m.groupId !== groupId);
    const umt = matches.filter(m => m.groupId !== groupId);
    const ub = bets.filter(b => {
      const mb = members.find(mm => mm.id === b.memberId);
      return mb && mb.groupId !== groupId;
    });
    const ucl = { ...clasico };
    delete ucl[groupId];
    setGroups(ug); setMembers(um); setMatches(umt); setBets(ub); setClasico(ucl);
    await Promise.all([
      dbSet(KEYS.groups, ug),
      dbSet(KEYS.members, um),
      dbSet(KEYS.matches, umt),
      dbSet(KEYS.bets, ub),
      dbSet(KEYS.clasico, ucl),
    ]);
    if (activeGroupId === groupId) setActiveGroupId(null);
    showToast("Grup esborrat 🗑️", "success");
  };

  // ── DERIVED ──────────────────────────────────────────────────────────────
  const member = (account && activeGroupId) ? members.find(m => m.accountId === account.id && m.groupId === activeGroupId) : null;
  const currentGroup = activeGroupId ? groups.find(g => g.id === activeGroupId) : null;
  const groupMatches = currentGroup ? matches.filter(m => m.groupId === currentGroup.id) : [];
  const groupMembers = currentGroup ? members.filter(m => m.groupId === currentGroup.id) : [];
  const myBets = member ? bets.filter(b => b.memberId === member.id) : [];
  const normalMatches = groupMatches.filter(m => !m.clasico && !m.europa);
  // Oberts = pots apostar (no començats, no acabats)
  const bettableMatches = normalMatches.filter(m => m.status !== "finished" && !matchStarted(m)).sort((a, b) => new Date(a.date) - new Date(b.date));
  // En joc = ja començats però sense resultat
  const liveMatches = normalMatches.filter(m => m.status !== "finished" && matchStarted(m)).sort((a, b) => new Date(a.date) - new Date(b.date));
  const finishedMatches = normalMatches.filter(m => m.status === "finished").sort((a, b) => new Date(b.date) - new Date(a.date));
  // Agrupar propers (apostables) per fase
  const openByLeague = bettableMatches.reduce((acc, m) => { (acc[m.league] = acc[m.league] || []).push(m); return acc; }, {});
  const leaguesOrdered = Object.keys(openByLeague).sort((a, b) => {
    const idxA = LEAGUES.indexOf(a), idxB = LEAGUES.indexOf(b);
    return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
  });
  // Partits oberts on encara NO he apostat (per al comptador de la nav)
  const myBetIds = new Set(myBets.map(b => b.matchId));
  const unbettedCount = bettableMatches.filter(m => !myBetIds.has(m.id)).length;
  // N'hi ha algun urgent (tanca en <3h) sense apostar?
  const hasUrgentUnbetted = bettableMatches.some(m => {
    if (myBetIds.has(m.id)) return false;
    const c = countdown(m.date);
    return c && c.urgent;
  });

  // ── JACKPOT ESPANYA ──────────────────────────────────────────────────────
  // Estructura nova: clasico[gid] = { byMatch: { [matchId]: { entries, total } }, settled, carry }
  const espanyaData = currentGroup ? (clasico[currentGroup.id] || { byMatch: {}, settled: {}, carry: 0 }) : { byMatch: {}, settled: {}, carry: 0 };
  const espanyaCarryPot = espanyaData.carry || 0;
  // Partits d'Espanya oberts (no acabats i no començats), ordenats per data
  const espanyaOpenMatches = groupMatches
    .filter(m => m.spain && m.status !== "finished" && !matchStarted(m))
    .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
  const espanyaActiveMatch = espanyaOpenMatches[0] || null;
  const espanyaMatchPot = espanyaActiveMatch ? (espanyaData.byMatch?.[espanyaActiveMatch.id] || { entries: [], total: 0 }) : { entries: [], total: 0 };
  const espanyaCurrentPot = espanyaMatchPot.total || 0;
  const espanyaMyEntry = (espanyaActiveMatch && member) ? espanyaMatchPot.entries.find(e => e.memberId === member.id) : null;
  // Historial: partits acabats amb Jackpot resolt
  const espanyaHistory = espanyaData.settled
    ? Object.entries(espanyaData.settled).sort((a, b) => b[1].date - a[1].date)
    : [];

  // Variables de compatibilitat (per no trencar refs a UI antiga)
  const groupClasico = espanyaData;
  const currentClasicoMatches = espanyaActiveMatch ? [espanyaActiveMatch] : [];
  const myClasicoEntry = espanyaMyEntry;
  const clasicoActive = !!espanyaActiveMatch;

  const myCoin = member ? coinflips[member.id] : null;
  const coinThisWeek = myCoin?.week === weekKey() ? myCoin : null;

  const accountInfo = aId => accounts.find(a => a.id === aId) || {};
  const memberInfo = mId => { const mb = members.find(m => m.id === mId); return mb ? accountInfo(mb.accountId) : {}; };

  const leaderboard = groupMembers.map(m => {
    const ub = bets.filter(b => b.memberId === m.id && b.settled);
    const wins = ub.filter(b => b.payout > 0).length;
    const totalStaked = ub.reduce((s, b) => s + b.amount, 0);
    const totalWon = ub.reduce((s, b) => s + (b.payout || 0), 0);
    const acc = accountInfo(m.accountId);
    return { ...m, name: acc.name || "?", emoji: acc.emoji || "🍺", wins, played: ub.length, netGain: totalWon - totalStaked };
  }).sort((a, b) => b.birras - a.birras);
  const myRank = member ? leaderboard.findIndex(u => u.id === member.id) + 1 : 0;
  const jokerAvailable = member && member.jokerWeek !== weekKey();


  // Resum setmanal
  const showWeeklySummary = isMondayMorning() && currentGroup && groupMembers.length > 0;
  const lastWeekStart = (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.getTime(); })();
  const lastWeekBets = bets.filter(b => b.settled && b.createdAt > lastWeekStart && groupMatches.find(m => m.id === b.matchId));
  const myWeekBets = lastWeekBets.filter(b => b.memberId === member?.id);
  const myWeekNet = myWeekBets.reduce((s, b) => s + (b.payout - b.amount), 0);
  const myWeekHits = myWeekBets.filter(b => b.payout > 0).length;
  const weekTopGain = leaderboard.map(u => {
    const wb = lastWeekBets.filter(b => b.memberId === u.id);
    const net = wb.reduce((s, b) => s + (b.payout - b.amount), 0);
    return { ...u, weekNet: net, weekHits: wb.filter(b => b.payout > 0).length };
  }).sort((a, b) => b.weekNet - a.weekNet);

  // Stats
  const allGroupBets = bets.filter(b => groupMatches.find(m => m.id === b.matchId));
  const teamCount = {};
  for (const b of allGroupBets) {
    const m = matches.find(mm => mm.id === b.matchId);
    if (!m) continue;
    const team = b.outcome === "H" ? m.home : b.outcome === "A" ? m.away : null;
    if (team) teamCount[team] = (teamCount[team] || 0) + b.amount;
  }
  const topTeam = Object.entries(teamCount).sort((a, b) => b[1] - a[1])[0];
  const avgBet = allGroupBets.length > 0 ? Math.round(allGroupBets.reduce((s, b) => s + b.amount, 0) / allGroupBets.length) : 0;
  const totalExacts = allGroupBets.filter(b => {
    if (!b.exactScore) return false;
    const m = matches.find(mm => mm.id === b.matchId);
    return m?.result && b.exactScore === scoreKey(m.result.home, m.result.away);
  }).length;
  const memberStats = leaderboard.map(u => {
    const mb = bets.filter(b => b.memberId === u.id && b.settled);
    const exactos = mb.filter(b => {
      if (!b.exactScore) return false;
      const m = matches.find(mm => mm.id === b.matchId);
      return m?.result && b.exactScore === scoreKey(m.result.home, m.result.away);
    }).length;
    return { ...u, exactos };
  });
  const profetaRei = [...memberStats].sort((a, b) => b.exactos - a.exactos)[0];
  const jackpotKing = memberStats.map(u => {
    let count = 0;
    if (espanyaHistory) {
      for (const [_, info] of espanyaHistory) {
        if (info.winners && info.winners.some(w => w.memberId === u.id)) count++;
      }
    }
    return { ...u, jackpotsWon: count };
  }).sort((a, b) => b.jackpotsWon - a.jackpotsWon)[0];

  // Compartir text WhatsApp
  const shareWeeklyText = () => {
    if (!currentGroup) return "";
    let txt = `🍺 *BIRRAPORRA FC · Resum setmanal* 🍺\n\n`;
    txt += `📅 Grup: ${currentGroup.name}\n`;
    txt += `🏆 Pot: ${fmtEUR(currentGroup.bote_EUR)} (${eurToBeers(currentGroup.bote_EUR)} birres)\n\n`;
    txt += `*👑 Top setmana:*\n`;
    weekTopGain.slice(0, 3).forEach((u, i) => {
      txt += `${["🥇", "🥈", "🥉"][i]} ${u.emoji} ${u.name}: ${u.weekNet >= 0 ? "+" : ""}${u.weekNet}🍺 (${u.weekHits} encerts)\n`;
    });
    txt += `\n*📊 Classificació actual:*\n`;
    leaderboard.slice(0, 5).forEach((u, i) => {
      txt += `${i + 1}. ${u.emoji} ${u.name} — ${u.birras}🍺\n`;
    });
    txt += `\nA per la setmana nova! 💪🍺`;
    return txt;
  };
  const shareLeaderboardText = () => {
    if (!currentGroup) return "";
    let txt = `🏆⚽ *BIRRAPORRA MUNDIAL 2026* ⚽🏆\n_${currentGroup.name}_\n\n`;
    leaderboard.forEach((u, i) => {
      const medal = ["🥇", "🥈", "🥉"][i] || `${i + 1}.`;
      txt += `${medal} ${u.emoji} ${u.name} — *${u.birras}🍺*\n`;
    });
    if (currentGroup.bote_EUR > 0) txt += `\n💰 Pot del grup: ${fmtEUR(currentGroup.bote_EUR)}`;
    txt += `\n\n_Encara pots remuntar! 💪_`;
    return txt;
  };
  const shareStatsText = () => {
    if (!currentGroup) return "";
    let txt = `📊 *Stats BIRRAPORRA FC · ${currentGroup.name}*\n\n`;
    if (topTeam) txt += `⚽ Equip més apostat: *${topTeam[0]}* (${topTeam[1]}🍺)\n`;
    txt += `💰 Mitjana per aposta: ${avgBet}🍺\n`;
    txt += `⭐ Marcadors exactes encertats: ${totalExacts}\n`;
    if (profetaRei && profetaRei.exactos > 0) txt += `🔮 Rei profeta: ${profetaRei.emoji} ${profetaRei.name} (${profetaRei.exactos} exactes)\n`;
    if (jackpotKing && jackpotKing.jackpotsWon > 0) txt += `🏆 Rei del Jackpot: ${jackpotKing.emoji} ${jackpotKing.name} (${jackpotKing.jackpotsWon} cops)\n`;
    return txt;
  };

  // ── RENDER ───────────────────────────────────────────────────────────────
  if (!loaded) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, position: "relative" }}>
      <div className="mundial-stripe" style={{ position: "absolute", top: 0, left: 0, right: 0 }} />
      <div style={{ fontSize: 60, animation: "foam 1.5s ease-in-out infinite" }}>🏆</div>
      <div style={{ width: 30, height: 30, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.gold}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <p style={{ color: C.muted, fontFamily: "var(--pff2)", letterSpacing: 3, fontSize: 12, fontWeight: 600 }}>CARREGANT EL MUNDIAL...</p>
      <div className="mundial-stripe" style={{ position: "absolute", bottom: 0, left: 0, right: 0 }} />
    </div>
  );

  if (!account) return (<>
    <SupabaseLoginScreen onAdmin={() => setShowAdminLogin(true)} />
    {showAdminLogin && <AdminPassModal onSubmit={tryAdmin} onClose={() => setShowAdminLogin(false)} />}
  </>);

  // Garantir que el membre existeix abans d'entrar al grup
  const enterGroup = async (gid) => {
    const [latestMembers, latestGroups] = await Promise.all([
      dbGet(KEYS.members), dbGet(KEYS.groups),
    ]);
    let mbs = latestMembers || members;
    let grps = latestGroups || groups;
    const existing = mbs.find(m => m.accountId === account.id && m.groupId === gid);
    if (!existing) {
      // Membre nou: crear-lo i sumar l'entrada al pot del grup
      const newMember = {
        id: uid(),
        accountId: account.id,
        groupId: gid,
        birras: CFG.START_BIRRAS,
        racha: 0,
        seenWelcome: false,
        joinedAt: Date.now(),
      };
      mbs = [...mbs, newMember];
      // +10€ al pot del grup
      grps = grps.map(g => g.id === gid ? { ...g, bote_EUR: (g.bote_EUR || 0) + CFG.ENTRY_EUR } : g);
      await Promise.all([
        dbSet(KEYS.members, mbs),
        dbSet(KEYS.groups, grps),
      ]);
      setMembers(mbs);
      setGroups(grps);
    } else if (latestMembers) {
      setMembers(mbs);
      if (latestGroups) setGroups(grps);
    }
    setActiveGroupId(gid);
  };

  // L'usuari ha de triar un grup (o crear-ne un si és admin)
  if (!activeGroupId) return (<>
    <GroupPicker
      account={account}
      groups={groups}
      members={members}
      matches={matches}
      adminMode={adminMode}
      onJoinGroup={doJoinGroupV4}
      onCreateGroup={doCreateGroupV4}
      onSelectGroup={enterGroup}
      onLogout={async () => { await auth.signOut(); }}
      onAdminLogin={() => setShowAdminLogin(true)}
    />
    {showAdminLogin && <AdminPassModal onSubmit={tryAdmin} onClose={() => setShowAdminLogin(false)} />}
  </>);

  // Si encara no s'ha creat el membre (race condition rar), tornar al picker en lloc de quedar negre
  if (!member) {
    // En lloc de spinner infinit, tornem a la pantalla de tria de grup
    setTimeout(() => setActiveGroupId(null), 0);
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
        <div style={{ width: 30, height: 30, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.gold}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p style={{ color: C.muted, fontFamily: "var(--pff2)", fontSize: 11, letterSpacing: 2, fontWeight: 600 }}>UN MOMENT...</p>
      </div>
    );
  }

  // Normes automàtiques: si el membre encara no les ha vist, mostrar-les sí o sí
  if (member && !member.seenWelcome) return <RulesScreen firstTime onClose={markSeenWelcome} />;

  const headerStat = (label, value, color = C.blue) => (
    <div style={{ flex: 1, textAlign: "center" }}>
      <div style={{ fontFamily: "var(--pff)", fontSize: 26, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, color: C.muted, fontFamily: "var(--pff2)", letterSpacing: 1.5, marginTop: 4, fontWeight: 700 }}>{label}</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.txt, maxWidth: 480, margin: "0 auto", paddingBottom: 80 }}>
      {/* HEADER */}
      {/* HEADER BLAU FIFA */}
      <div style={{ background: C.hdr, position: "sticky", top: 0, zIndex: 50, boxShadow: "0 2px 12px rgba(0,61,165,0.25)" }}>
        <div className="mundial-stripe" />
        {/* Fila superior: logo + nom + admin */}
        <div style={{ padding: "12px 16px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Logo26 size={30} showTrophy={false} />
            <div>
              <div style={{ fontFamily: "var(--pff)", fontSize: 22, color: "#fff", lineHeight: 1, letterSpacing: 2 }}>BIRRAPORRA</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", letterSpacing: 2, fontWeight: 600, marginTop: 1 }}>WE ARE 26 · {currentGroup?.name}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {adminMode && <button onClick={() => setShowAdmin(true)} style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 8, padding: "5px 12px", fontSize: 11, fontFamily: "var(--pff2)", fontWeight: 700, cursor: "pointer", letterSpacing: 1 }}>🛠 ADMIN</button>}
            <div style={{ background: "rgba(255,255,255,0.12)", padding: "6px 14px", borderRadius: 20, display: "flex", alignItems: "center", gap: 5, border: "1px solid rgba(255,255,255,0.15)" }}>
              <span style={{ fontFamily: "var(--pff)", fontSize: 20, color: member.birras > 0 ? C.gold : C.red, lineHeight: 1 }}>{member.birras}</span>
              <span style={{ fontSize: 16 }}>🍺</span>
            </div>
          </div>
        </div>
        {/* Fila inferior: usuari + posició */}
        <div style={{ padding: "0 16px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 18 }}>{account.emoji || "🍺"}</span>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>{account.name}</span>
          </div>
          {myRank > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.1)", padding: "4px 12px", borderRadius: 20 }}>
              <span style={{ fontSize: 12 }}>{["🥇","🥈","🥉"][myRank-1] || "🏅"}</span>
              <span style={{ fontFamily: "var(--pff)", fontSize: 16, color: "#fff" }}>{myRank}r del ranking</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: "14px 14px 0", animation: "fadeIn 0.3s ease" }}>

        {/* ─── PARTITS ─── */}
        {tab === "matches" && (
          <div>
            {/* Stats secundàries */}
            <div className="card-shadow" style={{ background: C.card, borderRadius: 12, padding: "12px 8px", marginBottom: 12, display: "flex" }}>
              {headerStat("POSICIÓ", myRank ? `${myRank}r` : "—", C.blue)}
              <div style={{ width: 1, background: C.border }} />
              {headerStat("ENCERTS", `${myBets.filter(b => b.payout > 0).length}`, C.success)}
              <div style={{ width: 1, background: C.border }} />
              {headerStat("PARTITS", `${myBets.length}`, C.muted)}
            </div>

            {/* DASHBOARD: pròxim partit + jackpot */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8, marginBottom: 14 }}>
              {(() => {
                const next = bettableMatches[0];
                const cd = next ? countdown(next.date) : null;
                return (
                  <div onClick={() => next && setBetMatch(next)} className="card-shadow" style={{ background: C.card, borderRadius: 12, padding: "12px 14px", cursor: next ? "pointer" : "default" }}>
                    <div style={{ fontFamily: "var(--pff2)", fontSize: 10, color: C.muted, letterSpacing: 2, fontWeight: 700, marginBottom: 5 }}>⚽ PRÒXIM PARTIT</div>
                    {next ? (<>
                      <div style={{ fontFamily: "var(--pff)", fontSize: 18, color: C.txt, lineHeight: 1.1, letterSpacing: 1 }}>{teamCode(next.home) || next.home} – {teamCode(next.away) || next.away}</div>
                      {cd && <div style={{ fontSize: 11, color: cd.urgent ? C.red : C.blue, marginTop: 4, fontWeight: 700 }}>⏱ {cd.text}</div>}
                    </>) : <div style={{ fontSize: 13, color: C.muted }}>Cap de moment</div>}
                  </div>
                );
              })()}
              <div onClick={() => setTab("jackpot")} style={{ background: C.blue, borderRadius: 12, padding: "12px 10px", cursor: "pointer", textAlign: "center", boxShadow: "0 4px 14px rgba(0,61,165,0.2)" }}>
                <div style={{ fontFamily: "var(--pff2)", fontSize: 10, color: "rgba(255,255,255,0.5)", letterSpacing: 2, fontWeight: 700, marginBottom: 4 }}>🇪🇸 POT</div>
                <div style={{ fontFamily: "var(--pff)", fontSize: 28, color: "#fff", lineHeight: 1 }}>{espanyaCurrentPot + espanyaCarryPot}🍺</div>
              </div>
            </div>

            {/* Selector Oberts / En joc / Finalitzats */}
            <div style={{ display: "flex", background: C.border, borderRadius: 12, padding: 3, gap: 2, marginBottom: 14 }}>
              {[
                { id: "open", label: `🟢 Oberts (${bettableMatches.length})` },
                { id: "live", label: `🔴 En joc (${liveMatches.length})` },
                { id: "done", label: `✓ Fets (${finishedMatches.length})` },
              ].map(s => (
                <button key={s.id} onClick={() => setMatchSection(s.id)}
                  style={{ flex: 1, padding: "9px 2px", background: matchSection === s.id ? C.blue : "transparent", color: matchSection === s.id ? "#fff" : C.muted, border: "none", borderRadius: 9, fontFamily: "var(--pff2)", fontSize: 11, letterSpacing: 0.3, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", boxShadow: matchSection === s.id ? "0 2px 8px rgba(0,61,165,0.3)" : "none" }}>
                  {s.label}
                </button>
              ))}
            </div>

            {member.birras < 1 && matchSection === "open" && (
              <div style={{ background: "#FEE2E2", borderRadius: 12, padding: 14, marginBottom: 14, border: `1px solid ${C.red}`, textAlign: "center" }}>
                <div style={{ fontFamily: "var(--pff)", fontSize: 20, color: C.red, letterSpacing: 1 }}>⚠ SENSE BIRRES</div>
                <div style={{ fontSize: 12, color: "#7f1d1d", marginTop: 2 }}>Parla amb l'admin per recarregar.</div>
              </div>
            )}

            {/* OBERTS */}
            {matchSection === "open" && (() => {
              const bettedIds = new Set(myBets.map(b => b.matchId));
              const myBetted = bettableMatches.filter(m => bettedIds.has(m.id));
              const notBetted = bettableMatches.filter(m => !bettedIds.has(m.id));
              const notBettedByLeague = notBetted.reduce((acc, m) => { (acc[m.league] = acc[m.league] || []).push(m); return acc; }, {});
              const notBettedLeagues = Object.keys(notBettedByLeague).sort((a, b) => {
                const ia = LEAGUES.indexOf(a), ib = LEAGUES.indexOf(b);
                return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
              });
              return (<>
                {bettableMatches.length === 0 && (
                  <div style={{ textAlign: "center", padding: "60px 20px", color: C.muted }}>
                    <div style={{ fontSize: 56, marginBottom: 12 }}>🏟️</div>
                    <p style={{ fontFamily: "var(--pff)", fontSize: 22 }}>SENSE PARTITS OBERTS</p>
                  </div>
                )}

                {/* HAS APOSTAT */}
                {myBetted.length > 0 && (<>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, paddingLeft: 4 }}>
                    <span style={{ width: 6, height: 6, background: C.gold, borderRadius: "50%" }} />
                    <span style={{ fontFamily: "var(--pff)", fontSize: 15, color: C.gold, letterSpacing: 2 }}>🎯 HAS APOSTAT</span>
                    <span style={{ flex: 1, height: 1, background: C.border }} />
                    <span style={{ color: C.muted, fontSize: 12, fontWeight: 700 }}>{myBetted.length}</span>
                  </div>
                  {myBetted.map(m => <MatchCard key={m.id} match={m} userBet={myBets.find(b => b.matchId === m.id)} onBet={setBetMatch} member={member} />)}
                  <div style={{ height: 18 }} />
                </>)}

                {/* POTS APOSTAR */}
                {notBetted.length > 0 && (<>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, paddingLeft: 4 }}>
                    <span style={{ width: 6, height: 6, background: C.blue, borderRadius: "50%" }} />
                    <span style={{ fontFamily: "var(--pff)", fontSize: 15, color: C.blue, letterSpacing: 2 }}>POTS APOSTAR</span>
                    <span style={{ flex: 1, height: 1, background: C.border }} />
                    <span style={{ color: C.muted, fontSize: 12, fontWeight: 700 }}>{notBetted.length}</span>
                  </div>
                  {notBettedLeagues.map(lg => (
                    <div key={lg} style={{ marginBottom: 14 }}>
                      {notBettedLeagues.length > 1 && (
                        <div style={{ fontFamily: "var(--pff2)", fontSize: 11, color: C.muted, letterSpacing: 1.5, marginBottom: 6, paddingLeft: 4, fontWeight: 700 }}>{lg.toUpperCase()}</div>
                      )}
                      {notBettedByLeague[lg].map(m => <MatchCard key={m.id} match={m} userBet={null} onBet={setBetMatch} member={member} />)}
                    </div>
                  ))}
                </>)}
              </>);
            })()}

            {/* EN JOC */}
            {matchSection === "live" && (<>
              {liveMatches.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 20px", color: C.muted }}>
                  <div style={{ fontSize: 56, marginBottom: 12 }}>⏱️</div>
                  <p style={{ fontFamily: "var(--pff)", fontSize: 22 }}>CAP PARTIT EN JOC ARA</p>
                </div>
              ) : liveMatches.map(m => <MatchCard key={m.id} match={m} userBet={myBets.find(b => b.matchId === m.id)} onBet={null} member={member} />)}
            </>)}

            {/* FINALITZATS */}
            {matchSection === "done" && (<>
              {/* Filtre encertades/fallades */}
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                {[
                  { id: "all", label: "Tots" },
                  { id: "hit", label: "✓ Encertats" },
                  { id: "miss", label: "✗ Fallats" },
                  { id: "no_bet", label: "Sense aposta" },
                ].map(f => (
                  <button key={f.id} onClick={() => setDoneFilter(f.id)}
                    style={{ flex: 1, padding: "7px 2px", background: doneFilter === f.id ? C.blue : C.bluePale, color: doneFilter === f.id ? "#fff" : C.blue, border: "none", borderRadius: 8, fontFamily: "var(--pff2)", fontSize: 10, fontWeight: 700, cursor: "pointer", letterSpacing: 0.3 }}>
                    {f.label}
                  </button>
                ))}
              </div>
              {(() => {
                const filtered = finishedMatches.filter(m => {
                  const bet = myBets.find(b => b.matchId === m.id);
                  if (doneFilter === "hit") return bet && bet.payout > 0;
                  if (doneFilter === "miss") return bet && bet.payout === 0;
                  if (doneFilter === "no_bet") return !bet;
                  return true;
                });
                return filtered.length === 0
                  ? <div style={{ textAlign: "center", padding: "40px 20px", color: C.muted }}><p>Cap resultat</p></div>
                  : filtered.map(m => <MatchCard key={m.id} match={m} userBet={myBets.find(b => b.matchId === m.id)} onBet={null} member={member} />);
              })()}
            </>)}
          </div>
        )}

        {/* ─── JACKPOT SELECCIÓ ESPANYOLA ─── */}
        {tab === "jackpot" && (
          <div>
            {/* Banner principal — pot total */}
            <div style={{ background: C.red, borderRadius: 16, padding: 24, marginBottom: 16, textAlign: "center", position: "relative", overflow: "hidden", boxShadow: "0 8px 24px rgba(228,21,27,0.25)" }}>
              <div className="mundial-stripe" style={{ position: "absolute", top: 0, left: 0, right: 0 }} />
              <div style={{ fontSize: 36, marginBottom: 4 }}>🇪🇸</div>
              <div style={{ fontFamily: "var(--pff2)", fontSize: 11, color: "rgba(255,255,255,0.8)", letterSpacing: 3, marginBottom: 2, fontWeight: 700 }}>JACKPOT SELECCIÓ ESPANYOLA</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", marginBottom: 14 }}>Resultat exacte · qui l'encerta s'ho endú TOT</div>
              <div style={{ fontFamily: "var(--pff)", fontSize: 70, color: "#fff", lineHeight: 1, animation: "pulse 3s ease-in-out infinite" }}>{espanyaCurrentPot + espanyaCarryPot}🍺</div>
              {espanyaCarryPot > 0 && (
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 8 }}>
                  ({espanyaCarryPot}🍺 acumulats + {espanyaCurrentPot}🍺 d'aquest partit)
                </div>
              )}
            </div>

            {espanyaActiveMatch ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ width: 6, height: 6, background: C.red, borderRadius: "50%" }} />
                  <span style={{ fontFamily: "var(--pff)", fontSize: 15, color: C.red, letterSpacing: 2 }}>⚽ PRÒXIM PARTIT D'ESPANYA</span>
                  <span style={{ flex: 1, height: 1, background: C.border }} />
                </div>
                <div className="card-shadow" style={{ background: C.card, borderRadius: 16, marginBottom: 12, display: "flex", overflow: "hidden" }}>
                  <div style={{ width: 4, background: C.red, flexShrink: 0 }} />
                  <div style={{ flex: 1, padding: "16px 14px 16px 12px" }}>
                    <div style={{ fontFamily: "var(--pff2)", fontSize: 11, color: C.muted, letterSpacing: 1.5, marginBottom: 10, fontWeight: 700 }}>{espanyaActiveMatch.league}{espanyaActiveMatch.date ? ` · ${fmtDate(espanyaActiveMatch.date)}` : ""}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                      <div style={{ flex: 1, textAlign: "right" }}>
                        <div style={{ fontFamily: "var(--pff)", fontSize: 24, color: C.txt, letterSpacing: 1, lineHeight: 1 }}>{espanyaActiveMatch.home}</div>
                        <FlagBadge name={espanyaActiveMatch.home} size={11} />
                      </div>
                      <span style={{ fontFamily: "var(--pff2)", fontSize: 13, color: C.muted, fontWeight: 700, minWidth: 40, textAlign: "center" }}>VS</span>
                      <div style={{ flex: 1, textAlign: "left" }}>
                        <div style={{ fontFamily: "var(--pff)", fontSize: 24, color: C.txt, letterSpacing: 1, lineHeight: 1 }}>{espanyaActiveMatch.away}</div>
                        <FlagBadge name={espanyaActiveMatch.away} size={11} />
                      </div>
                    </div>
                    {espanyaMyEntry && (
                      <div style={{ background: "#FEE2E2", border: `1px solid #FCA5A5`, borderRadius: 10, padding: "10px 14px", textAlign: "center", marginBottom: 12 }}>
                        <div style={{ fontFamily: "var(--pff2)", fontSize: 10, color: C.red, letterSpacing: 2, fontWeight: 700 }}>EL TEU PRONÒSTIC</div>
                        <div style={{ fontFamily: "var(--pff)", fontSize: 32, color: C.red, marginTop: 4, lineHeight: 1 }}>{espanyaMyEntry.home}–{espanyaMyEntry.away}</div>
                        <div style={{ fontSize: 12, color: "#7f1d1d", marginTop: 4, fontWeight: 600 }}>Aposta: {espanyaMyEntry.amount}🍺</div>
                      </div>
                    )}
                    {!matchStarted(espanyaActiveMatch) && (
                      <button onClick={() => setShowClasico(true)} disabled={!espanyaMyEntry && member.birras < CFG.ESPANYA_MIN_BET}
                        style={{ ...sty.btnRed, width: "100%", opacity: (!espanyaMyEntry && member.birras < CFG.ESPANYA_MIN_BET) ? 0.4 : 1, cursor: (!espanyaMyEntry && member.birras < CFG.ESPANYA_MIN_BET) ? "not-allowed" : "pointer" }}>
                        {espanyaMyEntry ? "✏️ EDITAR PRONÒSTIC" : "🇪🇸 APOSTAR 5🍺"}
                      </button>
                    )}
                  </div>
                </div>

                {espanyaMatchPot.entries.length > 0 && (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, marginTop: 14 }}>
                      <span style={{ width: 6, height: 6, background: C.blue, borderRadius: "50%" }} />
                      <span style={{ fontFamily: "var(--pff)", fontSize: 14, color: C.blue, letterSpacing: 2 }}>JA APOSTEN</span>
                      <span style={{ flex: 1, height: 1, background: C.border }} />
                      <span style={{ color: C.muted, fontSize: 12, fontWeight: 700 }}>{espanyaMatchPot.entries.length}</span>
                    </div>
                    <div className="card-shadow" style={{ background: C.card, borderRadius: 12, padding: 12, marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {espanyaMatchPot.entries.map(e => {
                        const info = memberInfo(e.memberId);
                        return (
                          <div key={e.memberId} style={{ display: "flex", alignItems: "center", gap: 6, background: C.bluePale, padding: "4px 10px", borderRadius: 16, fontSize: 12 }}>
                            <span style={{ fontSize: 16 }}>{info.emoji || "🍺"}</span>
                            <span style={{ color: C.txt }}>{info.name || "?"}{e.memberId === member.id ? " (tu)" : ""}</span>
                            <span style={{ color: C.amber, fontFamily: "var(--pff)", fontSize: 13 }}>{e.amount}🍺</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div style={{ ...sty.card, textAlign: "center", padding: 32, marginBottom: 16 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>⏳</div>
                <div style={{ fontFamily: "var(--pff)", fontSize: 22, color: C.txt, letterSpacing: 1 }}>SENSE PARTIT D'ESPANYA</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>L'admin marcarà el pròxim partit de la selecció.</div>
                {espanyaCarryPot > 0 && (
                  <div style={{ marginTop: 12, fontSize: 13, color: C.amber }}>
                    Pot acumulat: <span style={{ fontFamily: "var(--pff)", fontSize: 22, color: C.gold }}>{espanyaCarryPot}🍺</span>
                  </div>
                )}
              </div>
            )}

            {espanyaHistory.length > 0 && (
              <>
                <div style={{ fontFamily: "var(--pff2)", fontSize: 11, color: C.gold, letterSpacing: 3, marginTop: 18, marginBottom: 10, fontWeight: 600 }}>🏆 HISTÒRIC</div>
                {espanyaHistory.slice(0, 10).map(([mid, info]) => {
                  const m = matches.find(x => x.id === mid);
                  return (
                    <div key={mid} style={{ background: C.card, borderRadius: 10, padding: 12, marginBottom: 6, border: `1px solid ${C.border}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: "var(--pff2)", fontSize: 10, color: C.muted, letterSpacing: 1.5, fontWeight: 600 }}>{m ? `${m.home} vs ${m.away}` : "Partit"}</div>
                          {m?.result && <div style={{ fontFamily: "var(--pff)", fontSize: 18, color: C.gold, marginTop: 2 }}>{m.result.home}–{m.result.away}</div>}
                          <div style={{ fontSize: 12, color: C.txt, marginTop: 4 }}>
                            {info.winners.length === 0
                              ? <span style={{ color: C.muted }}>Sense guanyador · {info.totalPot}🍺 acumulen</span>
                              : <span>
                                  <span style={{ color: C.red }}>{info.winners.length} guanyador(s)</span>:&nbsp;
                                  {info.winners.map(w => { const i = memberInfo(w.memberId); return `${i.emoji || "🍺"} ${i.name || "?"}`; }).join(", ")}
                                </span>
                            }
                          </div>
                        </div>
                        {info.totalPot > 0 && <span style={{ fontFamily: "var(--pff)", fontSize: 20, color: info.winners.length > 0 ? C.gold : C.muted, flexShrink: 0, marginLeft: 8 }}>{info.totalPot}🍺</span>}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* ─── RANKING ─── */}
        {tab === "ranking" && (
          <div>
            {currentGroup && (
              <div style={{ background: "linear-gradient(135deg,#FEF3C7 0%, #FDE68A 100%)", borderRadius: 14, padding: 14, marginBottom: 16, border: `1px solid ${C.amber}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 10, color: C.amber, fontFamily: "var(--pff)", letterSpacing: 2, marginBottom: 2 }}>POT DEL GRUP</div>
                  <div style={{ fontFamily: "var(--pff)", fontWeight: 900, fontSize: 26, color: C.gold, lineHeight: 1 }}>{fmtEUR(currentGroup.bote_EUR)}</div>
                  <div style={{ fontSize: 11, color: C.amber, marginTop: 2 }}>👥 {leaderboard.length} {leaderboard.length === 1 ? "jugador" : "jugadors"}{currentGroup.joinCode && adminMode ? ` · codi ${currentGroup.joinCode}` : ""}</div>
                </div>
                <div style={{ fontSize: 36 }}>🏆</div>
              </div>
            )}

            {/* PODI TOP 3 */}
            {leaderboard.length >= 1 && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 8, marginBottom: 20, padding: "0 4px" }}>
                {/* 2n lloc */}
                {leaderboard[1] && (
                  <PodiumSpot user={leaderboard[1]} rank={2} isMe={leaderboard[1].id === member.id} height={90} />
                )}
                {/* 1r lloc */}
                {leaderboard[0] && (
                  <PodiumSpot user={leaderboard[0]} rank={1} isMe={leaderboard[0].id === member.id} height={120} />
                )}
                {/* 3r lloc */}
                {leaderboard[2] && (
                  <PodiumSpot user={leaderboard[2]} rank={3} isMe={leaderboard[2].id === member.id} height={70} />
                )}
              </div>
            )}

            {/* PREMIS FINALS */}
            {currentGroup && currentGroup.bote_EUR > 0 && leaderboard.length > 0 && (
              <div style={{ background: "linear-gradient(135deg,#1a1400,#0a0a0a)", border: `1px solid ${C.gold}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
                <div style={{ fontFamily: "var(--pff2)", fontSize: 11, color: C.gold, letterSpacing: 2, fontWeight: 700, marginBottom: 4 }}>🏆 SI EL MUNDIAL ACABÉS ARA</div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>Repartiment del pot de {fmtEUR(currentGroup.bote_EUR)}</div>
                {CFG.PRIZES.map((pct, i) => {
                  const u = leaderboard[i];
                  if (!u) return null;
                  const eur = currentGroup.bote_EUR * pct;
                  const medals = ["🥇", "🥈", "🥉", "4️⃣"];
                  return (
                    <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < CFG.PRIZES.length - 1 ? `1px solid ${C.border}` : "none" }}>
                      <span style={{ fontSize: 20 }}>{medals[i]}</span>
                      <span style={{ fontSize: 22 }}>{u.emoji}</span>
                      <span style={{ flex: 1, fontFamily: "var(--pff2)", fontSize: 15, fontWeight: 600, color: u.id === member.id ? C.gold : C.txt }}>{u.name}{u.id === member.id ? " (tu)" : ""}</span>
                      <span style={{ fontFamily: "var(--pff)", fontSize: 24, color: C.gold }}>{fmtEUR(eur)}</span>
                    </div>
                  );
                })}
                <div style={{ fontSize: 10, color: C.muted, marginTop: 10, textAlign: "center", fontStyle: "italic" }}>Encara pot canviar tot! 💪</div>
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <div style={sty.sectionH}>CLASSIFICACIÓ COMPLETA</div>
            </div>
            {leaderboard.map((u, i) => {
              const isMe = u.id === member.id;
              const willWin = i < CFG.PRIZES.length && currentGroup && currentGroup.bote_EUR > 0;
              const prizeEUR = willWin ? currentGroup.bote_EUR * CFG.PRIZES[i] : 0;
              const flag = teamFlag(u.name);
              return (
                <div key={u.id} style={{ background: isMe ? "linear-gradient(135deg,#FEF3C7,#FDE68A)" : C.card, border: `1px solid ${isMe ? C.gold : C.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 30, textAlign: "center", fontFamily: "var(--pff)", fontWeight: 900, fontSize: i < 3 ? 24 : 16, color: i < 3 ? C.gold : C.muted }}>{["🥇", "🥈", "🥉"][i] || i + 1}</div>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: isMe ? C.gold : C.card2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, border: `1px solid ${isMe ? C.amber : C.border}` }}>{u.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: C.txt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}{isMe ? " 👈" : ""}</div>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                      ✓ {u.wins}/{u.played} · {u.netGain >= 0 ? "+" : ""}{u.netGain}🍺
                      {willWin && <span style={{ color: C.amber, marginLeft: 4 }}>· {fmtEUR(prizeEUR)}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "var(--pff)", fontWeight: 900, fontSize: 22, color: isMe ? C.gold : C.txt, lineHeight: 1 }}>{u.birras}</div>
                    <div style={{ fontSize: 10, color: C.muted, fontFamily: "var(--pff)" }}>🍺</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ─── STATS ─── */}

        {/* ─── MIS PORRAS ─── */}
        {tab === "mine" && (() => {
          // Construïm l'historial de moviments combinant porres + jackpot + cara o creu
          const moves = [];
          // Porres liquidades
          for (const b of myBets) {
            const m = matches.find(mm => mm.id === b.matchId);
            if (!m) continue;
            if (b.settled) {
              const net = b.payout - b.amount;
              moves.push({
                ts: m.settledAt || b.createdAt || 0,
                icon: net > 0 ? "✅" : "❌",
                title: `${m.home} vs ${m.away}`,
                sub: net > 0 ? `Vas encertar` : `No va sortir`,
                delta: net,
                spain: m.spain,
              });
            } else {
              moves.push({
                ts: b.createdAt || 0,
                icon: "🎯",
                title: `${m.home} vs ${m.away}`,
                sub: `Aposta feta · pendent`,
                delta: -b.amount,
                pending: true,
                spain: m.spain,
              });
            }
          }
          // Jackpot Espanya (settled)
          if (espanyaHistory) {
            for (const [mid, info] of espanyaHistory) {
              const won = info.winners && info.winners.find(w => w.memberId === member.id);
              if (won) {
                const m = matches.find(x => x.id === mid);
                const share = info.winners.length > 0 ? Math.floor(info.totalPot / info.winners.length) : 0;
                moves.push({ ts: info.date, icon: "🏆", title: `Jackpot Espanya`, sub: m ? `${m.home} vs ${m.away}` : "Guanyat!", delta: share, spain: true });
              }
            }
          }
          moves.sort((a, b) => b.ts - a.ts);

          return (
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                {[
                  { l: "Birres", v: member.birras, s: "🍺", hi: true },
                  { l: "Jugades", v: myBets.length, s: "" },
                  { l: "Encerts", v: myBets.filter(b => b.payout > 0).length, s: "" },
                ].map(s => (
                  <div key={s.l} style={{ flex: 1, background: C.card, border: `1px solid ${s.hi ? C.gold : C.border}`, borderRadius: 12, padding: "12px 6px", textAlign: "center" }}>
                    <div style={{ fontFamily: "var(--pff)", fontSize: 28, color: s.hi ? C.gold : C.txt, lineHeight: 1 }}>{s.v}<span style={{ fontSize: 14 }}>{s.s}</span></div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{s.l}</div>
                  </div>
                ))}
              </div>

              {/* GRÀFIC D'EVOLUCIÓ DE BIRRES */}
              {(() => {
                // Reconstruïm l'evolució: partim de START_BIRRAS i apliquem moviments cronològicament
                const chronological = [...moves].filter(m => !m.pending).sort((a, b) => a.ts - b.ts);
                if (chronological.length < 2) return null;
                // Punt inicial + acumulat
                let running = CFG.START_BIRRAS;
                const points = [running];
                for (const mv of chronological) { running += mv.delta; points.push(running); }
                const maxV = Math.max(...points), minV = Math.min(...points);
                const range = maxV - minV || 1;
                const W = 300, H = 80, pad = 4;
                const coords = points.map((v, i) => {
                  const x = pad + (i / (points.length - 1)) * (W - pad * 2);
                  const y = pad + (1 - (v - minV) / range) * (H - pad * 2);
                  return `${x.toFixed(1)},${y.toFixed(1)}`;
                });
                const last = points[points.length - 1];
                const trend = last >= CFG.START_BIRRAS;
                return (
                  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ fontFamily: "var(--pff2)", fontSize: 11, color: C.muted, letterSpacing: 2, fontWeight: 600 }}>📈 EVOLUCIÓ DE BIRRES</div>
                      <div style={{ fontFamily: "var(--pff)", fontSize: 16, color: trend ? C.green : C.red }}>{trend ? "↗" : "↘"} {last}🍺</div>
                    </div>
                    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 80 }} preserveAspectRatio="none">
                      <polyline points={coords.join(" ")} fill="none" stroke={trend ? C.green : C.red} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                      <line x1={pad} y1={pad + (1 - (CFG.START_BIRRAS - minV) / range) * (H - pad * 2)} x2={W - pad} y2={pad + (1 - (CFG.START_BIRRAS - minV) / range) * (H - pad * 2)} stroke={C.border} strokeWidth="1" strokeDasharray="3,3" />
                    </svg>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.muted, marginTop: 4 }}>
                      <span>Inici: {CFG.START_BIRRAS}🍺</span>
                      <span>Ara: {last}🍺</span>
                    </div>
                  </div>
                );
              })()}

              <div style={sty.sectionH}>📊 MOVIMENTS DE BIRRES</div>
              {moves.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: C.muted }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>📊</div>
                  <p style={{ fontFamily: "var(--pff)", fontSize: 20 }}>ENCARA RES</p>
                  <p style={{ fontSize: 12, marginTop: 4 }}>Fes la teva primera porra!</p>
                </div>
              ) : moves.map((mv, i) => (
                <div key={i} style={{ background: C.card, borderRadius: 10, padding: "11px 14px", marginBottom: 6, border: `1px solid ${mv.spain ? "rgba(228,21,27,0.3)" : C.border}`, display: "flex", gap: 12, alignItems: "center" }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{mv.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--pff2)", fontSize: 14, fontWeight: 600, color: C.txt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mv.title}{mv.spain ? " 🇪🇸" : ""}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>{mv.sub}</div>
                  </div>
                  <div style={{ flexShrink: 0, fontFamily: "var(--pff)", fontSize: 20, color: mv.pending ? C.muted : (mv.delta > 0 ? C.green : C.red) }}>
                    {mv.delta > 0 ? "+" : ""}{mv.delta}🍺
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* ─── MÉS ─── */}
        {/* ─── ESTADÍSTIQUES ─── */}
        {tab === "stats" && (() => {
          // Totes les porres del grup (totes les apostes dels membres del grup)
          const gMemberIds = groupMembers.map(m => m.id);
          const gBets = bets.filter(b => gMemberIds.includes(b.memberId) && b.settled);

          // Per cada membre: estadístiques detallades
          const playerStats = groupMembers.map(m => {
            const acc = accounts.find(a => a.id === m.accountId);
            const pBets = gBets.filter(b => b.memberId === m.id);
            const wins = pBets.filter(b => b.payout > 0);
            const losses = pBets.filter(b => b.payout === 0);
            const totalBet = pBets.reduce((s, b) => s + b.amount, 0);
            const totalWon = wins.reduce((s, b) => s + b.payout, 0);
            const totalLost = losses.reduce((s, b) => s + b.amount, 0);
            const netGain = totalWon - totalBet;
            const biggestBet = pBets.length > 0 ? Math.max(...pBets.map(b => b.amount)) : 0;
            const biggestLoss = losses.length > 0 ? Math.max(...losses.map(b => b.amount)) : 0;
            const biggestWin = wins.length > 0 ? Math.max(...wins.map(b => b.payout - b.amount)) : 0;
            return { id: m.id, name: acc?.name || "?", emoji: acc?.emoji || "🍺",
              played: pBets.length, wins: wins.length, losses: losses.length,
              totalBet, totalWon, totalLost, netGain, biggestBet, biggestLoss, biggestWin,
              birras: m.birras };
          }).filter(p => p.played > 0 || true);

          const mostBets = [...playerStats].sort((a, b) => b.totalBet - a.totalBet)[0];
          const mostLost = [...playerStats].sort((a, b) => b.totalLost - a.totalLost)[0];
          const bigBet = [...playerStats].sort((a, b) => b.biggestBet - a.biggestBet)[0];
          const bigLoss = [...playerStats].sort((a, b) => b.biggestLoss - a.biggestLoss)[0];
          const bigWin = [...playerStats].sort((a, b) => b.biggestWin - a.biggestWin)[0];
          const mostWins = [...playerStats].sort((a, b) => b.wins - a.wins)[0];
          const bestRate = [...playerStats].filter(p => p.played >= 3).sort((a, b) => (b.wins/b.played) - (a.wins/a.played))[0];

          const statCard = (icon, label, player, value) => player ? (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontFamily: "var(--pff2)", fontSize: 10, color: C.muted, letterSpacing: 2, fontWeight: 700 }}>{icon} {label}</div>
                  <div style={{ fontFamily: "var(--pff)", fontSize: 22, color: C.txt, marginTop: 4, letterSpacing: 1 }}>{player.emoji} {player.name}</div>
                </div>
                <div style={{ fontFamily: "var(--pff)", fontSize: 28, color: C.gold, textAlign: "right" }}>{value}</div>
              </div>
            </div>
          ) : null;

          return (
            <div>
              <div style={{ fontFamily: "var(--pff2)", fontSize: 11, color: C.gold, letterSpacing: 3, marginBottom: 14, fontWeight: 700 }}>📈 ESTADÍSTIQUES DEL GRUP</div>

              {gBets.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 20px", color: C.muted }}>
                  <div style={{ fontSize: 56, marginBottom: 12 }}>📊</div>
                  <p style={{ fontFamily: "var(--pff)", fontSize: 22 }}>SENSE DADES YET</p>
                  <p style={{ fontSize: 13, marginTop: 8 }}>Les estadístiques apareixeran quan hi hagi partits finalitzats.</p>
                </div>
              ) : (<>
                {statCard("💸", "MÉS BIRRES APOSTADES", mostBets, `${mostBets?.totalBet}🍺`)}
                {statCard("🔥", "MÉS VICTÒRIES", mostWins, `${mostWins?.wins} victòries`)}
                {statCard("😅", "MÉS BIRRES PERDUDES", mostLost, `${mostLost?.totalLost}🍺`)}
                {statCard("💰", "MAJOR APOSTA", bigBet, `${bigBet?.biggestBet}🍺`)}
                {statCard("😭", "MAJOR DERROTA", bigLoss, `${bigLoss?.biggestLoss}🍺`)}
                {statCard("🎉", "MAJOR VICTÒRIA", bigWin, `+${bigWin?.biggestWin}🍺`)}
                {bestRate && statCard("🎯", "MILLOR % ENCERTS (mín. 3)", bestRate, `${Math.round(100*bestRate.wins/bestRate.played)}%`)}

                <div style={{ fontFamily: "var(--pff2)", fontSize: 11, color: C.gold, letterSpacing: 3, marginTop: 20, marginBottom: 12, fontWeight: 700 }}>TAULA COMPLETA</div>
                {[...playerStats].sort((a, b) => b.netGain - a.netGain).map(p => (
                  <div key={p.id} style={{ background: p.id === member.id ? `${C.red}22` : C.card, border: `1px solid ${p.id === member.id ? C.red : C.border}`, borderRadius: 10, padding: "10px 14px", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 22 }}>{p.emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "var(--pff2)", fontSize: 13, fontWeight: 700, color: C.txt }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                          {p.wins}✓/{p.played} · apostat {p.totalBet}🍺 · perdut {p.totalLost}🍺
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontFamily: "var(--pff)", fontSize: 18, color: p.netGain >= 0 ? C.green : C.red }}>
                          {p.netGain >= 0 ? "+" : ""}{p.netGain}🍺
                        </div>
                        <div style={{ fontSize: 10, color: C.muted }}>{p.birras}🍺 actuals</div>
                      </div>
                    </div>
                  </div>
                ))}
              </>)}
            </div>
          );
        })()}

        {tab === "more" && (
          <div>
            <div style={sty.sectionH}>PERFIL</div>
            <div style={{ ...sty.card, marginBottom: 14, textAlign: "center", padding: "20px 14px" }}>
              <button onClick={() => setShowEmojiChange(true)} style={{ width: 64, height: 64, borderRadius: "50%", background: C.gold, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, margin: "0 auto 10px", border: `2px solid ${C.amber}`, cursor: "pointer" }}>{account.emoji || "🍺"}</button>
              <div style={{ fontFamily: "var(--pff)", fontWeight: 800, fontSize: 24, color: C.txt }}>{account.name}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Grup: {currentGroup?.name}</div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>Toca l'emoji per canviar-lo</div>
            </div>

            <div style={sty.sectionH}>MINIJOCS</div>
            {/* Cara o Creu */}
            <button onClick={() => setShowCoin(true)} style={{ width: "100%", background: coinThisWeek?.lost ? "#1a0a0a" : (!coinThisWeek || (!coinThisWeek.lost && !coinThisWeek.cashedOut)) ? "linear-gradient(135deg,#3a2800,#1a1200)" : C.card2, border: `1px solid ${coinThisWeek?.lost ? C.red : C.amber}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left" }}>
              <span style={{ fontSize: 28 }}>🪙</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--pff)", fontWeight: 800, fontSize: 15, color: coinThisWeek?.lost ? C.red : C.amber }}>CARA O CREU</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                  {!coinThisWeek && `Setmanal · ${CFG.COIN_ENTRY}🍺 entrada`}
                  {coinThisWeek?.lost && "Aquesta setmana ja has perdut 😩"}
                  {coinThisWeek?.cashedOut && `Has agafat ${coinThisWeek.currentBote}🍺 ✓`}
                  {coinThisWeek && !coinThisWeek.lost && !coinThisWeek.cashedOut && `Tens ${coinThisWeek.currentBote}🍺! Continua o planta't`}
                </div>
              </div>
              <span style={{ color: C.muted }}>→</span>
            </button>

            <div style={sty.sectionH}>OPCIONS</div>
            {[
              { icon: "📖", label: "Normes del joc", action: () => setShowRules(true) },
              { icon: "🔄", label: "Canviar de grup", action: () => setActiveGroupId(null), color: C.blue },
              { icon: "🚪", label: "Tancar sessió", action: async () => { await auth.signOut(); setAccount(null); setActiveGroupId(null); setTab("matches"); }, color: C.muted },
            ].map((opt, i) => (
              <button key={i} onClick={opt.action} style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", color: opt.color || C.txt, fontSize: 15, fontWeight: 600, textAlign: "left" }}>
                <span style={{ fontSize: 22 }}>{opt.icon}</span><span>{opt.label}</span>
              </button>
            ))}
            <p style={{ color: C.muted, fontSize: 10, textAlign: "center", marginTop: 24 }}>BIRRAPORRA MUNDIAL v3.0<br />🏆 World Cup 2026 · Fet entre col·legues 🍺</p>
          </div>
        )}
      </div>

      {/* BOTTOM NAV */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: C.card, borderTop: `1px solid ${C.border}`, display: "flex", zIndex: 50, boxShadow: "0 -2px 12px rgba(0,0,0,0.04)" }}>
        {[
          { id: "matches", i: "⚽", l: "PARTITS", badge: unbettedCount, urgent: hasUrgentUnbetted },
          { id: "jackpot", i: "🏆", l: "JACKPOT" },
          { id: "ranking", i: "📊", l: "RANKING" },
          { id: "stats", i: "📈", l: "STATS" },
          { id: "more", i: "⋯", l: "MÉS" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "12px 2px 10px", background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer", borderTop: `3px solid ${tab === t.id ? C.blue : "transparent"}`, position: "relative" }}>
            <span style={{ fontSize: 20, position: "relative" }}>
              {t.i}
              {t.badge > 0 && (
                <span style={{ position: "absolute", top: -4, right: -10, minWidth: 16, height: 16, padding: "0 4px", background: t.urgent ? C.red : C.gold, color: "#fff", borderRadius: 8, fontSize: 10, fontWeight: 700, fontFamily: "var(--pff2)", display: "flex", alignItems: "center", justifyContent: "center", animation: t.urgent ? "pulse 1.5s ease-in-out infinite" : "none" }}>{t.badge}</span>
              )}
            </span>
            <span style={{ fontSize: 9, color: tab === t.id ? C.blue : C.muted, fontFamily: "var(--pff2)", letterSpacing: 1, fontWeight: 700 }}>{t.l}</span>
          </button>
        ))}
      </div>

      {/* MODALS */}
      {betMatch && <BetModal match={betMatch} member={member} existing={myBets.find(b => b.matchId === betMatch.id)} jokerAvailable={false} onSubmit={submitBet} onClose={() => setBetMatch(null)} />}
      {showClasico && espanyaActiveMatch && (
        <EspanyaModal
          match={espanyaActiveMatch}
          currentPot={espanyaCurrentPot}
          carryPot={espanyaCarryPot}
          member={member}
          existing={espanyaMyEntry}
          onSubmit={submitEspanya}
          onClose={() => setShowClasico(false)} />
      )}
      {showCoin && <CoinFlipModal member={member} current={coinThisWeek} onPlay={playCoin} onCashout={cashoutCoin} onClose={() => setShowCoin(false)} />}
      {showAdmin && adminMode && (
        <AdminPanel
          data={{ groups, members, accounts, matches }}
          handlers={{ addMatch: adminAddMatch, setResult: adminSetResult, recharge: adminRecharge, closeMonth: adminCloseMonth, doubleMonth: adminDouble, deleteGroup: adminDeleteGroup }}
          onClose={() => setShowAdmin(false)}
        />
      )}
      {showRules && member?.seenWelcome && <RulesScreen firstTime={false} onClose={() => setShowRules(false)} />}
      {showEmojiChange && <EmojiChangeModal current={account.emoji || "🍺"} onSave={updateEmoji} onClose={() => setShowEmojiChange(false)} />}
      {showAdminLogin && <AdminPassModal onSubmit={tryAdmin} onClose={() => setShowAdminLogin(false)} />}
      {confetti && <Confetti />}
      <Toast toast={toast} />
    </div>
  );
}
