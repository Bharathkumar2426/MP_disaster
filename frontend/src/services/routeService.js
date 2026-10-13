import api from "./api";

/**
 * Service for Safe-Route Guidance (Phase 7)
 */

export const ROUTE_CALCULATION_TIMEOUT_MS = 25000; // 25s timeout for route calculation
export const GEOCODE_TIMEOUT_MS = 10000; // 10s timeout for geocoding

export async function calculateSafeRoute(payload, options = {}) {
  const timeout = options.timeout || ROUTE_CALCULATION_TIMEOUT_MS;
  const res = await api.post("/routes/safe-route", payload, {
    timeout,
    ...options,
  });
  return res.data;
}

export async function geocodePlaceName(query, options = {}) {
  const timeout = options.timeout || GEOCODE_TIMEOUT_MS;
  const res = await api.get("/routes/geocode", {
    params: { query },
    timeout,
    ...options,
  });
  return res.data;
}
