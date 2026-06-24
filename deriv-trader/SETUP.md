# DerivTrader — Setup & Deployment Guide

A fully functional Deriv third-party trading dashboard with live WebSocket prices, OAuth login, buy/sell contracts, and account history.

---

## What's included

- **OAuth login** — Deriv OAuth redirects users to log in, returns API tokens
- **Live price ticker** — Real-time WebSocket tick stream for 10 symbols (Vol indices, Forex, Crypto)
- **Interactive chart** — Live price chart with 300-tick history using lightweight-charts
- **Trade form** — Rise/Fall and Touch/No Touch contracts with live quotes and payout preview
- **Account panel** — Open positions with sell button, full trade history
- **Dark theme** — Deriv brand colors, responsive layout

---

## Step 1: Register your Deriv App

You need an App ID from Deriv before going live.

1. Go to **https://api.deriv.com/api-explorer/** → click **Register your app**
   OR log in at **https://app.deriv.com/account/api-token**
2. Create an app with:
   - **Name:** Your site name (e.g. "MyTrader")
   - **OAuth redirect URL:** `https://YOUR-SITE.netlify.app/callback`
   - **Scopes:** `read`, `trade`, `payments` (at minimum `trade`)
3. Note your **App ID** (a number like `12345`)

> The template ships with app_id `16929` (from dtrader-template). This works for local testing but you should register your own app for production.

---

## Step 2: Local development

```bash
# 1. Enter the project directory
cd deriv-trader

# 2. Copy env file and set your App ID
cp .env.example .env
# Edit .env and set VITE_DERIV_APP_ID=YOUR_APP_ID

# 3. Install dependencies
npm install

# 4. Start dev server
npm run dev
# → http://localhost:3000
```

**Important for local OAuth:** Deriv's OAuth redirect must match exactly. For localhost, the redirect will be `http://localhost:3000/callback`. Register this URL in your Deriv app settings, OR just test the UI without logging in (public ticks still work).

---

## Step 3: Deploy to Netlify

### Option A: Netlify CLI (fastest)

```bash
npm install -g netlify-cli
netlify login
netlify init          # follow prompts, set build command: npm run build, publish: dist
netlify env:set VITE_DERIV_APP_ID YOUR_APP_ID
git push              # Netlify auto-deploys on push
```

### Option B: Netlify UI

1. Push this folder to GitHub/GitLab
2. Go to **https://app.netlify.com** → **Add new site** → **Import from Git**
3. Set:
   - **Build command:** `npm install && npm run build`
   - **Publish directory:** `dist`
4. Add environment variable: `VITE_DERIV_APP_ID` = `YOUR_APP_ID`
5. Click **Deploy**

### Option C: Drag-and-drop (quickest test)

```bash
npm run build
# Drag the `dist/` folder to https://app.netlify.com/drop
```

---

## Step 4: Update OAuth redirect URL

After deploying, go back to your Deriv app registration and update the **OAuth redirect URL** to:
```
https://YOUR-SITE.netlify.app/callback
```

---

## Architecture

```
src/
├── services/
│   ├── websocket.ts     # WebSocket manager (connect, send, subscribe, authorize)
│   └── auth.ts          # OAuth helpers (login URL, callback parsing, session storage)
├── store.ts             # Zustand global state (accounts, ticks, balance, etc.)
├── components/
│   ├── Header/          # Nav bar with account switcher and balance
│   ├── TickerBar/       # Scrollable live price tickers (subscribes to 10 symbols)
│   ├── Chart/           # lightweight-charts line chart with live tick append
│   ├── TradingForm/     # Contract type, stake, duration, proposal, buy/sell
│   └── AccountInfo/     # Portfolio (open positions + sell) and statement (history)
└── pages/
    ├── Login.tsx        # Login/signup page
    ├── Callback.tsx     # OAuth callback handler (parses tokens from URL)
    └── Dashboard.tsx    # Main layout (connects WS, authorizes, subscribes balance)
```

## WebSocket API calls used

| Feature | Deriv API call |
|---|---|
| Login | `authorize` with OAuth token |
| Balance | `balance` with `subscribe: 1` |
| Live prices | `ticks` with `subscribe: 1` |
| Chart history | `ticks_history` with `count: 300` |
| Price quote | `proposal` |
| Buy contract | `buy` |
| Sell contract | `sell` |
| Open positions | `portfolio` |
| Trade history | `statement` |
| Keep-alive | `ping` every 30s |

---

## Customization

- **Brand colors** — edit `src/styles/globals.css` CSS variables
- **Default symbol** — change `activeSymbol: 'R_100'` in `src/store.ts`
- **Ticker symbols** — edit `TICKER_SYMBOLS` array in `TickerBar.tsx`
- **App name** — search/replace "DerivTrader" across files

---

## Troubleshooting

| Issue | Fix |
|---|---|
| Login redirects but no accounts appear | Check your App ID and that redirect URL matches exactly |
| "Could not get quote" on trade form | You must be logged in with a valid token; try re-logging |
| Chart shows no data | Symbol may not be tradeable; switch to `R_100` |
| WebSocket stays disconnected | Check browser console; the sandbox blocks npm but the browser won't |
