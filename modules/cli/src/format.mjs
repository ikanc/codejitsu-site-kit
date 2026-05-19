// Tiny ANSI color + table helpers. No deps.

const isTTY = process.stdout.isTTY && !process.env.NO_COLOR;

function wrap(code) {
  return isTTY ? (s) => `\x1b[${code}m${s}\x1b[0m` : (s) => s;
}

export const c = {
  dim: wrap('2'),
  bold: wrap('1'),
  red: wrap('31'),
  green: wrap('32'),
  yellow: wrap('33'),
  blue: wrap('34'),
  magenta: wrap('35'),
  cyan: wrap('36'),
  gray: wrap('90'),
};

const ansiRe = /\x1b\[[0-9;]*m/g;

function visibleLength(s) {
  return s.replace(ansiRe, '').length;
}

function padCol(s, width) {
  const diff = width - visibleLength(s);
  return diff > 0 ? s + ' '.repeat(diff) : s;
}

function truncate(s, width) {
  if (visibleLength(s) <= width) return s;
  const plain = s.replace(ansiRe, '');
  return plain.slice(0, width - 1) + '…';
}

/**
 * Print a table.
 *
 * @param {string[]} headers
 * @param {string[][]} rows
 * @param {object} [opts]
 * @param {number[]} [opts.maxWidths]
 */
export function table(headers, rows, opts = {}) {
  const cols = headers.length;
  const widths = new Array(cols).fill(0);

  for (let i = 0; i < cols; i++) {
    widths[i] = visibleLength(headers[i]);
    for (const row of rows) {
      widths[i] = Math.max(widths[i], visibleLength(row[i] ?? ''));
    }
    if (opts.maxWidths?.[i]) {
      widths[i] = Math.min(widths[i], opts.maxWidths[i]);
    }
  }

  console.log(headers.map((h, i) => c.bold(padCol(h, widths[i]))).join('  '));
  console.log(widths.map((w) => c.gray('─'.repeat(w))).join('  '));
  for (const row of rows) {
    console.log(row.map((cell, i) => padCol(truncate(cell ?? '', widths[i]), widths[i])).join('  '));
  }
}
