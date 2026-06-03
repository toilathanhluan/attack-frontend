import { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
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

function Dashboard({ onNavigate }: { onNavigate: (page: PageKey) => void }) {
  return (
    <div className="page-stack">
      <PageTitle
        icon={ShieldAlert}
        title="Attack Test Console"
        subtitle="Giao dien client tan cong co kiem soat, giu format nhu dashboard kiem thu ban dau."
      />

      <section className="hero-panel">
        <div>
          <p className="eyebrow">Controlled client attack</p>
          <h3>Attack Frontend {'->'} API Gateway {'->'} Server UI Evidence</h3>
          <p>
          Moi nut test se gui request that vao API Gateway, gan X-Attack-Id/X-Request-ID, nhan status tu server,
            roi redirect sang Server UI de hien thi message box.
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

function JwtPage({ rsToken, hsToken, esToken, userToken, setRsToken, setHsToken, setEsToken, setUserToken }: TokenState) {
  const [tokenStatus, setTokenStatus] = useState('');
  const getToken = async (role: 'admin' | 'user') => {
    setTokenStatus(`Dang lay ${role} token tu Keycloak...`);

    try {
      const token = await fetchDemoToken(role);

      if (role === 'admin') {
        setRsToken(token);
      } else {
        setUserToken(token);
      }

      setTokenStatus(`Da lay ${role} token thanh cong thong qua API Gateway.`);
    } catch (error) {
      setTokenStatus(error instanceof Error ? error.message : `Khong lay duoc ${role} token.`);
    }
  };

  return (
    <div className="page-stack">
      <PageTitle
        icon={Shield}
        title="JWT Verification & Access Control"
        subtitle="Kiem thu rieng RS256, HS256, ES256, token gia mao va role sai quyen qua Kong API Gateway."
      />

      <section className="section-panel">
        <div className="section-heading">
          <KeyRound className="section-heading__icon" />
          <div>
            <h3>1. Token setup</h3>
            <p>Dan token tu Keycloak vao dung o tuong ung. Co the bo trong cac o chua demo.</p>
          </div>
        </div>
        <div className="token-grid">
          <label>
            <span>RS256 access token</span>
            <textarea
              value={rsToken}
              onChange={(event) => setRsToken(event.target.value)}
              placeholder="Paste token RS256/admin de test /jwt-rs256 va secure-demo"
            />
          </label>
          <label>
            <span>HS256 access token</span>
            <textarea
              value={hsToken}
              onChange={(event) => setHsToken(event.target.value)}
              placeholder="Paste token HS256 de test /jwt-hs256"
            />
          </label>
          <label>
            <span>ES256 access token</span>
            <textarea
              value={esToken}
              onChange={(event) => setEsToken(event.target.value)}
              placeholder="Paste token ES256 de test /jwt-es256"
            />
          </label>
          <label>
            <span>User access token</span>
            <textarea
              value={userToken}
              onChange={(event) => setUserToken(event.target.value)}
              placeholder="Paste token role user de test ACL 403"
            />
          </label>
        </div>
      </section>

      <section className="section-panel">
        <div className="section-heading">
          <KeyRound className="section-heading__icon section-heading__icon--success" />
          <div>
            <h3>Lay token demo phan quyen</h3>
            <p>Hai nut nay goi qua API Gateway de server lay token Keycloak dung cho demo user bi chan va admin them duoc data.</p>
          </div>
        </div>
        <div className="two-column">
          <button className="button button--success" onClick={() => getToken('admin')}>
            <KeyRound className="button__icon" />
            Lay Admin Token
          </button>
          <button className="button" onClick={() => getToken('user')}>
            <KeyRound className="button__icon" />
            Lay User Token
          </button>
        </div>
        {tokenStatus && <p className="token-message">{tokenStatus}</p>}
      </section>

      <section className="section-panel">
        <div className="section-heading">
          <CheckCircle2 className="section-heading__icon section-heading__icon--success" />
          <div>
            <h3>2. Positive JWT verification</h3>
            <p>Moi nut dung token hop le cua thuat toan tuong ung de chung minh Gateway cho qua.</p>
          </div>
        </div>
        <div className="three-column">
          <ActionCard
            success
            title="RS256 Hop Le"
            description="Gui token RS256 vao /jwt-rs256. Kong verify RSA/JWKS va cho qua neu hop le."
            icon={CheckCircle2}
            buttonLabel="Test /jwt-rs256"
            onRun={() =>
              runAttack({
                scenario: 'jwt-rs256-valid',
                path: '/api/v1/jwt-rs256',
                headers: rsToken ? { Authorization: `Bearer ${rsToken}` } : {},
                successMessage: 'Kong accepted RS256 token and forwarded request.',
                blockedMessage: 'Kong blocked RS256 verification request.',
              })
            }
          />
          <ActionCard
            success
            title="HS256 Hop Le"
            description="Gui token HS256 vao /jwt-hs256. Kong verify HMAC shared secret cua client."
            icon={CheckCircle2}
            buttonLabel="Test /jwt-hs256"
            onRun={() =>
              runAttack({
                scenario: 'jwt-hs256-valid',
                path: '/api/v1/jwt-hs256',
                headers: hsToken ? { Authorization: `Bearer ${hsToken}` } : {},
                successMessage: 'Kong accepted HS256 token and forwarded request.',
                blockedMessage: 'Kong blocked HS256 verification request.',
              })
            }
          />
          <ActionCard
            success
            title="ES256 Hop Le"
            description="Gui token ES256 vao /jwt-es256. Kong verify ECDSA public key tu JWKS."
            icon={CheckCircle2}
            buttonLabel="Test /jwt-es256"
            onRun={() =>
              runAttack({
                scenario: 'jwt-es256-valid',
                path: '/api/v1/jwt-es256',
                headers: esToken ? { Authorization: `Bearer ${esToken}` } : {},
                successMessage: 'Kong accepted ES256 token and forwarded request.',
                blockedMessage: 'Kong blocked ES256 verification request.',
              })
            }
          />
        </div>
      </section>

      <section className="section-panel">
        <div className="section-heading">
          <ShieldAlert className="section-heading__icon section-heading__icon--danger" />
          <div>
            <h3>3. Negative JWT attacks</h3>
            <p>Khong can token that. Gui token gia vao tung endpoint de chung minh Kong chan 401.</p>
          </div>
        </div>
        <div className="three-column">
          <ActionCard
            danger
            title="Fake RS256"
            description="Gui Bearer fake.invalid.token vao /jwt-rs256. Kong phai chan signature sai."
            icon={ShieldAlert}
            buttonLabel="Attack /jwt-rs256"
            onRun={() =>
              runAttack({
                scenario: 'jwt-rs256-invalid-signature',
                path: '/api/v1/jwt-rs256',
                headers: { Authorization: 'Bearer fake.invalid.token' },
                blockedMessage: 'Kong blocked invalid RS256 JWT signature.',
              })
            }
          />
          <ActionCard
            danger
            title="Fake HS256"
            description="Gui token gia vao /jwt-hs256 de test shared-secret verification."
            icon={ShieldAlert}
            buttonLabel="Attack /jwt-hs256"
            onRun={() =>
              runAttack({
                scenario: 'jwt-hs256-invalid-signature',
                path: '/api/v1/jwt-hs256',
                headers: { Authorization: 'Bearer fake.invalid.token' },
                blockedMessage: 'Kong blocked invalid HS256 JWT signature.',
              })
            }
          />
          <ActionCard
            danger
            title="Fake ES256"
            description="Gui token gia vao /jwt-es256 de test ECDSA verification."
            icon={ShieldAlert}
            buttonLabel="Attack /jwt-es256"
            onRun={() =>
              runAttack({
                scenario: 'jwt-es256-invalid-signature',
                path: '/api/v1/jwt-es256',
                headers: { Authorization: 'Bearer fake.invalid.token' },
                blockedMessage: 'Kong blocked invalid ES256 JWT signature.',
              })
            }
          />
        </div>
      </section>

      <section className="section-panel">
        <div className="section-heading">
          <Lock className="section-heading__icon" />
          <div>
            <h3>4. Access control and evidence</h3>
            <p>Kiem thu thieu token, sai role va doc audit bang chung.</p>
          </div>
        </div>
        <div className="three-column">
          <ActionCard
            danger
            title="Thieu Token"
            description="Client goi API khong co Authorization header. Gateway phai chan bang 401."
            icon={KeyRound}
            buttonLabel="Khong Token"
            onRun={() =>
              runAttack({
                scenario: 'missing-access-token',
                path: '/api/v1/secure-demo',
                blockedMessage: 'Kong blocked request because Authorization header is missing.',
              })
            }
          />
          <ActionCard
            danger
            title="User Them Data"
            description="Dung user token de POST /students-rs256. Gateway ACL phai chan 403, sau do van hien bang nhung khong co dong vua them."
            icon={Lock}
            buttonLabel="User Thu Them"
            onRun={() =>
              runStudentAclDemo({
                token: userToken,
                role: 'user',
                student: buildStudent('user'),
              })
            }
          />
          <ActionCard
            success
            title="Admin Them Data"
            description="Dung admin token de POST /students-rs256. Backend them dong moi va Server UI hien bang sau khi cap nhat."
            icon={CheckCircle2}
            buttonLabel="Admin Them"
            onRun={() =>
              runStudentAclDemo({
                token: rsToken,
                role: 'admin',
                student: buildStudent('admin'),
              })
            }
          />
        </div>
      </section>

      <section className="section-panel">
        <div className="section-heading">
          <Activity className="section-heading__icon" />
          <div>
            <h3>5. Audit evidence</h3>
            <p>Doc audit bang chung bang RS256/admin token de chung minh request hop le da vao Backend.</p>
          </div>
        </div>
        <ActionCard
          title="Audit Evidence"
          description="Doc audit logs bang RS256/admin token."
          icon={Activity}
          buttonLabel="Doc Audit Logs"
          onRun={() =>
            runAttack({
              scenario: 'audit-evidence-read',
              path: '/api/v1/aaa-audit-logs-rs256',
              headers: rsToken ? { Authorization: `Bearer ${rsToken}` } : {},
              successMessage: 'Audit endpoint returned evidence logs.',
              blockedMessage: 'Audit evidence endpoint was blocked.',
            })
          }
        />
      </section>
    </div>
  );
}

function AclStudentPage({ rsToken, userToken, setRsToken, setUserToken }: AclState) {
  const [tokenStatus, setTokenStatus] = useState('');

  const getToken = async (role: 'admin' | 'user') => {
    setTokenStatus(`Dang lay ${role} token thong qua API Gateway...`);

    try {
      const token = await fetchDemoToken(role);

      if (role === 'admin') {
        setRsToken(token);
      } else {
        setUserToken(token);
      }

      setTokenStatus(`Da lay ${role} token thanh cong. Co the bam nut them du lieu de xem bang evidence.`);
    } catch (error) {
      setTokenStatus(error instanceof Error ? error.message : `Khong lay duoc ${role} token.`);
    }
  };

  return (
    <div className="page-stack">
      <PageTitle
        icon={Database}
        title="ACL/RBAC Student Table Demo"
        subtitle="Kiem thu cung mot API them sinh vien: user bi Gateway chan, admin duoc Backend them vao bang."
      />

      <section className="section-panel">
        <div className="section-heading">
          <KeyRound className="section-heading__icon section-heading__icon--success" />
          <div>
            <h3>1. Lay token theo vai tro</h3>
            <p>Attack frontend goi API Gateway, server lay token Keycloak noi bo va tra ve token demo dung consumer ACL.</p>
          </div>
        </div>
        <div className="two-column">
          <button className="button button--success" onClick={() => getToken('admin')}>
            <KeyRound className="button__icon" />
            Lay Admin Token
          </button>
          <button className="button" onClick={() => getToken('user')}>
            <KeyRound className="button__icon" />
            Lay User Token
          </button>
        </div>
        {tokenStatus && <p className="token-message">{tokenStatus}</p>}
      </section>

      <section className="section-panel">
        <div className="section-heading">
          <Shield className="section-heading__icon" />
          <div>
            <h3>2. Trang thai token</h3>
            <p>Can lay du ca hai token de demo ro khac biet giua user va admin.</p>
          </div>
        </div>
        <div className="two-column">
          <div className="token-status">
            <span>Admin token</span>
            <strong>{rsToken.trim() ? 'Ready: co the them du lieu' : 'Chua co token admin'}</strong>
          </div>
          <div className="token-status">
            <span>User token</span>
            <strong>{userToken.trim() ? 'Ready: co the thu tan cong them du lieu' : 'Chua co token user'}</strong>
          </div>
        </div>
      </section>

      <section className="section-panel">
        <div className="section-heading">
          <Database className="section-heading__icon" />
          <div>
            <h3>3. Kiem thu them du lieu vao bang sinh vien</h3>
            <p>Moi nut se POST truoc, sau do GET lai bang va redirect sang Server UI de hien thi Student Table Evidence.</p>
          </div>
        </div>
        <div className="two-column">
          <ActionCard
            danger
            title="User Thu Them Data"
            description="Dung user token POST /students-rs256. Kong ACL phai tra 403, Server UI hien bang nhung khong co dong vua thu them."
            icon={Lock}
            buttonLabel="User Them Sinh Vien"
            onRun={() =>
              runStudentAclDemo({
                token: userToken,
                role: 'user',
                student: buildStudent('user'),
              })
            }
          />
          <ActionCard
            success
            title="Admin Them Data"
            description="Dung admin token POST /students-rs256. Backend them data thanh cong, Server UI hien bang co dong moi."
            icon={CheckCircle2}
            buttonLabel="Admin Them Sinh Vien"
            onRun={() =>
              runStudentAclDemo({
                token: rsToken,
                role: 'admin',
                student: buildStudent('admin'),
              })
            }
          />
        </div>
      </section>
    </div>
  );
}

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
  return [
    `x-date: ${date}`,
    'GET /api/v1/hmac-demo HTTP/1.1',
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
        Authorization: `hmac username="m2m-client", algorithm="hmac-sha256", headers="x-date request-line x-request-id", signature="${signature}"`,
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
        subtitle="Kiem thu cach tao chu ky HMAC tu request-line, Date va X-Request-ID."
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
                ? `hmac username="m2m-client", algorithm="hmac-sha256", headers="x-date request-line x-request-id", signature="${lastSignature}"`
                : 'Bấm "Gửi HMAC Request" để sinh signature.'}
            </pre>
          </div>
        </div>
      </section>

      <div className="two-column">
        <ActionCard
          title="Request Kem Chu Ky"
          description="Tạo signature HMAC-SHA256 bằng WebCrypto rồi gửi request thật đến Gateway."
          icon={Zap}
          buttonLabel="Gui HMAC Request"
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
                Authorization: `hmac username="m2m-client", algorithm="hmac-sha256", headers="x-date request-line x-request-id", signature="${signature}"`,
              },
              blockedMessage: 'Kong blocked replayed or invalid HMAC request.',
              successMessage: 'Replay request was accepted, so replay protection needs attention.',
            }, requestId);
          }}
        />

        <ActionCard
          danger
          title="Timestamp Qua Han"
          description="Gui Date header cu hon 10 phut de test clock skew."
          icon={AlertTriangle}
          buttonLabel="Gui Timestamp Qua Han"
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
                Authorization: `hmac username="m2m-client", algorithm="hmac-sha256", headers="x-date request-line x-request-id", signature="${signature}"`,
              },
              blockedMessage: 'Kong blocked expired HMAC timestamp.',
            });
          }}
        />
      </div>
    </div>
  );
}

