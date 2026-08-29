const header = document.querySelector('[data-header]');
const menuButton = document.querySelector('[data-menu-button]');
const nav = document.querySelector('[data-nav]');
const navLinks = [...document.querySelectorAll('.site-nav a')];
const sections = [...document.querySelectorAll('main section[id]')];
const reveals = document.querySelectorAll('.reveal');
const form = document.querySelector('[data-contact-form]');
const year = document.querySelector('[data-year]');

const setMenu = (open) => {
  menuButton.setAttribute('aria-expanded', String(open));
  nav.classList.toggle('is-open', open);
  header.classList.toggle('is-open', open);
  document.body.classList.toggle('menu-open', open);
};

const toggleMenu = () => {
  setMenu(menuButton.getAttribute('aria-expanded') !== 'true');
};

navLinks.forEach((link) => link.addEventListener('click', () => setMenu(false)));

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
    setMenu(false);
    menuButton.focus();
  }
});

window.addEventListener('resize', () => {
  if (window.innerWidth > 900) setMenu(false);
});

const syncHeader = () => header.classList.toggle('is-scrolled', window.scrollY > 24);
syncHeader();
window.addEventListener('scroll', syncHeader, { passive: true });

if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12 });

  reveals.forEach((element) => revealObserver.observe(element));

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((link) => {
        const isCurrent = link.getAttribute('href') === `#${entry.target.id}`;
        if (isCurrent) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-35% 0px -55%', threshold: 0 });

  sections.forEach((section) => sectionObserver.observe(section));
} else {
  reveals.forEach((element) => element.classList.add('is-visible'));
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const input = form.querySelector('input[type="email"]');
  const message = form.querySelector('.form-message');
  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());

  message.classList.remove('is-error', 'is-success');
  input.removeAttribute('aria-invalid');

  if (!emailLooksValid) {
    message.textContent = '받으실 이메일 주소를 정확히 입력해 주세요.';
    message.classList.add('is-error');
    input.setAttribute('aria-invalid', 'true');
    input.focus();
    return;
  }

  message.textContent = '관심을 남겨주셔서 고맙습니다. 현재는 시연용 폼이며 정보는 전송되지 않습니다.';
  message.classList.add('is-success');
  form.reset();
});

year.textContent = new Date().getFullYear();
