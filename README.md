# 🏆 Birraporra Mundial 2026

> App de porres del Mundial de Futbol 2026 per fer-ho entre amics. Cada amic aposta birres virtuals als partits, prediu marcadors exactes, i al final del torneig el pot acumulat es reparteix entre els millors.

**Stack:** React 18 · Vite · Supabase (Auth + DB) · Vercel

---

## ✨ Funcionalitats

### ⚽ Porres normals
- Aposta Local / Empat / Visitant amb quotes fixes
- Opció de predir el **marcador exacte** (×1.5 del benefici si l'encertes)
- Tancament automàtic quan comença el partit

### 🇪🇸 Jackpot Selecció Espanyola
- Als partits d'Espanya pots apostar birres + predir el resultat exacte
- Qui l'encerta s'emporta **tot el pot**
- Si ningú no encerta, les birres s'acumulen pel pròxim partit

### 🪙 Cara o Creu
- Un cop per setmana, aposta birres i dobla fins a 3 cops
- Si falles, ho perds tot

### 👥 Grups
- L'admin crea grups i comparteix un **codi de 6 caràcters**
- Els amics entren amb el codi — automàticament sumen 10€ al pot
- Múltiples grups independents, cadascun amb les seves porres

### 📊 Ranking i Estadístiques
- Podi visual top 3 amb corona i medalles
- Estadístiques de grup: qui aposta més, qui perd més, aposta màxima, etc.
- Filtres als partits finalitzats: encertats / fallats / sense aposta

### 🛠️ Panell admin
- Afegir partits (selector de 38 seleccions del Mundial)
- Precarregar els 3 partits d'Espanya de la Fase de Grups (15/6, 21/6, 26/6)
- Aplicar partits a tots els grups alhora
- Posar resultats (es propaga a tots els grups)
- Recarregar birres als jugadors
- Esborrar grups

---

## 🚀 Desplegament

### Requisits previs
- Compte a [Supabase](https://supabase.com) (pla free suficient)
- Compte a [Vercel](https://vercel.com) (pla free suficient)

### 1. Supabase — configuració de la base de dades

Crea un projecte nou a Supabase i executa aquestes dues sentències SQL a l'**SQL Editor**:

```sql
-- Taula de magatzem clau-valor
CREATE TABLE kv_store (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activar Row Level Security
ALTER TABLE kv_store ENABLE ROW LEVEL SECURITY;

-- Permetre lectura i escriptura a usuaris autenticats
CREATE POLICY "read all"   ON kv_store FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert all" ON kv_store FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update all" ON kv_store FOR UPDATE TO authenticated USING (true);
```

A **Authentication → Providers → Email**, desactiva **"Confirm email"** perquè els amics puguin entrar sense verificar el correu.

### 2. Configurar les claus al codi

Edita `src/supabase.js` i substitueix les dues constants amb les dades del teu projecte Supabase (Project URL i anon key, a **Project Settings → API**):

```js
const SUPABASE_URL = "https://EL-TEU-PROJECTE.supabase.co";
const SUPABASE_ANON_KEY = "eyJ...";
```

### 3. Pujar a GitHub

```bash
git clone https://github.com/jcelmacarballo/birraporra-fc.git
# Copia els fitxers del projecte i fes push
git add .
git commit -m "Birraporra Mundial v8"
git push
```

### 4. Desplegar a Vercel

1. Ves a [vercel.com/new](https://vercel.com/new)
2. Importa el repositori de GitHub
3. Vercel detecta Vite automàticament → clica **Deploy**
4. En ~2 minuts tens la URL pública

Des d'ara, cada `git push` desplega automàticament.

---

## 🎮 Com jugar

### L'admin (tu)
1. Obre l'app i registra't
2. Toca el logo **5 vegades** per activar el mode admin → contrasenya `gol2024`
3. Crea un grup → es genera un codi de 6 caràcters (ex: `ABC123`)
4. Comparteix el codi als amics per WhatsApp
5. Afegeix partits des del panell admin (o usa el botó de precarregar Espanya)
6. Quan acaba un partit, posa el resultat → les birres es reparteixen automàticament

### Els amics
1. Obren la URL i es registren (nom + email + contrasenya)
2. Posen el codi del grup → entren directament
3. A la pestanya **Partits** apostes birres als partits oberts
4. A la pestanya **Jackpot** apostes als partits d'Espanya
5. Al **Ranking** veuen com van tots

---

## 🏗️ Estructura del projecte

```
birraporra-mundial/
├── src/
│   ├── App.jsx          # Component principal (~2500 línies) — tota la lògica i UI
│   ├── main.jsx         # Punt d'entrada React
│   └── supabase.js      # Client Supabase + helpers d'auth
├── index.html
├── package.json
└── vite.config.js
```

L'arquitectura és intencionadament simple: tot en un sol component amb estat local sincronitzat a Supabase via una taula `kv_store` de clau-valor (JSON). No hi ha backend propi ni API — tota la lògica viu al client.

---

## ⚙️ Configuració (`CFG`)

Les constants principals al principi de `App.jsx`:

| Constant | Valor | Descripció |
|---|---|---|
| `ENTRY_EUR` | `10.00` | Euros d'entrada per jugador |
| `START_BIRRAS` | `100` | Birres inicials per jugador |
| `BIRRA_EUR` | `0.10` | Valor d'una birra en euros |
| `EXACT_BONUS` | `1.5` | Multiplicador si encertes el marcador exacte |
| `ADMIN_PASS` | `gol2024` | Contrasenya del mode admin |
| `ESPANYA_MIN_BET` | `5` | Aposta mínima al Jackpot Espanya |
| `COIN_ENTRY` | `5` | Cost d'entrada al Cara o Creu |

---

## 🛠️ Desenvolupament local

```bash
npm install
npm run dev
```

Obre `http://localhost:5173`

---

## 📋 Llicència

Projecte privat — ús personal entre amics. 🍺
