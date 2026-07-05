/* ============================================================
   StateCRM — App Logic
   by ASQVI
   ============================================================ */

// ==================== HELPERS ====================

function makeEl(tag, cls, content) {
  return '<' + tag + (cls ? ' class="' + cls + '"' : '') + '>' + content + '</' + tag + '>';
}

function setText(id, val) {
  var el = document.getElementById(id);
  if (el) el.textContent = val;
}

function getVal(id) {
  var el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function clearFields(ids) {
  ids.forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
}

function fmt(n) {
  return Number(n || 0).toLocaleString('bn-BD');
}

// ==================== TIER CONFIG ====================

var TIER_PAGES = {
  Basic: ['dashboard', 'orders', 'add-order', 'payments', 'reports'],
  Pro: ['dashboard', 'orders', 'add-order', 'leads', 'add-lead', 'customers', 'payments', 'reports'],
  Elite: ['dashboard', 'orders', 'add-order', 'leads', 'add-lead', 'customers', 'payments', 'team-performance', 'cod-risk', 'courier', 'segments', 'monthly-report', 'reports']
};

var LOCKED_PAGES = ['leads', 'add-lead', 'customers', 'team-performance', 'cod-risk', 'courier', 'segments', 'monthly-report'];

// ==================== STATE ====================

var STATE = {
  licenseKey: '',
  business: '',
  bizType: '',
  tier: '',
  expiry: '',
  daysLeft: 0,
  orders: [],
  leads: [],
  customers: [],
  dashData: null
};

// ==================== INIT ====================

window.addEventListener('load', function () {
  hideLoading();
  var saved = loadSession();
  if (saved) {
    Object.assign(STATE, saved);
    startApp();
  } else {
    showLanding();
  }
});

// ==================== NAVIGATION ====================

function showLanding() {
  hideLoading();
  document.getElementById('landingPage').style.display = 'block';
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('expiredPage').style.display = 'none';
  document.getElementById('mainApp').style.display = 'none';
}

function showLoginForm() {
  document.getElementById('landingPage').style.display = 'none';
  document.getElementById('loginPage').style.display = 'flex';
}

function goBackToLanding() {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('landingPage').style.display = 'block';
}

function showPage(pageId) {
  var tier = STATE.tier || 'Basic';
  var allowed = TIER_PAGES[tier] || TIER_PAGES['Basic'];

  if (LOCKED_PAGES.indexOf(pageId) !== -1 && allowed.indexOf(pageId) === -1) {
    showToast('⛔ এই পেজটি ' + tier + ' প্ল্যানে নেই। আপগ্রেড করুন।');
    return;
  }

  document.querySelectorAll('.page').forEach(function (p) {
    p.classList.remove('active');
  });

  var page = document.getElementById('page-' + pageId);
  if (page) {
    page.classList.add('active');
    document.querySelector('.page-container').scrollTop = 0;
  }

  document.querySelectorAll('.nav-btn').forEach(function (b) {
    b.classList.remove('active');
  });

  var nav = document.getElementById('nav-' + pageId);
  if (nav) nav.classList.add('active');

  var subs = {
    dashboard: 'আজকের ওভারভিউ',
    orders: 'অর্ডার লিস্ট',
    'add-order': 'নতুন অর্ডার',
    leads: 'লিড ট্র্যাকার',
    'add-lead': 'নতুন লিড',
    customers: 'কাস্টমার বেস',
    payments: 'পেমেন্ট',
    reports: 'রিপোর্ট',
    'team-performance': 'টিম পারফরম্যান্স',
    'cod-risk': 'COD Risk Manager',
    courier: 'কুরিয়ার ট্র্যাকার',
    segments: 'কাস্টমার সেগমেন্ট',
    'monthly-report': 'মাসিক রিপোর্ট'
  };

  var sub = document.getElementById('headerSub');
  if (sub) sub.innerHTML = (subs[pageId] || 'StateCRM') + '&nbsp;' + makeTierBadge(tier);
}

// ==================== LOGIN ====================

async function doLogin() {
  var key = document.getElementById('keyInput').value.trim().toUpperCase();
  var phone = document.getElementById('phoneInput').value.trim();
  var errEl = document.getElementById('loginErr');
  var btn = document.getElementById('loginBtn');

  errEl.classList.remove('show');

  if (!key || !phone) {
    errEl.textContent = '❌ লাইসেন্স কী এবং ফোন নম্বর দিন।';
    errEl.classList.add('show');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '⏳ যাচাই হচ্ছে...';
  showLoading('লাইসেন্স যাচাই হচ্ছে...');

  try {
    var res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey: key, phone: phone })
    });

    var data = await res.json();
    hideLoading();
    btn.disabled = false;
    btn.innerHTML = 'লগইন করুন →';

    if (data.success) {
      STATE.licenseKey = data.licenseKey;
      STATE.business = data.business;
      STATE.bizType = data.bizType;
      STATE.tier = data.tier;
      STATE.expiry = data.expiry;
      STATE.daysLeft = data.daysLeft;
      saveSession();
      startApp();
    } else {
      if (data.error === 'LICENSE_EXPIRED') {
        showExpired(data);
      } else {
        errEl.textContent = '❌ ' + (data.message || 'লগইন ব্যর্থ হয়েছে।');
        errEl.classList.add('show');
      }
    }
  } catch (e) {
    hideLoading();
    btn.disabled = false;
    btn.innerHTML = 'লগইন করুন →';
    errEl.textContent = '❌ সংযোগ ব্যর্থ।';
    errEl.classList.add('show');
  }
}

