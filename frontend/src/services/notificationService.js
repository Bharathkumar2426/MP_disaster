import api from "./api";

/**
 * Service for managing user alert location preferences,
 * nearby incident discovery, and persistent in-app notifications.
 */

export async function getLocationPreferences() {
  const res = await api.get("/notifications/preferences");
  return res.data;
}

export async function updateLocationPreferences(data) {
  const res = await api.put("/notifications/preferences", data);
  return res.data;
}

export async function resolveLocation(queryOrCoords) {
  const res = await api.post("/notifications/resolve", queryOrCoords);
  return res.data;
}

export async function getNearbyIncidents(radiusKm = null) {
  const params = radiusKm ? { radius: radiusKm } : {};
  const res = await api.get("/notifications/nearby", { params });
  return res.data;
}

export async function getNotifications() {
  const res = await api.get("/notifications");
  return res.data;
}

export async function syncNotifications() {
  const res = await api.post("/notifications/sync");
  return res.data;
}

export async function markNotificationAsRead(id) {
  const res = await api.put(`/notifications/${id}/read`);
  return res.data;
}

export async function markAllNotificationsAsRead() {
  const res = await api.post("/notifications/read-all");
  return res.data;
}
