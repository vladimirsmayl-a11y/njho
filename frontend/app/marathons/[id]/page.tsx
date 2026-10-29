'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  ImagePlus,
  MessageSquare,
  Paperclip,
  Send,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  UserPlus,
  Users,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AppShell,
  Avatar,
  Badge,
  Button,
  Card,
  Modal,
  Progress,
  Textarea,
  TierBadge,
  playSound,
  toast,
} from '@/components/ui';
import { MarathonCover } from '@/components/marathon-cover';
import { api, body, errorText } from '@/lib/api';
import { demoMarathonTasks, demoMarathons, demoMessages } from '@/lib/demo';
import { findStoredMarathon, formatStartDate } from '@/lib/marathons';
import { cn } from '@/lib/utils';

type TaskStatus = 'open' | 'review' | 'done';

type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  due_on?: string | null;
  comment?: string | null;
  hasImage?: boolean;
};

type MarathonView = (typeof demoMarathons)[number] & {
  cover_image?: string | null;
  limit?: number;
  tasks?: string[];
  joined?: boolean;
  members?: number;
  ends_on?: string;
};

type Message = {
  id: string;
  sender_name: string;
  text: string;
  created_at: string;
  is_me: boolean;
  avatar_url?: string | null;
  image_url?: string | null;
  pending?: boolean;
};

type RemoteTask = {
  id: number;
  title: string;
  description: string;
  due_on?: string | null;
  status: 'open' | 'pending' | 'approved' | 'rejected';
  comment?: string | null;
  has_image?: boolean;
};

type RemoteMarathon = {
  id: number;
  title: string;
  description: string;
  starts_on: string;
  ends_on: string;
  premium_only: boolean;
  status: string;
  joined: boolean;
  members: number;
  tasks: RemoteTask[];
};

type RawMessage = {
  id: number | string;
  sender_name?: string;
  text?: string;
  created_at?: string;
  is_me?: boolean;
  avatar_url?: string | null;
  image_url?: string | null;
};

const statusMeta: Record<TaskStatus, { label: string; variant: 'free' | 'premium' | 'pro'; icon: React.ElementType }> = {
  open: { label: 'Открыто', variant: 'free', icon: Clock },
  review: { label: 'На проверке', variant: 'premium', icon: Clock },
  done: { label: 'Выполнено', variant: 'pro', icon: CheckCircle2 },
};

function taskStatus(status: RemoteTask['status']): TaskStatus {
  if (status === 'approved') return 'done';
  if (status === 'pending') return 'review';
  return 'open';
}

function normalizeTask(task: RemoteTask): Task {
  return {
    id: String(task.id),
    title: task.title,
    description: task.description,
    status: taskStatus(task.status),
    due_on: task.due_on,
    comment: task.comment,
    hasImage: task.has_image,
  };
}

