export const PRODUCT_SLUG = 'cookbook-print-run';
export const PRICE = '$12';
export const BILLING_BASE = (import.meta.env.VITE_BILLING_BASE || 'https://api.sociobot.in').replace(/\/$/, '');
export const LICENSE_KEY = `sb_license:${PRODUCT_SLUG}`;
const VERDICT_KEY = `${LICENSE_KEY}:verdict`;
const ONE_DAY = 86_400_000;

interface CachedVerdict {
  valid: boolean;
  checkedAt: number;
  reason: string;
}

export interface LicenseState {
  token: string;
  unlocked: boolean;
  checked: boolean;
  reason: string;
}

function readVerdict(): CachedVerdict | null {
  try {
    const value = JSON.parse(localStorage.getItem(VERDICT_KEY) || 'null') as CachedVerdict | null;
    return value && typeof value.valid === 'boolean' && typeof value.checkedAt === 'number' ? value : null;
  } catch {
    return null;
  }
}

export function captureReturnedLicense(): boolean {
  const url = new URL(location.href);
  const token = url.searchParams.get('license')?.trim();
  if (!token) return false;
  localStorage.setItem(LICENSE_KEY, token);
  localStorage.removeItem(VERDICT_KEY);
  url.searchParams.delete('license');
  history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  return true;
}

export function getCachedLicenseState(): LicenseState {
  const token = localStorage.getItem(LICENSE_KEY)?.trim() || '';
  const verdict = readVerdict();
  return {
    token,
    unlocked: Boolean(token && verdict?.valid),
    checked: Boolean(verdict),
    reason: verdict?.reason || ''
  };
}

export async function verifyLicense(force = false): Promise<LicenseState> {
  const token = localStorage.getItem(LICENSE_KEY)?.trim() || '';
  if (!token) return { token: '', unlocked: false, checked: false, reason: '' };
  const cached = readVerdict();
  if (!force && cached && Date.now() - cached.checkedAt < ONE_DAY) return getCachedLicenseState();
  try {
    const endpoint = `${BILLING_BASE}/api/v1/products/${PRODUCT_SLUG}/verify?license=${encodeURIComponent(token)}`;
    const response = await fetch(endpoint, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('verification unavailable');
    const result = await response.json() as { valid?: boolean; reason?: string };
    const verdict: CachedVerdict = {
      valid: result.valid === true,
      reason: result.reason || (result.valid ? 'ok' : 'invalid'),
      checkedAt: Date.now()
    };
    localStorage.setItem(VERDICT_KEY, JSON.stringify(verdict));
    return getCachedLicenseState();
  } catch {
    return { ...getCachedLicenseState(), reason: 'offline' };
  }
}

export function storeLicense(token: string): void {
  localStorage.setItem(LICENSE_KEY, token.trim());
  localStorage.removeItem(VERDICT_KEY);
}

export function clearLicense(): void {
  localStorage.removeItem(LICENSE_KEY);
  localStorage.removeItem(VERDICT_KEY);
}

export const checkoutUrl = `${BILLING_BASE}/api/v1/products/${PRODUCT_SLUG}/checkout`;
