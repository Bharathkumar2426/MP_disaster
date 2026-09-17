import api from "./api";

export const getTrainingPrograms = () =>
    api.get("/training-programs");

export const createTrainingProgram = (program) =>
    api.post("/training-programs", program);

export const updateTrainingProgram = (id, program) =>
    api.put(`/training-programs/${id}`, program);

export const deleteTrainingProgram = (id) =>
    api.delete(`/training-programs/${id}`);