function chatTime(value?: string | null) {
  if (!value) return '';
  if (/^\d{1,2}:\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function normalizeMessage(raw: RawMessage): Message {
  return {
    id: String(raw.id),
    sender_name: raw.sender_name || 'Участник',
    text: raw.text || '',
    created_at: chatTime(raw.created_at),
    is_me: Boolean(raw.is_me),
    avatar_url: raw.avatar_url ?? null,
    image_url: raw.image_url ?? null,
    pending: false,
  };
}

function mergeIncoming(prev: Message[], incoming: Message): Message[] {
  if (prev.some((message) => message.id === incoming.id)) return prev;
  const pendingIndex = prev.findIndex(
    (message) =>
      message.pending &&
      message.is_me &&
      (incoming.text ? message.text === incoming.text : Boolean(message.image_url)),
  );
  if (pendingIndex >= 0) {
    const next = [...prev];
    next[pendingIndex] = incoming;
    return next;
  }
  return [...prev, incoming];
}

function isRemoteId(id: string) {
  return /^\d+$/.test(id);
}

/** WebSocket-адрес чата: env для деплоя, локально — напрямую к FastAPI. */
function chatSocketUrl(marathonId: string) {
  const explicit = process.env.NEXT_PUBLIC_WS_URL;
  if (explicit) {
    return `${explicit.replace(/\/+$/, '')}/marathons/${marathonId}/chat/ws`;
  }
  if (typeof window === 'undefined') return '';
  const { protocol, hostname, host, port } = window.location;
  if ((hostname === 'localhost' || hostname === '127.0.0.1') && port === '3000') {
    return `ws://${hostname}:8000/marathons/${marathonId}/chat/ws`;
  }
  return `${protocol === 'https:' ? 'wss:' : 'ws:'}//${host}/api/marathons/${marathonId}/chat/ws`;
}

export default function MarathonDetailPage({ params }: { params: { id: string } }) {
  const fallbackMarathon = demoMarathons.find((item) => item.id === params.id) || demoMarathons[0];
  const [marathon, setMarathon] = useState<MarathonView>({
    ...fallbackMarathon,
    joined: true,
  });
  const [tasks, setTasks] = useState<Task[]>(() =>
    params.id === fallbackMarathon.id ? (demoMarathonTasks as Task[]) : [],
  );
  const [messages, setMessages] = useState<Message[]>(() =>
    params.id === fallbackMarathon.id ? (demoMessages as Message[]) : [],
  );
  const [input, setInput] = useState('');
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [answer, setAnswer] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [attachPreview, setAttachPreview] = useState<string | null>(null);
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [joining, setJoining] = useState(false);
  const [socketState, setSocketState] = useState<'connecting' | 'open' | 'fallback'>('connecting');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesBoxRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatFileRef = useRef<HTMLInputElement>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<number | null>(null);

  const remoteId = isRemoteId(params.id);
  const joined = marathon.joined !== false;

  const applyIncoming = useCallback((raw: RawMessage) => {
    setMessages((prev) => mergeIncoming(prev, normalizeMessage(raw)));
  }, []);

  const loadMarathon = useCallback(async () => {
    if (!remoteId) return;
    try {
      const remote = await api<RemoteMarathon>(`/marathons/${params.id}`);
      setMarathon((prev) => ({
        ...prev,
        id: params.id,
        title: remote.title,
        description: remote.description,
        start_date: formatStartDate(remote.starts_on),
        ends_on: remote.ends_on,
        participants_count: remote.members,
        members: remote.members,
        tasks_count: remote.tasks.length,
        joined: remote.joined,
        tier: remote.premium_only ? 'premium' : 'pro',
        curator: remote.premium_only ? 'Куратор: только Premium' : 'Куратор: открытый марафон',
      }));
      setTasks(remote.tasks.map(normalizeTask));
    } catch {
      /* остаёмся на демо-состоянии */
    }
  }, [params.id, remoteId]);

  useEffect(() => {
    const stored = findStoredMarathon(params.id);
    if (stored) {
      const base = demoMarathons.find((item) => item.id === params.id) || demoMarathons[0];
      setMarathon({ ...base, ...stored, joined: true });
      if (stored.tasks.length) {
        setTasks(
          stored.tasks.map((title, index) => ({
            id: `st-${index}`,
            title,
            description: 'Задание куратора. Отметьте выполнение, когда закончите.',
            status: 'open' as TaskStatus,
          })),
        );
      }
    }
  }, [params.id]);

  useEffect(() => {
    void loadMarathon();
  }, [loadMarathon]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  /* ---------- Чат: WebSocket + REST-фолбэк ---------- */
  useEffect(() => {
    if (!joined) {
      setSocketState('fallback');
      return;
    }

    let alive = true;
    let poll: number | null = null;

    const stopPolling = () => {
      if (poll !== null) {
        window.clearInterval(poll);
        poll = null;
      }
    };

    const pullHistory = async () => {
      try {
        const rows = await api<RawMessage[]>(`/marathons/${params.id}/chat?limit=80`);
        if (alive && Array.isArray(rows)) {
          setMessages((prev) => {
            const localPending = prev.filter((message) => message.pending);
            return [...rows.map(normalizeMessage), ...localPending];
          });
        }
      } catch {
        /* фолбэк остаётся локальным */
      }
    };

    const startPolling = () => {
      if (poll !== null) return;
      poll = window.setInterval(() => void pullHistory(), 4000);
    };

    const connect = () => {
      if (!alive || typeof window === 'undefined') return;
      const url = chatSocketUrl(params.id);
      if (!url) return;
      const socket = new WebSocket(url);
      socketRef.current = socket;
      setSocketState('connecting');

      socket.onopen = () => {
        if (!alive) {
          socket.close();
          return;
        }
        setSocketState('open');
        stopPolling();
      };

      socket.onmessage = (event) => {
        if (!alive) return;
        try {
          const data = JSON.parse(event.data) as {
            type?: string;
            messages?: RawMessage[];
            message?: RawMessage;
            id?: number | string;
          };
          if (data.type === 'history' && Array.isArray(data.messages)) {
            setMessages((prev) => {
              const localPending = prev.filter((message) => message.pending);
              return [...data.messages!.map(normalizeMessage), ...localPending];
            });
          } else if (data.type === 'message' && data.message) {
            applyIncoming(data.message);
          } else if (data.type === 'delete' && data.id !== undefined) {
            setMessages((prev) => prev.filter((message) => message.id !== String(data.id)));
          }
        } catch {
          /* игнорируем некорректный кадр */
        }
      };

      socket.onerror = () => {
        if (alive) setSocketState('fallback');
      };

      socket.onclose = () => {
        if (!alive) return;
        setSocketState('fallback');
        startPolling();
        if (reconnectRef.current !== null) window.clearTimeout(reconnectRef.current);
        reconnectRef.current = window.setTimeout(() => {
          reconnectRef.current = null;
          connect();
        }, 7000);
      };
    };

    void pullHistory();
    connect();

    return () => {
      alive = false;
      stopPolling();
      if (reconnectRef.current !== null) {
        window.clearTimeout(reconnectRef.current);
        reconnectRef.current = null;
      }
      const socket = socketRef.current;
      socketRef.current = null;
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
    };
  }, [applyIncoming, joined, params.id]);

  const doneCount = tasks.filter((task) => task.status === 'done').length;
  const reviewCount = tasks.filter((task) => task.status === 'review').length;
  const progress = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;

  const joinMarathon = async () => {
    if (!remoteId) {
      setMarathon((prev) => ({ ...prev, joined: true }));
      return;
    }
    setJoining(true);
    try {
      await api(`/marathons/${params.id}/join`, { method: 'POST' });
      await loadMarathon();
      playSound('levelup');
      toast('Вы в марафоне', { description: 'Задания и чат открыты', tone: 'success' });
    } catch (error) {
      toast('Не удалось вступить', { description: errorText(error), tone: 'danger' });
    } finally {
      setJoining(false);
    }
  };

  const openSubmit = (task: Task) => {
    if (task.status === 'review') return;
    if (!joined) {
      toast('Сначала вступите в марафон', { tone: 'danger' });
      return;
    }
    setActiveTask(task);
    setAnswer('');
    setFile(null);
    setPreview(null);
  };

  const pickFile = (next: File | null) => {
    if (!next) return;
    if (!next.type.startsWith('image/')) {
      toast('Нужно изображение', { tone: 'danger' });
      return;
    }
    if (next.size > 3_000_000) {
      toast('Файл больше 3 МБ', { tone: 'danger' });
      return;
    }
    setFile(next);
    setPreview(URL.createObjectURL(next));
    playSound('click');
  };

  const submitTask = async () => {
    if (!activeTask || submitting) return;
    if (!answer.trim() && !file) return;
    setSubmitting(true);
    try {
      if (remoteId) {
        await api(`/marathons/${params.id}/tasks/${activeTask.id}/report`, {
          method: 'POST',
          body: body({ text: answer.trim() }),
        });
        if (file) {
          const form = new FormData();
          form.append('file', file);
          await api(`/marathons/${params.id}/tasks/${activeTask.id}/report/photo`, {
            method: 'POST',
            body: form,
          });
        }
      }
      setTasks((prev) =>
        prev.map((task) =>
          task.id === activeTask.id ? { ...task, status: 'review' as TaskStatus } : task,
        ),
      );
      setActiveTask(null);
      setAnswer('');
      setFile(null);
      setPreview(null);
      playSound('spark');
      toast('Отчёт отправлен', { description: 'Куратор проверит в течение дня', tone: 'success' });
    } catch (error) {
      toast('Не удалось отправить отчёт', { description: errorText(error), tone: 'danger' });
    } finally {
      setSubmitting(false);
    }
  };

  const sendText = async () => {
    const text = input.trim();
    if (!text || sending || !joined) return;
    const local: Message = {
      id: `local-${Date.now()}`,
      sender_name: 'Вы',
      text,
      created_at: chatTime(new Date().toISOString()),
      is_me: true,
      avatar_url: null,
      pending: true,
    };
    setMessages((prev) => [...prev, local]);
    setInput('');
    setSending(true);
    playSound('click');
    try {
      const socket = socketRef.current;
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ text }));
      } else {
        const sent = await api<RawMessage>(`/marathons/${params.id}/chat`, {
          method: 'POST',
          body: body({ text }),
        });
        applyIncoming(sent);
      }
    } catch (error) {
      setMessages((prev) => prev.filter((message) => message.id !== local.id));
      setInput(text);
      toast('Сообщение не отправлено', { description: errorText(error), tone: 'danger' });
    } finally {
      setSending(false);
    }
  };

  const sendPhoto = async (nextFile: File) => {
    if (!joined || sending) return;
    const previewUrl = URL.createObjectURL(nextFile);
    const local: Message = {
      id: `local-photo-${Date.now()}`,
      sender_name: 'Вы',
      text: '',
      created_at: chatTime(new Date().toISOString()),
      is_me: true,
      avatar_url: null,
      image_url: previewUrl,
      pending: true,
    };
    setMessages((prev) => [...prev, local]);
    setSending(true);
    setAttachFile(null);
    setAttachPreview(null);
    try {
      const form = new FormData();
      form.append('file', nextFile);
      const sent = await api<RawMessage>(`/marathons/${params.id}/chat/photo`, {
        method: 'POST',
        body: form,
      });
      applyIncoming(sent);
      playSound('spark');
    } catch (error) {
      setMessages((prev) => prev.filter((message) => message.id !== local.id));
      toast('Фото не отправлено', { description: errorText(error), tone: 'danger' });
    } finally {
      setSending(false);
    }
  };

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (attachFile) {
      await sendPhoto(attachFile);
      return;
    }
    await sendText();
  };

  const chatMessages = useMemo(() => messages, [messages]);
  const participants = marathon.members ?? marathon.participants_count ?? 0;

  return (
    <AppShell wide>
      <div className="px-5 py-6 sm:px-7 sm:py-8 lg:px-8 lg:py-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/marathons"
            className="inline-flex items-center gap-2 text-[11.5px] text-muted transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Все марафоны
          </Link>
          <div className="flex items-center gap-2">
            <Badge variant="pro">
              <ShieldCheck className="h-2.5 w-2.5" /> Проверяет куратор
            </Badge>
            {!joined ? (
              <Badge variant="premium">
                <UserPlus className="h-2.5 w-2.5" /> вступление открыто
              </Badge>
            ) : null}
            {marathon.limit ? (
              <Badge variant="free">
                <Users className="h-2.5 w-2.5" /> до {marathon.limit}
              </Badge>
            ) : null}
          </div>
        </div>

        <Card className="relative mb-5 overflow-hidden p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <MarathonCover
              icon={marathon.icon}
              cover={marathon.cover}
              accent={marathon.accent}
              image={marathon.cover_image}
              size="sm"
              className="w-full shrink-0 lg:w-48"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <TierBadge tier={marathon.tier} />
                <span className="flex items-center gap-1 text-[10px] text-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-white/50" />
                  {tasks.length ? `День 1 из ${tasks.length}` : 'Программа'}
                </span>
              </div>
              <h1 className="mt-2 font-display text-[26px] font-extrabold leading-tight tracking-[-0.03em] text-white sm:text-[32px]">
                {marathon.title}
              </h1>
              <p className="mt-1.5 max-w-2xl text-[12.5px] leading-relaxed text-muted">
                {marathon.description}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" /> Старт {marathon.start_date}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="h-3 w-3" /> {participants.toLocaleString('ru-RU')} участников
                </span>
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-premium" /> {marathon.curator}
                </span>
              </div>
              {!joined ? (
                <Button className="mt-4" size="sm" onClick={() => void joinMarathon()} disabled={joining}>
                  <UserPlus className="h-3.5 w-3.5" /> {joining ? 'Вступаем…' : 'Вступить в марафон'}
                </Button>
              ) : null}
            </div>
            <div className="w-full shrink-0 lg:w-52">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10.5px] text-muted">Ваш прогресс</span>
                <span className="numeric text-[12px] font-semibold text-white">{progress}%</span>
              </div>
              <Progress value={progress} />
              <div className="mt-2.5 flex items-center gap-3 text-[10px] text-muted">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-2.5 w-2.5 text-white/70" /> {doneCount} готово
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5 text-premium" /> {reviewCount} на проверке
                </span>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-5 xl:grid-cols-[1fr_1.05fr]">
          {/* Задания */}
          <Card className="flex min-h-0 flex-col p-4 sm:p-5 xl:min-h-[560px]">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <p className="label">Задания куратора</p>
                <h2 className="mt-1.5 font-display text-lg font-bold tracking-[-0.02em] text-white">
                  Путь марафона
                </h2>
              </div>
              <span className="numeric text-[11px] text-muted">
                {doneCount}/{tasks.length}
              </span>
            </div>

            <div className="flex-1 space-y-2.5 overflow-y-auto pr-1">
              {tasks.map((task, index) => {
                const meta = statusMeta[task.status];
                const StatusIcon = meta.icon;
                const isDone = task.status === 'done';
                const isReview = task.status === 'review';
                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04, duration: 0.3 }}
                    className={cn(
                      'rounded-2xl border p-3.5 transition-colors',
                      isDone
                        ? 'border-white/[0.16] bg-white/[0.04]'
                        : isReview
                          ? 'border-premium/15 bg-premium/[0.03]'
                          : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.14]',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold',
                          isDone
                            ? 'border-white bg-white text-bg'
                            : 'border-white/[0.14] bg-white/[0.03] text-white/50',
                        )}
                      >
                        {isDone ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p
                            className={cn(
                              'text-[12.5px] font-semibold',
                              isDone ? 'text-white/45 line-through' : 'text-white',
                            )}
                          >
                            {task.title}
                          </p>
                          <Badge variant={meta.variant}>
                            <StatusIcon className="h-2.5 w-2.5" />
                            {meta.label}
                          </Badge>
                        </div>
                        <p className="mt-1 text-[11px] leading-relaxed text-muted">{task.description}</p>
                        {task.comment ? (
                          <p className="mt-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-1.5 text-[10px] text-muted">
                            Куратор: {task.comment}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 pl-10">
                      <span className="text-[9.5px] uppercase tracking-[0.14em] text-white/20">
                        {task.due_on ? `До ${task.due_on}` : 'Без дедлайна'}
                      </span>
                      {isDone ? (
                        <span className="text-[10.5px] text-white/60">Зачтено</span>
                      ) : isReview ? (
                        <span className="text-[10.5px] text-premium/80">Ждёт проверки</span>
                      ) : (
                        <Button size="sm" variant="soft" onClick={() => openSubmit(task)}>
                          Выполнить
                        </Button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
              {!tasks.length ? (
                <div className="rounded-2xl border border-dashed border-white/[0.1] px-4 py-10 text-center">
                  <Clock className="mx-auto h-5 w-5 text-white/20" />
                  <p className="mt-2 text-[11.5px] text-muted">Куратор ещё не добавил задания.</p>
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
              <ShieldCheck className="h-4 w-4 shrink-0 text-white/40" />
              <p className="text-[10.5px] leading-relaxed text-muted">
                Фото и текст видит только куратор. После проверки задание будет зачтено.
              </p>
            </div>
          </Card>

          {/* Чат */}
          <Card className="flex h-[calc(100dvh-8rem)] min-h-[480px] flex-col overflow-hidden p-0 xl:sticky xl:top-4 xl:h-[calc(100dvh-11rem)]">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/70">
                  <MessageSquare className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[12.5px] font-semibold text-white">Общий чат</p>
                  <p className="flex items-center gap-1.5 text-[9.5px] text-muted">
                    {socketState === 'open' ? (
                      <>
                        <Wifi className="h-2.5 w-2.5 text-white/50" /> онлайн · {participants} участников
                      </>
                    ) : socketState === 'connecting' ? (
                      <>
                        <Wifi className="h-2.5 w-2.5 animate-pulse text-white/30" /> подключаемся…
                      </>
                    ) : (
                      <>
                        <WifiOff className="h-2.5 w-2.5 text-white/30" /> обновление каждые 4 секунды
                      </>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex -space-x-1.5">
                {['М', 'И', 'А'].map((letter) => (
                  <span
                    key={letter}
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-[#141416] bg-white/[0.1] text-[9px] font-semibold text-white/70"
                  >
                    {letter}
                  </span>
                ))}
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#141416] bg-white/[0.06] text-[8.5px] font-semibold text-white/50">
                  +{Math.max(0, participants - 3)}
                </span>
              </div>
            </div>

            <div
              ref={messagesBoxRef}
              className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4"
            >
              <div className="text-center">
                <span className="rounded-full bg-white/[0.04] px-2.5 py-1 text-[9px] uppercase tracking-[0.14em] text-white/30">
                  Сегодня
                </span>
              </div>
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={cn('flex items-start gap-2.5', message.is_me && 'flex-row-reverse')}
                >
                  {!message.is_me ? (
                    <Avatar size={28} src={message.avatar_url} fallback={message.sender_name} />
                  ) : null}
                  <div className={cn('max-w-[82%]', message.is_me && 'items-end text-right')}>
                    <div className={cn('mb-1 flex items-baseline gap-2', message.is_me && 'justify-end')}>
                      <span className="text-[10px] font-semibold text-white/70">{message.sender_name}</span>
                      <span className="numeric text-[9px] text-white/25">
                        {message.pending ? 'отправка…' : message.created_at}
                      </span>
                    </div>
                    {message.text ? (
                      <div
                        className={cn(
                          'inline-block rounded-2xl px-3.5 py-2.5 text-left text-[12px] leading-relaxed',
                          message.is_me
                            ? 'rounded-tr-md bg-white text-bg'
                            : 'rounded-tl-md border border-white/[0.08] bg-[#1b1b1e] text-white/85',
                          message.pending && 'opacity-60',
                        )}
                      >
                        {message.text}
                      </div>
                    ) : null}
                    {message.image_url ? (
                      <a
                        href={message.image_url}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(
                          'mt-1.5 block overflow-hidden rounded-xl border border-white/[0.1] bg-white/[0.04]',
                          message.is_me && 'ml-auto',
                          message.pending && 'opacity-60',
                        )}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={message.image_url}
                          alt="Фото из чата"
                          className="max-h-52 w-auto max-w-[220px] object-cover"
                        />
                      </a>
                    ) : null}
                  </div>
                </div>
              ))}
              {!chatMessages.length ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <MessageSquare className="h-7 w-7 text-white/15" />
                  <p className="mt-3 text-[12px] font-medium text-white/60">Пока тихо</p>
                  <p className="mt-1 max-w-[220px] text-[10.5px] leading-relaxed text-muted">
                    Напишите первым — участники увидят сообщение сразу.
                  </p>
                </div>
              ) : null}
              <div ref={messagesEndRef} />
            </div>

            {!joined ? (
              <div className="border-t border-white/[0.07] bg-white/[0.02] p-3">
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/[0.12] px-4 py-4 text-center">
                  <p className="text-[11.5px] text-muted">Чат доступен участникам марафона.</p>
                  <Button size="sm" onClick={() => void joinMarathon()} disabled={joining}>
                    <UserPlus className="h-3.5 w-3.5" /> {joining ? 'Вступаем…' : 'Вступить и открыть чат'}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {attachPreview ? (
                  <div className="mx-4 mb-2 flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-2">
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-white/[0.06] text-white/50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={attachPreview} alt="Вложение" className="h-full w-full object-cover" />
                    </div>
                    <span className="flex-1 truncate text-[10.5px] text-muted">
                      {attachFile?.name || 'Изображение прикреплено'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAttachPreview(null);
                        setAttachFile(null);
                      }}
                      className="text-muted hover:text-danger"
                      aria-label="Убрать вложение"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : null}

                <form
                  onSubmit={sendMessage}
                  className="sticky bottom-0 z-10 flex items-center gap-2 border-t border-white/[0.07] bg-[#141416]/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur"
                >
                  <input
                    ref={chatFileRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(event) => {
                      const next = event.target.files?.[0];
                      if (!next) return;
                      if (!next.type.startsWith('image/')) {
                        toast('Нужно изображение', { tone: 'danger' });
                        return;
                      }
                      if (next.size > 3_000_000) {
                        toast('Файл больше 3 МБ', { tone: 'danger' });
                        return;
                      }
                      setAttachFile(next);
                      setAttachPreview(URL.createObjectURL(next));
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => chatFileRef.current?.click()}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-white/[0.06] hover:text-white"
                    aria-label="Прикрепить фото"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Написать в общий чат…"
                    className="input h-10 flex-1 py-0 text-[12px]"
                    disabled={sending}
                    enterKeyHint="send"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    disabled={(!input.trim() && !attachPreview) || sending}
                    aria-label="Отправить"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </>
            )}
          </Card>
        </div>
      </div>

      {/* Модалка сдачи задания */}
      <Modal
        open={Boolean(activeTask)}
        onClose={() => setActiveTask(null)}
        title={activeTask?.title}
        subtitle="Опишите результат и приложите фото. Куратор проверит в течение дня."
        footer={
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] text-muted">Фото необязательно, но ускоряет проверку</p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setActiveTask(null)} disabled={submitting}>
                Отмена
              </Button>
              <Button
                onClick={() => void submitTask()}
                disabled={submitting || (!answer.trim() && !file)}
              >
                {submitting ? 'Отправляем…' : 'Отправить'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <p className="label mb-2">Что получилось?</p>
            <Textarea
              autoFocus
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="Например: встал в 6:00, сделал зарядку 15 минут. Фото прикладываю."
              className="h-28"
              maxLength={5000}
            />
          </div>

          <div>
            <p className="label mb-2">Фото-подтверждение</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => pickFile(event.target.files?.[0] || null)}
            />
            {preview ? (
              <div className="relative overflow-hidden rounded-2xl border border-white/[0.16]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Превью" className="h-40 w-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setPreview(null);
                    setFile(null);
                  }}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur"
                  aria-label="Удалить фото"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  pickFile(event.dataTransfer.files?.[0] || null);
                }}
                className={cn(
                  'flex w-full flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-8 transition-colors',
                  dragging
                    ? 'border-white/40 bg-white/[0.06]'
                    : 'border-white/[0.14] bg-white/[0.02] hover:border-white/[0.24] hover:bg-white/[0.04]',
                )}
              >
                <UploadCloud className={cn('h-6 w-6', dragging ? 'text-white' : 'text-white/30')} />
                <p className="mt-2 text-[12px] font-medium text-white/70">
                  Перетащите фото или нажмите
                </p>
                <p className="mt-0.5 text-[10px] text-muted">JPG, PNG, WEBP · до 3 МБ</p>
              </button>
            )}
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
