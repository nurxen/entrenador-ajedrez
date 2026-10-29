// Importación desde la API pública y gratuita de Chess.com (no requiere cuenta ni clave)
import { parsePgn } from './analysis/analyzer.js';

const API = 'https://api.chess.com/pub/player/';

// Reintenta una vez: la API pública a veces corta peticiones del navegador
async function get(url) {
  for (let i = 0; i < 2; i++) {
    try { return await fetch(url); } catch (e) {
      if (i) throw new Error('No se pudo conectar con Chess.com. Comprueba la conexión o pega el PGN a mano.');
      await new Promise((r) => setTimeout(r, 1200));
    }
  }
}

export async function fetchRecentGames(username, { months = 2, timeClass = 'rapid' } = {}) {
  const u = username.trim().toLowerCase();
  const r = await get(`${API}${encodeURIComponent(u)}/games/archives`);
  if (r.status === 404) throw new Error(`No existe el usuario «${username}» en Chess.com`);
  if (!r.ok) throw new Error(`Chess.com respondió ${r.status}. Vuelve a intentarlo en un minuto.`);
  const { archives = [] } = await r.json();
  const out = [];
  for (const url of archives.slice(-months).reverse()) {
    const res = await get(url).catch(() => null);
    if (!res) continue;
    if (!res.ok) continue;
    const { games = [] } = await res.json();
    for (const g of games) {
      if (!g.pgn || g.rules !== 'chess') continue;
      if (timeClass !== 'all' && g.time_class !== timeClass) continue;
      out.push(fromChessCom(g));
    }
  }
  return out.sort((a, b) => b.playedAt.localeCompare(a.playedAt));
}

function fromChessCom(g) {
  const id = 'cc-' + (g.url?.split('/').pop() || g.uuid);
  return {
    id, source: 'chesscom', url: g.url, pgn: g.pgn,
    playedAt: new Date(g.end_time * 1000).toISOString(),
    white: g.white.username, black: g.black.username,
    whiteElo: g.white.rating, blackElo: g.black.rating,
    result: g.pgn.match(/\[Result "([^"]+)"\]/)?.[1] || '*', timeClass: g.time_class,
  };
}

// Partida pegada a mano (PGN de Chess.com, Lichess o cualquier otro)
export function fromPgnText(pgn) {
  const { headers, history } = parsePgn(pgn);
  if (!history.length) throw new Error('El PGN no contiene jugadas');
  const link = headers.Link || '';
  const ccId = link.match(/chess\.com\/game\/(?:live|daily)\/(\d+)/)?.[1];
  let h = 0;
  const sig = (headers.White || '') + (headers.Black || '') + (headers.Date || '') + history.map((m) => m.san).join('');
  for (let i = 0; i < sig.length; i++) h = (h * 31 + sig.charCodeAt(i)) | 0;
  const date = (headers.UTCDate || headers.Date || '').replace(/\./g, '-');
  const time = headers.UTCTime || headers.EndTime || '12:00:00';
  let playedAt = new Date().toISOString();
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const d = new Date(`${date}T${time.slice(0, 8)}Z`);
    if (!isNaN(d)) playedAt = d.toISOString();
  }
  const base = parseInt(String(headers.TimeControl || '').split('+')[0], 10);
  const timeClass = !base ? null : base < 180 ? 'bullet' : base < 600 ? 'blitz' : base < 3600 ? 'rapid' : 'daily';
  return {
    id: ccId ? 'cc-' + ccId : 'pgn-' + (h >>> 0).toString(36), source: ccId ? 'chesscom' : 'pgn', url: link || null,
    pgn, playedAt, white: headers.White || 'Blancas', black: headers.Black || 'Negras',
    whiteElo: +headers.WhiteElo || null, blackElo: +headers.BlackElo || null,
    result: headers.Result || '*', timeClass,
  };
}
