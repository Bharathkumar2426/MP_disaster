import api from "./api";

export const getTrainingCenters = () =>
    api.get("/training-centers");

export const createTrainingCenter = (center) =>
    api.post("/training-centers", center);

export const updateTrainingCenter = (id, center) =>
    api.put(`/training-centers/${id}`, center);

export const deleteTrainingCenter = (id) =>
    api.delete(`/training-centers/${id}`);