
const letterSpacing = 1024;  // must be sensibly large enough so we round over emoji
const fontSize = 12;

const hider = document.createElement('div');
hider.style.overflow = 'hidden';
hider.style.width = '0px';
hider.style.position = 'absolute';

const m = document.createElement('div');
hider.appendChild(m);
m.style.display = 'inline-block';
m.style.whiteSpace = 'nowrap';
m.style.fontSize = `${fontSize}px`;
m.style.background = 'red';

if (navigator.platform.startsWith('Win')) {
  m.style.fontFamily = `'Segoe UI Emoji', 'Segoe UI Symbol', 'Courier New', monospace`;
} else {
  m.style.fontFamily = `'Lato', 'Helvetica Neue', 'Helvetica', sans-serif`;
}
document.body.appendChild(hider);

m.textContent = '\u{ffffd}';
const invalidBoxWidth = m.getBoundingClientRect().width;

// _now_ set letterSpacing for rest
m.style.letterSpacing = `${letterSpacing}px`;

export function measureDOMChars(s) {
  m.textContent = s;
  return Math.floor(m.offsetWidth / (letterSpacing + fontSize));
}

export function isSingleEmoji(s) {
  m.textContent = s;
  const w = m.getBoundingClientRect().width;

  const chars = Math.round(w / (letterSpacing + fontSize));
  if (chars !== 1) {
    return false;
  }

  if (w - letterSpacing === invalidBoxWidth) {
    return false;
  }
  return true;
}