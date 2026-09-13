function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * The "attention page" served after a click — architecture §6.3/§6.4.
 * Runs the 5-second tick loop client-side (tab_active / interaction recency /
 * scroll velocity / device fingerprint) via setInterval while
 * document.visibilityState === 'visible', posting to /report-signals.
 *
 * Styled to match the Next.js dashboard's design system (frontend/app/globals.css)
 * — same warm-monochrome palette, Inter type, hairline borders — since this is
 * the one page real readers actually land on, not just the creator dashboard.
 * Plain HTML/CSS/vanilla JS (no build step) since it's served straight from
 * Express, not through the Next.js app.
 */
export function renderAttentionPage(params: {
  sessionId: string;
  productTitle: string;
  productImageUrl: string | null;
  priceDisplay: string | null;
  purchaseUrl: string;
}): string {
  const { sessionId, productTitle, productImageUrl, priceDisplay, purchaseUrl } = params;
  const hostname = hostnameFromUrl(purchaseUrl);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(productTitle)} — NanoAffiliate</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
<style>
  :root {
    --bg: #f4f3ef;
    --surface: #f8f7f3;
    --surface-2: #ecebe7;
    --ink: #111111;
    --ink-2: #3a3a3a;
    --muted: #6f6f6f;
    --subtle: #8a8986;
    --line: #303030;
    --line-soft: #b8b7b3;
    --accent: #5b7fdb;
    --good: #1a7a42;
    --good-bg: #e7f5ec;
    --warn: #946600;
    --warn-bg: #fcf3d9;
    --bad: #b3261e;
    --bad-bg: #fbe7e7;
  }
  * { box-sizing: border-box; }
  html { -webkit-font-smoothing: antialiased; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--ink);
    font-family: "Inter", -apple-system, "Helvetica Neue", Arial, sans-serif;
  }
  .mono { font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace; }
  header {
    display: flex;
    align-items: center;
    height: 52px;
    padding: 0 20px;
    border-bottom: 1px solid var(--line-soft);
  }
  header .wordmark {
    font-size: 14px;
    font-weight: 600;
    letter-spacing: -0.03em;
  }
  main {
    max-width: 460px;
    margin: 0 auto;
    padding: 40px 20px 64px;
  }
  .label {
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--subtle);
  }
  .thumb {
    width: 100%;
    aspect-ratio: 4 / 3;
    border: 1px solid var(--line-soft);
    background: var(--surface);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    margin-top: 12px;
  }
  .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .thumb svg { opacity: 0.35; }
  h1 {
    font-weight: 400;
    letter-spacing: -0.03em;
    line-height: 1.15;
    font-size: 24px;
    margin: 20px 0 0;
  }
  .price {
    font-size: 22px;
    font-weight: 600;
    letter-spacing: -0.02em;
    margin: 10px 0 0;
    font-variant-numeric: tabular-nums;
  }
  .source {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 10px;
    font-size: 12.5px;
    color: var(--muted);
    text-decoration: none;
  }
  .source:hover { color: var(--ink-2); }
  a.buy {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 24px;
    padding: 14px 24px;
    background: var(--ink);
    color: var(--bg);
    text-decoration: none;
    font-size: 13.5px;
    font-weight: 500;
    letter-spacing: -0.01em;
    border-radius: 2px;
    transition: background 200ms ease;
  }
  a.buy:hover { background: var(--ink-2); }

  .status-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 20px;
    font-size: 12px;
    color: var(--subtle);
  }
  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent);
    position: relative;
    flex-shrink: 0;
  }
  .dot::after {
    content: "";
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    background: var(--accent);
    opacity: 0.35;
    animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
  }
  @keyframes ping {
    75%, 100% { transform: scale(2.2); opacity: 0; }
  }
  .pill {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 2px;
    font-size: 11px;
    font-weight: 500;
  }
  .pill.pay_full, .pill.pay_reduced { background: var(--good-bg); color: var(--good); }
  .pill.pending, .pill.require_selfie_check { background: var(--warn-bg); color: var(--warn); }
  .pill.reject { background: var(--bad-bg); color: var(--bad); }

  #order-form {
    margin-top: 36px;
    padding-top: 24px;
    border-top: 1px solid var(--line-soft);
  }
  #order-form p {
    font-size: 12.5px;
    color: var(--muted);
    margin: 0 0 12px;
  }
  .order-row { display: flex; gap: 10px; }
  input[type=text] {
    flex: 1;
    min-width: 0;
    padding: 10px 12px;
    border: 1px solid var(--line-soft);
    background: transparent;
    font-family: "JetBrains Mono", monospace;
    font-size: 12.5px;
    color: var(--ink);
  }
  input[type=text]:focus { outline: none; border-color: var(--line); }
  button {
    padding: 10px 16px;
    border: 1px solid var(--ink);
    background: var(--ink);
    color: var(--bg);
    font-family: inherit;
    font-size: 12.5px;
    font-weight: 500;
    cursor: pointer;
    border-radius: 2px;
  }
  button:hover { background: var(--ink-2); }
  #order-confirmed {
    font-size: 12.5px;
    color: var(--good);
  }
  footer {
    margin-top: 40px;
    font-size: 11px;
    line-height: 1.6;
    color: var(--subtle);
  }

  .verify-row { margin-top: 14px; }
  .verify-link {
    background: none;
    border: none;
    padding: 0;
    color: var(--accent);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .verify-link:hover { color: var(--ink); }
  .verify-link.urgent {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--warn-bg);
    color: var(--warn);
    border: 1px solid var(--warn);
    padding: 8px 14px;
    border-radius: 2px;
    text-decoration: none;
    font-size: 12.5px;
  }
  .verify-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    margin-top: 10px;
    font-size: 11.5px;
    color: var(--good);
    font-weight: 500;
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(17, 17, 17, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    z-index: 50;
  }
  .modal-card {
    width: 100%;
    max-width: 340px;
    background: var(--bg);
    border: 1px solid var(--line);
    padding: 24px;
  }
  .modal-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }
  .modal-card .close-x {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--subtle);
    font-size: 16px;
    line-height: 1;
    padding: 0;
    flex-shrink: 0;
  }
  .modal-title { font-size: 14px; font-weight: 600; letter-spacing: -0.02em; margin: 0 0 4px; }
  .modal-sub { font-size: 12px; color: var(--muted); margin: 0 0 18px; line-height: 1.5; }
  .modal-phase { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 12px; }
  .spinner-ring {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 1px solid var(--line-soft);
    position: relative;
  }
  .spinner-ring::after {
    content: "";
    position: absolute;
    inset: -1px;
    border-radius: 50%;
    border: 1px solid var(--accent);
    opacity: 0.4;
    animation: ping 1.6s cubic-bezier(0,0,0.2,1) infinite;
  }
  .modal-qr { border: 1px solid var(--line-soft); padding: 8px; background: #fff; }
  .modal-qr img { display: block; width: 200px; height: 200px; }
  .modal-open-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12.5px;
    color: var(--ink);
    text-decoration: none;
    border-bottom: 1px solid var(--line-soft);
    padding-bottom: 2px;
  }
  .modal-result-ok {
    width: 44px; height: 44px; border-radius: 50%;
    border: 1px solid var(--line); display: flex; align-items: center; justify-content: center;
    color: var(--good); font-size: 20px;
  }
  .modal-result-bad {
    width: 44px; height: 44px; border-radius: 50%;
    background: var(--bad-bg); display: flex; align-items: center; justify-content: center;
    color: var(--bad); font-size: 18px;
  }
  .modal-card button.secondary {
    background: transparent;
    color: var(--ink);
    border: 1px solid var(--line-soft);
    width: 100%;
  }
  .modal-card button.secondary:hover { background: var(--surface-2); }
  .modal-card button.primary { width: 100%; }
  [hidden] { display: none !important; }
