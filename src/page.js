
/**
 * @fileoverview Controls the size and `has-value` class of the body itself based on current input.
 */

const value = (ev) => {
  const text = ev.detail.trim();
  document.body.classList.toggle('has-value', Boolean(text));
};
typer.addEventListener('value', value);
value({detail: typer.value});

// set minHeight to actual viewport height, but allow for keyboard etc
const resize = (ev) => {
  const height = window.innerHeight;
  document.body.style.minHeight = `${height}px`;
};
window.addEventListener('resize', resize);
window.addEventListener('load', resize);
resize();
