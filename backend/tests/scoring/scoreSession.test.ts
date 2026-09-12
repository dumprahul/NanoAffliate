import { describe, expect, it } from 'vitest';
import { scoreSession } from '../../src/scoring/scoreSession.js';

const baseSession = { trustPenaltyMultiplier: 1, borderlineTickCount: 0 };

describe('scoreSession', () => {
  it('pays full rate for an actively engaged, high-diversity session', () => {
    const result = scoreSession(
      {
        tabActive: true,
        lastInteractionMsAgo: 500,
        scrollVelocityCurve: [1, 1.2, 0.9, 1.1, 1.05],
        deviceFingerprintHash: 'abc123',
      },
      baseSession,
      1,
    );
    expect(result.outcome).toBe('pay_full');
    expect(result.score).toBeGreaterThanOrEqual(0.75);
  });

  it('rejects a backgrounded tab regardless of other signals', () => {
    const result = scoreSession(
      {
        tabActive: false,
        lastInteractionMsAgo: 0,
        scrollVelocityCurve: [1, 1, 1],
        deviceFingerprintHash: 'abc123',
      },
      baseSession,
      1,
    );
    expect(result.outcome).not.toBe('pay_full');
  });

  it('rejects a stale, idle session with no fingerprint and no diversity', () => {
    const result = scoreSession(
      {
        tabActive: false,
        lastInteractionMsAgo: 60_000,
        scrollVelocityCurve: [],
        deviceFingerprintHash: '',
      },
      baseSession,
      0,
    );
    expect(result.outcome).toBe('reject');
  });

  it('escalates to require_selfie_check once borderline_tick_count exceeds the threshold', () => {
    const result = scoreSession(
      {
        tabActive: true,
        lastInteractionMsAgo: 500,
        scrollVelocityCurve: [1, 1, 1],
        deviceFingerprintHash: 'abc123',
      },
      { trustPenaltyMultiplier: 1, borderlineTickCount: 7 },
      1,
    );
    expect(result.outcome).toBe('require_selfie_check');
  });

  it('applies the trust penalty multiplier to reduce an otherwise-passing score', () => {
    const fullTrust = scoreSession(
      {
        tabActive: true,
        lastInteractionMsAgo: 500,
        scrollVelocityCurve: [1, 1.2, 0.9],
        deviceFingerprintHash: 'abc123',
      },
      { trustPenaltyMultiplier: 1, borderlineTickCount: 0 },
      1,
    );
    const penalized = scoreSession(
      {
        tabActive: true,
        lastInteractionMsAgo: 500,
        scrollVelocityCurve: [1, 1.2, 0.9],
        deviceFingerprintHash: 'abc123',
      },
      { trustPenaltyMultiplier: 0.3, borderlineTickCount: 0 },
      1,
    );
    expect(penalized.score).toBeLessThan(fullTrust.score);
  });

  it('hard-rejects when navigator.webdriver is true, regardless of otherwise-perfect signals', () => {
    const result = scoreSession(
      {
        tabActive: true,
        lastInteractionMsAgo: 100,
        scrollVelocityCurve: [1, 1.1, 0.9, 1.05],
        deviceFingerprintHash: 'abc123',
        webdriverFlag: true,
        pluginsLength: 5,
        mouseMovementCurve: [1, 1.1, 0.9],
      },
      baseSession,
      1,
    );
    expect(result.outcome).toBe('reject');
    expect(result.score).toBe(0);
  });

  it('treats zero plugins as a soft penalty, not a hard gate', () => {
    const signalsExceptPlugins = {
      tabActive: true,
      lastInteractionMsAgo: 100,
      scrollVelocityCurve: [1, 1.1, 0.9, 1.05],
      deviceFingerprintHash: 'abc123',
      mouseMovementCurve: [1, 1.2, 0.8, 1.1],
    };
    const withZeroPlugins = scoreSession({ ...signalsExceptPlugins, pluginsLength: 0 }, baseSession, 1);
    // A soft penalty, not a reject — real browsers can report zero plugins too.
    expect(withZeroPlugins.outcome).not.toBe('reject');

    const withPlugins = scoreSession({ ...signalsExceptPlugins, pluginsLength: 12 }, baseSession, 1);
    expect(withPlugins.score).toBeGreaterThan(withZeroPlugins.score);
  });

  it('scores natural (jittery) mouse movement higher than perfectly uniform movement', () => {
    const signalsExceptMouse = {
      tabActive: true,
      lastInteractionMsAgo: 100,
      scrollVelocityCurve: [1, 1.1, 0.9, 1.05],
      deviceFingerprintHash: 'abc123',
      pluginsLength: 5,
    };
    const jittery = scoreSession(
      { ...signalsExceptMouse, mouseMovementCurve: [1, 2.3, 0.4, 1.8, 0.6, 2.1] },
      baseSession,
      1,
    );
    const perfectlyUniform = scoreSession(
      { ...signalsExceptMouse, mouseMovementCurve: [1, 1, 1, 1, 1, 1] },
      baseSession,
      1,
    );
    expect(jittery.score).toBeGreaterThan(perfectlyUniform.score);
  });

  it('never returns a score outside [0, 1], even with a multiplier above 1', () => {
    const result = scoreSession(
      {
        tabActive: true,
        lastInteractionMsAgo: -100,
        scrollVelocityCurve: [1e9],
        deviceFingerprintHash: 'x',
      },
      { trustPenaltyMultiplier: 5, borderlineTickCount: 0 },
      1,
    );
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });
});
