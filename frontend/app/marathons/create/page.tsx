'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  ImagePlus,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import {
  AppShell,
  Badge,
  Button,
  Card,
  Input,
  PageHeader,
  Textarea,
  TierBadge,
  playSound,
  toast,
} from '@/components/ui';
import { MarathonCover } from '@/components/marathon-cover';
import {
  COVER_PRESETS,
  CURATORS,
  formatStartDate,
  readCoverImage,
  saveStoredMarathon,
  type StoredMarathon,
} from '@/lib/marathons';
import { cn } from '@/lib/utils';

const ICON_OPTIONS = [
  { id: 'flame', label: 'Огонь' },
  { id: 'sunrise', label: 'Утро' },
  { id: 'brain', label: 'Фокус' },
  { id: 'dumbbell', label: 'Спорт' },
  { id: 'book', label: 'Чтение' },
  { id: 'phone', label: 'Детокс' },
  { id: 'wallet', label: 'Финансы' },
];

export default function CreateMarathonPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [duration, setDuration] = useState('21 день');
  const [tier, setTier] = useState<'pro' | 'premium'>('premium');
  const [cover, setCover] = useState(COVER_PRESETS[0]);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [icon, setIcon] = useState('flame');
  const [limit, setLimit] = useState('100');
  const [curator, setCurator] = useState(CURATORS[0]);
  const [tasks, setTasks] = useState<string[]>(['Подъём в 6:00', 'Зарядка 15 минут']);
  const [taskDraft, setTaskDraft] = useState('');
  const [published, setPublished] = useState(false);
  const [uploading, setUploading] = useState(false);

  const addTask = () => {
    if (!taskDraft.trim()) return;
    setTasks((prev) => [...prev, taskDraft.trim()]);
    setTaskDraft('');
    playSound('click');
  };

  const pickCover = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const data = await readCoverImage(file);
      setCoverImage(data);
      playSound('spark');
      toast('Обложка загружена', { description: file.name, tone: 'success' });
    } catch {
      toast('Не удалось загрузить изображение', {
        description: 'Выберите JPG или PNG до 10 МБ',
        tone: 'danger',
      });
    } finally {
      setUploading(false);
    }
  };

  const submit = () => {
    if (!title.trim()) return;
    const marathon: StoredMarathon = {
      id: `local-${Date.now()}`,
      title: title.trim(),
      description:
        description.trim() ||
        'Новый марафон с заданиями, поддержкой куратора и общим кругом участников.',
      start_date: formatStartDate(startDate),
      tier,
      participants_count: 0,
      tasks_count: tasks.length,
      cover: cover.cover,
      accent: cover.accent,
      icon,
      curator: `Куратор: ${curator}`,
      duration,
      limit: Number(limit) || 100,
      cover_image: coverImage,
      tasks,
      created_at: new Date().toISOString(),
    };
    saveStoredMarathon(marathon);
    setPublished(true);
    playSound('levelup');
    toast('Марафон создан', { description: marathon.title, tone: 'success' });
    window.setTimeout(() => router.push(`/marathons/${marathon.id}`), 650);
  };

  return (
    <AppShell>
      <div className="px-5 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-9">
        <Link
          href="/marathons"
          className="mb-5 inline-flex items-center gap-2 text-[11.5px] text-muted transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Назад к каталогу
        </Link>

        <PageHeader
          eyebrow={<Badge variant="premium">Для кураторов</Badge>}
          title="Новый марафон"
          subtitle="Обложка, дата старта, лимит участников, куратор и задания. После публикации марафон появится в каталоге."
        />

        <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
          <div className="space-y-5">
            <Card className="p-5 sm:p-6">
              <p className="label">Основное</p>
              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="marathon-title" className="mb-2 block text-[11.5px] text-white/60">
                    Название
                  </label>
                  <Input
                    id="marathon-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Например: Утренний подъём"
                  />
                </div>
                <div>
                  <label htmlFor="marathon-description" className="mb-2 block text-[11.5px] text-white/60">
                    Описание
                  </label>
                  <Textarea
                    id="marathon-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Что изменится за время марафона и для кого он создан"
                    className="h-24"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="marathon-start" className="mb-2 block text-[11.5px] text-white/60">
                      Дата старта
                    </label>
                    <Input
                      id="marathon-start"
                      type="date"
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                      className="[color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label htmlFor="marathon-limit" className="mb-2 block text-[11.5px] text-white/60">
                      Лимит участников
                    </label>
                    <Input
                      id="marathon-limit"
                      type="number"
                      min={1}
                      value={limit}
                      onChange={(event) => setLimit(event.target.value)}
                      placeholder="100"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="marathon-curator" className="mb-2 block text-[11.5px] text-white/60">
                      Куратор
                    </label>
                    <select
                      id="marathon-curator"
                      value={curator}
                      onChange={(event) => setCurator(event.target.value)}
                      className="input appearance-none [color-scheme:dark]"
                    >
                      {CURATORS.map((item) => (
                        <option key={item} value={item} className="bg-[#141416]">
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="marathon-duration" className="mb-2 block text-[11.5px] text-white/60">
                      Длительность
                    </label>
                    <select
                      id="marathon-duration"
                      value={duration}
                      onChange={(event) => setDuration(event.target.value)}
                      className="input appearance-none [color-scheme:dark]"
                    >
                      {['14 дней', '21 день', '30 дней', '6 недель', '8 недель', '12 недель'].map(
                        (item) => (
                          <option key={item} value={item} className="bg-[#141416]">
                            {item}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-[11.5px] text-white/60">Доступ</p>
                  <div className="flex gap-2">
                    {(['pro', 'premium'] as const).map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setTier(item)}
                        className={cn(
                          'flex-1 rounded-xl border px-3 py-2.5 text-[12px] transition-all',
                          tier === item
                            ? 'border-white/[0.22] bg-white/[0.07] text-white'
                            : 'border-white/[0.1] text-muted hover:border-white/[0.2] hover:text-white',
                        )}
                      >
                        {item === 'pro' ? 'Pro' : 'Premium'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <p className="label">Обложка</p>
                <span className="text-[10px] text-white/25">фото или готовый градиент</span>
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => {
                  void pickCover(event.target.files?.[0] || null);
                  event.target.value = '';
                }}
              />

              {coverImage ? (
                <div className="relative mt-4 overflow-hidden rounded-xl border border-white/[0.1]">
                  <MarathonCover image={coverImage} className="h-36 rounded-none border-0" />
                  <button
                    type="button"
                    onClick={() => setCoverImage(null)}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white/80 backdrop-blur transition-colors hover:text-white"
                    aria-label="Удалить обложку"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/[0.14] bg-white/[0.02] px-4 py-5 text-[11.5px] text-muted transition-colors hover:border-white/[0.24] hover:text-white disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="h-4 w-4" />
                )}
                {uploading ? 'Загружаем…' : coverImage ? 'Заменить фото' : 'Загрузить фото обложки'}
              </button>

              <p className="mt-4 text-[10px] uppercase tracking-[0.14em] text-white/25">
                Или выберите градиент
              </p>
              <div className="mt-2 grid grid-cols-5 gap-2">
                {COVER_PRESETS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setCover(item);
                      setCoverImage(null);
                      playSound('click');
                    }}
                    className={cn(
                      'relative h-12 overflow-hidden rounded-lg border bg-gradient-to-br transition-all',
                      cover.id === item.id && !coverImage
                        ? 'border-white/40'
                        : 'border-white/[0.08] hover:border-white/[0.2]',
                      item.cover,
                    )}
                    aria-label={`Градиент ${item.id}`}
                  >
                    {cover.id === item.id && !coverImage ? (
                      <span className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white text-bg">
                        <Check className="h-2 w-2" strokeWidth={3} />
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>

              <p className="mt-4 text-[10px] uppercase tracking-[0.14em] text-white/25">Иконка</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {ICON_OPTIONS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setIcon(item.id)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-[10.5px] transition-all',
                      icon === item.id
                        ? 'border-white/[0.22] bg-white/[0.07] text-white'
                        : 'border-white/[0.08] text-muted hover:text-white',
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </Card>

            <Card className="p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <p className="label">Задания</p>
                <span className="numeric text-[10.5px] text-muted">{tasks.length}</span>
              </div>
              <div className="mt-4 space-y-2">
                {tasks.map((task, index) => (
                  <div
                    key={`${task}-${index}`}
                    className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2.5"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/[0.1] text-[10px] text-white/40">
                      {index + 1}
                    </span>
                    <span className="flex-1 text-[12px] text-white/80">{task}</span>
                    <button
                      type="button"
                      onClick={() => setTasks((prev) => prev.filter((_, i) => i !== index))}
                      className="text-white/20 transition-colors hover:text-danger"
                      aria-label="Удалить задание"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <Input
                  value={taskDraft}
                  onChange={(event) => setTaskDraft(event.target.value)}
                  placeholder="Новое задание…"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addTask();
                    }
                  }}
                />
                <Button variant="ghost" size="icon" onClick={addTask} aria-label="Добавить задание">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </div>

          {/* Превью */}
          <div className="xl:sticky xl:top-6 xl:self-start">
            <Card className="overflow-hidden p-3">
              <p className="label px-2 pb-3 pt-2">Превью в каталоге</p>
              <MarathonCover
                icon={icon}
                cover={cover.cover}
                accent={cover.accent}
                image={coverImage}
              >
                <div className="absolute left-3 top-3 flex items-center gap-1.5">
                  <TierBadge tier={tier} />
                  <span className="rounded-full border border-white/[0.12] bg-black/40 px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-white/70 backdrop-blur">
                    {duration}
                  </span>
                </div>
                <div className="absolute inset-x-3 bottom-3 flex items-center justify-between text-[10px] text-white/60">
                  <span>Старт {formatStartDate(startDate)}</span>
                  <span>до {Number(limit) || 100} человек</span>
                </div>
              </MarathonCover>
              <div className="px-2 pb-2 pt-4">
                <h3 className="font-display text-[16px] font-bold text-white">
                  {title || 'Название марафона'}
                </h3>
                <p className="mt-1.5 text-[12px] leading-relaxed text-muted line-clamp-2">
                  {description || 'Короткое описание появится здесь.'}
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3 text-[10.5px] text-muted">
                  <span>{tasks.length} заданий</span>
                  <span>Куратор: {curator}</span>
                </div>
              </div>
            </Card>

            <div className="mt-4 space-y-2">
              <Button className="w-full" onClick={submit} disabled={!title.trim() || published}>
                {published ? (
                  <>
                    <Check className="h-4 w-4" /> Опубликовано
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Опубликовать марафон
                  </>
                )}
              </Button>
              <Button variant="ghost" className="w-full" href="/marathons">
                Отмена
              </Button>
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <ImagePlus className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
              <p className="text-[10.5px] leading-relaxed text-muted">
                Марафон сохранится в каталоге этого устройства и откроется сразу после публикации.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
