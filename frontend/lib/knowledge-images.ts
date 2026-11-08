/**
 * Генератор уникальных абстрактных 3D-изображений для статей базы знаний.
 * Стиль: тёмный фон, премиальные 3D-объекты, неоновый свет — как у обложек марафонов.
 * Каждой статье соответствует своё изображение, сгенерированное на основе категории и номера.
 */

type CategoryAccent = {
  accent: string; // неоновый цвет категории
  gradient: string; // фоновый градиент карточки
  objectColor: string; // цвет 3D-объекта
};

const CATEGORY_STYLE: Record<string, CategoryAccent> = {
  habits: { accent: '#A8FF35', gradient: 'from-[#16200c] via-[#0a0a0a] to-[#050505]', objectColor: '#A8FF35' },
  discipline: { accent: '#FF5A36', gradient: 'from-[#1d100c] via-[#0a0a0a] to-[#050505]', objectColor: '#FF5A36' },
  mind: { accent: '#B388FF', gradient: 'from-[#150f1f] via-[#0a0a0a] to-[#050505]', objectColor: '#B388FF' },
  progress: { accent: '#7FC8FF', gradient: 'from-[#0b141b] via-[#0a0a0a] to-[#050505]', objectColor: '#7FC8FF' },
  goals: { accent: '#FFD166', gradient: 'from-[#1a1509] via-[#0a0a0a] to-[#050505]', objectColor: '#FFD166' },
  focus: { accent: '#66E3C4', gradient: 'from-[#0a1916] via-[#0a0a0a] to-[#050505]', objectColor: '#66E3C4' },
  identity: { accent: '#FF9EC4', gradient: 'from-[#1c0f15] via-[#0a0a0a] to-[#050505]', objectColor: '#FF9EC4' },
  sleep: { accent: '#9AA8FF', gradient: 'from-[#0f1120] via-[#0a0a0a] to-[#050505]', objectColor: '#9AA8FF' },
  system: { accent: '#C7C7CC', gradient: 'from-[#161618] via-[#0a0a0a] to-[#050505]', objectColor: '#C7C7CC' },
};

/** Псевдо-случайное число на основе строки. */
function seededRandom(str: string, index = 0) {
  let hash = 0;
  const s = str + String(index);
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) / 0x7fffffff;
}

/** Случайное число в диапазоне [min, max]. */
function randRange(str: string, index: number, min: number, max: number) {
  return min + seededRandom(str, index) * (max - min);
}

/** Генерирует уникальное SVG-изображение для статьи базы знаний. */
export function generateKnowledgeImage(category: string, n: number, title: string): string {
  const style = CATEGORY_STYLE[category] || CATEGORY_STYLE.system;
  const seed = `${category}-${n}`;
  const accent = style.accent;
  const objectColor = style.objectColor;

  // Параметры композиции на основе семени статьи — уникально для каждой.
  const objCount = 3 + Math.floor(seededRandom(seed, 1) * 3); // 3–5 объектов
  const rotateX = randRange(seed, 2, 10, 30);
  const rotateY = randRange(seed, 3, -25, 25);
  const rotateZ = randRange(seed, 4, -15, 15);
  const lightX = randRange(seed, 5, 15, 85);
  const lightY = randRange(seed, 6, 10, 90);

  // Неоновое свечение объекта.
  const glow = `
    <defs>
      <radialGradient id="glow-${n}" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.9" />
        <stop offset="60%" stop-color="${accent}" stop-opacity="0.35" />
        <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
      </radialGradient>
      <filter id="blur-${n}" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="14" />
      </filter>
      <filter id="softBlur-${n}" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="26" />
      </filter>
    </defs>
  `;

  // Фоновый градиент карточки (аналогично обложкам марафонов).
  const bgGradient = `
    <rect width="100%" height="100%" rx="16" ry="16" fill="url(#bgGrad-${n})" />
    <defs>
      <linearGradient id="bgGrad-${n}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#141416" stop-opacity="0.85" />
        <stop offset="50%" stop-color="#0a0a0a" stop-opacity="0.9" />
        <stop offset="100%" stop-color="#0a0a0a" stop-opacity="1" />
      </linearGradient>
    </defs>
  `;

  // Генерация 3D-объектов (сферы, кубы, кольца, кристаллы) с неоновым светом.
  let objects = '';
  for (let i = 0; i < objCount; i++) {
    const size = randRange(seed, 10 + i, 28, 70);
    const x = randRange(seed, 20 + i, 12, 88);
    const y = randRange(seed, 30 + i, 12, 88);
    const z = randRange(seed, 40 + i, 40, 220);
    const opacity = randRange(seed, 50 + i, 0.14, 0.45);
    const hueRotate = randRange(seed, 60 + i, 0, 360);

    const shapeType = i % 4;
    let shape = '';
    switch (shapeType) {
      case 0: // сфера
        shape = `<circle cx="${x}" cy="${y}" r="${size / 2}" fill="${objectColor}" opacity="${opacity}" />`;
        break;
      case 1: // куб (прямоугольник с радиусом)
        shape = `<rect x="${x - size / 2}" y="${y - size / 2}" width="${size}" height="${size}" rx="8" ry="8" fill="${objectColor}" opacity="${opacity}" />`;
        break;
      case 2: // кольцо / эллипс
        shape = `<ellipse cx="${x}" cy="${y}" rx="${size / 2}" ry="${size / 4}" fill="none" stroke="${objectColor}" stroke-width="3" opacity="${opacity}" />`;
        break;
      case 3: // треугольник (кристалл)
        shape = `<polygon points="${x},${y - size / 2} ${x + size / 2},${y + size / 3} ${x - size / 2},${y + size / 3}" fill="${objectColor}" opacity="${opacity}" />`;
        break;
    }

    // Свечение вокруг каждого объекта.
    objects += `
      <g filter="url(#blur-${n})" transform="rotate(${rotateZ * (i + 1)}, ${x}, ${y})">
        ${shape}
        <circle cx="${x}" cy="${y}" r="${size * 1.6}" fill="url(#glow-${n})" opacity="0.35" />
      </g>
    `;
  }

  // Неоновое fontesque свечение от источника света.
  const lightGlow = `
    <circle cx="${lightX}%" cy="${lightY}%" r="420" fill="${accent}" opacity="0.12" filter="url(#softBlur-${n})" />
    <circle cx="${100 - lightX}%" cy="${100 - lightY}%" r="340" fill="${objectColor}" opacity="0.08" filter="url(#softBlur-${n})" />
  `;

  // Тонкая сетка для глубины (как на обложках).
  const grid = `
    <pattern id="grid-${n}" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1" />
    </pattern>
    <rect width="100%" height="100%" rx="16" ry="16" fill="url(#grid-${n})" />
  `;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
      ${glow}
      ${bgGradient}
      ${grid}
      ${lightGlow}
      ${objects}
      <!-- Декоративная тонкая линия-акцент -->
      <path d="M 40 360 L 560 360" stroke="${accent}" stroke-width="1.5" opacity="0.35" />
      <path d="M 40 40 L 560 40" stroke="${accent}" stroke-width="1" opacity="0.18" />
      <!-- Маленькие точки-звёзды -->
      <circle cx="80" cy="120" r="1.5" fill="white" opacity="0.6" />
      <circle cx="520" cy="280" r="1.5" fill="white" opacity="0.5" />
      <circle cx="310" cy="90" r="1.5" fill="${accent}" opacity="0.7" />
      <circle cx="450" cy="210" r="1.5" fill="${accent}" opacity="0.5" />
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
