import React, { useState, useEffect } from 'react';
import { Location, AssetLocation, AuthSession } from './types/models';
import { getAuthSession, logout } from './services/api';
import { LocationPage } from './location/LocationPage';
import { AssetPage } from './asset/AssetPage';
import { BookPage } from './book/BookPage';
import { FreePage } from './free/FreePage';
import { UserPage } from './login/UserPage';
import { LoginPage } from './login/LoginPage';
import { Footer } from './Footer';
import { Calendar, Users, Clock, LogIn, LogOut, User as UserIcon } from 'lucide-react';

type ViewMode = 'book' | 'admin-free' | 'admin-users';

export const StartPage: React.FC = () => {
  const [authSession, setAuthSessionState] = useState<AuthSession | null>(() => getAuthSession());
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [view, setView] = useState<ViewMode>('book');

  // Booking wizard flow state:
  // 1 = Location, 2 = Asset, 3 = Calendar, 6 = Confirm, 8 = Receipt
  const [step, setStep] = useState<number>(1);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<AssetLocation | null>(null);

  useEffect(() => {
    const handleAuthExpired = () => {
      setAuthSessionState(null);
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
            Boka resurs
          </button>

          {isAdmin && (
            <>
              <button
                className={`nav-link ${view === 'admin-free' ? 'active' : ''}`}
                onClick={() => setView('admin-free')}
              >
                <Clock size={16} style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-bottom' }} />
                Lediga tider
              </button>
              <button
                className={`nav-link ${view === 'admin-users' ? 'active' : ''}`}
                onClick={() => setView('admin-users')}
              >
                <Users size={16} style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-bottom' }} />
                Användare
              </button>
            </>
          )}

          {authSession ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: '0.5rem' }}>
              <div className="auth-badge">
                <UserIcon size={14} />
                <span>{authSession.email}</span>
                <span className="role-tag">{authSession.role}</span>
              </div>
              <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }} onClick={handleLogout}>
                <LogOut size={14} /> Logga ut
              </button>
            </div>
          ) : (
            <button className="btn btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: '0.9rem' }} onClick={() => setShowLoginModal(true)}>
              <LogIn size={16} /> Logga in
            </button>
          )}
        </nav>
      </header>

      {/* Steps bar during booking flow */}
      {view === 'book' && (
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

            {(step === 3 || step === 6 || step === 8) && selectedLocation && selectedAsset && (
              <BookPage
                location={selectedLocation}
                asset={selectedAsset}
                step={step}
                authSession={authSession}
                onSetStep={setStep}
                onOpenLogin={() => setShowLoginModal(true)}
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
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={(session) => setAuthSessionState(session)}
        />
      )}
    </div>
  );
};