// ==================== START APP ====================

function startApp() {
  if (STATE.daysLeft !== 'Lifetime' && typeof STATE.daysLeft === 'number' && STATE.daysLeft <= 0) {
    showExpired({ business: STATE.business });
    return;
  }

  document.getElementById('landingPage').style.display = 'none';
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('expiredPage').style.display = 'none';
  document.getElementById('mainApp').style.display = 'flex';

  var initials = (STATE.business || 'S')
    .split(' ')
    .map(function (w) { return w[0] || ''; })
    .join('')
    .substring(0, 2)
    .toUpperCase();

  document.getElementById('userAvatar').textContent = initials;
  setGreeting();
  setTodayDate();
  buildNavForTier();
  buildQuickActionsForTier();
  loadDashboard();

  setInterval(function () {
    pingServer();
  }, 5 * 60 * 1000);
}

// ==================== TIER BADGE ====================

function makeTierBadge(tier) {
  var c = tier === 'Elite' ? '#fbbf24' : tier === 'Pro' ? '#7090b0' : '#4ade80';
  var bg = tier === 'Elite' ? 'rgba(251,191,36,0.1)' : tier === 'Pro' ? 'rgba(112,144,176,0.1)' : 'rgba(74,222,128,0.1)';
  var s = [
    'background:' + bg,
    'color:' + c,
    'font-size:9px',
    'font-weight:600',
    'padding:2px 8px',
    'border-radius:20px',
    'border:1px solid ' + c + '22',
    'letter-spacing:0.3px'
  ].join(';');
  return '<span style="' + s + '">' + tier + '</span>';
}

// ==================== BUILD NAV ====================

function buildNavForTier() {
  var tier = STATE.tier || 'Basic';
  var sub = document.getElementById('headerSub');
  if (sub) sub.innerHTML = 'আজকের ওভারভিউ &nbsp;' + makeTierBadge(tier);

  var navEl = document.getElementById('bottomNav');

  var base = [
    { id: 'dashboard', icon: '🏠', label: 'হোম', action: "showPage('dashboard')" },
    { id: 'orders', icon: '🛍️', label: 'অর্ডার', action: "loadAndShow('orders','orders')" },
    { id: 'add-order', icon: '➕', label: 'যোগ করুন', action: "showPage('add-order')", special: true }
  ];

  var extra = [];

  if (tier === 'Basic') {
    extra = [
      { id: 'payments', icon: '💳', label: 'পেমেন্ট', action: "loadAndShow('payments','payments')" },
      { id: 'reports', icon: '📊', label: 'রিপোর্ট', action: "loadAndShow('reports','reports')" }
    ];
  } else if (tier === 'Pro') {
    extra = [
      { id: 'leads', icon: '🎯', label: 'লিড', action: "loadAndShow('leads','leads')" },
      { id: 'customers', icon: '👥', label: 'কাস্টমার', action: "loadAndShow('customers','customers')" },
      { id: 'reports', icon: '📊', label: 'রিপোর্ট', action: "loadAndShow('reports','reports')" }
    ];
  } else {
    extra = [
      { id: 'leads', icon: '🎯', label: 'লিড', action: "loadAndShow('leads','leads')" },
      { id: 'team-performance', icon: '🏅', label: 'টিম', action: "loadAndShow('team-performance','team-performance')" },
      { id: 'monthly-report', icon: '📅', label: 'মাসিক', action: "loadAndShow('monthly-report','monthly-report')" }
    ];
  }

  var nav = base.concat(extra);
  var html = '';

  nav.forEach(function (item) {
    var iconStyle = item.special
      ? 'background:var(--accent2);border:1px solid var(--accent);border-radius:12px'
      : '';

    html +=
      '<button class="nav-btn" id="nav-' + item.id + '" onclick="' + item.action + '">' +
      '<div class="nav-icon-wrap" style="' + iconStyle + '">' + item.icon + '</div>' +
      '<div class="nav-label">' + item.label + '</div>' +
      '</button>';
  });

  navEl.innerHTML = html;

  var dn = document.getElementById('nav-dashboard');
  if (dn) dn.classList.add('active');
}

// ==================== BUILD QUICK ACTIONS ====================

