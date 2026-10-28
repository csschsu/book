import React, { useState, useEffect } from 'react';
import { Location, AssetLocation, AuthSession } from './types/models';
import { getAuthSession, logout, fetchAuthConfig } from './services/api';
import { LocationPage } from './location/LocationPage';
import { AssetPage } from './asset/AssetPage';
import { BookPage } from './book/BookPage';
import { FreePage } from './free/FreePage';
import { UserPage } from './login/UserPage';
import { LoginPage } from './login/LoginPage';
import { Footer } from './Footer';
import { Calendar, Users, LogIn, LogOut, UserPlus } from 'lucide-react';

type ViewMode = 'book' | 'admin-free' | 'admin-users';

export const StartPage: React.FC = () => {
  const [authSession, setAuthSessionState] = useState<AuthSession | null>(() => getAuthSession());
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [loginInitialMode, setLoginInitialMode] = useState<'login' | 'register'>('login');
  const [loginNotice, setLoginNotice] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>('book');
  const [bookUserAdd, setBookUserAdd] = useState<boolean>(false);
  const [pendingBookingCallback, setPendingBookingCallback] = useState<((session: AuthSession) => Promise<void>) | null>(null);

  // Booking wizard flow state:
  // 1 = Location, 2 = Asset, 3 = Calendar, 6 = Confirm, 8 = Receipt
  const [step, setStep] = useState<number>(1);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<AssetLocation | null>(null);

  useEffect(() => {
    fetchAuthConfig().then((cfg) => {
      if (cfg?.bookUserAdd) {
        setBookUserAdd(true);
      }
    });

    const handleAuthExpired = () => {
      setAuthSessionState(null);
      setLoginNotice('Din inloggningssession har gått ut. Vänligen logga in igen.');
      setShowLoginModal(true);
    };
    window.addEventListener('auth-expired', handleAuthExpired);
    return () => window.removeEventListener('auth-expired', handleAuthExpired);
  }, []);

  const isAdmin = authSession?.role.split(',').map(r => r.trim()).includes('BOOKADMIN') ?? false;

  const handleLogout = async () => {
    await logout();
    setAuthSessionState(null);
    if (view !== 'book') {
      setView('book');
      setStep(1);
    }
  };

  const handleSelectLocation = (loc: Location) => {
    setSelectedLocation(loc);
    setStep(2);
  };

  const handleSelectAsset = (asset: AssetLocation) => {
    setSelectedAsset(asset);
    setStep(3);
  };

  const resetBookingFlow = () => {
    setSelectedLocation(null);
    setSelectedAsset(null);
    setStep(1);
  };

  const handleOpenLogin = () => {
    setLoginNotice(null);
    setLoginInitialMode('login');
    setShowLoginModal(true);
  };

  const handleOpenRegister = () => {
    setLoginNotice(null);
    setLoginInitialMode('register');
    setShowLoginModal(true);
  };

  const handleBackToCalendar = () => {
    setShowLoginModal(false);
    setPendingBookingCallback(null);
    setView('book');
    if (selectedLocation && selectedAsset) {
      setStep(3);
    } else {
      setStep(1);
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-brand" onClick={() => { setView('book'); resetBookingFlow(); }}>
          <Calendar size={28} />
          <span>Community Booking</span>
        </div>

        <nav className="header-nav">
          <button
            className={`nav-link ${view === 'book' ? 'active' : ''}`}
            onClick={() => { setView('book'); resetBookingFlow(); }}
          >
            <Calendar size={16} style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-bottom' }} />
            Boka resurs
          </button>

          {isAdmin && (
            <button
              className={`nav-link ${view === 'admin-users' ? 'active' : ''}`}
              onClick={() => setView('admin-users')}
            >
              <Users size={16} style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-bottom' }} />
              Användare
            </button>
          )}

          {bookUserAdd && !authSession && (
            <button
              type="button"
              className="nav-link"
              onClick={handleOpenRegister}
            >
              <UserPlus size={16} style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-bottom' }} />
              Registrera ny användare
            </button>
          )}

          {authSession ? (
            <button
              type="button"
              className="nav-link"
              onClick={handleLogout}
            >
              <LogOut size={16} style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-bottom' }} />
              Logout
            </button>
          ) : (
            <button
              type="button"
              className="nav-link"
              onClick={handleOpenLogin}
            >
              <LogIn size={16} style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-bottom' }} />
              Login
            </button>
          )}
        </nav>
      </header>

      {/* Steps bar during booking flow */}
      {view === 'book' && step !== 7 && (
        <div className="steps-bar">
          <div className={`step-item ${step === 1 ? 'active' : step > 1 ? 'done' : ''}`}>
            <span className="step-number">1</span>
            <span>Välj plats</span>
          </div>
          <div className={`step-item ${step === 2 ? 'active' : step > 2 ? 'done' : ''}`}>
            <span className="step-number">2</span>
            <span>Välj resurs</span>
          </div>
          <div className={`step-item ${step === 3 ? 'active' : step > 3 ? 'done' : ''}`}>
            <span className="step-number">3</span>
            <span>Välj tid</span>
          </div>
          <div className={`step-item ${step === 6 ? 'active' : step > 6 ? 'done' : ''}`}>
            <span className="step-number">4</span>
            <span>Bekräfta</span>
          </div>
          <div className={`step-item ${step === 8 ? 'done' : ''}`}>
            <span className="step-number">5</span>
            <span>Klart</span>
          </div>
        </div>
      )}

      {/* Main Body */}
      <main className="main-content">
        {view === 'admin-free' && <FreePage />}
        {view === 'admin-users' && <UserPage />}

        {view === 'book' && (
          <>
            {step === 1 && (
              <LocationPage onSelectLocation={handleSelectLocation} isAdmin={isAdmin} />
            )}

            {step === 2 && selectedLocation && (
              <AssetPage
                location={selectedLocation}
                onSelectAsset={handleSelectAsset}
                onBack={() => setStep(1)}
              />
            )}

            {(step === 3 || step === 6 || step === 7 || step === 8) && selectedLocation && selectedAsset && (
              <BookPage
                location={selectedLocation}
                asset={selectedAsset}
                step={step}
                authSession={authSession}
                bookUserAdd={bookUserAdd}
                onSetStep={setStep}
                onOpenLogin={handleOpenLogin}
                onOpenLoginWithCallback={(cb) => {
                  setPendingBookingCallback(() => cb);
                  handleOpenLogin();
                }}
                onOpenRegister={handleOpenRegister}
                onBack={() => setStep(2)}
              />
            )}
          </>
        )}
      </main>

      <Footer />

      {/* Login Modal */}
      {showLoginModal && (
        <LoginPage
          notice={loginNotice}
          initialMode={loginInitialMode}
          onClose={() => {
            setShowLoginModal(false);
            setLoginNotice(null);
            setPendingBookingCallback(null);
          }}
          onBackToCalendar={handleBackToCalendar}
          onLoginSuccess={async (session) => {
            setAuthSessionState(session);
            setLoginNotice(null);
            setShowLoginModal(false);
            if (pendingBookingCallback) {
              const cb = pendingBookingCallback;
              setPendingBookingCallback(null);
              await cb(session);
            }
          }}
        />
      )}
    </div>
  );
};
