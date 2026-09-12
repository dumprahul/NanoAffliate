import { createHash } from 'node:crypto';
import bs58 from 'bs58';

export interface UaidInput {
  registry: string;
  name: string;
  version: string;
  protocol: string;
  nativeId: string;
  skills: number[];
}

/**
 * Deterministic HCS-14 `uaid:aid:` identity — architecture §11.3.
 * Recomputable by anyone from the six canonical fields; no registry lookup
 * required. Only changes if one of those fields changes.
 */
export function generateUAID({ registry, name, version, protocol, nativeId, skills }: UaidInput): string {
  const canonical = {
    name: name.toLowerCase(),
    nativeId,
    protocol: protocol.toLowerCase(),
    registry: registry.toLowerCase(),
    skills: [...skills].sort((a, b) => a - b),
    version,
  };

  const hash = createHash('sha384').update(JSON.stringify(canonical)).digest();
  const encoded = bs58.encode(hash);

  return `uaid:aid:${encoded};registry=${registry};proto=${protocol};nativeId=${nativeId}`;
}