function buildQuickActionsForTier() {
  var tier = STATE.tier || 'Basic';
  var el = document.getElementById('quickActions');

  var all = [
    { icon: '🛍️', color: 'green', label: 'অর্ডার যোগ', action: "showPage('add-order')", tiers: ['Basic', 'Pro', 'Elite'] },
    { icon: '🎯', color: 'indigo', label: 'লিড যোগ', action: "showPage('add-lead')", tiers: ['Pro', 'Elite'] },
    { icon: '📋', color: 'blue', label: 'অর্ডার দেখুন', action: "loadAndShow('orders','orders')", tiers: ['Basic', 'Pro', 'Elite'] },
    { icon: '👥', color: 'purple', label: 'কাস্টমার', action: "loadAndShow('customers','customers')", tiers: ['Pro', 'Elite'] },
    { icon: '💳', color: 'amber', label: 'পেমেন্ট', action: "loadAndShow('payments','payments')", tiers: ['Basic', 'Pro', 'Elite'] },
    { icon: '🏅', color: 'green', label: 'টিম পারফরম্যান্স', action: "loadAndShow('team-performance','team-performance')", tiers: ['Elite'] },
    { icon: '⚠️', color: 'red', label: 'COD Risk', action: "loadAndShow('cod-risk','cod-risk')", tiers: ['Elite'] },
    { icon: '🚚', color: 'blue', label: 'কুরিয়ার ট্র্যাকার', action: "loadAndShow('courier','courier')", tiers: ['Elite'] },
    { icon: '🏷️', color: 'purple', label: 'সেগমেন্ট', action: "loadAndShow('segments','segments')", tiers: ['Elite'] },
    { icon: '📊', color: 'red', label: 'রিপোর্ট', action: "loadAndShow('reports','reports')", tiers: ['Basic', 'Pro', 'Elite'] }
  ];

  var html = '';
  all.forEach(function (btn) {
    if (btn.tiers.indexOf(tier) === -1) return;
    html +=
      '<button class="action-btn" onclick="' + btn.action + '">' +
      '<div class="action-icon ' + btn.color + '">' + btn.icon + '</div>' +
      '<div class="action-label">' + btn.label + '</div>' +
      '</button>';
  });

  el.innerHTML = html;
}

// ==================== DATA LOADING ====================

async function loadAndShow(pageId, apiPage) {
  showPage(pageId);
  showLoading('লোড হচ্ছে...');

  try {
    var res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey: STATE.licenseKey, page: apiPage })
    });

    var result = await res.json();
    hideLoading();

    if (result.success && result.data) {
      var renders = {
        'orders': renderOrders,
        'leads': renderLeads,
        'customers': renderCustomers,
        'payments': renderPayments,
        'team-performance': renderTeamPerformance,
        'cod-risk': renderCODRisk,
        'courier': renderCourier,
        'segments': renderSegments,
        'monthly-report': renderMonthlyReport,
        'reports': function () { renderReports(); }
      };

      var fn = renders[apiPage];
      if (fn) fn(result.data);
    } else {
      showToast('⚠️ ডেটা লোড ব্যর্থ');
    }
  } catch (e) {
    hideLoading();
    showToast('❌ ডেটা লোড ব্যর্থ');
  }
}

async function loadDashboard() {
  showLoading('ড্যাশবোর্ড লোড হচ্ছে...');

  try {
    var res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey: STATE.licenseKey, page: 'dashboard' })
    });

    var result = await res.json();
    hideLoading();

    if (result.success && result.data) {
      STATE.dashData = result.data;
      renderDashboard(result.data);
    } else {
      showToast('⚠️ ডেটা লোড ব্যর্থ');
    }
  } catch (e) {
    hideLoading();
    showToast('❌ সংযোগ ব্যর্থ');
  }
}

// ==================== RENDER DASHBOARD ====================

function renderDashboard(d) {
  setText('stat-today', '৳' + fmt(d.salesToday || 0));
  setText('stat-month', '৳' + fmt(d.salesMonth || 0));
  setText('stat-orders', d.totalOrders || 0);
  setText('stat-pending', d.pendingOrders || 0);
  setText('stat-leads', d.totalLeads || 0);
  setText('stat-unpaid', '৳' + fmt(d.unpaidAmount || 0));

  if (d.unpaidAmount > 0) {
    var a = document.getElementById('alertCard');
    if (a) a.style.display = 'flex';
    var at = document.getElementById('alertText');
    if (at) at.textContent = '৳' + fmt(d.unpaidAmount) + ' অপরিশোধিত আছে';
  }

  var recentEl = document.getElementById('recentOrders');

  if (d.recentOrders && d.recentOrders.length > 0) {
    var html = '';
    d.recentOrders.forEach(function (o) {
      var initial = (o.customer || '?')[0].toUpperCase();
      var stCls = o.status.indexOf('Delivered') !== -1 ? 'green'
        : o.status.indexOf('Cancel') !== -1 ? 'red'
        : o.status.indexOf('Return') !== -1 ? 'red'
        : 'amber';

      html += makeEl('div', 'list-item',
        makeEl('div', 'list-avatar', initial) +
        makeEl('div', 'list-info',
          makeEl('div', 'list-name', o.customer || '—') +
          makeEl('div', 'list-sub', o.product || '—')
        ) +
        makeEl('div', 'list-right',
          makeEl('div', 'list-amount', '৳' + fmt(o.amount)) +
          makeEl('span', 'pill ' + stCls, o.status.split('/')[0].trim() || '—')
        )
      );
    });
    recentEl.innerHTML = html;
  } else {
    recentEl.innerHTML = makeEl('div', 'empty',
      makeEl('div', 'empty-icon', '🛍️') +
      makeEl('div', 'empty-title', 'কোনো অর্ডার নেই')
    );
  }

  if (STATE.daysLeft !== 'Lifetime' && typeof STATE.daysLeft === 'number' && STATE.daysLeft <= 7) {
    showToast('⚠️ লাইসেন্স ' + STATE.daysLeft + ' দিনে শেষ হবে!');
  }
}

