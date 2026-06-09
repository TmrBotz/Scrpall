# Download Extractor — Cloudflare Worker

## Kyun CF Worker?
Cloudflare Workers **Cloudflare ke apne network** pe run hote hain.
HubCloud bhi Cloudflare use karta hai — same network trust hoti hai,
isliye 403 nahi aata. Render/Railway jaise datacenter IPs block ho jaate hain.

---

## Project Structure
```
cf-worker-api/
├── src/
│   ├── index.js                   ← Main router + site registry
│   ├── utils/
│   │   └── fetch.js               ← Shared fetch + HTML parser helpers
│   └── extractors/
│       ├── hubcloud.js            ← HubCloud extractor
│       ├── hubdrive.js            ← HubDrive extractor
│       └── template_newsite.js   ← TEMPLATE — copy karke naya site banao
├── wrangler.toml                  ← CF Worker config
└── package.json
```

---

## Deploy Karo (5 minutes)

### Step 1 — Cloudflare account banao (free)
https://dash.cloudflare.com/sign-up

### Step 2 — Wrangler install karo
```bash
npm install
```

### Step 3 — Login karo
```bash
npx wrangler login
```
Browser mein Cloudflare login page khulega — allow karo.

### Step 4 — Deploy karo
```bash
npm run deploy
```

Output mein aapko URL milega:
```
https://download-extractor.YOUR-SUBDOMAIN.workers.dev
```

### Local test (optional)
```bash
npm run dev
# http://localhost:8787 pe chal jaega
```

---

## API Usage

### GET /extract
```
GET https://download-extractor.YOUR.workers.dev/extract?url=TARGET_URL
```

**Examples:**
```bash
# HubDrive
curl "https://download-extractor.YOUR.workers.dev/extract?url=https://hubdrive.space/file/2745099315"

# HubCloud direct
curl "https://download-extractor.YOUR.workers.dev/extract?url=https://hubcloud.foo/drive/7tzozphljg1lrog"
```

**Response:**
```json
{
  "success": true,
  "site": "hubcloud",
  "filename": "Gamblers.2025.720p...mkv",
  "file_size": "629.27 MB",
  "download_links": [
    { "server": "FSLv2",     "url": "https://cdn.fsl-buckets.life/..." },
    { "server": "FSL",       "url": "https://hub.auvps.buzz/..." },
    { "server": "10Gbps",    "url": "https://pixel.hubcloud.cx/..." },
    { "server": "PixelDrain","url": "https://pixeldrain.dev/u/..." }
  ]
}
```

### GET /sites — Supported sites list
### GET /       — Health check

---

## Naya Site Add Karna

### Step 1 — Template copy karo
```bash
cp src/extractors/template_newsite.js src/extractors/mysite.js
```

### Step 2 — Logic likho
```javascript
// src/extractors/mysite.js
export async function extractMySite(url) {
  const { html } = await getPage(url, { referer: 'https://google.com/' });
  // ... apna scraping logic
  return { filename, download_links: [...] };
}
```

### Step 3 — Register karo (src/index.js)
```javascript
import { extractMySite } from './extractors/mysite.js';

const SITE_REGISTRY = [
  { keyword: 'hubdrive', handler: extractHubDrive },
  { keyword: 'hubcloud', handler: extractHubCloud },
  { keyword: 'mysite',   handler: extractMySite  },  // ← add karo
];
```

### Step 4 — Redeploy
```bash
npm run deploy
```

---

## Available Helper Functions (utils/fetch.js)

```javascript
// Page fetch karo
const { html } = await getPage(url, { referer, extraHeaders, cookies });

// JS variable nikalo: var url = '...'
const val = findJsVar(html, 'url');

// HTML parser
const p = parseHtml(html);
p.findById('element-id', 'href')     // id se href/src/etc
p.findPattern(/regex with (group)/)  // regex se pehla group
p.findAllHrefs(/pattern/)            // sabhi matching hrefs
p.innerText('element-id')            // id se inner text
p.cardHeaderText()                   // filename card se
```

---

## Free Plan Limits
- 100,000 requests/day
- 10ms CPU per request
- Agar 10ms se zyada lage: paid plan ($5/month) — 50ms limit
