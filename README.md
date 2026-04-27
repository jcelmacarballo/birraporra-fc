# 🍺⚽ BIRRAPORRA FC

La porra dels teus colegues - L'app de porres de futbol per jugar amb els amics!

## 📱 Com jugar

1. **Crea un compte** amb el teu nom i emoji
2. **Selecciona o crea grup** amb els teus colegues
3. **Afegeix partits** (necessita credencials d'admin)
4. **Fes porres** sobre els partits
5. **Veu el ranking** en temps real

---

## ⚙️ Configuració personalitzada

Obri `src/App.jsx` i busca:

```javascript
const CFG = {
  ADMIN_PASS: "x",                 // Contrasenya admin
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
