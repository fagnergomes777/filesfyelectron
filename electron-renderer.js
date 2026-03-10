const API_BASE_URL = 'http://localhost:3001/api';
const PLANS_ENDPOINT = 'http://localhost:3001/api/subscriptions/plans';

// Client ID lido do window.__ENV__ (injetado pelo preload) ou fallback vazio
// Configure GOOGLE_CLIENT_ID em filesfybackend/.env e exponha via preload
const GOOGLE_CLIENT_ID = (window.__ENV__ && window.__ENV__.GOOGLE_CLIENT_ID) || '';

let currentUser = null;
let selectedPlan = null;
let cachedPlans = [];

let wizardEl = null;
let userInfoEl = null;
let logoutBtn = null;

const DEFAULT_PLANS = [
  {
    id: 'free',
    name: 'Filesfy FREE',
    price: 0,
    originalPrice: null,
    discount: null,
    interval: 'para sempre',
    badge: 'Plano Básico',
    button: 'Começar Grátis',
    features: [
      { name: 'Até 15 varreduras por mês', included: true },
      { name: 'Limite 1GB por varredura', included: true },
      { name: 'Máximo 50 arquivos', included: true },
      { name: 'Recuperação básica', included: true },
      { name: 'Suporte prioritário', included: false }
    ]
  },
  {
    id: 'pro',
    name: 'Filesfy PRO',
    price: 1599,
    originalPrice: 1999,
    discount: '20%',
    interval: 'mês',
    badge: 'Mais Popular',
    button: 'Continuar',
    features: [
      { name: 'Limite 128GB por varredura', included: true },
      { name: 'Recuperação avançada', included: true },
      { name: 'Histórico de 90 dias', included: true },
      { name: 'Sem anúncios', included: true },
      { name: 'Exportação ilimitada', included: true }
    ]
  },
  {
    id: 'pro_annual',
    name: 'Filesfy PRO Anual',
    price: 12999,
    originalPrice: 19999,
    discount: '32%',
    interval: 'ano',
    badge: 'Melhor Custo-Benefício',
    button: 'Continuar',
    features: [
      { name: 'Limite 128GB por varredura', included: true },
      { name: 'Recuperação avançada', included: true },
      { name: 'Histórico de 90 dias', included: true },
      { name: 'Sem anúncios', included: true },
      { name: 'Exportação ilimitada', included: true }
    ]
  }
];

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCurrency(cents) {
  if (!cents) {
    return 'Grátis';
  }

  return `R$ ${(cents / 100).toFixed(2)}`;
}

function getCardClass(planId) {
  if (planId === 'free') {
    return 'plan-card free-card';
  }

  if (planId === 'pro_annual') {
    return 'plan-card annual-card';
  }

  return 'plan-card pro-card';
}

function getBadgeClass(planId) {
  if (planId === 'pro_annual') {
    return 'plan-badge plan-badge-annual';
  }

  if (planId === 'pro') {
    return 'plan-badge plan-badge-pro';
  }

  return 'plan-badge';
}

function getPlanButtonClass(planId) {
  if (planId === 'free') {
    return 'btn-free';
  }

  return 'btn-pro';
}

function normalizePlans(response) {
  if (Array.isArray(response)) {
    return response;
  }

  if (response && Array.isArray(response.plans)) {
    return response.plans;
  }

  return null;
}

function getStoredUser() {
  // Tenta a chave padronizada 'user' primeiro, depois o legado 'user_data'
  const raw = localStorage.getItem('user') || localStorage.getItem('user_data');

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    localStorage.removeItem('user');
    localStorage.removeItem('user_data');
    return null;
  }
}

