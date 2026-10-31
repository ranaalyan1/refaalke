/**
 * abis.ts — minimal ERC-8004 Identity + Reputation Registry ABIs (Base mainnet).
 *
 * The registry addresses are CREATE2-identical on every chain (R: same
 * addresses on Base, Ethereum, BNB, Arbitrum, Robinhood Chain).
 * Verify function/event shapes against the canonical ERC-8004 spec before
 * mainnet-critical use: https://eips.ethereum.org/EIPS/eip-8004
 */
import { parseAbiItem } from "viem";

/** ERC-721 + agent identity (Identity Registry). */
export const identityAbi = [
  {
    type: "function",
    name: "getAgent",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [
      { name: "agentWallet", type: "address" },
      { name: "owner", type: "address" },
      { name: "agentURI", type: "string" },
    ],
  },
  {
    type: "function",
    name: "tokenURI",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

/** Reputation Registry — summary + feedback forensics. */
export const reputationAbi = [
  {
    type: "function",
    name: "getSummary",
    stateMutability: "view",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "clients", type: "uint8[]" },
    ],
    outputs: [
      { name: "calculatedRatings", type: "uint16[6]" },
      { name: "expectedRatings", type: "uint16[6]" },
      { name: "feedbackCount", type: "uint256" },
      { name: "successfulReviews", type: "uint256" },
      { name: "totalReviews", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "getFeedbackList",
    stateMutability: "view",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "clientType", type: "uint8" },
    ],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "getFeedback",
    stateMutability: "view",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "feedbackId", type: "uint256" },
    ],
    outputs: [
      { name: "rating", type: "uint16" },
      { name: "clientType", type: "uint8" },
      { name: "text", type: "string" },
      { name: "timestamp", type: "uint256" },
      { name: "paymentProofId", type: "uint256" },
      { name: "reviewer", type: "address" },
    ],
  },
  {
    type: "function",
    name: "agentWallet",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

/** NewAgent event emitted by the Identity Registry at registration. */
export const newAgentEvent = parseAbiItem(
  "event NewAgent(address indexed agentWallet, uint256 indexed agentId, address indexed owner, string agentURI)"
);

/** NewFeedback event emitted by the Reputation Registry. */
export const newFeedbackEvent = parseAbiItem(
  "event NewFeedback(uint256 indexed agentId, uint256 indexed feedbackId, address indexed reviewer, uint8 clientType, uint16 rating, string text, uint256 feedbackTimestamp, uint256 paymentProofId, uint256 version)"
);

/** ERC-721 Transfer (fallback discovery if NewAgent topic differs). */
export const transferEvent = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
);
