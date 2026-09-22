import React, { useEffect, useState, useMemo } from 'react';
import { Calendar as BigCalendar, momentLocalizer, type Formats, View, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Location, AssetLocation, Free, Booked, AuthSession } from '../types/models';
import { fetchFreeByLocation, fetchBookedByLocation, bookTime } from '../services/api';
import { SWEDISH_WEEKDAYS, SWEDISH_MONTHS, setupSwedishLocale } from '../services/momentSv';
import { ArrowLeft, CheckCircle2, Calendar as CalendarIcon, Clock, MapPin, Box, Loader2, AlertCircle } from 'lucide-react';

setupSwedishLocale();
const localizer = momentLocalizer(moment);
localizer.startOfWeek = () => 1;

const calendarFormats: Formats = {
  timeGutterFormat: 'HH:mm',
  agendaTimeFormat: 'HH:mm',
  weekdayFormat: (date: Date) => SWEDISH_WEEKDAYS[date.getDay()],
  dayFormat: (date: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${SWEDISH_WEEKDAYS[date.getDay()]} ${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
  },
  dayHeaderFormat: (date: Date) => {
    const month = SWEDISH_MONTHS[date.getMonth()].toLowerCase();
    return `${SWEDISH_WEEKDAYS[date.getDay()]} ${date.getDate()} ${month} ${date.getFullYear()}`;
  },
  agendaDateFormat: (date: Date) => {
    const month = SWEDISH_MONTHS[date.getMonth()].toLowerCase();
    return `${SWEDISH_WEEKDAYS[date.getDay()]} ${date.getDate()} ${month}`;
  },
  monthHeaderFormat: (date: Date) => `${SWEDISH_MONTHS[date.getMonth()]} ${date.getFullYear()}`,
  dayRangeHeaderFormat: ({ start, end }) => {
    if (start.getMonth() === end.getMonth()) {
      return `${SWEDISH_MONTHS[start.getMonth()]} ${start.getFullYear()}: ${start.getDate()} – ${end.getDate()}`;
    }
    return `${start.getDate()} ${SWEDISH_MONTHS[start.getMonth()].toLowerCase()} – ${end.getDate()} ${SWEDISH_MONTHS[end.getMonth()].toLowerCase()} ${end.getFullYear()}`;
  },
  eventTimeRangeFormat: () => '',
  selectRangeFormat: ({ start, end }) => `${moment(start).format('HH:mm')} – ${moment(end).format('HH:mm')}`,
  agendaTimeRangeFormat: ({ start, end }) => `${moment(start).format('HH:mm')} – ${moment(end).format('HH:mm')}`,
};

const calendarMessages = {
  today: 'Idag',
  previous: 'Föregående',
  next: 'Nästa',
  month: 'Månad',
  week: 'Vecka',
  day: 'Dag',
  agenda: 'Agenda',
  date: 'Datum',
  time: 'Tid',
  event: 'Händelse',
  noEventsInRange: 'Inga tider tillgängliga i detta intervall',
};

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'free' | 'booked';
  rawFree?: Free;
}

interface BookPageProps {
  location: Location;
  asset: AssetLocation;
  step: number;
  authSession: AuthSession | null;
  onSetStep: (step: number) => void;
  onOpenLogin: () => void;
  onBack: () => void;
}

