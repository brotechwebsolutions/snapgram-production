import axios from "axios";

/**
 * Production-safe Axios instance
 * ✔ Uses Vercel env variable when provided
 * ✔ Uses localhost fallback only in development
 * ✔ Automatically attaches JWT
 * ✔ Handles network errors cleanly
 */

const envBaseUrl = import.meta.env.VITE_API_BASE_URL;
const API_BASE_URL = envBaseUrl
  ? envBaseUrl.replace(/\/$/, "")
  : import.meta.env.DEV
    ? "http://localhost:8080"
    : null;

if (!API_BASE_URL) {
  throw new Error("VITE_API_BASE_URL is required in production");
}

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
  withCredentials: false, // set true only if using cookies
});

// ─────────────────────────────────────────────
// ✅ Request Interceptor (Attach JWT)
// ─────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ─────────────────────────────────────────────
// ✅ Response Interceptor (Error Handling)
// ─────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // ❌ Network / CORS / Backend down
    if (!error.response) {
      console.error("🚨 Network Error:", error.message);
      error.userMessage = "Unable to connect to server. Please try again.";
      return Promise.reject(error);
    }

    const { status, config } = error.response;

    // 🔐 Handle Unauthorized (except auth routes)
    if (status === 401 && !config.url?.includes("/auth/")) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");

      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
    }

    // 🚫 Too many requests
    if (status === 429) {
      error.userMessage = "Too many requests. Please try again later.";
    }

    // 💥 Server error
    if (status >= 500) {
      error.userMessage = "Server error. Please try again.";
    }

    return Promise.reject(error);
  }
);

export default api;