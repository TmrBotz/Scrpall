/**
 * HubCloud Extractor
 * ==================
 * URLs:
 *   https://hubcloud.foo/drive/XXXX
 *   https://hubcloud.club/drive/XXXX
 *
 * Flow:
 *   Step 1: HubCloud page → gamerxyt.com URL nikalo (JS var ya anchor)
 *   Step 2: gamerxyt.com  → final download links
 */

import { getPage, findJsVar, parseHtml } from '../utils/fetch.js';

export async function extractHubCloud(url) {
  // ── Step 1: HubCloud page ──────────────────────────────────────────────────
  const { html: html1 } = await getPage(url, {
    referer: 'https://www.google.com/',
  });

  const gamerxytUrl = getGamerxytUrl(html1, url);
  if (!gamerxytUrl) {
    throw new Error('gamerxyt.com URL nahi mili HubCloud page se');
  }

  // ── Step 2: Gamerxyt page ─────────────────────────────────────────────────
  const { html: html2 } = await getPage(gamerxytUrl, {
    referer: url,
  });

  const p = parseHtml(html2);

  return {
    filename:        p.cardHeaderText() || getTitle(html2),
    file_size:       p.innerText('size') || 'Unknown',
    share_date:      p.innerText('date') || 'Unknown',
    intermediate_url: gamerxytUrl,
    download_links:  getDownloadLinks(html2),
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getGamerxytUrl(html, pageUrl) {
  // Method A: var url = '...'
  const jsVar = findJsVar(html, 'url');
  if (jsVar && jsVar.includes('gamerxyt')) return jsVar;

  // Method B: <a id="download" href="...">
  const p = parseHtml(html);
  const anchor = p.findById('download', 'href');
  if (anchor && anchor.includes('gamerxyt')) return anchor;

  // Method C: any gamerxyt link in HTML
  const m = html.match(/(https:\/\/gamerxyt\.com\/hubcloud\.php[^\s"'<]+)/);
  return m ? m[1] : null;
}

function getTitle(html) {
  const m = html.match(/<title>([^<]+)<\/title>/i);
  return m ? m[1].trim() : 'Unknown';
}

function getDownloadLinks(html) {
  const links = [];
  const seen  = new Set();
  const now   = new Date().getMinutes();

  function add(server, url) {
    if (url && !seen.has(url) && url.startsWith('http')) {
      seen.add(url);
      links.push({ server, url });
    }
  }

  // ── FSLv2: id="s3", JS appends _1{minutes} ──
  const fslv2 = parseHtml(html).findById('s3', 'href');
  if (fslv2) add('FSLv2', fslv2 + `_1${now}`);

  // ── FSL: id="fsl", JS appends 1{minutes} ──
  const fsl = parseHtml(html).findById('fsl', 'href');
  if (fsl) add('FSL', fsl + `1${now}`);

  // ── 10Gbps: pixel.hubcloud.cx ──
  const gbps = html.match(/href=["'](https:\/\/pixel\.hubcloud\.cx[^"']+)["']/);
  if (gbps) add('10Gbps', gbps[1]);

  // ── PixelDrain: var pxl = "..." ──
  const pxl = html.match(/var pxl\s*=\s*["'](https:\/\/pixeldrain[^"']+)["']/);
  if (pxl) {
    add('PixelDrain', pxl[1]);
  } else {
    const pxlHtml = parseHtml(html).findById('pxl-1', 'href');
    if (pxlHtml) add('PixelDrain', pxlHtml);
  }

  // ── Telegram ──
  const tg = html.match(/href=["'](https:\/\/hubcloud\.[^"']*\/tg\/go[^"']+)["']/);
  if (tg) add('Telegram', tg[1]);

  // ── Fallback: sabhi btn links ──
  if (links.length === 0) {
    const re = /href=["'](https:\/\/[^"']+)["'][^>]*class=["'][^"']*btn[^"']*["']/g;
    let m;
    while ((m = re.exec(html)) !== null) {
      add('Server', m[1]);
    }
  }

  return links;
}
