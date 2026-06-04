import { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCopy,
  Database,
  Fingerprint,
  Flame,
  KeyRound,
  Lock,
  Network,
  Play,
  RotateCcw,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Target,
  Zap,
} from 'lucide-react';
import {
  API_BASE_URL,
  SERVER_UI_URL,
  TokenAlgorithm,
  fetchDemoToken,
  runAttack,
  runBurstAttack,
  runReplayAttack,
  runStudentAclDemo,
} from './attackRunner';

type PageKey = 'dashboard' | 'jwt' | 'acl' | 'hmac' | 'mtls' | 'ratelimit';

type ActionCardProps = {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  danger?: boolean;
  success?: boolean;
  buttonLabel: string;
  onRun: () => void;
};

const ALGO_OPTIONS: { value: TokenAlgorithm; label: string; color: string }[] = [
  { value: 'rs256', label: 'RS256', color: '#6366f1' },
  { value: 'hs256', label: 'HS256', color: '#10b981' },
  { value: 'es256', label: 'ES256', color: '#06b6d4' },
];

const navItems: Array<{ key: PageKey; name: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: 'dashboard', name: 'Dashboard', icon: Activity },
  { key: 'jwt', name: 'JWT Auth (IdP)', icon: Shield },
  { key: 'acl', name: 'ACL Student Table', icon: Database },
  { key: 'hmac', name: 'HMAC Signing', icon: Server },
  { key: 'mtls', name: 'Zero-Trust mTLS', icon: Lock },
  { key: 'ratelimit', name: 'Rate Limiting / DDoS', icon: Target },
];

function buildStudent(prefix: string) {
  const suffix = Date.now().toString().slice(-5);
  return {
    name: `${prefix} Demo Student`,
    student_code: `${prefix.toUpperCase()}${suffix}`,
    major: 'Security Test',
  };
}

// ─── JWT decode helpers (no verify — client-side only) ───────────────────────
function safeBase64Decode(str: string): string {
  try {
    return atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  } catch {
    return '(decode error)';
  }
}

function decodeJwtParts(token: string): { header: string; payload: string; signature: string } | null {
  if (!token || token === 'fake.invalid.token') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const header  = JSON.stringify(JSON.parse(safeBase64Decode(parts[0])), null, 2);
    const payload = JSON.stringify(JSON.parse(safeBase64Decode(parts[1])), null, 2);
    return { header, payload, signature: parts[2] };
  } catch {
    return null;
  }
}

function truncate(str: string, maxLen = 48) {
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
}

// ─── TokenInspectorPanel ─────────────────────────────────────────────────────
const TAMPERED_TOKEN = 'fake.invalid.token';

