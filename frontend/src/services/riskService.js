import api from "./api";

/**
 * Explainable Disaster Risk Assessment Client (Phase 5)
 */

export const getDisasterRiskAssessment = (id) =>
  api.get(`/disasters/${id}/risk-assessment`);

export const assessLocationRisk = (payload) =>
  api.post("/ai/risk-assessment", payload);