</style>
</head>
<body>
  <header><span class="wordmark">NanoAffiliate</span></header>

  <main>
    <p class="label">Product</p>
    <div class="thumb">
      ${
        productImageUrl
          ? `<img src="${escapeHtml(productImageUrl)}" alt="${escapeHtml(productTitle)}" />`
          : `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#8a8986" stroke-width="1.2"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 16l5-5 4 4 5-6 4 5"/></svg>`
      }
    </div>

    <h1>${escapeHtml(productTitle)}</h1>
    ${priceDisplay ? `<p class="price">${escapeHtml(priceDisplay)}</p>` : ''}
    <a class="source" href="${escapeHtml(purchaseUrl)}" target="_blank" rel="noopener">
      ${escapeHtml(hostname)} ↗
    </a>

    <a class="buy" id="buy-link" href="${escapeHtml(purchaseUrl)}" target="_blank" rel="noopener">Buy now</a>

    <div class="status-row">
      <span class="dot"></span>
      <span id="status">Tracking genuine attention…</span>
    </div>

    <div class="verify-row" id="verify-row">
      <button type="button" class="verify-link" id="verify-trigger">
        Verify with World ID — earn the full rate
      </button>
    </div>
    <div class="verify-badge" id="verify-badge" hidden>✓ Verified — earning full rate</div>

    <div id="order-form">
      <p>Bought it? Confirm your order so the creator gets their bonus.</p>
      <div class="order-row">
        <input type="text" id="order-id" placeholder="Order ID" />
        <button id="confirm-order">Confirm</button>
      </div>
    </div>

    <footer>
      Every 5 seconds this page is open, NanoAffiliate's Attention Trust Oracle scores real
      engagement and settles a micropayment to the creator on Hedera — publicly auditable, no ad
      network in the middle.
    </footer>
  </main>

  <div class="modal-overlay" id="selfie-modal" hidden>
    <div class="modal-card">
      <div class="modal-head">
        <div>
          <p class="modal-title">Selfie Check</p>
          <p class="modal-sub" id="modal-sub">
            A real biometric liveness check via World App — no Orb required.
          </p>
        </div>
        <button type="button" class="close-x" id="modal-close" aria-label="Close">✕</button>
      </div>
      <div id="modal-body"></div>
    </div>
  </div>

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

  var statusEl = document.getElementById('status');

  function renderStatus(decision, score) {
    var label = {
      pay_full: 'Verified — full rate',
      pay_reduced: 'Verified — reduced rate',
      require_selfie_check: 'Borderline — Selfie Check required',
      reject: 'Not scoring as attention',
    }[decision] || 'Tracking genuine attention…';
    var scoreText = score !== undefined ? ' · trust ' + score.toFixed(2) : '';
    statusEl.innerHTML = '<span class="pill ' + (decision || 'pending') + '">' + label + '</span>' + scoreText;

    if (decision === 'require_selfie_check') onSelfieCheckRequired();
  }

  // ---------------------------------------------------------------------
  // World ID Selfie Check — architecture §11 escalation, now built.
  // Available voluntarily at any time (the button under the status row),
  // and auto-prompted the first time the Oracle actually requires it
  // (scoreSession.ts, after 6 consecutive borderline ticks). Passing
  // unlocks rate_verified_per_tick for the rest of this session.
  // ---------------------------------------------------------------------
  var verified = false;
  var autoPrompted = false;
  var verifyTrigger = document.getElementById('verify-trigger');
  var verifyRow = document.getElementById('verify-row');
  var verifyBadge = document.getElementById('verify-badge');
  var modal = document.getElementById('selfie-modal');
  var modalBody = document.getElementById('modal-body');
  var modalClose = document.getElementById('modal-close');
  var pollController = null;
  var attempt = 0;

  function onSelfieCheckRequired() {
    if (verified) return;
    verifyTrigger.textContent = 'Verify with World ID to keep earning — required';
    verifyTrigger.classList.add('urgent');
    if (!autoPrompted) {
      autoPrompted = true;
      openSelfieModal();
    }
  }

  function openSelfieModal() {
    modal.hidden = false;
    startSelfieCheck();
  }

  function closeSelfieModal() {
    attempt++; // supersedes any in-flight pollUntilCompletion continuation
    if (pollController) pollController.abort();
    modal.hidden = true;
  }

  function renderModalPhase(html) {
    modalBody.innerHTML = html;
  }

  function startSelfieCheck() {
    var thisAttempt = ++attempt;
    renderModalPhase(
      '<div class="modal-phase"><div class="spinner-ring"></div>' +
        '<p style="font-size:12.5px;color:var(--ink-2)">Requesting a signed request…</p></div>',
    );

    fetch('/world/rp-signature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: SESSION_ID }),
    })
      .then(function (r) {
        return r.json().then(function (body) {
          if (!r.ok) throw new Error(body.error || 'Could not get a signed request.');
          return body;
        });
      })
      .then(function (sig) {
        if (thisAttempt !== attempt) return;
        // Loaded on demand from a CDN, not bundled — this page has no build
        // step. Confirmed working (no WASM-serving issues) against esm.sh.
        return import('https://esm.sh/@worldcoin/idkit-core@4.2.4').then(function (mod) {
          if (thisAttempt !== attempt) return;
          return mod.IDKit.requestWithInviteCode({
            app_id: sig.app_id,
            action: sig.action,
            allow_legacy_proofs: true,
            environment: 'production',
            rp_context: {
              rp_id: sig.rp_id,
              nonce: sig.nonce,
              created_at: sig.created_at,
              expires_at: sig.expires_at,
              signature: sig.signature,
            },
          }).preset(mod.selfieCheckLegacy({ signal: crypto.randomUUID() }));
        });
      })
      .then(function (request) {
        if (!request || thisAttempt !== attempt) return;

        var qrSrc = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(request.connectorURI);
        renderModalPhase(
          '<div class="modal-phase">' +
            '<div class="modal-qr"><img src="' + qrSrc + '" alt="World App QR code" /></div>' +
            '<p style="font-size:12px;color:var(--ink-2)">Scan with World App, or open directly:</p>' +
            '<a class="modal-open-link" href="' + request.connectorURI + '" target="_blank" rel="noopener">Open in World App ↗</a>' +
            '<button type="button" class="secondary" id="modal-cancel">Cancel</button>' +
            '</div>',
        );
        document.getElementById('modal-cancel').addEventListener('click', closeSelfieModal);

        pollController = new AbortController();
        return request.pollUntilCompletion({ signal: pollController.signal });
      })
      .then(function (completion) {
        if (!completion || thisAttempt !== attempt) return;

        if (!completion.success) {
          renderModalPhase(
            '<div class="modal-phase"><div class="modal-result-bad">✕</div>' +
              '<p style="font-size:13px">World App reported: ' + completion.error + '</p>' +
              '<button type="button" class="primary" id="modal-retry">Try again</button></div>',
          );
          document.getElementById('modal-retry').addEventListener('click', startSelfieCheck);
          return;
        }

        renderModalPhase(
          '<div class="modal-phase"><div class="spinner-ring"></div>' +
            '<p style="font-size:12.5px;color:var(--ink-2)">Proof received — verifying with World…</p></div>',
        );

        return fetch('/world/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: SESSION_ID, idkitResponse: completion.result }),
        }).then(function (r) {
          return r.json().then(function (body) {
            if (thisAttempt !== attempt) return;
            if (!r.ok || !body.verified) throw new Error(body.error || 'World rejected the proof.');

            verified = true;
            verifyRow.hidden = true;
            verifyBadge.hidden = false;
            renderModalPhase(
              '<div class="modal-phase"><div class="modal-result-ok">✓</div>' +
                '<p style="font-size:13px">Selfie Check passed — earning the full rate now.</p>' +
                '<button type="button" class="primary" id="modal-done">Done</button></div>',
            );
            document.getElementById('modal-done').addEventListener('click', closeSelfieModal);
          });
        });
      })
      .catch(function (err) {
        if (thisAttempt !== attempt) return;
        renderModalPhase(
          '<div class="modal-phase"><div class="modal-result-bad">✕</div>' +
            '<p style="font-size:13px">' + (err && err.message ? err.message : 'Something went wrong.') + '</p>' +
            '<button type="button" class="primary" id="modal-retry">Try again</button></div>',
        );
        var retryBtn = document.getElementById('modal-retry');
        if (retryBtn) retryBtn.addEventListener('click', startSelfieCheck);
      });
  }

  verifyTrigger.addEventListener('click', openSelfieModal);
  modalClose.addEventListener('click', closeSelfieModal);

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
      .then(function (data) { renderStatus(data.decision, data.score); })
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
        document.getElementById('order-form').innerHTML = '<p id="order-confirmed">Thanks — recorded as self-reported.</p>';
      })
      .catch(function () {});
  });
})();
</script>
</body>
</html>`;
}
