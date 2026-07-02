/* create a booking app in react typescript using tailwind styling and API calls. 
Create files in folder bookingapp 
 
Booking is done in steps

1. User see locations in api @GetMapping("/locations") 
2. User select one location 
3. User enters starttime and endtime
4. Display a list of free timeslots in the selected location id using @PostMapping("/timeslot")
5. User select a free timeslot.
6. App prompts user to enter buyer name and stores it using @PostMapping("/buyer")
7. Book time using @PostMapping("/bookTime")
8. Display booking details and status of booking
8. User press return button to go to start 


Create necessary main page and required forms, use tailwind styles for coloring "text-blue-800", "hover:bg-blue-50", and "border-blue-200" and  grid component with "flex h-auto flex-wrap flex-cols-3 content-start gap-1 p-4"

Create API functions calling spring boot interface BookController.java
Create typescript data definitions using Models.java 

Keep this information as a comment in the generated main component.
*/

import { useState, useEffect } from 'react';
import { 
  MapPin, 
  Calendar, 
  Clock, 
  User, 
  CheckCircle, 
  ChevronRight, 
  ChevronLeft, 
  RefreshCw,
  Mail,
  Phone,
  AlertCircle,
  Check
} from 'lucide-react';
import type { Location, Timeslot, Buyer, AssetLocation } from './types/models';
import { fetchLocations, fetchAssetLocations, fetchTimeslots, addBuyer, fetchBuyers, bookTime } from './services/api';

