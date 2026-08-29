const header = document.querySelector('[data-header]');
const menuButton = document.querySelector('[data-menu-button]');
const nav = document.querySelector('[data-nav]');
const navLinks = [...document.querySelectorAll('.site-nav a')];
const sections = [...document.querySelectorAll('main section[id]')];
const reveals = document.querySelectorAll('.reveal');
const form = document.querySelector('[data-contact-form]');
const year = document.querySelector('[data-year]');

const setMenu = (open) => {
  if (!menuButton || !nav || !header) return;
  menuButton.setAttribute('aria-expanded', String(open));
  nav.classList.toggle('is-open', open);
  header.classList.toggle('is-open', open);
  document.body.classList.toggle('menu-open', open);
};

const toggleMenu = () => {
  if (!menuButton) return;
  setMenu(menuButton.getAttribute('aria-expanded') !== 'true');
};

navLinks.forEach((link) => link.addEventListener('click', () => setMenu(false)));

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuButton?.getAttribute('aria-expanded') === 'true') {
    setMenu(false);
    menuButton.focus();
  }
});

window.addEventListener('resize', () => {
  if (window.innerWidth > 900) setMenu(false);
});

const syncHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 24);
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
        if (link.getAttribute('aria-current') === 'page') return;
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

form?.addEventListener('submit', (event) => {
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

if (year) year.textContent = new Date().getFullYear();

const productLists = [...document.querySelectorAll('[data-product-list]')];

const formatPrice = (price) => {
  if (typeof price === 'number') {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(price);
  }

  return String(price || '가격 준비 중');
};

const getPurchaseUrl = (value) => {
  if (!value) return null;

  try {
    const url = new URL(value, window.location.href);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
};

const createProductCard = (product, headingLevel = 3) => {
  const card = document.createElement('article');
  card.className = 'product-card';

  const imageFrame = document.createElement('div');
  imageFrame.className = 'product-card__image';

  const image = document.createElement('img');
  image.src = product.image || 'assets/collection.png';
  image.alt = `${product.name || '건지울른스 제품'} 제품 이미지`;
  image.width = 900;
  image.height = 720;
  image.loading = 'lazy';
  imageFrame.append(image);

  const info = document.createElement('div');
  info.className = 'product-card__info';

  const text = document.createElement('div');
  const name = document.createElement(`h${headingLevel}`);
  name.textContent = product.name || '제품명 준비 중';
  const price = document.createElement('p');
  price.textContent = formatPrice(product.price);
  text.append(name, price);

  const purchaseUrl = getPurchaseUrl(product.purchaseUrl);
  let action;

  if (purchaseUrl) {
    action = document.createElement('a');
    action.href = purchaseUrl;
    action.target = '_blank';
    action.rel = 'noopener noreferrer';
    action.textContent = '구매하기';
    action.setAttribute('aria-label', `${product.name || '제품'} 구매하기 — 새 탭에서 열림`);
  } else {
    action = document.createElement('span');
    action.textContent = '구매 준비 중';
    action.setAttribute('aria-disabled', 'true');
  }

  action.className = `product-card__buy${purchaseUrl ? '' : ' is-disabled'}`;
  info.append(text, action);
  card.append(imageFrame, info);
  return card;
};

const renderProductStatus = (list, message, isError = false) => {
  list.replaceChildren();
  const status = document.createElement('p');
  status.className = `product-status${isError ? ' is-error' : ''}`;
  status.setAttribute('role', isError ? 'alert' : 'status');
  status.textContent = message;
  list.append(status);
};

const loadProducts = async () => {
  if (!productLists.length) return;

  try {
    const response = await fetch('products.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const products = await response.json();
    if (!Array.isArray(products) || products.length === 0) {
      productLists.forEach((list) => renderProductStatus(list, '등록된 제품이 없습니다. 새 제품을 준비하고 있습니다.'));
      return;
    }

    productLists.forEach((list) => {
      const limit = Number.parseInt(list.dataset.productLimit || '', 10);
      const headingLevel = Number.parseInt(list.dataset.productHeading || '3', 10);
      const visibleProducts = Number.isFinite(limit) ? products.slice(0, limit) : products;
      list.replaceChildren(...visibleProducts.map((product) => createProductCard(product, headingLevel)));
    });
  } catch {
    productLists.forEach((list) => renderProductStatus(list, '제품 정보를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.', true));
  }
};

loadProducts();
