import axios from "axios";

const api = axios.create({
    baseURL: "http://localhost:8080/api"
});

// Request Interceptor: Attach JWT Bearer token if available
api.interceptors.request.use(
    (config) => {
        try {
            const storedUser = localStorage.getItem("user");
            if (storedUser) {
                const user = JSON.parse(storedUser);
                if (user && user.token) {
                    config.headers.Authorization = `Bearer ${user.token}`;
                }
            }
        } catch (e) {
            console.error("Error reading token from localStorage", e);
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 Unauthorized / Token Expiration
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem("user");
            if (window.location.pathname !== "/login") {
                window.location.href = "/login";
            }
        }
        return Promise.reject(error);
    }
);

export default api;