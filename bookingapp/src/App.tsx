/* create a booking app in react typescript using tailwind styling and API calls. 
Update number step 6  App prompts user to enter user name and stores it using @PostMapping("/user/findOrCreate"))
and use tailwind styles for coloring "bg-white text-black p-6 shadow-md" 
 
Booking is done in steps

1. User see locations in api @GetMapping("/locations") 
2. User select one location 
3. User enters starttime and endtime
4. Display a list of free timeslots in the selected location id using @PostMapping("/timeslot")
5. User select a free timeslot.
6. App prompts user to enter user name and stores it using @PostMapping("/user/findOrCreate"))
7. Book time using @PostMapping("/bookTime")
8. Display booking details and status of booking
8. User press return button to go to start 


Create necessary main page and required forms, use tailwind styles for coloring "bg-white text-black p-6 shadow-md", "text-blue-800", "hover:bg-blue-50", and "border-blue-200" and  grid component with "flex h-auto flex-wrap flex-cols-3 content-start gap-1 p-4"

Create API functions calling spring boot interface BookController.java
Create typescript data definitions using Models.java 

Keep this information as a comment in the generated main component.
*/

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
  X
} from 'lucide-react';
import { Calendar as BigCalendar, momentLocalizer, type View, type Messages, type Formats } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/sv';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import type { Location, Timeslot, User, AssetLocation, Booked, Free } from './types/models';
import { fetchLocations, fetchAssetLocations, fetchTimeslots, findOrCreateUser, bookTime, fetchBookedByLocation, fetchFreeByLocation, fetchUsers } from './services/api';

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

interface CalendarEvent {
  id: string | number;
  title: string;
  start: Date;
  end: Date;
  isSelection?: boolean;
  resource?: Booked;
}

