const API_BASE = "/api";

export function getAuthToken() {
  return (
    localStorage.getItem("modern_farms_token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("modern_farms_token") ||
    sessionStorage.getItem("access_token") ||
    sessionStorage.getItem("token")
  );
}

export function getUser() {
  const raw =
    localStorage.getItem("modern_farms_user") ||
    sessionStorage.getItem("modern_farms_user") ||
    localStorage.getItem("user") ||
    sessionStorage.getItem("user");
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error("Unable to read the saved user session.", error);
    return null;
  }
}

export function saveSession(token, user, remember = true) {
  clearSession();
  const storage = remember ? localStorage : sessionStorage;
  if (token) {
    storage.setItem("modern_farms_token", token);
    storage.setItem("access_token", token);
  }
  if (user) {
    storage.setItem("modern_farms_user", JSON.stringify(user));
    storage.setItem("user", JSON.stringify(user));
  }
}

export function clearSession() {
  for (const storage of [localStorage, sessionStorage]) {
    for (const key of [
      "modern_farms_token",
      "access_token",
      "token",
      "modern_farms_user",
      "user"
    ]) {
      storage.removeItem(key);
    }
  }
}

export async function request(endpoint, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");

  const token = getAuthToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : { message: await response.text() };

  if (!response.ok) {
    const error = new Error(
      data.message || data.msg || data.error || `Request failed (${response.status})`
    );
    error.status = response.status;
    error.data = data;
    if (response.status === 401) clearSession();
    throw error;
  }

  return data;
}

export function collection(data, key) {
  const result = data?.[key] ?? data?.data ?? data;
  return Array.isArray(result) ? result : [];
}

export function currency(value) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}

export function destinationForRole(role) {
  const normalized = String(role || "").toLowerCase();
  if (["producer", "farmer", "seller", "vendor"].includes(normalized)) {
    return "/frontend/pages/producer-dashboard.html";
  }
  if (["admin", "administrator"].includes(normalized)) {
    return "/frontend/pages/admin-dashboard.html";
  }
  if (["customer", "buyer", "client"].includes(normalized)) {
    return "/frontend/pages/customer-dashboard.html";
  }
  return null;
}
