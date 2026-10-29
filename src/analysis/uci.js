// Interpreta una línea "info ..." de un motor UCI
export function parseInfo(line) {
  const t = line.split(' ');
  const get = (k) => { const i = t.indexOf(k); return i >= 0 ? t[i + 1] : null; };
  const pvIdx = t.indexOf('pv');
  if (pvIdx < 0) return null;
  const si = t.indexOf('score');
  if (si < 0) return null;
  const kind = t[si + 1], val = parseInt(t[si + 2], 10);
  const pv = t.slice(pvIdx + 1);
  return {
    multipv: parseInt(get('multipv') || '1', 10),
    depth: parseInt(get('depth') || '0', 10),
    cp: kind === 'cp' ? val : null,
    mate: kind === 'mate' ? val : null,
    uci: pv[0], pv,
  };
}
