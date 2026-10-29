const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode(length = 6) {
  let out = '';
  for (let index = 0; index < length; index += 1) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

/** Стабильный код приглашения для пользователя: генерируется один раз. */
export function inviteCode(username = 'alexey') {
  const key = `lvs:invite:${username}`;
  if (typeof window === 'undefined') return 'LVS2026';
  try {
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const next = generateCode();
    window.localStorage.setItem(key, next);
    return next;
  } catch {
    return generateCode();
  }
}

export function inviteLink(username = 'alexey', code?: string | null) {
  const value = (code || inviteCode(username)).toLowerCase();
  return `https://lvs.app/invite/${username}-${value}`;
}

/** Clipboard API + запасной путь для браузеров без разрешения. */
export async function copyText(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* пробуем запасной путь */
    }
  }
  if (typeof document === 'undefined') return false;
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}
