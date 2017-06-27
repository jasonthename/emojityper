
const value = ev => {
  const text = ev.detail.trim();
  // we don't use .toggle, as it has an IE11 bug
  if (text) {
    document.body.classList.add('has-value');
  } else {
    document.body.classList.remove('has-value');
  }
};
typer.addEventListener('value', value);
value({detail: typer.value});

// set minHeight to actual viewport height, but allow for keyboard etc
const resize = ev => {
  const height = window.innerHeight;
  document.body.style.minHeight = `${height}px`;
};
window.addEventListener('resize', resize);
resize();
