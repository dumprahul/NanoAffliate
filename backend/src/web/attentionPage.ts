function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * The "attention page" served after a click — architecture §6.3/§6.4.
 * Runs the 5-second tick loop client-side (tab_active / interaction recency /
 * scroll velocity / device fingerprint) via setInterval while
 * document.visibilityState === 'visible', posting to /report-signals.
 * Kept as one inline page here since no separate frontend was requested.
 */
export function renderAttentionPage(params: {
  sessionId: string;
  productTitle: string;
  productImageUrl: string | null;
  priceDisplay: string | null;
  purchaseUrl: string;
}): string {
  const { sessionId, productTitle, productImageUrl, priceDisplay, purchaseUrl } = params;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(productTitle)} — NanoAffiliate</title>
<style>
  body { font-family: -apple-system, sans-serif; max-width: 640px; margin: 40px auto; padding: 0 16px; color: #111; }
  img { max-width: 100%; border-radius: 8px; }
  .price { font-size: 1.4rem; font-weight: 600; margin: 8px 0; }
  #status { font-size: 0.85rem; color: #666; margin-top: 24px; }
  a.buy { display: inline-block; margin-top: 16px; padding: 12px 20px; background: #111; color: #fff; text-decoration: none; border-radius: 6px; }
  #order-form { margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; }
  input[type=text] { padding: 8px; width: 220px; }
  button { padding: 8px 14px; }
</style>
</head>
<body>
  <h1>${escapeHtml(productTitle)}</h1>
  ${productImageUrl ? `<img src="${escapeHtml(productImageUrl)}" alt="${escapeHtml(productTitle)}" />` : ''}
  ${priceDisplay ? `<div class="price">${escapeHtml(priceDisplay)}</div>` : ''}
  <a class="buy" id="buy-link" href="${escapeHtml(purchaseUrl)}" target="_blank" rel="noopener">Go to product</a>

  <div id="order-form">
    <p>Bought it? Confirm your order so the creator gets their bonus.</p>
    <input type="text" id="order-id" placeholder="Order ID" />
    <button id="confirm-order">Confirm purchase</button>
  </div>

  <div id="status">Tracking genuine attention…</div>

<script>
(function () {
  var SESSION_ID = ${JSON.stringify(sessionId)};
  var intervalId = null;
  var lastInteractionAt = Date.now();
  var scrollSamples = [];
  var lastScrollY = window.scrollY;
  var lastScrollAt = Date.now();
  var mouseSamples = [];
  var lastMouseX = null;
  var lastMouseY = null;
  var lastMouseAt = Date.now();

  function markInteraction() { lastInteractionAt = Date.now(); }
  ['mousemove', 'keydown', 'touchstart', 'click'].forEach(function (evt) {
    window.addEventListener(evt, markInteraction, { passive: true });
  });

  window.addEventListener('scroll', function () {
    var now = Date.now();
    var dy = Math.abs(window.scrollY - lastScrollY);
    var dt = Math.max(1, now - lastScrollAt);
    scrollSamples.push(dy / dt);
    if (scrollSamples.length > 20) scrollSamples.shift();
    lastScrollY = window.scrollY;
    lastScrollAt = now;
    markInteraction();
  }, { passive: true });

  // Mouse-move jitter — real human movement isn't perfectly smooth;
  // scripted/synthetic movement often is.
  window.addEventListener('mousemove', function (e) {
    var now = Date.now();
    if (lastMouseX !== null) {
      var dx = e.clientX - lastMouseX;
      var dy = e.clientY - lastMouseY;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var dt = Math.max(1, now - lastMouseAt);
      mouseSamples.push(dist / dt);
      if (mouseSamples.length > 30) mouseSamples.shift();
    }
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    lastMouseAt = now;
  }, { passive: true });

  function fingerprint() {
    try {
      var canvas = document.createElement('canvas');
      var ctx = canvas.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('nanoaffiliate-fp', 2, 2);
      return canvas.toDataURL().slice(-32);
    } catch (e) {
      return 'no-canvas';
    }
  }
  var deviceFingerprintHash = fingerprint() + '|' + navigator.userAgent.length + '|' + screen.width + 'x' + screen.height;

  function sendSignals() {
    if (document.visibilityState !== 'visible') return;
    var payload = {
      session_id: SESSION_ID,
      signals: {
        tabActive: document.hasFocus(),
        lastInteractionMsAgo: Date.now() - lastInteractionAt,
        scrollVelocityCurve: scrollSamples.slice(),
        deviceFingerprintHash: deviceFingerprintHash,
        webdriverFlag: navigator.webdriver === true,
        pluginsLength: navigator.plugins ? navigator.plugins.length : 0,
        mouseMovementCurve: mouseSamples.slice(),
      },
    };
    fetch('/report-signals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        document.getElementById('status').textContent =
          'Attention decision: ' + (data.decision || 'pending') + ' (score ' + (data.score !== undefined ? data.score.toFixed(2) : '—') + ')';
      })
      .catch(function () {});
  }

  function start() {
    if (intervalId) return;
    intervalId = setInterval(sendSignals, 5000);
  }
  function stop() {
    if (!intervalId) return;
    clearInterval(intervalId);
    intervalId = null;
  }

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') start();
    else stop();
  });
  start();

  function endSession() {
    var blob = new Blob([JSON.stringify({ session_id: SESSION_ID })], { type: 'application/json' });
    navigator.sendBeacon('/session-end', blob);
  }
  window.addEventListener('pagehide', endSession);
  window.addEventListener('beforeunload', endSession);

  document.getElementById('confirm-order').addEventListener('click', function () {
    var orderId = document.getElementById('order-id').value.trim();
    if (!orderId) return;
    fetch('/conversions/self-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: SESSION_ID, order_id: orderId }),
    })
      .then(function () {
        document.getElementById('order-form').innerHTML = '<p>Thanks — recorded as self-reported.</p>';
      })
      .catch(function () {});
  });
})();
</script>
</body>
</html>`;
}
