import { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
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
import { API_BASE_URL, SERVER_UI_URL, runAttack, runBurstAttack } from './attackRunner';

type PageKey = 'dashboard' | 'jwt' | 'hmac' | 'mtls' | 'ratelimit';

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
  { key: 'hmac', name: 'HMAC Signing', icon: Server },
  { key: 'mtls', name: 'Zero-Trust mTLS', icon: Lock },
  { key: 'ratelimit', name: 'Rate Limiting / DDoS', icon: Target },
];

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

function JwtPage({ validToken, userToken, setValidToken, setUserToken }: TokenState) {
  return (
    <div className="page-stack">
      <PageTitle
        icon={Shield}
        title="JWT Verification & Access Control"
        subtitle="Kiem thu token hop le, token gia mao va role sai quyen qua Kong API Gateway."
      />

      <section className="input-panel">
        <label>
          <span>Admin/valid access token</span>
          <textarea
            value={validToken}
            onChange={(event) => setValidToken(event.target.value)}
            placeholder="Paste token hop le de test luong 200 OK"
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
      </section>

      <div className="two-column">
        <div className="card-group">
          <ActionCard
            success
            title="1. Request Hop Le"
            description="Gui JWT hop le vao /secure-demo. Neu qua duoc Gateway, Server UI se bao Backend accepted."
            icon={CheckCircle2}
            buttonLabel="Gui Request Hop Le"
            onRun={() =>
              runAttack({
                scenario: 'valid-secure-request',
                path: '/api/v1/secure-demo',
                headers: validToken ? { Authorization: `Bearer ${validToken}` } : {},
                successMessage: 'Kong accepted JWT and Backend accepted mTLS from Gateway.',
                blockedMessage: 'Request was blocked before reaching protected backend.',
              })
            }
          />

          <ActionCard
            danger
            title="2. Thieu Token"
            description="Client goi API khong co Authorization header. Gateway phai chan bang 401."
            icon={KeyRound}
            buttonLabel="Tan Cong Khong Token"
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
            title="3. Gia Mao JWT"
            description="Gui Bearer fake.invalid.token vao /jwt-rs256. Kong phai chan signature sai."
            icon={ShieldAlert}
            buttonLabel="Gia Mao Chu Ky JWT"
            onRun={() =>
              runAttack({
                scenario: 'jwt-invalid-signature',
                path: '/api/v1/jwt-rs256',
                headers: { Authorization: 'Bearer fake.invalid.token' },
                blockedMessage: 'Kong blocked invalid JWT signature.',
              })
            }
          />
        </div>

        <div className="card-group">
          <ActionCard
            danger
            title="4. Kiem Thu Role ACL"
            description="Dung user token de POST /students. Gateway ACL/RBAC phai tra 403."
            icon={Lock}
            buttonLabel="User Thu Them Data"
            onRun={() =>
              runAttack({
                scenario: 'user-role-create-student',
                path: '/api/v1/students',
                method: 'POST',
                headers: userToken ? { Authorization: `Bearer ${userToken}` } : {},
                body: {
                  name: 'Attacker Student',
                  student_code: 'ATK001',
                  major: 'Security Test',
                },
                blockedMessage: 'Kong ACL blocked user role from creating student data.',
              })
            }
          />

          <ActionCard
            title="5. Audit Evidence"
            description="Doc audit logs bang token hop le de chung minh request da di qua Backend."
            icon={Activity}
            buttonLabel="Doc Audit Logs"
            onRun={() =>
              runAttack({
                scenario: 'audit-evidence-read',
                path: '/api/v1/aaa-audit-logs',
                headers: validToken ? { Authorization: `Bearer ${validToken}` } : {},
                successMessage: 'Audit endpoint returned evidence logs.',
                blockedMessage: 'Audit evidence endpoint was blocked.',
              })
            }
          />
        </div>
      </div>
    </div>
  );
}

