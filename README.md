# Habit Tracker

Web app personale per tracciare le abitudini. Pensata per il telefono, tema scuro, installabile come app (PWA) e utilizzabile offline. I dati restano solo sul dispositivo.

## Comandi

```bash
npm install
npm run dev        # server di sviluppo
npm test           # test della logica
npm run build      # typecheck + build in dist/
npm run icons      # rigenera le icone da public/icon.svg
```

## Pubblicazione

Ogni push su `main` pubblica l'app su GitHub Pages (`.github/workflows/deploy.yml`).
Da attivare una volta: **Settings → Pages → Source: GitHub Actions**, e `main` come branch predefinito
(**Settings → General → Default branch**) e ammesso in **Settings → Environments → github-pages**.

Per installarla sul telefono apri il sito e usa *Aggiungi a schermata Home* (su iPhone da Safari, su Android da Chrome).

## Progetto

### Stack
React + TypeScript + Vite + Tailwind, Dexie (IndexedDB), date-fns, vite-plugin-pwa, Vitest.

### Modello dati (`src/types.ts`)
- **Abitudine**: nome, icona, colore, ordine, data di inizio, data di archiviazione.
  - Tipo: `boolean` (sì/no), `quantity` (obiettivo + unità), `negative` (da evitare).
  - Frequenza: ogni giorno, giorni fissi (1 = lunedì … 7 = domenica), N volte a settimana.
- **Registrazione**: abitudine + giorno (`YYYY-MM-DD`, ora locale) + valore. Senza registrazione il valore è 0.
  Sì/no: 1 = fatto. Quantità: il numero. Da evitare: 1 = ricaduta.
- **Nota del giorno**: testo + umore 1–5 (fase 3).

### Regole
- Giornata riuscita: sì/no fatto, quantità ≥ obiettivo, da evitare senza ricadute.
- I giorni non previsti dalla frequenza non contano nel progresso (né, in futuro, nelle streak).
- "N volte a settimana": l'abitudine conta nel progresso del giorno finché l'obiettivo settimanale non è raggiunto.
  La streak conterà le settimane consecutive riuscite.
- Da evitare: la streak conta i giorni dall'ultima ricaduta.
- Si può modificare qualsiasi giorno passato. Per registrare giorni precedenti alla creazione si anticipa la data di inizio.
- Il tipo di un'abitudine non si può cambiare dopo la creazione (cambierebbe il significato dei dati).
- Streak (`src/lib/stats.ts`): oggi, se non ancora fatto, non interrompe la serie; una ricaduta registrata oggi sì.
  Per "N volte a settimana" la settimana in corso conta solo quando l'obiettivo è raggiunto;
  una prima settimana parziale richiede al massimo tanti giorni quanti ne ha.

### Fasi
1. ✅ Struttura, gestione abitudini, schermata Oggi, PWA
2. ✅ Streak, calendario, dettaglio abitudine
3. Statistiche, grafici, note e umore
4. Backup JSON (export/import), rifinitura, promemoria dentro l'app
5. (opzionale) Notifiche push tramite un piccolo server (es. Cloudflare Worker) che conosce solo gli orari

### Note
- Il browser può cancellare i dati locali: l'app chiede l'archiviazione persistente, ma conviene installarla e fare backup.
- Su iPhone le notifiche push funzionano solo con l'app installata nella schermata Home.
