import {
  ArrowRight,
  ArrowsOut,
  Bell,
  CalendarBlank,
  CaretDown,
  Check,
  CheckCircle,
  ChatsCircle,
  CaretRight,
  Copy,
  DotsThree,
  EnvelopeSimple,
  GearSix,
  HandHeart,
  HandsPraying,
  Heart,
  HeartStraight,
  House,
  Info,
  Lightbulb,
  LinkSimple,
  LockKey,
  MagnifyingGlass,
  Moon,
  PaperPlaneTilt,
  PencilSimple,
  Pulse,
  Plus,
  QrCode,
  ShieldCheck,
  SignOut,
  Sparkle,
  Sun,
  Trash,
  UserCircle,
  UserPlus,
  UsersThree,
  WifiHigh,
  X,
} from '@phosphor-icons/react';
import { QRCodeCanvas } from 'qrcode.react';
import { CSSProperties, FormEvent, ReactNode, useEffect, useState } from 'react';
import { canViewAbsence, checkinDecision } from './domain/checkinRules';

type Role = 'ADMIN' | 'LEADER' | 'MEMBER';
type View = 'overview' | 'members' | 'sessions' | 'followups';
type ChatMode = 'public' | 'anonymous';

type Animal = {
  key: string;
  emoji: string;
  name: string;
  tone: string;
  soft: string;
};

type Member = {
  id: string;
  name: string;
  animal: string;
  mood: string;
  companion: string;
  checkedAt: string | null;
  activity: string;
  role: Role;
  isActive: boolean;
  reminderOptIn: boolean;
  streak: number;
};

type ChatMessage = {
  id: string;
  author: string;
  animal: string;
  text: string;
  time: string;
  mode: ChatMode;
};

type ActivityEvent = {
  id: string;
  memberName: string;
  emoji: string;
  label: string;
  time: string;
};

type AppState = {
  members: Member[];
  messages: ChatMessage[];
  activities: ActivityEvent[];
  sessionOpen: boolean;
  connected: boolean;
};

const STORAGE_KEY = 'nest-demo-state-v1';
const CHECKIN_TOKEN = 'nest-wednesday-2026-09-17';
const CHECKIN_URL = `${window.location.origin}/check-in/${CHECKIN_TOKEN}`;

const ANIMALS: Animal[] = [
  { key: 'panda', emoji: '🐼', name: 'Gấu trúc bình an', tone: '#4d6479', soft: '#eef3f6' },
  { key: 'fox', emoji: '🦊', name: 'Cáo tò mò', tone: '#b65c39', soft: '#fff0e7' },
  { key: 'penguin', emoji: '🐧', name: 'Cánh cụt đồng đội', tone: '#5066a8', soft: '#eef0ff' },
  { key: 'rabbit', emoji: '🐰', name: 'Thỏ năng lượng', tone: '#b85f74', soft: '#fff0f4' },
  { key: 'tiger', emoji: '🐯', name: 'Hổ dũng cảm', tone: '#a56c26', soft: '#fff6df' },
  { key: 'frog', emoji: '🐸', name: 'Ếch vui vẻ', tone: '#4b8a5b', soft: '#eaf7ed' },
];

const MOODS = ['Bình an', 'Vui vẻ', 'Nhiều năng lượng', 'Hơi mệt', 'Đang suy nghĩ'];
const QUICK_ACTIVITIES = [
  { key: 'energy', label: 'Gửi năng lượng', icon: Sparkle },
  { key: 'pray', label: 'Xin cầu nguyện', icon: HandsPraying },
  { key: 'idea', label: 'Tôi có ý này', icon: Lightbulb },
  { key: 'thanks', label: 'Biết ơn', icon: HeartStraight },
  { key: 'amen', label: 'Amen', icon: HandHeart },
];

const seedNames = [
  'An', 'Minh', 'Khoa', 'Vy', 'Phúc', 'Nguyên', 'Linh', 'Huyền', 'Tuấn', 'Mai',
  'Thảo', 'Quân', 'Trâm', 'Duy', 'Trang', 'Khánh', 'Hà', 'Đức', 'Nhi', 'Long',
  'Yến', 'Bình', 'Tâm', 'Hương', 'Sơn', 'My', 'Tín', 'Hiếu', 'Lam', 'Quỳnh',
];

function animalByKey(key: string) {
  return ANIMALS.find((animal) => animal.key === key) ?? ANIMALS[0];
}