async function loadPlans() {
  try {
    const response = await fetch(PLANS_ENDPOINT, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP ${response.status}`);
    }

    const data = await response.json();
    const plans = normalizePlans(data);

    if (!plans || plans.length === 0) {
      throw new Error('Nenhum plano retornado pela API');
    }

    cachedPlans = plans;
  } catch (error) {
    cachedPlans = DEFAULT_PLANS;
  }
}

function updateHeader() {
  if (!userInfoEl || !logoutBtn) {
    return;
  }

  if (!currentUser) {
    userInfoEl.hidden = true;
    logoutBtn.hidden = true;
    userInfoEl.innerHTML = '';
    return;
  }

  const displayName = currentUser.name || currentUser.nome || 'Usuário';
  const planName = currentUser.plan || currentUser.tipo_de_plano || selectedPlan || 'FREE';
  const avatar = currentUser.avatar_url || currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}`;

  userInfoEl.innerHTML = `
    <img src="${escapeHtml(avatar)}" alt="${escapeHtml(displayName)}" />
    <span>${escapeHtml(displayName)} <strong>(${escapeHtml(planName)})</strong></span>
  `;

  userInfoEl.hidden = false;
  logoutBtn.hidden = false;
}

function renderPlanCards(plans) {
  if (!plans || plans.length === 0) {
    return '<p>Nenhum plano disponível no momento.</p>';
  }

  return plans.map((plan) => {
    const price = formatCurrency(plan.price);
    const duration = plan.interval ? `/${plan.interval}` : '';
    const badgeClass = getBadgeClass(plan.id);
    const cardClass = getCardClass(plan.id);
    const buttonClass = getPlanButtonClass(plan.id);
    const features = Array.isArray(plan.features) ? plan.features : [];

    return `
      <article class="${cardClass}">
        <span class="${badgeClass}">${escapeHtml(plan.badge || 'Plano')}</span>
        <h2>${escapeHtml(plan.name || 'Plano')}</h2>

        <div class="plan-pricing">
          ${plan.originalPrice ? `<span class="original-price">De ${formatCurrency(plan.originalPrice)}</span>` : ''}
          <span class="price">${escapeHtml(price)}</span>
          <span class="duration">${escapeHtml(duration)}</span>
          ${plan.discount ? `<span class="discount">${escapeHtml(plan.discount)} OFF</span>` : ''}
        </div>

        <div class="plan-features">
          ${features.map((feature) => {
            const included = Boolean(feature && feature.included);
            const itemClass = included ? 'feature-item included' : 'feature-item excluded';
            const icon = included ? '' : '';
            return `
              <div class="${itemClass}">
                <span class="feature-icon">${icon}</span>
                <span>${escapeHtml(feature ? feature.name : '')}</span>
              </div>
            `;
          }).join('')}
        </div>

        <button class="${buttonClass}" data-plan-id="${escapeHtml(plan.id)}">${escapeHtml(plan.button || 'Selecionar')}</button>
      </article>
    `;
  }).join('');
}

function showPlansScreen() {
  wizardEl.innerHTML = `
    <section class="plans-container">
      <header class="plans-header">
        <h1>Escolha seu Plano</h1>
        <p>Selecione FREE para começar ou upgrade para PRO.</p>
      </header>

      <div class="plans-grid">
        ${renderPlanCards(cachedPlans)}
      </div>
    </section>
  `;

  const planButtons = wizardEl.querySelectorAll('[data-plan-id]');
  planButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const planId = button.getAttribute('data-plan-id');
      selectPlan(planId);
    });
  });
}

function showLoginPrompt(planId) {
  const plan = cachedPlans.find((item) => item.id === planId) || DEFAULT_PLANS.find((item) => item.id === planId);
  const price = plan ? formatCurrency(plan.price) : 'Plano';
  const interval = plan && plan.interval ? `/${plan.interval}` : '';

  wizardEl.innerHTML = `
    <section class="plans-container">
      <header class="plans-header">
        <h1>🛒 Quase lá! Finalize sua compra</h1>
        <p>${escapeHtml(plan ? plan.name : 'Plano PRO')} — ${escapeHtml(price)}${escapeHtml(interval)}</p>
        <p style="font-size:13px;color:#888;margin-top:4px;">Faça login com sua conta Google para prosseguir</p>
      </header>

      <div class="plans-grid">
        <article class="plan-card pro-card" style="max-width:420px;margin:0 auto;">

          <!-- Botão Google Sign-In -->
          <div id="google-signin-electron" style="margin-bottom:16px;"></div>

          <button class="btn-secondary" id="btn-back-plans" style="width:100%;margin-top:10px;">
            ← Voltar aos planos
          </button>
        </article>
      </div>
    </section>
  `;

  // Inicializar Google Sign-In se SDK já carregado
  const tryInitGoogle = () => {
    if (window.google && window.google.accounts && GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_ID.includes('USE_YOUR')) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          await handleGoogleResponse(response.credential, planId);
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      const container = document.getElementById('google-signin-electron');
      if (container) {
        window.google.accounts.id.renderButton(container, {
          type: 'standard',
          size: 'large',
          text: 'signin_with',
          locale: 'pt-BR',
          width: 380,
        });
      }
    } else if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes('USE_YOUR')) {
      // Client ID não configurado: esconder div e mostrar aviso
      const container = document.getElementById('google-signin-electron');
      if (container) {
        container.innerHTML = '<p style="color:#f87171;font-size:12px;text-align:center;">⚠️ GOOGLE_CLIENT_ID não configurado</p>';
      }
    }
  };

  // SDK pode ainda estar carregando
  if (window.google && window.google.accounts) {
    tryInitGoogle();
  } else {
    const interval = setInterval(() => {
      if (window.google && window.google.accounts) {
        clearInterval(interval);
        tryInitGoogle();
      }
    }, 200);
    // Desistir após 5s
    setTimeout(() => clearInterval(interval), 5000);
  }

  const backButton = document.getElementById('btn-back-plans');

  if (backButton) {
    backButton.addEventListener('click', showPlansScreen);
  }
}