// ==================== RENDER ORDERS ====================

function renderOrders(data) {
  STATE.orders = data.orders || [];
  var el = document.getElementById('orderList');

  if (!STATE.orders.length) {
    el.innerHTML = makeEl('div', 'empty',
      makeEl('div', 'empty-icon', '🛍️') +
      makeEl('div', 'empty-title', 'কোনো অর্ডার নেই') +
      makeEl('div', 'empty-sub', 'প্রথম অর্ডার যোগ করুন')
    );
    return;
  }

  var html = '';
  STATE.orders.forEach(function (o) {
    var stCls = o.status.indexOf('Delivered') !== -1 ? 'green'
      : o.status.indexOf('Cancel') !== -1 ? 'red'
      : o.status.indexOf('Return') !== -1 ? 'red'
      : o.status.indexOf('Shipped') !== -1 ? 'blue'
      : o.status.indexOf('Packed') !== -1 ? 'purple'
      : 'amber';

    var pyCls = o.payStatus.indexOf('Paid') !== -1 ? 'green'
      : o.payStatus.indexOf('Partial') !== -1 ? 'amber'
      : 'red';

    var courierTag = o.courier
      ? makeEl('span', 'data-tag', '🚚 ' + o.courier.split('/')[0].trim())
      : '';

    var hLeft = makeEl('div', '',
      makeEl('div', 'data-card-title', o.customer || '—') +
      makeEl('div', 'data-card-id', (o.orderId || '') + ' • ' + (o.date || ''))
    );

    var header = makeEl('div', 'data-card-header',
      hLeft + makeEl('div', 'data-card-amount', '৳' + fmt(o.amount))
    );

    var body = makeEl('div', 'data-card-body',
      makeEl('span', 'data-tag', '🛒 ' + (o.product || '—')) +
      makeEl('span', 'pill ' + stCls, o.status.split('/')[0].trim()) +
      makeEl('span', 'pill ' + pyCls, o.payStatus.split('/')[0].trim()) +
      courierTag
    );

    html += makeEl('div', 'data-card', header + body);
  });

  el.innerHTML = html;
}

// ==================== RENDER LEADS ====================

function renderLeads(data) {
  STATE.leads = data.leads || [];
  var el = document.getElementById('leadList');

  if (!STATE.leads.length) {
    el.innerHTML = makeEl('div', 'empty',
      makeEl('div', 'empty-icon', '🎯') +
      makeEl('div', 'empty-title', 'কোনো লিড নেই') +
      makeEl('div', 'empty-sub', 'প্রথম লিড যোগ করুন')
    );
    return;
  }

  var html = '';
  STATE.leads.forEach(function (l) {
    var stCls = l.converted === 'Yes / হ্যাঁ' ? 'green'
      : l.status.indexOf('Confirmed') !== -1 ? 'green'
      : l.status.indexOf('Not Interested') !== -1 ? 'gray'
      : l.status.indexOf('No Response') !== -1 ? 'gray'
      : l.status.indexOf('Interested') !== -1 ? 'indigo'
      : 'amber';

    var productTag = l.product ? makeEl('span', 'data-tag', '🛍️ ' + l.product) : '';
    var followTag = l.followUp ? makeEl('span', 'data-tag', '📅 Follow: ' + l.followUp) : '';
    var assignTag = l.assignedTo ? makeEl('span', 'data-tag', '👤 ' + l.assignedTo) : '';
    var convTag = l.converted === 'Yes / হ্যাঁ' ? makeEl('span', 'pill green', '✅ Converted') : '';

    var hLeft = makeEl('div', '',
      makeEl('div', 'data-card-title', l.name || '—') +
      makeEl('div', 'data-card-id', '📞 ' + (l.phone || '—') + ' • ' + (l.date || ''))
    );

    var header = makeEl('div', 'data-card-header',
      hLeft + makeEl('span', 'pill ' + stCls, l.status.split('/')[0].trim() || 'New')
    );

    var body = makeEl('div', 'data-card-body',
      productTag + followTag + assignTag + convTag
    );

    html += makeEl('div', 'data-card', header + body);
  });

  el.innerHTML = html;
}

// ==================== RENDER CUSTOMERS ====================

