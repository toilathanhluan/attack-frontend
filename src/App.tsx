import { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Flame,
  KeyRound,
  Lock,
  Network,
  Play,
  RotateCcw,
  Server,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { API_BASE_URL, SERVER_UI_URL, runAttack, runBurstAttack } from './attackRunner';

type AttackCardProps = {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  danger?: boolean;
  onRun: () => void;
};

function AttackCard({ title, description, icon: Icon, danger, onRun }: AttackCardProps) {
  return (
    <section className="attack-card">
      <div className="attack-card__header">
        <div className={danger ? 'attack-card__icon attack-card__icon--danger' : 'attack-card__icon'}>
          <Icon className="icon" />
        </div>
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      <button className={danger ? 'button button--danger' : 'button'} onClick={onRun}>
        <Play className="button__icon" />
        Run scenario
      </button>
    </section>
  );
}

export function App() {
  const [validToken, setValidToken] = useState('');
  const [userToken, setUserToken] = useState('');
  const [hmacSignature, setHmacSignature] = useState('old-valid-signature-demo');
  const [burstCount, setBurstCount] = useState(150);

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand__mark">
            <ShieldAlert />
          </div>
          <div>
            <p className="eyebrow">Controlled Attack Client</p>
            <h1>Secure API Gateway Attack Console</h1>
          </div>
        </div>
        <div className="status-grid">
          <div>
            <span>API target</span>
            <strong>{API_BASE_URL}</strong>
          </div>
          <div>
            <span>Evidence UI</span>
            <strong>{SERVER_UI_URL}</strong>
          </div>
        </div>
      </header>

      <section className="notice">
        <AlertTriangle className="notice__icon" />
        <div>
          <strong>Demo chi danh vao he thong cua ban.</strong>
          <p>
            Moi request duoc gan X-Attack-Id, X-Request-ID va X-Scenario. Sau khi API Gateway tra ket qua,
            giao dien nay se redirect sang Server UI de hien thi message box.
          </p>
        </div>
      </section>

      <section className="inputs">
        <label>
          <span>Valid/Admin token cho luong hop le va burst</span>
          <textarea
            value={validToken}
            onChange={(event) => setValidToken(event.target.value)}
            placeholder="Paste access token hop le neu muon test luong 200 OK hoac rate-limit co token"
          />
        </label>
        <label>
          <span>User token cho scenario sai quyen</span>
          <textarea
            value={userToken}
            onChange={(event) => setUserToken(event.target.value)}
            placeholder="Paste access token role user de test POST /students bi 403"
          />
        </label>
        <div className="input-row">
          <label>
            <span>HMAC signature demo</span>
            <input value={hmacSignature} onChange={(event) => setHmacSignature(event.target.value)} />
          </label>
          <label>
            <span>Burst requests</span>
            <input
              type="number"
              min="1"
              max="500"
              value={burstCount}
              onChange={(event) => setBurstCount(Number(event.target.value))}
            />
          </label>
        </div>
      </section>

      <section className="grid">
        <AttackCard
          title="Valid protected request"
          description="Gui token hop le vao /secure-demo de chung minh request co the vuot Gateway va toi Backend mTLS."
          icon={ShieldCheck}
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

        <AttackCard
          title="Missing token"
          description="Goi API khong co Authorization header. Gateway phai chan tai lop JWT."
          icon={KeyRound}
          danger
          onRun={() =>
            runAttack({
              scenario: 'missing-access-token',
              path: '/api/v1/secure-demo',
              blockedMessage: 'Kong blocked request because Authorization header is missing.',
            })
          }
        />

        <AttackCard
          title="Fake JWT signature"
          description="Gui Bearer token gia mao vao endpoint RS256. Gateway phai tra 401."
          icon={ShieldAlert}
          danger
          onRun={() =>
            runAttack({
              scenario: 'jwt-invalid-signature',
              path: '/api/v1/jwt-rs256',
              headers: { Authorization: 'Bearer fake.invalid.token' },
              blockedMessage: 'Kong blocked invalid JWT signature.',
            })
          }
        />

        <AttackCard
          title="Wrong role create"
          description="Dung user token thu POST /students. ACL/RBAC phai tra 403."
          icon={Lock}
          danger
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

        <AttackCard
          title="Replay HMAC"
          description="Gui lai X-Request-ID cu va signature demo. Gateway phai chan replay/invalid signature."
          icon={RotateCcw}
          danger
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

        <AttackCard
          title="Rate-limit burst"
          description="Ban dong loat request vao Gateway. Ket qua se tom tat so request bi 429."
          icon={Flame}
          danger
          onRun={() => runBurstAttack(validToken, burstCount)}
        />

        <AttackCard
          title="Direct backend bypass"
          description="Thu goi port backend neu ban lo expose endpoint direct. Ky vong TLS/CORS/network fail."
          icon={Network}
          danger
          onRun={() =>
            runAttack({
              scenario: 'backend-direct-bypass',
              path: '/api/v1/secure-demo',
              blockedLayer: 'Network/mTLS',
              blockedMessage: 'Direct backend access should fail because Backend requires mTLS from Kong.',
            })
          }
        />

        <AttackCard
          title="Audit evidence read"
          description="Thu doc /aaa-audit-logs bang token hop le de lay bang chung request da qua backend."
          icon={Activity}
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
      </section>

      <footer className="footer">
        <Server className="footer__icon" />
        <span>Deploy this app on Vercel, then allow its domain in Kong CORS.</span>
      </footer>
    </main>
  );
}
