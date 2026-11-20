import { CONFIG } from './config.js';

const root = document.documentElement;
// У каждого раздела свой адрес. Переход между ними без перезагрузки, чтобы 3D-сцена не начиналась заново.
const PAGES = {
  glavnaya: { path: '/', title: 'Ассет: сайты, приложения и автоматизация для бизнеса' },
  uslugi: { path: '/uslugi/', title: 'Услуги: сайты, приложения и автоматизация | Ассет' },
  process: { path: '/process/', title: 'Как мы работаем: пять шагов от разбора задачи до сопровождения | Ассет' },
  raboty: { path: '/raboty/', title: 'Работы | Ассет' },
  kontakty: { path: '/kontakty/', title: 'Обсудить проект | Ассет' },
};
const pageFromPath = (path) =>
  Object.keys(PAGES).find((k) => PAGES[k].path === path || PAGES[k].path === `${path}/`) || 'glavnaya';
const FIT_TEXT = {
  asset: 'Это наш собственный стиль. Нажмите на любую сферу: цвета, шрифты и 3D-сцена поменяются за секунду. Так же гибко мы подходим к задаче клиента.',
  restaurant: 'Ресторану можем сделать сайт с меню и бронированием столов, приложение с программой лояльности, автоматический приём заказов и отчёты по смене.',
  production: 'Производству можем сделать учёт заказов и партий, доску задач для цехов, личные кабинеты заказчиков и связку со складом и бухгалтерией.',
  shop: 'Магазину можем сделать витрину с оплатой и доставкой, мобильное приложение, автоответы покупателям и синхронизацию остатков.',
  services: 'Сфере услуг можем сделать онлайн-запись, напоминания клиентам, CRM под ваши процессы и приложение для мастеров.',
};

let scene = null;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Навигация: главное меню слева и нижняя панель на телефоне ---------- */
const menu = document.querySelector('.menu');
const tabbar = document.querySelector('.tabbar');
const navLinks = [...document.querySelectorAll('.menu a, .tabbar a')];
const canonical = document.querySelector('link[rel="canonical"]');
const ogUrl = document.querySelector('meta[property="og:url"]');

function moveThumbs() {
  const m = menu.querySelector('[aria-current="page"]');
  menu.classList.toggle('has-current', !!m);
  if (m) {
    menu.style.setProperty('--thumb-y', `${m.offsetTop}px`);
    menu.style.setProperty('--thumb-h', `${m.offsetHeight}px`);
  }
  const t = tabbar.querySelector('[aria-current="page"]');
  tabbar.classList.toggle('has-current', !!t);
  if (t) {
    tabbar.style.setProperty('--thumb-x', `${t.offsetLeft}px`);
    tabbar.style.setProperty('--thumb-w', `${t.offsetWidth}px`);
  }
}

