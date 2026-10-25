import type {
  Application,
  Company,
  Stats,
  StatusChange,
  StatusTransitions,
} from "../api/types";

// Test data with the generated types, so a fixture that no longer matches the API
// schema is a type error.

// What GET /meta/status-transitions returns (built from backend/app/status_rules.py).
export const TRANSITIONS: StatusTransitions = {
  saved: ["applied", "withdrawn"],
  applied: [
    "screening",
    "assignment",
    "technical",
    "rejected",
    "withdrawn",
    "ghosted",
  ],
  screening: [
    "assignment",
    "technical",
    "final",
    "rejected",
    "withdrawn",
    "ghosted",
  ],
  assignment: ["technical", "final", "rejected", "withdrawn", "ghosted"],
  technical: [
    "technical",
    "final",
    "offer",
    "rejected",
    "withdrawn",
    "ghosted",
  ],
  final: ["offer", "rejected", "withdrawn", "ghosted"],
  offer: ["accepted", "declined"],
  accepted: [],
  declined: [],
  rejected: [],
  withdrawn: [],
  ghosted: ["screening", "assignment", "technical", "final", "rejected"],
};

let nextId = 100;

export function makeCompany(overrides: Partial<Company> = {}): Company {
  return {
    id: nextId++,
    name: "Acme Robotics",
    website: null,
    notes: null,
    created_at: "2026-10-01T12:00:00Z",
    ...overrides,
  };
}

export function makeApplication(
  overrides: Partial<Application> = {},
): Application {
  const id = overrides.id ?? nextId++;
  return {
    id,
    company_id: 1,
    title: "Junior Backend Developer",
    position_type: "backend",
    level: "junior",
    employment_type: "full_time",
    work_mode: "hybrid",
    city: "Tel Aviv",
    salary_min: null,
    salary_max: null,
    job_url: `https://jobs.example.com/${id}`,
    source: "linkedin",
    skills: ["python", "sql"],
    status: "saved",
    applied_at: null,
    notes: null,
    created_at: "2026-10-10T12:00:00Z",
    updated_at: "2026-10-10T12:00:00Z",
    ...overrides,
  };
}

export function makeStatusChange(
  overrides: Partial<StatusChange> = {},
): StatusChange {
  return {
    id: nextId++,
    from_status: null,
    to_status: "saved",
    changed_at: "2026-10-10T12:00:00Z",
    note: null,
    ...overrides,
  };
}

export function makeStats(overrides: Partial<Stats> = {}): Stats {
  return {
    applied: 0,
    responded: 0,
    response_rate: 0,
    avg_days_to_first_response: null,
    funnel: [
      { stage: "applied", count: 0 },
      { stage: "screening", count: 0 },
      { stage: "assignment", count: 0 },
      { stage: "technical", count: 0 },
      { stage: "final", count: 0 },
      { stage: "offer", count: 0 },
    ],
    ...overrides,
  };
}
