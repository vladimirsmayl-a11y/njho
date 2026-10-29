import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Контакты',
};

export default function ContactsPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-5 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[360px] w-[560px] -translate-x-1/2 rounded-full bg-neon/[0.05] blur-[120px]"
      />

      <div className="relative w-full max-w-[440px]">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-[12px] text-white/35 transition hover:text-white/70"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          На главную
        </Link>

        <div className="card p-8 sm:p-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/30">
            ЛВС
          </p>
          <h1 className="mt-4 font-display text-[30px] font-extrabold tracking-[-0.03em] text-white">
            Контакты
          </h1>
          <a
            href="mailto:hello@lvs.ru"
            className="mt-6 inline-block text-[15px] text-neon transition hover:text-neon/80"
          >
            hello@lvs.ru
          </a>
        </div>
      </div>
    </main>
  );
}