function showPage(name, { focus = false } = {}) {
  if (!PAGES[name]) name = 'glavnaya';
  root.dataset.page = name;
  navLinks.forEach((a) => {
    if (a.dataset.go === name) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  document.title = PAGES[name].title;
  const url = `https://asset-web.ru${PAGES[name].path}`;
  canonical?.setAttribute('href', url);
  ogUrl?.setAttribute('content', url);
  // Меню на главной крупнее: пересчитываем положение подложки после перестройки.
  requestAnimationFrame(moveThumbs);
  window.scrollTo(0, 0);
  if (scene) scene.setTab(name);
  if (focus) document.getElementById(`h-${name}`)?.focus({ preventScroll: true });
}

document.addEventListener('click', (e) => {
  const link = e.target.closest('[data-go]');
  if (!link || e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
  e.preventDefault();
  const name = link.dataset.go;
  if (location.pathname !== PAGES[name].path) history.pushState(null, '', PAGES[name].path);
  showPage(name, { focus: true });
});
window.addEventListener('popstate', () => showPage(pageFromPath(location.pathname)));
window.addEventListener('resize', moveThumbs);
document.fonts?.ready.then(moveThumbs);
// При загрузке подложка встаёт на место сразу, без анимации; анимация — только при переходах.
menu.classList.add('no-anim');
tabbar.classList.add('no-anim');
showPage(root.dataset.page);
setTimeout(() => {
  menu.classList.remove('no-anim');
  tabbar.classList.remove('no-anim');
}, 600);

/* ---------- Стилистики под бизнес ---------- */
const fitText = document.getElementById('fit-text');
const themeMeta = document.querySelector('meta[name="theme-color"]');

function syncSceneColors() {
  const css = getComputedStyle(root);
  themeMeta?.setAttribute('content', css.getPropertyValue('--bg').trim());
  if (scene) scene.setColors(css.getPropertyValue('--p-a'), css.getPropertyValue('--p-b'));
}

function setTheme(name) {
  root.dataset.theme = name;
  fitText.textContent = FIT_TEXT[name] || FIT_TEXT.asset;
  syncSceneColors();
  if (scene) scene.setShape(name);
  try { localStorage.setItem('asset-theme', name); } catch {}
  requestAnimationFrame(moveThumbs);
  // На телефоне сцена стоит вверху страницы: возвращаемся к ней, чтобы было видно превращение.
  if (scene && window.innerWidth <= 760 && window.scrollY > 80) {
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  }
}

document.querySelectorAll('input[name="theme"]').forEach((input) => {
  input.addEventListener('change', () => input.checked && setTheme(input.value));
  // Выбранная стилистика сохраняется между страницами и визитами.
  if (input.value === root.dataset.theme) {
    input.checked = true;
    fitText.textContent = FIT_TEXT[input.value] || FIT_TEXT.asset;
  }
});
syncSceneColors();

/* ---------- 3D: грузим после основного содержимого ---------- */
function canRun3D() {
  if (navigator.connection?.saveData) return false;
  if (navigator.deviceMemory && navigator.deviceMemory <= 2) return false;
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

function start3D() {
  if (!canRun3D()) return;
  import('./scene.js')
    .then(({ createScene }) => {
      scene = createScene(document.getElementById('scene'), { reduced });
      scene.setTab(root.dataset.page);
      syncSceneColors();
      if (root.dataset.theme !== 'asset') scene.setShape(root.dataset.theme);
      document.querySelector('.stage').classList.add('is-ready');
    })
    .catch(() => {});
}
const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 300));
if (document.readyState === 'complete') idle(start3D);
else window.addEventListener('load', () => idle(start3D));

/* ---------- Прямые контакты (появятся, когда впишем в config.js) ---------- */
const direct = [];
if (CONFIG.telegram) direct.push(['Telegram', CONFIG.telegram]);
if (CONFIG.phone) direct.push([CONFIG.phone, `tel:${CONFIG.phone.replace(/[^\d+]/g, '')}`]);
if (CONFIG.email) direct.push([CONFIG.email, `mailto:${CONFIG.email}`]);
if (direct.length) {
  const list = document.getElementById('direct-list');
  direct.forEach(([text, href]) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.textContent = text;
    a.href = href;
    li.append(a);
    list.append(li);
  });
  document.getElementById('direct').hidden = false;
}

/* ---------- Форма заявки ---------- */
const form = document.getElementById('lead-form');
const statusEl = document.getElementById('form-status');
const MESSAGES = {
  name: 'Напишите, как к вам обращаться',
  contact: 'Оставьте телефон, Telegram или почту, чтобы мы могли ответить',
  task: 'Опишите задачу хотя бы в двух словах',
};

function setError(input, text) {
  const field = input.closest('.field');
  let note = field.querySelector('.field__error');
  if (!text) {
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
    note?.remove();
    return;
  }
  if (!note) {
    note = document.createElement('p');
    note.className = 'field__error';
    note.id = `${input.id}-error`;
    field.append(note);
  }
  note.textContent = text;
  input.setAttribute('aria-invalid', 'true');
  input.setAttribute('aria-describedby', note.id);
}

form.addEventListener('input', (e) => {
  if (e.target.matches('[aria-invalid]') && e.target.value.trim()) setError(e.target, '');
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  statusEl.textContent = '';
  let firstBad = null;
  for (const key of Object.keys(MESSAGES)) {
    const input = form.elements[key];
    const bad = !input.value.trim();
    setError(input, bad ? MESSAGES[key] : '');
    if (bad && !firstBad) firstBad = input;
  }
  if (firstBad) { firstBad.focus(); return; }
  if (!form.elements.consent.checked) {
    statusEl.textContent = 'Отметьте согласие на обработку данных, без него мы не можем принять заявку.';
    form.elements.consent.focus();
    return;
  }
  if (form.elements.website.value) return; // ловушка для ботов

  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    const res = await fetch(CONFIG.leadEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.elements.name.value.trim(),
        contact: form.elements.contact.value.trim(),
        task: form.elements.task.value.trim(),
        theme: root.dataset.theme,
        page: location.href,
      }),
    });
    if (!res.ok) throw new Error(String(res.status));
    form.reset();
    statusEl.textContent = 'Заявка отправлена. Свяжемся с вами по указанному контакту.';
    if (CONFIG.metrikaId && window.ym) window.ym(CONFIG.metrikaId, 'reachGoal', 'lead');
  } catch {
    statusEl.textContent = 'Заявка не отправилась. Проверьте интернет и нажмите «Отправить заявку» ещё раз.';
  } finally {
    button.disabled = false;
  }
});

/* ---------- Яндекс Метрика: заготовка, включится после указания metrikaId ---------- */
if (CONFIG.metrikaId) {
  window.ym = window.ym || function () { (window.ym.a = window.ym.a || []).push(arguments); };
  window.ym.l = Date.now();
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://mc.yandex.ru/metrika/tag.js';
  document.head.append(s);
  window.ym(CONFIG.metrikaId, 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true });
}
