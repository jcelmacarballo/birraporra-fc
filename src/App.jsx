import { useState, useEffect } from "react";

const CFG = {
  ADMIN_PASS: "gol2024",
  ENTRY_EUR: 2.50, START_BIRRAS: 50, BIRRA_EUR: 0.05, BEER_EUR: 2.50,
};

const C = {
  bg: "#0a0907", card: "#16110a", card2: "#1e1810", border: "#2e2618",
  gold: "#f5b800", amber: "#c88800", muted: "#80746a", txt: "#f5eed8",
  red: "#e03838", green: "#38b858", blue: "#5299d6", purple: "#a855f7",
};

const AVATAR_EMOJIS = ["🍺", "⚽", "🔥", "🏆", "😈", "🎯", "👑", "💪"];

const KEYS = {
  accounts: "bporra_accounts",
  groups: "bporra_groups",
  members: "bporra_members",
  matches: "bporra_matches",
};

async function dbGet(k) { try { const r = await window.storage.get(k, true); return r ? JSON.parse(r.value) : null; } catch { return null; } }
async function dbSet(k, v) { try { await window.storage.set(k, JSON.stringify(v), true); } catch {} }

const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);

const sty = {
  btnPrimary: { background: C.gold, color: "#0c0900", border: "none", borderRadius: 10, padding: "14px 16px", fontFamily: "var(--pff)", fontWeight: 900, fontSize: 18, cursor: "pointer" },
  btnGhost: { background: C.card2, color: C.muted, border: "none", borderRadius: 10, padding: "14px 16px", fontFamily: "var(--pff)", fontWeight: 700, fontSize: 16, cursor: "pointer" },
  input: { padding: "12px 14px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.txt, fontSize: 15, outline: "none", width: "100%", fontFamily: "inherit" },
  label: { fontSize: 11, color: C.muted, fontFamily: "var(--pff)", letterSpacing: 1, display: "block", marginBottom: 4 },
  sectionH: { fontFamily: "var(--pff)", fontWeight: 800, fontSize: 13, color: C.gold, letterSpacing: 2, marginBottom: 12 },
  card: { background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: 14 },
};

export default function App() {
  const [account, setAccount] = useState(null);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [members, setMembers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [tab, setTab] = useState("matches");

  useEffect(() => {
    (async () => {
      const [a, g, m, mt] = await Promise.all([
        dbGet(KEYS.accounts), dbGet(KEYS.groups), dbGet(KEYS.members), dbGet(KEYS.matches),
      ]);
      setAccounts(a || []);
      setGroups(g || []);
      setMembers(m || []);
      setMatches(mt || []);
    })();
  }, []);

  useEffect(() => { dbSet(KEYS.accounts, accounts); }, [accounts]);
  useEffect(() => { dbSet(KEYS.groups, groups); }, [groups]);
  useEffect(() => { dbSet(KEYS.members, members); }, [members]);
  useEffect(() => { dbSet(KEYS.matches, matches); }, [matches]);

  const currentGroup = groups.find(g => g.id === activeGroupId);
  const member = members.find(m => m.accountId === account?.id && m.groupId === activeGroupId);

  return (
    <div style={{ width: "100%", height: "100vh", maxWidth: 480, margin: "0 auto", background: C.bg, display: "flex", flexDirection: "column", position: "relative" }}>
      {!account ? (
        <LoginScreen accounts={accounts} onCreateAccount={(name, emoji) => {
          const newAcc = { id: uid(), name, emoji, createdAt: Date.now() };
          setAccounts([...accounts, newAcc]);
          setAccount(newAcc);
        }} onSelectAccount={(acc) => setAccount(acc)} />
      ) : !activeGroupId ? (
        <GroupSelector groups={groups} onCreateGroup={(name) => {
          const newGroup = { id: uid(), name, createdAt: Date.now() };
          setGroups([...groups, newGroup]);
          const newMember = { id: uid(), accountId: account.id, groupId: newGroup.id, birras: CFG.START_BIRRAS, joinedAt: Date.now() };
          setMembers([...members, newMember]);
          setActiveGroupId(newGroup.id);
        }} onSelectGroup={(groupId) => {
          if (!members.find(m => m.accountId === account.id && m.groupId === groupId)) {
            const newMember = { id: uid(), accountId: account.id, groupId, birras: CFG.START_BIRRAS, joinedAt: Date.now() };
            setMembers([...members, newMember]);
          }
          setActiveGroupId(groupId);
        }} />
      ) : (
        <>
          <div style={{ flex: 1, overflowY: "auto", paddingBottom: 70, padding: "0 12px" }}>
            {tab === "matches" && (
              <div style={{ paddingTop: 14 }}>
                <div style={sty.sectionH}>PARTITS</div>
                <div style={{ ...sty.card, textAlign: "center", padding: "30px 14px", color: C.muted }}>
                  <div style={{ fontSize: 48, marginBottom: 10 }}>🏟️</div>
                  <p>Benvingut a BIRRAPORRA FC!</p>
                </div>
              </div>
            )}

            {tab === "ranking" && (
              <div style={{ paddingTop: 14 }}>
                <div style={sty.sectionH}>RANKING</div>
                {members.filter(m => m.groupId === activeGroupId).sort((a, b) => b.birras - a.birras).map((m, i) => {
                  const acc = accounts.find(a => a.id === m.accountId);
                  return (
                    <div key={m.id} style={{ ...sty.card, marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 20, fontWeight: 900, color: C.gold }}>{i + 1}.</span>
                      <span style={{ fontSize: 24 }}>{acc?.emoji || "🍺"}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{acc?.name}</div>
                        <div style={{ fontSize: 12, color: C.muted }}>🍺 {Math.round(m.birras)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {tab === "more" && (
              <div style={{ paddingTop: 14 }}>
                <div style={sty.sectionH}>PERFIL</div>
                <div style={{ ...sty.card, marginBottom: 14, textAlign: "center", padding: "20px 14px" }}>
                  <div style={{ fontSize: 48, marginBottom: 10 }}>{account.emoji || "🍺"}</div>
                  <div style={{ fontFamily: "var(--pff)", fontWeight: 800, fontSize: 24, color: C.txt }}>{account.name}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Grup: {currentGroup?.name}</div>
                </div>
                <button onClick={() => { setAccount(null); setActiveGroupId(null); setTab("matches"); }} style={{ ...sty.btnPrimary, width: "100%", marginBottom: 20 }}>Tancar sessió</button>
              </div>
            )}
          </div>

          <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: C.card, borderTop: `1px solid ${C.border}`, display: "flex", zIndex: 50 }}>
            {[
              { id: "matches", i: "🏟️", l: "PARTITS" },
              { id: "ranking", i: "📊", l: "RANKING" },
              { id: "more", i: "⋯", l: "MÉS" },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "8px 2px 6px", background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, cursor: "pointer", borderTop: `2px solid ${tab === t.id ? C.gold : "transparent"}` }}>
                <span style={{ fontSize: 18 }}>{t.i}</span>
                <span style={{ fontSize: 8, fontWeight: 700, color: tab === t.id ? C.gold : C.muted, fontFamily: "var(--pff)", letterSpacing: 0.3 }}>{t.l}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function LoginScreen({ accounts, onCreateAccount, onSelectAccount }) {
  const [step, setStep] = useState("choose");
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🍺");

  return (
    <div style={{ padding: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <div style={{ fontSize: 64, marginBottom: 20 }}>🍺⚽</div>
      <h1 style={{ fontSize: 28, fontFamily: "var(--pff)", fontWeight: 900, marginBottom: 20, textAlign: "center" }}>BIRRAPORRA FC</h1>
      
      {step === "choose" && (
        <div style={{ width: "100%", maxWidth: 300 }}>
          {accounts.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, fontFamily: "var(--pff)" }}>SELECCIONA COMPTE</div>
              {accounts.map(acc => (
                <button key={acc.id} onClick={() => onSelectAccount(acc)} style={{ width: "100%", ...sty.card, marginBottom: 10, display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <span style={{ fontSize: 32 }}>{acc.emoji}</span>
                  <span style={{ fontWeight: 600 }}>{acc.name}</span>
                </button>
              ))}
              <div style={{ height: 1, background: C.border, marginBottom: 20 }} />
            </div>
          )}
          <button onClick={() => setStep("create")} style={{ ...sty.btnPrimary, width: "100%", marginBottom: 10 }}>+ CREAR COMPTE</button>
        </div>
      )}

      {step === "create" && (
        <div style={{ width: "100%", maxWidth: 300 }}>
          <div style={{ ...sty.card, marginBottom: 14 }}>
            <div style={sty.label}>NOM</div>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="El teu nom" style={sty.input} />
          </div>
          <div style={{ ...sty.card, marginBottom: 20 }}>
            <div style={sty.label}>EMOJI</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {AVATAR_EMOJIS.map(e => (
                <button key={e} onClick={() => setEmoji(e)} style={{ fontSize: 28, padding: 8, background: emoji === e ? C.gold : C.card2, border: `2px solid ${emoji === e ? C.amber : "transparent"}`, borderRadius: 8, cursor: "pointer" }}>{e}</button>
              ))}
            </div>
          </div>
          <button onClick={() => { if (name) { onCreateAccount(name, emoji); setStep("choose"); setName(""); } }} style={{ ...sty.btnPrimary, width: "100%", marginBottom: 10 }}>CREAR</button>
          <button onClick={() => setStep("choose")} style={{ ...sty.btnGhost, width: "100%" }}>ENRERE</button>
        </div>
      )}
    </div>
  );
}

function GroupSelector({ groups, onCreateGroup, onSelectGroup }) {
  const [name, setName] = useState("");

  return (
    <div style={{ padding: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <div style={{ fontSize: 48, marginBottom: 20 }}>👥</div>
      <h2 style={{ fontSize: 22, fontFamily: "var(--pff)", fontWeight: 900, marginBottom: 20 }}>SELECCIONA GRUP</h2>
      
      <div style={{ width: "100%", maxWidth: 300 }}>
        {groups.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            {groups.map(g => (
              <button key={g.id} onClick={() => onSelectGroup(g.id)} style={{ width: "100%", ...sty.card, marginBottom: 10, cursor: "pointer", fontWeight: 600 }}>
                {g.name}
              </button>
            ))}
            <div style={{ height: 1, background: C.border, marginBottom: 20 }} />
          </div>
        )}

        <div style={{ ...sty.card, marginBottom: 14 }}>
          <div style={sty.label}>CREAR NOU GRUP</div>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom del grup" style={sty.input} />
        </div>
        <button onClick={() => { if (name) { onCreateGroup(name); setName(""); } }} style={{ ...sty.btnPrimary, width: "100%" }}>CREAR</button>
      </div>
    </div>
  );
}
