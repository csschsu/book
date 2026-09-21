import React, { useEffect, useState } from 'react';
import { Location } from '../types/models';
import { fetchLocations, getAuthSession } from '../services/api';
import { LocationModal } from './LocationModal';
import { MapPin, Phone, Mail, ArrowRight, Loader2, Plus, Edit3 } from 'lucide-react';

interface LocationPageProps {
  onSelectLocation: (location: Location) => void;
  isAdmin?: boolean;
}

export const LocationPage: React.FC<LocationPageProps> = ({ onSelectLocation, isAdmin }) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');

  // Location workflow modal state
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  // Check if admin from prop or session
  const adminEffective =
    isAdmin ??
    (getAuthSession()?.role.split(',').map((r) => r.trim()).includes('BOOKADMIN') ?? false);

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchLocations();
      setLocations(data);
    } catch (err: any) {
      setError(err.message || 'Kunde inte ladda platser');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNewLocation = () => {
    setEditingLocation(null);
    setModalOpen(true);
  };

  const handleOpenEditLocation = (e: React.MouseEvent, loc: Location) => {
    e.stopPropagation();
    setEditingLocation(loc);
    setModalOpen(true);
  };

  const handleModalClose = (refreshNeeded: boolean) => {
    setModalOpen(false);
    setEditingLocation(null);
    if (refreshNeeded) {
      loadLocations();
    }
  };

  const filtered = locations.filter(
    (loc) =>
      loc.name.toLowerCase().includes(search.toLowerCase()) ||
      (loc.address?.email && loc.address.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>
            Välj en plats
          </h1>
          <p style={{ color: 'var(--gray-500)' }}>
            Välj vilken anläggning eller lokal du vill boka resurser på
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* 4. Workflow button visible to BOOKADMIN on Main Body */}
          {adminEffective && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenNewLocation}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}
            >
              <Plus size={16} /> Ny Plats
            </button>
          )}

          <input
            type="text"
            className="form-input"
            placeholder="Sök plats..."
            style={{ width: '220px' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error && <div className="alert-error">{error}</div>}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Loader2 className="animate-spin" size={36} color="var(--primary)" />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-500)' }}>
          Inga platser hittades.
        </div>
      ) : (
        <div className="grid-cards">
          {filtered.map((loc) => (
            <div
              key={loc.id}
              className="card"
              onClick={() => onSelectLocation(loc)}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  marginBottom: '0.5rem',
                }}
              >
                <h2 className="card-title">{loc.name}</h2>
                <div
                  style={{
                    background: 'var(--gray-100)',
                    padding: '0.4rem',
                    borderRadius: '50%',
                  }}
                >
                  <MapPin size={20} color="var(--primary)" />
                </div>
              </div>

              {loc.address && (
                <div
                  style={{
                    fontSize: '0.9rem',
                    color: 'var(--gray-700)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  {loc.address.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Mail size={16} color="var(--gray-500)" />
                      <span>{loc.address.email}</span>
                    </div>
                  )}
                  {loc.address.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Phone size={16} color="var(--gray-500)" />
                      <span>{loc.address.phone}</span>
                    </div>
                  )}
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 'auto',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--gray-100)',
                }}
              >
                {/* 5. Workflow button visible to BOOKADMIN in the location box */}
                {adminEffective ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    onClick={(e) => handleOpenEditLocation(e, loc)}
                  >
                    <Edit3 size={14} /> Uppdatera
                  </button>
                ) : (
                  <div />
                )}

                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                >
                  Välj <ArrowRight size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Location management modal for BOOKADMIN */}
      <LocationModal
        isOpen={modalOpen}
        initialLocation={editingLocation}
        onClose={handleModalClose}
      />
    </div>
  );
};

