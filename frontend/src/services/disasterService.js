import api from "./api";

export const getDisasters = () => api.get("/disasters");

export const createDisaster = (disaster) =>
    api.post("/disasters", disaster);

export const updateDisaster = (id, disaster) =>
    api.put(`/disasters/${id}`, disaster);

export const deleteDisaster = (id) =>
    api.delete(`/disasters/${id}`);

export const getDisasterWeather = (id) =>
    api.get(`/disasters/${id}/weather`);

export const getDisasterRiskAssessment = (id) =>
    api.get(`/disasters/${id}/risk-assessment`);