function renderCustomers(data) {
  STATE.customers = data.customers || [];
  var el = document.getElementById('custList');

  if (!STATE.customers.length) {
    el.innerHTML = makeEl('div', 'empty',
      makeEl('div', 'empty-icon', '👥') +
      makeEl('div', 'empty-title', 'কোনো কাস্টমার নেই') +
      makeEl('div', 'empty-sub', 'অর্ডার যোগ হলে কাস্টমার আসবে')
    );
    return;
  }

  var html = '';
  STATE.customers.forEach(function (c) {
    var segCls = c.segment.indexOf('VIP') !== -1 ? 'amber'
      : c.segment.indexOf('Loyal') !== -1 ? 'indigo'
      : c.segment.indexOf('Lost') !== -1 ? 'red'
      : 'green';

    var initial = (c.name || '?')[0].toUpperCase();

    html += makeEl('div', 'list-item',
      makeEl('div', 'list-avatar', initial) +
      makeEl('div', 'list-info',
        makeEl('div', 'list-name', c.name || '—') +
        makeEl('div', 'list-sub', c.totalOrders + ' অর্ডার • ৳' + fmt(c.totalSpent))
      ) +
      makeEl('div', 'list-right',
        makeEl('span', 'pill ' + segCls, c.segment.split('/')[0].trim() || 'New')
      )
    );
  });

  el.innerHTML = html;
}

// ==================== RENDER PAYMENTS ====================

function renderPayments(data) {
  var pays = data.payments || [];
  var el = document.getElementById('payList');

  if (!pays.length) {
    el.innerHTML = makeEl('div', 'empty',
      makeEl('div', 'empty-icon', '💳') +
      makeEl('div', 'empty-title', 'কোনো পেমেন্ট নেই')
    );
    return;
  }

  var html = '';
  pays.forEach(function (p) {
    var stCls = p.status.indexOf('Paid') !== -1 ? 'green'
      : p.status.indexOf('Partial') !== -1 ? 'amber'
      : 'red';

    var txTag = p.txId ? makeEl('span', 'data-tag', '🔑 ' + p.txId) : '';

    var hLeft = makeEl('div', '',
      makeEl('div', 'data-card-title', p.customer || '—') +
      makeEl('div', 'data-card-id', (p.orderId || '') + ' • ' + (p.date || ''))
    );

    var header = makeEl('div', 'data-card-header',
      hLeft + makeEl('div', 'data-card-amount', '৳' + fmt(p.amount))
    );

    var body = makeEl('div', 'data-card-body',
      makeEl('span', 'pill ' + stCls, p.status.split('/')[0].trim()) +
      makeEl('span', 'data-tag', '💳 ' + (p.method.split('/')[0].trim() || 'Cash')) +
      txTag
    );

    html += makeEl('div', 'data-card', header + body);
  });

  el.innerHTML = html;
}

// ==================== RENDER TEAM PERFORMANCE (Elite) ====================

function renderTeamPerformance(data) {
  var team = data.team || [];
  var el = document.getElementById('teamList');

  if (!team.length) {
    el.innerHTML = makeEl('div', 'empty',
      makeEl('div', 'empty-icon', '🏅') +
      makeEl('div', 'empty-title', 'কোনো টিম ডেটা নেই') +
      makeEl('div', 'empty-sub', 'Run All Automations চালান')
    );
    return;
  }

  var html = '';
  team.forEach(function (t) {
    var avatar = makeEl('div', 'team-avatar', '👤');
    var info = makeEl('div', 'team-info',
      makeEl('div', 'team-name', t.name || '—') +
      makeEl('div', 'team-stats', 'লিড: ' + t.leadsAdded + ' • অর্ডার: ' + t.orders + ' • Conv: ' + t.convRate + '%')
    );
    var right = makeEl('div', 'team-right',
      makeEl('div', 'team-score', '৳' + fmt(t.revenue)) +
      makeEl('div', 'team-rating', t.rating || '⭐')
    );

    html += makeEl('div', 'team-card', avatar + info + right);
  });

  el.innerHTML = html;
}

// ==================== RENDER COD RISK (Elite) ====================

function renderCODRisk(data) {
  var items = data.codRisk || [];
  var el = document.getElementById('codList');

  if (!items.length) {
    el.innerHTML = makeEl('div', 'empty',
      makeEl('div', 'empty-icon', '⚠️') +
      makeEl('div', 'empty-title', 'কোনো COD Risk ডেটা নেই')
    );
    return;
  }

  var html = '';
  items.forEach(function (c) {
    var riskCls = c.riskLevel.indexOf('High') !== -1 ? 'red'
      : c.riskLevel.indexOf('Medium') !== -1 ? 'amber'
      : 'green';

    var header = makeEl('div', 'cod-header',
      makeEl('div', 'cod-name', c.name || '—') +
      makeEl('span', 'pill ' + riskCls, c.riskLevel.split('/')[0].trim() || '—')
    );

    var stats = makeEl('div', 'cod-stats',
      makeEl('span', 'cod-stat', 'COD: ' + c.totalCOD) +
      makeEl('span', 'cod-stat', 'Return: ' + c.returned) +
      makeEl('span', 'cod-stat', 'Rate: ' + c.returnRate + '%')
    );

    html += makeEl('div', 'cod-card', header + stats);
  });

  el.innerHTML = html;
}