function MtlsPage({ rsToken }: MtlsState) {
  return (
    <div className="page-stack">
      <PageTitle
        icon={Lock}
        title="Zero-Trust Architecture (mTLS)"
        subtitle="Kiem thu luong qua Gateway va kich ban bypass Backend truc tiep."
      />

      <section className="section-panel">
        <div className="section-heading">
          <KeyRound className="section-heading__icon" />
          <div>
            <h3>Điều kiện để thấy mTLS hợp lệ</h3>
            <p>Luồng hợp lệ cần RS256/admin token. Nếu thiếu token, Kong chặn 401 trước khi request tới Backend và bạn sẽ không thấy certificate mTLS.</p>
          </div>
        </div>
        <div className="token-status">
          <span>RS256 token</span>
          <strong>{rsToken.trim() ? 'Đã có token, có thể test mTLS qua Gateway' : 'Chưa có token, hãy dán ở trang JWT trước'}</strong>
        </div>
      </section>

      <div className="two-column">
        <ActionCard
          success
          title="Luong Hop Le Qua Gateway"
          description="Client gui request qua Gateway. Kong xac thuc JWT va trinh certificate mTLS cho Backend."
          icon={Network}
          buttonLabel="Goi Qua Gateway"
          onRun={() =>
            runAttack({
              scenario: 'mtls-valid-gateway-flow',
              path: '/api/v1/secure-demo',
              headers: rsToken ? { Authorization: `Bearer ${rsToken}` } : {},
              successMessage: 'Backend accepted mTLS certificate from Kong Gateway.',
              blockedMessage: 'Gateway blocked request before mTLS backend flow. Paste a valid RS256/admin token first.',
            })
          }
        />

        <ActionCard
          danger
          title="Bypass Gateway"
          description="Thu mo phong goi vao Backend direct. Ky vong request fail do khong co client certificate."
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

function RateLimitPage({ rsToken, burstCount, setBurstCount }: RateLimitState) {
  const [burstProgress, setBurstProgress] = useState({
    completed: 0,
    total: burstCount,
    allowed: 0,
    rateLimited: 0,
    rejected: 0,
    failed: 0,
  });
  const percent = burstProgress.total > 0 ? Math.round((burstProgress.completed / burstProgress.total) * 100) : 0;

  return (
    <div className="page-stack">
      <PageTitle
        icon={Target}
        title="Rate Limiting & DDoS Protection"
        subtitle="Mo phong rapid fire vao API Gateway de tao bang chung 429 Too Many Requests."
      />

      <section className="input-panel input-panel--compact">
        <label>
          <span>So request ban dong loat</span>
          <input
            type="number"
            min="1"
            max="500"
            value={burstCount}
            onChange={(event) => setBurstCount(Number(event.target.value))}
          />
        </label>
        <div className="token-status">
          <span>RS256 token</span>
          <strong>{rsToken.trim() ? 'Đã có token, request có thể vượt JWT để test rate-limit' : 'Chưa có token, demo sẽ bị dừng để tránh hiểu nhầm 401 là rate-limit'}</strong>
        </div>
      </section>

      <ActionCard
        danger
        title="Tan Cong DDoS Ung Dung"
        description="Ban dong loat request vao /jwt-rs256. Phai co token hop le de request di qua JWT truoc khi rate-limit co y nghia."
        icon={Flame}
        buttonLabel="Khai Hoa Rapid Fire"
        onRun={() => runBurstAttack(rsToken, burstCount, setBurstProgress)}
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

type TokenState = {
  rsToken: string;
  hsToken: string;
  esToken: string;
  userToken: string;
  setRsToken: (token: string) => void;
  setHsToken: (token: string) => void;
  setEsToken: (token: string) => void;
  setUserToken: (token: string) => void;
};

type HmacState = {
  hmacSecret: string;
  setHmacSecret: (secret: string) => void;
};

type MtlsState = {
  rsToken: string;
};

type RateLimitState = {
  rsToken: string;
  burstCount: number;
  setBurstCount: (count: number) => void;
};

type AclState = {
  rsToken: string;
  userToken: string;
  setRsToken: (token: string) => void;
  setUserToken: (token: string) => void;
};

export function App() {
  const [activePage, setActivePage] = useState<PageKey>('dashboard');
  const [rsToken, setRsToken] = useState('');
  const [hsToken, setHsToken] = useState('');
  const [esToken, setEsToken] = useState('');
  const [userToken, setUserToken] = useState('');
  const [hmacSecret, setHmacSecret] = useState('v4u1t-s3cr3t');
  const [burstCount, setBurstCount] = useState(150);

  const pageProps = { rsToken, hsToken, esToken, userToken, setRsToken, setHsToken, setEsToken, setUserToken };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <ShieldAlert className="sidebar__brand-icon" />
          <span>ATTACK LAB</span>
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
      </aside>

      <div className="content-shell">
        <header className="topbar">
          <span>Do an mon hoc // Controlled Attack Frontend</span>
          <div className="topbar__status">
            <span className="status-dot" />
            TARGET CONFIGURED
            <Bell className="topbar__bell" />
          </div>
        </header>

        <main className="content">
          {activePage === 'dashboard' && <Dashboard onNavigate={setActivePage} />}
          {activePage === 'jwt' && <JwtPage {...pageProps} />}
          {activePage === 'acl' && (
            <AclStudentPage
              rsToken={rsToken}
              userToken={userToken}
              setRsToken={setRsToken}
              setUserToken={setUserToken}
            />
          )}
          {activePage === 'hmac' && <HmacPage hmacSecret={hmacSecret} setHmacSecret={setHmacSecret} />}
          {activePage === 'mtls' && <MtlsPage rsToken={rsToken} />}
          {activePage === 'ratelimit' && (
            <RateLimitPage rsToken={rsToken} burstCount={burstCount} setBurstCount={setBurstCount} />
          )}
        </main>
      </div>
    </div>
  );
}
