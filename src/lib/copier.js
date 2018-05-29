
let dummy;

export function copyText(text) {
  if (!dummy) {
    dummy = document.createElement('input');
    dummy.style.position = 'fixed';
    dummy.style.opacity = 0;
    document.body.appendChild(dummy);
  }

  dummy.value = text;
  try {
    dummy.hidden = false;
    dummy.focus();
    dummy.selectionStart = 0;
    dummy.selectionEnd = dummy.value.length;
    document.execCommand('copy');
  } catch (e) {
    return false;
  } finally {
    dummy.hidden = true;
  }

  return true;
}