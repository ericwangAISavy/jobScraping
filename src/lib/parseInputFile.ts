export const MAX_SOURCES = 100;
export const MAX_FILE_SIZE = 1024 * 1024;
export function normalizeUrl(value: string, base?: string): string {
  const url = new URL(value, base);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Only HTTP and HTTPS URLs without credentials are allowed.');
  url.hash = '';
  return url.href;
}
export function parseInputFile(text: string): { urls: string[]; errors: string[] } {
  const urls = new Set<string>();
  const errors: string[] = [];
  text.replace(/^\uFEFF/, '').split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return;
    try { urls.add(normalizeUrl(line.trim())); }
    catch { errors.push(`Line ${i + 1}: Invalid careers page URL.`); }
  });
  if (urls.size > MAX_SOURCES) errors.push(`Upload at most ${MAX_SOURCES} unique URLs.`);
  return { urls: [...urls], errors };
}
