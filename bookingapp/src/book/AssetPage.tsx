import React, { useEffect, useState } from 'react';
import { Location, AssetLocation } from '../types/models';
import { fetchAssetLocations } from '../services/api';
import { ArrowLeft, ArrowRight, Box, Loader2 } from 'lucide-react';

interface AssetPageProps {
  location: Location;
  onSelectAsset: (asset: AssetLocation) => void;
  onBack: () => void;
}

export const AssetPage: React.FC<AssetPageProps> = ({ location, onSelectAsset, onBack }) => {
  const [assets, setAssets] = useState<AssetLocation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAssets();
  }, [location.id]);

  const loadAssets = async () => {
    try {
      setLoading(true);
      setError(null);
      const allAssets = await fetchAssetLocations();
      const filtered = allAssets.filter(a => a.locationId === location.id);
      setAssets(filtered);
    } catch (err: any) {
      setError(err.message || 'Kunde inte hämta resurser');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button className="btn btn-secondary" onClick={onBack}>
          <ArrowLeft size={16} /> Tillbaka
        </button>
        <div>
          <h1 className="page-title" style={{ marginBottom: 0 }}>{location.name} – Resurser</h1>
          <p style={{ color: 'var(--gray-500)' }}>Välj en resurs att boka tider för</p>
        </div>
      </div>

      {error && <div className="alert-error">{error}</div>}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Loader2 className="animate-spin" size={36} color="var(--primary)" />
        </div>
      ) : assets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-500)' }}>
          Inga resurser kopplade till denna plats.
        </div>
      ) : (
        <div className="grid-cards">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="card"
              onClick={() => onSelectAsset(asset)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ background: 'var(--gray-100)', padding: '0.5rem', borderRadius: '50%' }}>
                  <Box size={22} color="var(--primary)" />
                </div>
                <div>
                  <h3 className="card-title" style={{ fontSize: '1.1rem', marginBottom: 0 }}>{asset.name}</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Resurs-ID: {asset.assetId}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                  Välj resurs <ArrowRight size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

