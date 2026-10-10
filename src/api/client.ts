import axios from "axios";
import { env } from "../config/env";
import { attachApiInterceptors } from "./interceptors";

const api = axios.create({
  baseURL: env.apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

attachApiInterceptors(api);

export default api;