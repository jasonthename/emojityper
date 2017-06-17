
import * as provider from './lib/provider.js';

// advanced handler
(function(input, advanced) {
  const form = advanced.querySelector('form');
  const namer = form.querySelector('input');
  const button = form.querySelector('button');

  let focus = '';

  input.addEventListener('query', ev => {
    const query = ev.detail;
    const selection = (query.text === null && query.focus !== undefined);
    focus = query.focus;
    advanced.hidden = !selection;
    if (advanced.hidden) {
      namer.value = '';
    }
  });

  const handler = ev => {
    button.disabled = !namer.value;
  };
  'input change'.split(/\s+/).forEach(type => namer.addEventListener(type, handler));

  form.addEventListener('submit', ev => {
    ev.preventDefault();

    form.classList.add('pending');
    namer.disabled = true;
    button.disabled = true;

    const cleanup = _ => {
      form.classList.remove('pending');
      namer.disabled = false;
      namer.value = '';
      namer.dispatchEvent(new CustomEvent('change'));
    };

    const p = provider.submit(namer.value, focus).then(_ => {
      button.classList.add('success');
      return false;
    }).catch(err => {
      button.classList.add('failure');
      console.warn('failed to submit emoji', err)
      return true;
    }).then(cleanup);

    p.then(_ => new Promise((resolve, reject) => window.setTimeout(resolve, 2000))).then(_ => {
      button.className = '';
    });
  });

}(typer, advanced));
