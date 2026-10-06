import {
  ArrowRight,
  ArrowsOut,
  Bell,
  CalendarBlank,
  CaretDown,
  Check,
  CheckCircle,
  Clock,
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
  DiceFive,
} from '@phosphor-icons/react';
import { QRCodeCanvas } from 'qrcode.react';
import { CSSProperties, FormEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom';
import { canViewAbsence } from './domain/checkinRules';
import { checkinSchema, type CheckinFormValues } from './domain/checkinSchema';
import { isSupabaseConfigured, supabase } from './lib/supabase';

import { Mascot, MascotAvatar } from './components/Mascot';
import { MascotPicker } from './components/MascotPicker';
import { applyBulkMemberAction, type BulkMemberAction } from './domain/bulkMembers';
import { isMascotId, type MascotId } from './domain/mascotIds';
import { createUuid } from './domain/ids';
import { mascotById } from './domain/mascots';
import { hasSessionAttendance, isSessionCheckinOpen, makeAttendanceSession, sessionAttendances, type AttendanceSession, type SessionAttendance, type SessionStatus } from './domain/sessionAttendance';

type Role = 'MANAGEMENT' | 'GUEST';
type View = 'overview' | 'members' | 'sessions' | 'followups' | 'activities';
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
  mascotId?: MascotId;
  mood: string;
  companion: string;
  checkedAt: string | null;
  activity: string;
  role: Role;
  isActive: boolean;
  pending?: boolean;
  reminderOptIn: boolean;
  streak: number;
};

type MemberStatus = 'active' | 'inactive' | 'pending';
type MemberDraft = {
  name: string;
  companion: string;
  animal: string;
  mascotId?: MascotId;
  status: MemberStatus;
  reminderOptIn: boolean;
};
type MemberSaveResult = 'success' | 'duplicate' | 'missing';

type ChatMessage = {
  id: string;
  author: string;
  animal: string;
  mascotId?: MascotId;
  text: string;
  time: string;
  mode: ChatMode;
};

type ActivityEvent = {
  id: string;
  memberName: string;
  emoji: string;
  mascotId?: MascotId;
  label: string;
  time: string;
};

type AppState = {
  members: Member[];
  sessions: AttendanceSession[];
  currentSessionId: string;
  attendances: SessionAttendance[];
  messages: ChatMessage[];
  activities: ActivityEvent[];
  sessionOpen: boolean;
  connected: boolean;
  sessionStatus: SessionStatus;
};

const STORAGE_KEY = 'ntc-pate-demo-state-v2';
const CHECKIN_TOKEN = 'nest-wednesday-2026-09-17';

export function getCheckinUrl(token = CHECKIN_TOKEN): string {
  if (typeof window === 'undefined') return '';
  const port = window.location.port ? `:${window.location.port}` : '';
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const lan = typeof __LAN_IP__ !== 'undefined' && __LAN_IP__ && __LAN_IP__ !== 'localhost' ? __LAN_IP__ : '';
  const host = isLocalhost && lan ? `${lan}${port}` : window.location.host;
  return `${window.location.protocol}//${host}/check-in/${token}`;
}

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

function memberStatus(member: Member): MemberStatus {
  return member.pending ? 'pending' : member.isActive ? 'active' : 'inactive';
}

function presentMembersForSession(state: AppState): Member[] {
  return sessionAttendances(state.attendances, state.currentSessionId)
    .slice()
    .sort((a, b) => b.checkedInAt.localeCompare(a.checkedInAt))
    .flatMap((attendance) => {
      const member = state.members.find((item) => item.id === attendance.memberId);
      return member ? [{ ...member, checkedAt: attendance.checkedAtLabel, mood: attendance.mood, mascotId: attendance.mascotId ?? member.mascotId, activity: 'Vừa check-in' }] : [];
    })
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
      companion: ['Nhóm Hạt giống', 'Nhóm Mầm xanh', 'Nhóm Cùng bước'][index % 3],
      checkedAt: present?.checkedAt ?? null,
      activity: present?.activity ?? 'Chưa hoạt động',
      role: 'GUEST',
      isActive: true,
      reminderOptIn: index !== 12 && index !== 22,
      streak: Math.max(0, 4 - (index % 5)),
    };
  });
  const session: AttendanceSession = {
    id: 'session-demo-2026-09-17', title: 'Tối thứ tư trong tổ', date: '2026-09-17T12:15:00.000Z',
    startsAt: '2026-09-17T12:15:00.000Z', qrToken: CHECKIN_TOKEN, status: 'live',
  };
  return {
    members,
    sessions: [session],
    currentSessionId: session.id,
    attendances: members.filter((member) => member.checkedAt).map((member, index) => ({
      id: `attendance-seed-${index + 1}`, sessionId: session.id, memberId: member.id, memberName: member.name,
      checkedAtLabel: member.checkedAt!, checkedInAt: `${session.date.slice(0, 10)}T${member.checkedAt}:00+07:00`, mood: member.mood,
    })),
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
    sessionStatus: 'live',
  };
}

function normalizeAppState(value: Partial<AppState> & { members: Member[] }): AppState {
  const seed = makeSeedState();
  if (Array.isArray(value.sessions) && value.sessions.length && Array.isArray(value.attendances) && value.currentSessionId) {
    return { ...seed, ...value, messages: value.messages ?? [], activities: value.activities ?? [] } as AppState;
  }
  const session = seed.sessions[0];
  const legacyStatus = value.sessionStatus ?? 'live';
  return {
    ...seed,
    ...value,
    members: value.members,
    sessions: [{ ...session, status: legacyStatus }],
    currentSessionId: session.id,
    attendances: value.members.filter((member) => member.checkedAt).map((member) => ({
      id: `attendance-migrated-${member.id}`, sessionId: session.id, memberId: member.id, memberName: member.name,
      checkedAtLabel: member.checkedAt!, checkedInAt: `${session.date.slice(0, 10)}T${member.checkedAt}:00+07:00`, mood: member.mood,
      mascotId: isMascotId(member.mascotId) ? member.mascotId : undefined,
    })),
    sessionOpen: value.sessionOpen ?? true,
    sessionStatus: legacyStatus,
    messages: value.messages ?? seed.messages,
    activities: value.activities ?? seed.activities,
  } as AppState;
}

function usePersistedState() {
  const [state, setState] = useState<AppState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? normalizeAppState(JSON.parse(stored)) : makeSeedState();
    } catch {
      return makeSeedState();
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);

  const stateRef = useRef(state);
  stateRef.current = state;

  // Sync state between mobile devices and computer in local demo mode
  useEffect(() => {
    if (isSupabaseConfigured) return undefined;
    let isMounted = true;

    // Fetch initial shared state
    void fetch('/api/sync')
      .then((res) => (res.ok ? res.json() : null))
      .then((remote: AppState | null) => {
        if (!isMounted) return;
        if (remote?.members) {
          setState(normalizeAppState(remote));
        } else {
          void fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(stateRef.current),
          });
        }
      })
      .catch(() => undefined);

    // Poll periodically to catch check-in events from phones in real-time
    const timer = setInterval(() => {
      void fetch('/api/sync')
        .then((res) => (res.ok ? res.json() : null))
        .then((remote: AppState | null) => {
          if (!isMounted || !remote?.members) return;
          const normalized = normalizeAppState(remote);
          setState((current) => {
            const curStr = JSON.stringify(current);
            const remStr = JSON.stringify(normalized);
            return curStr !== remStr ? normalized : current;
          });
        })
        .catch(() => undefined);
    }, 1200);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  const setSyncedState: typeof setState = (updater) => {
    setState((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater;
      if (!isSupabaseConfigured) {
        void fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(next),
        });
      }
      return next;
    });
  };

  return [state, setSyncedState] as const;
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

type AuthState = {
  ready: boolean;
  userEmail: string | null;
  isManagement: boolean;
  error: string;
  signIn: (email: string, password: string) => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
  signOut: () => Promise<void>;
};

function useAuthState(): AuthState {
  const [auth, setAuth] = useState({ ready: !isSupabaseConfigured, userEmail: null as string | null, isManagement: false, error: '' });
  useEffect(() => {
    const client = supabase;
    if (!client) return undefined;
    let mounted = true;
    const loadSession = async (session: { user: { id: string; email?: string } } | null) => {
      if (!session) { if (mounted) setAuth({ ready: true, userEmail: null, isManagement: false, error: '' }); return; }
      const { data } = await client.from('group_management').select('group_id').eq('profile_id', session.user.id).eq('is_active', true).limit(1);
      if (mounted) setAuth({ ready: true, userEmail: session.user.email ?? null, isManagement: Boolean(data?.length), error: '' });
    };
    void client.auth.getSession().then(({ data }) => loadSession(data.session));
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => { void loadSession(session); });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);
  const signIn = async (email: string, password: string) => {
    if (!supabase) return false;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setAuth((current) => ({ ...current, error: 'Email hoặc mật khẩu chưa đúng.' })); return false; }
    return true;
  };
  const signInWithGoogle = async () => {
    if (!supabase) return false;
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/management/members' } });
    if (error) { setAuth((current) => ({ ...current, error: 'Không thể mở đăng nhập Google lúc này.' })); return false; }
    return true;
  };
  const signOut = async () => { if (supabase) await supabase.auth.signOut(); };
  return { ...auth, signIn, signInWithGoogle, signOut };
}