function TokenInspectorPanel({
  originalToken,
  tamperedToken,
  algo,
}: {
  originalToken: string;
  tamperedToken: string;
  algo: string;
}) {
  const [showFull, setShowFull] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const decoded = originalToken ? decodeJwtParts(originalToken) : null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  return (
    <section className="section-panel token-inspector-panel">
      <div className="section-heading">
        <ShieldAlert className="section-heading__icon section-heading__icon--danger" />
        <div>
          <h3>🔍 Token Inspector — Fake Signature Attack</h3>
          <p>So sánh trực tiếp token hợp lệ đã lấy vs token giả mạo được gửi trong kịch bản tấn công.</p>
        </div>
      </div>

      <div className="token-inspector-grid">
        {/* ─── LEFT: Original Token ─── */}
        <div className="token-inspector-col token-inspector-col--valid">
          <div className="token-inspector-label">
            <span className="token-badge token-badge--valid">✓ TOKEN GỐC</span>
            <span className="token-inspector-algo">{algo.toUpperCase()}</span>
          </div>

          {originalToken ? (
            <>
              <div className="token-raw-box token-raw-box--valid">
                <div className="token-raw-header">
                  <span>Raw JWT</span>
                  <button
                    className="copy-btn"
                    onClick={() => copyToClipboard(originalToken, 'original')}
                  >
                    <ClipboardCopy className="copy-btn__icon" />
                    {copied === 'original' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <pre className="token-raw-value">
                  {showFull ? originalToken : truncate(originalToken, 80)}
                </pre>
              </div>

              {decoded && (
                <div className="token-decoded">
                  <div className="token-decoded-part">
                    <span className="token-decoded-label">HEADER</span>
                    <pre className="token-decoded-value token-decoded-value--header">{decoded.header}</pre>
                  </div>
                  <div className="token-decoded-part">
                    <span className="token-decoded-label">PAYLOAD (Claims)</span>
                    <pre className="token-decoded-value token-decoded-value--payload">{decoded.payload}</pre>
                  </div>
                  <div className="token-decoded-part">
                    <span className="token-decoded-label">SIGNATURE</span>
                    <pre className="token-decoded-value token-decoded-value--sig">
                      {showFull ? decoded.signature : truncate(decoded.signature, 48)}
                    </pre>
                  </div>
                </div>
              )}

              <button
                className="toggle-btn"
                onClick={() => setShowFull((v) => !v)}
              >
                {showFull ? <ChevronUp className="button__icon" /> : <ChevronDown className="button__icon" />}
                {showFull ? 'Thu gọn' : 'Xem đầy đủ'}
              </button>
            </>
          ) : (
            <div className="token-empty-hint">
              <KeyRound className="token-empty-hint__icon" />
              <p>Chưa có token. Hãy bấm <strong>"Lấy Admin Token"</strong> ở panel trên để fetch từ Keycloak.</p>
            </div>
          )}
        </div>

        {/* ─── Divider arrow ─── */}
        <div className="token-inspector-divider">
          <div className="attack-arrow">
            <span>TẤN CÔNG</span>
            <span className="attack-arrow__icon">→</span>
          </div>
          <div className="tamper-label">Signature bị thay thế bằng chuỗi giả</div>
        </div>

        {/* ─── RIGHT: Tampered Token ─── */}
        <div className="token-inspector-col token-inspector-col--danger">
          <div className="token-inspector-label">
            <span className="token-badge token-badge--danger">✗ TOKEN GIẢ MẠO</span>
            <span className="token-inspector-algo" style={{ color: '#ff4d6d' }}>FAKE</span>
          </div>

          <div className="token-raw-box token-raw-box--danger">
            <div className="token-raw-header">
              <span>Raw (Tampered)</span>
              <button
                className="copy-btn copy-btn--danger"
                onClick={() => copyToClipboard(tamperedToken, 'tampered')}
              >
                <ClipboardCopy className="copy-btn__icon" />
                {copied === 'tampered' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="token-raw-value token-raw-value--danger">{truncate(tamperedToken, 80)}</pre>
          </div>

          <div className="token-decoded">
            {(() => {
              const tParts = tamperedToken.split('.');
              const hasRealStructure = tParts.length === 3 && originalToken;
              const tHeader = hasRealStructure ? safeBase64Decode(tParts[0]) : 'fake';
              let tHeaderParsed = tHeader;
              try { tHeaderParsed = JSON.stringify(JSON.parse(tHeader), null, 2); } catch { /* keep raw */ }
              const tPayload = hasRealStructure ? safeBase64Decode(tParts[1]) : 'invalid';
              let tPayloadParsed = tPayload;
              try { tPayloadParsed = JSON.stringify(JSON.parse(tPayload), null, 2); } catch { /* keep raw */ }
              return (
                <>
                  <div className="token-decoded-part">
                    <span className="token-decoded-label">
                      {hasRealStructure ? 'HEADER ✓ (giữ nguyên)' : 'HEADER'}
                    </span>
                    <pre className={`token-decoded-value ${hasRealStructure ? 'token-decoded-value--header' : 'token-decoded-value--danger'}`}>
                      {tHeaderParsed}
                    </pre>
                  </div>
                  <div className="token-decoded-part">
                    <span className="token-decoded-label">
                      {hasRealStructure ? 'PAYLOAD ✓ (giữ nguyên)' : 'PAYLOAD'}
                    </span>
                    <pre className={`token-decoded-value ${hasRealStructure ? 'token-decoded-value--payload' : 'token-decoded-value--danger'}`}>
                      {tPayloadParsed}
                    </pre>
                  </div>
                  <div className="token-decoded-part">
                    <span className="token-decoded-label token-decoded-label--danger">SIGNATURE ✗ (ĐÃ SỬA)</span>
                    <pre className="token-decoded-value token-decoded-value--danger">
                      {hasRealStructure ? tParts[2] : 'token'}
                      {'\n'}
                      <span style={{ color: '#ff4d6d', display: 'block', marginTop: '4px' }}>
                        {hasRealStructure
                          ? '← Signature bị thay = Kong từ chối!'
                          : '← Không thể verify bằng Public Key!'}
                      </span>
                    </pre>
                  </div>
                </>
              );
            })()}
          </div>

          <div className="attack-result-badge">
            <span>Kong Gateway Response</span>
            <strong>401 Unauthorized</strong>
            <span style={{ fontSize: '12px', color: '#aab2d5' }}>Signature verification failed</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Reusable AlgoPicker ────────────────────────────────────────────────────
function AlgoPicker({
  algo,
  onChange,
}: {
  algo: TokenAlgorithm;
  onChange: (a: TokenAlgorithm) => void;
}) {
  return (
    <div className="algo-picker">
      {ALGO_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          className={`algo-btn${algo === opt.value ? ' algo-btn--active' : ''}`}
          style={algo === opt.value ? { '--algo-color': opt.color } as React.CSSProperties : {}}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── TokenFetcher panel ─────────────────────────────────────────────────────
function TokenFetchPanel({
  algo,
  onFetchAdmin,
  onFetchUser,
  status,
  adminReady,
  userReady,
}: {
  algo: TokenAlgorithm;
  onFetchAdmin: () => void;
  onFetchUser: () => void;
  status: string;
  adminReady: boolean;
  userReady: boolean;
}) {
  return (
    <section className="section-panel">
      <div className="section-heading">
        <KeyRound className="section-heading__icon section-heading__icon--success" />
        <div>
          <h3>Lấy token theo vai trò ({algo.toUpperCase()})</h3>
          <p>Gọi qua API Gateway → server lấy token Keycloak nội bộ cho thuật toán đang chọn.</p>
        </div>
      </div>
      <div className="two-column">
        <button className="button button--success" onClick={onFetchAdmin}>
          <KeyRound className="button__icon" />
          Lấy Admin Token ({algo.toUpperCase()})
        </button>
        <button className="button" onClick={onFetchUser}>
          <KeyRound className="button__icon" />
          Lấy User Token ({algo.toUpperCase()})
        </button>
      </div>
      {status && <p className="token-message">{status}</p>}
      <div className="two-column" style={{ marginTop: '0.75rem' }}>
        <div className="token-status">
          <span>Admin token</span>
          <strong>{adminReady ? `✓ Có token ${algo.toUpperCase()} admin` : 'Chưa có'}</strong>
        </div>
        <div className="token-status">
          <span>User token</span>
          <strong>{userReady ? `✓ Có token ${algo.toUpperCase()} user` : 'Chưa có'}</strong>
        </div>
      </div>
    </section>
  );
}

function ActionCard({ title, description, icon: Icon, danger, success, buttonLabel, onRun }: ActionCardProps) {
  return (
    <section className={danger ? 'card card--danger' : success ? 'card card--success' : 'card'}>
      <div className="card__header">
        <Icon className="card__icon" />
        <h3>{title}</h3>
      </div>
      <p>{description}</p>
      <button className={danger ? 'button button--danger' : success ? 'button button--success' : 'button'} onClick={onRun}>
        <Play className="button__icon" />
        {buttonLabel}
      </button>
    </section>
  );
}

function PageTitle({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="page-title">
      <h2>
        <Icon className="page-title__icon" />
        {title}
      </h2>
      <p>{subtitle}</p>
    </div>
  );
}

// ─── Dashboard ──────────────────────────────────────────────────────────────
function Dashboard({ onNavigate }: { onNavigate: (page: PageKey) => void }) {
  return (
    <div className="page-stack">
      <PageTitle
        icon={ShieldAlert}
        title="Attack Test Console"
        subtitle="Giao diện client tấn công có kiểm soát — chọn thuật toán JWT rồi chạy từng kịch bản demo."
      />

      <section className="hero-panel">
        <div>
          <p className="eyebrow">Controlled client attack</p>
          <h3>Attack Frontend {'→'} API Gateway {'→'} Server UI Evidence</h3>
          <p>
            Mỗi nút test sẽ gửi request thật vào API Gateway, gắn X-Attack-Id/X-Request-ID, nhận status từ server,
            rồi redirect sang Server UI để hiển thị message box.
          </p>
        </div>
        <div className="hero-panel__status">
          <span>API target</span>
          <strong>{API_BASE_URL}</strong>
          <span>Server UI</span>
          <strong>{SERVER_UI_URL}</strong>
        </div>
      </section>

      <div className="feature-grid">
        {navItems.slice(1).map((item) => (
          <button key={item.key} className="feature-card" onClick={() => onNavigate(item.key)}>
            <item.icon className="feature-card__icon" />
            <span>{item.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── JWT Page ────────────────────────────────────────────────────────────────
function JwtPage({
  algo, setAlgo,
  adminTokens, userTokens,
  setAdminToken, setUserToken,
}: GlobalTokenState) {
  const [status, setStatus] = useState('');
  const adminToken = adminTokens[algo] ?? '';
  const userToken  = userTokens[algo]  ?? '';
  const jwtPath    = `/api/v1/jwt-${algo}`;

  const getToken = async (role: 'admin' | 'user') => {
    setStatus(`Đang lấy ${role} token (${algo.toUpperCase()}) từ Keycloak...`);
    try {
      const token = await fetchDemoToken(role, algo);
      role === 'admin' ? setAdminToken(algo, token) : setUserToken(algo, token);
      setStatus(`✓ Đã lấy ${role} token (${algo.toUpperCase()}) thành công.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : `Không lấy được ${role} token.`);
    }
  };

  // Build a tampered token from the admin token (keep header+payload, replace signature)
  const tamperedToken = adminToken
    ? (() => {
        const parts = adminToken.split('.');
        return parts.length === 3
          ? `${parts[0]}.${parts[1]}.TAMPERED_SIGNATURE_INVALID_xK92mQ`
          : TAMPERED_TOKEN;
      })()
    : TAMPERED_TOKEN;

  return (
    <div className="page-stack">
      <PageTitle
        icon={Shield}
        title="JWT Verification & Access Control"
        subtitle="Kiểm thử riêng RS256, HS256, ES256 — chọn thuật toán bên dưới để chuyển đổi toàn bộ kịch bản."
      />

      {/* Algo selector */}
      <section className="section-panel">
        <div className="section-heading">
          <ShieldCheck className="section-heading__icon" />
          <div>
            <h3>Chọn thuật toán JWT</h3>
            <p>Tất cả các kịch bản test bên dưới sẽ dùng thuật toán và endpoint tương ứng.</p>
          </div>
        </div>
        <AlgoPicker algo={algo} onChange={setAlgo} />
        <div className="algo-info">
          <span>Endpoint hiện tại:</span>
          <code>{jwtPath}</code>
        </div>
      </section>

      {/* Token fetch */}
      <TokenFetchPanel
        algo={algo}
        onFetchAdmin={() => getToken('admin')}
        onFetchUser={() => getToken('user')}
        status={status}
        adminReady={!!adminToken}
        userReady={!!userToken}
      />

      {/* Positive tests */}
      <section className="section-panel">
        <div className="section-heading">
          <CheckCircle2 className="section-heading__icon section-heading__icon--success" />
          <div>
            <h3>Positive JWT verification ({algo.toUpperCase()})</h3>
            <p>Dùng token hợp lệ của thuật toán đang chọn để chứng minh Gateway cho qua.</p>
          </div>
        </div>
        <div className="two-column">
          <ActionCard
            success
            title={`${algo.toUpperCase()} Admin Hợp Lệ`}
            description={`Gửi token admin ${algo.toUpperCase()} vào ${jwtPath}. Kong verify và cho qua nếu hợp lệ.`}
            icon={CheckCircle2}
            buttonLabel={`Test ${jwtPath}`}
            onRun={() =>
              runAttack({
                scenario: `jwt-${algo}-admin-valid`,
                path: jwtPath,
                headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
                successMessage: `Kong accepted ${algo.toUpperCase()} admin token.`,
                blockedMessage: `Kong blocked ${algo.toUpperCase()} request. Get token first.`,
              })
            }
          />
          <ActionCard
            success
            title={`${algo.toUpperCase()} User Hợp Lệ`}
            description={`Gửi token user ${algo.toUpperCase()} vào ${jwtPath}. Kong verify và cho qua nếu hợp lệ.`}
            icon={CheckCircle2}
            buttonLabel={`Test ${jwtPath} (user)`}
            onRun={() =>
              runAttack({
                scenario: `jwt-${algo}-user-valid`,
                path: jwtPath,
                headers: userToken ? { Authorization: `Bearer ${userToken}` } : {},
                successMessage: `Kong accepted ${algo.toUpperCase()} user token.`,
                blockedMessage: `Kong blocked ${algo.toUpperCase()} request. Get token first.`,
              })
            }
          />
        </div>
      </section>

      {/* Token Inspector — shows original vs tampered token side by side */}
      <TokenInspectorPanel originalToken={adminToken} tamperedToken={tamperedToken} algo={algo} />

      {/* Negative / attack tests */}
      <section className="section-panel">
        <div className="section-heading">
          <ShieldAlert className="section-heading__icon section-heading__icon--danger" />
          <div>
            <h3>Negative JWT attacks — token giả mạo</h3>
            <p>Gửi token giả / sai signature vào endpoint đang chọn để chứng minh Kong chặn 401.</p>
          </div>
        </div>
        <div className="three-column">
          <ActionCard
            danger
            title="Fake Signature (Token Hoàn Toàn Giả)"
            description={`Gửi "fake.invalid.token" — chuỗi không có cấu trúc JWT hợp lệ vào ${jwtPath}. Kong chặn 401.`}
            icon={ShieldAlert}
            buttonLabel={`Attack — Full Fake Token`}
            onRun={() =>
              runAttack({
                scenario: `jwt-${algo}-invalid-signature`,
                path: jwtPath,
                headers: { Authorization: `Bearer ${TAMPERED_TOKEN}` },
                blockedMessage: `Kong blocked completely fake JWT (fake.invalid.token) on ${algo.toUpperCase()} endpoint.`,
              })
            }
          />
          <ActionCard
            danger
            title="Tampered Signature (Sửa Signature Thật)"
            description={adminToken
              ? `Giữ nguyên header+payload của token admin ${algo.toUpperCase()}, chỉ thay signature bằng chuỗi giả. Kong verify thất bại.`
              : `Lấy admin token trước để dùng kịch bản này. Sẽ giữ header+payload thật, thay signature.`
            }
            icon={ShieldAlert}
            buttonLabel={adminToken ? 'Attack — Tampered Sig' : 'Cần token trước'}
            onRun={() =>
              runAttack({
                scenario: `jwt-${algo}-tampered-signature`,
                path: jwtPath,
                headers: { Authorization: `Bearer ${tamperedToken}` },
                blockedMessage: `Kong blocked ${algo.toUpperCase()} token with tampered signature. Header+Payload valid but Signature wrong.`,
              })
            }
          />
          <ActionCard
            danger
            title="Sai Thuật Toán"
            description={`Gửi token ${algo.toUpperCase()} vào endpoint thuật toán khác để test algorithm mismatch.`}
            icon={ShieldAlert}
            buttonLabel="Algorithm Mismatch"
            onRun={() => {
              const wrongPath =
                algo === 'rs256' ? '/api/v1/jwt-hs256' : algo === 'hs256' ? '/api/v1/jwt-es256' : '/api/v1/jwt-rs256';
              return runAttack({
                scenario: `jwt-${algo}-algorithm-mismatch`,
                path: wrongPath,
                headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : { Authorization: `Bearer ${TAMPERED_TOKEN}` },
                blockedMessage: `Kong blocked ${algo.toUpperCase()} token sent to wrong algorithm endpoint.`,
              });
            }}
          />
        </div>
      </section>

      {/* Audit */}
      <section className="section-panel">
        <div className="section-heading">
          <Activity className="section-heading__icon" />
          <div>
            <h3>Audit evidence</h3>
            <p>Đọc audit logs bằng token admin để chứng minh request hợp lệ đã vào Backend.</p>
          </div>
        </div>
        <ActionCard
          title="Audit Evidence"
          description={`Đọc audit logs bằng ${algo.toUpperCase()} admin token.`}
          icon={Activity}
          buttonLabel="Đọc Audit Logs"
          onRun={() =>
            runAttack({
              scenario: 'audit-evidence-read',
              path: `/api/v1/aaa-audit-logs-${algo}`,
              headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
              successMessage: 'Audit endpoint returned evidence logs.',
              blockedMessage: 'Audit evidence endpoint was blocked.',
            })
          }
        />
      </section>
    </div>
  );
}

// ─── ACL Student Page ────────────────────────────────────────────────────────
function AclStudentPage({
  algo, setAlgo,
  adminTokens, userTokens,
  setAdminToken, setUserToken,
}: GlobalTokenState) {
  const [status, setStatus] = useState('');
  const adminToken   = adminTokens[algo] ?? '';
  const userToken    = userTokens[algo]  ?? '';
  const studentsPath = `/api/v1/students-${algo}`;

  const getToken = async (role: 'admin' | 'user') => {
    setStatus(`Đang lấy ${role} token (${algo.toUpperCase()}) thông qua API Gateway...`);
    try {
      const token = await fetchDemoToken(role, algo);
      role === 'admin' ? setAdminToken(algo, token) : setUserToken(algo, token);
      setStatus(`✓ Đã lấy ${role} token (${algo.toUpperCase()}) thành công.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : `Không lấy được ${role} token.`);
    }
  };

  return (
    <div className="page-stack">
      <PageTitle
        icon={Database}
        title="ACL/RBAC Student Table Demo"
        subtitle="Kiểm thử cùng một API thêm sinh viên: user bị Gateway chặn, admin được Backend thêm vào bảng."
      />

      {/* Algo selector */}
      <section className="section-panel">
        <div className="section-heading">
          <ShieldCheck className="section-heading__icon" />
          <div>
            <h3>Chọn thuật toán JWT</h3>
            <p>ACL demo sẽ dùng endpoint <code>{studentsPath}</code> tương ứng.</p>
          </div>
        </div>
        <AlgoPicker algo={algo} onChange={setAlgo} />
        <div className="algo-info">
          <span>Student endpoint:</span>
          <code>{studentsPath}</code>
        </div>
      </section>

      {/* Token fetch */}
      <TokenFetchPanel
        algo={algo}
        onFetchAdmin={() => getToken('admin')}
        onFetchUser={() => getToken('user')}
        status={status}
        adminReady={!!adminToken}
        userReady={!!userToken}
      />

      {/* ACL demo */}
      <section className="section-panel">
        <div className="section-heading">
          <Database className="section-heading__icon" />
          <div>
            <h3>Kiểm thử thêm dữ liệu vào bảng sinh viên</h3>
            <p>POST trước, sau đó GET lại bảng và redirect sang Server UI để hiển thị Student Table Evidence.</p>
          </div>
        </div>
        <div className="two-column">
          <ActionCard
            danger
            title={`User Thử Thêm Data (${algo.toUpperCase()})`}
            description={`Dùng user token POST ${studentsPath}. Kong ACL phải trả 403. Server UI hiển thị bảng nhưng không có dòng vừa thử thêm.`}
            icon={Lock}
            buttonLabel="User Thêm Sinh Viên"
            onRun={() =>
              runStudentAclDemo({
                token: userToken,
                role: 'user',
                student: buildStudent('user'),
                algo,
              })
            }
          />
          <ActionCard
            success
            title={`Admin Thêm Data (${algo.toUpperCase()})`}
            description={`Dùng admin token POST ${studentsPath}. Backend thêm data thành công. Server UI hiển thị bảng có dòng mới.`}
            icon={CheckCircle2}
            buttonLabel="Admin Thêm Sinh Viên"
            onRun={() =>
              runStudentAclDemo({
                token: adminToken,
                role: 'admin',
                student: buildStudent('admin'),
                algo,
              })
            }
          />
        </div>
      </section>
    </div>
  );
}

// ─── HMAC Page ───────────────────────────────────────────────────────────────
function toBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

async function signHmacSha256(secret: string, signingString: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signingString));
  return toBase64(signature);
}

function buildHmacSigningString(date: string, requestId: string) {
  // Thứ tự PHẢI khớp với enforce_headers trong kong.yml: request-line → x-date → x-request-id
  // Kong tạo canonical string theo đúng thứ tự trong Authorization header field 'headers'
  return [
    'GET /api/v1/hmac-demo HTTP/1.1',
    `x-date: ${date}`,
    `x-request-id: ${requestId}`,
  ].join('\n');
}

function HmacPage({ hmacSecret, setHmacSecret }: HmacState) {
  const [dateHeader, setDateHeader] = useState<string>(() => new Date().toUTCString());
  const [requestId, setRequestId] = useState<string>(() => crypto.randomUUID());
  const [lastSignature, setLastSignature] = useState('');
  const signingString = buildHmacSigningString(dateHeader, requestId);

  const refreshHmacValues = () => {
    setDateHeader(new Date().toUTCString());
    setRequestId(crypto.randomUUID());
    setLastSignature('');
  };

  const sendSignedRequest = async () => {
    const signature = await signHmacSha256(hmacSecret, signingString);
    setLastSignature(signature);

    return runAttack({
      scenario: 'hmac-signed-request',
      path: '/api/v1/hmac-demo',
      headers: {
        'X-Date': dateHeader,
        'X-Request-ID': requestId,
        // Thứ tự trong headers field phải khớp thứ tự canonical string: request-line → x-date → x-request-id
        Authorization: `hmac username="m2m-client", algorithm="hmac-sha256", headers="request-line x-date x-request-id", signature="${signature}"`,
      },
      successMessage: 'Gateway accepted HMAC signed request.',
      blockedMessage: 'Gateway blocked HMAC request. Check canonical string, secret, timestamp and X-Request-ID.',
    });
  };

  return (
    <div className="page-stack">
      <PageTitle
        icon={Server}
        title="HMAC Request Signing & Integrity"
        subtitle="Kiểm thử cách tạo chữ ký HMAC từ request-line, X-Date và X-Request-ID."
      />

      <section className="section-panel">
        <div className="section-heading">
          <Fingerprint className="section-heading__icon" />
          <div>
            <h3>1. Cách tạo chữ ký HMAC</h3>
            <p>Client tạo canonical string, ký bằng secret của machine client, rồi gửi signature trong Authorization header.</p>
          </div>
        </div>
        <div className="hmac-layout">
          <div className="input-panel">
            <label>
              <span>Shared secret</span>
              <input value={hmacSecret} onChange={(event) => setHmacSecret(event.target.value)} />
            </label>
            <label>
              <span>X-Date header</span>
              <input value={dateHeader} onChange={(event) => setDateHeader(event.target.value)} />
            </label>
            <label>
              <span>X-Request-ID</span>
              <input value={requestId} onChange={(event) => setRequestId(event.target.value)} />
            </label>
            <button className="button" onClick={refreshHmacValues}>
              <RotateCcw className="button__icon" />
              Tạo Date và Request-ID mới
            </button>
          </div>
          <div className="code-panel">
            <span>Canonical string được ký</span>
            <pre>{signingString}</pre>
            <span>Authorization header sau khi ký</span>
            <pre>
              {lastSignature
                ? `hmac username="m2m-client", algorithm="hmac-sha256", headers="request-line x-date x-request-id", signature="${lastSignature}"`
                : 'Bấm "Gửi HMAC Request" để sinh signature.'}
            </pre>
          </div>
        </div>
      </section>

      <div className="two-column">
        <ActionCard
          title="Request Kèm Chữ Ký"
          description="Tạo signature HMAC-SHA256 bằng WebCrypto rồi gửi request thật đến Gateway."
          icon={Zap}
          buttonLabel="Gửi HMAC Request"
          onRun={sendSignedRequest}
        />

        <ActionCard
          danger
          title="Replay Request"
          description="Gửi lại đúng Date, X-Request-ID và signature vừa sinh. Replay cache phải chặn request lần sau."
          icon={RotateCcw}
          buttonLabel="Replay Request"
          onRun={async () => {
            const signature = lastSignature || await signHmacSha256(hmacSecret, signingString);
            setLastSignature(signature);

            return runReplayAttack({
              scenario: 'hmac-replay-request',
              path: '/api/v1/hmac-demo',
              headers: {
                'X-Date': dateHeader,
                'X-Request-ID': requestId,
                Authorization: `hmac username="m2m-client", algorithm="hmac-sha256", headers="request-line x-date x-request-id", signature="${signature}"`,
              },
              blockedMessage: 'Kong blocked replayed or invalid HMAC request.',
              successMessage: 'Replay request was accepted, so replay protection needs attention.',
            }, requestId);
          }}
        />

        <ActionCard
          danger
          title="Timestamp Quá Hạn"
          description="Gửi Date header cũ hơn 10 phút để test clock skew."
          icon={AlertTriangle}
          buttonLabel="Gửi Timestamp Quá Hạn"
          onRun={async () => {
            const expiredDate = new Date(Date.now() - 10 * 60 * 1000).toUTCString();
            const expiredString = buildHmacSigningString(expiredDate, requestId);
            const signature = await signHmacSha256(hmacSecret, expiredString);

            return runAttack({
              scenario: 'hmac-expired-timestamp',
              path: '/api/v1/hmac-demo',
              headers: {
                'X-Date': expiredDate,
                'X-Request-ID': requestId,
                Authorization: `hmac username="m2m-client", algorithm="hmac-sha256", headers="request-line x-date x-request-id", signature="${signature}"`,
              },
              blockedMessage: 'Kong blocked expired HMAC timestamp.',
            });
          }}
        />
      </div>
    </div>
  );
}

// ─── mTLS Page ───────────────────────────────────────────────────────────────
function MtlsPage({ algo, setAlgo, adminTokens, userTokens, setAdminToken, setUserToken }: GlobalTokenState) {
  const [status, setStatus] = useState('');
  const adminToken = adminTokens[algo] ?? '';

  const getToken = async () => {
    setStatus(`Đang lấy admin token (${algo.toUpperCase()})...`);
    try {
      const token = await fetchDemoToken('admin', algo);
      setAdminToken(algo, token);
      setStatus(`✓ Đã lấy admin token (${algo.toUpperCase()}) thành công.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Không lấy được token.');
    }
  };

  return (
    <div className="page-stack">
      <PageTitle
        icon={Lock}
        title="Zero-Trust Architecture (mTLS)"
        subtitle="Kiểm thử luồng qua Gateway và kịch bản bypass Backend trực tiếp."
      />

      {/* Algo selector */}
      <section className="section-panel">
        <div className="section-heading">
          <ShieldCheck className="section-heading__icon" />
          <div>
            <h3>Chọn thuật toán JWT cho token</h3>
            <p>Token hợp lệ cần để vượt qua JWT plugin trước khi mTLS hoạt động.</p>
          </div>
        </div>
        <AlgoPicker algo={algo} onChange={setAlgo} />
      </section>

      <section className="section-panel">
        <div className="section-heading">
          <KeyRound className="section-heading__icon" />
          <div>
            <h3>Điều kiện để thấy mTLS hợp lệ</h3>
            <p>Luồng hợp lệ cần admin token. Nếu thiếu token, Kong chặn 401 trước khi request tới Backend.</p>
          </div>
        </div>
        <div className="two-column">
          <button className="button button--success" onClick={getToken}>
            <KeyRound className="button__icon" />
            Lấy Admin Token ({algo.toUpperCase()})
          </button>
          <div className="token-status">
            <span>Admin token ({algo.toUpperCase()})</span>
            <strong>{adminToken.trim() ? '✓ Đã có token, có thể test mTLS qua Gateway' : 'Chưa có token, hãy lấy trước'}</strong>
          </div>
        </div>
        {status && <p className="token-message">{status}</p>}
      </section>

      <div className="two-column">
        <ActionCard
          success
          title="Luồng Hợp Lệ Qua Gateway"
          description={`Client gửi request qua Gateway. Kong xác thực JWT (${algo.toUpperCase()}) và trình certificate mTLS cho Backend.`}
          icon={Network}
          buttonLabel="Gọi Qua Gateway"
          onRun={() =>
            runAttack({
              scenario: 'mtls-valid-gateway-flow',
              path: '/api/v1/secure-demo',
              headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
              successMessage: 'Backend accepted mTLS certificate from Kong Gateway.',
              blockedMessage: `Gateway blocked request before mTLS backend flow. Get a valid ${algo.toUpperCase()} admin token first.`,
            })
          }
        />

        <ActionCard
          danger
          title="Bypass Gateway"
          description="Thử mô phỏng gọi vào Backend direct. Kỳ vọng request fail do không có client certificate."
          icon={ShieldAlert}
          buttonLabel="Direct Call Backend"
          onRun={() =>
            runAttack({
              scenario: 'backend-direct-bypass',
              path: '/api/v1/secure-demo',
              blockedLayer: 'Network/mTLS',
              blockedMessage: 'Direct backend access should fail because Backend requires mTLS from Kong.',
            })
          }
        />
      </div>
    </div>
  );
}

// ─── Rate Limit Page ─────────────────────────────────────────────────────────
function RateLimitPage({
  algo, setAlgo,
  adminTokens,
  setAdminToken,
  burstCount,
  setBurstCount,
}: GlobalTokenState & { burstCount: number; setBurstCount: (n: number) => void }) {
  const [status, setStatus] = useState('');
  const [burstProgress, setBurstProgress] = useState({
    completed: 0,
    total: burstCount,
    allowed: 0,
    rateLimited: 0,
    rejected: 0,
    failed: 0,
  });
  const adminToken = adminTokens[algo] ?? '';
  const burstPath  = `/api/v1/jwt-${algo}`;
  const percent    = burstProgress.total > 0 ? Math.round((burstProgress.completed / burstProgress.total) * 100) : 0;

  const getToken = async () => {
    setStatus(`Đang lấy admin token (${algo.toUpperCase()})...`);
    try {
      const token = await fetchDemoToken('admin', algo);
      setAdminToken(algo, token);
      setStatus(`✓ Đã lấy admin token (${algo.toUpperCase()}) thành công.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Không lấy được token.');
    }
  };

  return (
    <div className="page-stack">
      <PageTitle
        icon={Target}
        title="Rate Limiting & DDoS Protection"
        subtitle="Mô phỏng rapid fire vào API Gateway để tạo bằng chứng 429 Too Many Requests."
      />

      {/* Algo selector */}
      <section className="section-panel">
        <div className="section-heading">
          <ShieldCheck className="section-heading__icon" />
          <div>
            <h3>Chọn thuật toán JWT</h3>
            <p>Burst attack sẽ bắn vào endpoint <code>{burstPath}</code> tương ứng.</p>
          </div>
        </div>
        <AlgoPicker algo={algo} onChange={setAlgo} />
        <div className="algo-info">
          <span>Burst target:</span>
          <code>{burstPath}</code>
        </div>
      </section>

      <section className="section-panel">
        <div className="section-heading">
          <KeyRound className="section-heading__icon section-heading__icon--success" />
          <div>
            <h3>Lấy token để vượt JWT (bắt buộc)</h3>
            <p>Cần token hợp lệ để request vượt qua JWT plugin — 429 mới có ý nghĩa thống kê.</p>
          </div>
        </div>
        <div className="two-column">
          <button className="button button--success" onClick={getToken}>
            <KeyRound className="button__icon" />
            Lấy Admin Token ({algo.toUpperCase()})
          </button>
          <div className="token-status">
            <span>Admin token ({algo.toUpperCase()})</span>
            <strong>{adminToken.trim() ? '✓ Sẵn sàng bắn burst' : 'Chưa có token — burst sẽ bị 401'}</strong>
          </div>
        </div>
        {status && <p className="token-message">{status}</p>}
      </section>

      <section className="input-panel input-panel--compact">
        <label>
          <span>Số request bắn đồng loạt</span>
          <input
            type="number"
            min="1"
            max="500"
            value={burstCount}
            onChange={(event) => setBurstCount(Number(event.target.value))}
          />
        </label>
      </section>

      <ActionCard
        danger
        title={`Tấn Công DDoS — ${algo.toUpperCase()}`}
        description={`Bắn đồng loạt ${burstCount} request vào ${burstPath}. Cần token hợp lệ để qua JWT, sau đó rate-limit (429) mới được kích hoạt.`}
        icon={Flame}
        buttonLabel="Khai Hỏa Rapid Fire"
        onRun={() =>
          runBurstAttack(
            adminToken,
            burstCount,
            burstPath,
            `rate-limit-burst-${algo}`,
            (p) => setBurstProgress({ ...p, total: burstCount }),
          )
        }
      />

      <section className="section-panel">
        <div className="section-heading">
          <Activity className="section-heading__icon" />
          <div>
            <h3>Tiến trình bắn request</h3>
            <p>Frontend chỉ redirect sang Server UI sau khi đã gửi xong toàn bộ batch.</p>
          </div>
        </div>
        <div className="progress-track">
          <div style={{ width: `${percent}%` }} />
        </div>
        <div className="metric-grid">
          <div><span>Sent</span><strong>{burstProgress.completed}/{burstProgress.total}</strong></div>
          <div><span>Allowed</span><strong>{burstProgress.allowed}</strong></div>
          <div><span>429</span><strong>{burstProgress.rateLimited}</strong></div>
          <div><span>401/403</span><strong>{burstProgress.rejected}</strong></div>
          <div><span>Failed</span><strong>{burstProgress.failed}</strong></div>
        </div>
      </section>
    </div>
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────
type TokenMap = Record<TokenAlgorithm, string>;

type GlobalTokenState = {
  algo: TokenAlgorithm;
  setAlgo: (a: TokenAlgorithm) => void;
  adminTokens: TokenMap;
  userTokens: TokenMap;
  setAdminToken: (algo: TokenAlgorithm, token: string) => void;
  setUserToken: (algo: TokenAlgorithm, token: string) => void;
};

type HmacState = {
  hmacSecret: string;
  setHmacSecret: (secret: string) => void;
};

const EMPTY_TOKEN_MAP: TokenMap = { rs256: '', hs256: '', es256: '' };

// ─── App root ────────────────────────────────────────────────────────────────
export function App() {
  const [activePage, setActivePage] = useState<PageKey>('dashboard');
  const [algo, setAlgo] = useState<TokenAlgorithm>('rs256');
  const [adminTokens, setAdminTokensState] = useState<TokenMap>({ ...EMPTY_TOKEN_MAP });
  const [userTokens, setUserTokensState] = useState<TokenMap>({ ...EMPTY_TOKEN_MAP });
  const [hmacSecret, setHmacSecret] = useState('v4u1t-s3cr3t');
  const [burstCount, setBurstCount] = useState(150);

  const setAdminToken = (a: TokenAlgorithm, token: string) =>
    setAdminTokensState((prev) => ({ ...prev, [a]: token }));
  const setUserToken = (a: TokenAlgorithm, token: string) =>
    setUserTokensState((prev) => ({ ...prev, [a]: token }));

  const globalState: GlobalTokenState = { algo, setAlgo, adminTokens, userTokens, setAdminToken, setUserToken };

  // Active algo badge colors
  const activeColor = ALGO_OPTIONS.find((o) => o.value === algo)?.color ?? '#6366f1';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <ShieldAlert className="sidebar__brand-icon" />
          <span>ATTACK LAB</span>
        </div>

        {/* Global algo indicator in sidebar */}
        <div className="sidebar-algo-badge" style={{ '--algo-color': activeColor } as React.CSSProperties}>
          <span>Algorithm</span>
          <strong>{algo.toUpperCase()}</strong>
        </div>

        <nav className="nav">
          {navItems.map((item) => (
            <button
              key={item.key}
              className={activePage === item.key ? 'nav__item nav__item--active' : 'nav__item'}
              onClick={() => setActivePage(item.key)}
            >
              <item.icon className="nav__icon" />
              {item.name}
            </button>
          ))}
        </nav>

        {/* Token status summary in sidebar */}
        <div className="sidebar-token-summary">
          <p className="sidebar-token-summary__title">Token Cache</p>
          {ALGO_OPTIONS.map((opt) => (
            <div key={opt.value} className="sidebar-token-row">
              <span style={{ color: opt.color }}>{opt.label}</span>
              <span>{adminTokens[opt.value] ? '✓ A' : '–'} {userTokens[opt.value] ? '✓ U' : '–'}</span>
            </div>
          ))}
        </div>
      </aside>

      <div className="content-shell">
        <header className="topbar">
          <span>Đồ án môn học // Controlled Attack Frontend</span>
          <div className="topbar__status">
            <span className="status-dot" />
            TARGET CONFIGURED
            <Bell className="topbar__bell" />
          </div>
        </header>

        <main className="content">
          {activePage === 'dashboard' && <Dashboard onNavigate={setActivePage} />}
          {activePage === 'jwt' && <JwtPage {...globalState} />}
          {activePage === 'acl' && <AclStudentPage {...globalState} />}
          {activePage === 'hmac' && <HmacPage hmacSecret={hmacSecret} setHmacSecret={setHmacSecret} />}
          {activePage === 'mtls' && <MtlsPage {...globalState} />}
          {activePage === 'ratelimit' && (
            <RateLimitPage {...globalState} burstCount={burstCount} setBurstCount={setBurstCount} />
          )}
        </main>
      </div>
    </div>
  );
}
