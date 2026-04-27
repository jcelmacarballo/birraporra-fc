// ═══════════════════════════════════════════════════════════════════════════
//  BIRRAPORRA FC — La porra dels teus colegues
//  v1.5 · Català · Combo Europa gratis · Reorganització nav · Sense torneig/robatori
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from "react";

// ─────────────────────────── 1. CONFIG ────────────────────────────────────
const CFG = {
  ADMIN_PASS: "gol2024",
  ENTRY_EUR: 2.50, START_BIRRAS: 50, BIRRA_EUR: 0.05, BEER_EUR: 2.50,
  PRIZES: [0.40, 0.30, 0.20, 0.10],
  RACHA_N: 3, RACHA_BONUS: 15,
  SUPER_MULT: 1.5, EXACT_BONUS: 2, DOUBLE_BONUS: 0.20,
  JOKER_PER_WEEK: 1,
  EUROPA_BONUSES: { 3: 5, 4: 10, 5: 15 },
  CLASICO_ENTRY: 5, CLASICO_REQUIRED: 2,
  CHAT_LIMIT: 200,
  EUROPA_REQUIRED: 5,
  COIN_ENTRY: 5, COIN_MAX_DOUBLES: 3,
};

const C = {
  bg: "#0a0907", card: "#16110a", card2: "#1e1810", border: "#2e2618",
  gold: "#f5b800", amber: "#c88800", muted: "#80746a", txt: "#f5eed8",
  red: "#e03838", green: "#38b858", blue: "#5299d6", purple: "#a855f7",
  rose: "#f43f5e", cyan: "#22d3ee",
};

const LEAGUES = ["La Liga", "Champions League", "Premier League", "Serie A", "Bundesliga", "Ligue 1", "Mundial", "Altres"];
const AVATAR_EMOJIS = ["🍺", "⚽", "🔥", "🏆", "😈", "🎯", "👑", "💪", "🦁", "🐂", "🦅", "🐺", "⚡", "💀", "🤘", "🍀"];

// ─────────────────────────── 2. STORAGE & UTILS ───────────────────────────
const KEYS = {
  accounts: "bporra_v8_accounts",
  groups: "bporra_v8_groups",
  members: "bporra_v8_members",
  matches: "bporra_v8_matches",
  bets: "bporra_v8_bets",
  clasico: "bporra_v8_clasico",
  europa: "bporra_v8_europa",
  chats: "bporra_v8_chats",
  coinflips: "bporra_v8_coinflips",
};

async function dbGet(k) { try { const r = await window.storage.get(k, true); return r ? JSON.parse(r.value) : null; } catch { return null; } }
async function dbSet(k, v) { try { await window.storage.set(k, JSON.stringify(v), true); } catch {} }

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
  if (match.superBono) cuota *= CFG.SUPER_MULT;
  let payout = bet.amount * cuota;
  if (bet.joker) payout *= 2;
  if (bet.exactScore && bet.exactScore === winScore) payout *= CFG.EXACT_BONUS;
  return Math.round(payout);
}
function settleBets(allBets, match) {
  return allBets.map(b => b.matchId !== match.id ? b : { ...b, payout: calcPayout(b, match), settled: true });
}

// ─────────────────────────── 4. STYLES & ATOMS ────────────────────────────
const sty = {
  btnPrimary: { background: C.gold, color: "#0c0900", border: "none", borderRadius: 10, padding: "14px 16px", fontFamily: "var(--pff)", fontWeight: 900, fontSize: 18, letterSpacing: 1, cursor: "pointer" },
  btnGhost: { background: C.card2, color: C.muted, border: "none", borderRadius: 10, padding: "14px 16px", fontFamily: "var(--pff)", fontWeight: 700, fontSize: 16, cursor: "pointer" },
  btnWA: { background: "#25d366", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontFamily: "var(--pff)", fontWeight: 700, fontSize: 13, letterSpacing: 0.5, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 },
  input: { padding: "12px 14px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.txt, fontSize: 15, outline: "none", width: "100%", fontFamily: "inherit" },
  label: { fontSize: 11, color: C.muted, fontFamily: "var(--pff)", letterSpacing: 1, display: "block", marginBottom: 4 },
  sectionH: { fontFamily: "var(--pff)", fontWeight: 800, fontSize: 13, color: C.gold, letterSpacing: 2, marginBottom: 12 },
  card: { background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: 14 },
};

function Chip({ children, color = C.muted, bg = C.card2, border }) {
  return <span style={{ background: bg, color, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 4, letterSpacing: 1, fontFamily: "var(--pff)", border: border ? `1px solid ${border}` : "none", whiteSpace: "nowrap" }}>{children}</span>;
}
const SuperChip = () => <Chip color={C.gold} bg="#3a1800" border={C.amber}>⚡ SÚPER BONUS</Chip>;
const EuropaChip = () => <Chip color={C.purple} bg="#1a0a2e" border="#5a2080">🌍 TOP 5 EUROPA</Chip>;
const JokerChip = () => <Chip color={C.blue} bg="#0a1a2e" border={C.blue}>🃏 JOKER ×2</Chip>;
const ClasicoChip = () => <Chip color={C.rose} bg="#2a0512" border={C.rose}>🏆 JACKPOT</Chip>;
const LockedChip = () => <Chip color={C.muted} bg={C.card2} border={C.border}>🔒 TANCAT</Chip>;

function Cuota({ value, big }) {
  return <span style={{ fontFamily: "var(--pff)", fontWeight: 900, fontSize: big ? 24 : 16, color: C.gold, lineHeight: 1 }}>×{Number(value).toFixed(2)}</span>;
}
function RedDot({ show }) {
  if (!show) return null;
  return <span style={{ position: "absolute", top: 6, right: "30%", width: 8, height: 8, background: C.red, borderRadius: "50%", boxShadow: "0 0 6px rgba(224,56,56,0.7)" }} />;
}
function WAButton({ text, label = "📲 Compartir al WhatsApp", small }) {
  return <button onClick={() => shareToWhatsApp(text)} style={{ ...sty.btnWA, padding: small ? "6px 10px" : "8px 14px", fontSize: small ? 11 : 13 }}>{label}</button>;
}
function Toast({ toast }) {
  if (!toast) return null;
  const palette = { success: { bg: "#0d2200", border: C.green }, info: { bg: "#0a1a2e", border: C.blue }, warn: { bg: "#2a1800", border: C.amber }, error: { bg: "#2a0000", border: C.red } }[toast.type] || { bg: C.card, border: C.border };
  return <div style={{ position: "fixed", top: 70, left: "50%", transform: "translateX(-50%)", background: palette.bg, color: C.txt, padding: "10px 18px", borderRadius: 10, border: `1px solid ${palette.border}`, zIndex: 400, fontSize: 14, fontWeight: 600, animation: "slideUp 0.3s ease", maxWidth: "90vw" }}>{toast.msg}</div>;
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

// ─────────────────────────── 5. LOGIN SCREEN ──────────────────────────────
function LoginScreen({ accounts, onLogin, onSignup, onAdmin }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState(""); const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState(""); const [emoji, setEmoji] = useState("🍺");
  const [err, setErr] = useState(""); const [taps, setTaps] = useState(0);

  const tapLogo = () => {
    const n = taps + 1; setTaps(n);
    if (n >= 5) { onAdmin(); setTaps(0); }
    setTimeout(() => setTaps(0), 2000);
  };
  const submit = () => {
    setErr("");
    if (!name.trim()) return setErr("Posa't un mote");
    if (pass.length < 3) return setErr("Contrasenya mínim 3 caràcters");
    if (mode === "signup" && pass !== pass2) return setErr("Les contrasenyes no coincideixen");
    if (mode === "login") onLogin({ name: name.trim(), pass }, setErr);
    else onSignup({ name: name.trim(), pass, emoji }, setErr);
  };

  return (
    <div style={{ minHeight: "100vh", background: `radial-gradient(circle at top, #1a1200 0%, ${C.bg} 60%)`, display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 20px 30px" }}>
      <div onClick={tapLogo} style={{ textAlign: "center", marginBottom: 28, cursor: "default", userSelect: "none" }}>
        <div style={{ fontSize: 64, marginBottom: 4, animation: "foam 2s ease-in-out infinite" }}>🍺</div>
        <div style={{ fontFamily: "var(--pff)", fontWeight: 900, fontSize: 36, color: C.gold, letterSpacing: 2, lineHeight: 1, textShadow: "0 2px 12px rgba(245,184,0,0.3)" }}>BIRRAPORRA FC</div>
        <div style={{ color: C.muted, fontSize: 12, marginTop: 6, letterSpacing: 1 }}>La porra dels teus colegues</div>
      </div>
      <div style={{ width: "100%", maxWidth: 360, background: C.card, borderRadius: 20, padding: 24, border: `1px solid ${C.border}` }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{ fontFamily: "var(--pff)", fontWeight: 800, fontSize: 24, color: C.txt, letterSpacing: 1 }}>{mode === "login" ? "ENTRA" : "FES-TE COMPTE"}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Pas 1 de 2 · El teu compte</div>
        </div>
        <label style={sty.label}>EL TEU MOTE</label>
        <input placeholder="Ex: Marçal" value={name} onChange={e => setName(e.target.value)} style={{ ...sty.input, marginBottom: 12 }} />
        <label style={sty.label}>CONTRASENYA</label>
        <input type="password" placeholder="••••••" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => mode === "login" && e.key === "Enter" && submit()} style={{ ...sty.input, marginBottom: mode === "signup" ? 12 : 14 }} />
        {mode === "signup" && (
          <>
            <label style={sty.label}>REPETEIX CONTRASENYA</label>
            <input type="password" placeholder="••••••" value={pass2} onChange={e => setPass2(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} style={{ ...sty.input, marginBottom: 14 }} />
            <label style={sty.label}>TRIA EL TEU EMOJI</label>
            <div style={{ background: C.card2, padding: 10, borderRadius: 10, marginBottom: 14 }}>
              <EmojiPicker value={emoji} onChange={setEmoji} compact />
            </div>
          </>
        )}
        {err && <p style={{ color: C.red, fontSize: 12, marginBottom: 10, textAlign: "center" }}>⚠ {err}</p>}
        <button onClick={submit} style={{ ...sty.btnPrimary, width: "100%", marginBottom: 12 }}>{mode === "login" ? "ENTRA 🍺" : "CREA COMPTE 🍺"}</button>
        <div style={{ textAlign: "center", fontSize: 13, color: C.muted }}>
          {mode === "login" ? "No tens compte?" : "Ja en tens un?"}
          <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setErr(""); }} style={{ background: "none", border: "none", color: C.gold, fontWeight: 700, marginLeft: 6, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
            {mode === "login" ? "Crea'n un" : "Entra"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── 6. GROUP SCREEN ──────────────────────────────
function GroupScreen({ account, groups, members, onJoin, onCreate, onLogout }) {
  const [mode, setMode] = useState("pick");
  const [selGroup, setSelGroup] = useState("");
  const [groupPass, setGroupPass] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupPass, setNewGroupPass] = useState("");
  const [err, setErr] = useState("");

  const myGroups = members.filter(m => m.accountId === account.id);
  const myGroupIds = new Set(myGroups.map(m => m.groupId));

  const submit = () => {
    setErr("");
    if (mode === "pick") {
      if (!selGroup) return setErr("Tria un grup");
      if (myGroupIds.has(selGroup)) { onJoin({ groupId: selGroup, alreadyMember: true }); return; }
      if (!groupPass) return setErr("Posa la contrasenya del grup");
      onJoin({ groupId: selGroup, groupPass }, setErr);
    } else {
      if (!newGroupName.trim()) return setErr("Nom del grup");
      if (newGroupPass.length < 3) return setErr("Contrasenya mínim 3 caràcters");
      onCreate({ name: newGroupName.trim(), pass: newGroupPass }, setErr);
    }
  };

  const tabBtn = (val, options, set) => (
    <div style={{ display: "flex", gap: 4, marginBottom: 18, background: C.card2, padding: 4, borderRadius: 10 }}>
      {options.map(([k, l]) => (
        <button key={k} onClick={() => { set(k); setErr(""); }} style={{ flex: 1, padding: "10px 4px", borderRadius: 8, border: "none", background: val === k ? C.gold : "transparent", color: val === k ? "#0c0900" : C.muted, fontFamily: "var(--pff)", fontWeight: 800, fontSize: 13, letterSpacing: 1, cursor: "pointer" }}>{l}</button>
      ))}
    </div>
  );

  const isAlreadyMember = mode === "pick" && selGroup && myGroupIds.has(selGroup);

  return (
    <div style={{ minHeight: "100vh", background: `radial-gradient(circle at top, #1a1200 0%, ${C.bg} 60%)`, display: "flex", flexDirection: "column", alignItems: "center", padding: "30px 20px" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 48, marginBottom: 4 }}>{account.emoji || "🍺"}</div>
        <div style={{ fontFamily: "var(--pff)", fontWeight: 900, fontSize: 26, color: C.gold, letterSpacing: 2, lineHeight: 1 }}>HOLA, {account.name.toUpperCase()}!</div>
        <div style={{ color: C.muted, fontSize: 12, marginTop: 6 }}>Pas 2 de 2 · Tria el grup</div>
      </div>
      {myGroups.length > 0 && (
        <div style={{ width: "100%", maxWidth: 360, marginBottom: 18 }}>
          <div style={{ ...sty.label, marginBottom: 8, paddingLeft: 4 }}>ELS TEUS GRUPS</div>
          {myGroups.map(m => {
            const g = groups.find(g => g.id === m.groupId);
            if (!g) return null;
            return (
              <button key={g.id} onClick={() => onJoin({ groupId: g.id, alreadyMember: true })} style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 16px", marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", color: C.txt }}>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontFamily: "var(--pff)", fontWeight: 800, fontSize: 16, color: C.gold }}>{g.name}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{m.birras}🍺 · {fmtEUR(g.bote_EUR)} pot</div>
                </div>
                <span style={{ fontSize: 18, color: C.muted }}>→</span>
              </button>
            );
          })}
        </div>
      )}
      <div style={{ width: "100%", maxWidth: 360, background: C.card, borderRadius: 20, padding: 24, border: `1px solid ${C.border}` }}>
        <div style={{ ...sty.label, textAlign: "center", marginBottom: 14 }}>{myGroups.length > 0 ? "ENTRA A UN ALTRE O CREA'N UN" : "TRIA EL TEU GRUP"}</div>
        {tabBtn(mode, [["pick", "🤝 ENTRAR"], ["create", "✨ CREAR"]], setMode)}
        {mode === "pick" ? (
          <>
            <select value={selGroup} onChange={e => setSelGroup(e.target.value)} style={{ ...sty.input, marginBottom: 12 }}>
              <option value="">— tria grup —</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}{myGroupIds.has(g.id) ? " ✓" : ""}</option>)}
            </select>
            {!isAlreadyMember && selGroup && (
              <input type="password" placeholder="Contrasenya del grup" value={groupPass} onChange={e => setGroupPass(e.target.value)} style={{ ...sty.input, marginBottom: 14 }} />
            )}
            {isAlreadyMember && (
              <div style={{ background: "#0d2200", border: `1px solid ${C.green}`, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: C.green, marginBottom: 14, textAlign: "center" }}>
                ✓ Ja ets membre, entres directe
              </div>
            )}
            {groups.length === 0 && <p style={{ color: C.muted, fontSize: 12, textAlign: "center", marginBottom: 14 }}>Encara no hi ha cap grup. Crea el primer ✨</p>}
          </>
        ) : (
          <>
            <input placeholder="Nom del grup (ex: Els Cunyats FC)" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} style={{ ...sty.input, marginBottom: 10 }} />
            <input type="password" placeholder="Contrasenya del grup" value={newGroupPass} onChange={e => setNewGroupPass(e.target.value)} style={{ ...sty.input, marginBottom: 14 }} />
          </>
        )}
        {err && <p style={{ color: C.red, fontSize: 12, marginBottom: 10, textAlign: "center" }}>⚠ {err}</p>}
        <button onClick={submit} disabled={mode === "pick" && !selGroup} style={{ ...sty.btnPrimary, width: "100%", opacity: (mode === "pick" && !selGroup) ? 0.4 : 1 }}>
          {mode === "pick" ? (isAlreadyMember ? "ENTRA 🍺" : "ENTRO! 🤝") : "CREA I ENTRA ✨"}
        </button>
        <p style={{ color: C.muted, fontSize: 10, textAlign: "center", marginTop: 12, lineHeight: 1.6 }}>Quan entres, l'admin et cobrarà {fmtEUR(CFG.ENTRY_EUR)} i tindràs {CFG.START_BIRRAS}🍺</p>
      </div>
      <button onClick={onLogout} style={{ marginTop: 20, background: "none", border: "none", color: C.muted, fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>Tancar sessió</button>
    </div>
  );
}