function App() {
  const [state, setState] = usePersistedState();
  const auth = useAuthState();
  const [demoRole, setDemoRole] = useState<Role>('MANAGEMENT');
  const role: Role = isSupabaseConfigured ? (auth.isManagement ? 'MANAGEMENT' : 'GUEST') : demoRole;
  const [theme, setTheme] = useState<'light' | 'dark'>(() => localStorage.getItem('nest-theme') === 'dark' ? 'dark' : 'light');
  const [toast, setToast] = useState('');
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [qrFullscreen, setQrFullscreen] = useState(false);

  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => localStorage.setItem('nest-theme', theme), [theme]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3200);
  };

  const handleCheckin = (memberId: string, selectedMascotId: string, mood: string, qrToken: string) => {
    const session = state.sessions.find((item) => item.qrToken === qrToken && item.id === state.currentSessionId);
    if (!session || !isSessionCheckinOpen(session, state.sessionOpen)) return 'error' as const;
    const animal = 'panda';
    const guestName = memberId.startsWith('pending:') ? memberId.slice('pending:'.length).trim() : '';
    const matchingMember = guestName ? state.members.find((member) => member.name.trim().toLocaleLowerCase() === guestName.toLocaleLowerCase()) : undefined;
    const existing = state.members.find((member) => member.id === (matchingMember?.id ?? memberId));
    if (!existing && !guestName) return 'error' as const;
    if (existing && (!existing.isActive || existing.pending)) return 'error' as const;
    const profileMascot = existing && isMascotId(existing.mascotId) ? existing.mascotId : undefined;
    const mascotId = profileMascot ?? (isMascotId(selectedMascotId) ? selectedMascotId : undefined);
    if (!mascotId) return 'error' as const;
    const resolvedMemberId = existing?.id ?? `pending-${createUuid()}`;
    if (hasSessionAttendance(state.attendances, session.id, resolvedMemberId)) return 'duplicate' as const;

    const checkedAt = timeNow();
    const member: Member = existing ? {
      ...existing, mascotId, mood, checkedAt, activity: 'Vừa check-in',
    } : {
      id: resolvedMemberId, name: guestName, animal, mascotId, mood, companion: 'Chưa phân nhóm',
      checkedAt, activity: 'Vừa check-in', role: 'GUEST', isActive: true, pending: true,
      reminderOptIn: false, streak: 0,
    };
    const arrival: SessionAttendance = {
      id: `attendance-${createUuid()}`, sessionId: session.id, memberId: member.id, memberName: member.name,
      mascotId, checkedAtLabel: checkedAt, checkedInAt: new Date().toISOString(), mood,
    };
    setState((previous) => ({
      ...previous,
      members: existing
        ? previous.members.map((item) => item.id === existing.id ? member : item)
        : [...previous.members, member],
      attendances: [...previous.attendances, arrival],
      activities: [{ id: `activity-${Date.now()}`, memberName: member.name, emoji: animalByKey(animal).emoji, mascotId, label: 'Vừa check-in', time: checkedAt }, ...previous.activities],
    }));
    return 'success' as const;
  };

  const handleCreateMember = (draft: MemberDraft): MemberSaveResult => {
    const name = draft.name.trim();
    if (!name) return 'missing';
    if (state.members.some((member) => member.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase())) return 'duplicate';
    const member: Member = {
      id: `member-${Date.now()}`,
      name,
      animal: draft.animal,
      mascotId: draft.mascotId,
      mood: 'Bình an',
      companion: draft.companion,
      checkedAt: null,
      activity: 'Chưa hoạt động',
      role: 'GUEST',
      isActive: draft.status !== 'inactive',
      pending: draft.status === 'pending',
      reminderOptIn: draft.reminderOptIn,
      streak: 0,
    };
    setState((previous) => ({ ...previous, members: [...previous.members, member] }));
    notify(`Đã thêm ${name} vào danh sách thành viên`);
    return 'success';
  };

  const handleUpdateMember = (id: string, draft: MemberDraft): MemberSaveResult => {
    const name = draft.name.trim();
    if (!name) return 'missing';
    if (state.members.some((member) => member.id !== id && member.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase())) return 'duplicate';
    setState((previous) => ({
      ...previous,
      members: previous.members.map((member) => member.id === id ? {
        ...member,
        name,
        companion: draft.companion,
        animal: draft.animal,
        mascotId: draft.mascotId,
        isActive: draft.status !== 'inactive',
        pending: draft.status === 'pending',
        reminderOptIn: draft.reminderOptIn,
      } : member),
    }));
    notify(`Đã cập nhật hồ sơ của ${name}`);
    return 'success';
  };

  const handleDeleteMember = (id: string) => {
    const member = state.members.find((item) => item.id === id);
    setState((previous) => ({ ...previous, members: previous.members.filter((item) => item.id !== id), attendances: previous.attendances.filter((attendance) => attendance.memberId !== id) }));
    if (member) notify(`Đã xóa ${member.name} khỏi danh sách`);
  };

  const handleSetMemberStatus = (id: string, status: MemberStatus) => {
    setState((previous) => ({
      ...previous,
      members: previous.members.map((member) => member.id === id ? { ...member, isActive: status !== 'inactive', pending: status === 'pending' } : member),
    }));
    const label = status === 'active' ? 'đang hoạt động' : status === 'pending' ? 'chờ duyệt' : 'tạm dừng';
    notify(`Đã chuyển thành viên sang trạng thái ${label}`);
  };

  const handleBulkMemberAction = (ids: string[], action: BulkMemberAction) => {
    const selected = state.members.filter((member) => ids.includes(member.id));
    setState((previous) => ({ ...previous, members: applyBulkMemberAction(previous.members, ids, action), attendances: action === 'delete' ? previous.attendances.filter((attendance) => !ids.includes(attendance.memberId)) : previous.attendances }));
    const description = action === 'delete' ? 'xóa' : action === 'deactivate' ? 'tạm dừng' : 'kích hoạt';
    notify(`Đã ${description} ${selected.length} thành viên`);
  };

  const handleSetSessionOpen = (open: boolean) => setState((previous) => {
    const current = previous.sessions.find((session) => session.id === previous.currentSessionId);
    if (!current || current.status === 'closed') return previous;
    return { ...previous, sessionOpen: open };
  });

  const handleSetSessionStatus = (status: SessionStatus) => setState((previous) => ({
    ...previous,
    sessionStatus: status,
    sessionOpen: status === 'live' || status === 'published',
    sessions: previous.sessions.map((session) => session.id === previous.currentSessionId ? { ...session, status } : session),
  }));

  const handleCreateSession = () => {
    const session = makeAttendanceSession('live');
    setState((previous) => ({
      ...previous,
      sessions: [...previous.sessions.map((item) => item.id === previous.currentSessionId ? { ...item, status: 'closed' as const } : item), session],
      currentSessionId: session.id,
      sessionStatus: 'live',
      sessionOpen: true,
      members: previous.members.map((member) => ({ ...member, checkedAt: null, activity: 'Chưa hoạt động' })),
    }));
    notify('Đã mở buổi nhóm mới với mã QR riêng');
  };

  const currentParticipant = () => {
    try {
      const name = localStorage.getItem('ntc-checkin-name') ?? '';
      return state.members.find(m => m.checkedAt && m.name === name);
    } catch { return undefined; }
  };

  const handleSendMessage = (text: string, mode: ChatMode) => {
    setState((previous) => ({
      ...previous,
      messages: [...previous.messages, { id: `message-${Date.now()}`, author: mode === 'anonymous' ? 'Một người bạn' : (currentParticipant()?.name ?? 'Mai Anh'), animal: currentParticipant()?.animal ?? 'panda', mascotId: mode === 'public' ? currentParticipant()?.mascotId : undefined, text, time: timeNow(), mode }],
    }));
  };

  const handleActivity = (label: string) => {
    setState((previous) => ({
      ...previous,
      activities: [{ id: `activity-${Date.now()}`, memberName: currentParticipant()?.name ?? 'Mai Anh', emoji: animalByKey(currentParticipant()?.animal ?? 'panda').emoji, mascotId: currentParticipant()?.mascotId, label, time: timeNow() }, ...previous.activities],
    }));
  };

  const handleModerateMessage = (id: string) => {
    setState((previous) => ({ ...previous, messages: previous.messages.filter((message) => message.id !== id) }));
    notify('Tin nhắn đã được ẩn khỏi phòng');
  };

  const activeSession = state.sessions.find((session) => session.id === state.currentSessionId);
  return <BrowserRouter><NestRouter state={state} role={role} auth={auth} theme={theme} followUpOpen={followUpOpen} qrFullscreen={qrFullscreen} toast={toast} onRoleChange={setDemoRole} onThemeToggle={() => setTheme((current) => current === 'light' ? 'dark' : 'light')} onOpenFollowUp={() => setFollowUpOpen(true)} onCloseFollowUp={() => setFollowUpOpen(false)} onSetQrFullscreen={setQrFullscreen} onSetSessionOpen={handleSetSessionOpen} onSetSessionStatus={handleSetSessionStatus} onCreateSession={handleCreateSession} onSetConnected={(connected) => setState((previous) => ({ ...previous, connected }))} onCopy={() => { navigator.clipboard?.writeText(getCheckinUrl(activeSession?.qrToken)); notify('Đã sao chép link check-in'); }} onFullscreen={() => setQrFullscreen(true)} onNotify={notify} onSendMessage={handleSendMessage} onActivity={handleActivity} onModerateMessage={handleModerateMessage} onCheckin={handleCheckin} onCreateMember={handleCreateMember} onUpdateMember={handleUpdateMember} onDeleteMember={handleDeleteMember} onSetMemberStatus={handleSetMemberStatus} onBulkMemberAction={handleBulkMemberAction} /></BrowserRouter>;
}

type NestRouterProps = {
  state: AppState;
  role: Role;
  auth: AuthState;
  theme: 'light' | 'dark';
  followUpOpen: boolean;
  qrFullscreen: boolean;
  toast: string;
  onRoleChange: (role: Role) => void;
  onThemeToggle: () => void;
  onOpenFollowUp: () => void;
  onCloseFollowUp: () => void;
  onSetQrFullscreen: (open: boolean) => void;
  onSetSessionOpen: (open: boolean) => void;
  onSetSessionStatus: (status: AppState['sessionStatus']) => void;
  onSetConnected: (connected: boolean) => void;
  onCopy: () => void;
  onFullscreen: () => void;
  onNotify: (message: string) => void;
  onSendMessage: (text: string, mode: ChatMode) => void;
  onActivity: (label: string) => void;
  onModerateMessage: (id: string) => void;
  onCheckin: (memberId: string, mascotId: string, mood: string, qrToken: string) => 'success' | 'duplicate' | 'error';
  onCreateSession: () => void;
  onCreateMember: (draft: MemberDraft) => MemberSaveResult;
  onUpdateMember: (id: string, draft: MemberDraft) => MemberSaveResult;
  onDeleteMember: (id: string) => void;
  onSetMemberStatus: (id: string, status: MemberStatus) => void;
  onBulkMemberAction: (ids: string[], action: BulkMemberAction) => void;
};

function AuthLoading() { return <div className="auth-page"><div className="auth-card"><NestMark /><p>Đang kiểm tra phiên đăng nhập...</p></div></div>; }

function ManagementLogin({ auth }: { auth: AuthState }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!email || !password) return; setPending(true); await auth.signIn(email, password); setPending(false); };
  return <div className="auth-page"><div className="auth-card"><div className="public-brand"><NestMark /><span>NEST</span></div><div className="eyebrow">NTC PATE · BAN ĐIỀU HÀNH</div><h1>Chào mừng bạn trở lại.</h1><p>Đăng nhập để quản lý thành viên, buổi nhóm và những lời hỏi thăm riêng tư.</p><form className="auth-form" onSubmit={submit}><label className="field-label">Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" required /></label><label className="field-label">Mật khẩu<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="••••••••" required /></label>{auth.error && <p className="form-error" role="alert">{auth.error}</p>}<button className="button button-dark full-width" type="submit" disabled={pending}>{pending ? 'Đang đăng nhập...' : 'Đăng nhập'} <ArrowRight size={17} /></button></form><div className="auth-divider"><span>hoặc</span></div><button className="button button-secondary full-width" onClick={() => { void auth.signInWithGoogle(); }}>Tiếp tục với Google</button><small className="auth-footnote">Quyền Management được xác nhận từ group_management, không từ role switcher.</small></div></div>;
}

