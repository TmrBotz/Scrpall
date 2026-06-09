/**
 * Multi-Site Download Extractor — Cloudflare Worker
 * ==================================================
 * CF Worker ke andar fetch() run hota hai Cloudflare ke
 * apne network se — isliye Cloudflare-protected sites
 * block nahi karti (same network trust).
 *
 * Naya site add karna:
 *   1. extractors/ mein naya file banao
 *   2. SITE_REGISTRY mein register karo (neeche)
 */

import { extractHubCloud } from './extractors/hubcloud.js';
import { extractHubDrive } from './extractors/hubdrive.js';
// import { extractNewSite } from './extractors/newsite.js';

// ── Site Registry ─────────────────────────────────────────────────────────────
const SITE_REGISTRY = [
  { keyword: 'hubdrive', handler: extractHubDrive },  // HubDrive pehle (specific)
  { keyword: 'hubcloud', handler: extractHubCloud },  // HubCloud baad mein
  // { keyword: 'newsite',  handler: extractNewSite  },
];

// ── CORS Headers ──────────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

// ── Main Handler ──────────────────────────────────────────────────────────────
export default {
  async fetch(request) {
    // OPTIONS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(request.url);

    // ── Routes ────────────────────────────────────────────────────────────────
    if (url.pathname === '/') {
      return jsonResponse({
        status: 'running',
        supported_sites: SITE_REGISTRY.map(s => s.keyword),
        usage: '/extract?url=YOUR_URL',
        docs: '/sites',
      });
    }

    if (url.pathname === '/sites') {
      return jsonResponse({
        sites: SITE_REGISTRY.map(s => ({
          keyword: s.keyword,
          handler: s.handler.name,
        })),
      });
    }

    if (url.pathname === '/extract') {
      const targetUrl = url.searchParams.get('url');

      if (!targetUrl) {
        return jsonResponse({ error: 'url parameter required' }, 400);
      }

      // Site detect karo
      const site = SITE_REGISTRY.find(s =>
        targetUrl.toLowerCase().includes(s.keyword)
      );

      if (!site) {
        return jsonResponse({
          error: 'Site not supported',
          supported_sites: SITE_REGISTRY.map(s => s.keyword),
          your_url: targetUrl,
        }, 400);
      }

      try {
        const result = await site.handler(targetUrl);
        return jsonResponse({
          success: true,
          site: site.keyword,
          input_url: targetUrl,
          ...result,
        });
      } catch (err) {
        return jsonResponse({
          success: false,
          error: err.message,
          site: site.keyword,
          input_url: targetUrl,
        }, 500);
      }
    }

    return jsonResponse({ error: 'Route not found' }, 404);
  },
};

// ── Helper ────────────────────────────────────────────────────────────────────
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: CORS,
  });
}
