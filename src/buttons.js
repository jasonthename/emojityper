
const all = Array.prototype.slice.call(buttons.querySelectorAll('button'));

const handler = ev => {
  const text = ev.detail.trim();
  const hasValue = Boolean(text);
  all.forEach(button => button.disabled = !hasValue);
};
typer.addEventListener('value', handler);
handler({detail: typer.value});

// copy handler
(function(button, input) {
  let timeout;
  const defaultText = button.textContent;
  const spaceRe = /\s*/;

  const copy = _ => {
    const [start, end] = [input.selectionStart, input.selectionEnd];

    // find start/end of content (trim, but find positions)
    let left = 0;
    let right = input.value.length;
    if (input.selectionStart !== input.selectionEnd) {
      left = input.selectionStart;
      right = input.selectionEnd;
    }
    left += spaceRe.exec(input.value.substr(left))[0].length;
    right = left + input.value.substr(left, right - left).trim().length;
    if (right <= left) { return false; }

    input.focus();
    input.selectionStart = left;
    input.selectionEnd = right;

    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch(e) {
      console.warn('could not copy', e);
      ok = false;
    }
    // restore previous selection
    [input.selectionStart, input.selectionEnd] = [start, end];

    if (!ok) { return true; }
    console.info('copied', input.value.substr(left, right));

    // show message
    button.textContent = button.dataset.copied;
    window.clearTimeout(timeout);
    timeout = window.setTimeout(ev => {
      button.textContent = defaultText;
    }, 500);
  };

  input.addEventListener('keydown', ev => {
    if (ev.key == 'Enter') {
      button.click();
      input.focus();
    }
  });
  button.addEventListener('click', ev => {
    copy();
    button.focus();
  });
}(copy, typer));