function makeSeedState(): AppState {
  const checked = [
    { animal: 'panda', mood: 'Bình an', checkedAt: '18:57', activity: 'Vừa check-in' },
    { animal: 'fox', mood: 'Vui vẻ', checkedAt: '19:02', activity: 'Gửi năng lượng' },
    { animal: 'penguin', mood: 'Nhiều năng lượng', checkedAt: '19:04', activity: 'Vừa check-in' },
    { animal: 'rabbit', mood: 'Đang suy nghĩ', checkedAt: '19:06', activity: 'Xin cầu nguyện' },
    { animal: 'tiger', mood: 'Vui vẻ', checkedAt: '19:08', activity: 'Amen' },
    { animal: 'frog', mood: 'Bình an', checkedAt: '19:10', activity: 'Biết ơn' },
  ];
  const members: Member[] = seedNames.map((name, index) => {
    const present = checked[index];
    return {
      id: `member-${index + 1}`,
      name,
      animal: present?.animal ?? ANIMALS[index % ANIMALS.length].key,
      mood: present?.mood ?? 'Bình an',
      companion: ['Nhóm Hạt giống', 'Nhóm Mầm xanh', 'Nhóm Cành ô-liu'][index % 3],
      checkedAt: present?.checkedAt ?? null,
      activity: present?.activity ?? 'Chưa hoạt động',
      role: index === 0 ? 'ADMIN' : index === 1 ? 'LEADER' : 'MEMBER',
      isActive: true,
      reminderOptIn: index !== 12 && index !== 22,
      streak: Math.max(0, 4 - (index % 5)),
    };
  });
  return {
    members,
    messages: [
      { id: 'message-1', author: 'Minh', animal: 'fox', text: 'Tối nay mình có một điều muốn chia sẻ với cả nhóm 🌿', time: '19:07', mode: 'public' },
      { id: 'message-2', author: 'Một người bạn', animal: 'panda', text: 'Cảm ơn vì tuần này mọi người vẫn ở đây với nhau.', time: '19:09', mode: 'anonymous' },
    ],
    activities: [
      { id: 'activity-1', memberName: 'Nguyên', emoji: '🐸', label: 'Biết ơn', time: '19:10' },
      { id: 'activity-2', memberName: 'Phúc', emoji: '🐯', label: 'Amen', time: '19:08' },
      { id: 'activity-3', memberName: 'Vy', emoji: '🐰', label: 'Xin cầu nguyện', time: '19:06' },
    ],
    sessionOpen: true,
    connected: true,
  };
}

function usePersistedState() {
  const [state, setState] = useState<AppState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) as AppState : makeSeedState();
    } catch {
      return makeSeedState();
    }
  });
  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(state)), [state]);
  return [state, setState] as const;
}

function timeNow() {
  return new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
}

