
import { useState, useEffect } from 'react';
import {
  MapPin,
  Calendar,
  Clock,
  User as UserIcon,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Mail,
  Phone,
  AlertCircle,
  Check,
  MousePointer,
  X,
  LogIn,
  LogOut,
  Shield,
  Users,
  Plus,
  Trash2,
  Lock,
  KeyRound
} from 'lucide-react';
import { Calendar as BigCalendar, momentLocalizer, type View, type Messages, type Formats } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/sv';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import type { Location, Timeslot, User, AssetLocation, Booked, Free, AuthSession } from './types/models';
import {
  fetchLocations,
  fetchAssetLocations,
  fetchTimeslots,
  bookTime,
  fetchBookedByLocation,
  fetchFreeByLocation,
  fetchUsers,
  getAuthSession,
  login as apiLogin,
  logout as apiLogout,
  fetchFreeByLocationIdAdmin,
  addFreeTime,
  deleteFreeTime,
  addUser
} from './services/api';

moment.locale('sv');
const localizer = momentLocalizer(moment);

const calendarMessages: Messages = {
  allDay: 'Heldag',
  previous: 'Föregående',
  next: 'Nästa',
  today: 'Idag',
  month: 'Månad',
  week: 'Vecka',
  day: 'Dag',
  agenda: 'Agenda',
  date: 'Datum',
  time: 'Tid',
  event: 'Bokning',
  noEventsInRange: 'Inga bokningar under denna tidsperiod.',
  showMore: (total: number) => `+${total} fler`,
};

const calendarFormats: Formats = {
  timeGutterFormat: 'HH:mm',
  agendaTimeFormat: 'HH:mm',
  dayFormat: 'ddd DD/MM',
  dayHeaderFormat: 'dddd D MMMM',
  agendaDateFormat: 'ddd D MMMM',
  eventTimeRangeFormat: () => '',
  eventTimeRangeStartFormat: () => '',
  eventTimeRangeEndFormat: () => '',
  selectRangeFormat: ({ start, end }) => `${moment(start).format('HH:mm')} – ${moment(end).format('HH:mm')}`,
  agendaTimeRangeFormat: ({ start, end }) => `${moment(start).format('HH:mm')} – ${moment(end).format('HH:mm')}`,
};

