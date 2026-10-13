import api from "./api";

/**
 * Phase 8: RakshaBot — AI Disaster Assistance Chatbot Service
 */

export const RAKSHABOT_TIMEOUT_MS = 25000;

export async function sendRakshaBotMessage(message, history = [], options = {}) {
  const timeout = options.timeout || RAKSHABOT_TIMEOUT_MS;
  const payload = {
    message: (message || "").trim(),
    history: Array.isArray(history) ? history : [],
  };
  if (options.location) payload.location = options.location;
  if (options.latitude != null) payload.latitude = options.latitude;
  if (options.longitude != null) payload.longitude = options.longitude;

  const res = await api.post("/ai/chat", payload, {
    timeout,
    ...options,
  });
  return res.data;
}
