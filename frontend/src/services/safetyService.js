import api from "./api";

/**
 * Service to fetch disaster safety types and phase-by-phase life safety protocols.
 */
export const getSafetyTypes = () => api.get("/safety/types");

export const getSafetyGuidance = (disasterType) =>
  api.get(`/safety/${encodeURIComponent(disasterType)}`);

export const getSafetyRecommendations = (params = {}) =>
  api.get("/safety/recommendations", { params });

export default {
  getSafetyTypes,
  getSafetyGuidance,
  getSafetyRecommendations,
};
