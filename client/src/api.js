const BASE_URL = "/api";

export async function fetchApi(endpoint, options = {}) {
  const token = localStorage.getItem("medflow_token") || localStorage.getItem("edoc_token");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
}

export const api = {
  // Auth
  login: (email, password, expectedRole) =>
    fetchApi("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, expectedRole })
    }),
  register: (payload) =>
    fetchApi("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  getMe: () => fetchApi("/auth/me"),

  // Specialties
  getSpecialties: () => fetchApi("/specialties"),

  // Doctors
  getDoctors: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/doctors${query ? `?${query}` : ""}`);
  },
  createDoctor: (data) =>
    fetchApi("/doctors", {
      method: "POST",
      body: JSON.stringify(data)
    }),
  updateDoctor: (id, data) =>
    fetchApi(`/doctors/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    }),
  deleteDoctor: (id) =>
    fetchApi(`/doctors/${id}`, {
      method: "DELETE"
    }),

  // Patients
  getPatients: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/patients${query ? `?${query}` : ""}`);
  },
  getPatient: (id) => fetchApi(`/patients/${id}`),
  updatePatient: (id, data) =>
    fetchApi(`/patients/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    }),
  deletePatient: (id) =>
    fetchApi(`/patients/${id}`, {
      method: "DELETE"
    }),

  // Schedules
  getSchedules: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/schedules${query ? `?${query}` : ""}`);
  },
  createSchedule: (data) =>
    fetchApi("/schedules", {
      method: "POST",
      body: JSON.stringify(data)
    }),
  deleteSchedule: (id) =>
    fetchApi(`/schedules/${id}`, {
      method: "DELETE"
    }),

  // Appointments
  getAppointments: () => fetchApi("/appointments"),
  bookAppointment: (scheduleId) =>
    fetchApi("/appointments", {
      method: "POST",
      body: JSON.stringify({ scheduleId })
    }),
  cancelAppointment: (id) =>
    fetchApi(`/appointments/${id}`, {
      method: "DELETE"
    }),

  // Metrics
  getStats: () => fetchApi("/stats")
};
