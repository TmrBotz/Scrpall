/**
 * HubDrive Extractor
 * ==================
 * URLs:
 *   https://hubdrive.space/file/XXXX
 *   https://hubdrive.dad/file/XXXX
 *   https://hubdrive.lol/file/XXXX
 *
 * Flow:
 *   HubDrive page → HubCloud URL → extractHubCloud() reuse
 */

import { getPage, parseHtml } from '../utils/fetch.js';
import { extractHubCloud } from './hubcloud.js';

export async function extractHubDrive(url) {
  // ── Step 1: HubDrive page se HubCloud URL nikalo ──────────────────────────
  const { html } = await getPage(url, {
    referer: 'https://www.google.com/',
  });

  const hubcloudUrl = getHubCloudUrl(html);
  if (!hubcloudUrl) {
    throw new Error(
      'HubCloud URL nahi mili HubDrive page se. ' +
      'Page structure change ho gaya hoga.'
    );
  }

  // ── Step 2: HubCloud extractor reuse ──────────────────────────────────────
  const result = await extractHubCloud(hubcloudUrl);

  return {
    ...result,
    hubcloud_url: hubcloudUrl,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getHubCloudUrl(html) {
  // Method A: Direct href with hubcloud domain
  const links = parseHtml(html).findAllHrefs(/hubcloud/i);
  if (links.length > 0) return links[0];

  // Method B: Regex in raw HTML
  const m = html.match(
    /(https?:\/\/hubcloud\.[a-z.]+\/drive\/[A-Za-z0-9]+)/i
  );
  if (m) return m[1];

  // Method C: JS redirect / window.location
  const jsM = html.match(
    /(?:location\.href|window\.location)\s*=\s*["'](https?:\/\/hubcloud\.[^"']+)["']/
  );
  if (jsM) return jsM[1];

  return null;
}