function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`modal-card ${wide ? 'modal-card-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header">
          <h2 id="modal-title">{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Đóng cửa sổ"><X size={20} /></button>
        </div>
        {children}
      </section>
    </div>
  );
}

function App() {
  const [state, setState] = usePersistedState();
  const [role, setRole] = useState<Role>('LEADER');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => localStorage.getItem('nest-theme') === 'dark' ? 'dark' : 'light');
  const [toast, setToast] = useState('');
  const [route, setRoute] = useState(window.location.pathname);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [qrFullscreen, setQrFullscreen] = useState(false);

  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => localStorage.setItem('nest-theme', theme), [theme]);
  useEffect(() => {
    const handler = () => setRoute(window.location.pathname);
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3200);
  };

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setRoute(path);
  };

  const handleCheckin = (memberId: string, animal: string, mood: string) => {
    const existing = state.members.find((member) => member.id === memberId);
    if (!existing) return 'error' as const;
    const decision = checkinDecision({ sessionOpen: state.sessionOpen, alreadyCheckedIn: Boolean(existing.checkedAt), profileActive: existing.isActive });
    if (decision === 'duplicate') return 'duplicate' as const;
    if (decision !== 'allowed') return 'error' as const;
    const checkedAt = timeNow();
    setState((previous) => ({
      ...previous,
      members: previous.members.map((member) => member.id === memberId ? { ...member, animal, mood, checkedAt, activity: 'Vừa check-in' } : member),
      activities: [{ id: `activity-${Date.now()}`, memberName: existing.name, emoji: animalByKey(animal).emoji, label: 'Vừa check-in', time: checkedAt }, ...previous.activities],
    }));
    return 'success' as const;
  };

  const handleSendMessage = (text: string, mode: ChatMode) => {
    setState((previous) => ({
      ...previous,
      messages: [...previous.messages, { id: `message-${Date.now()}`, author: mode === 'anonymous' ? 'Một người bạn' : 'Mai Anh', animal: mode === 'anonymous' ? 'panda' : 'panda', text, time: timeNow(), mode }],
    }));
  };

  const handleActivity = (label: string) => {
    setState((previous) => ({
      ...previous,
      activities: [{ id: `activity-${Date.now()}`, memberName: 'Mai Anh', emoji: '🐼', label, time: timeNow() }, ...previous.activities],
    }));
  };

  const handleModerateMessage = (id: string) => {
    setState((previous) => ({ ...previous, messages: previous.messages.filter((message) => message.id !== id) }));
    notify('Tin nhắn đã được ẩn khỏi phòng');
  };

  if (route.startsWith('/check-in/')) {
    return <CheckInScreen state={state} onCheckin={handleCheckin} onBack={() => navigate('/room/today')} />;
  }

  const view: View = route.includes('/members') ? 'members' : route.includes('/sessions') ? 'sessions' : route.includes('/follow-ups') ? 'followups' : 'overview';
  return (
    <>
      <AppShell
        state={state}
        role={role}
        view={view}
        theme={theme}
        onRoleChange={setRole}
        onThemeToggle={() => setTheme((current) => current === 'light' ? 'dark' : 'light')}
        onNavigate={navigate}
        onOpenFollowUp={() => setFollowUpOpen(true)}
        onSetSessionOpen={(open) => setState((previous) => ({ ...previous, sessionOpen: open }))}
        onSetConnected={(connected) => setState((previous) => ({ ...previous, connected }))}
        onCopy={() => { navigator.clipboard?.writeText(CHECKIN_URL); notify('Đã sao chép link check-in'); }}
        onFullscreen={() => setQrFullscreen(true)}
        onNotify={notify}
        onSendMessage={handleSendMessage}
        onActivity={handleActivity}
        onModerateMessage={handleModerateMessage}
      />
      {followUpOpen && <FollowUpModal state={state} onClose={() => setFollowUpOpen(false)} onNotify={notify} />}
      {qrFullscreen && <QrModal onClose={() => setQrFullscreen(false)} />}
      {toast && <div className="toast" role="status" aria-live="polite"><CheckCircle size={18} weight="fill" />{toast}</div>}
    </>
  );
}

function AppShell({
  state, role, view, theme, onRoleChange, onThemeToggle, onNavigate, onOpenFollowUp, onSetSessionOpen, onSetConnected, onCopy, onFullscreen, onNotify, onSendMessage, onActivity, onModerateMessage,
}: {
  state: AppState; role: Role; view: View; theme: 'light' | 'dark'; onRoleChange: (role: Role) => void; onThemeToggle: () => void; onNavigate: (path: string) => void; onOpenFollowUp: () => void; onSetSessionOpen: (open: boolean) => void; onSetConnected: (connected: boolean) => void; onCopy: () => void; onFullscreen: () => void; onNotify: (message: string) => void; onSendMessage: (text: string, mode: ChatMode) => void; onActivity: (label: string) => void; onModerateMessage: (id: string) => void;
}) {
  const presentCount = state.members.filter((member) => member.checkedAt).length;
  const canLead = canViewAbsence(role);
  const titles: Record<View, { eyebrow: string; title: string; description: string }> = {
    overview: { eyebrow: 'Phòng sinh hoạt', title: 'Tối thứ tư trong tổ', description: 'Mỗi người đến là một đốm sáng nhỏ trong khu rừng này.' },
    members: { eyebrow: 'Cộng đồng', title: 'Thành viên của tổ', description: '30 người đang cùng nhau lớn lên, theo cách rất riêng.' },
    sessions: { eyebrow: 'Nhịp sinh hoạt', title: 'Các buổi nhóm', description: 'Giữ nhịp gặp nhau đều đặn và nhẹ nhàng.' },
    followups: { eyebrow: 'Chăm sóc riêng tư', title: 'Hẹn nhau tuần sau', description: 'Một lời hỏi thăm đúng lúc có thể làm cả tuần của ai đó dịu lại.' },
  };
  return (
    <div className="app-shell">
      <Sidebar role={role} view={view} onNavigate={onNavigate} />
      <div className="app-content">
        <header className="topbar">
          <div className="mobile-brand"><NestMark small /><span>NEST</span></div>
          <div className="topbar-context"><span className="context-dot" /> Nhóm Cành ô-liu <span className="context-divider" /> Thứ tư, 17 tháng 9</div>
          <div className="topbar-actions">
            <button className="icon-button hide-mobile" aria-label="Tìm kiếm"><MagnifyingGlass size={20} /></button>
            <button className="icon-button hide-mobile" aria-label="Thông báo"><Bell size={20} /><span className="notification-dot" /></button>
            <button className="theme-toggle" onClick={onThemeToggle} aria-label={theme === 'light' ? 'Bật chế độ tối' : 'Bật chế độ sáng'}>{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button>
            <div className="role-picker"><UserCircle size={19} /><select value={role} onChange={(event) => onRoleChange(event.target.value as Role)} aria-label="Vai trò demo"><option value="LEADER">Leader</option><option value="ADMIN">Admin</option><option value="MEMBER">Member</option></select><CaretDown size={14} /></div>
          </div>
        </header>
        <main className="page-main">
          {view === 'overview' && <OverviewPage state={state} role={role} presentCount={presentCount} onOpenFollowUp={onOpenFollowUp} onSetSessionOpen={onSetSessionOpen} onSetConnected={onSetConnected} onCopy={onCopy} onFullscreen={onFullscreen} onNotify={onNotify} onSendMessage={onSendMessage} onActivity={onActivity} onModerateMessage={onModerateMessage} />}
          {view === 'members' && <MembersPage state={state} canLead={canLead} onNotify={onNotify} />}
          {view === 'sessions' && <SessionsPage state={state} canLead={canLead} onSetSessionOpen={onSetSessionOpen} onNotify={onNotify} />}
          {view === 'followups' && canLead && <FollowUpsPage state={state} onOpenFollowUp={onOpenFollowUp} onNotify={onNotify} />}
          {view === 'followups' && !canLead && <AccessDenied />}
        </main>
        <MobileNav view={view} role={role} onNavigate={onNavigate} />
      </div>
    </div>
  );
}

function NestMark({ small = false }: { small?: boolean }) {
  return <span className={`nest-mark ${small ? 'nest-mark-small' : ''}`} aria-hidden="true"><span className="nest-mark-line" /><span className="nest-mark-dot" /></span>;
}

function Sidebar({ role, view, onNavigate }: { role: Role; view: View; onNavigate: (path: string) => void }) {
  const nav = [
    { key: 'overview' as View, label: 'Tổng quan', icon: House, path: '/room/today' },
    { key: 'members' as View, label: 'Thành viên', icon: UsersThree, path: '/leader/members' },
    { key: 'sessions' as View, label: 'Buổi nhóm', icon: CalendarBlank, path: '/leader/sessions' },
    ...(role === 'LEADER' || role === 'ADMIN' ? [{ key: 'followups' as View, label: 'Hỏi thăm', icon: Heart, path: '/leader/follow-ups' }] : []),
  ];
  return (
    <aside className="sidebar">
      <div className="brand-lockup"><NestMark /><div><div className="brand-name">NEST</div><div className="brand-tagline">Kết nối thật, lớn lên cùng nhau.</div></div></div>
      <div className="group-switcher"><div className="group-avatar">CO</div><div className="group-switcher-copy"><strong>Cành ô-liu</strong><span>Nhóm sinh viên</span></div><CaretDown size={16} /></div>
      <div className="nav-label">Không gian chung</div>
      <nav className="sidebar-nav" aria-label="Điều hướng chính">
        {nav.map(({ key, label, icon: Icon, path }) => <button key={key} className={`nav-item ${view === key ? 'active' : ''}`} onClick={() => onNavigate(path)}><Icon size={20} weight={view === key ? 'fill' : 'regular'} /><span>{label}</span>{key === 'followups' && <span className="nav-count">24</span>}</button>)}
      </nav>
      <div className="sidebar-spacer" />
      <div className="sidebar-note"><div className="sidebar-note-icon"><Sparkle size={18} weight="fill" /></div><div><strong>Nhịp nhỏ, niềm vui lớn</strong><span>Hôm nay đã có {6} người cùng hiện diện.</span></div></div>
      <div className="sidebar-bottom"><button className="nav-item"><GearSix size={20} /><span>Cài đặt nhóm</span></button><button className="nav-item"><SignOut size={20} /><span>Đăng xuất</span></button><div className="profile-row"><div className="avatar avatar-panda">🐼</div><div className="profile-copy"><strong>Mai Anh</strong><span>{roleLabel(roleFromRole(role))}</span></div><DotsThree size={20} /></div></div>
    </aside>
  );
}

function roleFromRole(role: Role) { return role; }
function roleLabel(role: Role) { return role === 'ADMIN' ? 'Quản trị viên' : role === 'LEADER' ? 'Người phụ trách' : 'Thành viên'; }

function MobileNav({ view, role, onNavigate }: { view: View; role: Role; onNavigate: (path: string) => void }) {
  const items = [
    { key: 'overview' as View, label: 'Phòng', icon: House, path: '/room/today' },
    { key: 'members' as View, label: 'Tổ', icon: UsersThree, path: '/leader/members' },
    ...(role !== 'MEMBER' ? [{ key: 'followups' as View, label: 'Hỏi thăm', icon: Heart, path: '/leader/follow-ups' }] : []),
    { key: 'sessions' as View, label: 'Lịch', icon: CalendarBlank, path: '/leader/sessions' },
  ];
  return <nav className="mobile-nav" aria-label="Điều hướng di động">{items.map(({ key, label, icon: Icon, path }) => <button key={key} className={view === key ? 'active' : ''} onClick={() => onNavigate(path)}><Icon size={21} weight={view === key ? 'fill' : 'regular'} /><span>{label}</span></button>)}</nav>;
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action && <div className="heading-action">{action}</div>}</div>;
}

function OverviewPage({ state, role, presentCount, onOpenFollowUp, onSetSessionOpen, onSetConnected, onCopy, onFullscreen, onNotify, onSendMessage, onActivity, onModerateMessage }: { state: AppState; role: Role; presentCount: number; onOpenFollowUp: () => void; onSetSessionOpen: (open: boolean) => void; onSetConnected: (connected: boolean) => void; onCopy: () => void; onFullscreen: () => void; onNotify: (message: string) => void; onSendMessage: (text: string, mode: ChatMode) => void; onActivity: (label: string) => void; onModerateMessage: (id: string) => void }) {
  const canLead = canViewAbsence(role);
  const absentCount = state.members.filter((member) => member.isActive && !member.checkedAt).length;
  return (
    <>
      <PageHeading eyebrow="Phòng sinh hoạt" title="Tối thứ tư trong tổ" description="Mỗi người đến là một đốm sáng nhỏ trong khu rừng này." action={<div className={`connection-status ${state.connected ? '' : 'offline'}`}><span className="status-light" />{state.connected ? 'Realtime đang bật' : 'Mất kết nối'}<button onClick={() => onSetConnected(!state.connected)} aria-label="Đổi trạng thái kết nối"><WifiHigh size={15} /></button></div>} />
      {!state.connected && <div className="offline-banner"><Info size={18} /><span>Kết nối realtime đang chập chờn. Các thay đổi mới sẽ đồng bộ khi mạng ổn định.</span><button onClick={() => onSetConnected(true)}>Thử kết nối lại</button></div>}
      <section className="room-grid">
        <div className="room-main-column">
          <CheckinHero state={state} onSetSessionOpen={onSetSessionOpen} onCopy={onCopy} onFullscreen={onFullscreen} onNotify={onNotify} />
          <AttendanceStats presentCount={presentCount} total={state.members.length} />
          <ForestSection state={state} />
        </div>
        <aside className="room-side-column"><ChatPanel state={state} role={role} onNotify={onNotify} onSendMessage={onSendMessage} onModerateMessage={onModerateMessage} /><QuickPulse state={state} onNotify={onNotify} onActivity={onActivity} />{canLead && <FollowUpCard absentCount={absentCount} onOpen={onOpenFollowUp} />}</aside>
      </section>
    </>
  );
}

function CheckinHero({ state, onSetSessionOpen, onCopy, onFullscreen, onNotify }: { state: AppState; onSetSessionOpen: (open: boolean) => void; onCopy: () => void; onFullscreen: () => void; onNotify: (message: string) => void }) {
  return (
    <section className="checkin-hero">
      <div className="hero-copy"><div className="hero-topline"><span className="live-badge"><span className="live-dot" />{state.sessionOpen ? 'Đang diễn ra' : 'Đã đóng'}</span><span className="hero-time"><ClockIcon /> CHECK-IN · 19:15</span></div><h2>Chạm cửa rồi?<br /><em>Vào tổ thôi.</em></h2><p>Quét mã, chọn linh vật và tên của bạn sẽ xuất hiện trên khu rừng ngay lập tức.</p><div className="hero-actions"><button className="button button-lime" onClick={() => { window.history.pushState({}, '', `/check-in/${CHECKIN_TOKEN}`); window.dispatchEvent(new PopStateEvent('popstate')); }}>Mở form check-in <ArrowRight size={18} /></button><button className="button button-ghost-light" onClick={() => { onCopy(); onNotify('Đã sao chép link check-in'); }}><LinkSimple size={17} />Sao chép link</button></div><button className="session-toggle" onClick={() => onSetSessionOpen(!state.sessionOpen)}>{state.sessionOpen ? 'Tạm dừng check-in' : 'Mở lại check-in'} <span>{state.sessionOpen ? 'Đóng phiên' : 'Đang đóng'}</span></button></div>
      <div className="qr-wrap"><div className="qr-frame"><QRCodeCanvas value={CHECKIN_URL} size={166} bgColor="#ffffff" fgColor="#20201f" includeMargin aria-label="Mã QR check-in của buổi tối thứ tư" /></div><div className="qr-caption"><QrCode size={17} /><span>Quét để vào tổ</span><button onClick={onFullscreen} aria-label="Mở QR toàn màn hình"><ArrowsOut size={17} /></button></div></div>
      <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
    </section>
  );
}

function ClockIcon() { return <span className="clock-icon">19:15</span>; }

function AttendanceStats({ presentCount, total }: { presentCount: number; total: number }) {
  const absent = total - presentCount;
  const percentage = Math.round((presentCount / total) * 100);
  return <section className="stats-strip"><div className="stat-primary"><div className="stat-ring" style={{ '--progress': `${percentage * 3.6}deg` } as CSSProperties}><div><strong>{presentCount}</strong><span>/ {total}</span></div></div><div><div className="stat-kicker">ĐÃ ĐẾN</div><h3>Khu rừng đang thức</h3><p>Những khuôn mặt đã có mặt tối nay.</p></div></div><div className="stat-item"><span className="stat-icon stat-icon-lime"><Check size={17} weight="bold" /></span><div><strong>{presentCount}/{total}</strong><span>đã đến</span></div></div><div className="stat-item"><span className="stat-icon stat-icon-orange"><UserPlus size={17} weight="bold" /></span><div><strong>{absent}</strong><span>chưa đến</span></div></div><div className="stat-item"><span className="stat-icon stat-icon-purple"><Pulse size={17} weight="bold" /></span><div><strong>{percentage}%</strong><span>tỷ lệ tham dự</span></div></div></section>;
}

function ForestSection({ state }: { state: AppState }) {
  const present = state.members.filter((member) => member.checkedAt).sort((a, b) => (b.checkedAt ?? '').localeCompare(a.checkedAt ?? ''));
  return <section className="forest-section"><div className="section-heading"><div><div className="eyebrow">Sự hiện diện</div><h2>Khu rừng đang thức <span className="section-spark">✦</span></h2></div><span className="member-count">{present.length} khuôn mặt</span></div>{present.length === 0 ? <div className="empty-state"><div className="empty-illustration">🌱</div><h3>Rừng đang chờ những bước chân đầu tiên</h3><p>Mở QR để mời mọi người cùng vào tổ.</p></div> : <div className="forest-grid">{present.map((member) => <MemberCard key={member.id} member={member} />)}</div>}</section>;
}

function MemberCard({ member }: { member: Member }) {
  const animal = animalByKey(member.animal);
  const justActive = member.activity !== 'Vừa check-in' && member.activity !== 'Chưa hoạt động';
  return <article className={`member-card ${member.activity === 'Vừa check-in' ? 'member-card-new' : ''}`}><div className="member-card-head"><div className="animal-avatar" style={{ background: animal.soft }}>{animal.emoji}</div><span className="presence-dot" aria-label="Đang có mặt" /></div><div className="member-card-copy"><strong>{member.name}</strong><span>{member.checkedAt} <span className="card-separator">•</span> {member.mood}</span></div><div className={`member-activity ${justActive ? 'is-active' : ''}`}>{justActive && <span className="activity-pulse" />}{member.activity}</div></article>;
}

function ChatPanel({ state, role, onNotify, onSendMessage, onModerateMessage }: { state: AppState; role: Role; onNotify: (message: string) => void; onSendMessage: (text: string, mode: ChatMode) => void; onModerateMessage: (id: string) => void }) {
  const [mode, setMode] = useState<ChatMode>('public');
  const [draft, setDraft] = useState('');
  const sendMessage = (event: FormEvent) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content) return;
    onSendMessage(content, mode);
    onNotify('Tin nhắn đã được gửi');
    setDraft('');
  };
  return <section className="chat-panel"><div className="panel-heading"><div><div className="eyebrow">Cùng hiện diện</div><h2>Chuyện trong tổ</h2></div><button className="icon-button" aria-label="Tùy chọn trò chuyện"><DotsThree size={20} /></button></div><div className="chat-notice"><ShieldCheck size={17} weight="fill" /><span>Hãy tử tế với nhau. Bạn có thể nhắn ẩn danh, Admin vẫn có thể hỗ trợ khi cần.</span></div><div className="chat-mode-toggle" role="group" aria-label="Chế độ hiển thị tin nhắn"><button className={mode === 'public' ? 'active' : ''} onClick={() => setMode('public')}><UserCircle size={16} /> Công khai</button><button className={mode === 'anonymous' ? 'active' : ''} onClick={() => setMode('anonymous')}><span className="ghost-glyph">✦</span> Ẩn danh</button></div><div className="message-list">{state.messages.length === 0 ? <div className="chat-empty"><ChatsCircle size={26} /><span>Chưa có lời nhắn nào.<br />Mở lời đầu tiên nhé.</span></div> : state.messages.map((message) => <div className="message-row" key={message.id}><div className="message-avatar" style={{ background: animalByKey(message.animal).soft }}>{message.mode === 'anonymous' ? '✦' : animalByKey(message.animal).emoji}</div><div className="message-body"><div className="message-meta"><strong>{message.mode === 'anonymous' ? 'Một người bạn' : message.author}</strong><span>{message.time}</span></div><p>{message.text}</p>{role !== 'MEMBER' && <button className="message-moderate" onClick={() => onModerateMessage(message.id)}><Trash size={12} /> Ẩn tin nhắn</button>}</div></div>)}</div><form className="chat-form" onSubmit={sendMessage}><div className="chat-input-wrap"><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={mode === 'public' ? 'Nói điều gì đó tử tế…' : 'Nhắn ẩn danh, vẫn thật tử tế…'} aria-label="Nội dung tin nhắn" maxLength={280} /><button type="submit" aria-label="Gửi tin nhắn"><PaperPlaneTilt size={18} weight="fill" /></button></div><div className="chat-form-foot"><span>{mode === 'anonymous' ? 'Ẩn danh với thành viên' : 'Hiển thị tên và linh vật'}</span><span>{draft.length}/280</span></div></form></section>;
}

function QuickPulse({ state, onNotify, onActivity }: { state: AppState; onNotify: (message: string) => void; onActivity: (label: string) => void }) {
  const [active, setActive] = useState<string | null>(null);
  const react = (key: string, label: string) => { setActive(key); onActivity(label); onNotify(`${label} đã được ghi nhận`); window.setTimeout(() => setActive(null), 500); };
  return <section className="pulse-panel"><div className="panel-heading compact"><div><div className="eyebrow">Một chạm nhỏ</div><h2>Gửi một chút điều lành</h2></div><Sparkle size={20} className="purple-icon" /></div><div className="pulse-grid">{QUICK_ACTIVITIES.map(({ key, label, icon: Icon }) => <button key={key} className={`pulse-button ${active === key ? 'pressed' : ''}`} onClick={() => react(key, label)}><span><Icon size={19} weight="duotone" /></span><small>{label}</small></button>)}</div>{state.activities[0] && <div className="latest-pulse"><span className="pulse-avatar">{state.activities[0].emoji}</span><span><strong>{state.activities[0].memberName}</strong> vừa chọn <b>{state.activities[0].label}</b></span><time>{state.activities[0].time}</time></div>}</section>;
}

function FollowUpCard({ absentCount, onOpen }: { absentCount: number; onOpen: () => void }) {
  return <section className="followup-card"><div className="followup-icon"><EnvelopeSimple size={21} weight="duotone" /></div><div className="eyebrow">Chăm sóc riêng tư</div><h2>Hẹn nhau tuần sau nhé?</h2><p>Hỏi thăm riêng tư, không gây áp lực hay công khai người vắng.</p><button className="button button-dark" onClick={onOpen}>Khích lệ {absentCount} bạn <ArrowRight size={17} /></button><div className="followup-orbit" /></section>;
}

function FollowUpModal({ state, onClose, onNotify }: { state: AppState; onClose: () => void; onNotify: (message: string) => void }) {
  const [message, setMessage] = useState('Tụi mình nhớ bạn 🫶 Tuần sau 19:15, ghé nhóm chung với tụi mình nhé!');
  const [selected, setSelected] = useState<string[]>(state.members.filter((member) => !member.checkedAt).slice(0, 4).map((member) => member.id));
  const absent = state.members.filter((member) => !member.checkedAt);
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  return <Modal title="Gửi lời hỏi thăm" onClose={onClose} wide><p className="modal-lead">Chọn những người bạn muốn nhắn riêng. Họ sẽ nhận được lời mời nhẹ nhàng, không phải một lời nhắc điểm danh.</p><div className="recipient-list">{absent.slice(0, 8).map((member) => <label className="recipient-row" key={member.id}><input type="checkbox" checked={selected.includes(member.id)} onChange={() => toggle(member.id)} /><span className="animal-avatar small" style={{ background: animalByKey(member.animal).soft }}>{animalByKey(member.animal).emoji}</span><span><strong>{member.name}</strong><small>{member.companion} <span className="card-separator">•</span> vắng {member.streak + 1} tuần</small></span><Check size={17} className="recipient-check" /></label>)}</div><label className="field-label">Tin nhắn <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={3} /></label><div className="modal-footer"><span className="privacy-note"><LockKey size={15} /> Chỉ người nhận nhìn thấy</span><div className="modal-actions"><button className="button button-secondary" onClick={() => { navigator.clipboard?.writeText(message); onNotify('Đã sao chép tin nhắn mẫu'); }}>Sao chép</button><button className="button button-dark" onClick={() => { onNotify(`Đã đánh dấu hỏi thăm ${selected.length} bạn`); onClose(); }}>Đánh dấu đã hỏi thăm <ArrowRight size={17} /></button></div></div></Modal>;
}

function QrModal({ onClose }: { onClose: () => void }) {
  return <Modal title="Mã QR check-in" onClose={onClose}><div className="qr-fullscreen"><div className="qr-frame large"><QRCodeCanvas value={CHECKIN_URL} size={250} bgColor="#ffffff" fgColor="#20201f" includeMargin /></div><p>Quét mã để mở form check-in của buổi tối thứ tư.</p><span>CHECK-IN · 19:15</span></div></Modal>;
}

function CheckInScreen({ state, onCheckin, onBack }: { state: AppState; onCheckin: (memberId: string, animal: string, mood: string) => 'success' | 'duplicate' | 'error'; onBack: () => void }) {
  const [memberId, setMemberId] = useState('member-7');
  const [animal, setAnimal] = useState('panda');
  const [mood, setMood] = useState('Bình an');
  const [step, setStep] = useState<'form' | 'success' | 'duplicate'>('form');
  const selectedMember = state.members.find((member) => member.id === memberId);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = onCheckin(memberId, animal, mood);
    if (result === 'duplicate') setStep('duplicate');
    if (result === 'success') setStep('success');
  };
  if (!state.sessionOpen) return <div className="checkin-page"><div className="checkin-brand"><NestMark /><span>NEST</span></div><div className="checkin-state"><div className="state-icon muted"><LockKey size={28} /></div><h1>Phiên check-in đã đóng</h1><p>Nhờ người phụ trách mở lại phiên để bạn có thể vào tổ.</p><button className="button button-dark" onClick={onBack}>Về màn hình phòng <ArrowRight size={17} /></button></div></div>;
  if (step === 'success') return <div className="checkin-page"><div className="checkin-brand"><NestMark /><span>NEST</span></div><div className="checkin-state success-state"><div className="success-animal">{animalByKey(animal).emoji}</div><div className="state-icon success"><Check size={26} weight="bold" /></div><div className="eyebrow">{timeNow()} · CHECK-IN</div><h1>Bạn đã vào tổ!</h1><p>{selectedMember?.name}, mọi người đang đợi bạn trong khu rừng.</p><button className="button button-lime" onClick={onBack}>Xem màn hình phòng <ArrowRight size={17} /></button></div></div>;
  if (step === 'duplicate') return <div className="checkin-page"><div className="checkin-brand"><NestMark /><span>NEST</span></div><div className="checkin-state"><div className="state-icon success"><Check size={26} weight="bold" /></div><div className="eyebrow">ĐÃ GHI NHẬN</div><h1>Bạn đã ở trong tổ rồi.</h1><p>Check-in của {selectedMember?.name} đã được ghi nhận lúc {selectedMember?.checkedAt}.</p><button className="button button-dark" onClick={onBack}>Về màn hình phòng <ArrowRight size={17} /></button></div></div>;
  return <div className="checkin-page"><div className="checkin-brand"><NestMark /><span>NEST</span></div><div className="checkin-form-wrap"><div className="checkin-form-intro"><div className="eyebrow">TỐI THỨ TƯ · 19:15</div><h1>Vào tổ thôi.</h1><p>Chọn tên, linh vật và tâm trạng hiện tại của bạn nhé.</p></div><form className="checkin-form" onSubmit={submit}><div className="field-label"><label htmlFor="checkin-member">Tên của bạn</label><select id="checkin-member" value={memberId} onChange={(event) => setMemberId(event.target.value)} required>{state.members.filter((member) => member.isActive).map((member) => <option key={member.id} value={member.id}>{member.name}{member.checkedAt ? ' · đã check-in' : ''}</option>)}</select></div><fieldset className="animal-field"><legend>Linh vật đồng hành</legend><div className="animal-picker">{ANIMALS.map((item) => <button type="button" key={item.key} className={animal === item.key ? 'selected' : ''} onClick={() => setAnimal(item.key)}><span style={{ background: item.soft }}>{item.emoji}</span><small>{item.name.split(' ')[0]}</small></button>)}</div></fieldset><div className="field-label"><label htmlFor="checkin-mood">Tâm trạng hôm nay</label><select id="checkin-mood" value={mood} onChange={(event) => setMood(event.target.value)}>{MOODS.map((item) => <option key={item}>{item}</option>)}</select></div><button className="button button-dark full-width" type="submit">Có mặt! <ArrowRight size={18} /></button><p className="form-privacy"><ShieldCheck size={15} /> Thông tin này chỉ giúp tổ biết cách đón bạn tối nay.</p></form></div><button className="checkin-back" onClick={onBack}>← Về màn hình phòng</button></div>;
}

function LeaderPageHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) { return <PageHeading eyebrow="Quản lý nhóm" title={title} description={description} action={action} />; }

function MembersPage({ state, canLead, onNotify }: { state: AppState; canLead: boolean; onNotify: (message: string) => void }) {
  const [query, setQuery] = useState('');
  const visible = state.members.filter((member) => member.name.toLowerCase().includes(query.toLowerCase()));
  return <><LeaderPageHeader title="Thành viên của tổ" description="Cùng chăm sóc một cộng đồng nhỏ, nơi ai cũng có chỗ để trở về." action={canLead ? <button className="button button-dark" onClick={() => onNotify('Mở form thêm thành viên')}><Plus size={17} /> Thêm thành viên</button> : undefined} /><div className="table-toolbar"><div className="search-field"><MagnifyingGlass size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tên thành viên..." /></div><div className="toolbar-filters"><button className="filter-button">Tất cả <CaretDown size={14} /></button><button className="filter-button">Nhóm đồng hành <CaretDown size={14} /></button></div><span className="toolbar-count">{visible.length} thành viên</span></div><section className="data-table-wrap"><table className="data-table"><thead><tr><th>Thành viên</th><th>Nhóm đồng hành</th><th>Nhịp tham dự</th><th>Trạng thái</th><th><span className="sr-only">Thao tác</span></th></tr></thead><tbody>{visible.map((member) => <tr key={member.id}><td><div className="table-person"><span className="animal-avatar small" style={{ background: animalByKey(member.animal).soft }}>{animalByKey(member.animal).emoji}</span><span><strong>{member.name}</strong><small>{member.role === 'MEMBER' ? 'Thành viên' : roleLabel(member.role)}</small></span></div></td><td>{member.companion}</td><td><div className="streak-cell"><span className="streak-dots">{[0, 1, 2, 3].map((dot) => <i key={dot} className={dot < member.streak ? 'filled' : ''} />)}</span><span>{member.streak ? `${member.streak} tuần liên tục` : 'Mới vào tổ'}</span></div></td><td><span className={`status-tag ${member.isActive ? 'active' : 'inactive'}`}><span />{member.isActive ? 'Đang hoạt động' : 'Đã tạm dừng'}</span></td><td><button className="icon-button" aria-label={`Tùy chọn cho ${member.name}`} onClick={() => onNotify(`Đang mở hồ sơ của ${member.name}`)}><DotsThree size={19} /></button></td></tr>)}</tbody></table></section></>;
}

function SessionsPage({ state, canLead, onSetSessionOpen, onNotify }: { state: AppState; canLead: boolean; onSetSessionOpen: (open: boolean) => void; onNotify: (message: string) => void }) {
  const sessions = [{ title: 'Tối thứ tư trong tổ', date: '17 tháng 9, 2026', time: '19:15', present: state.members.filter((member) => member.checkedAt).length, status: state.sessionOpen ? 'Đang diễn ra' : 'Đã đóng' }, { title: 'Tối thứ tư trong tổ', date: '10 tháng 9, 2026', time: '19:15', present: 22, status: 'Đã kết thúc' }, { title: 'Tối thứ tư trong tổ', date: '03 tháng 9, 2026', time: '19:15', present: 25, status: 'Đã kết thúc' }];
  return <><LeaderPageHeader title="Các buổi sinh hoạt" description="Tạo một nhịp gặp nhau quen thuộc để mọi người dễ quay về." action={canLead ? <button className="button button-dark" onClick={() => onNotify('Mở form tạo buổi nhóm mới')}><Plus size={17} /> Tạo buổi nhóm</button> : undefined} /><div className="session-list">{sessions.map((session, index) => <article className={`session-row ${index === 0 ? 'current' : ''}`} key={`${session.date}-${index}`}><div className="session-date"><span>{index === 0 ? 'HÔM NAY' : 'THÁNG 9'}</span><strong>{session.date.split(' ')[0]}</strong><small>THỨ TƯ</small></div><div className="session-info"><div className="session-title-row"><h2>{session.title}</h2>{index === 0 && <span className="status-tag active"><span />{session.status}</span>}</div><p><ClockIcon /> Check-in lúc {session.time} <span className="card-separator">•</span> {session.present}/30 đã đến</p></div><div className="session-actions">{index === 0 && canLead && <button className="button button-secondary" onClick={() => onSetSessionOpen(!state.sessionOpen)}>{state.sessionOpen ? 'Đóng check-in' : 'Mở check-in'}</button>}<button className="icon-button" aria-label="Xem chi tiết buổi nhóm" onClick={() => onNotify('Đang mở chi tiết buổi nhóm')}><CaretRight size={20} /></button></div></article>)}</div><div className="session-tip"><Sparkle size={20} /><div><strong>Gợi ý cho người phụ trách</strong><p>Khung giờ 19:15 đang tạo thành thói quen rất đẹp. Hãy giữ lời mời đơn giản và đều đặn.</p></div></div></>;
}

function FollowUpsPage({ state, onOpenFollowUp, onNotify }: { state: AppState; onOpenFollowUp: () => void; onNotify: (message: string) => void }) {
  const absent = state.members.filter((member) => !member.checkedAt);
  return <><LeaderPageHeader title="Hẹn nhau tuần sau" description="Không ai bị bỏ lại phía sau. Một lời hỏi thăm, không phải một lời nhắc." action={<button className="button button-dark" onClick={onOpenFollowUp}><EnvelopeSimple size={17} /> Gửi lời hỏi thăm</button>} /><div className="followup-summary"><div className="summary-number"><strong>{absent.length}</strong><span>người chưa đến hôm nay</span></div><div className="summary-divider" /><div className="summary-number soft"><strong>7</strong><span>đã được hỏi thăm tuần này</span></div><div className="summary-note"><Heart size={20} weight="fill" /><span>Hãy nhớ tôn trọng lựa chọn nhận lời nhắc của mỗi người.</span></div></div><section className="followup-board"><div className="board-heading"><div><div className="eyebrow">Danh sách riêng tư</div><h2>Có thể cần một vòng tay</h2></div><span className="privacy-label"><LockKey size={14} /> Chỉ Leader và Admin</span></div><div className="followup-grid">{absent.slice(0, 8).map((member) => <article className="followup-person" key={member.id}><div className="followup-person-top"><span className="animal-avatar small" style={{ background: animalByKey(member.animal).soft }}>{animalByKey(member.animal).emoji}</span><button className="icon-button" onClick={() => onNotify(`Đã chọn ${member.name}`)} aria-label={`Tùy chọn ${member.name}`}><DotsThree size={18} /></button></div><strong>{member.name}</strong><span>{member.companion}</span><div className="followup-person-foot"><small>{member.streak + 1} tuần chưa gặp</small><button onClick={() => onNotify(`Đã tạo lời hỏi thăm cho ${member.name}`)}>Hỏi thăm <ArrowRight size={14} /></button></div></article>)}</div></section></>;
}

function AccessDenied() { return <div className="access-denied"><div className="state-icon muted"><LockKey size={28} /></div><h2>Khu vực riêng của người phụ trách</h2><p>Danh sách người vắng được bảo vệ để mọi lời hỏi thăm luôn giữ được sự riêng tư.</p></div>; }

export default App;
