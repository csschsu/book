import { useState } from 'react';
import {
  Clock,
  User as UserIcon,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  X,
  Check,
  CheckCircle,
  Lock,
  LogIn,
  AlertCircle,
  MousePointer,
} from 'lucide-react';
import { Calendar as BigCalendar, momentLocalizer, type View, type Messages, type Formats } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/sv';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import type { Location, Timeslot, AssetLocation, Booked, Free, AuthSession } from '../types/models';

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

const formatToLocalISO = (date: Date): string => {
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
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

interface BookPageProps {
  step: number;
  setStep: (step: number) => void;
  selectedLocation: Location;
  selectedAsset: AssetLocation | null;
  assetLocations: AssetLocation[];
  bookedList: Booked[];
  freeList: Free[];
  loadingBooked: boolean;
  startTime: string;
  endTime: string;
  setStartTime: (val: string) => void;
  setEndTime: (val: string) => void;
  selectedTimeslot: Timeslot | null;
  bookedDetails: {
    locationName: string;
    assetLocationName: string;
    startTime: string;
    endTime: string;
    userEmail: string;
  } | null;
  session: AuthSession | null;
  canBook: boolean;
  loading: boolean;
  onProceedToBooking: () => void;
  onInitiateBooking: () => void;
  onReset: () => void;
  formatDateTime: (isoStr: string) => string;
  formatTimeOnly: (isoStr: string) => string;
  getAssetLocationName: (assetId: number) => string;
}

export default function BookPage({
  step,
  setStep,
  selectedLocation,
  selectedAsset,
  assetLocations,
  bookedList,
  freeList,
  loadingBooked,
  startTime,
  endTime,
  setStartTime,
  setEndTime,
  selectedTimeslot,
  bookedDetails,
  session,
  canBook,
  loading,
  onProceedToBooking,
  onInitiateBooking,
  onReset,
  formatDateTime,
  formatTimeOnly,
  getAssetLocationName,
}: BookPageProps) {
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [calendarView, setCalendarView] = useState<View>('week');
  const [calendarMinTime] = useState<Date>(getCalendarMinTime);

  // Map freeId -> assetId from freeList (free table has asset_id)
  const freeAssetMap = new Map<number, number>(freeList.map((f) => [f.id, f.assetId]));

  const currentBookedList = selectedAsset
    ? bookedList.filter((b) => freeAssetMap.get(b.freeId) === selectedAsset.assetId)
    : bookedList;

  const currentFreeList = selectedAsset
    ? freeList.filter((f) => f.assetId === selectedAsset.assetId)
    : freeList;

  // Map booked times to Big Calendar events
  const bookedEvents = currentBookedList.map((b) => {
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
  };

  const handleDrillDown = (date: Date, view?: View) => {
    setCalendarDate(date);
    setCalendarView(view || 'day');
  };

  const isTimeInFreeRange = (date: Date) => {
    if (!currentFreeList || currentFreeList.length === 0) return false;
    const t = date.getTime();
    return currentFreeList.some((f) => {
      const start = new Date(f.startTime).getTime();
      const end = new Date(f.endTime).getTime();
      return t >= start && t < end;
    });
  };

  const isDayInFreeRange = (date: Date) => {
    if (!currentFreeList || currentFreeList.length === 0) return false;
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999).getTime();
    return currentFreeList.some((f) => {
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

  const hasMultipleAssets = assetLocations.filter((al) => al.locationId === selectedLocation.id).length > 1;

  return (
    <>
      {/* STEP 3: View Calendar & Select Time (a32, a33: OPEN) */}
      {step === 3 && (
        <div className="animate-fadeIn">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              a32. Kalender & a33. Tidsintervall (OPEN)
            </h2>
            <button
              onClick={() => {
                if (hasMultipleAssets) {
                  setStep(2);
                } else {
                  setStep(1);
                }
              }}
              className="text-sm text-slate-500 hover:text-blue-800 flex items-center gap-1 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              {hasMultipleAssets ? 'Tillbaka till resurser' : 'Tillbaka till platser'}
            </button>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 mb-6 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-6 flex-wrap">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">Vald plats</span>
                <h3 className="text-lg font-bold text-blue-800">{selectedLocation.name}</h3>
              </div>
              {selectedAsset && (
                <div className="border-l border-slate-200 pl-4">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">Vald resurs</span>
                  <h3 className="text-lg font-bold text-blue-900 flex items-center gap-1.5">
                    <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md">
                      #{selectedAsset.assetId}
                    </span>
                    {selectedAsset.name}
                  </h3>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold bg-slate-100 text-slate-700 border border-slate-300">
                <span className="w-2.5 h-2.5 rounded-sm bg-slate-300 border border-slate-400"></span>
                Ledig tid ({currentFreeList.length})
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold bg-red-50 text-red-700 border border-red-200">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                Bokade ({currentBookedList.length})
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
                onClick={onProceedToBooking}
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
      {step === 6 && selectedTimeslot && (
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
              <div><strong>Resurs:</strong> {selectedAsset?.name || getAssetLocationName(selectedTimeslot.assetId)}</div>
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
                    onClick={onInitiateBooking}
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
                  onClick={onInitiateBooking}
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
            onClick={onReset}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 mx-auto"
          >
            <ChevronLeft className="w-5 h-5" />
            Tillbaka till platser (a34.4)
          </button>
        </div>
      )}
    </>
  );
}