// Formatting helper: YYYY-MM-DDTHH:mm
const formatToLocalISO = (date: Date): string => {
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const getDefaultStartTime = (): string => {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  return formatToLocalISO(new Date(now.getTime() + 60 * 60 * 1000));
};

const getDefaultEndTime = (): string => {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  return formatToLocalISO(new Date(now.getTime() + 25 * 60 * 60 * 1000));
};

const getCalendarMinTime = (): Date => {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  return d;
};

interface CalendarEvent {
  id: string | number;
  title: string;
  start: Date;
  end: Date;
  isSelection?: boolean;
  resource?: Booked;
}

const CalendarEventComponent = ({ event }: { event: CalendarEvent }) => {
  if (event.isSelection) {
    return (
      <div className="flex items-center gap-1 font-semibold text-xs leading-tight truncate">
        <MousePointer className="w-3 h-3 flex-shrink-0" />
        <span className="truncate">{event.title}</span>
      </div>
    );
  }

  const b = event.resource;
  const userStr = b?.userEmail || (b?.userId ? `Användare #${b.userId}` : 'Bokad');
  const timeStr = `${moment(event.start).format('HH:mm')} – ${moment(event.end).format('HH:mm')}`;

  return (
    <div
      className="flex flex-col text-xs leading-tight py-0.5 px-0.5 truncate overflow-hidden"
      title={`Bokning #${b?.id || ''}: ${timeStr} | Bokad av: ${userStr}`}
    >
      <div className="font-bold flex items-center gap-1 truncate text-white">
        <Clock className="w-3 h-3 flex-shrink-0" />
        <span className="truncate">{timeStr}</span>
      </div>
      <div className="text-[11px] font-medium opacity-95 truncate flex items-center gap-1 text-white/90">
        <UserIcon className="w-3 h-3 flex-shrink-0" />
        <span className="truncate">{userStr}</span>
      </div>
    </div>
  );
};

type AppTab = 'booking' | 'admin-free' | 'admin-users';

function App() {
  // Navigation tab state
  const [activeTab, setActiveTab] = useState<AppTab>('booking');

  // Authentication State (a41, a42)
  const [session, setSession] = useState<AuthSession | null>(() => getAuthSession());
  const [loginModalOpen, setLoginModalOpen] = useState<boolean>(false);
  const [loginEmail, setLoginEmail] = useState<string>('user@example.com');
  const [loginPassword, setLoginPassword] = useState<string>('user123');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState<boolean>(false);
  const [pendingBookingSlot, setPendingBookingSlot] = useState<Timeslot | null>(null);

  // Booking Flow Steps (a31-a34)
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Data State
  const [locations, setLocations] = useState<Location[]>([]);
  const [assetLocations, setAssetLocations] = useState<AssetLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [bookedList, setBookedList] = useState<Booked[]>([]);
  const [freeList, setFreeList] = useState<Free[]>([]);
  const [loadingBooked, setLoadingBooked] = useState<boolean>(false);
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [calendarView, setCalendarView] = useState<View>('week');
  const [calendarMinTime] = useState<Date>(getCalendarMinTime);

  // Selected Time Range in Calendar (Step 3)
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [selectedTimeslot, setSelectedTimeslot] = useState<Timeslot | null>(null);

  // Booking result (Step 8 / a34.4)
  const [bookedDetails, setBookedDetails] = useState<{
    locationName: string;
    assetLocationName: string;
    startTime: string;
    endTime: string;
    userEmail: string;
  } | null>(null);

  // Admin Free Timeslots State (a51)
  const [adminFreeLocationId, setAdminFreeLocationId] = useState<number>(1);
  const [adminFreeList, setAdminFreeList] = useState<Free[]>([]);
  const [adminFreeLoading, setAdminFreeLoading] = useState<boolean>(false);
  const [newFreeAssetId, setNewFreeAssetId] = useState<number>(1);
  const [newFreeStartTime, setNewFreeStartTime] = useState<string>(getDefaultStartTime);
  const [newFreeEndTime, setNewFreeEndTime] = useState<string>(getDefaultEndTime);

  // Admin Users State (a61, a62)
  const [adminUsersList, setAdminUsersList] = useState<User[]>([]);
  const [adminUsersLoading, setAdminUsersLoading] = useState<boolean>(false);
  const [newUserEmail, setNewUserEmail] = useState<string>('');
  const [newUserPassword, setNewUserPassword] = useState<string>('');
  const [newUserRoles, setNewUserRoles] = useState<string[]>(['BOOKUSER']);
  const [newUserPhone, setNewUserPhone] = useState<string>('');

  // Role Checks
  const isBookAdmin = Boolean(session?.role?.includes('BOOKADMIN'));
  const isBookUser = Boolean(session?.role?.includes('BOOKUSER'));
  const canBook = isBookAdmin || isBookUser;

  // Load locations and asset locations on mount
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [locs, assets] = await Promise.all([
          fetchLocations(),
          fetchAssetLocations(),
        ]);
        setLocations(locs);
        setAssetLocations(assets);
        if (locs.length > 0) {
          setAdminFreeLocationId(locs[0].id);
        }
        if (assets.length > 0) {
          setNewFreeAssetId(assets[0].assetId);
        }
      } catch (err: unknown) {
        console.error(err);
        setError('Kunde inte hämta platser från servern. Kontrollera att backend körs.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Fetch booked and free times whenever selectedLocation changes
  useEffect(() => {
    if (!selectedLocation) return;
    const locationId = selectedLocation.id;
    let isCancelled = false;
    async function loadCalendarData() {
      setLoadingBooked(true);
      try {
        const [booked, free] = await Promise.all([
          fetchBookedByLocation(locationId),
          fetchFreeByLocation(locationId).catch(() => []),
        ]);
        if (!isCancelled) {
          setBookedList(booked);
          setFreeList(free);
        }
      } catch (err: unknown) {
        console.error('Kunde inte läsa in kalenderdata:', err);
      } finally {
        if (!isCancelled) {
          setLoadingBooked(false);
        }
      }
    }
    loadCalendarData();
    return () => {
      isCancelled = true;
    };
  }, [selectedLocation]);

  // Admin Data Reload triggers
  const [adminFreeReloadKey, setAdminFreeReloadKey] = useState<number>(0);
  const [adminUsersReloadKey, setAdminUsersReloadKey] = useState<number>(0);

  // Load Admin Free Timeslots (a51)
  useEffect(() => {
    if (activeTab !== 'admin-free' || !isBookAdmin) return;
    let isCancelled = false;
    async function loadFree() {
      setAdminFreeLoading(true);
      setError(null);
      try {
        const data = await fetchFreeByLocationIdAdmin(adminFreeLocationId);
        if (!isCancelled) setAdminFreeList(data);
      } catch (err: unknown) {
        console.error(err);
        if (!isCancelled) setError('Kunde inte hämta lediga tider för admin.');
      } finally {
        if (!isCancelled) setAdminFreeLoading(false);
      }
    }
    loadFree();
    return () => {
      isCancelled = true;
    };
  }, [activeTab, adminFreeLocationId, isBookAdmin, adminFreeReloadKey]);

  // Load Admin Users (a62)
  useEffect(() => {
    if (activeTab !== 'admin-users' || !isBookAdmin) return;
    let isCancelled = false;
    async function loadUsers() {
      setAdminUsersLoading(true);
      setError(null);
      try {
        const data = await fetchUsers();
        if (!isCancelled) setAdminUsersList(data);
      } catch (err: unknown) {
        console.error(err);
        if (!isCancelled) setError('Kunde inte hämta användarlistan.');
      } finally {
        if (!isCancelled) setAdminUsersLoading(false);
      }
    }
    loadUsers();
    return () => {
      isCancelled = true;
    };
  }, [activeTab, isBookAdmin, adminUsersReloadKey]);

  // Convert local datetime-local value (YYYY-MM-DDTHH:mm) to backend ISO format
  const getBackendLocalISO = (dateTimeStr: string): string => {
    if (!dateTimeStr) return '';
    if (dateTimeStr.length === 16) {
      return `${dateTimeStr}:00`;
    }
    return dateTimeStr.slice(0, 19);
  };

  const formatDateTime = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('sv-SE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch {
      return isoStr;
    }
  };

  const formatTimeOnly = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return isoStr;
    }
  };

  const getAssetLocationName = (assetId: number) => {
    const match = assetLocations.find(al => al.assetId === assetId);
    return match ? match.name : `Resurs #${assetId}`;
  };

  // Login handler (a41)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      const newSession = await apiLogin(loginEmail.trim(), loginPassword);
      setSession(newSession);
      setLoginModalOpen(false);
      setSuccessToast(`Inloggad som ${newSession.email}`);

      // a34.2 -> a34.3: If user initiated booking before logging in, execute booking directly!
      if (pendingBookingSlot) {
        const slot = pendingBookingSlot;
        setPendingBookingSlot(null);
        await executeBooking(slot, newSession);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setLoginError(err.message);
      } else {
        setLoginError('Felaktig e-post eller lösenord.');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  // Quick preset login helper
  const handleQuickLogin = (email: string, pass: string) => {
    setLoginEmail(email);
    setLoginPassword(pass);
  };

  // Logout handler (a42)
  const handleLogout = async () => {
    try {
      await apiLogout();
    } finally {
      setSession(null);
      setActiveTab('booking');
      setSuccessToast('Du har loggats ut.');
    }
  };

  // Step 1 -> 3: Select Location (a31)
  const handleSelectLocation = (loc: Location) => {
    setSelectedLocation(loc);
    setBookedList([]);
    setFreeList([]);
    setStartTime('');
    setEndTime('');
    setError(null);
    setStep(3);
  };

  // Step 3 -> 6: Proceed directly to Step 6 (Boka) using selected calendar time
  const handleProceedToBooking = async () => {
    if (!selectedLocation) return;
    if (!startTime || !endTime) {
      setError('Vänligen markera en tid i kalendern först.');
      return;
    }
    if (new Date(startTime) >= new Date(endTime)) {
      setError('Starttid måste vara före sluttid.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const searchStart = getBackendLocalISO(startTime);
      const searchEnd = getBackendLocalISO(endTime);
      const slots = await fetchTimeslots(selectedLocation, searchStart, searchEnd);
      if (!slots || slots.length === 0) {
        setError('Det finns ingen ledig tid som täcker det markerade intervallet, eller så är tiden redan bokad.');
        return;
      }
      setSelectedTimeslot(slots[0]);
      setStep(6);
    } catch (err: unknown) {
      console.error(err);
      setError('Ett fel uppstod vid kontroll av ledig tid.');
    } finally {
      setLoading(false);
    }
  };

  // Execute Booking API call (a34.1, a34.3)
  const executeBooking = async (slot: Timeslot, currentSession: AuthSession) => {
    if (!selectedLocation) return;
    setLoading(true);
    setError(null);
    try {
      const sTime = getBackendLocalISO(startTime);
      const eTime = getBackendLocalISO(endTime);
      await bookTime(slot.freeid, currentSession.id, sTime, eTime);

      setBookedDetails({
        locationName: selectedLocation.name,
        assetLocationName: getAssetLocationName(slot.assetId),
        startTime: sTime,
        endTime: eTime,
        userEmail: currentSession.email,
      });

      setStep(8); // Step 8: Receipt (a34.4)
    } catch (err: unknown) {
      console.error(err);
      setError('Bokningen misslyckades. Tiden kan redan vara bokad av en annan användare.');
    } finally {
      setLoading(false);
    }
  };

  // Booking action button click (a34.1, a34.2)
  const handleInitiateBooking = async () => {
    if (!selectedTimeslot) return;

    if (!session) {
      // a34.2: User not logged in, prompt login workflow (a41)
      setPendingBookingSlot(selectedTimeslot);
      setLoginError('Vänligen logga in som BOOKUSER eller BOOKADMIN för att slutföra bokningen.');
      setLoginModalOpen(true);
      return;
    }

    if (!canBook) {
      setError('Ditt konto har inte behörighet att boka. Kräver rollen BOOKUSER eller BOOKADMIN.');
      return;
    }

    await executeBooking(selectedTimeslot, session);
  };

  // a34.4: Return to locations
  const handleReset = () => {
    setSelectedLocation(null);
    setSelectedTimeslot(null);
    setBookedDetails(null);
    setBookedList([]);
    setFreeList([]);
    setStartTime('');
    setEndTime('');
    setError(null);
    setPendingBookingSlot(null);
    setStep(1);
  };

  // Admin Free: Add Free Time (a51)
  const handleAddFreeTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFreeStartTime || !newFreeEndTime) {
      setError('Välj både start- och sluttid.');
      return;
    }
    setAdminFreeLoading(true);
    setError(null);
    try {
      await addFreeTime(
        newFreeAssetId,
        getBackendLocalISO(newFreeStartTime),
        getBackendLocalISO(newFreeEndTime)
      );
      setSuccessToast('Ny ledig tid skapad!');
      setAdminFreeReloadKey((k) => k + 1);
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error && err.message) {
        setError(err.message);
      } else {
        setError('Misslyckades med att skapa ledig tid.');
      }
    } finally {
      setAdminFreeLoading(false);
    }
  };

  // Admin Free: Delete Free Time (a51)
  const handleDeleteFreeTime = async (freeId: number) => {
    if (!window.confirm(`Vill du ta bort ledig tidslucka #${freeId}?`)) return;
    setAdminFreeLoading(true);
    setError(null);
    try {
      await deleteFreeTime(freeId);
      setSuccessToast(`Ledig tidslucka #${freeId} togs bort.`);
      setAdminFreeReloadKey((k) => k + 1);
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error && err.message) {
        setError(err.message);
      } else {
        setError('Kunde inte ta bort ledig tid.');
      }
    } finally {
      setAdminFreeLoading(false);
    }
  };

  // Admin User: Add User (a61)
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim() || !newUserPassword.trim()) {
      setError('E-post och lösenord krävs.');
      return;
    }
    if (newUserPassword.length < 6) {
      setError('Lösenordet måste vara minst 6 tecken.');
      return;
    }
    if (newUserRoles.length === 0) {
      setError('Välj minst en roll.');
      return;
    }

    setAdminUsersLoading(true);
    setError(null);
    try {
      const email = newUserEmail.trim();
      await addUser({
        email,
        password: newUserPassword,
        role: newUserRoles.join(','),
        code: 0,
        address: {
          email,
          phone: newUserPhone.trim() || '',
        }
      });
      setSuccessToast(`Användaren ${email} har skapats!`);
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserPhone('');
      setAdminUsersReloadKey((k) => k + 1);
    } catch (err: unknown) {
      console.error(err);
      setError('Misslyckades med att skapa användare. E-posten kan redan vara registrerad.');
    } finally {
      setAdminUsersLoading(false);
    }
  };

  // Toggle role in Add User form
  const toggleRole = (roleToToggle: string) => {
    if (newUserRoles.includes(roleToToggle)) {
      if (newUserRoles.length > 1) {
        setNewUserRoles(newUserRoles.filter(r => r !== roleToToggle));
      }
    } else {
      setNewUserRoles([...newUserRoles, roleToToggle]);
    }
  };

  // Map booked times to Big Calendar events
  const bookedEvents = bookedList.map((b) => {
    const userStr = b.userEmail || (b.userId ? `Användare #${b.userId}` : 'Bokad');
    const timeStr = `${moment(b.startTime).format('HH:mm')} – ${moment(b.endTime).format('HH:mm')}`;
    return {
      id: `booked-${b.id}`,
      title: `${timeStr} Bokad (${userStr})`,
      start: new Date(b.startTime),
      end: new Date(b.endTime),
      isSelection: false,
      resource: b,
    };
  });

  const hasValidSelection = Boolean(
    startTime &&
    endTime &&
    !isNaN(new Date(startTime).getTime()) &&
    !isNaN(new Date(endTime).getTime()) &&
    new Date(startTime) < new Date(endTime)
  );

  const selectedAreaEvent = hasValidSelection
    ? [
      {
        id: 'selected-search-window',
        title: `Markerat sökintervall (${formatTimeOnly(startTime)} – ${formatTimeOnly(endTime)})`,
        start: new Date(startTime),
        end: new Date(endTime),
        isSelection: true,
      },
    ]
    : [];

  const calendarEvents = [...bookedEvents, ...selectedAreaEvent];

  const getDurationDescription = (startStr: string, endStr: string) => {
    if (!startStr || !endStr) return '';
    const startD = new Date(startStr);
    const endD = new Date(endStr);
    if (isNaN(startD.getTime()) || isNaN(endD.getTime()) || startD >= endD) return '';

    const diffMs = endD.getTime() - startD.getTime();
    const totalMinutes = Math.round(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;

    if (days > 0) {
      return remHours > 0 ? `${days} d ${remHours} tim` : `${days} dag${days > 1 ? 'ar' : ''}`;
    }
    if (hours > 0) {
      return mins > 0 ? `${hours} tim ${mins} min` : `${hours} timm${hours > 1 ? 'ar' : 'e'}`;
    }
    return `${mins} min`;
  };

  const handleSelectSlot = (slotInfo: {
    start: Date;
    end: Date;
    slots: Date[];
    action: 'select' | 'click' | 'doubleClick';
  }) => {
    let start = new Date(slotInfo.start);
    let end = new Date(slotInfo.end);

    if (calendarView === 'month') {
      if (slotInfo.slots && slotInfo.slots.length > 1) {
        const firstDay = new Date(slotInfo.slots[0]);
        firstDay.setHours(9, 0, 0, 0);
        const lastDay = new Date(slotInfo.slots[slotInfo.slots.length - 1]);
        lastDay.setHours(18, 0, 0, 0);
        start = firstDay;
        end = lastDay;
      } else {
        start.setHours(9, 0, 0, 0);
        end = new Date(start);
        end.setHours(17, 0, 0, 0);
      }
    } else {
      const isAllDay =
        start.getHours() === 0 &&
        start.getMinutes() === 0 &&
        end.getHours() === 0 &&
        end.getMinutes() === 0 &&
        end.getTime() - start.getTime() >= 24 * 60 * 60 * 1000;

      if (isAllDay) {
        if (slotInfo.slots && slotInfo.slots.length > 1) {
          const firstDay = new Date(slotInfo.slots[0]);
          firstDay.setHours(9, 0, 0, 0);
          const lastDay = new Date(slotInfo.slots[slotInfo.slots.length - 1]);
          lastDay.setHours(18, 0, 0, 0);
          start = firstDay;
          end = lastDay;
        } else {
          start.setHours(9, 0, 0, 0);
          end = new Date(start);
          end.setHours(17, 0, 0, 0);
        }
      } else if (slotInfo.action === 'click' && start.getTime() === end.getTime()) {
        end = new Date(start.getTime() + 60 * 60 * 1000);
      }
    }

    setStartTime(formatToLocalISO(start));
    setEndTime(formatToLocalISO(end));
    setError(null);
  };

  const handleDrillDown = (date: Date, view?: View) => {
    setCalendarDate(date);
    setCalendarView(view || 'day');
  };

  const isTimeInFreeRange = (date: Date) => {
    if (!freeList || freeList.length === 0) return false;
    const t = date.getTime();
    return freeList.some((f) => {
      const start = new Date(f.startTime).getTime();
      const end = new Date(f.endTime).getTime();
      return t >= start && t < end;
    });
  };

  const isDayInFreeRange = (date: Date) => {
    if (!freeList || freeList.length === 0) return false;
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999).getTime();
    return freeList.some((f) => {
      const start = new Date(f.startTime).getTime();
      const end = new Date(f.endTime).getTime();
      return start <= dayEnd && end >= dayStart;
    });
  };

  const slotPropGetter = (date: Date) => {
    if (hasValidSelection) {
      const s = new Date(startTime);
      const e = new Date(endTime);
      if (date >= s && date < e) {
        return { className: 'rbc-selected-area-cell' };
      }
    }
    if (isTimeInFreeRange(date)) {
      return { className: 'rbc-free-time-slot' };
    }
    return {};
  };

  const dayPropGetter = (date: Date) => {
    if (hasValidSelection) {
      const s = new Date(startTime);
      const e = new Date(endTime);
      const sDay = new Date(s.getFullYear(), s.getMonth(), s.getDate());
      const eDay = new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59);
      if (date >= sDay && date <= eDay) {
        return { className: 'rbc-selected-area-cell' };
      }
    }
    if (isDayInFreeRange(date)) {
      return { className: 'rbc-free-time-day' };
    }
    return {};
  };

  const eventPropGetter = (event: CalendarEvent) => {
    if (event.isSelection) {
      return {
        className: 'rbc-selection-event',
        style: {
          backgroundColor: '#2563eb',
          borderColor: '#1d4ed8',
          color: '#ffffff',
          borderRadius: '8px',
          padding: '3px 8px',
          fontSize: '0.775rem',
          fontWeight: 600,
          border: '2px solid #1d4ed8',
          boxShadow: '0 4px 10px rgba(37, 99, 235, 0.35)',
          zIndex: 20,
        },
      };
    }
    return {
      className: 'rbc-booked-event',
      style: {
        backgroundColor: '#ef4444',
        borderColor: '#dc2626',
        color: '#ffffff',
        borderRadius: '6px',
        padding: '2px 6px',
        fontSize: '0.75rem',
        fontWeight: 600,
        zIndex: 10,
        boxShadow: '0 2px 5px rgba(220, 38, 38, 0.3)',
      },
    };
  };

  const handleClearSelection = () => {
    setStartTime('');
    setEndTime('');
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 flex flex-col justify-start items-center relative overflow-hidden">
      {/* Background Graphic Accents */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-blue-100 to-transparent pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-0 w-full h-96 bg-gradient-to-tl from-indigo-100 to-transparent pointer-events-none -z-10" />

      {/* Main Container Card */}
      <div className="w-full max-w-5xl bg-white text-black p-6 shadow-md rounded-3xl border border-slate-200 transition-all duration-300 mb-8">

        {/* Header Bar with Auth Session & Tabs */}
        <header className="mb-6 border-b border-slate-200 pb-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-blue-800 flex items-center gap-2">
                <Calendar className="w-8 h-8 text-blue-600 flex-shrink-0" />
                Community Resource Booking
              </h1>
              <p className="text-slate-600 text-sm mt-0.5">
                Boka lokaler och resurser enkelt och säkert
              </p>
            </div>

            {/* Auth Controls (a41, a42) */}
            <div className="flex items-center gap-2.5 self-start md:self-center flex-wrap">
              {session ? (
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-1.5 pr-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <div className="text-left leading-tight">
                    <div className="text-xs font-bold text-slate-800">{session.email}</div>
                    <div className="flex items-center gap-1 mt-0.5">
                      {session.role.split(',').map((r) => (
                        <span
                          key={r}
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${r === 'BOOKADMIN'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="ml-2 text-xs font-semibold text-slate-600 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-xl transition-colors border border-transparent hover:border-red-200 flex items-center gap-1"
                    title="Logga ut (a42)"
                  >
                    <LogOut className="w-4 h-4 text-slate-500 hover:text-red-600" />
                    <span className="hidden sm:inline">Logga ut</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setLoginError(null);
                    setPendingBookingSlot(null);
                    setLoginModalOpen(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl text-sm shadow-sm hover:shadow transition-all flex items-center gap-1.5"
                >
                  <LogIn className="w-4 h-4" />
                  Logga in
                </button>
              )}
            </div>
          </div>

          {/* Navigation Tabs (Booking flow + Admin Tabs for BOOKADMIN) */}
          <div className="flex items-center gap-2 mt-5 border-t border-slate-100 pt-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab('booking')}
              className={`text-sm font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${activeTab === 'booking'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-blue-800 hover:bg-blue-50'
                }`}
            >
              <Calendar className="w-4 h-4" />
              Bokning
            </button>

            {isBookAdmin && (
              <>
                <button
                  onClick={() => setActiveTab('admin-free')}
                  className={`text-sm font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${activeTab === 'admin-free'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-purple-800 hover:bg-purple-50 border border-purple-200'
                    }`}
                >
                  <Shield className="w-4 h-4" />
                  Lediga tider (Admin a51)
                </button>
                <button
                  onClick={() => setActiveTab('admin-users')}
                  className={`text-sm font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${activeTab === 'admin-users'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-purple-800 hover:bg-purple-50 border border-purple-200'
                    }`}
                >
                  <Users className="w-4 h-4" />
                  Användare (Admin a61/a62)
                </button>
              </>
            )}
          </div>
        </header>

        {/* Feedback Messages */}
        {successToast && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-800 rounded-2xl p-3.5 flex items-center justify-between text-sm animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <span>{successToast}</span>
            </div>
            <button onClick={() => setSuccessToast(null)} className="text-green-700 hover:text-green-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {error && !loading && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3 text-red-800 animate-fadeIn">
            <AlertCircle className="w-6 h-6 flex-shrink-0 text-red-600" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-800">Ett fel inträffade</h3>
              <p className="text-sm mt-0.5">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Global Loading Spinner */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="w-10 h-10 text-blue-600 animate-spin" />
            <p className="mt-4 text-slate-500 font-medium">Kommunicerar med servern...</p>
          </div>
        )}

        {/* TAB 1: BOOKING WORKFLOW (a31 - a34) */}
        {!loading && activeTab === 'booking' && (
          <main>
            {/* Step Wizard Progress Header */}
            <nav aria-label="Progress" className="mb-8">
              <ol className="flex flex-wrap items-center justify-center gap-2 md:gap-4 text-xs md:text-sm font-medium">
                <li className={`flex items-center gap-1.5 pb-2 border-b-2 ${step >= 1 ? 'border-blue-600 text-blue-800 font-bold' : 'border-transparent text-slate-400'}`}>
                  <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>1</span>
                  1. Platser (OPEN)
                </li>
                <ChevronRight className="w-4 h-4 text-slate-400 hidden sm:block" />
                <li className={`flex items-center gap-1.5 pb-2 border-b-2 ${step >= 3 ? 'border-blue-600 text-blue-800 font-bold' : 'border-transparent text-slate-400'}`}>
                  <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>3</span>
                  3. Kalender (OPEN)
                </li>
                <ChevronRight className="w-4 h-4 text-slate-400 hidden sm:block" />
                <li className={`flex items-center gap-1.5 pb-2 border-b-2 ${step >= 6 ? 'border-blue-600 text-blue-800 font-bold' : 'border-transparent text-slate-400'}`}>
                  <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] ${step >= 6 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>6</span>
                  6. Boka (Auth)
                </li>
                <ChevronRight className="w-4 h-4 text-slate-400 hidden sm:block" />
                <li className={`flex items-center gap-1.5 pb-2 border-b-2 ${step >= 8 ? 'border-blue-600 text-blue-800 font-bold' : 'border-transparent text-slate-400'}`}>
                  <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] ${step >= 8 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>8</span>
                  8. Bekräftelse
                </li>
              </ol>
            </nav>

            {/* STEP 1: View/Select Location (a31: OPEN) */}
            {step === 1 && (
              <div className="animate-fadeIn">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    a31. Välj en plats (OPEN)
                  </h2>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-green-50 text-green-700 rounded-full border border-green-200">
                    Öppen för alla
                  </span>
                </div>
                <p className="text-slate-600 text-sm mb-6">
                  Välj en av de tillgängliga anläggningarna för att visa kalender och lediga tider.
                </p>

                {locations.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
                    <p className="text-slate-500">Inga platser finns tillgängliga i systemet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {locations.map((location) => (
                      <button
                        key={location.id}
                        onClick={() => handleSelectLocation(location)}
                        className="text-left bg-white border border-blue-200 hover:bg-blue-50/50 p-5 rounded-2xl transition-all group flex flex-col justify-between h-full hover:shadow-lg hover:border-blue-300"
                      >
                        <div>
                          <div className="flex justify-between items-start">
                            <span className="text-xs font-semibold px-2.5 py-0.5 bg-blue-50 text-blue-800 rounded-full border border-blue-100">
                              Plats #{location.id}
                            </span>
                          </div>
                          <h3 className="font-bold text-lg text-slate-800 mt-2.5 group-hover:text-blue-800 transition-colors">
                            {location.name}
                          </h3>
                          {location.address && (
                            <div className="text-sm text-slate-600 mt-2.5 space-y-1">
                              {location.address.email && (
                                <p className="flex items-center gap-1.5">
                                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                                  {location.address.email}
                                </p>
                              )}
                              {location.address.phone && (
                                <p className="flex items-center gap-1.5">
                                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                                  {location.address.phone}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="mt-5 pt-3 w-full border-t border-slate-100 flex items-center text-sm font-semibold text-blue-600 group-hover:translate-x-1 transition-transform">
                          Välj plats och se kalender <ChevronRight className="w-4 h-4 ml-1" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: View Calendar & Select Time (a32, a33: OPEN) */}
            {step === 3 && selectedLocation && (
              <div className="animate-fadeIn">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    a32. Kalender & a33. Tidsintervall (OPEN)
                  </h2>
                  <button
                    onClick={() => setStep(1)}
                    className="text-sm text-slate-500 hover:text-blue-800 flex items-center gap-1 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Tillbaka till platser
                  </button>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 mb-6 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">Vald plats</span>
                    <h3 className="text-lg font-bold text-blue-800">{selectedLocation.name}</h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold bg-slate-100 text-slate-700 border border-slate-300">
                      <span className="w-2.5 h-2.5 rounded-sm bg-slate-300 border border-slate-400"></span>
                      Ledig tid ({freeList.length})
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold bg-red-50 text-red-700 border border-red-200">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                      Bokade ({bookedList.length})
                    </span>
                    {loadingBooked && <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />}
                  </div>
                </div>

                {/* Big Calendar */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-md mb-6">
                  <div className="h-[480px]">
                    <BigCalendar
                      localizer={localizer}
                      culture="sv"
                      messages={calendarMessages}
                      formats={calendarFormats}
                      events={calendarEvents}
                      startAccessor="start"
                      endAccessor="end"
                      titleAccessor="title"
                      views={['month', 'week', 'day', 'agenda']}
                      defaultView="week"
                      min={calendarMinTime}
                      scrollToTime={calendarMinTime}
                      date={calendarDate}
                      onNavigate={(newDate) => setCalendarDate(newDate)}
                      onView={(newView) => setCalendarView(newView)}
                      onDrillDown={handleDrillDown}
                      view={calendarView}
                      selectable
                      onSelectSlot={handleSelectSlot}
                      eventPropGetter={eventPropGetter}
                      slotPropGetter={slotPropGetter}
                      dayPropGetter={dayPropGetter}
                      components={{
                        event: CalendarEventComponent,
                      }}
                    />
                  </div>
                </div>

                {/* Tidsintervall action card */}
                <div className="bg-white text-black p-5 shadow-md border border-slate-200 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-500/20">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-blue-900">
                          Tidsintervall
                        </h3>
                        {hasValidSelection && getDurationDescription(startTime, endTime) && (
                          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-200">
                            Varaktighet: {getDurationDescription(startTime, endTime)}
                          </span>
                        )}
                      </div>
                      {hasValidSelection ? (
                        <p className="text-sm font-semibold text-slate-700 mt-0.5">
                          {new Date(startTime).toLocaleDateString('sv-SE', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}{' '}
                          <span className="text-blue-700 font-bold">
                            {formatTimeOnly(startTime)} – {formatTimeOnly(endTime)}
                          </span>
                        </p>
                      ) : (
                        <p className="text-xs text-slate-500 mt-0.5">
                          Markera önskad tid i kalendern ovan för att boka.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 justify-end">
                    {hasValidSelection && (
                      <button
                        type="button"
                        onClick={handleClearSelection}
                        className="text-xs font-semibold px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1 shadow-sm"
                      >
                        <X className="w-3.5 h-3.5" /> Rensa
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleProceedToBooking}
                      disabled={!hasValidSelection || loading}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 px-6 rounded-xl flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
                    >
                      {loading ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          Gå till Boka (Step 6)
                          <ChevronRight className="w-5 h-5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 6 & 7: Booking Review & Confirmation (a34.1, a34.2, a34.3) */}
            {step === 6 && selectedLocation && selectedTimeslot && (
              <div className="animate-fadeIn">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    a34.1 Boka tid (Kräver BOOKUSER eller BOOKADMIN)
                  </h2>
                  <button
                    onClick={() => setStep(3)}
                    className="text-sm text-slate-500 hover:text-blue-800 flex items-center gap-1 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Tillbaka till kalender
                  </button>
                </div>

                {/* Booking summary card */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6">
                  <h3 className="font-bold text-blue-800 mb-3">Sammanfattning av vald tid</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-700">
                    <div><strong>Anläggning / Plats:</strong> {selectedLocation.name}</div>
                    <div><strong>Resurs:</strong> {getAssetLocationName(selectedTimeslot.assetId)}</div>
                    <div><strong>Tidslucka ID:</strong> {selectedTimeslot.freeid}</div>
                    <div><strong>Datum:</strong> {new Date(startTime || selectedTimeslot.startTime).toLocaleDateString('sv-SE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                    <div><strong>Tid:</strong> {formatTimeOnly(startTime || selectedTimeslot.startTime)} – {formatTimeOnly(endTime || selectedTimeslot.endTime)}</div>
                  </div>
                </div>

                {/* Authentication Check Card (a34.2 -> a41) */}
                <div className="bg-white text-black p-6 shadow-md border border-slate-200 rounded-2xl space-y-6">
                  {session ? (
                    <div>
                      <div className="flex items-center justify-between p-4 bg-blue-50/60 rounded-xl border border-blue-200 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                            <UserIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-800">{session.email}</div>
                            <div className="text-xs text-slate-500">
                              Rollar: <span className="font-semibold text-blue-800">{session.role}</span>
                            </div>
                          </div>
                        </div>
                        {canBook ? (
                          <span className="text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Behörig att boka
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> Saknar bokningsroll
                          </span>
                        )}
                      </div>

                      <div className="flex justify-end pt-4 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={handleInitiateBooking}
                          disabled={!canBook || loading}
                          className={`font-bold py-3 px-8 rounded-xl shadow-md transition-all flex items-center gap-2 ${canBook
                            ? 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                          {loading ? 'Bokar...' : 'Bekräfta och boka tid (a34.3)'}
                          <CheckCircle className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-3">
                        <Lock className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-lg text-slate-800 mb-1">
                        Inloggning krävs (a34.2)
                      </h3>
                      <p className="text-slate-600 text-sm max-w-md mx-auto mb-6">
                        För att slutföra bokningen måste du vara inloggad som användare med rollen <strong>BOOKUSER</strong> eller <strong>BOOKADMIN</strong>.
                      </p>
                      <button
                        type="button"
                        onClick={handleInitiateBooking}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-md hover:shadow-lg transition-all inline-flex items-center gap-2"
                      >
                        <LogIn className="w-5 h-5" />
                        Logga in för att boka tid (a41)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 8: Booking Receipt & Return to Locations (a34.4) */}
            {step === 8 && bookedDetails && (
              <div className="text-center py-8 animate-scaleIn">
                <div className="w-16 h-16 bg-green-50 border border-green-200 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Bokning bekräftad!</h2>
                <p className="text-slate-600 mb-8">Ditt kvitto och bokningsdetaljer visas nedan.</p>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-left max-w-md mx-auto space-y-4 shadow-md mb-8">
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 font-bold block tracking-wider">Plats</span>
                    <span className="font-bold text-blue-800 text-lg">{bookedDetails.locationName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 font-bold block tracking-wider">Resurs</span>
                    <span className="font-bold text-slate-800">{bookedDetails.assetLocationName}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] uppercase text-slate-500 font-bold block tracking-wider">Starttid</span>
                      <span className="font-medium text-slate-700">{formatDateTime(bookedDetails.startTime)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-slate-500 font-bold block tracking-wider">Sluttid</span>
                      <span className="font-medium text-slate-700">{formatDateTime(bookedDetails.endTime)}</span>
                    </div>
                  </div>
                  <div className="border-t border-slate-200 pt-4">
                    <span className="text-[10px] uppercase text-slate-500 font-bold block tracking-wider">Bokad av</span>
                    <span className="font-bold text-slate-900">{bookedDetails.userEmail}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-4 flex items-center justify-between">
                    <span className="text-[10px] uppercase text-slate-500 font-bold block tracking-wider">Bokningsstatus</span>
                    <span className="text-xs font-bold text-green-700 bg-green-50 px-2.5 py-0.5 rounded-full border border-green-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                      Bekräftad
                    </span>
                  </div>
                </div>

                {/* a34.4: Return to locations */}
                <button
                  onClick={handleReset}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 mx-auto"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Tillbaka till platser (a34.4)
                </button>
              </div>
            )}
          </main>
        )}

        {/* TAB 2: ADMIN FREE TIMESLOTS (a51: BOOKADMIN) */}
        {!loading && activeTab === 'admin-free' && isBookAdmin && (
          <div className="animate-fadeIn space-y-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-purple-900 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-purple-600" />
                  a51. Hantera lediga tider (BOOKADMIN)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Visa, skapa och ta bort lediga tidsluckor i systemet
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="admin-loc" className="text-xs font-semibold text-slate-600">
                  Välj plats:
                </label>
                <select
                  id="admin-loc"
                  value={adminFreeLocationId}
                  onChange={(e) => setAdminFreeLocationId(Number(e.target.value))}
                  className="border border-purple-200 rounded-xl p-2 text-sm bg-purple-50/40 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} (ID: {loc.id})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Show Exception message on page Lediga tider */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-4 flex items-center justify-between animate-fadeIn">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-red-800 text-sm">Felmeddelande</h4>
                    <p className="text-sm mt-0.5">{error}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="text-red-600 hover:text-red-800 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Create Free Timeslot Form */}
            <form
              onSubmit={handleAddFreeTime}
              className="bg-purple-50/40 border border-purple-200 rounded-2xl p-5 space-y-4"
            >
              <h3 className="font-bold text-purple-900 text-sm flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-purple-600" />
                Skapa ny ledig tidslucka
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Resurs / Asset
                  </label>
                  <select
                    value={newFreeAssetId}
                    onChange={(e) => setNewFreeAssetId(Number(e.target.value))}
                    className="w-full border border-purple-200 rounded-xl p-2.5 bg-white text-slate-800"
                  >
                    {assetLocations
                      .filter((al) => al.locationId === adminFreeLocationId || true)
                      .map((al) => (
                        <option key={al.assetId} value={al.assetId}>
                          {al.name} (ID: {al.assetId})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Starttid
                  </label>
                  <input
                    type="datetime-local"
                    value={newFreeStartTime}
                    onChange={(e) => setNewFreeStartTime(e.target.value)}
                    className="w-full border border-purple-200 rounded-xl p-2.5 bg-white text-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sluttid
                  </label>
                  <input
                    type="datetime-local"
                    value={newFreeEndTime}
                    onChange={(e) => setNewFreeEndTime(e.target.value)}
                    className="w-full border border-purple-200 rounded-xl p-2.5 bg-white text-slate-800"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={adminFreeLoading}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 px-6 rounded-xl text-sm shadow-sm hover:shadow transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  {adminFreeLoading ? 'Sparar...' : 'Lägg till ledig tid'}
                </button>
              </div>
            </form>

            {/* List of Free Timeslots */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-800 text-sm">
                  Aktuella lediga tider för vald plats ({adminFreeList.length} st)
                </h3>
                <button
                  onClick={() => setAdminFreeReloadKey((k) => k + 1)}
                  className="text-xs text-purple-700 hover:text-purple-900 flex items-center gap-1"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${adminFreeLoading ? 'animate-spin' : ''}`} />
                  Uppdatera lista
                </button>
              </div>

              {adminFreeList.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl text-slate-500 text-sm">
                  Inga lediga tider registrerade för denna plats.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm text-slate-700">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                      <tr>
                        <th className="p-3">ID</th>
                        <th className="p-3">Resurs</th>
                        <th className="p-3">Starttid</th>
                        <th className="p-3">Sluttid</th>
                        <th className="p-3 text-right">Åtgärd</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {adminFreeList.map((free) => (
                        <tr key={free.id} className="hover:bg-slate-50/60">
                          <td className="p-3 font-mono text-xs">#{free.id}</td>
                          <td className="p-3 font-medium text-slate-900">{getAssetLocationName(free.assetId)}</td>
                          <td className="p-3">{formatDateTime(free.startTime)}</td>
                          <td className="p-3">{formatDateTime(free.endTime)}</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleDeleteFreeTime(free.id)}
                              className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1.5 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                              title="Ta bort ledig tid"
                            >
                              <Trash2 className="w-4 h-4" />
                              Ta bort
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: ADMIN USERS (a61, a62: BOOKADMIN) */}
        {!loading && activeTab === 'admin-users' && isBookAdmin && (
          <div className="animate-fadeIn space-y-8">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-purple-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                a61 & a62. Hantera användare (BOOKADMIN)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Visa alla registrerade användare och lägg till nya användare med krypterat lösenord
              </p>
            </div>

            {/* a61: Add User Form */}
            <form
              onSubmit={handleAddUser}
              className="bg-purple-50/40 border border-purple-200 rounded-2xl p-5 space-y-4"
            >
              <h3 className="font-bold text-purple-900 text-sm flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-purple-600" />
                a61. Lägg till ny användare
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    E-postadress (a11)
                  </label>
                  <input
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="namn@example.com"
                    className="w-full border border-purple-200 rounded-xl p-2.5 bg-white text-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lösenord (a12 - minst 6 tecken, sparas krypterat)
                  </label>
                  <input
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Minst 6 tecken"
                    className="w-full border border-purple-200 rounded-xl p-2.5 bg-white text-slate-800"
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Telefonnummer (valfritt)
                  </label>
                  <input
                    type="tel"
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                    placeholder="070-1234567"
                    className="w-full border border-purple-200 rounded-xl p-2.5 bg-white text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Rollar (a15)
                  </label>
                  <div className="flex items-center gap-4 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={newUserRoles.includes('BOOKUSER')}
                        onChange={() => toggleRole('BOOKUSER')}
                        className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4"
                      />
                      BOOKUSER
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={newUserRoles.includes('BOOKADMIN')}
                        onChange={() => toggleRole('BOOKADMIN')}
                        className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4"
                      />
                      BOOKADMIN
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={adminUsersLoading}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 px-6 rounded-xl text-sm shadow-sm hover:shadow transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  {adminUsersLoading ? 'Skapar...' : 'Skapa användare (a61)'}
                </button>
              </div>
            </form>

            {/* a62: View Users Table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-800 text-sm">
                  a62. Registrerade användare ({adminUsersList.length} st)
                </h3>
                <button
                  onClick={() => setAdminUsersReloadKey((k) => k + 1)}
                  className="text-xs text-purple-700 hover:text-purple-900 flex items-center gap-1"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${adminUsersLoading ? 'animate-spin' : ''}`} />
                  Uppdatera
                </button>
              </div>

              {adminUsersList.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl text-slate-500 text-sm">
                  Inga användare hämtade.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm text-slate-700">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                      <tr>
                        <th className="p-3">ID</th>
                        <th className="p-3">E-post</th>
                        <th className="p-3">Rollar</th>
                        <th className="p-3">Kod</th>
                        <th className="p-3">Skapad</th>
                        <th className="p-3">Telefon</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {adminUsersList.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/60">
                          <td className="p-3 font-mono text-xs">#{u.id}</td>
                          <td className="p-3 font-medium text-slate-900">{u.email}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-1 flex-wrap">
                              {u.role.split(',').map((r) => (
                                <span
                                  key={r}
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r === 'BOOKADMIN'
                                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    }`}
                                >
                                  {r}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-3 font-mono text-xs text-slate-500">{u.code}</td>
                          <td className="p-3 text-xs text-slate-500">{u.createtime ? formatDateTime(u.createtime) : '—'}</td>
                          <td className="p-3 text-xs text-slate-500">{u.address?.phone || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* LOGIN MODAL DIALOG (a41: OPEN login workflow) */}
      {loginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 relative animate-scaleIn">
            <button
              onClick={() => {
                setLoginModalOpen(false);
                setPendingBookingSlot(null);
              }}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mb-4">
              <KeyRound className="w-6 h-6" />
            </div>

            <h2 className="text-2xl font-extrabold text-slate-900">
              Logga in (a41)
            </h2>
            <p className="text-sm text-slate-500 mt-1 mb-6">
              {pendingBookingSlot
                ? 'Logga in för att slutföra din bokning.'
                : 'Ange din e-post och lösenord för att autentisera.'}
            </p>

            {loginError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
                <span>{loginError}</span>
              </div>
            )}

            {/* Quick Demo Credentials */}
            <div className="mb-5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Snabbval demo-konton:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('user@example.com', 'user123')}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors"
                >
                  user@example.com (BOOKUSER)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin@example.com', 'admin123')}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 transition-colors"
                >
                  admin@example.com (BOOKADMIN)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('super@example.com', 'super123')}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors"
                >
                  super@example.com (Dual)
                </button>
              </div>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  E-post (Användar-ID)
                </label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="din@epost.se"
                  className="w-full border border-blue-200 rounded-xl p-3 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Lösenord
                </label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Lösenord"
                  className="w-full border border-blue-200 rounded-xl p-3 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm mt-2"
              >
                {loginLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Loggar in...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Logga in
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