function NestRouter({ state, role, auth, theme, followUpOpen, qrFullscreen, toast, onRoleChange, onThemeToggle, onOpenFollowUp, onCloseFollowUp, onSetQrFullscreen, onSetSessionOpen, onSetSessionStatus, onCreateSession, onSetConnected, onCopy, onFullscreen, onNotify, onSendMessage, onActivity, onModerateMessage, onCheckin, onCreateMember, onUpdateMember, onDeleteMember, onSetMemberStatus, onBulkMemberAction }: NestRouterProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const route = location.pathname;
  const view: View = route.includes('/members') ? 'members' : route.includes('/sessions') ? 'sessions' : route.includes('/follow-ups') ? 'followups' : route.includes('/activities') ? 'activities' : 'overview';
  if (route.startsWith('/check-in/')) return <CheckInScreen state={state} qrToken={decodeURIComponent(route.slice('/check-in/'.length))} onCheckin={onCheckin} onBack={() => navigate('/room/today')} />;
  if (route.startsWith('/present/')) return <PresentationPage state={state} onBack={() => navigate('/room/today')} />;
  if (route.startsWith('/session/')) return <GuestSessionPage state={state} onNavigate={navigate} />;
  if (route.startsWith('/management/') && isSupabaseConfigured && (!auth.ready || !auth.userEmail || !auth.isManagement)) return auth.ready ? <ManagementLogin auth={auth} /> : <AuthLoading />;
  return <><AppShell state={state} role={role} auth={auth} view={view} theme={theme} onRoleChange={onRoleChange} onThemeToggle={onThemeToggle} onNavigate={navigate} onOpenFollowUp={onOpenFollowUp} onSetSessionOpen={onSetSessionOpen} onSetSessionStatus={onSetSessionStatus} onCreateSession={onCreateSession} onSetConnected={onSetConnected} onCopy={onCopy} onFullscreen={onFullscreen} onNotify={onNotify} onSendMessage={onSendMessage} onActivity={onActivity} onModerateMessage={onModerateMessage} onCreateMember={onCreateMember} onUpdateMember={onUpdateMember} onDeleteMember={onDeleteMember} onSetMemberStatus={onSetMemberStatus} onBulkMemberAction={onBulkMemberAction} /><>{followUpOpen && <FollowUpModal state={state} onClose={onCloseFollowUp} onNotify={onNotify} />}</>{qrFullscreen && <QrModal token={state.sessions.find((session) => session.id === state.currentSessionId)?.qrToken} onClose={() => onSetQrFullscreen(false)} />}{toast && <div className="toast" role="status" aria-live="polite"><CheckCircle size={18} weight="fill" />{toast}</div>}</>;
}

function AppShell({
  state, role, auth, view, theme, onRoleChange, onThemeToggle, onNavigate, onOpenFollowUp, onSetSessionOpen, onSetSessionStatus, onCreateSession, onSetConnected, onCopy, onFullscreen, onNotify, onSendMessage, onActivity, onModerateMessage, onCreateMember, onUpdateMember, onDeleteMember, onSetMemberStatus, onBulkMemberAction,
}: {
  state: AppState; role: Role; auth: AuthState; view: View; theme: 'light' | 'dark'; onRoleChange: (role: Role) => void; onThemeToggle: () => void; onNavigate: (path: string) => void; onOpenFollowUp: () => void; onSetSessionOpen: (open: boolean) => void; onSetSessionStatus: (status: SessionStatus) => void; onCreateSession: () => void; onSetConnected: (connected: boolean) => void; onCopy: () => void; onFullscreen: () => void; onNotify: (message: string) => void; onSendMessage: (text: string, mode: ChatMode) => void; onActivity: (label: string) => void; onModerateMessage: (id: string) => void; onCreateMember: (draft: MemberDraft) => MemberSaveResult; onUpdateMember: (id: string, draft: MemberDraft) => MemberSaveResult; onDeleteMember: (id: string) => void; onSetMemberStatus: (id: string, status: MemberStatus) => void; onBulkMemberAction: (ids: string[], action: BulkMemberAction) => void;
}) {
  const presentCount = presentMembersForSession(state).length;
  const currentSession = state.sessions.find((session) => session.id === state.currentSessionId);
  const sessionDateLabel = currentSession ? new Date(currentSession.date).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' }) : '';
  const canLead = canViewAbsence(role);
  return (
    <div className="app-shell">
      <Sidebar role={role} view={view} presentCount={presentCount} onNavigate={onNavigate} members={state.members} />
      <div className="app-content">
        <header className="topbar">
          <div className="mobile-brand"><NestMark small /><span>NEST</span></div>
          <div className="topbar-context"><span className="context-dot" /> NTC PATE <span className="context-divider" /> {sessionDateLabel}</div>
          <div className="topbar-actions">
            <button className="icon-button hide-mobile" aria-label="Tìm kiếm"><MagnifyingGlass size={20} /></button>
            <button className="icon-button hide-mobile" aria-label="Thông báo"><Bell size={20} /><span className="notification-dot" /></button>
            <button className="theme-toggle" onClick={onThemeToggle} aria-label={theme === 'light' ? 'Bật chế độ tối' : 'Bật chế độ sáng'}>{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button>
            {isSupabaseConfigured ? <div className="auth-chip"><ShieldCheck size={17} /><span>{auth.userEmail ?? 'Guest'}</span>{auth.userEmail && <button onClick={() => { void auth.signOut(); }} aria-label="Đăng xuất">Đăng xuất</button>}</div> : <div className="role-picker"><UserCircle size={19} /><select value={role} onChange={(event) => onRoleChange(event.target.value as Role)} aria-label="Vai trò review"><option value="MANAGEMENT">Management</option><option value="GUEST">Guest</option></select><CaretDown size={14} /></div>}
          </div>
        </header>
        <main className="page-main">
          {view === 'overview' && <OverviewPage state={state} role={role} presentCount={presentCount} onOpenFollowUp={onOpenFollowUp} onSetSessionOpen={onSetSessionOpen} onCreateSession={onCreateSession} onSetConnected={onSetConnected} onCopy={onCopy} onFullscreen={onFullscreen} onNotify={onNotify} onSendMessage={onSendMessage} onActivity={onActivity} onModerateMessage={onModerateMessage} onOpenCheckin={() => onNavigate(`/check-in/${state.sessions.find((session) => session.id === state.currentSessionId)?.qrToken ?? ''}`)} />}
          {view === 'members' && (canLead ? <MembersPage state={state} canLead={canLead} onNotify={onNotify} onCreateMember={onCreateMember} onUpdateMember={onUpdateMember} onDeleteMember={onDeleteMember} onSetMemberStatus={onSetMemberStatus} onBulkMemberAction={onBulkMemberAction} /> : <AccessDenied />)}
          {view === 'sessions' && (canLead ? <SessionsPage state={state} canLead={canLead} onSetSessionOpen={onSetSessionOpen} onSetSessionStatus={onSetSessionStatus} onCreateSession={onCreateSession} /> : <AccessDenied />)}
          {view === 'followups' && canLead && <FollowUpsPage state={state} onOpenFollowUp={onOpenFollowUp} onNotify={onNotify} />}
          {view === 'followups' && !canLead && <AccessDenied />}
          {view === 'activities' && <ActivityHub state={state} role={role} onNotify={onNotify} />}
        </main>
        <MobileNav view={view} role={role} onNavigate={onNavigate} />
      </div>
    </div>
  );
}

function NestMark({ small = false }: { small?: boolean }) {
  return <span className={`nest-mark ${small ? 'nest-mark-small' : ''}`} aria-hidden="true"><span className="nest-mark-line" /><span className="nest-mark-dot" /></span>;
}

function Sidebar({ role, view, presentCount, onNavigate, members }: { role: Role; view: View; presentCount: number; onNavigate: (path: string) => void; members: Member[] }) {
  let participant: Member | undefined;
  try { participant = members.find(m => m.checkedAt && m.name === localStorage.getItem('ntc-checkin-name')); } catch { /* device storage unavailable */ }
  const nav = [
    { key: 'overview' as View, label: 'Tổng quan', icon: House, path: '/room/today' },
    ...(role === 'MANAGEMENT' ? [{ key: 'members' as View, label: 'Thành viên', icon: UsersThree, path: '/management/members' }, { key: 'sessions' as View, label: 'Buổi nhóm', icon: CalendarBlank, path: '/management/sessions' }] : [{ key: 'sessions' as View, label: 'Buổi nhóm', icon: CalendarBlank, path: '/session/today' }]),
    { key: 'activities' as View, label: 'Tương tác', icon: Sparkle, path: '/room/activities' },
    ...(role === 'MANAGEMENT' ? [{ key: 'followups' as View, label: 'Hỏi thăm', icon: Heart, path: '/management/follow-ups' }] : []),
  ];
  return (
    <aside className="sidebar">
      <div className="brand-lockup"><NestMark /><div><div className="brand-name">NEST</div><div className="brand-tagline">Kết nối thật, lớn lên cùng nhau.</div></div></div>
      <div className="group-switcher"><div className="group-avatar">NP</div><div className="group-switcher-copy"><strong>NTC PATE</strong><span>Nhóm nhỏ sinh viên</span></div><CaretDown size={16} /></div>
      <div className="nav-label">Không gian chung</div>
      <nav className="sidebar-nav" aria-label="Điều hướng chính">
        {nav.map(({ key, label, icon: Icon, path }) => <button key={key} className={`nav-item ${view === key ? 'active' : ''}`} onClick={() => onNavigate(path)}><Icon size={20} weight={view === key ? 'fill' : 'regular'} /><span>{label}</span>{key === 'followups' && <span className="nav-count">24</span>}</button>)}
      </nav>
      <div className="sidebar-spacer" />
      <div className="sidebar-note"><div className="sidebar-note-icon"><Sparkle size={18} weight="fill" /></div><div><strong>Nhịp nhỏ, niềm vui lớn</strong><span>Hôm nay đã có {presentCount} người cùng hiện diện.</span></div></div>
      <div className="sidebar-bottom"><button className="nav-item"><GearSix size={20} /><span>Cài đặt nhóm</span></button><button className="nav-item"><SignOut size={20} /><span>Đăng xuất</span></button><div className="profile-row"><div className="avatar avatar-panda"><MascotAvatar id={participant?.mascotId} fallback={animalByKey(participant?.animal ?? 'panda').emoji} size={31} /></div><div className="profile-copy"><strong>{participant?.name ?? 'Mai Anh'}</strong><span>{roleLabel(role)}</span></div><DotsThree size={20} /></div></div>
    </aside>
  );
}

function roleLabel(role: Role) { return role === 'MANAGEMENT' ? 'Ban điều hành' : 'Khách tham dự'; }

function MobileNav({ view, role, onNavigate }: { view: View; role: Role; onNavigate: (path: string) => void }) {
  const items = [
    { key: 'overview' as View, label: 'Phòng', icon: House, path: '/room/today' },
    ...(role === 'MANAGEMENT' ? [{ key: 'members' as View, label: 'Tổ', icon: UsersThree, path: '/management/members' }] : []),
    ...(role === 'MANAGEMENT' ? [{ key: 'followups' as View, label: 'Hỏi thăm', icon: Heart, path: '/management/follow-ups' }] : []),
    { key: 'sessions' as View, label: 'Lịch', icon: CalendarBlank, path: role === 'MANAGEMENT' ? '/management/sessions' : '/session/today' },
    { key: 'activities' as View, label: 'Tương tác', icon: Sparkle, path: '/room/activities' },
  ];
  return <nav className="mobile-nav" aria-label="Điều hướng di động">{items.map(({ key, label, icon: Icon, path }) => <button key={key} className={view === key ? 'active' : ''} onClick={() => onNavigate(path)}><Icon size={21} weight={view === key ? 'fill' : 'regular'} /><span>{label}</span></button>)}</nav>;
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action && <div className="heading-action">{action}</div>}</div>;
}