function showHomeScreen(planId) {
  const isFree = planId === 'free';
  const title = isFree ? 'Plano FREE ativo' : 'Plano PRO ativo';
  const subtitle = isFree ? 'Você está usando os recursos gratuitos.' : 'Seu acesso PRO está pronto para uso.';

  wizardEl.innerHTML = `
    <section class="plans-container">
      <header class="plans-header">
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(subtitle)}</p>
      </header>

      <div class="plans-grid">
        <article class="plan-card ${isFree ? 'free-card' : 'pro-card'}">
          <div class="plan-features">
            <div class="feature-item included"><span class="feature-icon">✓</span><span>Home simplificada carregada</span></div>
            <div class="feature-item included"><span class="feature-icon">✓</span><span>Você pode voltar aos planos quando quiser</span></div>
          </div>
          <button class="btn-secondary" id="btn-return-plans">Voltar aos planos</button>
        </article>
      </div>
    </section>
  `;

  const returnButton = document.getElementById('btn-return-plans');
  if (returnButton) {
    returnButton.addEventListener('click', showPlansScreen);
  }
}

function selectPlan(planId) {
  selectedPlan = planId;

  if (planId === 'free') {
    showHomeScreen('free');
    return;
  }

  showLoginPrompt(planId);
}

// Handler do callback do Google Sign-In para o Electron
async function handleGoogleResponse(credential, planId) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/google-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: credential }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || `Erro HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data || !data.user || !data.token) {
      throw new Error('Resposta de login inválida');
    }

    // Salvar com chaves padronizadas (compatível com public/ e src/)
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    if (data.subscription) {
      localStorage.setItem('subscription', JSON.stringify(data.subscription));
    }

    currentUser = data.user;
    selectedPlan = planId || selectedPlan || 'pro';
    updateHeader();
    showHomeScreen(selectedPlan);
  } catch (error) {
    wizardEl.innerHTML = `
      <section class="plans-container">
        <header class="plans-header">
          <h1>Erro no login com Google</h1>
          <p>${escapeHtml(error.message || 'Verifique a conexão com o servidor')}</p>
        </header>
        <div class="plans-grid">
          <article class="plan-card pro-card">
            <button class="btn-secondary" id="btn-retry-google">Tentar novamente</button>
          </article>
        </div>
      </section>
    `;
    const retryBtn = document.getElementById('btn-retry-google');
    if (retryBtn) retryBtn.addEventListener('click', () => showLoginPrompt(planId));
  }
}

function setupLogout() {
  if (!logoutBtn) {
    return;
  }

  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('subscription');
    // remover chaves legadas caso existam
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    currentUser = null;
    selectedPlan = null;
    updateHeader();
    showPlansScreen();
  });
}

async function init() {
  wizardEl = document.getElementById('wizard');
  userInfoEl = document.getElementById('user-info');
  logoutBtn = document.getElementById('logout-btn');

  if (!wizardEl) {
    return;
  }

  currentUser = getStoredUser();
  setupLogout();
  updateHeader();

  await loadPlans();
  showPlansScreen();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}





