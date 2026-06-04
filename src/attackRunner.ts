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

export type BurstProgress = {
  completed: number;
  total: number;
  allowed: number;
  rateLimited: number;
  rejected: number;
  failed: number;
};

type StudentPayload = {
  name: string;
  student_code: string;
  major: string;
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

function packJson(value: unknown) {
  return encodeURIComponent(JSON.stringify(value));
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

export async function runReplayAttack(payload: AttackPayload, replayRequestId: string) {
  const attackId = crypto.randomUUID();
  const requestId = replayRequestId || crypto.randomUUID();
  const method = payload.method || 'GET';
  const headers = buildHeaders(payload, attackId, requestId);
  const body = buildBody(payload.body);

  try {
    const firstResponse = await fetch(`${API_BASE_URL}${payload.path}`, {
      method,
      headers,
      body,
    });

    const replayResponse = await fetch(`${API_BASE_URL}${payload.path}`, {
      method,
      headers,
      body,
    });

    const replayBlocked = !replayResponse.ok;

    redirectToServer({
      scenario: payload.scenario,
      result: replayBlocked ? 'blocked' : 'allowed',
      code: String(replayResponse.status),
      layer: replayBlocked ? payload.blockedLayer || 'Kong Replay Protection' : payload.successLayer || 'Backend',
      attack_id: attackId,
      request_id: requestId,
      api: payload.path,
      message: replayBlocked
        ? `${payload.blockedMessage || 'Replay request was blocked.'} First request HTTP ${firstResponse.status}, replay HTTP ${replayResponse.status}.`
        : `${payload.successMessage || 'Replay request was still accepted.'} First request HTTP ${firstResponse.status}, replay HTTP ${replayResponse.status}.`,
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
      message: 'Browser could not complete replay test. Check CORS, TLS certificate, DNS, and Azure inbound rules.',
    });
  }
}

export type TokenAlgorithm = 'rs256' | 'hs256' | 'es256';

export async function fetchDemoToken(role: 'admin' | 'user', algorithm: TokenAlgorithm = 'rs256') {
  const url = `${API_BASE_URL}/api/v1/demo-token/${role}?algorithm=${algorithm}`;
  const response = await fetch(url, {
    headers: {
      'X-Attack-Id': crypto.randomUUID(),
      'X-Request-ID': crypto.randomUUID(),
      'X-Scenario': `demo-token-${role}-${algorithm}`,
    },
  });
  const data = await response.json();

  if (!response.ok || !data.access_token) {
    throw new Error(data.message || `Demo token request failed with HTTP ${response.status}`);
  }

  return data.access_token as string;
}

export async function runStudentAclDemo({
  token,
  role,
  student,
  algo = 'rs256',
}: {
  token: string;
  role: 'user' | 'admin';
  student: StudentPayload;
  algo?: TokenAlgorithm;
}) {
  const attackId = crypto.randomUUID();
  const requestId = crypto.randomUUID();
  const path = `/api/v1/students-${algo}`;
  const authHeaders: Record<string, string> = token.trim() ? { Authorization: `Bearer ${token.trim()}` } : {};

  try {
    const createResponse = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
        'X-Attack-Id': attackId,
        'X-Request-ID': requestId,
        'X-Scenario': `acl-${role}-${algo}-create-student`,
      },
      body: JSON.stringify(student),
    });

    let tableResponse: Response | undefined;
    let tableData: unknown = null;

    try {
      tableResponse = await fetch(`${API_BASE_URL}${path}?_evidence=${Date.now()}`, {
        headers: {
          ...authHeaders,
          'X-Attack-Id': attackId,
          'X-Request-ID': `${requestId}-table`,
          'X-Scenario': `acl-${role}-${algo}-students-table`,
        },
      });
      tableData = await tableResponse.json();
    } catch {
      tableData = { status: 'FAILED', students: [] };
    }

    const createAllowed = createResponse.ok;
    const expectedBlocked = role === 'user' && !createAllowed;
    const expectedAllowed = role === 'admin' && createAllowed;
    const result = expectedBlocked || expectedAllowed ? (createAllowed ? 'allowed' : 'blocked') : 'warning';
    const students = Array.isArray((tableData as { students?: unknown }).students)
      ? (tableData as { students: unknown[] }).students
      : [];

    redirectToServer({
      scenario: role === 'admin' ? `admin-role-create-student-${algo}` : `user-role-create-student-${algo}`,
      result,
      code: String(createResponse.status),
      layer: createAllowed ? 'Backend' : 'Kong ACL/RBAC',
      attack_id: attackId,
      request_id: requestId,
      api: path,
      message: createAllowed
        ? `Admin role created student ${student.student_code} via ${algo.toUpperCase()}. Table refreshed with HTTP ${tableResponse?.status || 'n/a'}.`
        : `User role was blocked from creating student ${student.student_code} via ${algo.toUpperCase()}. Table refreshed with HTTP ${tableResponse?.status || 'n/a'} — blocked row should not appear.`,
      table: 'students',
      actor_role: role,
      mutation_status: createAllowed ? 'created' : 'blocked',
      attempted_student: packJson(student),
      students: packJson(students),
    });
  } catch {
    redirectToServer({
      scenario: role === 'admin' ? `admin-role-create-student-${algo}` : `user-role-create-student-${algo}`,
      result: 'error',
      code: '0',
      layer: 'Browser/CORS/TLS',
      attack_id: attackId,
      request_id: requestId,
      api: path,
      message: 'Browser could not complete ACL demo. Check token, CORS, TLS certificate, DNS, and Azure inbound rules.',
      table: 'students',
      actor_role: role,
      mutation_status: 'error',
      attempted_student: packJson(student),
      students: packJson([]),
    });
  }
}