// ==================== RENDER COURIER (Elite) ====================

function renderCourier(data) {
  var items = data.couriers || [];
  var el = document.getElementById('courierList');

  if (!items.length) {
    el.innerHTML = makeEl('div', 'empty',
      makeEl('div', 'empty-icon', '🚚') +
      makeEl('div', 'empty-title', 'কোনো কুরিয়ার ডেটা নেই')
    );
    return;
  }

  var html = '';
  items.forEach(function (c) {
    var recTag = c.recommended
      ? makeEl('span', 'pill green', '⭐ Recommended')
      : '<span></span>';

    var left = makeEl('div', '',
      makeEl('div', 'courier-name', c.name.split('/')[0].trim()) +
      makeEl('div', 'courier-stats', 'Total: ' + c.total + ' • Delivered: ' + c.delivered + ' • Return: ' + c.returned)
    );

    var right = makeEl('div', 'text-right',
      makeEl('div', 'courier-rate', c.deliveryRate + '%') + recTag
    );

    html += makeEl('div', 'courier-card', left + right);
  });

  el.innerHTML = html;
}

// ==================== RENDER SEGMENTS (Elite) ====================

function renderSegments(data) {
  var items = data.segments || [];
  var el = document.getElementById('segList');

  if (!items.length) {
    el.innerHTML = makeEl('div', 'empty',
      makeEl('div', 'empty-icon', '🏷️') +
      makeEl('div', 'empty-title', 'কোনো সেগমেন্ট ডেটা নেই') +
      makeEl('div', 'empty-sub', 'Run All Automations চালান')
    );
    return;
  }

  var html = '';
  items.forEach(function (s) {
    var segCls = s.segment.indexOf('VIP') !== -1 ? 'amber'
      : s.segment.indexOf('Loyal') !== -1 ? 'indigo'
      : s.segment.indexOf('Lost') !== -1 ? 'red'
      : s.segment.indexOf('Sleeping') !== -1 ? 'gray'
      : 'green';

    var info = makeEl('div', 'seg-info',
      makeEl('div', 'seg-name', s.name || '—') +
      makeEl('div', 'seg-action', s.action || '—')
    );

    var right = makeEl('div', 'seg-right',
      makeEl('span', 'pill ' + segCls, s.segment.split('/')[0].trim()) +
      makeEl('div', 'seg-days', s.daysSince + ' দিন আগে')
    );

    html += makeEl('div', 'seg-card', info + right);
  });

  el.innerHTML = html;
}

// ==================== RENDER MONTHLY REPORT (Elite) ====================

function renderMonthlyReport(data) {
  var el = document.getElementById('monthlyContent');
  var d = data || {};
  var convRate = d.convRate || 0;

  var s1 =
    makeEl('div', 'report-row',
      makeEl('span', 'report-label', 'মোট লিড') +
      makeEl('span', 'report-value', (d.totalLeads || 0) + 'টি')
    ) +
    makeEl('div', 'report-row',
      makeEl('span', 'report-label', 'মোট অর্ডার') +
      makeEl('span', 'report-value', (d.totalOrders || 0) + 'টি')
    ) +
    makeEl('div', 'report-row',
      makeEl('span', 'report-label', 'Conversion Rate') +
      makeEl('span', 'report-value indigo', convRate + '%')
    ) +
    makeEl('div', 'report-row',
      makeEl('span', 'report-label', 'বাতিল') +
      makeEl('span', 'report-value red', (d.cancelled || 0) + 'টি')
    ) +
    makeEl('div', 'report-row',
      makeEl('span', 'report-label', 'ফেরত') +
      makeEl('span', 'report-value red', (d.returned || 0) + 'টি')
    );

  var s2 =
    makeEl('div', 'report-row',
      makeEl('span', 'report-label', 'মোট রাজস্ব') +
      makeEl('span', 'report-value green', '৳' + fmt(d.totalRevenue || 0))
    ) +
    makeEl('div', 'report-row',
      makeEl('span', 'report-label', 'সংগ্রহ হয়েছে') +
      makeEl('span', 'report-value green', '৳' + fmt(d.totalCollected || 0))
    ) +
    makeEl('div', 'report-row',
      makeEl('span', 'report-label', 'বাকি আছে') +
      makeEl('span', 'report-value red', '৳' + fmt(d.outstanding || 0))
    );

  el.innerHTML =
    makeEl('div', 'report-section',
      makeEl('div', 'report-title', (d.month || 'এই মাস') + ' — পারফরম্যান্স') + s1
    ) +
    makeEl('div', 'report-section',
      makeEl('div', 'report-title', 'আর্থিক সারসংক্ষেপ') + s2
    );
}

// ==================== RENDER REPORTS ====================

