import { request } from "./client";
import type {
  Application,
  ApplicationCreate,
  ApplicationFilters,
  ApplicationUpdate,
  Company,
  CompanyCreate,
  CompanyUpdate,
  ImportResult,
  Stats,
  StatusChange,
  StatusChangeCreate,
  StatusTransitions,
} from "./types";

// One typed function per backend endpoint.
export const api = {
  health: () => request<{ status: string }>("/health"),
  statusTransitions: () =>
    request<StatusTransitions>("/meta/status-transitions"),
  stats: () => request<Stats>("/stats"),

  listApplications: (filters: ApplicationFilters = {}) =>
    request<Application[]>("/applications", { query: filters }),
  getApplication: (id: number) => request<Application>(`/applications/${id}`),
  createApplication: (body: ApplicationCreate) =>
    request<Application>("/applications", { method: "POST", body }),
  updateApplication: (id: number, body: ApplicationUpdate) =>
    request<Application>(`/applications/${id}`, { method: "PATCH", body }),
  deleteApplication: (id: number) =>
    request<void>(`/applications/${id}`, { method: "DELETE" }),
  changeStatus: (id: number, body: StatusChangeCreate) =>
    request<StatusChange>(`/applications/${id}/status`, {
      method: "POST",
      body,
    }),
  history: (id: number) =>
    request<StatusChange[]>(`/applications/${id}/history`),
  // The items come straight from a file the user picked, so they are `unknown` here:
  // the backend validates every field and answers 422 when something is wrong.
  importApplications: (items: unknown[]) =>
    request<ImportResult>("/applications/import", {
      method: "POST",
      body: items,
    }),

  listCompanies: () => request<Company[]>("/companies"),
  getCompany: (id: number) => request<Company>(`/companies/${id}`),
  createCompany: (body: CompanyCreate) =>
    request<Company>("/companies", { method: "POST", body }),
  updateCompany: (id: number, body: CompanyUpdate) =>
    request<Company>(`/companies/${id}`, { method: "PATCH", body }),
  deleteCompany: (id: number) =>
    request<void>(`/companies/${id}`, { method: "DELETE" }),
};
