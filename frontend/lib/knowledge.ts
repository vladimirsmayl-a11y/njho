import raw from '@/content/knowledge.json';

export type KnowledgeCategoryId =
  | 'habits'
  | 'discipline'
  | 'mind'
  | 'progress'
  | 'goals'
  | 'focus'
  | 'identity'
  | 'recovery'
  | 'system'
  | 'mastery';

export type KnowledgeArticle = {
  id: string;
  n: number;
  title: string;
  category: KnowledgeCategoryId;
  body: string;
  practical: boolean;
  read_time: string;
  excerpt: string;
};

export type KnowledgeCategory = {
  id: KnowledgeCategoryId;
  title: string;
  description: string;
  /** Градиент обложки: тёмная основа + акцент категории. */
  gradient: string;
  accent: string;
};

export const KNOWLEDGE_CATEGORIES: KnowledgeCategory[] = [
  {
    id: 'habits',
    title: 'Привычки',
    description: 'Как действие становится автоматическим и выдерживает плохие дни.',
    gradient: 'from-[#A8FF35]/[0.22] via-[#16200c] to-[#0a0a0a]',
    accent: '#A8FF35',
  },
  {
    id: 'discipline',
    title: 'Дисциплина',
    description: 'Система вместо вспышек мотивации.',
    gradient: 'from-[#FF5A36]/[0.18] via-[#1d100c] to-[#0a0a0a]',
    accent: '#FF5A36',
  },
  {
    id: 'mind',
    title: 'Мышление',
    description: 'Мысли, интерпретации и внутренний диалог.',
    gradient: 'from-[#B388FF]/[0.18] via-[#150f1f] to-[#0a0a0a]',
    accent: '#B388FF',
  },
  {
    id: 'progress',
    title: 'Прогресс',
    description: 'Как двигаться вперёд без рывков и выгорания.',
    gradient: 'from-[#7FC8FF]/[0.18] via-[#0b141b] to-[#0a0a0a]',
    accent: '#7FC8FF',
  },
  {
    id: 'goals',
    title: 'Цели',
    description: 'От намерения к конкретному плану.',
    gradient: 'from-[#FFD166]/[0.16] via-[#1a1509] to-[#0a0a0a]',
    accent: '#FFD166',
  },
  {
    id: 'focus',
    title: 'Фокус',
    description: 'Внимание, среда и глубокая работа.',
    gradient: 'from-[#66E3C4]/[0.16] via-[#0a1916] to-[#0a0a0a]',
    accent: '#66E3C4',
  },
  {
    id: 'identity',
    title: 'Личность',
    description: 'Самооценка, честность и свои цели.',
    gradient: 'from-[#FF9EC4]/[0.16] via-[#1c0f15] to-[#0a0a0a]',
    accent: '#FF9EC4',
  },
  {
    id: 'recovery',
    title: 'Восстановление',
    description: 'Сон, тело и ресурс для длинной дистанции.',
    gradient: 'from-[#9AA8FF]/[0.18] via-[#0f1120] to-[#0a0a0a]',
    accent: '#9AA8FF',
  },
  {
    id: 'system',
    title: 'Система',
    description: 'Планы, среда и маленькие шаги.',
    gradient: 'from-[#C7C7CC]/[0.16] via-[#161618] to-[#0a0a0a]',
    accent: '#C7C7CC',
  },
  {
    id: 'mastery',
    title: 'Мастерство',
    description: 'Практика, обратная связь и рост.',
    gradient: 'from-[#FFB86B]/[0.16] via-[#1b1208] to-[#0a0a0a]',
    accent: '#FFB86B',
  },
];

export const knowledgeArticles = (raw as { articles: KnowledgeArticle[] }).articles;

const CATEGORY_BY_ID = new Map(KNOWLEDGE_CATEGORIES.map((category) => [category.id, category]));

export function categoryOf(article: KnowledgeArticle): KnowledgeCategory {
  return CATEGORY_BY_ID.get(article.category) ?? KNOWLEDGE_CATEGORIES[0];
}

export function categoryCount(id: KnowledgeCategoryId): number {
  return knowledgeArticles.filter((article) => article.category === id).length;
}

export function getArticle(id: string): KnowledgeArticle | undefined {
  return knowledgeArticles.find((article) => article.id === id);
}

export function relatedArticles(article: KnowledgeArticle, limit = 3): KnowledgeArticle[] {
  const same = knowledgeArticles.filter(
    (item) => item.id !== article.id && item.category === article.category,
  );
  if (same.length >= limit) return same.slice(0, limit);
  const others = knowledgeArticles.filter(
    (item) => item.id !== article.id && item.category !== article.category,
  );
  return [...same, ...others].slice(0, limit);
}

export function searchArticles(query: string, category: KnowledgeCategoryId | null): KnowledgeArticle[] {
  const q = query.trim().toLowerCase();
  return knowledgeArticles.filter((article) => {
    if (category && article.category !== category) return false;
    if (!q) return true;
    return (
      article.title.toLowerCase().includes(q) ||
      article.excerpt.toLowerCase().includes(q) ||
      article.body.toLowerCase().includes(q)
    );
  });
}

/** Практические статьи с чек-листами — отдельная подборка в «Привычках». */
export const practicalArticles = knowledgeArticles.filter((article) => article.practical);

export const knowledgeStats = {
  total: knowledgeArticles.length,
  practical: practicalArticles.length,
  categories: KNOWLEDGE_CATEGORIES.length,
};