function renderReports() {
  var d = STATE.dashData || {};
  var el = document.getElementById('reportsContent');
  var tier = STATE.tier || 'Basic';

  var convRate = 0;
  if (d.totalLeads > 0 && d.totalOrders > 0) {
    convRate = Math.round(d.totalOrders / d.totalLeads * 100);
  }

  var daysLeftText = STATE.daysLeft === 'Lifetime' ? '♾️ Lifetime' : STATE.daysLeft + ' দিন বাকি';
  var daysLeftCls = STATE.daysLeft === 'Lifetime' ? 'green' : STATE.daysLeft <= 7 ? 'red' : 'indigo';

  var tierPillCls = tier === 'Elite' ? 'amber' : tier === 'Pro' ? 'indigo' : 'green';

  var s1 =
    makeEl('div', 'report-row',
      makeEl('span', 'report-label', 'মোট বিক্রি') +
      makeEl('span', 'report-value green', '৳' + fmt(d.salesMonth || 0))
    ) +
    makeEl('div', 'report-row',
      makeEl('span', 'report-label', 'আজকের বিক্রি') +
      makeEl('span', 'report-value indigo', '৳' + fmt(d.salesToday || 0))
    ) +
    makeEl('div', 'report-row',
      makeEl('span', 'report-label', 'মোট অর্ডার') +
      makeEl('span', 'report-value', (d.totalOrders || 0) + 'টি')
    ) +
    makeEl('div', 'report-row',
      makeEl('span', 'report-label', 'Pending অর্ডার') +
      makeEl('span', 'report-value red', (d.pendingOrders || 0) + 'টি')
    ) +
    makeEl('div', 'report-row',
      makeEl('span', 'report-label', 'Conversion Rate') +
      makeEl('span', 'report-value indigo', convRate + '%')
    ) +
    makeEl('div', 'progress-bar',
      makeEl('div', 'progress-fill', '')
    );

  var s2 =
    makeEl('div', 'report-row',
      makeEl('span', 'report-label', 'অপরিশোধিত') +
      makeEl('span', 'report-value red', '৳' + fmt(d.unpaidAmount || 0))
    ) +
    makeEl('div', 'report-row',
      makeEl('span', 'report-label', 'মোট লিড') +
      makeEl('span', 'report-value', (d.totalLeads || 0) + 'টি')
    );

  var s3 =
    makeEl('div', 'report-row',
      makeEl('span', 'report-label', 'ব্যবসা') +
      makeEl('span', 'report-value', STATE.business)
    ) +
    makeEl('div', 'report-row',
      makeEl('span', 'report-label', 'Tier') +
      makeEl('span', 'pill ' + tierPillCls, tier)
    ) +
    makeEl('div', 'report-row',
      makeEl('span', 'report-label', 'মেয়াদ') +
      makeEl('span', 'report-value ' + daysLeftCls, daysLeftText)
    );

  el.innerHTML =
    makeEl('div', 'report-section',
      makeEl('div', 'report-title', 'এই মাসের পারফরম্যান্স') + s1
    ) +
    makeEl('div', 'report-section',
      makeEl('div', 'report-title', 'আর্থিক সারসংক্ষেপ') + s2
    ) +
    makeEl('div', 'report-section',
      makeEl('div', 'report-title', 'লাইসেন্স তথ্য') + s3
    );

  var pf = document.querySelector('.progress-fill');
  if (pf) pf.style.width = Math.min(convRate, 100) + '%';
}

// ==================== SAVE ORDER ====================

async function saveOrder() {
  var customer = getVal('o-customer');
  var product = getVal('o-product');
  var qty = getVal('o-qty');
  var price = getVal('o-price');

  if (!customer || !product || !qty || !price) {
    showToast('❌ সব গুরুত্বপূর্ণ তথ্য দিন');
    return;
  }

  var btn = document.getElementById('orderSaveBtn');
  btn.disabled = true;
  btn.textContent = '⏳ সেভ হচ্ছে...';
  showLoading('অর্ডার সেভ হচ্ছে...');

  try {
    var res = await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        licenseKey: STATE.licenseKey,
        page: 'add_order',
        payload: {
          customer: customer,
          phone: getVal('o-phone'),
          address: getVal('o-address'),
          product: product,
          qty: parseFloat(qty) || 0,
          unitPrice: parseFloat(price) || 0,
          discount: parseFloat(getVal('o-discount')) || 0,
          paymentType: getVal('o-paytype'),
          source: getVal('o-source'),
          notes: getVal('o-notes')
        }
      })
    });

    var result = await res.json();
    hideLoading();
    btn.disabled = false;
    btn.textContent = 'অর্ডার সেভ করুন';

    if (result.success) {
      showToast('✅ অর্ডার সফলভাবে যোগ হয়েছে!');
      clearFields(['o-customer', 'o-phone', 'o-address', 'o-product', 'o-qty', 'o-price', 'o-discount', 'o-notes']);
      document.getElementById('o-total').textContent = '৳ 0';
      setTimeout(function () {
        showPage('dashboard');
        loadDashboard();
      }, 1500);
    } else {
      showToast('❌ সেভ ব্যর্থ');
    }
  } catch (e) {
    hideLoading();
    btn.disabled = false;
    btn.textContent = 'অর্ডার সেভ করুন';
    showToast('❌ সংযোগ ব্যর্থ');
  }
}

