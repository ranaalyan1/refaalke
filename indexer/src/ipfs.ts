/**
 * ipfs.ts — pin snapshot / feedback JSON to IPFS.
 * Supports Pinata JWT (default) or a self-hosted Kubo IPFS_API_URL.
 * Returns ipfs://CID URIs (the contract resolves them via gateway rotation).
 */
import { CONFIG } from "./config.js";

async function pinViaPinata(doc: unknown): Promise<string | null> {
  if (!CONFIG.pinataJwt) return null;
  try {
    const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CONFIG.pinataJwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pinataContent: doc,
        pinataOptions: { cidVersion: 1 },
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { IpfsHash?: string };
    return json.IpfsHash ? `ipfs://${json.IpfsHash}` : null;
  } catch {
    return null;
  }
}

async function pinViaKubo(doc: unknown): Promise<string | null> {
  if (!CONFIG.ipfsApiUrl) return null;
  try {
    const res = await fetch(`${CONFIG.ipfsApiUrl}/add?cid-version=1`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(doc),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { Hash?: string };
    return json.Hash ? `ipfs://${json.Hash}` : null;
  } catch {
    return null;
  }
}

export async function pinJson(doc: unknown): Promise<string> {
  const uri = (await pinViaPinata(doc)) ?? (await pinViaKubo(doc));
  if (!uri) {
    throw new Error(
      "IPFS pin failed — set PINATA_JWT or IPFS_API_URL (see .env.example)"
    );
  }
  return uri;
}

export function toHttpsGateway(uri: string): string {
  if (!uri.startsWith("ipfs://")) return uri;
  return `${CONFIG.ipfsGateway}${uri.slice(7)}`;
}