function App() {
  // Navigation & Step State (Aligned to 8 distinct steps)
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Data State
  const [locations, setLocations] = useState<Location[]>([]);
  const [assetLocations, setAssetLocations] = useState<AssetLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  
  // Search Range State (Step 3)
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');

  // Timeslots State (Step 4 & 5)
  const [timeslots, setTimeslots] = useState<Timeslot[]>([]);
  const [selectedTimeslot, setSelectedTimeslot] = useState<Timeslot | null>(null);

  // Buyer State (Step 6)
  const [buyerName, setBuyerName] = useState<string>('');
  const [buyer, setBuyer] = useState<Buyer | null>(null);

  // Booking result (Step 8)
  const [bookedDetails, setBookedDetails] = useState<{
    locationName: string;
    assetLocationName: string;
    startTime: string;
    endTime: string;
    buyerName: string;
  } | null>(null);

  // Fetch locations and asset locations on mount
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [locs, assets] = await Promise.all([
          fetchLocations(),
          fetchAssetLocations()
        ]);
        setLocations(locs);
        setAssetLocations(assets);
      } catch (err: any) {
        console.error(err);
        setError('Failed to fetch available spaces. Make sure the Spring Boot backend is running.');
      } finally {
        setLoading(false);
      }
    }
    loadData();

    // Default dates setting
    const now = new Date();
    now.setMinutes(0, 0, 0); // Round to hour
    
    const start = new Date(now.getTime() + 60 * 60 * 1000); // +1 hour
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000); // +24 hours
    
    // Formatting: YYYY-MM-DDTHH:mm
    const formatToLocalISO = (date: Date) => {
      const pad = (num: number) => String(num).padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    setStartTime(formatToLocalISO(start));
    setEndTime(formatToLocalISO(end));
  }, []);

  // Format Helper for display
  const formatDateTime = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  const formatTimeOnly = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
      const searchStart = new Date(startTime).toISOString().slice(0, 19);
      const data = await fetchTimeslots(selectedLocation, searchStart);
      
      // Filter slots that start before user's search range end limit
      const endLimit = new Date(endTime).getTime();
      const filtered = data.filter(slot => {
        const slotStart = new Date(slot.startTime).getTime();
        return slotStart < endLimit;
      });

      setTimeslots(filtered);
      setSelectedTimeslot(null);
      setStep(4); // Transition to Step 4 (Display free timeslots)
    } catch (err: any) {
      console.error(err);
      setError('Error fetching timeslots for this location.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTimeslot = (slot: Timeslot) => {
    setSelectedTimeslot(slot);
    setStep(6); // Step 5 (Select timeslot) complete. Transition to Step 6 (Enter Buyer Name)
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocation || !selectedTimeslot || !buyerName.trim()) {
      setError('Buyer name is required.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const cleanName = buyerName.trim();
      const buyerPayload = {
        name: cleanName,
        address: {
          email: `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com`,
          phone: '070-0000000',
        },
      };

      // 1. Store the buyer using @PostMapping("/buyer") (Step 6)
      await addBuyer(buyerPayload);

      // 2. Fetch all buyers to retrieve the assigned ID of the buyer we just stored
      const allBuyers = await fetchBuyers();
      const matchedBuyers = allBuyers.filter(b => b.name === cleanName);
      if (matchedBuyers.length === 0) {
        throw new Error(`Failed to find the stored buyer details on the server.`);
      }
      
      // Select the buyer with the highest ID (the one we just created)
      const buyerDetails = matchedBuyers.reduce((prev, current) => (prev.id > current.id) ? prev : current);
      setBuyer(buyerDetails);

      // 3. Book the timeslot using @PostMapping("/bookTime") (Step 7)
      await bookTime(
        selectedTimeslot.freeid,
        buyerDetails.id,
        selectedTimeslot.startTime,
        selectedTimeslot.endTime
      );

      // 4. Set confirmation details
      setBookedDetails({
        locationName: selectedLocation.name,
        assetLocationName: getAssetLocationName(selectedTimeslot.assetId),
        startTime: selectedTimeslot.startTime,
        endTime: selectedTimeslot.endTime,
        buyerName: buyerDetails.name,
      });

      setStep(8); // Transition to Step 8 (Display details & status)
    } catch (err: any) {
      console.error(err);
      setError('Booking failed. The selected timeslot might have been booked or another error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedLocation(null);
    setSelectedTimeslot(null);
    setBuyerName('');
    setBuyer(null);
    setBookedDetails(null);
    setError(null);
    setStep(1); // Reset to Step 1 (View locations)
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center relative overflow-hidden">
      {/* Background Graphic Accents */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-blue-900/20 via-transparent to-transparent pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-0 w-full h-96 bg-gradient-to-tl from-indigo-900/20 via-transparent to-transparent pointer-events-none -z-10" />

      {/* Main Container Card */}
      <div className="w-full max-w-4xl bg-slate-900/90 border border-slate-800 text-slate-100 rounded-3xl shadow-2xl p-6 md:p-8 backdrop-blur-md transition-all duration-300">
        
        {/* Header */}
        <header className="mb-8 text-center md:text-left md:flex md:justify-between md:items-center border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-blue-400 flex items-center justify-center md:justify-start gap-2">
              <Calendar className="w-8 h-8 text-blue-500" />
              Community Resource Booking
            </h1>
            <p className="text-slate-400 mt-1">Book shared facilities and spaces in real-time</p>
          </div>
          {step > 1 && step < 8 && (
            <button
              onClick={handleReset}
              className="mt-4 md:mt-0 text-sm font-semibold text-slate-400 hover:text-slate-100 flex items-center justify-center gap-1 border border-slate-700 hover:border-slate-600 rounded-xl px-4 py-2 transition-all"
            >
              Start Over
            </button>
          )}
        </header>

        {/* Wizard Progress Bar aligned to 8 distinct steps */}
        <nav aria-label="Progress" className="mb-10">
          <ol className="flex flex-wrap items-center justify-center gap-2 md:gap-4 text-xs md:text-sm font-medium">
            <li className={`flex items-center gap-1.5 pb-2 border-b-2 ${step >= 1 ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500'}`}>
              <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] ${step >= 1 ? 'bg-blue-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'}`}>1</span>
              See Locations
            </li>
            <ChevronRight className="w-4 h-4 text-slate-700 hidden sm:block" />
            <li className={`flex items-center gap-1.5 pb-2 border-b-2 ${step >= 3 ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500'}`}>
              <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] ${step >= 3 ? 'bg-blue-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'}`}>3</span>
              Set Times
            </li>
            <ChevronRight className="w-4 h-4 text-slate-700 hidden sm:block" />
            <li className={`flex items-center gap-1.5 pb-2 border-b-2 ${step >= 4 ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500'}`}>
              <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] ${step >= 4 ? 'bg-blue-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'}`}>4</span>
              Timeslots
            </li>
            <ChevronRight className="w-4 h-4 text-slate-700 hidden sm:block" />
            <li className={`flex items-center gap-1.5 pb-2 border-b-2 ${step >= 6 ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500'}`}>
              <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] ${step >= 6 ? 'bg-blue-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'}`}>6</span>
              Buyer Name
            </li>
            <ChevronRight className="w-4 h-4 text-slate-700 hidden sm:block" />
            <li className={`flex items-center gap-1.5 pb-2 border-b-2 ${step >= 8 ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500'}`}>
              <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] ${step >= 8 ? 'bg-blue-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'}`}>8</span>
              Receipt
            </li>
          </ol>
        </nav>

        {/* Global Loading Spinner */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
            <p className="mt-4 text-slate-400 font-medium">Communicating with server...</p>
          </div>
        )}

        {/* Global Error Display */}
        {error && !loading && (
          <div className="mb-6 bg-red-950/40 border border-red-900/50 rounded-2xl p-4 flex gap-3 text-red-200">
            <AlertCircle className="w-6 h-6 flex-shrink-0 text-red-500" />
            <div>
              <h3 className="font-semibold text-red-400">An error occurred</h3>
              <p className="text-sm mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Step Views (When not loading) */}
        {!loading && (
          <main>
            {/* STEP 1: Select Location */}
            {step === 1 && (
              <div className="animate-fadeIn">
                <h2 className="text-xl font-bold text-slate-200 mb-6 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-400" />
                  Step 1 & 2: View and Select a Location
                </h2>
                {locations.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-2xl">
                    <p className="text-slate-500">No locations available in the system.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {locations.map((location) => {
                      return (
                        <button
                          key={location.id}
                          onClick={() => handleSelectLocation(location)}
                          className="text-left bg-slate-900 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800/40 p-5 rounded-2xl transition-all group flex flex-col justify-between h-full hover:shadow-lg hover:shadow-blue-500/5"
                        >
                          <div className="w-full">
                            <div className="flex justify-between items-start">
                              <span className="text-xs font-semibold px-2.5 py-0.5 bg-blue-950 text-blue-400 rounded-full border border-blue-900/30">
                                Location ID: {location.id}
                              </span>
                            </div>
                            <h3 className="font-bold text-lg text-slate-100 mt-3 group-hover:text-blue-400 transition-colors">
                              {location.name}
                            </h3>
                            
                            {location.address && (
                              <div className="text-sm text-slate-400 mt-3 space-y-1.5">
                                {location.address.email && (
                                  <p className="flex items-center gap-1.5">
                                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                                    {location.address.email}
                                  </p>
                                )}
                                {location.address.phone && (
                                  <p className="flex items-center gap-1.5">
                                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                                    {location.address.phone}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <div className="mt-5 pt-3 w-full border-t border-slate-800/50 flex items-center text-sm font-semibold text-blue-400 group-hover:translate-x-1 transition-transform">
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
                  <h2 className="text-xl font-bold text-slate-200 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-400" />
                    Step 3: Enter Search Timeframe
                  </h2>
                  <button
                    onClick={() => setStep(1)}
                    className="text-sm text-slate-400 hover:text-slate-100 flex items-center gap-1 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back to locations
                  </button>
                </div>

                <div className="bg-slate-800/40 rounded-2xl p-5 border border-slate-800 mb-6">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">Selected Location</span>
                  <h3 className="text-lg font-bold text-blue-400 mt-1">{selectedLocation.name}</h3>
                  <div className="flex flex-wrap gap-4 text-xs text-slate-400 mt-1.5">
                    {selectedLocation.address?.email && <span>Email: {selectedLocation.address.email}</span>}
                    {selectedLocation.address?.phone && <span>Phone: {selectedLocation.address.phone}</span>}
                  </div>
                </div>

                <form onSubmit={handleSearchTimeslots} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="start-time" className="block text-sm font-semibold text-slate-400 mb-2">
                        Start Search From
                      </label>
                      <input
                        id="start-time"
                        type="datetime-local"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full border border-slate-700 rounded-xl p-3 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-100 text-base min-h-[48px]"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="end-time" className="block text-sm font-semibold text-slate-400 mb-2">
                        Search Limit To
                      </label>
                      <input
                        id="end-time"
                        type="datetime-local"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full border border-slate-700 rounded-xl p-3 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-100 text-base min-h-[48px]"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-800">
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-slate-950 font-bold py-3 px-6 rounded-xl flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
                    >
                      Find Free Timeslots
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
                  <h2 className="text-xl font-bold text-slate-200 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-400" />
                    Step 4: Display & Select Timeslot
                  </h2>
                  <button
                    onClick={() => setStep(3)}
                    className="text-sm text-slate-400 hover:text-slate-100 flex items-center gap-1 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Edit timeframe
                  </button>
                </div>

                <div className="bg-slate-800/40 rounded-2xl p-4 border border-slate-800 mb-6 text-sm text-slate-300 flex flex-wrap gap-x-6 gap-y-1.5">
                  <div><strong>Location:</strong> {selectedLocation.name}</div>
                  <div><strong>Start:</strong> {formatDateTime(startTime)}</div>
                  <div><strong>End:</strong> {formatDateTime(endTime)}</div>
                </div>

                {timeslots.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-2xl">
                    <p className="text-slate-400 font-medium">No free timeslots found in the selected timeframe.</p>
                    <p className="text-sm text-slate-500 mt-1">Try selecting a different date range or location.</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-slate-400 mb-4">Step 5: Select a free timeslot below to proceed:</p>
                    
                    {/* Grid wrapper component using USER requested class layout */}
                    <div className="flex h-auto flex-wrap flex-cols-3 content-start gap-1 p-4 border border-blue-200 rounded-2xl bg-blue-950/10">
                      {timeslots.map((slot, index) => {
                        const assetName = getAssetLocationName(slot.assetId);
                        return (
                          <button
                            key={`${slot.freeid}-${index}`}
                            onClick={() => handleSelectTimeslot(slot)}
                            className="bg-slate-900 border border-blue-200 text-blue-800 hover:bg-blue-50 text-left p-3 rounded-xl transition-all flex flex-col justify-between outline-none focus:ring-2 focus:ring-blue-500/50 group"
                          >
                            <div className="w-full">
                              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                                Slot #{slot.freeid}
                              </div>
                              <div className="font-bold text-sm text-slate-100 group-hover:text-blue-900 transition-colors">
                                {new Date(slot.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </div>
                              <div className="text-xs font-semibold text-blue-400 group-hover:text-blue-800 mt-1 border-t border-slate-800/40 pt-1">
                                {assetName}
                              </div>
                            </div>
                            <div className="text-xs text-slate-400 group-hover:text-blue-700 mt-2 font-medium">
                              {formatTimeOnly(slot.startTime)} - {formatTimeOnly(slot.endTime)}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 6 & 7: Enter Buyer Name & Book Time */}
            {step === 6 && selectedLocation && selectedTimeslot && (
              <div className="animate-fadeIn">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-slate-200 flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-400" />
                    Step 6: Enter Buyer Details
                  </h2>
                  <button
                    onClick={() => setStep(4)}
                    className="text-sm text-slate-400 hover:text-slate-100 flex items-center gap-1 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back to timeslots
                  </button>
                </div>

                {/* Booking summary card */}
                <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-5 mb-6">
                  <h3 className="font-bold text-blue-400 mb-3">Booking Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-300">
                    <div><strong>Space Location:</strong> {selectedLocation.name}</div>
                    <div><strong>Resource / Asset:</strong> {getAssetLocationName(selectedTimeslot.assetId)}</div>
                    <div><strong>Timeslot ID:</strong> {selectedTimeslot.freeid}</div>
                    <div><strong>Date:</strong> {new Date(selectedTimeslot.startTime).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                    <div><strong>Selected Time:</strong> {formatTimeOnly(selectedTimeslot.startTime)} - {formatTimeOnly(selectedTimeslot.endTime)}</div>
                  </div>
                </div>

                <form onSubmit={handleConfirmBooking} className="space-y-6">
                  <div>
                    <label htmlFor="buyer-name" className="block text-sm font-semibold text-slate-400 mb-2">
                      Your Name / Buyer Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-slate-500" />
                      </div>
                      <input
                        id="buyer-name"
                        type="text"
                        value={buyerName}
                        onChange={(e) => setBuyerName(e.target.value)}
                        className="w-full border border-slate-700 rounded-xl pl-10 pr-3 py-3 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-100 text-base min-h-[48px]"
                        placeholder="Enter buyer name to store and book"
                        required
                        autoComplete="name"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-800">
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-slate-950 font-bold py-3 px-6 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                    >
                      Store Buyer & Book (Step 7)
                      <CheckCircle className="w-5 h-5" />
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* STEP 8: Booking Confirmation & Return button */}
            {step === 8 && bookedDetails && (
              <div className="text-center py-8 animate-scaleIn">
                <div className="w-16 h-16 bg-green-950/50 border border-green-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check className="w-8 h-8 text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-slate-100 mb-2">Step 8: Booking Details and Status</h2>
                <p className="text-slate-400 mb-8">Your booking was successful. Below is a receipt of your booked timeslot.</p>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 text-left max-w-md mx-auto space-y-4 shadow-sm mb-8">
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 font-bold block tracking-wider">Space Location</span>
                    <span className="font-bold text-blue-400 text-lg">{bookedDetails.locationName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 font-bold block tracking-wider">Resource / Asset Location</span>
                    <span className="font-bold text-slate-200">{bookedDetails.assetLocationName}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] uppercase text-slate-500 font-bold block tracking-wider">Start Time</span>
                      <span className="font-medium text-slate-300">{formatDateTime(bookedDetails.startTime)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-slate-500 font-bold block tracking-wider">End Time</span>
                      <span className="font-medium text-slate-300">{formatDateTime(bookedDetails.endTime)}</span>
                    </div>
                  </div>
                  <div className="border-t border-slate-800 pt-4">
                    <span className="text-[10px] uppercase text-slate-500 font-bold block tracking-wider">Registered Buyer</span>
                    <span className="font-bold text-slate-100">{bookedDetails.buyerName}</span>
                    {buyer && (
                      <span className="text-xs text-slate-450 block mt-1">Email: {buyer.address?.email}</span>
                    )}
                  </div>
                  <div className="border-t border-slate-800 pt-4 flex items-center justify-between">
                    <span className="text-[10px] uppercase text-slate-500 font-bold block tracking-wider">Status of Booking</span>
                    <span className="text-xs font-bold text-green-400 bg-green-950/60 px-2.5 py-0.5 rounded-full border border-green-900/50 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                      Confirmed
                    </span>
                  </div>
                </div>

                {/* Return Button */}
                <button
                  onClick={handleReset}
                  className="bg-blue-600 hover:bg-blue-700 text-slate-950 font-bold py-3 px-8 rounded-xl shadow-md hover:shadow-lg transition-all"
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