// ==================== SAVE LEAD ====================

async function saveLead() {
  var name = getVal('l-name');
  var phone = getVal('l-phone');

  if (!name || !phone) {
    showToast('❌ নাম এবং ফোন দিন');
    return;
  }

  var btn = document.getElementById('leadSaveBtn');
  btn.disabled = true;
  btn.textContent = '⏳ সেভ হচ্ছে...';
  showLoading('লিড সেভ হচ্ছে...');

  try {
    var res = await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        licenseKey: STATE.licenseKey,
        page: 'add_lead',
        payload: {
          name: name,
          phone: phone,
          facebook: getVal('l-fb'),
          source: getVal('l-source'),
          product: getVal('l-product'),
          assignedTo: getVal('l-assigned'),
          notes: getVal('l-notes')
        }
      })
    });

    var result = await res.json();
    hideLoading();
    btn.disabled = false;
    btn.textContent = 'লিড সেভ করুন';

    if (result.success) {
      showToast('✅ লিড সফলভাবে যোগ হয়েছে!');
      clearFields(['l-name', 'l-phone', 'l-fb', 'l-product', 'l-assigned', 'l-notes']);
      setTimeout(function () {
        showPage('dashboard');
      }, 1500);
    } else {
      showToast('❌ সেভ ব্যর্থ');
    }
  } catch (e) {
    hideLoading();
    btn.disabled = false;
    btn.textContent = 'লিড সেভ করুন';
    showToast('❌ সংযোগ ব্যর্থ');
  }
}

// ==================== EXPIRED ====================

function showExpired(data) {
  document.getElementById('landingPage').style.display = 'none';
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('mainApp').style.display = 'none';
  document.getElementById('expiredPage').style.display = 'flex';

  var msg = document.getElementById('expiredMsg');
  if (msg) {
    msg.innerHTML =
      '<strong>' + (data.business || STATE.business) + '</strong> এর StateCRM লাইসেন্সের মেয়াদ শেষ হয়ে গেছে।<br><br>নবায়ন করতে ASQVI-এর সাথে যোগাযোগ করুন।';
  }
}

// ==================== UTILITIES ====================

function calcOrderTotal() {
  var qty = parseFloat(getVal('o-qty')) || 0;
  var price = parseFloat(getVal('o-price')) || 0;
  var disc = parseFloat(getVal('o-discount')) || 0;
  document.getElementById('o-total').textContent = '৳ ' + fmt(Math.max(0, qty * price - disc));
}

function showProfile() {
  var expText = STATE.daysLeft === 'Lifetime' ? '♾️ Lifetime' : STATE.daysLeft + ' দিন বাকি';
  var ok = window.confirm(
    STATE.business + '\nTier: ' + STATE.tier + '\nমেয়াদ: ' + expText + '\n\nলগআউট করবেন?'
  );
  if (ok) logout();
}

function logout() {
  localStorage.removeItem('bizflow_session');
  location.reload();
}

function saveSession() {
  localStorage.setItem('bizflow_session', JSON.stringify({
    licenseKey: STATE.licenseKey,
    business: STATE.business,
    bizType: STATE.bizType,
    tier: STATE.tier,
    expiry: STATE.expiry,
    daysLeft: STATE.daysLeft
  }));
}

function loadSession() {
  try {
    var s = localStorage.getItem('bizflow_session');
    return s ? JSON.parse(s) : null;
  } catch (e) {
    return null;
  }
}

function showLoading(txt) {
  document.getElementById('loadingText').textContent = txt || 'লোড হচ্ছে...';
  document.getElementById('loadingOverlay').classList.remove('hidden');
}

function hideLoading() {
  document.getElementById('loadingOverlay').classList.add('hidden');
}

function showToast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function () {
    t.classList.remove('show');
  }, 3000);
}

function setGreeting() {
  var h = new Date().getHours();
  var g = h < 12 ? 'শুভ সকাল' : h < 17 ? 'শুভ দুপুর' : h < 20 ? 'শুভ বিকাল' : 'শুভ সন্ধ্যা';
  var el = document.getElementById('greetingText');
  if (el) el.textContent = g + ', ' + (STATE.business || 'স্বাগতম') + '! 👋';
}

function setTodayDate() {
  var now = new Date();
  var days = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
  var months = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
  var el = document.getElementById('todayDate');
  if (el) el.textContent = days[now.getDay()] + ', ' + now.getDate() + ' ' + months[now.getMonth()] + ' ' + now.getFullYear();
}

async function pingServer() {
  if (!STATE.licenseKey) return;
  try {
    await fetch('/api/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey: STATE.licenseKey })
    });
  } catch (e) { }
}

// ==================== KEYBOARD ====================

document.addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && document.getElementById('loginPage') && document.getElementById('loginPage').style.display !== 'none') {
    doLogin();
  }
});
