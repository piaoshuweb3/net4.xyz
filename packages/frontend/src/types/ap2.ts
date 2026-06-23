export type Hex = `0x${string}`;

export type TaskStatus = "active" | "completed" | "cancelled" | "disputed";

export interface EscrowTask {
  id: number;
  payer: Hex;
  payee: Hex;
  baseAmount: string;
  optionAmount: string;
  withdrawn: string;
  startTime: number;
  durationSeconds: number;
  targetHash: Hex;
  scopeHash: Hex;
  status: TaskStatus;
}

export interface TDPOPosition {
  cognitiveHash: Hex;
  creator: Hex;
  deposits: string;
  lockTime: number;
  unlockTime: number;
  evolutionFactor: number;
  challengeEndTime: number;
  vetoed: boolean;
  claimed: boolean;
}

export interface ECEVector {
  valence: number;
  arousal: number;
  cognitiveEntropy: number;
  mutationIndex: number;
  provenance: {
    originalEntity: string;
    currentCarrier: string;
    isMutation: boolean;
  };
  zkProofHash: Hex;
}

export interface CognitiveNode {
  id: string;
  label: string;
  kind: "avatar" | "agent" | "cognition" | "carrier" | "tombstone";
  entropy: number;
  reputation: number;
}

export interface CognitiveEdge {
  source: string;
  target: string;
  weight: number;
  reason: "lineage" | "mutation" | "tdpo-lock" | "cpdf-decay" | "legacy-anchor";
}

export interface ProtocolEvent {
  id: string;
  blockNumber?: number;
  txHash?: Hex;
  timestamp: number;
  severity: "info" | "success" | "warning" | "critical";
  module: "escrow" | "budget-fence" | "tdpo" | "cip" | "dag" | "pcmg" | "system";
  title: string;
  body: string;
}