function OverviewPage({ state, role, presentCount, onOpenFollowUp, onSetSessionOpen, onCreateSession, onSetConnected, onCopy, onFullscreen, onNotify, onSendMessage, onActivity, onModerateMessage, onOpenCheckin }: { state: AppState; role: Role; presentCount: number; onOpenFollowUp: () => void; onSetSessionOpen: (open: boolean) => void; onCreateSession: () => void; onSetConnected: (connected: boolean) => void; onCopy: () => void; onFullscreen: () => void; onNotify: (message: string) => void; onSendMessage: (text: string, mode: ChatMode) => void; onActivity: (label: string) => void; onModerateMessage: (id: string) => void; onOpenCheckin: () => void }) {
  const canLead = canViewAbsence(role);
  const presentIds = new Set(sessionAttendances(state.attendances, state.currentSessionId).map((attendance) => attendance.memberId));
  const absentCount = state.members.filter((member) => member.isActive && !member.pending && !presentIds.has(member.id)).length;
  return (
    <>
      <PageHeading eyebrow="Phòng sinh hoạt" title="Tối thứ tư trong tổ" description="Mỗi người đến là một đốm sáng nhỏ trong khu rừng này." action={<div className={`connection-status ${state.connected ? '' : 'offline'}`}><span className="status-light" />{state.connected ? 'Realtime đang bật' : 'Mất kết nối'}<button onClick={() => onSetConnected(!state.connected)} aria-label="Đổi trạng thái kết nối"><WifiHigh size={15} /></button></div>} />
      {!state.connected && <div className="offline-banner"><Info size={18} /><span>Kết nối realtime đang chập chờn. Các thay đổi mới sẽ đồng bộ khi mạng ổn định.</span><button onClick={() => onSetConnected(true)}>Thử kết nối lại</button></div>}
      <section className="room-grid">
        <div className="room-main-column">
          <CheckinHero state={state} onSetSessionOpen={onSetSessionOpen} onCreateSession={onCreateSession} onCopy={onCopy} onFullscreen={onFullscreen} onNotify={onNotify} onOpenCheckin={onOpenCheckin} />
          <AttendanceStats presentCount={presentCount} total={state.members.length} publicMode={role === 'GUEST'} />
          <ArrivalSpotlight state={state} />
          <ForestSection state={state} />
        </div>
        <aside className="room-side-column"><ChatPanel state={state} role={role} onNotify={onNotify} onSendMessage={onSendMessage} onModerateMessage={onModerateMessage} /><QuickPulse state={state} onNotify={onNotify} onActivity={onActivity} />{canLead && <FollowUpCard absentCount={absentCount} onOpen={onOpenFollowUp} />}</aside>
      </section>
    </>
  );
}

