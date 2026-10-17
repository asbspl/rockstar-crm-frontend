
import axios from "axios";
import { env } from "../config/env";
import { attachApiInterceptors } from "./interceptors";

const api = axios.create({
  baseURL: env.apiBaseUrl || "",
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

attachApiInterceptors(api);

export default api;
