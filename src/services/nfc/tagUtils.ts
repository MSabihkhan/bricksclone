export function normalizeTagId(raw: string): string {
  if (!raw) return '';
  let normalized = raw.replace(/\s+/g, '');
  
  if (normalized.toLowerCase().startsWith('0x')) {
    normalized = normalized.slice(2);
  }
  
  normalized = normalized.replace(/[:.\-]/g, '').toUpperCase();
  return normalized;
}

export function isValidTagId(id: string): boolean {
  const normalized = normalizeTagId(id);
  return /^[0-9A-F]{4,64}$/.test(normalized);
}

export function formatTagId(id: string): string {
  const normalized = normalizeTagId(id);
  if (!normalized) return '';
  
  const chunks = normalized.match(/.{1,4}/g);
  return chunks ? `BRK-${chunks.join('-')}` : normalized;
}

export function isRegisteredTag(tagId: string, registeredTagIds: string[]): boolean {
  const normalized = normalizeTagId(tagId);
  if (!normalized) return false;
  return registeredTagIds.some(registered => normalizeTagId(registered) === normalized);
}
