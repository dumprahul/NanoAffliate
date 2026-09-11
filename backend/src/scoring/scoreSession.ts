export type SignalInput = {
  tabActive: boolean;
  lastInteractionMsAgo: number;
  scrollVelocityCurve: number[];
  deviceFingerprintHash: string;
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
 * Pure scoring function — checks 1-6 from architecture/README.md §8.
 * No Hedera/x402/Supabase involvement here by design (build order step 1).
 */
export function scoreSession(
  signals: SignalInput,
  session: SessionContext,
  diversityScore: number,
): Decision {
  const tabStateScore = signals.tabActive ? 1 : 0;
  const interactionRecency = clamp01(1 - signals.lastInteractionMsAgo / 15000);
  const scrollNaturalness = scoreScrollNaturalness(signals.scrollVelocityCurve);
  const fingerprintConsistency = signals.deviceFingerprintHash ? 1 : 0;
  const sessionDiversity = clamp01(diversityScore);

  const rawScore =
    0.3 * tabStateScore +
    0.15 * interactionRecency +
    0.15 * scrollNaturalness +
    0.15 * fingerprintConsistency +
    0.25 * sessionDiversity;

  const adjustedScore = rawScore * session.trustPenaltyMultiplier;

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

function scoreScrollNaturalness(curve: number[]): number {
  if (curve.length < 2) return 0.5;
  const mean = curve.reduce((a, b) => a + b, 0) / curve.length;
  const variance = curve.reduce((a, b) => a + (b - mean) ** 2, 0) / curve.length;
  return clamp01(Math.sqrt(variance) / (mean || 1));
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}
