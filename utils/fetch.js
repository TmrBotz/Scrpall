/**
 * Shared Fetch Helper
 * ===================
 * CF Worker mein fetch() directly use hota hai —
 * koi extra library nahi chahiye.
 * Real browser headers bhejta hai taaki bot detect na ho.
 */

// ── Browser-like headers ──────────────────────────────────────────────────────
const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Chrome/124.0.0.0 Safari/537.36',
  'Accept':
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
};

/**
 * Page fetch karo with browser-like headers
 * @param {string} url
 * @param {object} opts  - extra options: referer, extraHeaders, cookies
 * @returns {Promise<{html: string, status: number}>}
 */
export async function getPage(url, opts = {}) {
  const headers = {
    ...BROWSER_HEADERS,
    ...(opts.referer ? { 'Referer': opts.referer } : {}),
    ...(opts.extraHeaders || {}),
  };

  // Cookie support (agar koi site cookie maange)
  if (opts.cookies) {
    headers['Cookie'] = opts.cookies;
  }

  const resp = await fetch(url, {
    method: 'GET',
    headers,
    redirect: 'follow',
    cf: {
      // CF Worker specific — caching bypass
      cacheTtl: 0,
      cacheEverything: false,
    },
  });

  if (!resp.ok) {
    throw new Error(
      `HTTP ${resp.status} for ${url}\n` +
      `Headers: ${JSON.stringify(Object.fromEntries(resp.headers))}`
    );
  }

  const html = await resp.text();
  return { html, status: resp.status };
}

/**
 * JS variable ki value extract karo
 * e.g., var url = 'https://...'
 */
export function findJsVar(html, varName) {
  const re = new RegExp(
    `(?:var|let|const)\\s+${varName}\\s*=\\s*['"]([^'"]+)['"]`
  );
  const m = html.match(re);
  return m ? m[1] : null;
}

/**
 * Simple HTML parser — attribute ya text nikalo
 * (CF Workers mein DOM parser nahi hota by default)
 */
export function parseHtml(html) {
  return {
    /**
     * id se element ka attribute nikalo
     * e.g., findById('download', 'href')
     */
    findById(id, attr = 'href') {
      const re = new RegExp(
        `id=["']${id}["'][^>]*${attr}=["']([^"']+)["']|` +
        `${attr}=["']([^"']+)["'][^>]*id=["']${id}["']`
      );
      const m = html.match(re);
      return m ? (m[1] || m[2]) : null;
    },

    /**
     * Regex se pehla match nikalo
     */
    findPattern(pattern) {
      const m = html.match(pattern);
      return m ? m[1] : null;
    },

    /**
     * Sabhi href links jo pattern match kare
     */
    findAllHrefs(pattern) {
      const re = /href=["']([^"']+)["']/g;
      const links = [];
      let m;
      while ((m = re.exec(html)) !== null) {
        if (pattern.test(m[1])) {
          links.push(m[1]);
        }
      }
      return links;
    },

    /**
     * Tag ka inner text nikalo (id se)
     */
    innerText(id) {
      const re = new RegExp(`id=["']${id}["'][^>]*>([^<]+)<`);
      const m = html.match(re);
      return m ? m[1].trim() : null;
    },

    /**
     * Card header text (filename ke liye)
     */
    cardHeaderText() {
      const m = html.match(/class=["'][^"']*card-header[^"']*["'][^>]*>\s*([^\n<]+)/);
      return m ? m[1].trim() : null;
    },
  };
}
