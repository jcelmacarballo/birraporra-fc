# 🍺⚽ BIRRAPORRA FC

La porra dels teus colegues - L'app de porres de futbol per jugar amb els amics!

## 🚀 Deployment a Vercel (5 minuts)

### Pas 1: Preparar GitHub

1. **Crea un repositori nou a GitHub:**
   - Vés a [github.com/new](https://github.com/new)
   - Posa nom: `birraporra-fc` (o el que vulguis)
   - Selecciona **Public** (per que funcioni gratis)
   - **NO** inicialitzis amb README
   - Click **Create repository**

2. **Sube els fitxers:**
   ```bash
   # Dins la carpeta del projecte, executa:
   git init
   git add .
   git commit -m "Initial commit: BirraporraFC v1.5"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/birraporra-fc.git
   git push -u origin main
   ```

### Pas 2: Deploy a Vercel

1. **Vés a [vercel.com](https://vercel.com)**
2. **Click "Sign Up"** i selecciona "Continue with GitHub"
3. **Autoritza Vercel** al teu GitHub
4. **Click "Import Project"**
5. **Selecciona el repositori `birraporra-fc`**
6. **Deixa les opcions per defecte** (detectarà automàticament que és Vite + React)
7. **Click "Deploy"** ✅

**En 30 segons tindràs la URL pública!** Es veurà com:
```
https://birraporra-fc.vercel.app
```

### Pas 3: Compartir amb els amics

- Copia la URL de Vercel
- Comparteix al grup de WhatsApp
- Cada actualització que fagis a GitHub es desplegarà automàticament

---

## 💻 Desenvolupament local (opcional)

Si vols modificar el codi:

```bash
# Instal·la dependències
npm install

# Executa en local
npm run dev

# Veurà la app en http://localhost:5173

# Build per producció
npm run build
```

---

## 📱 Com jugar

1. **Crea un compte** amb el teu nom i emoji
2. **Selecciona o crea grup** amb els teus colegues
3. **Afegeix partits** (necessita credencials d'admin)
4. **Fes porres** sobre els partits
5. **Veu el ranking** en temps real

---

## 🔐 Admin

La contrasenya admin per defecte és: `gol2024`

Pots canviar-la al codi (constants `CFG.ADMIN_PASS`)

---

## ⚙️ Configuració personalitzada

Obri `src/App.jsx` i busca:

```javascript
const CFG = {
  ADMIN_PASS: "gol2024",           // Contrasenya admin
  ENTRY_EUR: 2.50,                 // Entrada per partido
  START_BIRRAS: 50,                // Birras inicials
  BEER_EUR: 2.50,                  // Preu birra real
  ...
}
```

---

## 🤔 Troubleshooting

### "Error during build"
- Assegura que tens Node.js v16+ instal·lat
- Esborra `node_modules` i `package-lock.json`
- Executa `npm install` de nou

### "Vercel dice 'Build failed'"
- Vai a les "Build Settings" de Vercel
- Canvia a **Node.js 18** o superior
- Re-deploy

### "Els dados no es guarden"
- La app usa `window.storage` que es guarda localment
- Cada navegador/dispositiu té els seus propis dados
- **Millor solució:** Tota la gent accedeix des del mateix navegador/dispositiu

---

## 📄 Llicència

Fet per passar-ho de conya entre col·legues 🍺

Modifica, comparteix, usa com vulguis!

---

## 🐛 Bugs o millores?

Edita directament `src/App.jsx` i fes push a GitHub. Vercel es desplegarà automàticament.

---

**Diverteix-te! 🍺⚽**