function App() {
  // Navigation & Step State (Aligned to 8 distinct steps)
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Data State
  const [locations, setLocations] = useState<Location[]>([]);
  const [assetLocations, setAssetLocations] = useState<AssetLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [bookedList, setBookedList] = useState<Booked[]>([]);
  const [freeList, setFreeList] = useState<Free[]>([]);
  const [loadingBooked, setLoadingBooked] = useState<boolean>(false);
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [calendarView, setCalendarView] = useState<View>('month');

  // Search Range State (Step 3)
  const [startTime, setStartTime] = useState<string>(getDefaultStartTime);
  const [endTime, setEndTime] = useState<string>(getDefaultEndTime);

  // Timeslots State (Step 4 & 5)
  const [timeslots, setTimeslots] = useState<Timeslot[]>([]);
  const [selectedTimeslot, setSelectedTimeslot] = useState<Timeslot | null>(null);

  // User State (Step 6)
  const [userName, setUserName] = useState<string>('');
  const [user, setUser] = useState<User | null>(null);

  // Booking result (Step 8)
  const [bookedDetails, setBookedDetails] = useState<{
    locationName: string;
    assetLocationName: string;
    startTime: string;
    endTime: string;
    userName: string;
  } | null>(null);

  // Fetch locations, asset locations, and users on mount
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [locs, assets, userList] = await Promise.all([
          fetchLocations(),
          fetchAssetLocations(),
          fetchUsers().catch(() => [])
        ]);
        setLocations(locs);
        setAssetLocations(assets);
        setUsers(userList);
      } catch (err: unknown) {
        console.error(err);
        setError('Failed to fetch available spaces. Make sure the Spring Boot backend is running.');
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
        console.error('Failed to load calendar data:', err);
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

  // Convert local datetime-local value (YYYY-MM-DDTHH:mm) to backend ISO format (YYYY-MM-DDTHH:mm:ss) without timezone shifts
  const getBackendLocalISO = (dateTimeStr: string): string => {
    if (!dateTimeStr) return '';
    if (dateTimeStr.length === 16) {
      return `${dateTimeStr}:00`;
    }
    return dateTimeStr.slice(0, 19);
  };

  // Format Helper for display
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

  // Helper to map assetId to asset name
  const getAssetLocationName = (assetId: number) => {
    const match = assetLocations.find(al => al.assetId === assetId);
    return match ? match.name : `Resource #${assetId}`;
  };

  // Actions
  const handleSelectLocation = (loc: Location) => {
    setSelectedLocation(loc);
    setBookedList([]);
    setFreeList([]);
    setStep(3); // Step 2 (Select Location) complete. Transition to Step 3 (Enters timeframe)
  };

  const handleSearchTimeslots = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocation) return;
    if (!startTime || !endTime) {
      setError('Please select both start and end time.');
      return;
    }
    if (new Date(startTime) >= new Date(endTime)) {
      setError('Start time must be before end time.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Backend findTimeslot takes location in request body and startTime parameter
      const searchStart = getBackendLocalISO(startTime);
      const searchEnd = getBackendLocalISO(endTime);
      const data = await fetchTimeslots(selectedLocation, searchStart, searchEnd);

      setTimeslots(data);
      setSelectedTimeslot(null);
      setStep(4); // Transition to Step 4 (Display free timeslots)
    } catch (err: unknown) {
      console.error(err);
      setError('Error fetching timeslots for this location.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTimeslot = (slot: Timeslot) => {
    setSelectedTimeslot(slot);
    setStep(6); // Step 5 (Select timeslot) complete. Transition to Step 6 (Enter User Name)
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocation || !selectedTimeslot || !userName.trim()) {
      setError('User name is required.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const cleanName = userName.trim();

      // 1. Find or create the user using @PostMapping("/user/findOrCreate") (Step 6)
      const userDetails = await findOrCreateUser(cleanName);
      setUser(userDetails);

      // 2. Book the timeslot using @PostMapping("/bookTime") (Step 7)
      await bookTime(
        selectedTimeslot.freeid,
        userDetails.id,
        getBackendLocalISO(startTime),
        getBackendLocalISO(endTime)
      );

      // 3. Set confirmation details
      setBookedDetails({
        locationName: selectedLocation.name,
        assetLocationName: getAssetLocationName(selectedTimeslot.assetId),
        startTime: getBackendLocalISO(startTime),
        endTime: getBackendLocalISO(endTime),
        userName: userDetails.name,
      });

      setStep(8); // Transition to Step 8 (Display details & status)
    } catch (err: unknown) {
      console.error(err);
      setError('Booking failed. The selected timeslot might have been booked or another error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedLocation(null);
    setSelectedTimeslot(null);
    setUserName('');
    setUser(null);
    setBookedDetails(null);
    setBookedList([]);
    setFreeList([]);
    setError(null);
    setStep(1); // Reset to Step 1 (View locations)
  };

  // Map booked times to Big Calendar events
  const bookedEvents = bookedList.map((b) => {
    const bookedUser = users.find((u) => u.id === b.userId);
    const title = bookedUser ? `Bokad: ${bookedUser.name}` : `Bokad (Användare #${b.userId})`;
    return {
      id: `booked-${b.id}`,
      title,
      start: new Date(b.startTime),
      end: new Date(b.endTime),
      isSelection: false,
      resource: b,
    };
  });

  // Selected area event shown visually on the calendar
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
        // Multi-day area selection in Month view
        const firstDay = new Date(slotInfo.slots[0]);
        firstDay.setHours(9, 0, 0, 0);
        const lastDay = new Date(slotInfo.slots[slotInfo.slots.length - 1]);
        lastDay.setHours(18, 0, 0, 0);
        start = firstDay;
        end = lastDay;
      } else {
        // Single day clicked or selected in Month view
        start.setHours(9, 0, 0, 0);
        end = new Date(start);
        end.setHours(17, 0, 0, 0);
      }
    } else {
      // In Week or Day view
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
        // Single slot click: default to 1 hour
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

  // Check if a specific time slot falls within any free block
  const isTimeInFreeRange = (date: Date) => {
    if (!freeList || freeList.length === 0) return false;
    const t = date.getTime();
    return freeList.some((f) => {
      const start = new Date(f.startTime).getTime();
      const end = new Date(f.endTime).getTime();
      return t >= start && t < end;
    });
  };

  // Check if a calendar day cell overlaps with any free block
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
        return {
          className: 'rbc-selected-area-cell',
        };
      }
    }
    if (isTimeInFreeRange(date)) {
      return {
        className: 'rbc-free-time-slot',
      };
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
        return {
          className: 'rbc-selected-area-cell',
        };
      }
    }
    if (isDayInFreeRange(date)) {
      return {
        className: 'rbc-free-time-day',
      };
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

  const handleSetPreset = (preset: 'today' | 'next24h') => {
    const now = new Date();
    if (preset === 'today') {
      const s = new Date(now);
      s.setHours(9, 0, 0, 0);
      const e = new Date(now);
      e.setHours(17, 0, 0, 0);
      setStartTime(formatToLocalISO(s));
      setEndTime(formatToLocalISO(e));
      setCalendarDate(s);
    } else if (preset === 'next24h') {
      const s = new Date(now.getTime() + 60 * 60 * 1000);
      s.setMinutes(0, 0, 0);
      const e = new Date(s.getTime() + 24 * 60 * 60 * 1000);
      setStartTime(formatToLocalISO(s));
      setEndTime(formatToLocalISO(e));
      setCalendarDate(s);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center relative overflow-hidden">
      {/* Background Graphic Accents */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-blue-100 to-transparent pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-0 w-full h-96 bg-gradient-to-tl from-indigo-100 to-transparent pointer-events-none -z-10" />

      {/* Main Container Card */}
      <div className="w-full max-w-4xl bg-white text-black p-6 shadow-md rounded-3xl border border-slate-200 transition-all duration-300">

        {/* Header */}
        <header className="mb-8 text-center md:text-left md:flex md:justify-between md:items-center border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-blue-800 flex items-center justify-center md:justify-start gap-2">
              <Calendar className="w-8 h-8 text-blue-600" />
              Community Resource Booking
            </h1>
            <p className="text-slate-600 mt-1">Book shared facilities and spaces in real-time</p>
          </div>
          {step > 1 && step < 8 && (
            <button
              onClick={handleReset}
              className="mt-4 md:mt-0 text-sm font-semibold text-slate-600 hover:text-blue-800 hover:bg-blue-50 flex items-center justify-center gap-1 border border-slate-300 hover:border-slate-400 rounded-xl px-4 py-2 transition-all"
            >
              Start Over
            </button>
          )}
        </header>

        {/* Wizard Progress Bar aligned to 8 distinct steps */}
        <nav aria-label="Progress" className="mb-10">
          <ol className="flex flex-wrap items-center justify-center gap-2 md:gap-4 text-xs md:text-sm font-medium">
            <li className={`flex items-center gap-1.5 pb-2 border-b-2 ${step >= 1 ? 'border-blue-600 text-blue-800' : 'border-transparent text-slate-400'}`}>
              <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] ${step >= 1 ? 'bg-blue-600 text-white font-bold' : 'bg-slate-200 text-slate-500'}`}>1</span>
              See Locations
            </li>
            <ChevronRight className="w-4 h-4 text-slate-400 hidden sm:block" />
            <li className={`flex items-center gap-1.5 pb-2 border-b-2 ${step >= 3 ? 'border-blue-600 text-blue-800' : 'border-transparent text-slate-400'}`}>
              <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] ${step >= 3 ? 'bg-blue-600 text-white font-bold' : 'bg-slate-200 text-slate-500'}`}>3</span>
              Set Times
            </li>
            <ChevronRight className="w-4 h-4 text-slate-400 hidden sm:block" />
            <li className={`flex items-center gap-1.5 pb-2 border-b-2 ${step >= 4 ? 'border-blue-600 text-blue-800' : 'border-transparent text-slate-400'}`}>
              <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] ${step >= 4 ? 'bg-blue-600 text-white font-bold' : 'bg-slate-200 text-slate-500'}`}>4</span>
              Timeslots
            </li>
            <ChevronRight className="w-4 h-4 text-slate-400 hidden sm:block" />
            <li className={`flex items-center gap-1.5 pb-2 border-b-2 ${step >= 6 ? 'border-blue-600 text-blue-800' : 'border-transparent text-slate-400'}`}>
              <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] ${step >= 6 ? 'bg-blue-600 text-white font-bold' : 'bg-slate-200 text-slate-500'}`}>6</span>
              User Name
            </li>
            <ChevronRight className="w-4 h-4 text-slate-400 hidden sm:block" />
            <li className={`flex items-center gap-1.5 pb-2 border-b-2 ${step >= 8 ? 'border-blue-600 text-blue-800' : 'border-transparent text-slate-400'}`}>
              <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] ${step >= 8 ? 'bg-blue-600 text-white font-bold' : 'bg-slate-200 text-slate-500'}`}>8</span>
              Receipt
            </li>
          </ol>
        </nav>

        {/* Global Loading Spinner */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="w-10 h-10 text-blue-600 animate-spin" />
            <p className="mt-4 text-slate-500 font-medium">Communicating with server...</p>
          </div>
        )}

        {/* Global Error Display */}
        {error && !loading && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3 text-red-800">
            <AlertCircle className="w-6 h-6 flex-shrink-0 text-red-600" />
            <div>
              <h3 className="font-semibold text-red-800">An error occurred</h3>
              <p className="text-sm mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Step Views (When not loading) */}
        {!loading && (
          <main>
            {/* STEP 1: View/Select Location */}
            {step === 1 && (
              <div className="animate-fadeIn">
                <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  Step 1 & 2: View and Select a Location
                </h2>
                {locations.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
                    <p className="text-slate-500">No locations available in the system.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {locations.map((location) => {
                      return (
                        <button
                          key={location.id}
                          onClick={() => handleSelectLocation(location)}
                          className="text-left bg-white border border-blue-200 hover:bg-blue-50/40 p-5 rounded-2xl transition-all group flex flex-col justify-between h-full hover:shadow-lg hover:border-blue-300"
                        >
                          <div className="w-full">
                            <div className="flex justify-between items-start">
                              <span className="text-xs font-semibold px-2.5 py-0.5 bg-blue-50 text-blue-800 rounded-full border border-blue-100">
                                Location ID: {location.id}
                              </span>
                            </div>
                            <h3 className="font-bold text-lg text-slate-800 mt-3 group-hover:text-blue-800 transition-colors">
                              {location.name}
                            </h3>

                            {location.address && (
                              <div className="text-sm text-slate-600 mt-3 space-y-1.5">
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
                            Select Location <ChevronRight className="w-4 h-4 ml-1" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: Enter DateTime for Search */}
            {step === 3 && selectedLocation && (
              <div className="animate-fadeIn">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    Step 3: Enter Search Timeframe
                  </h2>
                  <button
                    onClick={() => setStep(1)}
                    className="text-sm text-slate-500 hover:text-blue-800 flex items-center gap-1 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back to locations
                  </button>
                </div>

                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 mb-6">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">Selected Location</span>
                  <h3 className="text-lg font-bold text-blue-800 mt-1">{selectedLocation.name}</h3>
                  <div className="flex flex-wrap gap-4 text-xs text-slate-600 mt-1.5">
                    {selectedLocation.address?.email && <span>Email: {selectedLocation.address.email}</span>}
                    {selectedLocation.address?.phone && <span>Phone: {selectedLocation.address.phone}</span>}
                  </div>
                </div>

                {/* Big Calendar: View booked time for the selected location */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-md mb-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="font-bold text-base md:text-lg text-slate-800 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        Kalenderöversikt – Bokade och lediga tider
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Befintliga tider för <span className="font-semibold text-slate-700">{selectedLocation.name}</span>. Ljusgrå bakgrund anger ledig tid och röda fält i förgrunden anger bokade tider. Markera eller klicka för att välja sökintervall.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
                        <span className="w-2.5 h-2.5 rounded-sm bg-slate-300 border border-slate-400"></span>
                        Ledig tid ({freeList.length > 0 ? 'aktiv' : '0'})
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                        Bokade ({bookedList.length})
                      </span>
                      {loadingBooked && (
                        <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                      )}
                    </div>
                  </div>

                  <div className="h-[520px]">
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
                      defaultView="month"
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
                    />
                  </div>
                </div>

                {/* Section: Markerat tidsintervall i kalendern */}
                <form
                  onSubmit={handleSearchTimeslots}
                  className="bg-white text-black p-6 shadow-md border border-slate-200 rounded-2xl space-y-6 mb-6 animate-fadeIn"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-500/20 mt-0.5">
                        <MousePointer className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold uppercase tracking-wider text-blue-800">
                            Markerat tidsintervall i kalendern
                          </h3>
                          {getDurationDescription(startTime, endTime) && (
                            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-200">
                              Varaktighet: {getDurationDescription(startTime, endTime)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Värdena uppdateras när du markerar i kalendern ovan, eller kan redigeras direkt i fälten nedan.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                      {calendarView === 'month' ? (
                        <button
                          type="button"
                          onClick={() => setCalendarView('week')}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors shadow-sm"
                        >
                          Växla till vecka (timmar)
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setCalendarView('month')}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors shadow-sm"
                        >
                          Växla till månad
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleClearSelection}
                        className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1 shadow-sm"
                        title="Rensa markering"
                      >
                        <X className="w-3.5 h-3.5" />
                        Rensa
                      </button>
                    </div>
                  </div>

                  {/* Open fields start_time and end_time for edit */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="start_time" className="block text-sm font-semibold text-slate-700 mb-2">
                        Starttid (start_time)
                      </label>
                      <input
                        id="start_time"
                        name="start_time"
                        type="datetime-local"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full border border-blue-200 rounded-xl p-3 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-base min-h-[48px]"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="end_time" className="block text-sm font-semibold text-slate-700 mb-2">
                        Sluttid (end_time)
                      </label>
                      <input
                        id="end_time"
                        name="end_time"
                        type="datetime-local"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full border border-blue-200 rounded-xl p-3 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-base min-h-[48px]"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-medium">Snabbval:</span>
                      <button
                        type="button"
                        onClick={() => handleSetPreset('today')}
                        className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 transition-colors"
                      >
                        Idag (09:00–17:00)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetPreset('next24h')}
                        className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 transition-colors"
                      >
                        Kommande 24h
                      </button>
                    </div>

                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 shadow-md hover:shadow-lg transition-all ml-auto"
                    >
                      Book time
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* STEP 4 & 5: Display & Select Timeslots */}
            {step === 4 && selectedLocation && (
              <div className="animate-fadeIn">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    Step 4: Display & Select Timeslot
                  </h2>
                  <button
                    onClick={() => setStep(3)}
                    className="text-sm text-slate-555 hover:text-blue-800 flex items-center gap-1 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Edit timeframe
                  </button>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 mb-6 text-sm text-slate-600 flex flex-wrap gap-x-6 gap-y-1.5">
                  <div><strong>Location:</strong> {selectedLocation.name}</div>
                  <div><strong>Start:</strong> {formatDateTime(startTime)}</div>
                  <div><strong>End:</strong> {formatDateTime(endTime)}</div>
                </div>

                {timeslots.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
                    <p className="text-slate-555 font-medium">No free timeslots found in the selected timeframe.</p>
                    <p className="text-sm text-slate-400 mt-1">Try selecting a different date range or location.</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-slate-600 mb-4">Step 5: Select a free timeslot below to proceed:</p>

                    {/* Grid wrapper component using USER requested class layout */}
                    <div className="flex h-auto flex-wrap flex-cols-3 content-start gap-1 p-4 border border-blue-200 rounded-2xl bg-blue-50/20">
                      {timeslots.map((slot, index) => {
                        const assetName = getAssetLocationName(slot.assetId);
                        return (
                          <button
                            key={`${slot.freeid}-${index}`}
                            onClick={() => handleSelectTimeslot(slot)}
                            className="bg-white border border-blue-200 text-blue-800 hover:bg-blue-50 text-left p-3 rounded-xl transition-all flex flex-col justify-between outline-none focus:ring-2 focus:ring-blue-500/50 group shadow-sm"
                          >
                            <div className="w-full">
                              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                                Slot #{slot.freeid}
                              </div>
                              <div className="font-bold text-sm text-slate-800 group-hover:text-blue-900 transition-colors">
                                {new Date(slot.startTime).toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' })}
                              </div>
                              <div className="text-xs font-semibold text-blue-600 group-hover:text-blue-800 mt-1 border-t border-slate-100 pt-1">
                                {assetName}
                              </div>
                            </div>
                            <div className="text-xs text-slate-500 group-hover:text-blue-700 mt-2 font-medium">
                              {formatTimeOnly(slot.startTime)} – {formatTimeOnly(slot.endTime)}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 6 & 7: Enter User Name & Book Time */}
            {step === 6 && selectedLocation && selectedTimeslot && (
              <div className="animate-fadeIn">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <UserIcon className="w-5 h-5 text-blue-600" />
                    Step 6: Enter User Details
                  </h2>
                  <button
                    onClick={() => setStep(4)}
                    className="text-sm text-slate-555 hover:text-blue-800 flex items-center gap-1 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back to timeslots
                  </button>
                </div>

                {/* Booking summary card */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6">
                  <h3 className="font-bold text-blue-800 mb-3">Booking Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-700">
                    <div><strong>Space Location:</strong> {selectedLocation.name}</div>
                    <div><strong>Resource / Asset:</strong> {getAssetLocationName(selectedTimeslot.assetId)}</div>
                    <div><strong>Timeslot ID:</strong> {selectedTimeslot.freeid}</div>
                    <div><strong>Date:</strong> {new Date(selectedTimeslot.startTime).toLocaleDateString('sv-SE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                    <div><strong>Selected Time:</strong> {formatTimeOnly(selectedTimeslot.startTime)} – {formatTimeOnly(selectedTimeslot.endTime)}</div>
                  </div>
                </div>

                <form onSubmit={handleConfirmBooking} className="bg-white text-black p-6 shadow-md border border-slate-200 rounded-2xl space-y-6">
                  <div>
                    <label htmlFor="user-name" className="block text-sm font-semibold text-slate-700 mb-2">
                      Your Name / User Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <UserIcon className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        id="user-name"
                        type="text"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        className="w-full border border-blue-200 rounded-xl pl-10 pr-3 py-3 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-base min-h-[48px]"
                        placeholder="Enter user name to store and book"
                        required
                        autoComplete="name"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-200">
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                    >
                      Store User & Book (Step 7)
                      <CheckCircle className="w-5 h-5" />
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* STEP 8: Booking Confirmation & Return button */}
            {step === 8 && bookedDetails && (
              <div className="text-center py-8 animate-scaleIn">
                <div className="w-16 h-16 bg-green-50 border border-green-200 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Step 8: Booking Details and Status</h2>
                <p className="text-slate-600 mb-8">Your booking was successful. Below is a receipt of your booked timeslot.</p>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-left max-w-md mx-auto space-y-4 shadow-md mb-8">
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 font-bold block tracking-wider">Space Location</span>
                    <span className="font-bold text-blue-800 text-lg">{bookedDetails.locationName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 font-bold block tracking-wider">Resource / Asset Location</span>
                    <span className="font-bold text-slate-800">{bookedDetails.assetLocationName}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] uppercase text-slate-500 font-bold block tracking-wider">Start Time</span>
                      <span className="font-medium text-slate-700">{formatDateTime(bookedDetails.startTime)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-slate-500 font-bold block tracking-wider">End Time</span>
                      <span className="font-medium text-slate-700">{formatDateTime(bookedDetails.endTime)}</span>
                    </div>
                  </div>
                  <div className="border-t border-slate-200 pt-4">
                    <span className="text-[10px] uppercase text-slate-500 font-bold block tracking-wider">Registered User</span>
                    <span className="font-bold text-slate-900">{bookedDetails.userName}</span>
                    {user && (
                      <span className="text-xs text-slate-500 block mt-1">Email: {user.address?.email}</span>
                    )}
                  </div>
                  <div className="border-t border-slate-200 pt-4 flex items-center justify-between">
                    <span className="text-[10px] uppercase text-slate-500 font-bold block tracking-wider">Status of Booking</span>
                    <span className="text-xs font-bold text-green-700 bg-green-50 px-2.5 py-0.5 rounded-full border border-green-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                      Confirmed
                    </span>
                  </div>
                </div>

                {/* Return Button */}
                <button
                  onClick={handleReset}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-md hover:shadow-lg transition-all"
                >
                  Return to Start
                </button>
              </div>
            )}
          </main>
        )}
      </div>
    </div>
  );
}

export default App;