function CheckinHero({ state, onSetSessionOpen, onCreateSession, onCopy, onFullscreen, onNotify, onOpenCheckin }: { state: AppState; onSetSessionOpen: (open: boolean) => void; onCreateSession: () => void; onCopy: () => void; onFullscreen: () => void; onNotify: (message: string) => void; onOpenCheckin: () => void }) {
  const currentSession = state.sessions.find((session) => session.id === state.currentSessionId);
  const sessionIsClosed = currentSession?.status === 'closed';
  const checkinUrl = getCheckinUrl(currentSession?.qrToken);
  return (
    <section className="checkin-hero">
      <div className="hero-copy"><div className="hero-topline"><span className="live-badge"><span className="live-dot" />{sessionIsClosed ? 'Buổi đã kết thúc' : state.sessionOpen ? 'Đang diễn ra' : 'Đã tạm dừng'}</span><span className="hero-time"><Clock size={13} /> {currentSession ? new Date(currentSession.date).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long' }) : 'BUỔI NHÓM'} · 19:15</span></div><h2>Chạm cửa rồi?<br /><em>Vào tổ thôi.</em></h2><p>Quét mã của buổi này để điểm danh. Bạn đồng hành đã chọn sẽ tiếp tục cùng bạn.</p><div className="hero-actions"><button className="button button-lime" onClick={sessionIsClosed ? onCreateSession : onOpenCheckin}>{sessionIsClosed ? 'Mở buổi nhóm mới' : 'Mở form check-in'} <ArrowRight size={18} /></button><button className="button button-ghost-light" onClick={() => { onCopy(); onNotify('Đã sao chép link check-in của buổi hiện tại'); }}><LinkSimple size={17} />Sao chép link</button></div>{!sessionIsClosed && <button className="session-toggle" onClick={() => onSetSessionOpen(!state.sessionOpen)}>{state.sessionOpen ? 'Tạm dừng check-in' : 'Mở lại check-in'} <span>{state.sessionOpen ? 'Đang mở' : 'Đang tạm dừng'}</span></button>}</div>
      <div className="qr-wrap"><div className="qr-frame"><QRCodeCanvas value={checkinUrl} size={166} bgColor="#ffffff" fgColor="#20201f" includeMargin aria-label="Mã QR check-in của buổi tối thứ tư" /></div><div className="qr-caption"><QrCode size={17} /><span>Quét để vào tổ</span><button onClick={onFullscreen} aria-label="Mở QR toàn màn hình"><ArrowsOut size={17} /></button></div><div className="qr-wifi-badge"><WifiHigh size={13} /> Cùng Wi-Fi quét mở được ngay</div></div>
      <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
    </section>
  );
}

function ClockIcon() { return <Clock size={13} className="clock-icon" />; }

function AttendanceStats({ presentCount, total, publicMode = false }: { presentCount: number; total: number; publicMode?: boolean }) {
  const absent = total - presentCount;
  const percentage = Math.round((presentCount / total) * 100);
  return <section className="stats-strip"><div className="stat-primary"><div className="stat-ring" style={{ '--progress': `${percentage * 3.6}deg` } as CSSProperties}><div><strong>{presentCount}</strong><span>/ {total}</span></div></div><div><div className="stat-kicker">ĐÃ ĐẾN</div><h3>Khu rừng đang thức</h3><p>Những khuôn mặt đã có mặt tối nay.</p></div></div><div className="stat-item"><span className="stat-icon stat-icon-lime"><Check size={17} weight="bold" /></span><div><strong>{presentCount}/{total}</strong><span>đã đến</span></div></div>{publicMode ? <div className="stat-item"><span className="stat-icon stat-icon-purple"><ChatsCircle size={17} weight="bold" /></span><div><strong>{presentCount}</strong><span>đang cùng tương tác</span></div></div> : <><div className="stat-item"><span className="stat-icon stat-icon-orange"><UserPlus size={17} weight="bold" /></span><div><strong>{absent}</strong><span>chưa đến</span></div></div><div className="stat-item"><span className="stat-icon stat-icon-purple"><Pulse size={17} weight="bold" /></span><div><strong>{percentage}%</strong><span>tỷ lệ tham dự</span></div></div></>}</section>;
}

function ForestSection({ state }: { state: AppState }) {
  const present = presentMembersForSession(state);
  return <section className="forest-section"><div className="section-heading"><div><div className="eyebrow">Sự hiện diện</div><h2>Khu rừng đang thức <span className="section-spark">✦</span></h2></div><span className="member-count">{present.length} khuôn mặt</span></div>{present.length === 0 ? <div className="empty-state"><div className="empty-illustration">🌱</div><h3>Rừng đang chờ những bước chân đầu tiên</h3><p>Mở QR để mời mọi người cùng vào tổ.</p></div> : <div className="forest-grid">{present.map((member) => <MemberCard key={member.id} member={member} />)}</div>}</section>;
}

function ArrivalSpotlight({ state }: { state: AppState }) {
  const latest = sessionAttendances(state.attendances, state.currentSessionId).slice().sort((a, b) => b.checkedInAt.localeCompare(a.checkedInAt))[0];
  const latestRef = useRef(latest);
  latestRef.current = latest;
  const latestId = latest?.id;
  const seenId = useRef<string | undefined>(latest?.id);
  const mounted = useRef(false);
  const [arrival, setArrival] = useState<SessionAttendance | null>(null);
  useEffect(() => {
    const currentLatest = latestRef.current;
    if (!mounted.current) { mounted.current = true; seenId.current = currentLatest?.id; return; }
    if (currentLatest && currentLatest.id !== seenId.current) {
      seenId.current = currentLatest.id;
      setArrival(currentLatest);
      const arrivalId = currentLatest.id;
      const timer = window.setTimeout(() => setArrival((current) => current?.id === arrivalId ? null : current), 4500);
      return () => window.clearTimeout(timer);
    }
    seenId.current = latestId;
  }, [latestId]);
  if (!arrival) return null;
  const member = state.members.find((item) => item.id === arrival.memberId);
  const mascotId = arrival.mascotId ?? member?.mascotId;
  return <section key={arrival.id} className="arrival-spotlight" role="status" aria-live="polite">
    <div className="arrival-spotlight-mascot">{mascotId ? <Mascot id={mascotId} state="celebrating" animated size={76} /> : <MascotAvatar fallback={animalByKey(member?.animal ?? 'panda').emoji} size={64} />}</div>
    <div><span className="eyebrow">MỘT NGƯỜI BẠN VỪA ĐẾN</span><strong>{arrival.memberName} is here!</strong><span>Chào mừng {arrival.memberName} đến buổi nhóm hôm nay 🌿</span></div>
  </section>;
}

function MemberCard({ member }: { member: Member }) {
  const animal = animalByKey(member.animal);
  const justActive = member.activity !== 'Vừa check-in' && member.activity !== 'Chưa hoạt động';
  return <article className={`member-card ${member.activity === 'Vừa check-in' ? 'member-card-new' : ''}`}><div className="member-card-head"><div className="animal-avatar" style={{ background: animal.soft }}><MascotAvatar id={member.mascotId} fallback={animal.emoji} size={40} /></div><span className="presence-dot" aria-label="Đang có mặt" /></div><div className="member-card-copy"><strong>{member.name}</strong><span>{member.checkedAt} <span className="card-separator">•</span> {member.mood}</span></div><div className={`member-activity ${justActive ? 'is-active' : ''}`}>{justActive && <span className="activity-pulse" />}{member.activity}</div></article>;
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
  return <section className="chat-panel"><div className="panel-heading"><div><div className="eyebrow">Cùng hiện diện</div><h2>Chuyện trong tổ</h2></div><button className="icon-button" aria-label="Tùy chọn trò chuyện"><DotsThree size={20} /></button></div><div className="chat-notice"><ShieldCheck size={17} weight="fill" /><span>Hãy tử tế với nhau. Bạn có thể nhắn ẩn danh, Ban điều hành vẫn có thể hỗ trợ khi cần.</span></div><div className="chat-mode-toggle" role="group" aria-label="Chế độ hiển thị tin nhắn"><button className={mode === 'public' ? 'active' : ''} onClick={() => setMode('public')}><UserCircle size={16} /> Công khai</button><button className={mode === 'anonymous' ? 'active' : ''} onClick={() => setMode('anonymous')}><span className="ghost-glyph">✦</span> Ẩn danh</button></div><div className="message-list">{state.messages.length === 0 ? <div className="chat-empty"><ChatsCircle size={26} /><span>Chưa có lời nhắn nào.<br />Mở lời đầu tiên nhé.</span></div> : state.messages.map((message) => <div className="message-row" key={message.id}><div className="message-avatar" style={{ background: animalByKey(message.animal).soft }}>{message.mode === 'anonymous' ? '✦' : <MascotAvatar id={message.mascotId} fallback={animalByKey(message.animal).emoji} size={29} />}</div><div className="message-body"><div className="message-meta"><strong>{message.mode === 'anonymous' ? 'Một người bạn' : message.author}</strong><span>{message.time}</span></div><p>{message.text}</p>{role === 'MANAGEMENT' && <button className="message-moderate" onClick={() => onModerateMessage(message.id)}><Trash size={12} /> Ẩn tin nhắn</button>}</div></div>)}</div><form className="chat-form" onSubmit={sendMessage}><div className="chat-input-wrap"><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={mode === 'public' ? 'Nói điều gì đó tử tế…' : 'Nhắn ẩn danh, vẫn thật tử tế…'} aria-label="Nội dung tin nhắn" maxLength={280} /><button type="submit" aria-label="Gửi tin nhắn"><PaperPlaneTilt size={18} weight="fill" /></button></div><div className="chat-form-foot"><span>{mode === 'anonymous' ? 'Ẩn danh với thành viên' : 'Hiển thị tên và linh vật'}</span><span>{draft.length}/280</span></div></form></section>;
}

function QuickPulse({ state, onNotify, onActivity }: { state: AppState; onNotify: (message: string) => void; onActivity: (label: string) => void }) {
  const [active, setActive] = useState<string | null>(null);
  const react = (key: string, label: string) => { setActive(key); onActivity(label); onNotify(`${label} đã được ghi nhận`); window.setTimeout(() => setActive(null), 500); };
  return <section className="pulse-panel"><div className="panel-heading compact"><div><div className="eyebrow">Một chạm nhỏ</div><h2>Gửi một chút điều lành</h2></div><Sparkle size={20} className="purple-icon" /></div><div className="pulse-grid">{QUICK_ACTIVITIES.map(({ key, label, icon: Icon }) => <button key={key} className={`pulse-button ${active === key ? 'pressed' : ''}`} onClick={() => react(key, label)}><span><Icon size={19} weight="duotone" /></span><small>{label}</small></button>)}</div>{state.activities[0] && <div className="latest-pulse"><span className="pulse-avatar"><MascotAvatar id={state.activities[0].mascotId} fallback={state.activities[0].emoji} size={22} state={state.activities[0].label === 'Xin cầu nguyện' ? 'listening' : 'encouraging'} /></span><span><strong>{state.activities[0].memberName}</strong> vừa chọn <b>{state.activities[0].label}</b></span><time>{state.activities[0].time}</time></div>}</section>;
}

function FollowUpCard({ absentCount, onOpen }: { absentCount: number; onOpen: () => void }) {
  return <section className="followup-card"><div className="followup-icon"><EnvelopeSimple size={21} weight="duotone" /></div><div className="eyebrow">Chăm sóc riêng tư</div><h2>Hẹn nhau tuần sau nhé?</h2><p>Hỏi thăm riêng tư, không gây áp lực hay công khai người vắng.</p><button className="button button-dark" onClick={onOpen}>Khích lệ {absentCount} bạn <ArrowRight size={17} /></button><div className="followup-orbit" /></section>;
}

function FollowUpModal({ state, onClose, onNotify }: { state: AppState; onClose: () => void; onNotify: (message: string) => void }) {
  const [message, setMessage] = useState('Tụi mình nhớ bạn 🫶 Tuần sau 19:15, ghé nhóm chung với tụi mình nhé!');
  const [selected, setSelected] = useState<string[]>(state.members.filter((member) => !member.checkedAt).slice(0, 4).map((member) => member.id));
  const absent = state.members.filter((member) => !member.checkedAt);
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  return <Modal title="Gửi lời hỏi thăm" onClose={onClose} wide><p className="modal-lead">Chọn những người bạn muốn nhắn riêng. Họ sẽ nhận được lời mời nhẹ nhàng, không phải một lời nhắc điểm danh.</p><div className="recipient-list">{absent.slice(0, 8).map((member) => <label className="recipient-row" key={member.id}><input type="checkbox" checked={selected.includes(member.id)} onChange={() => toggle(member.id)} /><span className="animal-avatar small" style={{ background: animalByKey(member.animal).soft }}><MascotAvatar id={member.mascotId} fallback={animalByKey(member.animal).emoji} size={34} /></span><span><strong>{member.name}</strong><small>{member.companion} <span className="card-separator">•</span> vắng {member.streak + 1} tuần</small></span><Check size={17} className="recipient-check" /></label>)}</div><label className="field-label">Tin nhắn <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={3} /></label><div className="modal-footer"><span className="privacy-note"><LockKey size={15} /> Chỉ người nhận nhìn thấy</span><div className="modal-actions"><button className="button button-secondary" onClick={() => { navigator.clipboard?.writeText(message); onNotify('Đã sao chép tin nhắn mẫu'); }}>Sao chép</button><button className="button button-dark" onClick={() => { onNotify(`Đã đánh dấu hỏi thăm ${selected.length} bạn`); onClose(); }}>Đánh dấu đã hỏi thăm <ArrowRight size={17} /></button></div></div></Modal>;
}

function QrModal({ onClose, token }: { onClose: () => void; token?: string }) {
  const checkinUrl = getCheckinUrl(token);
  return (
    <Modal title="Mã QR điểm danh" onClose={onClose}>
      <div className="qr-fullscreen">
        <div className="qr-frame large">
          <QRCodeCanvas value={checkinUrl} size={250} bgColor="#ffffff" fgColor="#20201f" includeMargin />
        </div>
        <p>Quét mã bằng điện thoại để vào trang điểm danh.</p>
        <span style={{ wordBreak: 'break-all', display: 'block', margin: '8px 0', color: 'var(--purple)', fontSize: '12px' }}>
          {checkinUrl}
        </span>
        <div className="qr-wifi-badge" style={{ margin: 'auto' }}>
          <WifiHigh size={13} /> Thiết bị cùng mạng Wi-Fi mở được ngay
        </div>
      </div>
    </Modal>
  );
}

function CheckInScreen({ state, qrToken, onCheckin, onBack }: { state: AppState; qrToken: string; onCheckin: (memberId: string, mascotId: string, mood: string, qrToken: string) => 'success' | 'duplicate' | 'error'; onBack: () => void }) {
  const activeMembers = state.members.filter((member) => member.isActive && !member.pending);
  const session = state.sessions.find((item) => item.qrToken === qrToken);
  const sessionAvailable = Boolean(session && session.id === state.currentSessionId && isSessionCheckinOpen(session, state.sessionOpen));

  // Stored name from previous check-in if any
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem('ntc-checkin-name') || '';
    } catch {
      return '';
    }
  });

  const [mascotId, setMascotId] = useState<MascotId | null>(() => {
    const previous = state.members.find(m => m.name.trim().toLocaleLowerCase() === name.trim().toLocaleLowerCase())?.mascotId;
    return isMascotId(previous) ? previous : null;
  });
  const [formError, setFormError] = useState('');
  const formErrorRef = useRef<HTMLParagraphElement>(null);
  const [step, setStep] = useState<'form' | 'success' | 'duplicate'>('form');
  const [submittedName, setSubmittedName] = useState('');

  useEffect(() => {
    if (formError) formErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [formError]);

  const trimmed = name.trim();
  const matchedMember = activeMembers.find((member) => member.name.trim().toLocaleLowerCase() === trimmed.toLocaleLowerCase());
  const profileMascot = matchedMember && isMascotId(matchedMember.mascotId) ? matchedMember.mascotId : null;
  const suggestions = trimmed.length >= 1
    ? activeMembers.filter((m) => m.name.toLowerCase().includes(trimmed.toLowerCase())).slice(0, 4)
    : [];

  const handlePickSuggestion = (member: Member) => {
    setName(member.name);
    setMascotId(isMascotId(member.mascotId) ? member.mascotId : null);
    setFormError('');
  };

  const submit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    const finalName = name.trim();
    if (!finalName) {
      setFormError('Bạn ơi, nhập tên trước khi điểm danh nhé! 😊');
      return;
    }

    const existing = activeMembers.find((m) => m.name.trim().toLowerCase() === finalName.toLowerCase());
    const memberId = existing ? existing.id : `pending:${finalName}`;

    if (!mascotId) { setFormError('Chọn và xác nhận bạn đồng hành trước khi điểm danh nhé.'); return; }
    let result: 'success' | 'duplicate' | 'error';
    try {
      result = onCheckin(memberId, mascotId, 'Bình an', qrToken);
    } catch {
      setFormError('Chưa ghi nhận được điểm danh. Hãy thử lại nhé.');
      return;
    }
    if (result === 'duplicate') {
      const attendance = session && state.attendances.find((item) => item.sessionId === session.id && item.memberId === (existing?.id ?? memberId));
      const saved = state.members.find((member) => member.name.trim().toLocaleLowerCase() === finalName.toLocaleLowerCase())?.mascotId;
      if (isMascotId(attendance?.mascotId)) setMascotId(attendance.mascotId);
      else if (isMascotId(saved)) setMascotId(saved);
    }
    if (result !== 'error') { try { localStorage.setItem('ntc-checkin-name', finalName); } catch { /* device storage unavailable */ } }
    setSubmittedName(finalName);
    if (result === 'duplicate') setStep('duplicate');
    else if (result === 'success') setStep('success');
    else setFormError('Phiên điểm danh hiện đã đóng hoặc tạm dừng.');
  };

  const mascotObj = mascotId ? {soft:mascotById(mascotId).bg, name:mascotById(mascotId).name} : {soft:'#eef3f6', name:'bạn đồng hành'};
  const submittedMember = state.members.find((member) => member.name.trim().toLocaleLowerCase() === submittedName.trim().toLocaleLowerCase());
  const legacyEmoji = animalByKey(submittedMember?.animal ?? 'panda').emoji;
  const brand = <div className="kahoot-brand-tag"><Sparkle size={13} weight="fill" /> NEST · NTC PATE</div>;

  if (!sessionAvailable) {
    return (
      <div className="kahoot-page">
        <div className="kahoot-card">
          {brand}
          <div className="state-icon muted"><LockKey size={28} /></div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '10px 0' }}>Phiên điểm danh đã đóng</h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '20px' }}>
            Ban điều hành chưa mở hoặc đã kết thúc phiên điểm danh này.
          </p>
          <button className="button button-dark full-width" onClick={onBack}>
            Về màn hình phòng <ArrowRight size={17} />
          </button>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="kahoot-page">
        <div className="kahoot-card kahoot-success-screen">
          <div className="kahoot-success-badge"><CheckCircle size={16} weight="fill" /> ĐÃ GHI NHẬN</div>
          <div className="kahoot-big-mascot" style={{ background: mascotObj.soft }}>
            <MascotAvatar id={mascotId ?? undefined} fallback={legacyEmoji} size={128} state="celebrating" />
          </div>
          <h1 className="kahoot-success-title">Chào {submittedName}, rất vui vì bạn đã đến! 🎉</h1>
          <div className="kahoot-success-name">{submittedName}</div>
          <div className="kahoot-screen-hint">
            <span>📺</span>
            <span><strong>{mascotObj.name}</strong> vui vì bạn đã đến. Hãy nhìn lên màn hình lớn để thấy mình cùng mọi người nhé!</span>
          </div>
          <button className="button button-lime full-width" onClick={onBack}>
            Xem màn hình phòng <ArrowRight size={17} />
          </button>
        </div>
      </div>
    );
  }

  if (step === 'duplicate') {
    return (
      <div className="kahoot-page">
        <div className="kahoot-card kahoot-success-screen">
          <div className="kahoot-success-badge"><CheckCircle size={16} weight="fill" /> ĐÃ Ở TRONG TỔ</div>
          <div className="kahoot-big-mascot" style={{ background: mascotObj.soft }}>
            <MascotAvatar id={mascotId ?? undefined} fallback={legacyEmoji} size={128} />
          </div>
          <h1 className="kahoot-success-title">Bạn đã ở trong tổ rồi! 😊</h1>
          <div className="kahoot-success-name">{submittedName}</div>
          <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '20px' }}>
            {mascotObj.name} vui vì bạn đã quay lại! Buổi nhóm này đã ghi nhận bạn trước đó.
          </p>
          <button className="button button-dark full-width" onClick={onBack}>
            Về màn hình phòng <ArrowRight size={17} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="kahoot-page">
      <div className="kahoot-card">
        {brand}
        <div className="kahoot-greeting">
          <h1>Chào mừng bạn đến với NTC PATE! 🌿</h1>
          <p>Chạm cửa rồi, vào tổ thôi!</p>
        </div>

        <form className="kahoot-form" onSubmit={submit}>
          <div className="kahoot-input-wrap">
            <label htmlFor="kahoot-name-input" className="kahoot-input-label">Tên của bạn là gì?</label>
            <input
              id="kahoot-name-input"
              className="kahoot-name-input"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                const member = state.members.find(m => m.name.trim().toLowerCase() === e.target.value.trim().toLowerCase());
                setMascotId(member && isMascotId(member.mascotId) ? member.mascotId : null);
                setFormError('');
              }}
              placeholder="Nhập tên của bạn..."
              autoComplete="name"
            />
            {suggestions.length > 0 && (
              <div className="kahoot-suggestions">
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Gợi ý:</span>
                {suggestions.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className="kahoot-suggestion-chip"
                    onClick={() => handlePickSuggestion(m)}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <MascotPicker key={name} value={profileMascot ?? mascotId} locked={Boolean(profileMascot)} onChange={setMascotId} />
          {formError && <p ref={formErrorRef} className="form-error kahoot-validation-error" role="alert" aria-live="assertive" aria-atomic="true">{formError}</p>}

          <button type="submit" className="kahoot-join-btn">
            Điểm danh thôi 🚀
          </button>
        </form>

        <button
          type="button"
          onClick={onBack}
          style={{ background: 'transparent', border: 0, color: 'var(--muted)', fontSize: '12px', marginTop: '18px', cursor: 'pointer' }}
        >
          ← Về màn hình phòng
        </button>
      </div>
    </div>
  );
}

type ActivityKind = 'word-cloud' | 'poll' | 'open-ended' | 'quiz' | 'reactions';

const ACTIVITY_KINDS: { key: ActivityKind; label: string; description: string }[] = [
  { key: 'word-cloud', label: 'Word Cloud', description: 'Một từ cho buổi tối nay' },
  { key: 'poll', label: 'Poll', description: 'Chọn điều đang đúng với bạn' },
  { key: 'open-ended', label: 'Open-ended', description: 'Chia sẻ một câu ngắn' },
  { key: 'quiz', label: 'Quiz', description: 'Đố vui để cùng nhớ' },
  { key: 'reactions', label: 'Reaction Board', description: 'Gửi một chút điều lành' },
];

function ActivityHub({ state, role, onNotify }: { state: AppState; role: Role; onNotify: (message: string) => void }) {
  const [activeKind, setActiveKind] = useState<ActivityKind>('poll');
  const [pollChoice, setPollChoice] = useState('');
  const [wordDraft, setWordDraft] = useState('');
  const [openDraft, setOpenDraft] = useState('');
  const [quizAnswer, setQuizAnswer] = useState('');
  const [reactions, setReactions] = useState<Record<string, number>>({ 'Mình ở đây': 7, 'Biết ơn': 5, 'Xin cầu nguyện': 3 });
  const [resultsVisible, setResultsVisible] = useState(false);
  const publicMode = role === 'GUEST';
  const isPublished = ['published', 'live'].includes(state.sessionStatus ?? 'live');
  const submit = (label: string) => { onNotify(`${label} đã được ghi nhận`); };
  const addReaction = (label: string) => { setReactions((current) => ({ ...current, [label]: (current[label] ?? 0) + 1 })); submit(label); };
  const active = ACTIVITY_KINDS.find((item) => item.key === activeKind) ?? ACTIVITY_KINDS[1];
  if (!isPublished) return <section className="activity-empty"><div className="state-icon muted"><LockKey size={28} /></div><h1>Phòng tương tác chưa mở</h1><p>Hoạt động của buổi nhóm sẽ xuất hiện sau khi Ban điều hành công bố phiên này.</p></section>;
  return <>
    <PageHeading eyebrow="Cùng tham gia" title="Phòng tương tác" description="Những câu trả lời nhỏ giúp mọi người có thêm một cách để lên tiếng." action={role === 'MANAGEMENT' ? <button className="button button-dark" onClick={() => onNotify('Mở trình tạo hoạt động mới')}><Plus size={17} /> Tạo hoạt động</button> : undefined} />
    <div className="activity-layout">
      <section className="activity-board"><div className="activity-board-top"><div><span className="live-badge light"><span className="live-dot" /> Phiên đang mở</span><h2>{active.label}</h2><p>{active.description}</p></div>{role === 'MANAGEMENT' && <button className="button button-secondary" onClick={() => setResultsVisible((current) => !current)}>{resultsVisible ? 'Ẩn kết quả' : 'Hiện kết quả'}</button>}</div>
        <div className="activity-stage">
          {activeKind === 'poll' && <div className="activity-prompt"><div className="activity-kicker">POLL · ẨN DANH</div><h3>Tối nay bạn cần điều gì nhất?</h3><div className="activity-options">{['Một khoảng lặng', 'Một câu chuyện thật', 'Một chút năng lượng'].map((option) => <button key={option} className={pollChoice === option ? 'selected' : ''} onClick={() => { setPollChoice(option); submit('Lựa chọn của bạn'); }}>{option}<span>{resultsVisible ? `${option === 'Một khoảng lặng' ? 42 : option === 'Một câu chuyện thật' ? 31 : 27}%` : 'Chọn'}</span></button>)}</div></div>}
          {activeKind === 'word-cloud' && <div className="activity-prompt"><div className="activity-kicker">WORD CLOUD · CÔNG KHAI</div><h3>Một từ mô tả tâm trạng của bạn</h3><div className="word-cloud"><b>hy vọng</b><span>bình an</span><strong>được thấy</strong><em>biết ơn</em><span>vui</span></div><form className="activity-inline-form" onSubmit={(event) => { event.preventDefault(); if (wordDraft.trim()) { submit('Từ của bạn'); setWordDraft(''); } }}><input value={wordDraft} onChange={(event) => setWordDraft(event.target.value)} placeholder="Ví dụ: ấm áp" aria-label="Một từ mô tả tâm trạng" maxLength={32} /><button className="button button-dark" type="submit">Gửi từ</button></form></div>}
          {activeKind === 'open-ended' && <div className="activity-prompt"><div className="activity-kicker">OPEN-ENDED · CHỈ NHÓM</div><h3>Tuần này điều gì làm bạn mỉm cười?</h3><textarea className="activity-textarea" value={openDraft} onChange={(event) => setOpenDraft(event.target.value)} placeholder="Bạn có thể viết thật ngắn..." maxLength={240} /><div className="activity-submit-row"><small>{openDraft.length}/240</small><button className="button button-dark" onClick={() => { if (openDraft.trim()) { submit('Chia sẻ của bạn'); setOpenDraft(''); } }}>Gửi chia sẻ <ArrowRight size={17} /></button></div></div>}
          {activeKind === 'quiz' && <div className="activity-prompt"><div className="activity-kicker">QUIZ · VUI LÀ CHÍNH</div><h3>Điều gì giúp một buổi nhóm có ý nghĩa hơn?</h3><div className="activity-options">{['Lắng nghe thật', 'Nói thật nhiều', 'Có câu trả lời đúng'].map((option) => <button key={option} className={quizAnswer === option ? 'selected' : ''} onClick={() => { setQuizAnswer(option); submit('Đáp án của bạn'); }}>{option}<span>{resultsVisible && option === 'Lắng nghe thật' ? '✓' : 'Chọn'}</span></button>)}</div></div>}
          {activeKind === 'reactions' && <div className="activity-prompt"><div className="activity-kicker">REACTION BOARD · CÔNG KHAI</div><h3>Gửi một chút điều lành</h3><div className="reaction-grid">{Object.entries(reactions).map(([label, count]) => <button key={label} onClick={() => addReaction(label)}><span>{label === 'Mình ở đây' ? '✦' : label === 'Biết ơn' ? '♡' : '☼'}</span><strong>{count}</strong><small>{label}</small></button>)}</div></div>}
        </div>
      </section>
      <aside className="activity-rail"><div className="panel-heading compact"><div><div className="eyebrow">Chọn hoạt động</div><h2>Nhịp của buổi tối</h2></div><Sparkle size={20} className="purple-icon" /></div><div className="activity-tabs">{ACTIVITY_KINDS.map((item) => <button key={item.key} className={activeKind === item.key ? 'active' : ''} onClick={() => setActiveKind(item.key)}><span>{item.label}</span><small>{item.description}</small></button>)}</div><div className="activity-private-note"><LockKey size={15} /><span>{publicMode ? 'Bạn chỉ nhìn thấy nội dung công khai của buổi nhóm.' : 'Dữ liệu phản hồi được giữ trong phạm vi NTC PATE.'}</span></div></aside>
    </div>
  </>;
}

function GuestSessionPage({ state, onNavigate }: { state: AppState; onNavigate: (path: string) => void }) {
  const session = state.sessions.find((item) => item.id === state.currentSessionId);
  const status = session?.status ?? 'closed';
  const sessionDate = session ? new Date(session.date).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  if (status === 'draft') return <div className="public-page"><div className="public-brand"><NestMark /><span>NEST</span></div><div className="public-empty"><div className="state-icon muted"><CalendarBlank size={28} /></div><div className="eyebrow">NTC PATE · BUỔI NHÓM</div><h1>Buổi nhóm tiếp theo chưa được mở</h1><p>Ban điều hành đang chuẩn bị nội dung. Khi buổi nhóm được công bố, bạn sẽ thấy thời gian, địa điểm và lịch trình ở đây.</p><button className="button button-dark" onClick={() => onNavigate('/room/today')}>Về NEST <ArrowRight size={17} /></button></div></div>;
  return <div className="public-page"><div className="public-brand"><NestMark /><span>NEST</span></div><div className="public-session-shell"><div className="public-session-hero"><div><div className="eyebrow">NTC PATE · {status === 'live' ? 'ĐANG DIỄN RA' : status === 'closed' ? 'ĐÃ KẾT THÚC' : 'ĐÃ CÔNG BỐ'}</div><h1>Tối thứ tư trong tổ</h1><p>Kết nối thật, lớn lên cùng nhau.</p></div><span className="public-status"><span />{status === 'live' ? 'Đang diễn ra' : status === 'closed' ? 'Đã kết thúc' : 'Đã công bố'}</span></div><div className="public-session-grid"><section className="public-card"><div className="eyebrow">Thông tin chung</div><h2>{sessionDate}</h2><div className="public-facts"><span><Clock size={17} /> 19:00 - 21:00</span><span><House size={17} /> Phòng sinh hoạt NTC PATE</span><span><UsersThree size={17} /> Mọi người đều được chào đón</span></div>{status !== 'closed' && <button className="button button-lime" onClick={() => onNavigate(`/check-in/${session?.qrToken ?? ''}`)}>Check-in ngay <ArrowRight size={17} /></button>}</section><section className="public-card"><div className="eyebrow">Lịch trình công khai</div><div className="public-schedule">{[['19:00', 'Đón nhau và check-in'], ['19:20', 'Một câu hỏi để mở lời'], ['19:45', 'Chia sẻ trong nhóm nhỏ'], ['20:30', 'Tổng kết và cầu nguyện']].map(([time, title]) => <div key={time}><time>{time}</time><span>{title}</span></div>)}</div></section></div><div className="public-session-footer"><span><ShieldCheck size={16} /> Không hiển thị danh sách vắng hay ghi chú riêng tư</span><button className="button button-secondary" onClick={() => onNavigate('/room/activities')}>Xem phòng tương tác</button></div></div></div>;
}

function PresentationPage({ state, onBack }: { state: AppState; onBack: () => void }) {
  const presentMembers = presentMembersForSession(state);
  const presentCount = presentMembers.length;
  const latestActivity = state.activities[0];
  const currentSession = state.sessions.find((session) => session.id === state.currentSessionId);
  const checkinUrl = getCheckinUrl(currentSession?.qrToken);

  const enterFullscreen = () => {
    document.documentElement.requestFullscreen?.().catch(() => undefined);
  };

  return (
    <div className="presentation-page">
      <div className="presentation-top">
        <div className="public-brand"><NestMark /><span>NEST</span></div>
        <span className="public-status">
          <span /> SẢNH CHỜ VÀO TỔ · {presentCount} BẠN ĐÃ CÓ MẶT
        </span>
        <div className="presentation-actions">
          <button className="button button-ghost-light" onClick={enterFullscreen}>Toàn màn hình</button>
          <button className="icon-button light" aria-label="Về phòng quản lý" onClick={onBack}><X size={20} /></button>
        </div>
      </div>

      <main className="presentation-stage" style={{ padding: '20px 0 40px', width: 'min(1300px, 94vw)' }}>
        <div className="kahoot-lobby-container">
          {/* Cột trái: QR Code & Link */}
          <div className="kahoot-lobby-qr-card">
            <div className="eyebrow" style={{ color: 'var(--lime)', marginBottom: '8px' }}>NTC PATE · {currentSession ? new Date(currentSession.date).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long' }) : 'BUỔI NHÓM'}</div>
            <h2 style={{ margin: '0 0 16px', fontSize: '24px', fontWeight: 900 }}>Quét mã để vào tổ</h2>
            <div className="kahoot-qr-box">
              <QRCodeCanvas value={checkinUrl} size={190} bgColor="#ffffff" fgColor="#20201f" includeMargin />
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginTop: '8px' }}>
              Quét bằng máy ảnh điện thoại hoặc truy cập:
            </div>
            <div className="kahoot-lobby-url">{checkinUrl}</div>
            <div className="presentation-count" style={{ marginTop: '20px' }}>
              <strong>{presentCount}</strong>
              <span>bạn đã cùng<br />hiện diện</span>
            </div>
          </div>

          {/* Cột phải: Sảnh chờ người chơi kiểu Kahoot */}
          <div className="kahoot-players-wall">
            <div className="kahoot-players-header">
              <div>
                <div className="eyebrow" style={{ color: 'var(--lime)' }}>SỰ HIỆN DIỆN</div>
                <h2 style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: 900 }}>Khu rừng đang thức 🌿</h2>
              </div>
              <span className="member-count" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', borderColor: 'transparent' }}>
                {presentCount} thành viên
              </span>
            </div>

            {presentMembers.length === 0 ? (
              <div className="kahoot-empty-lobby">
                <span style={{ fontSize: '48px' }}>🌱</span>
                <strong>Đang chờ những người bạn đầu tiên...</strong>
                <span>Hãy quét mã QR bên cạnh để vào tổ cùng nhau nhé!</span>
              </div>
            ) : (
              <div className="kahoot-players-grid">
                {presentMembers.map((member, idx) => {
                  const animalObj = animalByKey(member.animal);
                  const isNewest = idx === 0;
                  return (
                    <div
                      key={member.id}
                      className={`kahoot-player-pill ${isNewest ? 'is-new' : ''}`}
                    >
                      <span className="kahoot-player-emoji" style={{ background: animalObj.soft }}>
                        <MascotAvatar id={member.mascotId} fallback={animalObj.emoji} size={48} />
                      </span>
                      <span>{member.name}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {latestActivity && (
              <div className="presentation-activity" style={{ marginTop: 'auto' }}>
                <span className="pulse-avatar"><MascotAvatar id={latestActivity.mascotId} fallback={latestActivity.emoji} size={32} /></span>
                <span><strong>{latestActivity.memberName}</strong> vừa chọn <b>{latestActivity.label}</b></span>
                <time>{latestActivity.time}</time>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="presentation-footer">
        <span><WifiHigh size={15} /> Kết nối realtime nội bộ đang bật</span>
        <button onClick={onBack}>Về màn hình phòng <ArrowRight size={16} /></button>
      </footer>
    </div>
  );
}

function ManagementPageHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) { return <PageHeading eyebrow="Quản lý nhóm" title={title} description={description} action={action} />; }

function MembersPage({ state, canLead, onNotify, onCreateMember, onUpdateMember, onDeleteMember, onSetMemberStatus, onBulkMemberAction }: {
  state: AppState;
  canLead: boolean;
  onNotify: (message: string) => void;
  onCreateMember: (draft: MemberDraft) => MemberSaveResult;
  onUpdateMember: (id: string, draft: MemberDraft) => MemberSaveResult;
  onDeleteMember: (id: string) => void;
  onSetMemberStatus: (id: string, status: MemberStatus) => void;
  onBulkMemberAction: (ids: string[], action: BulkMemberAction) => void;
}) {
  const [query, setQuery] = useState('');
  const [companionFilter, setCompanionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | MemberStatus>('ALL');
  const [formTarget, setFormTarget] = useState<Member | 'new' | null>(null);
  const [actionsTarget, setActionsTarget] = useState<Member | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkConfirmation, setBulkConfirmation] = useState<BulkMemberAction | null>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const companionOptions = Array.from(new Set(state.members.map((member) => member.companion).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'vi'));
  const visible = state.members.filter((member) => {
    const matchesQuery = !normalizedQuery || member.name.toLocaleLowerCase().includes(normalizedQuery) || member.companion.toLocaleLowerCase().includes(normalizedQuery);
    const matchesCompanion = companionFilter === 'ALL' || member.companion === companionFilter;
    const matchesStatus = statusFilter === 'ALL' || memberStatus(member) === statusFilter;
    return matchesQuery && matchesCompanion && matchesStatus;
  });
  const visibleIds = visible.map((member) => member.id);
  const selectedVisibleCount = visibleIds.filter((id) => selectedIds.includes(id)).length;
  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;
  useEffect(() => { if (selectAllRef.current) selectAllRef.current.indeterminate = selectedVisibleCount > 0 && !allVisibleSelected; }, [selectedVisibleCount, allVisibleSelected]);
  const changeFilter = (update: () => void) => { update(); setSelectedIds([]); };
  const toggleMember = (id: string) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const runBulkAction = () => {
    if (!bulkConfirmation || !selectedIds.length) return;
    onBulkMemberAction(selectedIds, bulkConfirmation);
    setSelectedIds([]);
    setBulkConfirmation(null);
  };

  const statusLabel = (member: Member) => member.pending ? 'Chờ duyệt' : member.isActive ? 'Đang hoạt động' : 'Đã tạm dừng';
  const editMember = (member: Member) => {
    setActionsTarget(null);
    setFormTarget(member);
  };

  return <>
    <ManagementPageHeader title="Thành viên của tổ" description="Cùng chăm sóc một cộng đồng nhỏ, nơi ai cũng có chỗ để trở về." action={canLead ? <button className="button button-dark" onClick={() => setFormTarget('new')}><Plus size={17} /> Thêm thành viên</button> : undefined} />
    <div className="table-toolbar">
      <label className="search-field"><MagnifyingGlass size={18} /><input value={query} onChange={(event) => changeFilter(() => setQuery(event.target.value))} placeholder="Tìm tên thành viên..." aria-label="Tìm tên thành viên..." /></label>
      <div className="toolbar-filters">
        <select className="filter-select" aria-label="Lọc theo trạng thái" value={statusFilter} onChange={(event) => changeFilter(() => setStatusFilter(event.target.value as 'ALL' | MemberStatus))}>
          <option value="ALL">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="pending">Chờ duyệt</option>
          <option value="inactive">Đã tạm dừng</option>
        </select>
        <select className="filter-select" aria-label="Lọc theo nhóm đồng hành" value={companionFilter} onChange={(event) => changeFilter(() => setCompanionFilter(event.target.value))}>
          <option value="ALL">Tất cả nhóm</option>
          {companionOptions.map((companion) => <option key={companion} value={companion}>{companion}</option>)}
        </select>
      </div>
      <span className="toolbar-count">{visible.length} thành viên</span>
    </div>
    {selectedIds.length > 0 && <div className="bulk-toolbar" role="region" aria-label="Thao tác hàng loạt"><span><strong>{selectedIds.length}</strong> thành viên đã chọn</span><button className="button button-secondary" onClick={() => setSelectedIds([])}>Bỏ chọn</button><button className="button button-secondary" onClick={() => setBulkConfirmation('activate')}>Kích hoạt</button><button className="button button-secondary" onClick={() => setBulkConfirmation('deactivate')}>Tạm dừng</button><button className="button button-danger" onClick={() => setBulkConfirmation('delete')}><Trash size={15} /> Xóa</button></div>}
    <section className="data-table-wrap"><table className="data-table"><thead><tr><th className="select-column"><input ref={selectAllRef} type="checkbox" checked={allVisibleSelected} onChange={() => setSelectedIds((current) => allVisibleSelected ? current.filter((id) => !visibleIds.includes(id)) : [...new Set([...current, ...visibleIds])])} aria-label="Chọn tất cả thành viên đang hiển thị" /></th><th>Thành viên</th><th>Nhóm đồng hành</th><th>Nhịp tham dự</th><th>Trạng thái</th><th><span className="sr-only">Thao tác</span></th></tr></thead><tbody>
      {visible.length === 0 && <tr><td colSpan={6}><div className="empty-state table-empty"><div className="empty-illustration">🔎</div><h3>Không tìm thấy thành viên</h3><p>Thử đổi từ khóa hoặc bộ lọc để xem thêm kết quả.</p></div></td></tr>}
      {visible.map((member) => <tr key={member.id} className={selectedIds.includes(member.id) ? 'is-row-selected' : ''}><td className="select-column"><input type="checkbox" checked={selectedIds.includes(member.id)} onChange={() => toggleMember(member.id)} aria-label={`Chọn ${member.name}`} /></td><td><div className="table-person"><span className="animal-avatar small" style={{ background: animalByKey(member.animal).soft }}><MascotAvatar id={member.mascotId} fallback={animalByKey(member.animal).emoji} size={34} /></span><span><strong>{member.name}</strong><small>{roleLabel(member.role)}</small></span></div></td><td>{member.companion}</td><td><div className="streak-cell"><span className="streak-dots">{[0, 1, 2, 3].map((dot) => <i key={dot} className={dot < member.streak ? 'filled' : ''} />)}</span><span>{member.streak ? `${member.streak} tuần liên tục` : 'Mới vào tổ'}</span></div></td><td><span className={`status-tag ${memberStatus(member)}`}><span />{statusLabel(member)}</span></td><td><button className="icon-button" aria-label={`Tùy chọn cho ${member.name}`} onClick={() => setActionsTarget(member)}><DotsThree size={19} /></button></td></tr>)}
    </tbody></table></section>
    {formTarget && <MemberFormModal target={formTarget} companionOptions={companionOptions} onClose={() => setFormTarget(null)} onSave={(draft) => formTarget === 'new' ? onCreateMember(draft) : onUpdateMember(formTarget.id, draft)} />}
    {actionsTarget && <MemberActionsModal member={actionsTarget} onClose={() => setActionsTarget(null)} onEdit={() => editMember(actionsTarget)} onDelete={() => { onDeleteMember(actionsTarget.id); setActionsTarget(null); }} onSetStatus={(status) => { onSetMemberStatus(actionsTarget.id, status); setActionsTarget(null); }} />}
    {bulkConfirmation && <Modal title={bulkConfirmation === 'delete' ? `Xóa ${selectedIds.length} thành viên?` : `${bulkConfirmation === 'deactivate' ? 'Tạm dừng' : 'Kích hoạt'} ${selectedIds.length} thành viên?`} onClose={() => setBulkConfirmation(null)}><p className="modal-lead">{bulkConfirmation === 'delete' ? 'Những thành viên đã chọn sẽ bị xóa khỏi danh sách quản lý.' : `Trạng thái của ${selectedIds.length} thành viên đã chọn sẽ được cập nhật ngay.`}</p><div className="modal-footer"><span className="privacy-note">{selectedIds.length} thành viên được chọn</span><div className="modal-actions"><button className="button button-secondary" onClick={() => setBulkConfirmation(null)}>Hủy</button><button className={`button ${bulkConfirmation === 'delete' ? 'button-danger' : 'button-dark'}`} onClick={runBulkAction}>{bulkConfirmation === 'delete' ? 'Xóa thành viên' : bulkConfirmation === 'deactivate' ? 'Tạm dừng' : 'Kích hoạt'} <ArrowRight size={16} /></button></div></div></Modal>}
  </>;
}

function MemberFormModal({ target, companionOptions, onClose, onSave }: { target: Member | 'new'; companionOptions: string[]; onClose: () => void; onSave: (draft: MemberDraft) => MemberSaveResult }) {
  const isNew = target === 'new';
  const [name, setName] = useState(isNew ? '' : target.name);
  const [companion, setCompanion] = useState(isNew ? (companionOptions[0] ?? 'Nhóm Hạt giống') : target.companion);
  const [mascotId, setMascotId] = useState<MascotId | null>(isNew ? null : target.mascotId ?? null);
  const [animal, setAnimal] = useState(isNew ? 'panda' : target.animal);
  const [status, setStatus] = useState<MemberStatus>(isNew ? 'active' : memberStatus(target));
  const [reminderOptIn, setReminderOptIn] = useState(isNew ? true : target.reminderOptIn);
  const [error, setError] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = onSave({ name, companion, animal, mascotId: mascotId ?? undefined, status, reminderOptIn });
    if (result === 'success') onClose();
    else setError(result === 'duplicate' ? 'Tên này đã có trong danh sách thành viên.' : 'Hãy nhập tên thành viên.');
  };
  return <Modal title={isNew ? 'Thêm thành viên' : 'Chỉnh sửa thành viên'} onClose={onClose}>
    <p className="modal-lead">{isNew ? 'Thêm một người bạn vào không gian chung của NTC PATE.' : 'Cập nhật thông tin để việc đón nhau trong tổ luôn rõ ràng và ấm áp.'}</p>
    <form className="member-form" onSubmit={submit}>
      <label className="field-label">Tên thành viên<input className="text-input" value={name} onChange={(event) => { setName(event.target.value); setError(''); }} placeholder="Ví dụ: Mai Anh" autoFocus required /></label>
      <label className="field-label">Nhóm đồng hành<select value={companion} onChange={(event) => setCompanion(event.target.value)}>{companionOptions.map((option) => <option key={option} value={option}>{option}</option>)}{!companionOptions.includes(companion) && <option value={companion}>{companion}</option>}</select></label>
      <MascotPicker value={mascotId} onChange={setMascotId} />
      <label className="field-label">Trạng thái<select value={status} onChange={(event) => setStatus(event.target.value as MemberStatus)}><option value="active">Đang hoạt động</option><option value="pending">Chờ duyệt</option><option value="inactive">Đã tạm dừng</option></select></label>
      <label className="checkbox-field"><input type="checkbox" checked={reminderOptIn} onChange={(event) => setReminderOptIn(event.target.checked)} /><span>Cho phép nhận lời nhắc trước buổi nhóm</span></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="modal-footer"><span className="privacy-note"><ShieldCheck size={14} /> Chỉ Ban điều hành có quyền chỉnh sửa</span><div className="modal-actions"><button className="button button-secondary" type="button" onClick={onClose}>Hủy</button><button className="button button-dark" type="submit">{isNew ? 'Lưu thành viên' : 'Lưu thay đổi'}</button></div></div>
    </form>
  </Modal>;
}

function MemberActionsModal({ member, onClose, onEdit, onDelete, onSetStatus }: { member: Member; onClose: () => void; onEdit: () => void; onDelete: () => void; onSetStatus: (status: MemberStatus) => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const currentStatus = memberStatus(member);
  return <Modal title={member.name} onClose={onClose}>
    <div className="member-modal-meta"><span>{roleLabel(member.role)}</span><span>{member.companion}</span><span>Trạng thái: {currentStatus === 'active' ? 'Đang hoạt động' : currentStatus === 'pending' ? 'Chờ duyệt' : 'Đã tạm dừng'}</span></div>
    {confirmDelete ? <div className="delete-confirm"><strong>Xóa thành viên này?</strong><p>Lịch sử check-in và các hoạt động liên quan của {member.name} sẽ không còn hiển thị trong danh sách này.</p><div className="modal-actions"><button className="button button-secondary" onClick={() => setConfirmDelete(false)}>Quay lại</button><button className="button button-danger" onClick={onDelete}>Xóa thành viên</button></div></div> : <div className="member-actions-grid"><button className="member-action-button" onClick={onEdit}><PencilSimple size={18} /> Chỉnh sửa thông tin</button><button className="member-action-button" onClick={() => onSetStatus(currentStatus === 'inactive' ? 'active' : 'inactive')}>{currentStatus === 'inactive' ? <Check size={18} /> : <PauseIcon />}{currentStatus === 'inactive' ? 'Khôi phục thành viên' : 'Tạm dừng thành viên'}</button><button className="member-action-button danger" onClick={() => setConfirmDelete(true)}><Trash size={18} /> Xóa thành viên</button></div>}
  </Modal>;
}

function PauseIcon() { return <span className="pause-icon" aria-hidden="true">Ⅱ</span>; }

function SessionsPage({ state, canLead, onSetSessionOpen, onSetSessionStatus, onCreateSession }: { state: AppState; canLead: boolean; onSetSessionOpen: (open: boolean) => void; onSetSessionStatus: (status: SessionStatus) => void; onCreateSession: () => void }) {
  const sessions = state.sessions.slice().sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  const statusLabels: Record<SessionStatus, string> = { draft: 'Bản nháp', published: 'Đã công bố', live: 'Đang diễn ra', closed: 'Đã kết thúc' };
  return <>
    <ManagementPageHeader title="Các buổi sinh hoạt" description="Mỗi buổi có mã QR riêng và danh sách điểm danh riêng." action={canLead ? <button className="button button-dark" onClick={onCreateSession}><Plus size={17} /> Tạo buổi nhóm</button> : undefined} />
    <div className="session-list">{sessions.map((session) => {
      const isCurrent = session.id === state.currentSessionId;
      const count = sessionAttendances(state.attendances, session.id).length;
      const nextStatus: SessionStatus | null = session.status === 'draft' ? 'published' : session.status === 'published' ? 'live' : session.status === 'live' ? 'closed' : null;
      const nextStatusLabel = session.status === 'draft' ? 'Công bố' : session.status === 'published' ? 'Bắt đầu live' : 'Đóng buổi';
      const date = new Date(session.date);
      return <article className={`session-row ${isCurrent ? 'current' : ''}`} key={session.id}>
        <div className="session-date"><span>{isCurrent ? 'HIỆN TẠI' : 'BUỔI NHÓM'}</span><strong>{date.toLocaleDateString('vi-VN', { day: '2-digit' })}</strong><small>{date.toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' })}</small></div>
        <div className="session-info"><div className="session-title-row"><h2>{session.title}</h2><span className={`status-tag ${session.status === 'live' ? 'active' : session.status === 'closed' ? 'inactive' : ''}`}><span />{statusLabels[session.status]}{isCurrent && !state.sessionOpen && session.status !== 'closed' ? ' · Tạm dừng' : ''}</span></div><p><ClockIcon /> Check-in lúc 19:15 <span className="card-separator">•</span> {count} đã đến <span className="card-separator">•</span> QR riêng cho buổi này</p></div>
        <div className="session-actions">{isCurrent && canLead && <>{nextStatus && <button className="button button-secondary" onClick={() => onSetSessionStatus(nextStatus)}>{nextStatusLabel}</button>}{session.status !== 'closed' && <button className="button button-secondary" onClick={() => onSetSessionOpen(!state.sessionOpen)}>{state.sessionOpen ? 'Tạm dừng QR' : 'Mở lại QR'}</button>}{session.status === 'closed' && <button className="button button-secondary" onClick={onCreateSession}>Mở buổi mới</button>}</>}</div>
      </article>;
    })}</div>
    <div className="session-tip"><Sparkle size={20} /><div><strong>QR cũ tự hết hiệu lực</strong><p>Đóng buổi này sẽ ngừng nhận check-in. Buổi mới tạo mã QR và bộ đếm hiện diện mới.</p></div></div>
  </>;
}

function FollowUpsPage({ state, onOpenFollowUp, onNotify }: { state: AppState; onOpenFollowUp: () => void; onNotify: (message: string) => void }) {
  const absent = state.members.filter((member) => !member.checkedAt);
  return <><ManagementPageHeader title="Hẹn nhau tuần sau" description="Không ai bị bỏ lại phía sau. Một lời hỏi thăm, không phải một lời nhắc." action={<button className="button button-dark" onClick={onOpenFollowUp}><EnvelopeSimple size={17} /> Gửi lời hỏi thăm</button>} /><div className="followup-summary"><div className="summary-number"><strong>{absent.length}</strong><span>người chưa đến hôm nay</span></div><div className="summary-divider" /><div className="summary-number soft"><strong>7</strong><span>đã được hỏi thăm tuần này</span></div><div className="summary-note"><Heart size={20} weight="fill" /><span>Hãy nhớ tôn trọng lựa chọn nhận lời nhắc của mỗi người.</span></div></div><section className="followup-board"><div className="board-heading"><div><div className="eyebrow">Danh sách riêng tư</div><h2>Có thể cần một vòng tay</h2></div><span className="privacy-label"><LockKey size={14} /> Chỉ Ban điều hành</span></div><div className="followup-grid">{absent.slice(0, 8).map((member) => <article className="followup-person" key={member.id}><div className="followup-person-top"><span className="animal-avatar small" style={{ background: animalByKey(member.animal).soft }}><MascotAvatar id={member.mascotId} fallback={animalByKey(member.animal).emoji} size={34} /></span><button className="icon-button" onClick={() => onNotify(`Đã chọn ${member.name}`)} aria-label={`Tùy chọn ${member.name}`}><DotsThree size={18} /></button></div><strong>{member.name}</strong><span>{member.companion}</span><div className="followup-person-foot"><small>{member.streak + 1} tuần chưa gặp</small><button onClick={() => onNotify(`Đã tạo lời hỏi thăm cho ${member.name}`)}>Hỏi thăm <ArrowRight size={14} /></button></div></article>)}</div></section></>;
}

function AccessDenied() { return <div className="access-denied"><div className="state-icon muted"><LockKey size={28} /></div><h2>Khu vực riêng của người phụ trách</h2><p>Danh sách người vắng được bảo vệ để mọi lời hỏi thăm luôn giữ được sự riêng tư.</p></div>; }

export default App;
