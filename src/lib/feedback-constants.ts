import type { MessageStatus } from "./types/database";

export const FEEDBACK_STATUS_LABELS: Record<MessageStatus, string> = {
  ny: "Ny",
  behandlas: "Behandlas",
  klar: "Klar",
};
