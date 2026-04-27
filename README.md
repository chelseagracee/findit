# FINDIT — Fashion, Fast.

AI-powered fashion search. Describe what you're looking for, get instant results from top stores, swipe through TikTok-style, double-tap to save.

---

## Deploy in 5 steps (free, ~10 minutes)

### Step 1 — Get your Anthropic API key
1. Go to **console.anthropic.com**
2. Sign up / log in
3. Click **API Keys** in the left sidebar
4. Click **Create Key** → copy it somewhere safe

### Step 2 — Put the project on GitHub
1. Go to **github.com** → New repository → name it `findit` → Create
2. Upload all these files (drag and drop works)

### Step 3 — Deploy to Vercel
1. Go to **vercel.com** → Sign up free (use your GitHub account)
2. Click **Add New Project**
3. Import your `findit` GitHub repo
4. Click **Deploy** (no build settings needed)

### Step 4 — Add your API key
1. In your Vercel project, go to **Settings → Environment Variables**
2. Add a new variable:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** paste your key from Step 1
3. Click **Save**
4. Go to **Deployments** → click the three dots on your latest deploy → **Redeploy**

### Step 5 — Done ✓
Vercel gives you a live URL like `findit-xyz.vercel.app`. Share it, use it, it works.

---

## Project structure

```
findit/
├── public/
│   └── index.html      ← the entire app
├── api/
│   └── chat.js         ← serverless proxy (keeps your API key secret)
├── vercel.json         ← routing config
├── package.json
└── .gitignore
```

## How it works

- User types/speaks their fashion request + picks size + sets budget
- `index.html` sends the request to `/api/chat` (your own server)
- `api/chat.js` adds your secret API key and calls Anthropic
- Claude returns 7 curated store recommendations as JSON
- App renders them as a TikTok-style swipeable feed
- Double-tap any card to save it (persists in browser)

## Cost

Roughly **$0.003 per search** (less than half a cent). 1,000 searches ≈ $3.