export async function runBurstAttack(
  token: string,
  count: number,
  burstPath: string,
  scenario: string,
  onProgress?: (progress: BurstProgress) => void,
) {
  const attackId = crypto.randomUUID();
  const requestId = crypto.randomUUID();
  let rateLimited = 0;
  let allowed = 0;
  let rejected = 0;
  let failed = 0;
  let completed = 0;

  if (!token.trim()) {
    redirectToServer({
      scenario,
      result: 'warning',
      code: '0',
      layer: 'Attack Client',
      attack_id: attackId,
      request_id: requestId,
      api: burstPath,
      message: `Rate-limit demo needs a valid token. Without it, JWT blocks the request before rate-limit evidence is meaningful.`,
    });
    return;
  }

  onProgress?.({ completed, total: count, allowed, rateLimited, rejected, failed });

  await Promise.all(
    Array.from({ length: count }, async (_, index) => {
      try {
        const response = await fetch(`${API_BASE_URL}${burstPath}?_burst=${Date.now()}_${index}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Attack-Id': attackId,
            'X-Request-ID': `${requestId}-${index}`,
            'X-Scenario': scenario,
          },
        });

        if (response.status === 429) rateLimited += 1;
        else if (response.ok) allowed += 1;
        else rejected += 1;
      } catch {
        failed += 1;
      }

      completed += 1;
      onProgress?.({ completed, total: count, allowed, rateLimited, rejected, failed });
    }),
  );

  redirectToServer({
    scenario,
    result: rateLimited > 0 ? 'blocked' : 'warning',
    code: rateLimited > 0 ? '429' : rejected > 0 ? '401/403' : '200',
    layer: rateLimited > 0 ? 'Kong Rate Limiting' : rejected > 0 ? 'Kong JWT/ACL' : 'Backend',
    attack_id: attackId,
    request_id: requestId,
    api: burstPath,
    message: `Burst completed: ${count} requests sent → ${allowed} allowed, ${rateLimited} rate-limited (429), ${rejected} rejected by auth/policy, ${failed} network errors.`,
  });
}
