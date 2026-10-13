import api from "./api";

/**
 * Service for Community Disaster Reporting & Response Coordination (Phase 7)
 */

export async function createCommunityReport(data) {
  const res = await api.post("/community-reports", data);
  return res.data;
}

export async function getCommunityReports(params = {}) {
  const res = await api.get("/community-reports", { params });
  return res.data;
}

export async function getVerifiedCommunityReports() {
  const res = await api.get("/community-reports/verified");
  return res.data;
}

export async function getCommunityReportById(id) {
  const res = await api.get(`/community-reports/${id}`);
  return res.data;
}

export async function updateCommunityReportStatus(id, data) {
  const res = await api.put(`/community-reports/${id}/status`, data);
  return res.data;
}

export async function deleteCommunityReport(id) {
  const res = await api.delete(`/community-reports/${id}`);
  return res.data;
}
