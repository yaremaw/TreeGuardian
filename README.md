# 🌲 ДеревоВартовий

Веб-моніторинг рубок лісу в Українських Карпатах за супутниковими знімками Sentinel-2.

**Live:** https://treeguardian.vercel.app

Конкурсний проєкт для STEAM-конкурсу «Врятуймо планету разом!» (Івано-Франківськ, 2026).

## Як це працює

1. Беремо два знімки Sentinel-2 (літо «до», літо «після») для кожної ділянки в Карпатах.
2. Рахуємо NDVI = (NIR − Red) / (NIR + Red) для кожного пікселя обох знімків.
3. Шукаємо пікселі, де NDVI впав більше ніж на 0.2 — це втрата рослинності.
4. Фільтруємо хмари, тіні і сніг через шар класифікації сцени SCL від ESA.
5. Показуємо результати на інтерактивній карті з порівнянням знімків і червоною маскою втрат.

## Стек

- **Дані:** Sentinel-2 L2A через Copernicus Data Space Ecosystem (Sentinel Hub Process API).
- **Аналіз:** Python (`requests`, `numpy`, `Pillow`, `tifffile`).
- **Фронтенд:** Next.js 16 + TypeScript + Tailwind CSS 4.
- **Карта:** MapLibre GL JS + OpenStreetMap.
- **Хостинг:** Vercel (безкоштовний тариф).

## Структура

```
.
├── app/                    # Next.js App Router (фронтенд)
│   ├── page.tsx            # головна — карта Карпат + sidebar
│   ├── events/[id]/page.tsx# детальна сторінка події
│   ├── components/         # Map, EventCard, BeforeAfterSlider
│   └── lib/types.ts        # типи Event / EventsFile
├── public/data/
│   ├── events.json         # перелік подій (метадані)
│   └── events/<id>/        # before.png, after.png, ndvi_diff.png
├── scripts/
│   ├── generate_data.py    # пайплайн: Sentinel Hub → events.json + PNG
│   ├── scan_candidates.py  # сканер AOI кандидатів за NDVI-drop
│   ├── generate-docx.mjs   # генерація paper.docx через pandoc
│   └── generate-pptx.mjs   # генерація slides.pptx через pandoc
├── ndvi_pipeline.ipynb     # той самий пайплайн у форматі Colab-ноутбука
├── paper.md                # текст конкурсного опису → paper.docx
└── slides.md               # текст слайдів → slides.pptx
```

## Розробка

```bash
# Фронтенд
npm install
npm run dev          # http://localhost:3000

# Згенерувати дані заново (потрібні Sentinel Hub OAuth ключі — див. scripts/generate_data.py)
python3 -m venv .venv && source .venv/bin/activate
pip install requests numpy pillow tifffile
python scripts/generate_data.py

# Згенерувати конкурсні документи (потрібен pandoc — див. scripts/bin/README.md)
npm run docx paper.md      # → paper.docx
npm run pptx slides.md     # → slides.pptx
```

## Конфігурація

- `.mcp.json` — MCP-сервери для Claude Code (не комітиться, бо містить BW_SESSION). Зразок: `.mcp.json.example`.
- Sentinel Hub OAuth credentials наразі захардкоджені у `scripts/*.py` і `ndvi_pipeline.ipynb` — для production їх варто перенести в `.env`.

## Автор

Возняк Ярема, 9-Б, Івано-Франківський науковий ліцей ім. М. Сабата.
Науковий керівник: Казмерчук Анатолій Іванович.