export const BookPage: React.FC<BookPageProps> = ({
  location,
  asset,
  step,
  authSession,
  onSetStep,
  onOpenLogin,
  onBack,
}) => {
  const [freeBlocks, setFreeBlocks] = useState<Free[]>([]);
  const [bookedBlocks, setBookedBlocks] = useState<Booked[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Selection state for booking
  const [selectedFree, setSelectedFree] = useState<Free | null>(null);
  const [bookStart, setBookStart] = useState<Date | null>(null);
  const [bookEnd, setBookEnd] = useState<Date | null>(null);
  const [receipt, setReceipt] = useState<{ id: number; message: string } | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [currentView, setCurrentView] = useState<View>(Views.WEEK);

  useEffect(() => {
    loadData();
  }, [location.id, asset.assetId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [allFree, allBooked] = await Promise.all([
        fetchFreeByLocation(location.id),
        fetchBookedByLocation(location.id),
      ]);
      // Filter for this asset
      const assetFree = allFree.filter(f => f.assetId === asset.assetId);
      const freeIds = new Set(assetFree.map(f => f.id));
      const assetBooked = allBooked.filter(b => freeIds.has(b.freeId));

      setFreeBlocks(assetFree);
      setBookedBlocks(assetBooked);

      // Focus calendar on first upcoming free block if any
      const upcoming = assetFree.find(f => new Date(f.endTime) > new Date());
      if (upcoming) {
        setCurrentDate(new Date(upcoming.startTime));
      }
    } catch (err: any) {
      setError(err.message || 'Kunde inte hämta kalenderdata');
    } finally {
      setLoading(false);
    }
  };

  const events: CalendarEvent[] = useMemo(() => {
    const list: CalendarEvent[] = [];

    // Add free events
    freeBlocks.forEach(f => {
      list.push({
        id: `free-${f.id}`,
        title: 'Ledig tid (Klicka för att boka)',
        start: new Date(f.startTime),
        end: new Date(f.endTime),
        type: 'free',
        rawFree: f,
      });
    });

    // Add booked events
    bookedBlocks.forEach(b => {
      list.push({
        id: `booked-${b.id}`,
        title: b.alias || (b.userEmail ? `Bokad (${b.userEmail})` : 'Bokad'),
        start: new Date(b.startTime),
        end: new Date(b.endTime),
        type: 'booked',
      });
    });

    return list;
  }, [freeBlocks, bookedBlocks]);

  const handleSelectEvent = (event: CalendarEvent) => {
    if (event.type === 'free' && event.rawFree) {
      setSelectedFree(event.rawFree);
      setBookStart(event.start);
      // Default to 2-hour booking or slot end
      const twoHoursLater = new Date(event.start.getTime() + 2 * 3600 * 1000);
      setBookEnd(twoHoursLater <= event.end ? twoHoursLater : event.end);
      onSetStep(6);
    }
  };

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    // Check if slot falls inside any free block
    const matchingFree = freeBlocks.find(f => {
      const fStart = new Date(f.startTime);
      const fEnd = new Date(f.endTime);
      return start >= fStart && end <= fEnd;
    });

    if (matchingFree) {
      setSelectedFree(matchingFree);
      setBookStart(start);
      setBookEnd(end);
      onSetStep(6);
    } else {
      alert('Vänligen välj ett tidsintervall inom ett grönt ledigt block.');
    }
  };

  const handleConfirmBooking = async () => {
    if (!selectedFree || !bookStart || !bookEnd) return;
    if (!authSession) {
      onOpenLogin();
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const startIso = moment(bookStart).format('YYYY-MM-DDTHH:mm:ss');
      const endIso = moment(bookEnd).format('YYYY-MM-DDTHH:mm:ss');
      const res = await bookTime(selectedFree.id, authSession.id, startIso, endIso);
      setReceipt(res);
      onSetStep(8);
      loadData(); // reload data in background
    } catch (err: any) {
      setError(err.message || 'Kunde inte slutföra bokningen');
    } finally {
      setSubmitting(false);
    }
  };

  // Step 8: Receipt view
  if (step === 8 && receipt) {
    return (
      <div style={{ maxWidth: '600px', margin: '2rem auto' }}>
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
          <div style={{ display: 'inline-flex', background: 'var(--success-bg)', padding: '1rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
            <CheckCircle2 size={48} color="var(--success)" />
          </div>
          <h2 className="page-title" style={{ marginBottom: '0.5rem' }}>Bokning bekräftad!</h2>
          <p style={{ color: 'var(--gray-500)', marginBottom: '1.5rem' }}>{receipt.message}</p>

          <div style={{ textAlign: 'left', background: 'var(--gray-50)', padding: '1.25rem', borderRadius: 'var(--radius)', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--gray-500)' }}>Bokningsnummer:</span>
              <strong>#{receipt.id}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--gray-500)' }}>Plats:</span>
              <strong>{location.name}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--gray-500)' }}>Resurs:</span>
              <strong>{asset.name}</strong>
            </div>
            {bookStart && bookEnd && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--gray-500)' }}>Datum:</span>
                  <strong>{moment(bookStart).format('YYYY-MM-DD')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--gray-500)' }}>Tid:</span>
                  <strong>{moment(bookStart).format('HH:mm')} – {moment(bookEnd).format('HH:mm')}</strong>
                </div>
              </>
            )}
          </div>

          <button className="btn btn-primary" onClick={() => onSetStep(1)}>
            Gör en ny bokning
          </button>
        </div>
      </div>
    );
  }

  // Step 6: Confirmation summary view
  if (step === 6 && selectedFree && bookStart && bookEnd) {
    const durationHours = (bookEnd.getTime() - bookStart.getTime()) / (1000 * 3600);

    return (
      <div style={{ maxWidth: '650px', margin: '2rem auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <button className="btn btn-secondary" onClick={() => onSetStep(3)}>
            <ArrowLeft size={16} /> Tillbaka till kalendern
          </button>
          <h2 className="page-title" style={{ marginBottom: 0 }}>Bekräfta din bokning</h2>
        </div>

        {error && <div className="alert-error">{error}</div>}

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <MapPin size={20} color="var(--primary)" />
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>Plats</div>
                <div style={{ fontWeight: 600 }}>{location.name}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Box size={20} color="var(--primary)" />
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>Resurs</div>
                <div style={{ fontWeight: 600 }}>{asset.name}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CalendarIcon size={20} color="var(--primary)" />
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>Datum</div>
                <div style={{ fontWeight: 600 }}>{moment(bookStart).format('dddd D MMMM YYYY')}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Clock size={20} color="var(--primary)" />
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>Tid & längd</div>
                <div style={{ fontWeight: 600 }}>
                  {moment(bookStart).format('HH:mm')} – {moment(bookEnd).format('HH:mm')} ({durationHours.toFixed(1)} timmar)
                </div>
              </div>
            </div>
          </div>
        </div>

        {!authSession ? (
          <div className="card" style={{ background: 'var(--gray-100)', textAlign: 'center', padding: '2rem' }}>
            <AlertCircle size={32} color="var(--primary)" style={{ margin: '0 auto 0.75rem' }} />
            <h3 style={{ marginBottom: '0.5rem' }}>Inloggning krävs för att boka</h3>
            <p style={{ color: 'var(--gray-500)', marginBottom: '1.25rem' }}>
              Du måste vara inloggad som användare för att kunna slutföra en bokning.
            </p>
            <button className="btn btn-primary" onClick={onOpenLogin}>
              Logga in
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button className="btn btn-secondary" onClick={() => onSetStep(3)}>
              Avbryt
            </button>
            <button className="btn btn-primary" onClick={handleConfirmBooking} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Sparar...
                </>
              ) : (
                'Slutför och boka tid'
              )}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Step 3: Calendar view
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={onBack}>
            <ArrowLeft size={16} /> Byt resurs
          </button>
          <div>
            <h2 className="page-title" style={{ marginBottom: 0 }}>
              {location.name} – {asset.name}
            </h2>
            <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>
              Gröna block = lediga tider. Klicka på ett block för att boka.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
            <span style={{ width: 12, height: 12, borderRadius: 2, background: '#22c55e', display: 'inline-block' }}></span>
            <span>Ledigt</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
            <span style={{ width: 12, height: 12, borderRadius: 2, background: '#ef4444', display: 'inline-block' }}></span>
            <span>Bokat</span>
          </div>
        </div>
      </div>

      {error && <div className="alert-error">{error}</div>}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <Loader2 className="animate-spin" size={40} color="var(--primary)" />
        </div>
      ) : (
        <div className="calendar-wrapper">
          <BigCalendar
            culture="sv"
            localizer={localizer}
            events={events}
            date={currentDate}
            onNavigate={setCurrentDate}
            view={currentView}
            onView={setCurrentView}
            formats={calendarFormats}
            messages={calendarMessages}
            selectable
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            eventPropGetter={(event) => ({
              className: event.type === 'free' ? 'event-free' : 'event-booked',
            })}
            step={60}
            timeslots={1}
            min={new Date(0, 0, 0, 9, 0, 0)}
            max={new Date(0, 0, 0, 22, 0, 0)}
          />
        </div>
      )}
    </div>
  );
};

