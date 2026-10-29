// Tutorial de bienvenida (se muestra la primera vez) y guía de uso (#/guia)
import { CLASSES, CLASS_ORDER } from './analysis/analyzer.js';
import { getSettings, saveSettings } from './store.js';
import { esc } from './ui.js';

const KEY = 'entrenador-tutorial';
const PIECES = `${import.meta.env.BASE_URL}pieces/`;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;

const legend = () => `<div class="ob-legend">${CLASS_ORDER.map((k) => `<span><i class="cbadge" style="background:${CLASSES[k].color}">${CLASSES[k].sym}</i>${CLASSES[k].label}</span>`).join('')}</div>`;

function slides() {
  const s = getSettings();
  return [
    {
      id: 'hola', title: 'Tu entrenador de ajedrez',
      art: `<div class="ob-hero"><img src="${PIECES}wN.svg" alt=""><img src="${PIECES}bQ.svg" alt=""><img src="${PIECES}wK.svg" alt=""></div>`,
      body: `<p>Analiza tus partidas con Stockfish, el motor más fuerte del mundo, <b>directamente en tu móvil y gratis</b>.</p>
        <p>Te dice qué jugadas fueron buenas y cuáles no, descubre en qué fallas más y te prepara un entrenamiento a tu medida.</p>
        <p class="muted small">Esta guía dura un minuto. Puedes volver a verla cuando quieras desde Ajustes.</p>`,
    },
    {
      id: 'cuenta', title: 'Conecta tu cuenta de Chess.com', form: true,
      art: `<div class="ob-icon">♞</div>`,
      body: `<p>Con tu usuario la app trae tus partidas sola y sabe con qué color jugabas en cada una.</p>
        <label class="field">Usuario de Chess.com<input id="ob-user" value="${esc(s.username)}" autocapitalize="off" autocomplete="off" placeholder="tu_usuario"></label>
        <label class="field">Qué partidas analizar<select id="ob-tc">${[['rapid', 'Rápidas'], ['blitz', 'Blitz'], ['bullet', 'Bala'], ['daily', 'Diarias'], ['all', 'Todas']].map(([v, l]) => `<option value="${v}" ${s.timeClass === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <p class="muted small">Solo se leen tus partidas públicas. No hace falta contraseña.</p>`,
    },
    {
      id: 'partidas', title: 'Así llegan tus partidas',
      art: `<div class="ob-steps"><span>1</span><span>2</span><span>3</span></div>`,
      body: `<ol class="ob-list">
          <li><b>Solas.</b> Cada vez que abres la app busca tus partidas nuevas y analiza las 3 más recientes.</li>
          <li><b>Compartiendo</b> (Android). Al terminar en Chess.com: Compartir → Entrenador. Se analiza al momento.</li>
          <li><b>Pegando el PGN.</b> En Partidas → Añadir, pega una o varias partidas.</li>
        </ol>
        <p class="muted small">Analizar una partida tarda entre 10 segundos y 1 minuto. Puedes seguir usando la app mientras tanto: verás una barra arriba.</p>`,
    },
    {
      id: 'informe', title: 'El informe de cada partida',
      art: `<div class="ob-duel"><div><b>95</b><span>tú</span></div><div class="dark"><b>91</b><span>rival</span></div></div>`,
      body: `<p>La <b>precisión</b> (de 0 a 100) resume lo cerca que jugaste del motor. Cada jugada recibe una etiqueta:</p>${legend()}
        <p>Debajo verás los <b>momentos clave</b> con la explicación de cada error y una lección recomendada.</p>`,
    },
    {
      id: 'revision', title: 'Revisión jugada a jugada',
      art: `<div class="ob-ctls"><i>◀</i><i>▶</i><i>⚑</i><i class="on">✥</i></div>`,
      body: `<ul class="ob-list">
          <li><b>◀ ▶</b> o desliza el tablero para avanzar y retroceder.</li>
          <li><b>⚑</b> salta directamente a tu siguiente error.</li>
          <li><b>✥</b> abre el tablero de análisis: mueve las piezas que quieras y Stockfish te da las 3 mejores líneas.</li>
          <li>La <b>flecha verde</b> marca la mejor jugada; la barra lateral y la gráfica muestran quién iba mejor.</li>
        </ul>`,
    },
    {
      id: 'stats', title: 'Descubre en qué fallas',
      art: `<div class="ob-bars"><span style="width:82%"></span><span style="width:55%"></span><span style="width:34%"></span></div>`,
      body: `<p>En <b>Estadísticas</b> se juntan todas tus partidas analizadas:</p>
        <ul class="ob-list">
          <li>Si dejas piezas sin defender, si no ves tácticas o si permites mates.</li>
          <li>Tu precisión en apertura, medio juego y final.</li>
          <li>Cómo usas el reloj y si fallas por jugar demasiado rápido.</li>
          <li>Tus aperturas: resultados y en qué jugada sales de la teoría.</li>
        </ul>`,
    },
    {
      id: 'entrenador', title: 'Tu entrenador personal',
      art: `<div class="ob-plan"><span class="d">✓</span><span class="d">✓</span><span></span></div>`,
      body: `<ul class="ob-list">
          <li><b>Plan de hoy</b>: tres tareas cortas (revisar tu última partida, 5 posiciones y una lección). Cada día que entrenas suma a tu racha.</li>
          <li><b>Repite tus errores</b>: las posiciones donde fallaste vuelven como ejercicios. Si aciertas, vuelven más adelante; si fallas, al día siguiente.</li>
          <li><b>Plan de mejora</b>: tus puntos débiles ordenados por prioridad, con la lección adecuada para cada uno.</li>
        </ul>`,
    },
    {
      id: 'aprender', title: 'Aprende como en un libro',
      art: `<div class="ob-book"><span>Táctica</span><span>Mates</span><span>Estrategia</span><span>Finales</span><span>Repertorio</span><span>Inmortales</span></div>`,
      body: `<p>En <b>Aprender</b> tienes una biblioteca de lecciones con ejercicios en el tablero: táctica, mates, estrategia, finales, trampas, partidas inmortales comentadas y un glosario.</p>
        <p>En <b>Tu repertorio</b> practicas las líneas del Londres y la Caro-Kann: la app mueve las piezas del rival y tú tienes que jugar las tuyas.</p>`,
    },
    {
      id: 'instalar', title: 'Tenla siempre a mano',
      art: `<div class="ob-icon"><img src="${import.meta.env.BASE_URL}icons/icon-192.png" alt="" class="ob-appicon"></div>`,
      body: `${isStandalone() ? '<p>Ya la tienes instalada en tu pantalla de inicio.</p>' : isIOS()
          ? '<p><b>Añádela a tu pantalla de inicio</b>: en Safari pulsa el botón Compartir y luego «Añadir a pantalla de inicio».</p>'
          : '<p><b>Añádela a tu pantalla de inicio</b>: en Chrome, menú ⋮ → «Añadir a pantalla de inicio» o «Instalar app».</p>'}
        <p>Tus partidas se guardan en el móvil. Si quieres tenerlas también en la nube, inicia sesión con Supabase en <b>Ajustes</b>.</p>
        <p class="muted small">Desde Ajustes puedes cambiar la notación (española o inglesa), los colores del tablero y la profundidad del análisis.</p>`,
    },
  ];
}

export function shouldShowTutorial() {
  try { return !localStorage.getItem(KEY); } catch { return false; }
}

export function showTutorial({ onFinish } = {}) {
  const list = slides();
  let i = 0;
  const el = document.createElement('div');
  el.className = 'onboarding';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', 'Guía de bienvenida');
  document.body.appendChild(el);
  document.body.classList.add('ob-open');
  const saveForm = () => {
    const u = el.querySelector('#ob-user');
    if (u) saveSettings({ username: u.value.trim(), timeClass: el.querySelector('#ob-tc').value });
  };
  function close(goImport) {
    saveForm();
    try { localStorage.setItem(KEY, new Date().toISOString()); } catch {}
    el.remove();
    document.body.classList.remove('ob-open');
    onFinish?.({ goImport, username: getSettings().username });
  }
  function render(dir = 0) {
    const s = list[i];
    const last = i === list.length - 1;
    el.innerHTML = `
      <div class="ob-top"><div class="ob-pattern" aria-hidden="true"></div>${s.art}</div>
      <div class="ob-card ${dir > 0 ? 'in-r' : dir < 0 ? 'in-l' : ''}">
        <div class="ob-count">${i + 1} de ${list.length}</div>
        <h1>${s.title}</h1>
        <div class="ob-body">${s.body}</div>
      </div>
      <div class="ob-foot">
        <div class="ob-dots">${list.map((_, k) => `<span class="${k === i ? 'on' : ''}"></span>`).join('')}</div>
        <div class="ob-actions">
          ${i > 0 ? '<button class="btn ghost" data-ob="prev">Atrás</button>' : '<button class="btn ghost" data-ob="skip">Saltar</button>'}
          ${last ? `<button class="btn" data-ob="done">${getSettings().username ? 'Traer mis partidas' : 'Empezar'}</button>` : '<button class="btn" data-ob="next">Siguiente</button>'}
        </div>
      </div>`;
    el.querySelector('[data-ob=next], [data-ob=done]')?.focus({ preventScroll: true });
  }
  el.addEventListener('click', (e) => {
    const a = e.target.closest('[data-ob]')?.dataset.ob; if (!a) return;
    if (a === 'next') { saveForm(); i++; render(1); }
    if (a === 'prev') { saveForm(); i--; render(-1); }
    if (a === 'skip') close(false);
    if (a === 'done') close(!!getSettings().username);
  });
  // deslizar entre pantallas
  let tx = null;
  el.addEventListener('touchstart', (e) => { if (!e.target.closest('input,select')) tx = e.touches[0].clientX; }, { passive: true });
  el.addEventListener('touchend', (e) => {
    if (tx == null) return;
    const dx = e.changedTouches[0].clientX - tx; tx = null;
    if (dx < -60 && i < list.length - 1) { saveForm(); i++; render(1); }
    if (dx > 60 && i > 0) { saveForm(); i--; render(-1); }
  });
  el.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(false); });
  render();
}

// Guía de uso: el mismo contenido en una página para consultar
export function viewGuide(view) {
  const list = slides().filter((s) => !s.form);
  view.innerHTML = `<header class="page-head"><a class="back" href="#/ajustes">‹ Ajustes</a><h1>Guía de uso</h1></header>
    <button class="btn wide" id="replay">Ver el tutorial otra vez</button>
    ${list.map((s) => `<section class="panel guide-sec"><h2>${s.title}</h2><div class="ob-body">${s.body}</div></section>`).join('')}
    <section class="panel guide-sec"><h2>Preguntas frecuentes</h2>
      <dl class="glossary">
        <dt>¿Por qué no aparece mi última partida?</dt><dd>Chess.com tarda unos minutos en publicar las partidas recién terminadas. Pulsa «Buscar partidas nuevas» un poco más tarde o pega el PGN.</dd>
        <dt>¿Coincide con el análisis de Chess.com?</dt><dd>Casi siempre, pero no exactamente: aquí se usa una versión ligera de Stockfish que funciona en el móvil. Subir la profundidad en Ajustes lo hace más fiable.</dd>
        <dt>¿Gasta mucha batería?</dt><dd>Solo mientras analiza. Con la profundidad recomendada, unos segundos por partida.</dd>
        <dt>¿Dónde se guardan mis datos?</dt><dd>En tu móvil. Si inicias sesión con Supabase, también en tu base de datos, y solo tú puedes verlos.</dd>
        <dt>¿Funciona sin conexión?</dt><dd>Sí: revisar, estudiar y entrenar funciona sin internet una vez abierta la app. Solo traer partidas nuevas necesita conexión.</dd>
      </dl></section>`;
  view.querySelector('#replay').addEventListener('click', () => showTutorial({ onFinish: () => (location.hash = '#/') }));
}
