export type AttackMethod = 'GET' | 'POST';

export type AttackPayload = {
  scenario: string;
  path: string;
  method?: AttackMethod;
  headers?: Record<string, string>;
  body?: unknown;
  successLayer?: string;
  blockedLayer?: string;
  successMessage?: string;
  blockedMessage?: string;
};

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || 'https://api.doanuit.online';

export const SERVER_UI_URL =
  import.meta.env.VITE_SERVER_UI_URL?.replace(/\/$/, '') || 'https://server.doanuit.online';

function buildHeaders(payload: AttackPayload, attackId: string, requestId: string) {
  const headers: Record<string, string> = {
    'X-Attack-Id': attackId,
    'X-Request-ID': requestId,
    'X-Scenario': payload.scenario,
    ...(payload.headers || {}),
  };

  if (payload.body !== undefined && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
}

function buildBody(body: unknown) {
  if (body === undefined) return undefined;
  if (typeof body === 'string' || body instanceof FormData || body instanceof Blob) return body;
  return JSON.stringify(body);
}

function redirectToServer(params: Record<string, string>) {
  const query = new URLSearchParams(params);
  window.location.href = `${SERVER_UI_URL}/?${query.toString()}`;
}

export async function runAttack(payload: AttackPayload) {
  const attackId = crypto.randomUUID();
  const requestId = crypto.randomUUID();
  const method = payload.method || 'GET';

  try {
    const response = await fetch(`${API_BASE_URL}${payload.path}`, {
      method,
      headers: buildHeaders(payload, attackId, requestId),
      body: buildBody(payload.body),
    });

    const allowed = response.ok;

    redirectToServer({
      scenario: payload.scenario,
      result: allowed ? 'allowed' : 'blocked',
      code: String(response.status),
      layer: allowed ? payload.successLayer || 'Backend' : payload.blockedLayer || 'Kong',
      attack_id: attackId,
      request_id: requestId,
      api: payload.path,
      message: allowed
        ? payload.successMessage || 'Request reached protected backend.'
        : payload.blockedMessage || `Gateway blocked request with HTTP ${response.status}.`,
    });
  } catch {
    redirectToServer({
      scenario: payload.scenario,
      result: 'error',
      code: '0',
      layer: 'Browser/CORS/TLS',
      attack_id: attackId,
      request_id: requestId,
      api: payload.path,
      message: 'Browser could not complete the request. Check CORS, TLS certificate, DNS, and Azure inbound rules.',
    });
  }
}

export async function runBurstAttack(token: string, count: number) {
  const attackId = crypto.randomUUID();
  const requestId = crypto.randomUUID();
  let blocked = 0;
  let allowed = 0;
  let failed = 0;

  await Promise.all(
    Array.from({ length: count }, async (_, index) => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/jwt-rs256?_burst=${Date.now()}_${index}`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
            'X-Attack-Id': attackId,
            'X-Request-ID': `${requestId}-${index}`,
            'X-Scenario': 'rate-limit-burst',
          },
        });

        if (response.status === 429) blocked += 1;
        else if (response.ok) allowed += 1;
        else failed += 1;
      } catch {
        failed += 1;
      }
    }),
  );

  redirectToServer({
    scenario: 'rate-limit-burst',
    result: blocked > 0 ? 'blocked' : 'warning',
    code: blocked > 0 ? '429' : '0',
    layer: blocked > 0 ? 'Kong Rate Limiting' : 'Browser/CORS/TLS',
    attack_id: attackId,
    request_id: requestId,
    api: '/api/v1/jwt-rs256',
    message: `Burst completed: ${allowed} allowed, ${blocked} blocked by rate limit, ${failed} failed before/inside gateway.`,
  });
}
