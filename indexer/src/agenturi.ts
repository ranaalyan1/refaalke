/**
 * agentURI.ts — resolve ERC-8004 registration URIs: data:, https:, ipfs://
 * (2-gateway rotation — mirrors the contract's E2 handling).
 */
import { REGISTRATION_TYPE, CONFIG } from "./config.js";

export interface Registration {
  name: string;
  description: string;
  type: string;
  compliant: boolean;
  services: { name: string; endpoint: string }[];
  x402Support: boolean;
  active: boolean;
}

const GATEWAYS = ["https://ipfs.io/ipfs/", "https://dweb.link/ipfs/"];

export async function fetchText(uri: string): Promise<string | null> {
  try {
    if (uri.startsWith("data:")) {
      const comma = uri.indexOf(",");
      if (comma < 0) return null;
      const meta = uri.slice(5, comma);
      const payload = uri.slice(comma + 1);
      if (meta.includes(";base64")) {
        return Buffer.from(payload, "base64").toString("utf-8");
      }
      return decodeURIComponent(payload);
    }
    if (uri.startsWith("ipfs://")) {
      const rest = uri.slice(7);
      for (const gw of [...GATEWAYS, CONFIG.ipfsGateway]) {
        try {
          const res = await fetch(`${gw}${rest}`, {
            signal: AbortSignal.timeout(10_000),
          });
          if (res.ok) return await res.text();
        } catch {
          /* next gateway */
        }
      }
      return null;
    }
    if (uri.startsWith("http")) {
      const res = await fetch(uri, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) return null;
      return await res.text();
    }
    return null;
  } catch {
    return null;
  }
}

export function parseRegistration(text: string): Registration | null {
  try {
    const doc = JSON.parse(text);
    return {
      name: String(doc.name ?? ""),
      description: String(doc.description ?? ""),
      type: String(doc.type ?? ""),
      compliant: doc.type === REGISTRATION_TYPE,
      services: (Array.isArray(doc.services) ? doc.services : [])
        .slice(0, 3)
        .map((s: any) => ({
          name: String(s?.name ?? "unknown"),
          endpoint: String(s?.endpoint ?? ""),
        })),
      x402Support: Boolean(doc.x402Support),
      active: doc.active !== false,
    };
  } catch {
    return null;
  }
}

/** Full resolve: returns null when the registration file is unresolvable. */
export async function resolveRegistration(uri: string): Promise<Registration | null> {
  const text = await fetchText(uri);
  if (text === null) return null;
  return parseRegistration(text);
}