// ─────────────────────────── 7. RULES SCREEN ──────────────────────────────
function RulesScreen({ onClose, firstTime }) {
  const rules = [
    ["🍺", `Entrada ${fmtEUR(CFG.ENTRY_EUR)}`, `Comences amb ${CFG.START_BIRRAS} birres. Cada 🍺 val ${(CFG.BIRRA_EUR * 100).toFixed(0)} cèntims.`],
    ["🎯", "Aposta a l'1X2", "Apostes Local, Empat o Visitant amb una quota fixa. Si l'encertes: birres × quota."],
    ["⭐", "Marcador exacte BONUS", `Quan apostes pots escriure el marcador exacte (gratis). Si encertes guanyador I marcador: guanys ×${CFG.EXACT_BONUS}!`],
    ["🔒", "Tancament automàtic", "Quan comença el partit, la teva porra es tanca i ja no es pot tocar."],
    ["🏆", "Jackpot Clàssic", `Pagues ${CFG.CLASICO_ENTRY}🍺 i prediu marcadors exactes de 2 partits. Qui els encerta tots dos s'emporta TOT el pot.`],
    ["🪙", "Cara o Creu", `Un cop per setmana! ${CFG.COIN_ENTRY}🍺 entrada, dobles fins ${CFG.COIN_MAX_DOUBLES} cops (fins ${CFG.COIN_ENTRY * Math.pow(2, CFG.COIN_MAX_DOUBLES + 1)}🍺). Si falles, perds tot.`],
    ["⚡", "Súper Bonus", `L'admin marca un partit especial. Quotes ×${CFG.SUPER_MULT}.`],
    ["🌍", "Combo Europa", `Gratis! L'admin marca 5 partidots top. Tu prediu 1X2 sense apostar res. 3 encerts = +${CFG.EUROPA_BONUSES[3]}🍺 · 4 = +${CFG.EUROPA_BONUSES[4]}🍺 · 5 = +${CFG.EUROPA_BONUSES[5]}🍺.`],
    ["🃏", "Joker setmanal", `${CFG.JOKER_PER_WEEK}× per setmana actives el Joker en una porra: guanys ×2.`],
    ["🔥", "Ratxa", `${CFG.RACHA_N} encerts seguits → +${CFG.RACHA_BONUS}🍺 gratis.`],
    ["🔮", "Profeta", "Si claves un marcador exacte, surt un missatge automàtic al xat presumint."],
    ["📅", "Resum setmanal", "Al menú Més pots veure el resum de la setmana i compartir-lo al WhatsApp del grup."],
    ["📊", "Estadístiques", "Pestanya amb dades divertides del grup."],
    ["🏅", "Premi mensual EN BIRRES", `Pot → birres (${fmtEUR(CFG.BEER_EUR)}/birra). 🥇 40% · 🥈 30% · 🥉 20% · 4️⃣ 10%.`],
    ["💬", "Xat de grup", "Pica't amb els col·legues abans i després dels partits."],
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

// ─────────────────────────── 8. MATCH CARD ────────────────────────────────
function MatchCard({ match, userBet, onBet, member }) {
  const done = match.status === "finished";
  const started = matchStarted(match) && !done;
  const cardBg = match.europa ? "#150a25" : match.superBono ? "#1a1200" : C.card;
  const borderColor = match.europa ? "#5a2080" : match.superBono ? C.amber : C.border;

  return (
    <div style={{ background: cardBg, borderRadius: 14, padding: 16, marginBottom: 12, border: `1px solid ${borderColor}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: C.muted, fontFamily: "var(--pff)", letterSpacing: 1 }}>{match.league}</span>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {match.europa && <EuropaChip />}
          {match.superBono && <SuperChip />}
          {done ? <Chip color={C.muted} bg={C.card2}>FINALITZAT</Chip> : started ? <LockedChip /> : <Chip color={C.green} bg="#0d1f00">● OBERT</Chip>}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ flex: 1, fontFamily: "var(--pff)", fontWeight: 800, fontSize: 19, color: C.txt, textAlign: "right" }}>{match.home}</span>
        <div style={{ minWidth: 70, textAlign: "center" }}>
          {match.result ? <span style={{ fontFamily: "var(--pff)", fontWeight: 900, fontSize: 26, color: C.gold }}>{match.result.home}–{match.result.away}</span> : <span style={{ fontFamily: "var(--pff)", fontWeight: 700, fontSize: 18, color: C.muted }}>VS</span>}
        </div>
        <span style={{ flex: 1, fontFamily: "var(--pff)", fontWeight: 800, fontSize: 19, color: C.txt, textAlign: "left" }}>{match.away}</span>
      </div>
      {match.date && <div style={{ fontSize: 11, color: C.muted, textAlign: "center", marginBottom: 10 }}>{fmtDate(match.date)}</div>}
      {!done && !started && (
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          {[["H", match.home], ["D", "Empat"], ["A", match.away]].map(([k, lbl]) => (
            <div key={k} style={{ flex: 1, background: C.card2, padding: "8px 4px", borderRadius: 8, textAlign: "center" }}>
              <div style={{ fontSize: 9, color: C.muted, fontFamily: "var(--pff)", letterSpacing: 0.5, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", marginBottom: 2 }}>{lbl}</div>
              <Cuota value={match.cuotas[k] * (match.superBono ? CFG.SUPER_MULT : 1)} />
            </div>
          ))}
        </div>
      )}
      {userBet && (
        <div style={{ background: C.card2, borderRadius: 8, padding: "10px 12px", marginBottom: 10, fontSize: 13 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ color: C.muted, fontSize: 11, fontFamily: "var(--pff)", letterSpacing: 1 }}>LA TEVA PORRA</span>
            {userBet.joker && <JokerChip />}
          </div>
          <div style={{ color: C.txt, fontWeight: 600 }}>
            → {userBet.outcome === "H" ? `Guanya ${match.home}` : userBet.outcome === "A" ? `Guanya ${match.away}` : "Empat"}
            {userBet.exactScore && <span style={{ color: C.amber, marginLeft: 6 }}>+ {userBet.exactScore.replace("-", "–")} ⭐</span>}
            <span style={{ color: C.gold, marginLeft: 8 }}>{userBet.amount}🍺</span>
          </div>
          {userBet.settled && (
            <div style={{ marginTop: 6, paddingTop: 6, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: C.muted }}>Resultat:</span>
              <span style={{ fontFamily: "var(--pff)", fontWeight: 900, fontSize: 16, color: userBet.payout > 0 ? C.green : C.red }}>
                {userBet.payout > 0 ? `+${userBet.payout - userBet.amount}🍺 ✓` : `−${userBet.amount}🍺 ✗`}
              </span>
            </div>
          )}
        </div>
      )}
      {!done && !started && (
        <button onClick={() => onBet(match)} disabled={member.birras < 1} style={{ ...sty.btnPrimary, width: "100%", opacity: member.birras < 1 ? 0.4 : 1, cursor: member.birras < 1 ? "not-allowed" : "pointer" }}>
          🍺 {userBet ? "EDITAR PORRA" : "FER PORRA"}
        </button>
      )}
      {started && !userBet && <div style={{ color: C.muted, fontSize: 12, textAlign: "center", padding: 6 }}>🔒 El partit ha començat</div>}
      {done && !userBet && <div style={{ color: C.muted, fontSize: 12, textAlign: "center", padding: 6 }}>No hi vas participar</div>}
    </div>
  );
}

// ─────────────────────────── 9. BET MODAL ─────────────────────────────────
function BetModal({ match, member, existing, jokerAvailable, onSubmit, onClose }) {
  const [outcome, setOutcome] = useState(existing?.outcome || "H");
  const [exactH, setExactH] = useState(existing?.exactScore?.split("-")[0] ?? "");
  const [exactA, setExactA] = useState(existing?.exactScore?.split("-")[1] ?? "");
  const [amount, setAmount] = useState(existing?.amount ?? Math.min(10, member.birras));
  const [joker, setJoker] = useState(existing?.joker || false);
  const [err, setErr] = useState("");

  const refund = existing?.amount || 0;
  const maxBet = member.birras + refund;
  const cuotaWithSuper = match.cuotas[outcome] * (match.superBono ? CFG.SUPER_MULT : 1);
  const hasExact = exactH !== "" && exactA !== "" && !isNaN(parseInt(exactH)) && !isNaN(parseInt(exactA));
  const finalCuota = cuotaWithSuper * (hasExact ? CFG.EXACT_BONUS : 1) * (joker ? 2 : 1);
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
    onSubmit({ outcome, amount, exactScore, joker });
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "flex-end", zIndex: 100 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.card, borderRadius: "20px 20px 0 0", padding: 22, width: "100%", maxWidth: 480, margin: "0 auto", maxHeight: "94vh", overflowY: "auto" }}>
        <div style={{ width: 40, height: 4, background: C.border, borderRadius: 2, margin: "0 auto 14px" }} />
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
          {match.europa && <EuropaChip />}{match.superBono && <SuperChip />}
        </div>
        <div style={{ fontFamily: "var(--pff)", fontWeight: 800, fontSize: 11, color: C.gold, letterSpacing: 2, textAlign: "center" }}>{match.league}</div>
        <div style={{ textAlign: "center", fontFamily: "var(--pff)", fontWeight: 800, fontSize: 22, color: C.txt, marginBottom: 2 }}>{match.home} <span style={{ color: C.muted, fontSize: 16 }}>VS</span> {match.away}</div>
        <div style={{ textAlign: "center", fontSize: 12, color: C.muted, marginBottom: 14 }}>Disponible: {maxBet}🍺</div>
        <div style={{ ...sty.label, textAlign: "center" }}>1 · TRIA GUANYADOR</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {[["H", match.home], ["D", "Empat"], ["A", match.away]].map(([k, lbl]) => {
            const sel = outcome === k;
            const c = match.cuotas[k] * (match.superBono ? CFG.SUPER_MULT : 1);
            return (
              <button key={k} onClick={() => setOutcome(k)} style={{ flex: 1, padding: 14, borderRadius: 10, border: `2px solid ${sel ? C.gold : C.border}`, background: sel ? "#2a1d00" : C.card2, cursor: "pointer", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: C.muted, fontFamily: "var(--pff)", letterSpacing: 1, marginBottom: 6, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{lbl}</div>
                <Cuota value={c} big />
              </button>
            );
          })}
        </div>
        <div style={{ ...sty.label, textAlign: "center" }}>2 · MARCADOR EXACTE (opcional)</div>
        <div style={{ background: C.card2, borderRadius: 10, padding: 12, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 6 }}>
            <input type="number" min="0" max="15" placeholder="?" value={exactH} onChange={e => setExactH(e.target.value)} style={{ width: 56, height: 56, textAlign: "center", fontSize: 26, fontWeight: 800, fontFamily: "var(--pff)", background: C.bg, border: `2px solid ${exactH !== "" ? C.amber : C.border}`, borderRadius: 10, color: C.amber, outline: "none" }} />
            <span style={{ fontSize: 24, color: C.border, fontWeight: 900, fontFamily: "var(--pff)" }}>–</span>
            <input type="number" min="0" max="15" placeholder="?" value={exactA} onChange={e => setExactA(e.target.value)} style={{ width: 56, height: 56, textAlign: "center", fontSize: 26, fontWeight: 800, fontFamily: "var(--pff)", background: C.bg, border: `2px solid ${exactA !== "" ? C.amber : C.border}`, borderRadius: 10, color: C.amber, outline: "none" }} />
          </div>
          <div style={{ textAlign: "center", fontSize: 11, color: hasExact ? C.amber : C.muted }}>
            {hasExact ? `⭐ Si claves el marcador, guanys ×${CFG.EXACT_BONUS}` : "Buit si només apostes al guanyador"}
          </div>
        </div>
        <div style={{ ...sty.label, textAlign: "center" }}>3 · QUANTES BIRRES</div>
        <div style={{ background: C.card2, borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <button onClick={() => setAmount(Math.max(1, amount - 5))} style={{ width: 32, height: 32, borderRadius: 6, background: C.bg, border: `1px solid ${C.border}`, color: C.txt, cursor: "pointer", fontWeight: 700, fontSize: 18 }}>–</button>
            <span style={{ fontFamily: "var(--pff)", fontWeight: 900, fontSize: 28, color: C.gold, minWidth: 90, textAlign: "center" }}>{amount}🍺</span>
            <button onClick={() => setAmount(Math.min(maxBet, amount + 5))} style={{ width: 32, height: 32, borderRadius: 6, background: C.bg, border: `1px solid ${C.border}`, color: C.txt, cursor: "pointer", fontWeight: 700, fontSize: 18 }}>+</button>
          </div>
          <input type="range" min="1" max={Math.max(1, maxBet)} value={amount} onChange={e => setAmount(parseInt(e.target.value))} style={{ width: "100%", accentColor: C.gold }} />
        </div>
        {(jokerAvailable || joker) && (
          <button onClick={() => setJoker(!joker)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, background: joker ? "#0a1a2e" : C.card2, padding: "12px 14px", borderRadius: 10, marginBottom: 14, cursor: "pointer", border: `2px solid ${joker ? C.blue : C.border}`, textAlign: "left" }}>
            <div style={{ fontSize: 24 }}>🃏</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "var(--pff)", fontWeight: 800, fontSize: 15, color: joker ? C.blue : C.txt }}>JOKER SETMANAL ×2</div>
              <div style={{ fontSize: 11, color: C.muted }}>{joker ? "Activat: guanys ×2" : "Activa per duplicar guanys"}</div>
            </div>
            <div style={{ width: 38, height: 22, borderRadius: 11, background: joker ? C.blue : C.border, position: "relative", flexShrink: 0 }}>
              <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: joker ? 19 : 3, transition: "left 0.2s" }} />
            </div>
          </button>
        )}
        <div style={{ background: "linear-gradient(135deg,#0d2200,#0a1500)", border: `1px solid ${C.green}`, borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 10, color: C.muted, fontFamily: "var(--pff)", letterSpacing: 1 }}>SI ENCERTES GUANYES</div>
              <div style={{ fontFamily: "var(--pff)", fontWeight: 900, fontSize: 28, color: C.green, lineHeight: 1 }}>+{potentialWin - amount}🍺</div>
            </div>
            <div style={{ textAlign: "right", fontSize: 11, color: C.muted, fontFamily: "var(--pff)" }}>
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

// ─────────────────────────── 10. CLÀSSIC MODAL ────────────────────────────
function ClasicoModal({ clasicoMatches, jackpot, member, existing, onSubmit, onClose }) {
  const [pred, setPred] = useState(() => {
    const init = {};
    clasicoMatches.forEach(m => {
      const ex = existing?.predictions?.[m.id];
      init[m.id] = { home: ex?.home ?? "", away: ex?.away ?? "" };
    });
    return init;
  });
  const [err, setErr] = useState("");
  const canPay = existing || member.birras >= CFG.CLASICO_ENTRY;

  const submit = () => {
    if (!canPay) return setErr(`Necessites ${CFG.CLASICO_ENTRY}🍺`);
    const predictions = {};
    for (const m of clasicoMatches) {
      const p = pred[m.id];
      const h = parseInt(p?.home), a = parseInt(p?.away);
      if (isNaN(h) || isNaN(a) || h < 0 || a < 0) return setErr(`Marcador no vàlid a ${m.home} vs ${m.away}`);
      predictions[m.id] = { home: h, away: a };
    }
    onSubmit({ predictions });
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "flex-end", zIndex: 100 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#180510", borderRadius: "20px 20px 0 0", padding: 22, width: "100%", maxWidth: 480, margin: "0 auto", maxHeight: "94vh", overflowY: "auto", border: `1px solid ${C.rose}` }}>
        <div style={{ width: 40, height: 4, background: C.border, borderRadius: 2, margin: "0 auto 14px" }} />
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 36, marginBottom: 4 }}>🏆</div>
          <div style={{ fontFamily: "var(--pff)", fontWeight: 900, fontSize: 22, color: C.rose, letterSpacing: 2 }}>JUGAR JACKPOT</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>Encerta els 2 marcadors · t'ho emportes TOT</div>
        </div>
        <div style={{ background: "linear-gradient(135deg,#3a0820,#180510)", borderRadius: 14, padding: 16, marginBottom: 16, textAlign: "center", border: `1px solid ${C.rose}` }}>
          <div style={{ fontSize: 11, color: C.rose, fontFamily: "var(--pff)", letterSpacing: 2 }}>POT ACTUAL</div>
          <div style={{ fontFamily: "var(--pff)", fontWeight: 900, fontSize: 44, color: C.gold, lineHeight: 1 }}>{jackpot}🍺</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>={fmtEUR(jackpot * CFG.BIRRA_EUR)} · ≈ {eurToBeers(jackpot * CFG.BIRRA_EUR)} birres</div>
        </div>
        {clasicoMatches.map(m => (
          <div key={m.id} style={{ background: C.card, borderRadius: 12, padding: 14, marginBottom: 10, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 10, color: C.muted, fontFamily: "var(--pff)", letterSpacing: 1, marginBottom: 4 }}>{m.league}{m.date ? ` · ${fmtDate(m.date)}` : ""}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ flex: 1, fontFamily: "var(--pff)", fontWeight: 800, fontSize: 17, color: C.txt, textAlign: "right" }}>{m.home}</span>
              <span style={{ color: C.muted, fontFamily: "var(--pff)", fontSize: 13 }}>VS</span>
              <span style={{ flex: 1, fontFamily: "var(--pff)", fontWeight: 800, fontSize: 17, color: C.txt, textAlign: "left" }}>{m.away}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
              <input type="number" min="0" max="15" placeholder="?" value={pred[m.id]?.home ?? ""}
                onChange={e => setPred(p => ({ ...p, [m.id]: { ...p[m.id], home: e.target.value } }))}
                style={{ width: 60, height: 60, textAlign: "center", fontSize: 28, fontWeight: 800, fontFamily: "var(--pff)", background: C.bg, border: `2px solid ${pred[m.id]?.home !== "" ? C.rose : C.border}`, borderRadius: 10, color: C.rose, outline: "none" }} />
              <span style={{ fontSize: 24, color: C.border, fontWeight: 900, fontFamily: "var(--pff)" }}>–</span>
              <input type="number" min="0" max="15" placeholder="?" value={pred[m.id]?.away ?? ""}
                onChange={e => setPred(p => ({ ...p, [m.id]: { ...p[m.id], away: e.target.value } }))}
                style={{ width: 60, height: 60, textAlign: "center", fontSize: 28, fontWeight: 800, fontFamily: "var(--pff)", background: C.bg, border: `2px solid ${pred[m.id]?.away !== "" ? C.rose : C.border}`, borderRadius: 10, color: C.rose, outline: "none" }} />
            </div>
          </div>
        ))}
        <div style={{ background: C.card2, borderRadius: 10, padding: "10px 14px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, color: C.muted, fontFamily: "var(--pff)" }}>ENTRADA</div>
            <div style={{ fontFamily: "var(--pff)", fontWeight: 900, fontSize: 22, color: C.rose }}>{CFG.CLASICO_ENTRY}🍺</div>
          </div>
          <div style={{ textAlign: "right", fontSize: 11, color: C.muted }}>{existing ? "(ja vas pagar)" : `tens ${member.birras}🍺`}</div>
        </div>
        {err && <p style={{ color: C.red, fontSize: 12, textAlign: "center", marginBottom: 8 }}>⚠ {err}</p>}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ ...sty.btnGhost, flex: 1 }}>CANCEL·LAR</button>
          <button onClick={submit} style={{ ...sty.btnPrimary, flex: 2, background: C.rose, color: "#fff" }}>{existing ? "DESAR" : "A PEL POT!"} 🏆</button>
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
                  style={{ flex: 1, padding: 18, borderRadius: 12, background: picked === c ? C.amber : C.card2, color: picked === c ? "#0c0900" : C.txt, border: `2px solid ${picked === c ? C.gold : C.border}`, fontFamily: "var(--pff)", fontWeight: 900, fontSize: 22, letterSpacing: 2, cursor: canStart && !flipping ? "pointer" : "not-allowed", opacity: !canStart ? 0.4 : 1 }}>
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
                      style={{ flex: 1, padding: 18, borderRadius: 12, background: picked === c ? C.amber : C.card2, color: picked === c ? "#0c0900" : C.txt, border: `2px solid ${picked === c ? C.gold : C.border}`, fontFamily: "var(--pff)", fontWeight: 900, fontSize: 18, letterSpacing: 1, cursor: flipping ? "not-allowed" : "pointer" }}>
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

// ─────────────────────────── EUROPA MODAL ─────────────────────────────────
function EuropaModal({ matches, member, existing, onSubmit, onClose }) {
  const [pred, setPred] = useState(() => {
    const init = {};
    matches.forEach(m => { init[m.id] = existing?.predictions?.[m.id] || ""; });
    return init;
  });
  const [err, setErr] = useState("");
  const submit = () => {
    for (const m of matches) {
      if (!pred[m.id]) return setErr(`Falta predicció a ${m.home} vs ${m.away}`);
    }
    onSubmit({ predictions: pred });
  };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "flex-end", zIndex: 100 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#0a0518", borderRadius: "20px 20px 0 0", padding: 22, width: "100%", maxWidth: 480, margin: "0 auto", maxHeight: "94vh", overflowY: "auto", border: `1px solid ${C.purple}` }}>
        <div style={{ width: 40, height: 4, background: C.border, borderRadius: 2, margin: "0 auto 14px" }} />
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 36, marginBottom: 4 }}>🌍</div>
          <div style={{ fontFamily: "var(--pff)", fontWeight: 900, fontSize: 22, color: C.purple, letterSpacing: 2 }}>COMBO EUROPA</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>Gratis · Tria 1X2 dels {matches.length} partits</div>
          <div style={{ fontSize: 11, color: C.amber, marginTop: 4 }}>3 = +{CFG.EUROPA_BONUSES[3]}🍺 · 4 = +{CFG.EUROPA_BONUSES[4]}🍺 · 5 = +{CFG.EUROPA_BONUSES[5]}🍺</div>
        </div>
        {matches.map(m => (
          <div key={m.id} style={{ background: C.card, borderRadius: 12, padding: 12, marginBottom: 10, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 10, color: C.muted, fontFamily: "var(--pff)", letterSpacing: 1, marginBottom: 4 }}>{m.league}{m.date ? ` · ${fmtDate(m.date)}` : ""}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ flex: 1, fontFamily: "var(--pff)", fontWeight: 800, fontSize: 16, color: C.txt, textAlign: "right" }}>{m.home}</span>
              <span style={{ color: C.muted, fontSize: 12 }}>VS</span>
              <span style={{ flex: 1, fontFamily: "var(--pff)", fontWeight: 800, fontSize: 16, color: C.txt, textAlign: "left" }}>{m.away}</span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {[["H", "1"], ["D", "X"], ["A", "2"]].map(([k, lbl]) => {
                const sel = pred[m.id] === k;
                return (
                  <button key={k} onClick={() => setPred(p => ({ ...p, [m.id]: k }))} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: `2px solid ${sel ? C.purple : C.border}`, background: sel ? "#2a0a4e" : C.card2, color: sel ? C.purple : C.muted, fontFamily: "var(--pff)", fontWeight: 900, fontSize: 18, cursor: "pointer" }}>{lbl}</button>
                );
              })}
            </div>
            {m.result && (
              <div style={{ marginTop: 6, fontSize: 11, color: C.muted, textAlign: "center" }}>
                Resultat: <span style={{ color: C.gold, fontWeight: 700 }}>{m.result.home}–{m.result.away}</span>
                {pred[m.id] && (() => {
                  const wo = getOutcome(m.result.home, m.result.away);
                  const ok = pred[m.id] === wo;
                  return <span style={{ color: ok ? C.green : C.red, marginLeft: 6, fontWeight: 700 }}>{ok ? "✓" : "✗"}</span>;
                })()}
              </div>
            )}
          </div>
        ))}
        {err && <p style={{ color: C.red, fontSize: 12, textAlign: "center", marginBottom: 8 }}>⚠ {err}</p>}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ ...sty.btnGhost, flex: 1 }}>CANCEL·LAR</button>
          <button onClick={submit} style={{ ...sty.btnPrimary, flex: 2, background: C.purple, color: "#fff" }}>{existing ? "DESAR" : "ENVIAR PREDICCIÓ"} 🌍</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── WEEKLY SUMMARY MODAL ─────────────────────────
function WeeklySummaryModal({ data, onClose }) {
  const { currentGroup, leaderboard, weekTopGain, myWeekNet, myWeekBets, myWeekHits, shareText } = data;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "flex-end", zIndex: 100 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#050d18", borderRadius: "20px 20px 0 0", padding: 22, width: "100%", maxWidth: 480, margin: "0 auto", maxHeight: "94vh", overflowY: "auto", border: `1px solid ${C.blue}` }}>
        <div style={{ width: 40, height: 4, background: C.border, borderRadius: 2, margin: "0 auto 14px" }} />
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 40, marginBottom: 4 }}>📅</div>
          <div style={{ fontFamily: "var(--pff)", fontWeight: 900, fontSize: 22, color: C.blue, letterSpacing: 2 }}>RESUM SETMANAL</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Què va passar la última setmana</div>
        </div>
        <div style={{ background: C.card, borderRadius: 10, padding: 14, marginBottom: 12, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, color: C.muted, fontFamily: "var(--pff)", letterSpacing: 1, marginBottom: 6 }}>EL TEU BALANÇ</div>
          <div style={{ fontFamily: "var(--pff)", fontWeight: 900, fontSize: 32, color: myWeekNet >= 0 ? C.green : C.red }}>{myWeekNet >= 0 ? "+" : ""}{myWeekNet}🍺</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{myWeekBets.length} jugades · {myWeekHits} encerts</div>
        </div>
        {weekTopGain.length > 0 && weekTopGain[0].weekNet > 0 && (
          <div style={{ background: "linear-gradient(135deg,#2a1d00,#1a1200)", border: `1px solid ${C.gold}`, borderRadius: 10, padding: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: C.amber, fontFamily: "var(--pff)", letterSpacing: 1, marginBottom: 6 }}>👑 TOP DE LA SETMANA</div>
            {weekTopGain.slice(0, 3).map((u, i) => (
              <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 16 }}>{["🥇", "🥈", "🥉"][i]}</span>
                <span style={{ fontSize: 16 }}>{u.emoji}</span>
                <span style={{ flex: 1, color: C.txt, fontSize: 14 }}>{u.name}</span>
                <span style={{ color: u.weekNet >= 0 ? C.green : C.red, fontWeight: 700, fontFamily: "var(--pff)" }}>{u.weekNet >= 0 ? "+" : ""}{u.weekNet}🍺</span>
              </div>
            ))}
          </div>
        )}
        <WAButton text={shareText} label="📲 Compartir resum al WhatsApp" />
        <button onClick={onClose} style={{ ...sty.btnGhost, width: "100%", marginTop: 10 }}>TANCAR</button>
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
  const [nm, setNm] = useState({ home: "", away: "", date: "", league: "La Liga", cuotas: { H: "1.50", D: "3.00", A: "5.00" }, superBono: false, europa: false, clasico: false });
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
    if (!nm.home.trim() || !nm.away.trim() || !selGroupId) return;
    const cuotas = { H: parseFloat(nm.cuotas.H), D: parseFloat(nm.cuotas.D), A: parseFloat(nm.cuotas.A) };
    if ([cuotas.H, cuotas.D, cuotas.A].some(c => isNaN(c) || c < 1)) return alert("Quotes no vàlides");
    await handlers.addMatch({ ...nm, cuotas, groupId: selGroupId });
    setNm({ home: "", away: "", date: "", league: nm.league, cuotas: { H: "1.50", D: "3.00", A: "5.00" }, superBono: false, europa: false, clasico: false });
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
            <button key={id} onClick={() => setTab(id)} style={{ flexShrink: 0, padding: "9px 14px", borderRadius: 8, border: "none", background: tab === id ? C.gold : C.card2, color: tab === id ? "#0c0900" : C.muted, fontFamily: "var(--pff)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{l}</button>
          ))}
        </div>

        {tab === "matches" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input placeholder="Equip local" value={nm.home} onChange={e => setNm(p => ({ ...p, home: e.target.value }))} style={sty.input} />
            <input placeholder="Equip visitant" value={nm.away} onChange={e => setNm(p => ({ ...p, away: e.target.value }))} style={sty.input} />
            <select value={nm.league} onChange={e => setNm(p => ({ ...p, league: e.target.value }))} style={sty.input}>
              {LEAGUES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <input type="datetime-local" value={nm.date} onChange={e => setNm(p => ({ ...p, date: e.target.value }))} style={sty.input} />
            <div style={{ background: C.card2, borderRadius: 10, padding: 12 }}>
              <div style={{ ...sty.label, marginBottom: 8 }}>QUOTES (1X2)</div>
              <div style={{ display: "flex", gap: 8 }}>
                {[["H", "Local"], ["D", "Empat"], ["A", "Visit."]].map(([k, lbl]) => (
                  <div key={k} style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>{lbl}</div>
                    <input type="number" step="0.10" min="1" value={nm.cuotas[k]} onChange={e => setNm(p => ({ ...p, cuotas: { ...p.cuotas, [k]: e.target.value } }))} style={{ ...sty.input, textAlign: "center", padding: "8px 4px", color: C.gold, fontWeight: 700, fontSize: 16 }} />
                  </div>
                ))}
              </div>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 10, background: C.card2, padding: 12, borderRadius: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={nm.superBono} onChange={e => setNm(p => ({ ...p, superBono: e.target.checked }))} style={{ accentColor: C.gold, width: 18, height: 18 }} />
              <div><div style={{ fontFamily: "var(--pff)", fontWeight: 700, color: C.txt, fontSize: 14 }}>⚡ Súper Bonus</div><div style={{ fontSize: 10, color: C.muted }}>Quotes ×{CFG.SUPER_MULT}</div></div>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 10, background: "#1a0a2e", padding: 12, borderRadius: 8, cursor: "pointer", border: `1px solid ${C.purple}` }}>
              <input type="checkbox" checked={nm.europa} onChange={e => setNm(p => ({ ...p, europa: e.target.checked }))} style={{ accentColor: C.purple, width: 18, height: 18 }} />
              <div><div style={{ fontFamily: "var(--pff)", fontWeight: 700, color: C.purple, fontSize: 14 }}>🌍 Combo Europa (gratis)</div><div style={{ fontSize: 10, color: C.muted }}>Marca {CFG.EUROPA_REQUIRED} partits/setmana. Els jugadors prediuen 1X2 sense apostar.</div></div>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 10, background: "#1a0510", padding: 12, borderRadius: 8, cursor: "pointer", border: `1px solid ${C.rose}` }}>
              <input type="checkbox" checked={nm.clasico} onChange={e => setNm(p => ({ ...p, clasico: e.target.checked }))} style={{ accentColor: C.rose, width: 18, height: 18 }} />
              <div><div style={{ fontFamily: "var(--pff)", fontWeight: 700, color: C.rose, fontSize: 14 }}>🏆 Jackpot Clàssic</div><div style={{ fontSize: 10, color: C.muted }}>Marca {CFG.CLASICO_REQUIRED} per setmana</div></div>
            </label>
            <button onClick={submitMatch} style={sty.btnPrimary}>➕ AFEGIR PARTIT</button>
          </div>
        )}

        {tab === "results" && (
          <div>
            {pending.length === 0 ? <p style={{ color: C.muted, textAlign: "center", padding: 24 }}>Cap pendent ✅</p> :
              pending.map(m => (
                <div key={m.id} style={{ ...sty.card, marginBottom: 10 }}>
                  <div style={{ display: "flex", gap: 4, marginBottom: 6, flexWrap: "wrap" }}>
                    {m.clasico && <ClasicoChip />}{m.europa && <EuropaChip />}{m.superBono && <SuperChip />}
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
            <button onClick={() => { if (confirm("Tancar mes?")) handlers.closeMonth(selGroupId); }} style={{ ...sty.btnPrimary, width: "100%", background: C.green, color: "#fff", marginBottom: 8 }}>🏆 TANCAR MES</button>
            <button onClick={() => { if (confirm("Doblar el pot?")) handlers.doubleMonth(selGroupId); }} style={{ ...sty.btnPrimary, width: "100%", background: C.blue, color: "#fff" }}>🎲 DOBLAR</button>
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
  const [activeGroupId, setActiveGroupId] = useState(null);

  const [tab, setTab] = useState("matches");
  const [betMatch, setBetMatch] = useState(null);
  const [showClasico, setShowClasico] = useState(false);
  const [showCoin, setShowCoin] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showEuropa, setShowEuropa] = useState(false);
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);
  const [showEmojiChange, setShowEmojiChange] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [toast, setToast] = useState(null);
  const [chatInput, setChatInput] = useState("");
  const [lastSeen, setLastSeen] = useState({ matches: 0, jackpot: 0, ranking: 0, chat: 0, mine: 0, stats: 0 });
  const [tick, setTick] = useState(0);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const link = document.createElement("link"); link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Nunito:wght@400;600;700;800&display=swap";
    document.head.appendChild(link);
    const s = document.createElement("style");
    s.textContent = `:root{--pff:'Barlow Condensed',sans-serif}*{box-sizing:border-box;margin:0;padding:0}body{background:${C.bg};font-family:'Nunito',sans-serif;color:${C.txt};-webkit-tap-highlight-color:transparent}input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes spin{to{transform:rotate(360deg)}}@keyframes foam{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}}button:active{transform:scale(0.97)}`;
    document.head.appendChild(s);
    const load = async () => {
      const [a, g, mb, m, b, cl, eu, ch, cf] = await Promise.all([
        dbGet(KEYS.accounts), dbGet(KEYS.groups), dbGet(KEYS.members),
        dbGet(KEYS.matches), dbGet(KEYS.bets), dbGet(KEYS.clasico), dbGet(KEYS.europa), dbGet(KEYS.chats), dbGet(KEYS.coinflips),
      ]);
      setAccounts(a || []); setGroups(g || []); setMembers(mb || []);
      setMatches(m || []); setBets(b || []); setClasico(cl || {}); setEuropa(eu || {}); setChats(ch || {}); setCoinflips(cf || {});
      setLoaded(true);
    };
    load();
    const t1 = setInterval(load, 8000);
    const t2 = setInterval(() => setTick(t => t + 1), 30000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, []);

  useEffect(() => { setLastSeen(prev => ({ ...prev, [tab]: Date.now() })); }, [tab, activeGroupId]);
  useEffect(() => { if (tab === "chat" && chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" }); }, [tab, chats, activeGroupId]);

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

  const sendChatMessage = async (text, system = false) => {
    if (!text || !activeGroupId) return;
    const msg = system
      ? { id: uid(), system: true, text, ts: Date.now() }
      : { id: uid(), accountId: account.id, name: account.name, emoji: account.emoji || "🍺", text, ts: Date.now() };
    const groupMsgs = (chats[activeGroupId] || []).slice(-CFG.CHAT_LIMIT + 1);
    const updatedChats = { ...chats, [activeGroupId]: [...groupMsgs, msg] };
    setChats(updatedChats); await dbSet(KEYS.chats, updatedChats);
  };
  const sendChat = async () => { const text = chatInput.trim(); if (!text) return; await sendChatMessage(text, false); setChatInput(""); };

  const submitClasico = async ({ predictions }) => {
    const member = members.find(m => m.accountId === account.id && m.groupId === activeGroupId);
    const wk = currentClasicoWeek; if (!wk) return;
    if (currentClasicoMatches.some(m => matchStarted(m))) { setShowClasico(false); showToast("Algun partit ja ha començat", "error"); return; }
    const groupClasico = clasico[activeGroupId] || { jackpot: 0, entries: {}, settled: {} };
    const weekEntries = groupClasico.entries[wk] || [];
    const existing = weekEntries.find(e => e.memberId === member.id);
    if (!existing && member.birras < CFG.CLASICO_ENTRY) return;
    let updatedEntries, cost = 0;
    if (existing) updatedEntries = weekEntries.map(e => e.memberId === member.id ? { ...e, predictions } : e);
    else { updatedEntries = [...weekEntries, { memberId: member.id, predictions, createdAt: Date.now() }]; cost = CFG.CLASICO_ENTRY; }
    const updatedClasico = { ...clasico, [activeGroupId]: { ...groupClasico, jackpot: groupClasico.jackpot + cost, entries: { ...groupClasico.entries, [wk]: updatedEntries }, currentWeek: wk } };
    const updatedMember = { ...member, birras: member.birras - cost };
    const updatedMembers = members.map(m => m.id === member.id ? updatedMember : m);
    setClasico(updatedClasico); setMembers(updatedMembers);
    await dbSet(KEYS.clasico, updatedClasico); await dbSet(KEYS.members, updatedMembers);
    setShowClasico(false);
    showToast(existing ? "Predicció actualitzada 🏆" : `Endins! Pot: ${updatedClasico[activeGroupId].jackpot}🍺`, "success");
  };

  const submitEuropa = async ({ predictions }) => {
    const member = members.find(m => m.accountId === account.id && m.groupId === activeGroupId);
    const wk = currentEuropaWeek; if (!wk) return;
    if (currentEuropaMatches.some(m => matchStarted(m))) {
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
      await sendChatMessage(`🪙 ${account.emoji} ${account.name} s'ha plantat al Cara o Creu amb ${won}🍺! Crack!`, true);
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
    const ts = new Date(data.date).getTime() || Date.now();
    const m = {
      id: uid(), groupId: data.groupId,
      home: data.home.trim(), away: data.away.trim(), date: data.date,
      league: data.league, cuotas: data.cuotas,
      superBono: !!data.superBono, europa: !!data.europa, clasico: !!data.clasico,
      europaWeek: data.europa ? weekKey(ts) : null,
      clasicoWeek: data.clasico ? weekKey(ts) : null,
      status: "open", result: null, settledAt: null,
    };
    const updated = [...matches, m];
    setMatches(updated); await dbSet(KEYS.matches, updated);
    showToast("Partit afegit ⚽", "success");
  };

  const adminSetResult = async (matchId, result) => {
    const match = matches.find(m => m.id === matchId);
    const updatedMatch = { ...match, status: "finished", result, settledAt: Date.now() };
    const updatedMatches = matches.map(m => m.id === matchId ? updatedMatch : m);
    let newBets = settleBets(bets, updatedMatch);
    let updatedMembers = [...members];
    const matchBets = newBets.filter(b => b.matchId === matchId);
    for (const b of matchBets) {
      if (b.payout > 0) updatedMembers = updatedMembers.map(m => m.id === b.memberId ? { ...m, birras: m.birras + b.payout } : m);
    }
    // Ratxa
    const winOutcome = getOutcome(result.home, result.away);
    const memberRes = new Map();
    for (const b of matchBets) memberRes.set(b.memberId, b.outcome === winOutcome ? "win" : "loss");
    for (const [memberId, res] of memberRes) {
      updatedMembers = updatedMembers.map(m => {
        if (m.id !== memberId) return m;
        const newR = res === "win" ? m.racha + 1 : 0;
        if (newR >= CFG.RACHA_N) return { ...m, racha: 0, birras: m.birras + CFG.RACHA_BONUS };
        return { ...m, racha: newR };
      });
    }
    // Profetes
    const winScore = scoreKey(result.home, result.away);
    const prophets = matchBets.filter(b => b.exactScore === winScore && b.payout > 0);
    let updatedChats = chats;
    if (prophets.length > 0 && match.groupId) {
      const groupMsgs = (chats[match.groupId] || []).slice(-CFG.CHAT_LIMIT + prophets.length);
      const newMsgs = prophets.map(p => {
        const mb = members.find(mm => mm.id === p.memberId);
        const acc = accounts.find(a => a.id === mb?.accountId);
        return { id: uid(), system: true, text: `🔮 ${acc?.emoji || "🍺"} ${acc?.name || "?"} ha clavat el ${winScore.replace("-", "–")} a ${match.home} vs ${match.away} i s'emporta ${p.payout}🍺! Quin crack!`, ts: Date.now() };
      });
      updatedChats = { ...chats, [match.groupId]: [...groupMsgs, ...newMsgs] };
    }
    // Combo Europa (gratis, basat en europaEntries del jugador)
    let updatedEuropa = europa;
    if (updatedMatch.europa && updatedMatch.europaWeek) {
      const wk = updatedMatch.europaWeek; const gid = updatedMatch.groupId;
      const wkMatches = updatedMatches.filter(m => m.europa && m.europaWeek === wk && m.groupId === gid);
      const groupEuropa = europa[gid] || { entries: {}, settled: {} };
      const alreadySettled = groupEuropa.settled?.[wk];
      if (!alreadySettled && wkMatches.length >= CFG.EUROPA_REQUIRED && wkMatches.every(m => m.status === "finished")) {
        const entries = groupEuropa.entries?.[wk] || [];
        const winnersInfo = [];
        for (const e of entries) {
          let hits = 0;
          for (const m of wkMatches) {
            const winOutcome = getOutcome(m.result.home, m.result.away);
            const pred = e.predictions[m.id];
            if (pred && pred === winOutcome) hits++;
          }
          if (hits >= 3) {
            const bonus = CFG.EUROPA_BONUSES[hits] || 0;
            if (bonus > 0) {
              updatedMembers = updatedMembers.map(m => m.id === e.memberId ? { ...m, birras: m.birras + bonus } : m);
              winnersInfo.push({ memberId: e.memberId, hits, bonus });
            }
          }
        }
        updatedEuropa = { ...europa, [gid]: { ...groupEuropa, settled: { ...(groupEuropa.settled || {}), [wk]: { winners: winnersInfo, date: Date.now() } } } };
        if (winnersInfo.length > 0) {
          const winNames = winnersInfo.map(w => { const mb = members.find(mm => mm.id === w.memberId); const acc = accounts.find(a => a.id === mb?.accountId); return `${acc?.emoji || "🍺"} ${acc?.name || "?"} (+${w.bonus}🍺)`; }).join(", ");
          const groupMsgs2 = (updatedChats[gid] || []).slice(-CFG.CHAT_LIMIT + 1);
          const sysMsg = { id: uid(), system: true, text: `🌍 COMBO EUROPA! ${winNames}`, ts: Date.now() };
          updatedChats = { ...updatedChats, [gid]: [...groupMsgs2, sysMsg] };
        }
      }
    }
    // Clàssic
    let updatedClasico = clasico;
    let clasicoToast = null;
    if (updatedMatch.clasico && updatedMatch.clasicoWeek) {
      const wk = updatedMatch.clasicoWeek; const gid = updatedMatch.groupId;
      const wkClasicoMatches = updatedMatches.filter(m => m.clasico && m.clasicoWeek === wk && m.groupId === gid);
      const groupClasico = clasico[gid];
      const alreadySettled = groupClasico?.settled?.[wk];
      if (!alreadySettled && wkClasicoMatches.length >= CFG.CLASICO_REQUIRED && wkClasicoMatches.every(m => m.status === "finished")) {
        const entries = groupClasico?.entries?.[wk] || [];
        const winners = entries.filter(e => wkClasicoMatches.every(m => {
          const p = e.predictions[m.id];
          return p && p.home === m.result.home && p.away === m.result.away;
        }));
        const jackpot = groupClasico?.jackpot || 0;
        let newJackpot = jackpot;
        if (winners.length > 0) {
          const share = Math.floor(jackpot / winners.length);
          for (const w of winners) updatedMembers = updatedMembers.map(m => m.id === w.memberId ? { ...m, birras: m.birras + share } : m);
          newJackpot = 0;
          clasicoToast = `🏆 JACKPOT: ${winners.length} guanyador(s) +${share}🍺`;
          const winnerNames = winners.map(w => { const mb = members.find(mm => mm.id === w.memberId); const acc = accounts.find(a => a.id === mb?.accountId); return `${acc?.emoji || "🍺"} ${acc?.name || "?"}`; }).join(", ");
          const groupMsgs2 = (updatedChats[gid] || []).slice(-CFG.CHAT_LIMIT + 1);
          const sysMsg = { id: uid(), system: true, text: `🏆 JACKPOT! ${winnerNames} ${winners.length > 1 ? "guanyen" : "guanya"} ${share}🍺! Increïble!`, ts: Date.now() };
          updatedChats = { ...updatedChats, [gid]: [...groupMsgs2, sysMsg] };
        } else {
          clasicoToast = `🏆 Ningú no ha encertat. Pot acumula ${jackpot}🍺`;
          const groupMsgs2 = (updatedChats[gid] || []).slice(-CFG.CHAT_LIMIT + 1);
          const sysMsg = { id: uid(), system: true, text: `🏆 Ningú no ha encertat el Jackpot. Acumula ${jackpot}🍺 per la setmana que ve!`, ts: Date.now() };
          updatedChats = { ...updatedChats, [gid]: [...groupMsgs2, sysMsg] };
        }
        updatedClasico = { ...clasico, [gid]: { ...(groupClasico || {}), jackpot: newJackpot, entries: groupClasico?.entries || {}, settled: { ...(groupClasico?.settled || {}), [wk]: { winners: winners.map(w => w.memberId), share: winners.length > 0 ? Math.floor(jackpot / winners.length) : 0, date: Date.now() } } } };
      }
    }
    setMatches(updatedMatches); setBets(newBets); setMembers(updatedMembers); setClasico(updatedClasico); setEuropa(updatedEuropa); setChats(updatedChats);
    await dbSet(KEYS.matches, updatedMatches);
    await dbSet(KEYS.bets, newBets);
    await dbSet(KEYS.members, updatedMembers);
    await dbSet(KEYS.clasico, updatedClasico);
    await dbSet(KEYS.europa, updatedEuropa);
    await dbSet(KEYS.chats, updatedChats);
    showToast("Resultat desat 💰", "success");
    if (clasicoToast) setTimeout(() => showToast(clasicoToast, "success"), 1200);
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

  // ── DERIVED ──────────────────────────────────────────────────────────────
  const member = (account && activeGroupId) ? members.find(m => m.accountId === account.id && m.groupId === activeGroupId) : null;
  const currentGroup = activeGroupId ? groups.find(g => g.id === activeGroupId) : null;
  const groupMatches = currentGroup ? matches.filter(m => m.groupId === currentGroup.id) : [];
  const groupMembers = currentGroup ? members.filter(m => m.groupId === currentGroup.id) : [];
  const myBets = member ? bets.filter(b => b.memberId === member.id) : [];
  const normalMatches = groupMatches.filter(m => !m.clasico && !m.europa);
  const openMatches = normalMatches.filter(m => m.status !== "finished").sort((a, b) => new Date(a.date) - new Date(b.date));
  const finishedMatches = normalMatches.filter(m => m.status === "finished").sort((a, b) => new Date(b.date) - new Date(a.date));
  // Agrupar propers per lliga
  const openByLeague = openMatches.reduce((acc, m) => { (acc[m.league] = acc[m.league] || []).push(m); return acc; }, {});
  const leaguesOrdered = Object.keys(openByLeague).sort((a, b) => {
    const idxA = LEAGUES.indexOf(a), idxB = LEAGUES.indexOf(b);
    return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
  });

  const groupClasico = currentGroup ? (clasico[currentGroup.id] || { jackpot: 0, entries: {}, settled: {} }) : null;
  const allClasicoOpenMatches = groupMatches.filter(m => m.clasico && m.status !== "finished");
  const currentClasicoWeek = allClasicoOpenMatches.length > 0 ? [...new Set(allClasicoOpenMatches.map(m => m.clasicoWeek))].sort().pop() : null;
  const currentClasicoMatches = currentClasicoWeek ? groupMatches.filter(m => m.clasico && m.clasicoWeek === currentClasicoWeek) : [];
  const myClasicoEntry = currentClasicoWeek && member ? (groupClasico?.entries?.[currentClasicoWeek] || []).find(e => e.memberId === member.id) : null;
  const clasicoEntries = currentClasicoWeek ? (groupClasico?.entries?.[currentClasicoWeek] || []) : [];
  const clasicoActive = currentClasicoMatches.length >= CFG.CLASICO_REQUIRED && !currentClasicoMatches.some(m => matchStarted(m));
  const clasicoHistory = groupClasico?.settled ? Object.entries(groupClasico.settled).sort((a, b) => b[1].date - a[1].date) : [];

  // Europa
  const groupEuropa = currentGroup ? (europa[currentGroup.id] || { entries: {}, settled: {} }) : null;
  const allEuropaOpenMatches = groupMatches.filter(m => m.europa && m.status !== "finished");
  const currentEuropaWeek = allEuropaOpenMatches.length > 0 ? [...new Set(allEuropaOpenMatches.map(m => m.europaWeek))].sort().pop() : null;
  const currentEuropaMatches = currentEuropaWeek ? groupMatches.filter(m => m.europa && m.europaWeek === currentEuropaWeek) : [];
  const myEuropaEntry = currentEuropaWeek && member ? (groupEuropa?.entries?.[currentEuropaWeek] || []).find(e => e.memberId === member.id) : null;
  const europaActive = currentEuropaMatches.length >= CFG.EUROPA_REQUIRED && !currentEuropaMatches.some(m => matchStarted(m));
  const europaHistory = groupEuropa?.settled ? Object.entries(groupEuropa.settled).sort((a, b) => b[1].date - a[1].date) : [];

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

  const groupChat = currentGroup ? (chats[currentGroup.id] || []) : [];
  const hasNewChat = groupChat.length > 0 && groupChat[groupChat.length - 1].ts > lastSeen.chat && groupChat[groupChat.length - 1].accountId !== account?.id;

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
    for (const [_, info] of clasicoHistory) if (info.winners.includes(u.id)) count++;
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
    let txt = `🏆 *Classificació BIRRAPORRA FC*\n${currentGroup.name}\n\n`;
    leaderboard.forEach((u, i) => {
      const medal = ["🥇", "🥈", "🥉"][i] || `${i + 1}.`;
      txt += `${medal} ${u.emoji} ${u.name} — ${u.birras}🍺 (${u.netGain >= 0 ? "+" : ""}${u.netGain})\n`;
    });
    txt += `\nPot: ${fmtEUR(currentGroup.bote_EUR)} 🍺`;
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
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
      <div style={{ fontSize: 60, animation: "foam 1.5s ease-in-out infinite" }}>🍺</div>
      <div style={{ width: 30, height: 30, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.gold}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <p style={{ color: C.muted, fontFamily: "var(--pff)", letterSpacing: 2 }}>SERVINT LES BIRRES...</p>
    </div>
  );

  if (!account) return (<>
    <LoginScreen accounts={accounts} onLogin={doLogin} onSignup={doSignup} onAdmin={() => setShowAdminLogin(true)} />
    {showAdminLogin && <AdminPassModal onSubmit={tryAdmin} onClose={() => setShowAdminLogin(false)} />}
  </>);

  if (!activeGroupId) return (<>
    <GroupScreen account={account} groups={groups} members={members} onJoin={doJoin} onCreate={doCreate} onLogout={() => { setAccount(null); setActiveGroupId(null); }} />
    {showAdminLogin && <AdminPassModal onSubmit={tryAdmin} onClose={() => setShowAdminLogin(false)} />}
  </>);

  if (showRules && !member?.seenWelcome) return <RulesScreen firstTime onClose={markSeenWelcome} />;
  if (!member) { setActiveGroupId(null); return null; }

  const headerStat = (label, value, color = C.gold) => (
    <div style={{ flex: 1, textAlign: "center" }}>
      <div style={{ fontFamily: "var(--pff)", fontWeight: 900, fontSize: 22, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, color: C.muted, fontFamily: "var(--pff)", letterSpacing: 1, marginTop: 3 }}>{label}</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.txt, maxWidth: 480, margin: "0 auto", paddingBottom: 80 }}>
      {/* HEADER */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 28 }}>🍺</span>
          <div>
            <div style={{ fontFamily: "var(--pff)", fontWeight: 900, fontSize: 18, color: C.gold, lineHeight: 1, letterSpacing: 1 }}>BIRRAPORRA FC</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{currentGroup?.name} · {account.emoji || "🍺"} {account.name}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {adminMode && <button onClick={() => setShowAdmin(true)} style={{ background: C.amber, color: "#0c0900", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontFamily: "var(--pff)", fontWeight: 700, cursor: "pointer" }}>ADMIN</button>}
          <div style={{ background: C.card2, padding: "5px 12px", borderRadius: 20, display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontFamily: "var(--pff)", fontWeight: 900, fontSize: 17, color: member.birras > 0 ? C.gold : C.red }}>{member.birras}</span>
            <span style={{ fontSize: 14 }}>🍺</span>
          </div>
        </div>
      </div>

      <div style={{ padding: tab === "chat" ? 0 : 14, animation: "fadeIn 0.3s ease" }}>

        {/* ─── PARTITS ─── */}
        {tab === "matches" && (
          <div>
            <div style={{ background: C.card, borderRadius: 12, padding: "10px 14px", marginBottom: 14, display: "flex", border: `1px solid ${C.border}` }}>
              {headerStat("RATXA 🔥", `${member.racha}/${CFG.RACHA_N}`, member.racha > 0 ? C.amber : C.muted)}
              <div style={{ width: 1, background: C.border }} />
              {headerStat("POSICIÓ", myRank ? `${myRank}r` : "—")}
              <div style={{ width: 1, background: C.border }} />
              {headerStat("JOKER 🃏", jokerAvailable ? "DISP." : "USAT", jokerAvailable ? C.blue : C.muted)}
            </div>

            {member.birras < 1 && (
              <div style={{ background: "#200000", borderRadius: 12, padding: 14, marginBottom: 14, border: `1px solid ${C.red}`, textAlign: "center" }}>
                <div style={{ fontFamily: "var(--pff)", fontWeight: 800, fontSize: 18, color: C.red }}>⚠ SENSE BIRRES</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Paga {fmtEUR(CFG.ENTRY_EUR)} a l'admin per recarregar.</div>
              </div>
            )}

            {normalMatches.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 20px", color: C.muted }}>
                <div style={{ fontSize: 56, marginBottom: 12 }}>🏟️</div>
                <p style={{ fontFamily: "var(--pff)", fontWeight: 800, fontSize: 22 }}>SENSE PARTITS</p>
              </div>
            )}

            {leaguesOrdered.length > 0 && (<>
              <div style={sty.sectionH}>PROPERS</div>
              {leaguesOrdered.map(lg => (
                <div key={lg} style={{ marginBottom: 18 }}>
                  <div style={{ fontFamily: "var(--pff)", fontWeight: 800, fontSize: 12, color: C.amber, letterSpacing: 2, marginBottom: 8, paddingLeft: 4, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 18, height: 2, background: C.amber, opacity: 0.6 }} />
                    {lg.toUpperCase()}
                    <span style={{ flex: 1, height: 1, background: C.border }} />
                    <span style={{ color: C.muted, fontSize: 11 }}>{openByLeague[lg].length}</span>
                  </div>
                  {openByLeague[lg].map(m => <MatchCard key={m.id} match={m} userBet={myBets.find(b => b.matchId === m.id)} onBet={setBetMatch} member={member} />)}
                </div>
              ))}
            </>)}

            {finishedMatches.length > 0 && (<>
              <div style={{ ...sty.sectionH, color: C.muted, marginTop: 18 }}>FINALITZATS</div>
              {finishedMatches.slice(0, 10).map(m => <MatchCard key={m.id} match={m} userBet={myBets.find(b => b.matchId === m.id)} onBet={null} member={member} />)}
            </>)}
          </div>
        )}

        {/* ─── JACKPOT ─── */}
        {tab === "jackpot" && (
          <div>
            <div style={{ background: "linear-gradient(135deg, #4a0a28, #180510 70%)", borderRadius: 16, padding: 22, marginBottom: 16, textAlign: "center", border: `2px solid ${C.rose}` }}>
              <div style={{ fontSize: 11, color: C.rose, fontFamily: "var(--pff)", letterSpacing: 3, marginBottom: 4 }}>🏆 JACKPOT CLÀSSIC</div>
              <div style={{ fontSize: 10, color: C.muted, marginBottom: 14 }}>Mini-joc setmanal · Encerta 2 marcadors</div>
              <div style={{ fontFamily: "var(--pff)", fontWeight: 900, fontSize: 60, color: C.gold, lineHeight: 1, animation: "pulse 3s ease-in-out infinite" }}>{groupClasico?.jackpot || 0}🍺</div>
              <div style={{ fontSize: 13, color: C.amber, marginTop: 8 }}>= {fmtEUR((groupClasico?.jackpot || 0) * CFG.BIRRA_EUR)} · {eurToBeers((groupClasico?.jackpot || 0) * CFG.BIRRA_EUR)} birres</div>
            </div>

            {currentClasicoMatches.length > 0 ? (
              <>
                <div style={sty.sectionH}>PARTITS D'AQUESTA SETMANA</div>
                {currentClasicoMatches.map(m => {
                  const myPred = myClasicoEntry?.predictions?.[m.id];
                  return (
                    <div key={m.id} style={{ background: "#180510", borderRadius: 12, padding: 14, marginBottom: 10, border: `1px solid ${C.rose}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontSize: 11, color: C.muted, fontFamily: "var(--pff)", letterSpacing: 1 }}>{m.league}{m.date ? ` · ${fmtDate(m.date)}` : ""}</span>
                        {matchStarted(m) && !m.result && <LockedChip />}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{ flex: 1, fontFamily: "var(--pff)", fontWeight: 800, fontSize: 18, color: C.txt, textAlign: "right" }}>{m.home}</span>
                        <div style={{ minWidth: 60, textAlign: "center" }}>
                          {m.result ? <span style={{ fontFamily: "var(--pff)", fontWeight: 900, fontSize: 22, color: C.gold }}>{m.result.home}–{m.result.away}</span> : <span style={{ fontFamily: "var(--pff)", fontWeight: 700, fontSize: 16, color: C.muted }}>VS</span>}
                        </div>
                        <span style={{ flex: 1, fontFamily: "var(--pff)", fontWeight: 800, fontSize: 18, color: C.txt, textAlign: "left" }}>{m.away}</span>
                      </div>
                      {myPred && (
                        <div style={{ background: C.card2, borderRadius: 6, padding: "6px 10px", textAlign: "center", fontSize: 12 }}>
                          <span style={{ color: C.muted }}>La teva predicció: </span>
                          <span style={{ color: C.rose, fontFamily: "var(--pff)", fontWeight: 800, fontSize: 16 }}>{myPred.home}–{myPred.away}</span>
                          {m.result && <span style={{ marginLeft: 6, color: (myPred.home === m.result.home && myPred.away === m.result.away) ? C.green : C.red, fontWeight: 700 }}>{(myPred.home === m.result.home && myPred.away === m.result.away) ? "✓" : "✗"}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
                {clasicoActive && (
                  <button onClick={() => setShowClasico(true)} disabled={!myClasicoEntry && member.birras < CFG.CLASICO_ENTRY}
                    style={{ ...sty.btnPrimary, width: "100%", background: C.rose, color: "#fff", marginTop: 6, marginBottom: 16, padding: "16px", fontSize: 18, opacity: (!myClasicoEntry && member.birras < CFG.CLASICO_ENTRY) ? 0.4 : 1 }}>
                    {myClasicoEntry ? "✏️ EDITAR PREDICCIÓ" : `🏆 JUGAR (${CFG.CLASICO_ENTRY}🍺)`}
                  </button>
                )}
                {clasicoEntries.length > 0 && (
                  <>
                    <div style={{ ...sty.label, marginBottom: 8 }}>JA JUGUEN ({clasicoEntries.length})</div>
                    <div style={{ background: C.card, borderRadius: 10, padding: 10, marginBottom: 16, border: `1px solid ${C.border}`, display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {clasicoEntries.map(e => {
                        const info = memberInfo(e.memberId);
                        return (
                          <div key={e.memberId} style={{ display: "flex", alignItems: "center", gap: 6, background: C.card2, padding: "4px 10px", borderRadius: 16, fontSize: 12 }}>
                            <span style={{ fontSize: 16 }}>{info.emoji || "🍺"}</span>
                            <span style={{ color: C.txt }}>{info.name || "?"}{e.memberId === member.id ? " (tu)" : ""}</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div style={{ ...sty.card, textAlign: "center", padding: 40, marginBottom: 16 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>⏳</div>
                <div style={{ fontFamily: "var(--pff)", fontWeight: 800, fontSize: 20, color: C.txt }}>SENSE JACKPOT ACTIU</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>L'admin marcarà els partits del Clàssic. El pot s'acumula.</div>
              </div>
            )}

            {clasicoHistory.length > 0 && (
              <>
                <div style={sty.sectionH}>HISTÒRIC JACKPOT</div>
                {clasicoHistory.slice(0, 10).map(([wk, info]) => (
                  <div key={wk} style={{ background: C.card, borderRadius: 10, padding: 12, marginBottom: 6, border: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: C.muted, fontFamily: "var(--pff)", letterSpacing: 1 }}>SETMANA {wk}</div>
                      <div style={{ fontSize: 13, color: C.txt, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {info.winners.length === 0 ? <span style={{ color: C.muted }}>Sense guanyador · acumulat</span> :
                          <span><span style={{ color: C.rose, fontWeight: 700 }}>{info.winners.length} guanyador(s)</span> · {info.winners.map(mid => { const i = memberInfo(mid); return `${i.emoji || "🍺"} ${i.name || "?"}`; }).join(", ")}</span>}
                      </div>
                    </div>
                    {info.share > 0 && <span style={{ fontFamily: "var(--pff)", fontWeight: 900, fontSize: 18, color: C.gold, flexShrink: 0 }}>+{info.share}🍺</span>}
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ─── RANKING ─── */}
        {tab === "ranking" && (
          <div>
            {currentGroup && (
              <div style={{ background: "linear-gradient(135deg,#3a2800 0%, #1a1200 100%)", borderRadius: 14, padding: 14, marginBottom: 14, border: `1px solid ${C.amber}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 10, color: C.amber, fontFamily: "var(--pff)", letterSpacing: 2, marginBottom: 2 }}>POT DEL GRUP</div>
                  <div style={{ fontFamily: "var(--pff)", fontWeight: 900, fontSize: 26, color: C.gold, lineHeight: 1 }}>{fmtEUR(currentGroup.bote_EUR)}</div>
                  <div style={{ fontSize: 11, color: C.amber, marginTop: 2 }}>🍺 {eurToBeers(currentGroup.bote_EUR)} birres</div>
                </div>
                <div style={{ fontSize: 36 }}>🏆</div>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={sty.sectionH}>CLASSIFICACIÓ DEL MES</div>
              <WAButton text={shareLeaderboardText()} label="📲 Compartir" small />
            </div>
            {leaderboard.map((u, i) => {
              const isMe = u.id === member.id;
              const willWin = i < CFG.PRIZES.length && currentGroup && currentGroup.bote_EUR > 0;
              const prizeEUR = willWin ? currentGroup.bote_EUR * CFG.PRIZES[i] : 0;
              return (
                <div key={u.id} style={{ background: isMe ? "linear-gradient(135deg,#2a1d00,#1a1200)" : C.card, border: `1px solid ${isMe ? C.gold : C.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
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
        {tab === "stats" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={sty.sectionH}>📊 STATS DEL GRUP</div>
              <WAButton text={shareStatsText()} label="📲 Compartir" small />
            </div>

            {topTeam && (
              <div style={{ ...sty.card, marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: C.muted, fontFamily: "var(--pff)", letterSpacing: 1, marginBottom: 4 }}>⚽ EQUIP MÉS APOSTAT</div>
                <div style={{ fontFamily: "var(--pff)", fontWeight: 800, fontSize: 22, color: C.gold }}>{topTeam[0]}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{topTeam[1]}🍺 apostades en total</div>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <div style={{ flex: 1, ...sty.card, textAlign: "center" }}>
                <div style={{ fontSize: 11, color: C.muted, fontFamily: "var(--pff)", letterSpacing: 1, marginBottom: 4 }}>MITJANA</div>
                <div style={{ fontFamily: "var(--pff)", fontWeight: 900, fontSize: 24, color: C.gold }}>{avgBet}🍺</div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>per aposta</div>
              </div>
              <div style={{ flex: 1, ...sty.card, textAlign: "center" }}>
                <div style={{ fontSize: 11, color: C.muted, fontFamily: "var(--pff)", letterSpacing: 1, marginBottom: 4 }}>EXACTES</div>
                <div style={{ fontFamily: "var(--pff)", fontWeight: 900, fontSize: 24, color: C.amber }}>{totalExacts}</div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>marcadors clavats</div>
              </div>
            </div>

            {profetaRei && profetaRei.exactos > 0 && (
              <div style={{ ...sty.card, marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: C.muted, fontFamily: "var(--pff)", letterSpacing: 1, marginBottom: 4 }}>🔮 REI PROFETA</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 28 }}>{profetaRei.emoji}</span>
                  <div>
                    <div style={{ fontFamily: "var(--pff)", fontWeight: 800, fontSize: 18, color: C.txt }}>{profetaRei.name}</div>
                    <div style={{ fontSize: 12, color: C.amber }}>{profetaRei.exactos} marcadors exactes encertats</div>
                  </div>
                </div>
              </div>
            )}

            {jackpotKing && jackpotKing.jackpotsWon > 0 && (
              <div style={{ ...sty.card, marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: C.muted, fontFamily: "var(--pff)", letterSpacing: 1, marginBottom: 4 }}>🏆 REI DEL JACKPOT</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 28 }}>{jackpotKing.emoji}</span>
                  <div>
                    <div style={{ fontFamily: "var(--pff)", fontWeight: 800, fontSize: 18, color: C.txt }}>{jackpotKing.name}</div>
                    <div style={{ fontSize: 12, color: C.rose }}>{jackpotKing.jackpotsWon} jackpot{jackpotKing.jackpotsWon > 1 ? "s" : ""} guanyat{jackpotKing.jackpotsWon > 1 ? "s" : ""}</div>
                  </div>
                </div>
              </div>
            )}

            {allGroupBets.length === 0 && (
              <div style={{ textAlign: "center", padding: 40, color: C.muted }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>📊</div>
                <p style={{ fontFamily: "var(--pff)", fontWeight: 800, fontSize: 18 }}>ENCARA NO HI HA DADES</p>
                <p style={{ fontSize: 12, marginTop: 4 }}>Aposta una mica i tornarem amb stats</p>
              </div>
            )}
          </div>
        )}

        {/* ─── CHAT ─── */}
        {tab === "chat" && (
          <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 130px)", padding: "0" }}>
            <div style={{ ...sty.sectionH, padding: "14px 14px 8px" }}>💬 XAT · {currentGroup?.name}</div>
            <div style={{ flex: 1, overflowY: "auto", padding: "0 14px" }}>
              {groupChat.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: C.muted }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>💬</div>
                  <p style={{ fontFamily: "var(--pff)", fontWeight: 800, fontSize: 18 }}>SENSE MISSATGES</p>
                  <p style={{ fontSize: 12, marginTop: 4 }}>Sigues el primer a picar als col·legues!</p>
                </div>
              ) : (
                groupChat.map((msg, i) => {
                  if (msg.system) {
                    return (
                      <div key={msg.id} style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}>
                        <div style={{ background: "linear-gradient(135deg,#3a1800,#1a1200)", border: `1px solid ${C.amber}`, borderRadius: 10, padding: "8px 14px", fontSize: 12, color: C.amber, textAlign: "center", maxWidth: "90%" }}>{msg.text}</div>
                      </div>
                    );
                  }
                  const isMe = msg.accountId === account.id;
                  const prev = groupChat[i - 1];
                  const showHeader = !prev || prev.system || prev.accountId !== msg.accountId || (msg.ts - prev.ts) > 5 * 60000;
                  return (
                    <div key={msg.id} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", marginBottom: 4, gap: 6 }}>
                      {!isMe && showHeader && <span style={{ fontSize: 22, marginTop: 14, flexShrink: 0 }}>{msg.emoji || "🍺"}</span>}
                      {!isMe && !showHeader && <span style={{ width: 22, flexShrink: 0 }} />}
                      <div style={{ maxWidth: "75%" }}>
                        {showHeader && !isMe && (
                          <div style={{ fontSize: 11, color: C.gold, fontWeight: 700, marginBottom: 2, paddingLeft: 4 }}>{msg.name}</div>
                        )}
                        <div style={{ background: isMe ? C.gold : C.card, color: isMe ? "#0c0900" : C.txt, padding: "8px 12px", borderRadius: 14, borderTopLeftRadius: !isMe && !showHeader ? 4 : 14, borderTopRightRadius: isMe && !showHeader ? 4 : 14, fontSize: 14, lineHeight: 1.4, wordBreak: "break-word", border: !isMe ? `1px solid ${C.border}` : "none" }}>
                          {msg.text}
                        </div>
                        <div style={{ fontSize: 10, color: C.muted, marginTop: 2, textAlign: isMe ? "right" : "left", paddingLeft: 4, paddingRight: 4 }}>{fmtChatDate(msg.ts)}</div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>
            <div style={{ padding: "10px 14px", borderTop: `1px solid ${C.border}`, background: C.card, display: "flex", gap: 8 }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendChat()} placeholder="Escriu un missatge..." maxLength={500} style={{ ...sty.input, flex: 1 }} />
              <button onClick={sendChat} disabled={!chatInput.trim()} style={{ background: C.gold, color: "#0c0900", border: "none", borderRadius: 10, padding: "0 18px", fontFamily: "var(--pff)", fontWeight: 900, fontSize: 16, cursor: "pointer", opacity: chatInput.trim() ? 1 : 0.4 }}>→</button>
            </div>
          </div>
        )}

        {/* ─── MIS PORRAS ─── */}
        {tab === "mine" && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {[
                { l: "Birres", v: member.birras, s: "🍺", hi: true },
                { l: "Jugades", v: myBets.length, s: "" },
                { l: "Encerts", v: myBets.filter(b => b.payout > 0).length, s: "" },
              ].map(s => (
                <div key={s.l} style={{ flex: 1, background: C.card, border: `1px solid ${s.hi ? C.gold : C.border}`, borderRadius: 12, padding: "12px 6px", textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--pff)", fontWeight: 900, fontSize: 24, color: s.hi ? C.gold : C.txt, lineHeight: 1 }}>{s.v}<span style={{ fontSize: 13 }}>{s.s}</span></div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={sty.sectionH}>HISTORIAL ({myBets.length})</div>
            {myBets.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: C.muted }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>📊</div>
                <p style={{ fontFamily: "var(--pff)", fontWeight: 800, fontSize: 18 }}>ENCARA RES</p>
              </div>
            ) : [...myBets].reverse().map(b => {
              const m = matches.find(mm => mm.id === b.matchId);
              if (!m) return null;
              const net = b.settled ? (b.payout - b.amount) : null;
              return (
                <div key={b.id} style={{ background: C.card, borderRadius: 10, padding: "10px 14px", marginBottom: 6, border: `1px solid ${C.border}`, display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: C.muted, fontFamily: "var(--pff)" }}>
                      {m.home} vs {m.away}
                      {m.superBono && " ⚡"}{m.europa && " 🌍"}{b.joker && " 🃏"}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: C.txt, marginTop: 2 }}>
                      → {b.outcome === "H" ? m.home : b.outcome === "A" ? m.away : "Empat"}
                      {b.exactScore && <span style={{ color: C.amber, marginLeft: 4 }}>+ {b.exactScore.replace("-", "–")}</span>}
                      <span style={{ color: C.gold, marginLeft: 6 }}>{b.amount}🍺</span>
                    </div>
                  </div>
                  {net !== null ? (
                    <div style={{ flexShrink: 0, padding: "6px 10px", borderRadius: 8, background: net > 0 ? "#0d1f00" : "#200000", color: net > 0 ? C.green : C.red, fontFamily: "var(--pff)", fontWeight: 900, fontSize: 16 }}>{net > 0 ? "+" : ""}{net}🍺</div>
                  ) : <div style={{ fontSize: 11, color: C.muted }}>pendent</div>}
                </div>
              );
            })}
          </div>
        )}

        {/* ─── MÉS ─── */}
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

            {/* Combo Europa */}
            <button onClick={() => currentEuropaMatches.length > 0 ? setShowEuropa(true) : null} disabled={currentEuropaMatches.length === 0}
              style={{ width: "100%", background: currentEuropaMatches.length > 0 ? "linear-gradient(135deg,#1a0a2e,#0a0518)" : C.card2, border: `1px solid ${currentEuropaMatches.length > 0 ? C.purple : C.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12, cursor: currentEuropaMatches.length > 0 ? "pointer" : "not-allowed", textAlign: "left", opacity: currentEuropaMatches.length > 0 ? 1 : 0.5 }}>
              <span style={{ fontSize: 28 }}>🌍</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--pff)", fontWeight: 800, fontSize: 15, color: currentEuropaMatches.length > 0 ? C.purple : C.muted }}>COMBO EUROPA (gratis)</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                  {currentEuropaMatches.length === 0 ? "No hi ha combo aquesta setmana" :
                    myEuropaEntry ? `Predicció feta · ${currentEuropaMatches.length}/${CFG.EUROPA_REQUIRED} partits` :
                    `Tria 1X2 dels ${currentEuropaMatches.length} partits · 3=${CFG.EUROPA_BONUSES[3]}🍺 4=${CFG.EUROPA_BONUSES[4]}🍺 5=${CFG.EUROPA_BONUSES[5]}🍺`}
                </div>
              </div>
              <span style={{ color: C.muted }}>→</span>
            </button>

            <div style={sty.sectionH}>RESUM</div>
            <button onClick={() => setShowWeeklyModal(true)} style={{ width: "100%", background: "linear-gradient(135deg,#0a1a2e,#050d18)", border: `1px solid ${C.blue}`, borderRadius: 10, padding: "12px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left" }}>
              <span style={{ fontSize: 28 }}>📅</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--pff)", fontWeight: 800, fontSize: 15, color: C.blue }}>RESUM SETMANAL</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Què va passar la última setmana · Compartir al WhatsApp</div>
              </div>
              <span style={{ color: C.muted }}>→</span>
            </button>

            <div style={sty.sectionH}>OPCIONS</div>
            {[
              { icon: "📖", label: "Normes del joc", action: () => setShowRules(true) },
              { icon: "🔄", label: "Canviar de grup", action: () => setActiveGroupId(null), color: C.blue },
              { icon: "🚪", label: "Tancar sessió", action: () => { setAccount(null); setActiveGroupId(null); setTab("matches"); }, color: C.muted },
            ].map((opt, i) => (
              <button key={i} onClick={opt.action} style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", color: opt.color || C.txt, fontSize: 15, fontWeight: 600, textAlign: "left" }}>
                <span style={{ fontSize: 22 }}>{opt.icon}</span><span>{opt.label}</span>
              </button>
            ))}
            <p style={{ color: C.muted, fontSize: 10, textAlign: "center", marginTop: 24 }}>BIRRAPORRA FC v1.5<br />Fet per passar-ho de conya entre col·legues 🍺</p>
          </div>
        )}
      </div>

      {/* BOTTOM NAV */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: C.card, borderTop: `1px solid ${C.border}`, display: "flex", zIndex: 50 }}>
        {[
          { id: "matches", i: "🏟️", l: "PARTITS" },
          { id: "jackpot", i: "🏆", l: "JACKPOT", glow: clasicoActive },
          { id: "ranking", i: "📊", l: "RANKING" },
          { id: "stats", i: "📈", l: "STATS" },
          { id: "chat", i: "💬", l: "XAT", dot: hasNewChat },
          { id: "more", i: "⋯", l: "MÉS" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "8px 2px 6px", background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, cursor: "pointer", borderTop: `2px solid ${tab === t.id ? C.gold : "transparent"}`, position: "relative" }}>
            <RedDot show={t.dot && tab !== t.id} />
            <span style={{ fontSize: 18, animation: t.glow && tab !== t.id ? "pulse 2s ease-in-out infinite" : "none" }}>{t.i}</span>
            <span style={{ fontSize: 8, fontWeight: 700, color: tab === t.id ? C.gold : C.muted, fontFamily: "var(--pff)", letterSpacing: 0.3 }}>{t.l}</span>
          </button>
        ))}
      </div>

      {/* MODALS */}
      {betMatch && <BetModal match={betMatch} member={member} existing={myBets.find(b => b.matchId === betMatch.id)} jokerAvailable={jokerAvailable} onSubmit={submitBet} onClose={() => setBetMatch(null)} />}
      {showClasico && currentClasicoMatches.length > 0 && (
        <ClasicoModal clasicoMatches={currentClasicoMatches} jackpot={groupClasico?.jackpot || 0} member={member} existing={myClasicoEntry} onSubmit={submitClasico} onClose={() => setShowClasico(false)} />
      )}
      {showCoin && <CoinFlipModal member={member} current={coinThisWeek} onPlay={playCoin} onCashout={cashoutCoin} onClose={() => setShowCoin(false)} />}
      {showAdmin && adminMode && (
        <AdminPanel
          data={{ groups, members, accounts, matches }}
          handlers={{ addMatch: adminAddMatch, setResult: adminSetResult, recharge: adminRecharge, closeMonth: adminCloseMonth, doubleMonth: adminDouble }}
          onClose={() => setShowAdmin(false)}
        />
      )}
      {showRules && member?.seenWelcome && <RulesScreen firstTime={false} onClose={() => setShowRules(false)} />}
      {showEuropa && currentEuropaMatches.length > 0 && (
        <EuropaModal matches={currentEuropaMatches} member={member} existing={myEuropaEntry} onSubmit={submitEuropa} onClose={() => setShowEuropa(false)} />
      )}
      {showWeeklyModal && (
        <WeeklySummaryModal data={{ currentGroup, leaderboard, weekTopGain, myWeekNet, myWeekBets, myWeekHits, shareText: shareWeeklyText() }} onClose={() => setShowWeeklyModal(false)} />
      )}
      {showEmojiChange && <EmojiChangeModal current={account.emoji || "🍺"} onSave={updateEmoji} onClose={() => setShowEmojiChange(false)} />}
      {showAdminLogin && <AdminPassModal onSubmit={tryAdmin} onClose={() => setShowAdminLogin(false)} />}
      <Toast toast={toast} />
    </div>
  );
}
