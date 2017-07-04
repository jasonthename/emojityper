
const adverts = document.getElementById('adverts');

function refresh() {
  const active = adverts.querySelector('.active');
  const next = (active && active.nextElementSibling || adverts.firstElementChild);
  if (!next) {
    console.warn('no adverts to choose from');
    return;
  }

  active && active.classList.remove('active');
  next.classList.add('active');

  enqueue();
}

let timeout;
function enqueue() {
  window.clearTimeout(timeout);
  timeout = window.setTimeout(() => {
    window.requestAnimationFrame(refresh);
  }, 10 * 1000);
}

enqueue();
