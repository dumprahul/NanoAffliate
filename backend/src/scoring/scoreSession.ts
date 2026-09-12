export type SignalInput = {
  tabActive: boolean;
  lastInteractionMsAgo: number;
  scrollVelocityCurve: number[];
  deviceFingerprintHash: string;
  /** navigator.webdriver — near-unambiguous automation evidence when true (real
   * browsers never set this by default; only Selenium/Puppeteer/Playwright do). */
  webdriverFlag?: boolean;
  /** navigator.plugins.length — 0 is common in headless/scripted environments,
   * though also true for some privacy-hardened real browsers, so it's a soft
   * signal, not a hard gate. */
  pluginsLength?: number;
  /** Mouse-move velocity samples, same shape as scrollVelocityCurve — natural
   * human movement is jittery; scripted movement tends to be too smooth/linear. */
  mouseMovementCurve?: number[];
};

export type SessionContext = {
  trustPenaltyMultiplier: number;
  borderlineTickCount: number;
};

export type Decision =
  | { outcome: 'pay_full'; score: number }
  | { outcome: 'pay_reduced'; score: number }
  | { outcome: 'require_selfie_check'; score: number }
  | { outcome: 'reject'; score: number };

/**
 * Pure scoring function — checks 1-6 from architecture/README.md §8, plus
 * automation-detection hardening (navigator.webdriver, plugin count, mouse
 * movement naturalness) layered onto check #4 (device/fingerprint
 * consistency). No Hedera/x402/Supabase involvement here by design (build
 * order step 1).
 */
export function scoreSession(
  signals: SignalInput,
  session: SessionContext,
  diversityScore: number,
): Decision {
  // Hard gate: a real browser never sets navigator.webdriver to true on its
  // own — only automation frameworks do (unless deliberately hidden, which
  // is exactly the "sophisticated headless" case this can't beat anyway, per
  // architecture §9's own honest framing). No amount of other good signals
  // should buy a proven bot a payment.
  if (signals.webdriverFlag === true) {
    return { outcome: 'reject', score: 0 };
  }

  const tabStateScore = signals.tabActive ? 1 : 0;
  const interactionRecency = clamp01(1 - signals.lastInteractionMsAgo / 15000);
  const scrollNaturalness = scoreMovementNaturalness(signals.scrollVelocityCurve);
  const mouseNaturalness = scoreMovementNaturalness(signals.mouseMovementCurve ?? []);
  const fingerprintConsistency = signals.deviceFingerprintHash ? 1 : 0;
  // Soft signal, not a hard gate — some real browsers (Safari, mobile, privacy
  // modes) also report zero plugins, so this only nudges the score.
  const pluginsScore = signals.pluginsLength === undefined ? 0.5 : signals.pluginsLength > 0 ? 1 : 0.3;
  const sessionDiversity = clamp01(diversityScore);

  const rawScore =
    0.3 * tabStateScore +
    0.15 * interactionRecency +
    0.1 * scrollNaturalness +
    0.1 * mouseNaturalness +
    0.1 * fingerprintConsistency +
    0.05 * pluginsScore +
    0.2 * sessionDiversity;

  // trustPenaltyMultiplier is meant to only ever reduce trust (>1 would inflate
  // a creator's score above what their signals actually earned), so clamp here
  // rather than trust every caller to pass a sane multiplier.
  const adjustedScore = clamp01(rawScore * session.trustPenaltyMultiplier);

  if (session.borderlineTickCount > 6) {
    return { outcome: 'require_selfie_check', score: adjustedScore };
  }
  if (adjustedScore >= 0.75) {
    return { outcome: 'pay_full', score: adjustedScore };
  }
  if (adjustedScore >= 0.4) {
    return { outcome: 'pay_reduced', score: adjustedScore };
  }
  return { outcome: 'reject', score: adjustedScore };
}

/** Shared by scroll and mouse curves — natural human motion has jitter; scripted motion tends to be too smooth. */
function scoreMovementNaturalness(curve: number[]): number {
  if (curve.length < 2) return 0.5;
  const mean = curve.reduce((a, b) => a + b, 0) / curve.length;
  const variance = curve.reduce((a, b) => a + (b - mean) ** 2, 0) / curve.length;
  return clamp01(Math.sqrt(variance) / (mean || 1));
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}