function HmacPage({ hmacSignature, setHmacSignature }: HmacState) {
  return (
    <div className="page-stack">
      <PageTitle
        icon={Server}
        title="HMAC Request Signing & Integrity"
        subtitle="Kiem thu signature mismatch, replay va timestamp/nonce cua request signing."
      />

      <section className="input-panel input-panel--compact">
        <label>
          <span>HMAC signature demo</span>
          <input value={hmacSignature} onChange={(event) => setHmacSignature(event.target.value)} />
        </label>
      </section>

      <div className="two-column">
        <ActionCard
          title="Request Kem Chu Ky"
          description="Gui HMAC demo voi Date, X-Request-ID va Authorization header de server xu ly."
          icon={Zap}
          buttonLabel="Gui HMAC Request"
          onRun={() =>
            runAttack({
              scenario: 'hmac-signed-request',
              path: '/api/v1/hmac-demo',
              headers: {
                Date: new Date().toUTCString(),
                Authorization: `hmac username="m2m-client", signature="${hmacSignature}"`,
              },
              successMessage: 'Gateway accepted HMAC signed request.',
              blockedMessage: 'Gateway blocked HMAC request.',
            })
          }
        />

        <ActionCard
          danger
          title="Replay Request"
          description="Dung lai X-Request-ID co dinh. Gateway/Redis replay cache phai chan."
          icon={RotateCcw}
          buttonLabel="Replay Request"
          onRun={() =>
            runAttack({
              scenario: 'hmac-replay-request',
              path: '/api/v1/hmac-demo',
              headers: {
                Date: new Date().toUTCString(),
                'X-Request-ID': 'reused-request-id-demo',
                Authorization: `hmac username="m2m-client", signature="${hmacSignature}"`,
              },
              blockedMessage: 'Kong blocked replayed or invalid HMAC request.',
            })
          }
        />

        <ActionCard
          danger
          title="Timestamp Qua Han"
          description="Gui Date header cu hon 10 phut de test clock skew."
          icon={AlertTriangle}
          buttonLabel="Gui Timestamp Qua Han"
          onRun={() =>
            runAttack({
              scenario: 'hmac-expired-timestamp',
              path: '/api/v1/hmac-demo',
              headers: {
                Date: new Date(Date.now() - 10 * 60 * 1000).toUTCString(),
                Authorization: `hmac username="m2m-client", signature="${hmacSignature}"`,
              },
              blockedMessage: 'Kong blocked expired HMAC timestamp.',
            })
          }
        />
      </div>
    </div>
  );
}

function MtlsPage() {
  return (
    <div className="page-stack">
      <PageTitle
        icon={Lock}
        title="Zero-Trust Architecture (mTLS)"
        subtitle="Kiem thu luong qua Gateway va kich ban bypass Backend truc tiep."
      />

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
              successMessage: 'Backend accepted mTLS certificate from Kong Gateway.',
              blockedMessage: 'Gateway blocked request before mTLS backend flow.',
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

function RateLimitPage({ validToken, burstCount, setBurstCount }: RateLimitState) {
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
      </section>

      <ActionCard
        danger
        title="Tan Cong DDoS Ung Dung"
        description="Ban dong loat request vao /jwt-rs256. Ket qua redirect se tom tat allowed/blocked/failed."
        icon={Flame}
        buttonLabel="Khai Hoa Rapid Fire"
        onRun={() => runBurstAttack(validToken, burstCount)}
      />
    </div>
  );
}

type TokenState = {
  validToken: string;
  userToken: string;
  setValidToken: (token: string) => void;
  setUserToken: (token: string) => void;
};

type HmacState = {
  hmacSignature: string;
  setHmacSignature: (signature: string) => void;
};

type RateLimitState = {
  validToken: string;
  burstCount: number;
  setBurstCount: (count: number) => void;
};

export function App() {
  const [activePage, setActivePage] = useState<PageKey>('dashboard');
  const [validToken, setValidToken] = useState('');
  const [userToken, setUserToken] = useState('');
  const [hmacSignature, setHmacSignature] = useState('old-valid-signature-demo');
  const [burstCount, setBurstCount] = useState(150);

  const pageProps = { validToken, userToken, setValidToken, setUserToken };

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
          {activePage === 'hmac' && <HmacPage hmacSignature={hmacSignature} setHmacSignature={setHmacSignature} />}
          {activePage === 'mtls' && <MtlsPage />}
          {activePage === 'ratelimit' && (
            <RateLimitPage validToken={validToken} burstCount={burstCount} setBurstCount={setBurstCount} />
          )}
        </main>
      </div>
    </div>
  );
}
