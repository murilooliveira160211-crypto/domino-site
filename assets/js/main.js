/* ==========================================================================
   Dominópolis — interações da landing page (sem dependências)
   ========================================================================== */
(() => {
  'use strict';

  /* ------------------------------------------------------------------
     Configuração
     ------------------------------------------------------------------ */
  const PRODUCTS = {
    pocket: {
      id: 'pocket',
      name: 'Edição Pocket',
      detail: '20 peças',
      price: 4990, // centavos
      img: 'assets/img/thumb-pocket.svg',
    },
    completa: {
      id: 'completa',
      name: 'Edição Completa',
      detail: '40 peças + Tabuleiro-Moldura 8x8',
      price: 8990,
      img: 'assets/img/thumb-completa.svg',
    },
  };
  const PIX_DISCOUNT_PCT = 5;
  const MAX_QTY = 10;
  const STORAGE_KEY = 'dominopolis:cart:v1';

  /**
   * TODO (antes de vender de verdade): URL do checkout real (Nuvemshop, Shopify,
   * Yampi, Mercado Pago…). Enquanto estiver vazia, "Finalizar pedido" só mostra
   * uma confirmação de demonstração e NENHUM pagamento é processado.
   * O carrinho é enviado como ?itens=pocket:1,completa:2
   */
  const CHECKOUT_URL = '';

  /**
   * Frete SIMULADO por faixa de CEP (1º dígito = região dos Correios), a partir
   * de São Paulo. Substitua por uma cotação real (Melhor Envio, Correios, Frenet…).
   * [preço em centavos, prazo mínimo, prazo máximo em dias úteis]
   */
  const SHIPPING_TABLE = [
    { region: 'Grande São Paulo', eco: [1490, 3, 5], exp: [2490, 1, 2] },
    { region: 'Interior e litoral de SP', eco: [1690, 4, 6], exp: [2790, 1, 3] },
    { region: 'Rio de Janeiro e Espírito Santo', eco: [1890, 4, 7], exp: [3190, 2, 3] },
    { region: 'Minas Gerais', eco: [1890, 4, 7], exp: [3190, 2, 3] },
    { region: 'Bahia e Sergipe', eco: [2490, 6, 9], exp: [4290, 3, 4] },
    { region: 'PE, AL, PB e RN', eco: [2690, 7, 10], exp: [4590, 3, 5] },
    { region: 'CE, PI, MA e Região Norte', eco: [2990, 8, 12], exp: [4990, 4, 6] },
    { region: 'Centro-Oeste, TO e RO', eco: [2290, 5, 8], exp: [3990, 2, 4] },
    { region: 'Paraná e Santa Catarina', eco: [1990, 4, 7], exp: [3390, 2, 3] },
    { region: 'Rio Grande do Sul', eco: [2190, 5, 8], exp: [3690, 2, 4] },
  ];

  /* ------------------------------------------------------------------
     Utilitários
     ------------------------------------------------------------------ */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const money = (cents) => brl.format(cents / 100);
  /** Desconto Pix arredondado para baixo (a favor da loja, padrão de mercado). */
  const pixDiscount = (cents) => Math.floor((cents * PIX_DISCOUNT_PCT) / 100);
  const pixPrice = (cents) => cents - pixDiscount(cents);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const setText = (sel, value) => $$(sel).forEach((el) => { el.textContent = value; });

  const replay = (el, cls) => {
    if (!el || reducedMotion) return;
    el.classList.remove(cls);
    void el.offsetWidth; // reinicia a animação
    el.classList.add(cls);
  };

  /* ------------------------------------------------------------------
     Persistência do carrinho (localStorage pode falhar: aba anônima etc.)
     ------------------------------------------------------------------ */
  const store = {
    load() {
      try {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        if (!Array.isArray(data)) return [];
        return data
          .filter((i) => i && PRODUCTS[i.id] && Number.isInteger(i.qty) && i.qty > 0)
          .map((i) => ({ id: i.id, qty: Math.min(i.qty, MAX_QTY) }));
      } catch {
        return [];
      }
    },
    save(items) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch {
        /* sem armazenamento: o carrinho vale só para esta visita */
      }
    },
  };

  let cart = store.load();
  let selected = ($('[data-edition]:checked') || {}).value || 'completa';

  /* ------------------------------------------------------------------
     Cabeçalho: sombra ao rolar + menu mobile
     ------------------------------------------------------------------ */
  const header = $('[data-header]');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const nav = $('[data-nav]');
  const navToggle = $('[data-nav-toggle]');
  const setNav = (open) => {
    nav.classList.toggle('is-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  };
  navToggle.addEventListener('click', () => setNav(!nav.classList.contains('is-open')));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setNav(false); });
  document.addEventListener('click', (e) => {
    if (nav.classList.contains('is-open') && !e.target.closest('[data-nav]') && !e.target.closest('[data-nav-toggle]')) setNav(false);
  });

  /* ------------------------------------------------------------------
     Seletor de edição → preço na tela
     ------------------------------------------------------------------ */
  const editionInputs = $$('[data-edition]');
  const upsell = $('[data-upsell]');
  const announcer = $('[data-price-announcer]');

  function renderSelection({ animate = true } = {}) {
    const p = PRODUCTS[selected];
    editionInputs.forEach((input) => {
      input.closest('.edition-card').classList.toggle('is-selected', input.checked);
    });
    setText('[data-edition-name]', p.name);
    setText('[data-price]', money(p.price));
    setText('[data-price-pix]', money(pixPrice(p.price)));

    const showUpsell = selected === 'pocket';
    upsell.hidden = !showUpsell;
    if (showUpsell) setText('[data-upsell-diff]', money(PRODUCTS.completa.price - PRODUCTS.pocket.price));

    if (animate) {
      $$('.price-value').forEach((el) => replay(el, 'flash'));
      announcer.textContent = `${p.name}: ${money(p.price)}, ou ${money(pixPrice(p.price))} no Pix.`;
    }
  }

  editionInputs.forEach((input) => {
    input.addEventListener('change', () => {
      if (!input.checked) return;
      selected = input.value;
      renderSelection();
    });
  });

  $('[data-upsell-switch]').addEventListener('click', () => {
    const target = editionInputs.find((i) => i.value === 'completa');
    target.checked = true;
    selected = 'completa';
    renderSelection();
    target.focus({ preventScroll: true });
  });

  /* ------------------------------------------------------------------
     Carrinho
     ------------------------------------------------------------------ */
  const drawer = $('[data-cart]');
  const overlay = $('[data-cart-overlay]');
  const list = $('[data-cart-items]');
  const tpl = $('#cart-item-tpl');
  const emptyState = $('[data-cart-empty]');
  const checkoutStatus = $('[data-checkout-status]');
  let lastTrigger = null;

  const totalQty = () => cart.reduce((sum, i) => sum + i.qty, 0);
  const subtotal = () => cart.reduce((sum, i) => sum + PRODUCTS[i.id].price * i.qty, 0);

  function commit() {
    store.save(cart);
    renderCart();
  }

  function addToCart(id, qty = 1) {
    const item = cart.find((i) => i.id === id);
    if (item) item.qty = Math.min(item.qty + qty, MAX_QTY);
    else cart.push({ id, qty: Math.min(qty, MAX_QTY) });
    checkoutStatus.textContent = '';
    commit();
    replay($('[data-cart-count]'), 'bump');
  }

  function setQty(id, qty) {
    const item = cart.find((i) => i.id === id);
    if (!item) return;
    item.qty = Math.max(1, Math.min(qty, MAX_QTY));
    commit();
  }

  function removeItem(id) {
    cart = cart.filter((i) => i.id !== id);
    commit();
  }

  function renderCart() {
    const count = totalQty();
    const countEl = $('[data-cart-count]');
    countEl.textContent = String(count);
    countEl.classList.toggle('has-items', count > 0);
    $('[data-open-cart]').setAttribute('aria-label', `Abrir carrinho (${count} ${count === 1 ? 'item' : 'itens'})`);
    setText('[data-cart-count-text]', count ? `(${count})` : '');

    const frag = document.createDocumentFragment();
    for (const item of cart) {
      const p = PRODUCTS[item.id];
      const li = tpl.content.firstElementChild.cloneNode(true);
      li.dataset.id = item.id;
      const img = $('.ci-img', li);
      img.src = p.img;
      $('.ci-name', li).textContent = p.name;
      $('.ci-detail', li).textContent = `${p.detail} · ${money(p.price)} cada`;
      $('.qty', li).setAttribute('aria-label', `Quantidade de ${p.name}`);
      $('.qty-val', li).textContent = String(item.qty);
      const dec = $('[data-act="dec"]', li);
      const inc = $('[data-act="inc"]', li);
      dec.setAttribute('aria-label', `Diminuir quantidade de ${p.name}`);
      inc.setAttribute('aria-label', `Aumentar quantidade de ${p.name}`);
      dec.disabled = item.qty <= 1;
      inc.disabled = item.qty >= MAX_QTY;
      $('[data-act="remove"]', li).setAttribute('aria-label', `Remover ${p.name} do carrinho`);
      const line = p.price * item.qty;
      $('.ci-total', li).textContent = money(line);
      $('.ci-pix', li).textContent = `${money(pixPrice(line))} no Pix`;
      frag.appendChild(li);
    }
    list.replaceChildren(frag);

    const sub = subtotal();
    setText('[data-subtotal]', money(sub));
    setText('[data-discount]', `− ${money(pixDiscount(sub))}`);
    setText('[data-total-pix]', money(pixPrice(sub)));
    setText('[data-total-card]', money(sub));

    const isEmpty = cart.length === 0;
    emptyState.hidden = !isEmpty;
    drawer.classList.toggle('is-empty', isEmpty);
  }

  list.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn || btn.disabled) return;
    const li = btn.closest('.cart-item');
    const id = li.dataset.id;
    const item = cart.find((i) => i.id === id);
    if (!item) return;
    const act = btn.dataset.act;
    if (act === 'inc') setQty(id, item.qty + 1);
    if (act === 'dec') setQty(id, item.qty - 1);
    if (act === 'remove') {
      removeItem(id);
      const next = $('.cart-item [data-act="remove"]', list) || $('[data-close-cart]', drawer);
      next.focus();
      return;
    }
    // mantém o foco no mesmo botão depois de re-renderizar
    const again = $(`.cart-item[data-id="${id}"] [data-act="${act}"]`, list);
    if (again && !again.disabled) again.focus();
    else $(`.cart-item[data-id="${id}"] .qty-btn:not(:disabled)`, list)?.focus();
  });

  /* Drawer: abrir/fechar com foco preso dentro */
  const focusables = () =>
    $$('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])', drawer).filter(
      (el) => el.offsetParent !== null,
    );

  function openCart(trigger) {
    lastTrigger = trigger || document.activeElement;
    setNav(false);
    drawer.classList.add('is-open');
    overlay.classList.add('is-open');
    document.body.classList.add('is-locked');
    mobileBar.classList.add('is-hidden');
    // espera o drawer ficar visível para mover o foco
    requestAnimationFrame(() => $('[data-close-cart]', drawer).focus());
  }

  function closeCart() {
    if (!drawer.classList.contains('is-open')) return;
    drawer.classList.remove('is-open');
    overlay.classList.remove('is-open');
    document.body.classList.remove('is-locked');
    updateMobileBar();
    if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus({ preventScroll: true });
  }

  $$('[data-open-cart]').forEach((btn) => btn.addEventListener('click', () => openCart(btn)));
  drawer.addEventListener('click', (e) => { if (e.target.closest('[data-close-cart]')) closeCart(); });
  overlay.addEventListener('click', closeCart);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (drawer.classList.contains('is-open')) closeCart();
      else if (nav.classList.contains('is-open')) { setNav(false); navToggle.focus(); }
    }
    if (e.key === 'Tab' && drawer.classList.contains('is-open')) {
      const els = focusables();
      if (!els.length) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* Botões de compra */
  $$('[data-buy]').forEach((btn) =>
    btn.addEventListener('click', () => {
      addToCart(selected);
      openCart(btn);
    }),
  );
  $$('[data-add]').forEach((btn) =>
    btn.addEventListener('click', () => {
      addToCart(btn.dataset.add);
      openCart(btn);
    }),
  );

  /* Finalizar pedido */
  $('[data-checkout]').addEventListener('click', () => {
    if (!cart.length) return;
    if (CHECKOUT_URL) {
      const url = new URL(CHECKOUT_URL, window.location.href);
      url.searchParams.set('itens', cart.map((i) => `${i.id}:${i.qty}`).join(','));
      window.location.href = url.toString();
      return;
    }
    console.warn('[Dominópolis] CHECKOUT_URL não configurada em assets/js/main.js — pedido não enviado.');
    checkoutStatus.textContent =
      `Pedido de demonstração: ${totalQty()} ${totalQty() === 1 ? 'item' : 'itens'}, ${money(pixPrice(subtotal()))} no Pix. ` +
      'O checkout ainda não está conectado — nenhum pagamento foi processado.';
  });

  /* ------------------------------------------------------------------
     Barra fixa mobile: aparece quando o botão principal sai da tela
     ------------------------------------------------------------------ */
  const mobileBar = $('[data-mobile-bar]');
  const heroBuy = $('[data-hero-buy]');
  let heroBuyVisible = false;

  function updateMobileBar() {
    const hide = heroBuyVisible || drawer.classList.contains('is-open');
    mobileBar.classList.toggle('is-hidden', hide);
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(
      ([entry]) => {
        heroBuyVisible = entry.isIntersecting;
        updateMobileBar();
      },
      { rootMargin: `-${68}px 0px 0px 0px` },
    ).observe(heroBuy);
  }

  /* ------------------------------------------------------------------
     Simulador de frete
     ------------------------------------------------------------------ */
  const shipForm = $('[data-shipping]');
  const cepInput = $('[data-cep]');
  const cepMsg = $('[data-cep-msg]');
  const cepBtn = $('[data-cep-submit]');
  const shipResult = $('[data-shipping-result]');

  const formatCep = (digits) => (digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits);

  cepInput.addEventListener('input', () => {
    const digits = cepInput.value.replace(/\D/g, '').slice(0, 8);
    cepInput.value = formatCep(digits);
    if (cepInput.getAttribute('aria-invalid') === 'true') {
      cepInput.removeAttribute('aria-invalid');
      cepMsg.textContent = '';
      cepMsg.classList.remove('is-error');
    }
  });

  const icon = (paths) => `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">${paths}</svg>`;
  const TRUCK = icon('<path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/>');
  const BOLT = icon('<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>');

  function shipOption({ name, cents, min, max, express }) {
    const row = document.createElement('div');
    row.className = `ship-opt${express ? ' is-express' : ''}`;
    row.innerHTML = `
      <span class="ship-opt-ico">${express ? BOLT : TRUCK}</span>
      <span><span class="ship-opt-name"></span><br><span class="ship-opt-eta"></span></span>
      <span class="ship-opt-price"></span>`;
    $('.ship-opt-name', row).textContent = name;
    $('.ship-opt-eta', row).textContent = `${min} a ${max} dias úteis`;
    $('.ship-opt-price', row).textContent = money(cents);
    return row;
  }

  shipForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const digits = cepInput.value.replace(/\D/g, '');
    if (digits.length !== 8 || Number(digits) < 1000000) {
      cepInput.setAttribute('aria-invalid', 'true');
      cepMsg.textContent = 'Digite um CEP válido com 8 números.';
      cepMsg.classList.add('is-error');
      shipResult.replaceChildren();
      cepInput.focus();
      return;
    }

    cepMsg.textContent = '';
    cepMsg.classList.remove('is-error');
    cepBtn.disabled = true;
    const label = cepBtn.textContent;
    cepBtn.innerHTML = '<span class="spinner" aria-hidden="true"></span><span class="sr-only">Calculando</span>';
    shipResult.replaceChildren();

    window.setTimeout(() => {
      const zone = SHIPPING_TABLE[Number(digits[0])];
      const region = document.createElement('p');
      region.className = 'ship-region';
      region.append('Entrega para ');
      const strong = document.createElement('strong');
      strong.textContent = `${zone.region} · CEP ${formatCep(digits)}`;
      region.append(strong);

      const note = document.createElement('p');
      note.className = 'ship-note';
      note.textContent = 'Estimativa. O valor final é confirmado no checkout.';

      shipResult.replaceChildren(
        region,
        shipOption({ name: 'Frete Econômico', cents: zone.eco[0], min: zone.eco[1], max: zone.eco[2] }),
        shipOption({ name: 'Frete Expresso', cents: zone.exp[0], min: zone.exp[1], max: zone.exp[2], express: true }),
        note,
      );
      cepBtn.disabled = false;
      cepBtn.textContent = label;
    }, reducedMotion ? 0 : 550);
  });

  $$('[data-focus-cep]').forEach((a) =>
    a.addEventListener('click', (e) => {
      e.preventDefault();
      cepInput.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
      cepInput.focus({ preventScroll: true });
    }),
  );

  /* ------------------------------------------------------------------
     Vitrine / galeria
     ------------------------------------------------------------------ */
  const stage = $('[data-gallery-stage]');
  const mainImg = $('[data-gallery-img]');
  const caption = $('[data-gallery-caption]');
  const counter = $('[data-gallery-counter]');
  const thumbs = $$('.thumb');
  let current = 0;

  function show(index, { focusThumb = false } = {}) {
    const i = (index + thumbs.length) % thumbs.length;
    if (i === current && mainImg.getAttribute('src') === thumbs[i].dataset.src) return;
    current = i;
    const t = thumbs[i];
    thumbs.forEach((th, k) => {
      th.classList.toggle('is-active', k === i);
      th.setAttribute('aria-pressed', String(k === i));
    });
    stage.classList.remove('is-zoomed');
    const swap = () => {
      mainImg.src = t.dataset.src;
      mainImg.alt = t.dataset.alt;
      caption.textContent = t.dataset.caption;
      counter.textContent = `${i + 1} / ${thumbs.length}`;
      mainImg.classList.remove('is-fading');
    };
    if (reducedMotion) swap();
    else {
      mainImg.classList.add('is-fading');
      window.setTimeout(swap, 160);
    }
    if (focusThumb) t.focus();
  }

  thumbs.forEach((t, i) => t.addEventListener('click', () => show(i)));
  $('[data-gallery-prev]').addEventListener('click', (e) => { e.stopPropagation(); show(current - 1); });
  $('[data-gallery-next]').addEventListener('click', (e) => { e.stopPropagation(); show(current + 1); });

  $('.gallery-thumbs').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); show(current + 1, { focusThumb: true }); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(current - 1, { focusThumb: true }); }
  });

  // Swipe no celular
  let touchX = null;
  let touchY = null;
  stage.addEventListener('touchstart', (e) => {
    touchX = e.touches[0].clientX;
    touchY = e.touches[0].clientY;
  }, { passive: true });
  stage.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    const dy = e.changedTouches[0].clientY - touchY;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) show(current + (dx < 0 ? 1 : -1));
    touchX = touchY = null;
  }, { passive: true });

  // Zoom ao passar o mouse (só com mouse/trackpad)
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    stage.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      stage.classList.toggle('is-zoomed');
    });
    stage.addEventListener('mousemove', (e) => {
      const r = stage.getBoundingClientRect();
      stage.style.setProperty('--zx', `${((e.clientX - r.left) / r.width) * 100}%`);
      stage.style.setProperty('--zy', `${((e.clientY - r.top) / r.height) * 100}%`);
    });
    stage.addEventListener('mouseleave', () => stage.classList.remove('is-zoomed'));
  }

  // Pré-carrega as imagens da galeria depois que a página estabiliza
  window.addEventListener('load', () => {
    thumbs.forEach((t) => { const im = new Image(); im.src = t.dataset.src; });
  });

  /* ------------------------------------------------------------------
     Animação de entrada das seções
     ------------------------------------------------------------------ */
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reducedMotion) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-visible'));
  }

  /* ------------------------------------------------------------------
     Inicialização
     ------------------------------------------------------------------ */
  renderSelection({ animate: false });
  renderCart();
  updateMobileBar();
})();
