// ---------------------------------------------------------------------------
// Centralized API client for the Scheme Navigator backend
// ---------------------------------------------------------------------------

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

// ---- Session helpers --------------------------------------------------------

function getSessionId(): string {
  const KEY = "jankalyan_session_id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

// ---- Shared request helper --------------------------------------------------

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-session-id": getSessionId(),
      ...(init?.headers as Record<string, string>),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as Record<string, string>).error ?? `API ${res.status}`,
    );
  }

  return res.json() as Promise<T>;
}

// ---- Types ------------------------------------------------------------------

/** A single scheme as returned by the backend. */
export type ApiScheme = {
  id: string;
  name: string;
  summary: string;
  match_score: number;
  match_reasons: string[];
  benefits: Record<string, string>;
  documents: string[];
  deadline: string | null;
  application_url: string | null;
  source_pdf: string | null;
};

export type SchemesResponse = {
  count: number;
  filters_applied: Record<string, string>;
  schemes: ApiScheme[];
};

export type SchemeDetailResponse = {
  scheme: Record<string, unknown>;
};

export type SchemeFilters = {
  state?: string;
  category?: string;
  land_size?: string;
  income?: string;
  age?: string;
};

export type ChatRequest = {
  query: string;
  scheme_id?: string;
  language?: string;
  audio?: boolean;
};

export type Citation = {
  document: string;
  page: string;
  s3_uri: string;
  excerpt: string;
};

export type ChatResponse = {
  answer: string;
  citations: Citation[];
  audio_url: string | null;
  scheme_id: string | null;
  bedrock_session_id: string | null;
  model_used: string;
  degraded: boolean;
  disclaimer: string;
};

// ---- Endpoints --------------------------------------------------------------

/** GET /schemes  — list & filter schemes */
export async function fetchSchemes(
  filters: SchemeFilters = {},
): Promise<SchemesResponse> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v) params.set(k, v);
  }
  const qs = params.toString();
  return request<SchemesResponse>(`/schemes${qs ? `?${qs}` : ""}`);
}

/** GET /schemes/:id — single scheme detail */
export async function fetchSchemeById(
  id: string,
): Promise<SchemeDetailResponse> {
  return request<SchemeDetailResponse>(`/schemes/${encodeURIComponent(id)}`);
}

/** POST /chat — voice-RAG chat */
export async function postChat(req: ChatRequest): Promise<ChatResponse> {
  return request<ChatResponse>("/chat", {
    method: "POST",
    body: JSON.stringify({
      ...req,
      session_id: getSessionId(),
      audio: req.audio ?? true,
    }),
  });
}

/** POST /eligibility — eligibility check (same handler) */
export async function postEligibility(
  req: ChatRequest,
): Promise<ChatResponse> {
  return request<ChatResponse>("/eligibility", {
    method: "POST",
    body: JSON.stringify({
      ...req,
      session_id: getSessionId(),
      audio: req.audio ?? true,
    }),
  });
}
