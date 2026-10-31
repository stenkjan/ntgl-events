# Flyer 18.12.2026

Quadratischer Flyer (2160 px) als HTML, gerendert mit Playwright.

- `wordmark.png`: NTGL-Schriftzug, freigestellt aus dem Flyer vom 21.03.2025
- `bird.png`: Vogel aus `public/ntgl_logo.png`
- Farben: NTGL-Blau (#071c27 / #0f3a4c / #1f6a84 / #5fa3b8), Chrom-Silber als Verlauf, fog #8fa9a7 für Sekundärtext
- Schriften: Bebas Neue, Space Grotesk (Google Fonts, wie die Website)

Neu rendern:

```bash
node render.js "$PWD/flyer.html" "$PWD/out.png"
```

Web-Version: auf 1600 px verkleinern und als `public/flyers/2026-12-18.jpg` ablegen.
