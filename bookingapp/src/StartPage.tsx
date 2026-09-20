import { useState, useEffect } from 'react';
import {
  Calendar,
  User as UserIcon,
  CheckCircle,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  X,
  LogIn,
  LogOut,
  Shield,
  Users,
} from 'lucide-react';
import type { Location, Timeslot, AssetLocation, Booked, Free, AuthSession } from './types/models';
import {
  fetchLocations,
  fetchAssetLocations,
  fetchTimeslots,
  bookTime,
  fetchBookedByLocation,
  fetchFreeByLocation,
  getAuthSession,
  logout as apiLogout,
} from './services/api';

import LocationPage from './book/LocationPage';
import AssetPage from './book/AssetPage';
import BookPage from './book/BookPage';
import FreePage from './free/FreePage';
import LoginPage from './login/LoginPage';
import UserPage from './login/UserPage';

type AppTab = 'booking' | 'admin-free' | 'admin-users';

export default function StartPage() {
  // Navigation tab state
  const [activeTab, setActiveTab] = useState<AppTab>('booking');

  // Authentication State (a41, a42)
  const [session, setSession] = useState<AuthSession | null>(() => getAuthSession());
  const [loginModalOpen, setLoginModalOpen] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);
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
  const [selectedAsset, setSelectedAsset] = useState<AssetLocation | null>(null);
  const [bookedList, setBookedList] = useState<Booked[]>([]);
  const [freeList, setFreeList] = useState<Free[]>([]);
  const [loadingBooked, setLoadingBooked] = useState<boolean>(false);

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
        hour12: false,
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
    const match = assetLocations.find((al) => al.assetId === assetId);
    return match ? match.name : `Resurs #${assetId}`;
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

  // Step 1: Select Location (a31) - proceed to Step 2 if multiple assets, otherwise Step 3
  const handleSelectLocation = (loc: Location) => {
    setSelectedLocation(loc);
    setBookedList([]);
    setFreeList([]);
    setStartTime('');
    setEndTime('');
    setError(null);
    setSuccessToast(null);

    const locAssets = assetLocations.filter((al) => al.locationId === loc.id);
    if (locAssets.length > 1) {
      setSelectedAsset(null);
      setStep(2);
    } else {
      setSelectedAsset(locAssets[0] || null);
      setStep(3);
    }
  };

  // Step 2: Select Asset on Location - proceed to Step 3 (Kalender)
  const handleSelectAsset = (asset: AssetLocation) => {
    setSelectedAsset(asset);
    setStartTime('');
    setEndTime('');
    setError(null);
    setSuccessToast(null);
    setStep(3);
  };

  // Step 3 -> 6: Proceed directly to Step 6 (Boka) using selected calendar time
  const handleProceedToBooking = async () => {
    if (!selectedLocation) return;
    if (!startTime || !endTime) {
      setError('Vänligen markera en tid i kalendern först.');
      setSuccessToast(null);
      return;
    }
    if (new Date(startTime) >= new Date(endTime)) {
      setError('Starttid måste vara före sluttid.');
      setSuccessToast(null);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessToast(null);
    try {
      const searchStart = getBackendLocalISO(startTime);
      const searchEnd = getBackendLocalISO(endTime);
      const slots = await fetchTimeslots(selectedLocation, searchStart, searchEnd);
      if (!slots || slots.length === 0) {
        setError('Det finns ingen ledig tid som täcker det markerade intervallet, eller så är tiden redan bokad.');
        setSuccessToast(null);
        return;
      }

      const matchingSlot = selectedAsset
        ? slots.find((s) => s.assetId === selectedAsset.assetId)
        : slots[0];

      if (!matchingSlot) {
        setError(`Ingen ledig tid hittades för resursen "${selectedAsset?.name || 'vald resurs'}" i det markerade intervallet.`);
        setSuccessToast(null);
        return;
      }

      setSelectedTimeslot(matchingSlot);
      setStep(6);
    } catch (err: unknown) {
      console.error(err);
      setError('Ett fel uppstod vid kontroll av ledig tid.');
      setSuccessToast(null);
    } finally {
      setLoading(false);
    }
  };

  // Execute Booking API call (a34.1, a34.3)
  const executeBooking = async (slot: Timeslot, currentSession: AuthSession) => {
    if (!selectedLocation) return;
    setLoading(true);
    setError(null);
    setSuccessToast(null);
    try {
      const sTime = getBackendLocalISO(startTime);
      const eTime = getBackendLocalISO(endTime);
      await bookTime(slot.freeid, currentSession.id, sTime, eTime);

      setBookedDetails({
        locationName: selectedLocation.name,
        assetLocationName: selectedAsset?.name || getAssetLocationName(slot.assetId),
        startTime: sTime,
        endTime: eTime,
        userEmail: currentSession.email,
      });

      setStep(8); // Step 8: Receipt (a34.4)
    } catch (err: unknown) {
      console.error(err);
      setError('Bokningen misslyckades. Tiden kan redan vara bokad av en annan användare.');
      setSuccessToast(null);
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
    setSelectedAsset(null);
    setSelectedTimeslot(null);
    setBookedDetails(null);
    setBookedList([]);
    setFreeList([]);
    setStartTime('');
    setEndTime('');
    setError(null);
    setSuccessToast(null);
    setPendingBookingSlot(null);
    setStep(1);
  };

  const handleLoginSuccess = async (newSession: AuthSession) => {
    setSession(newSession);
    setLoginModalOpen(false);
    setSuccessToast(`Inloggad som ${newSession.email}`);

    // a34.2 -> a34.3: If user initiated booking before logging in, execute booking directly!
    if (pendingBookingSlot) {
      const slot = pendingBookingSlot;
      setPendingBookingSlot(null);
      await executeBooking(slot, newSession);
    }
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
              onClick={() => {
                setActiveTab('booking');
                setError(null);
                setSuccessToast(null);
              }}
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
                  onClick={() => {
                    setActiveTab('admin-free');
                    setError(null);
                    setSuccessToast(null);
                  }}
                  className={`text-sm font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${activeTab === 'admin-free'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-purple-800 hover:bg-purple-50 border border-purple-200'
                    }`}
                >
                  <Shield className="w-4 h-4" />
                  Lediga tider (Admin a51)
                </button>
                <button
                  onClick={() => {
                    setActiveTab('admin-users');
                    setError(null);
                    setSuccessToast(null);
                  }}
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
        {successToast && !error && (
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
                <li
                  className={`flex items-center gap-1.5 pb-2 border-b-2 ${step >= 1 ? 'border-blue-600 text-blue-800 font-bold' : 'border-transparent text-slate-400'
                    }`}
                >
                  <span
                    className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
                      }`}
                  >
                    1
                  </span>
                  1. Platser (OPEN)
                </li>
                <ChevronRight className="w-4 h-4 text-slate-400 hidden sm:block" />
                <li
                  className={`flex items-center gap-1.5 pb-2 border-b-2 ${step >= 2 ? 'border-blue-600 text-blue-800 font-bold' : 'border-transparent text-slate-400'
                    }`}
                >
                  <span
                    className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
                      }`}
                  >
                    2
                  </span>
                  2. Resurser (OPEN)
                </li>
                <ChevronRight className="w-4 h-4 text-slate-400 hidden sm:block" />
                <li
                  className={`flex items-center gap-1.5 pb-2 border-b-2 ${step >= 3 ? 'border-blue-600 text-blue-800 font-bold' : 'border-transparent text-slate-400'
                    }`}
                >
                  <span
                    className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
                      }`}
                  >
                    3
                  </span>
                  3. Kalender (OPEN)
                </li>
                <ChevronRight className="w-4 h-4 text-slate-400 hidden sm:block" />
                <li
                  className={`flex items-center gap-1.5 pb-2 border-b-2 ${step >= 6 ? 'border-blue-600 text-blue-800 font-bold' : 'border-transparent text-slate-400'
                    }`}
                >
                  <span
                    className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] ${step >= 6 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
                      }`}
                  >
                    6
                  </span>
                  6. Boka (Auth)
                </li>
                <ChevronRight className="w-4 h-4 text-slate-400 hidden sm:block" />
                <li
                  className={`flex items-center gap-1.5 pb-2 border-b-2 ${step >= 8 ? 'border-blue-600 text-blue-800 font-bold' : 'border-transparent text-slate-400'
                    }`}
                >
                  <span
                    className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] ${step >= 8 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
                      }`}
                  >
                    8
                  </span>
                  8. Bekräftelse
                </li>
              </ol>
            </nav>

            {/* STEP 1: View/Select Location (a31: OPEN) */}
            {step === 1 && (
              <LocationPage
                locations={locations}
                assetLocations={assetLocations}
                onSelectLocation={handleSelectLocation}
              />
            )}

            {/* STEP 2: View/Select Asset on Location (OPEN) */}
            {step === 2 && selectedLocation && (
              <AssetPage
                selectedLocation={selectedLocation}
                assetLocations={assetLocations}
                onSelectAsset={handleSelectAsset}
                onBack={() => setStep(1)}
              />
            )}

            {/* STEP 3, 6, 8: Calendar, Booking, Receipt */}
            {(step === 3 || step === 6 || step === 8) && selectedLocation && (
              <BookPage
                step={step}
                setStep={setStep}
                selectedLocation={selectedLocation}
                selectedAsset={selectedAsset}
                assetLocations={assetLocations}
                bookedList={bookedList}
                freeList={freeList}
                loadingBooked={loadingBooked}
                startTime={startTime}
                endTime={endTime}
                setStartTime={setStartTime}
                setEndTime={setEndTime}
                selectedTimeslot={selectedTimeslot}
                bookedDetails={bookedDetails}
                session={session}
                canBook={canBook}
                loading={loading}
                onProceedToBooking={handleProceedToBooking}
                onInitiateBooking={handleInitiateBooking}
                onReset={handleReset}
                formatDateTime={formatDateTime}
                formatTimeOnly={formatTimeOnly}
                getAssetLocationName={getAssetLocationName}
              />
            )}
          </main>
        )}

        {/* TAB 2: ADMIN FREE TIMESLOTS (a51: BOOKADMIN) */}
        {!loading && activeTab === 'admin-free' && isBookAdmin && (
          <FreePage
            locations={locations}
            assetLocations={assetLocations}
            onError={setError}
            onSuccess={setSuccessToast}
            formatDateTime={formatDateTime}
            getAssetLocationName={getAssetLocationName}
          />
        )}

        {/* TAB 3: ADMIN USERS (a61, a62: BOOKADMIN) */}
        {!loading && activeTab === 'admin-users' && isBookAdmin && (
          <UserPage
            onError={setError}
            onSuccess={setSuccessToast}
            formatDateTime={formatDateTime}
          />
        )}
      </div>

      {/* LOGIN MODAL DIALOG (a41: OPEN login workflow) */}
      <LoginPage
        isOpen={loginModalOpen}
        onClose={() => {
          setLoginModalOpen(false);
          setPendingBookingSlot(null);
        }}
        onLoginSuccess={handleLoginSuccess}
        pendingBookingSlot={pendingBookingSlot}
        loginError={loginError}
        setLoginError={setLoginError}
      />
    </div>
  );
}

