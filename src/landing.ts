// Landing page servida per l'endpoint "/" del Worker (cost zero, sense
// infraestructura nova). Contingut 100% en català. Pensada per a SEO:
// paraules clau "festes catalunya telegram", "què fer aquest cap de setmana".
export const LANDING_HTML = `<!DOCTYPE html>
<html lang="ca">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>FestaBot Catalunya · Festes i concerts a prop teu</title>
  <meta name="description" content="Bot de Telegram amb l'agenda de festes majors, concerts i plans de Catalunya. Sap què hi ha avui, el cap de setmana i a prop teu. Gratuït." />
  <meta property="og:title" content="FestaBot Catalunya" />
  <meta property="og:description" content="Festes majors, concerts i plans de Catalunya al teu Telegram. Saber què fer mai havia estat tan fàcil." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://festabot-catalunya.adrimg3196.workers.dev/" />
  <link rel="canonical" href="https://festabot-catalunya.adrimg3196.workers.dev/" />
  <style>
    :root { color-scheme: light dark; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      background: #fff7ed; color: #1f2937; line-height: 1.6; }
    .wrap { max-width: 680px; margin: 0 auto; padding: 3rem 1.25rem 4rem; }
    h1 { font-size: clamp(1.9rem, 6vw, 2.8rem); margin: 0 0 .5rem; color: #9a3412; }
    .lead { font-size: 1.15rem; margin: 0 0 2rem; }
    .cta { display: inline-block; background: #ea580c; color: #fff; text-decoration: none;
      font-weight: 700; padding: .9rem 1.6rem; border-radius: 999px; font-size: 1.1rem; }
    .cta:hover { background: #c2410c; }
    ul.features { list-style: none; padding: 0; margin: 2.5rem 0; display: grid; gap: .9rem; }
    ul.features li { background: #fff; border: 1px solid #fed7aa; border-radius: 12px; padding: 1rem 1.2rem; }
    ul.features b { color: #9a3412; }
    footer { margin-top: 3rem; font-size: .85rem; color: #6b7280; }
    code { background: #ffedd5; padding: .1rem .4rem; border-radius: 6px; font-size: .9em; }
  </style>
</head>
<body>
  <main class="wrap">
    <h1>FestaBot Catalunya</h1>
    <p class="lead">L'agenda de festes, concerts i plans de Catalunya al teu Telegram.
       Saber què fer avui, el cap de setmana o a prop teu, en un toc.</p>
    <a class="cta" href="https://t.me/FestaCatalunyaBot?start=cat">Obre'l al Telegram</a>

    <ul class="features">
      <li><b>Avui i cap de setmana</b> — Què hi ha a prop teu ara mateix i els propers dies.</li>
      <li><b>Festes majors</b> — El cartell i el programa de la festa major del teu poble.</li>
      <li><b>A prop teu</b> — Envia la teva ubicació i et mostra els plans del voltant.</li>
      <li><b>Concerts i artistes</b> — Música en directe icerca per artista o títol.</li>
      <li><b>Sense cost</b> — Gratuït, sense anuncis i respectuós amb la teva privadesa.</li>
    </ul>

    <p>Comença amb <code>/avui</code>, <code>/capdesetmana</code>, <code>/aprop</code>,
       <code>/festes</code> o <code>/concerts</code>. Dades de l'Agenda Cultural de la Generalitat de Catalunya.</p>

    <footer>
      FestaBot Catalunya · Bot de Telegram independent · Dades: Agenda Cultural (Cultura.cat)
    </footer>
  </main>
</body>
</html>`;
