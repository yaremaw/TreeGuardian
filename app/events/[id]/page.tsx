import Link from "next/link";
import { notFound } from "next/navigation";
import fs from "node:fs/promises";
import path from "node:path";
import BeforeAfterSlider from "@/app/components/BeforeAfterSlider";
import type { EventsFile } from "@/app/lib/types";

async function loadEvents(): Promise<EventsFile> {
  const raw = await fs.readFile(
    path.join(process.cwd(), "public/data/events.json"),
    "utf-8"
  );
  return JSON.parse(raw);
}

export async function generateStaticParams() {
  const data = await loadEvents();
  return data.events.map((e) => ({ id: e.id }));
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await loadEvents();
  const event = data.events.find((e) => e.id === id);
  if (!event) notFound();

  const verdict = verdictFor(event.area_loss_ha, event.confidence);

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          ← всі події
        </Link>
        <div className="flex items-baseline justify-between gap-4 mt-2 flex-wrap">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {event.name}
          </h1>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${verdict.cls}`}
          >
            {verdict.label}
          </span>
        </div>
        <p className="text-sm text-zinc-500 mt-1">
          {event.region} область • період порівняння {event.date_before} →{" "}
          {event.date_after}
        </p>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-8">
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat
            label="Площа втрат"
            value={`${event.area_loss_ha} га`}
            help="Сумарна площа пікселів, де NDVI впав більше ніж на 0.2 між двома датами. Розраховується як частка таких пікселів × площа всієї ділянки."
          />
          <Stat
            label="NDVI до"
            value={event.ndvi_before_mean.toFixed(3)}
            help="Середня «зеленість» ділянки на першу дату. Ліс зазвичай 0.7–0.9, поле 0.4–0.7, ґрунт/вирубка 0.1–0.3."
          />
          <Stat
            label="NDVI після"
            value={event.ndvi_after_mean.toFixed(3)}
            help="Середня «зеленість» на другу дату. Якщо число помітно менше за попереднє — ліс почав зникати."
          />
          <Stat
            label="Впевненість"
            value={`${Math.round(event.confidence * 100)}%`}
            help="Наскільки впевнена система: чим більша частка пікселів зі зміною і чим сильніший NDVI-drop, тим вище. Не плутати з юридичним статусом рубки."
          />
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
            Знімки до / після
          </h2>
          <BeforeAfterSlider
            before={event.assets.before}
            after={event.assets.after}
            mask={event.assets.mask}
          />
          <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
            Перетягуй вертикальну лінію, щоб порівняти знімки тієї самої
            ділянки за два моменти. Червона напівпрозора маска — пікселі, де
            NDVI впав більше ніж на 0.2 (можна вимкнути чекбоксом). Хмари і
            тіні відфільтровуються через сцену класифікації SCL від ESA.
          </p>
        </section>

        <Glossary />

        <section className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-5 text-sm">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
            Технічні параметри події
          </h3>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs text-zinc-600 dark:text-zinc-400">
            <DT k="bbox" v={event.bbox.join(", ")} />
            <DT
              k="центр"
              v={`${event.center[1].toFixed(4)}°N, ${event.center[0].toFixed(4)}°E`}
            />
            <DT k="загальна площа" v={`${event.area_total_ha} га`} />
            <DT k="середній NDVI drop" v={event.ndvi_drop_mean.toFixed(3)} />
            <DT k="дата ДО" v={event.date_before} />
            <DT k="дата ПІСЛЯ" v={event.date_after} />
            <DT k="джерело" v="Sentinel-2 L2A через CDSE" />
            <DT k="алгоритм" v="NDVI baseline (поріг 0.2)" />
          </dl>
        </section>
      </main>
    </div>
  );
}

function verdictFor(lossHa: number, confidence: number) {
  if (lossHa > 5)
    return {
      label: "Імовірна рубка",
      cls: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
    };
  if (lossHa > 1)
    return {
      label: "Підозра на рубку",
      cls: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
    };
  if (confidence > 0)
    return {
      label: "Змін мало",
      cls: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    };
  return {
    label: "Дані відсутні",
    cls: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  };
}

function Stat({
  label,
  value,
  help,
}: {
  label: string;
  value: string;
  help: string;
}) {
  return (
    <div
      className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4 relative group cursor-help"
      title={help}
    >
      <div className="flex items-center gap-1.5 text-xs text-zinc-500 uppercase tracking-wide">
        {label}
        <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-zinc-400 text-[10px] text-zinc-400 group-hover:border-zinc-600 group-hover:text-zinc-600 dark:group-hover:border-zinc-300 dark:group-hover:text-zinc-300">
          ?
        </span>
      </div>
      <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
        {value}
      </div>
    </div>
  );
}

function Glossary() {
  return (
    <section className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg p-5 text-sm space-y-3">
      <h3 className="font-semibold text-emerald-900 dark:text-emerald-200">
        Як це працює — простими словами
      </h3>
      <div className="space-y-2 text-zinc-700 dark:text-zinc-300 leading-relaxed">
        <p>
          <strong>1. Беремо два знімки.</strong> Європейський супутник{" "}
          <strong>Sentinel-2</strong> (програма Copernicus) фотографує
          поверхню Землі кожні ~5 днів у 13 спектральних діапазонах. Ми беремо
          один знімок «до» (літо) і один «після» (через 1–2 місяці) тієї ж
          ділянки.
        </p>
        <p>
          <strong>2. Рахуємо NDVI.</strong> Це формула:
          <code className="mx-1 px-1.5 py-0.5 bg-white/60 dark:bg-black/40 rounded text-xs">
            NDVI = (NIR − Red) / (NIR + Red)
          </code>
          де <strong>NIR</strong> — близьке інфрачервоне світло (рослини його
          відбивають), <strong>Red</strong> — червоне (рослини його
          поглинають). Здоровий ліс має NDVI ~0.8–0.9, ґрунт або вирубка —
          ~0.1–0.3.
        </p>
        <p>
          <strong>3. Шукаємо різницю.</strong> Для кожного пікселя порівнюємо
          NDVI «до» і «після». Якщо впав більше ніж на 0.2 — це означає, що
          там зникла рослинність. Маркуємо такі пікселі червоним і рахуємо
          сумарну площу.
        </p>
        <p>
          <strong>4. Фільтруємо хмари.</strong> ESA додає до знімків шар{" "}
          <strong>SCL</strong> (Scene Classification), що позначає хмари,
          тіні, сніг, воду. Такі пікселі ми відкидаємо, щоб не плутати з
          вирубкою.
        </p>
      </div>
    </section>
  );
}

function DT({ k, v }: { k: string; v: string | number }) {
  return (
    <>
      <dt className="text-zinc-500">{k}</dt>
      <dd className="font-mono text-zinc-900 dark:text-zinc-100">{v}</dd>
    </>
  );
}
