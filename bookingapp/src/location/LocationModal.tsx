import React, { useState, useEffect } from 'react';
import { Location } from '../types/models';
import { createLocation, updateLocation, deleteLocation } from '../services/api';
import { AssetManager } from '../asset/AssetManager';
import { X, MapPin, Mail, Phone, Loader2, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';

interface LocationModalProps {
  isOpen: boolean;
  initialLocation?: Location | null;
  onClose: (refreshNeeded: boolean) => void;
}

export const LocationModal: React.FC<LocationModalProps> = ({
  isOpen,
  initialLocation,
  onClose,
}) => {
  const isEdit = Boolean(initialLocation && initialLocation.id);

  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');

  const [savingLocation, setSavingLocation] = useState<boolean>(false);
  const [savedLocation, setSavedLocation] = useState<Location | null>(null);
  const [deletingLocation, setDeletingLocation] = useState<boolean>(false);
  const [confirmingDelete, setConfirmingDelete] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dirty, setDirty] = useState<boolean>(false);

  useEffect(() => {
    if (initialLocation) {
      setName(initialLocation.name || '');
      setEmail(initialLocation.address?.email || '');
      setPhone(initialLocation.address?.phone || '');
      setLatitude(initialLocation.latitude != null ? String(initialLocation.latitude) : '');
      setLongitude(initialLocation.longitude != null ? String(initialLocation.longitude) : '');
      setSavedLocation(initialLocation);
    } else {
      setName('');
      setEmail('');
      setPhone('');
      setLatitude('');
      setLongitude('');
      setSavedLocation(null);
    }
    setError(null);
    setSuccess(null);
    setDirty(false);
    setConfirmingDelete(false);
    setDeletingLocation(false);
  }, [initialLocation, isOpen]);

  if (!isOpen) return null;

  // 4.1 / 5.1 Function: Enter / Update location data
  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Platsnamn krävs');
      return;
    }

    try {
      setSavingLocation(true);
      setError(null);
      setSuccess(null);

      const payload: Partial<Location> = {
        ...(savedLocation?.id ? { id: savedLocation.id } : {}),
        name: name.trim(),
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        address: {
          email: email.trim(),
          phone: phone.trim(),
        },
      };

      if (savedLocation && savedLocation.id) {
        // 5.1 Function: Update existing location
        const updated = await updateLocation(savedLocation.id, payload);
        setSavedLocation(updated);
        setSuccess('Platsuppgifterna har uppdaterats!');
      } else {
        // 4.1 Function: Create new location
        const created = await createLocation(payload);
        setSavedLocation(created);
        setSuccess('Platsen har skapats! Du kan nu hantera resurser nedan.');
      }
      setDirty(true);
    } catch (err: any) {
      setError(err.message || 'Kunde inte spara platsen');
    } finally {
      setSavingLocation(false);
    }
  };

  const handleDeleteLocation = async () => {
    if (!savedLocation?.id) return;
    try {
      setDeletingLocation(true);
      setError(null);
      await deleteLocation(savedLocation.id);
      onClose(true);
    } catch (err: any) {
      setError(err.message || 'Kunde inte ta bort platsen');
      setConfirmingDelete(false);
    } finally {
      setDeletingLocation(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={() => onClose(dirty)}>
      <div
        className="modal-card"
        style={{ maxWidth: '600px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ background: 'var(--gray-100)', padding: '0.4rem', borderRadius: '50%' }}>
              <MapPin size={20} color="var(--primary)" />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
              {isEdit ? `Uppdatera plats: ${initialLocation?.name}` : 'Skapa ny plats'}
            </h2>
          </div>
          <button
            onClick={() => onClose(dirty)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-500)' }}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="alert-error" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert-success" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={16} />
            <span>{success}</span>
          </div>
        )}

        {/* 4.1 / 5.1 Location Form */}
        <form onSubmit={handleSaveLocation}>
          <div className="form-group">
            <label className="form-label">Platsnamn *</label>
            <input
              type="text"
              className="form-input"
              placeholder="T.ex. Idrottshall Centrum"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">E-post</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  className="form-input"
                  style={{ paddingLeft: '2.25rem' }}
                  placeholder="kontakt@plats.se"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Mail size={16} color="var(--gray-500)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Telefon</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '2.25rem' }}
                  placeholder="08-123456"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <Phone size={16} color="var(--gray-500)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Latitud</label>
              <input
                type="number"
                step="any"
                className="form-input"
                placeholder="59.3293"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Longitud</label>
              <input
                type="number"
                step="any"
                className="form-input"
                placeholder="18.0686"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
            {savedLocation && savedLocation.id ? (
              confirmingDelete ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--danger)', fontWeight: 600 }}>Säkert?</span>
                  <button
                    type="button"
                    className="btn btn-danger"
                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.85rem' }}
                    onClick={handleDeleteLocation}
                    disabled={deletingLocation}
                  >
                    {deletingLocation ? <Loader2 className="animate-spin" size={14} /> : 'Ja, ta bort'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.85rem' }}
                    onClick={() => setConfirmingDelete(false)}
                    disabled={deletingLocation}
                  >
                    Avbryt
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-danger"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  onClick={() => setConfirmingDelete(true)}
                  disabled={savingLocation || deletingLocation}
                >
                  <Trash2 size={16} /> Ta bort Plats
                </button>
              )
            ) : null}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={savingLocation || deletingLocation}
            >
              {savingLocation ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Sparar...
                </>
              ) : savedLocation ? (
                'Spara ändringar'
              ) : (
                'Skapa plats'
              )}
            </button>
          </div>
        </form>

        {/* 4.2 / 4.3 / 5.2 / 5.3 / 5.4 Asset Management Section */}
        {savedLocation && savedLocation.id ? (
          <AssetManager
            locationId={savedLocation.id}
            allowDelete={true}
            onAssetChanged={() => setDirty(true)}
          />
        ) : null}

        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onClose(dirty)}
          >
            Stäng
          </button>
        </div>
      </div>
    </div>
  );
};

