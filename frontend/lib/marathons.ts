/* Марафоны, созданные пользователем. Хранятся локально и подмешиваются в каталог. */

export const MARATHONS_KEY = 'lvs:marathons';

export type StoredMarathon = {
  id: string;
  title: string;
  description: string;
  start_date: string;
  tier: 'pro' | 'premium';
  participants_count: number;
  tasks_count: number;
  cover: string;
  accent: string;
  icon: string;
  curator: string;
  duration: string;
  limit: number;
  cover_image?: string | null;
  tasks: string[];
  created_at: string;
};

export function loadStoredMarathons(): StoredMarathon[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(MARATHONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredMarathon[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredMarathon(marathon: StoredMarathon) {
  if (typeof window === 'undefined') return;
  const next = [marathon, ...loadStoredMarathons().filter((item) => item.id !== marathon.id)];
  try {
    window.localStorage.setItem(MARATHONS_KEY, JSON.stringify(next));
  } catch {
    /* переполнение хранилища */
  }
}

export function findStoredMarathon(id: string) {
  return loadStoredMarathons().find((item) => item.id === id) || null;
}

export const COVER_PRESETS = [
  { id: 'lime', cover: 'from-[#1b2a12] via-[#0f1a0a] to-[#0a0a0a]', accent: 'text-primary' },
  { id: 'graphite', cover: 'from-[#1a1a22] via-[#111116] to-[#0a0a0a]', accent: 'text-white' },
  { id: 'ember', cover: 'from-[#2a1612] via-[#1a0f0c] to-[#0a0a0a]', accent: 'text-[#FF8A65]' },
  { id: 'gold', cover: 'from-[#241d0e] via-[#171208] to-[#0a0a0a]', accent: 'text-premium' },
  { id: 'ocean', cover: 'from-[#101d24] via-[#0b1418] to-[#0a0a0a]', accent: 'text-[#4FC3F7]' },
];

export const CURATORS = [
  'Марина К.',
  'Илья Р.',
  'Анна В.',
  'Дмитрий С.',
  'Сергей Л.',
  'Ольга М.',
];

/** Сжимаем обложку до разумного размера, чтобы она поместилась в localStorage. */
export function readCoverImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('not_image'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read_failed'));
    reader.onload = () => {
      const src = String(reader.result);
      const image = new Image();
      image.onerror = () => reject(new Error('decode_failed'));
      image.onload = () => {
        const maxWidth = 1280;
        const scale = Math.min(1, maxWidth / image.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(src);
          return;
        }
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      image.src = src;
    };
    reader.readAsDataURL(file);
  });
}

export function formatStartDate(value: string) {
  if (!value) return 'Скоро';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(date);
}
