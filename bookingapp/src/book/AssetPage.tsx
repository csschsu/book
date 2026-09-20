import { MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Location, AssetLocation } from '../types/models';

interface AssetPageProps {
  selectedLocation: Location;
  assetLocations: AssetLocation[];
  onSelectAsset: (asset: AssetLocation) => void;
  onBack: () => void;
}

export default function AssetPage({
  selectedLocation,
  assetLocations,
  onSelectAsset,
  onBack,
}: AssetPageProps) {
  const locationAssets = assetLocations.filter((al) => al.locationId === selectedLocation.id);

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-600" />
          2. Välj resurs på {selectedLocation.name} (OPEN)
        </h2>
        <button
          onClick={onBack}
          className="text-sm text-slate-500 hover:text-blue-800 flex items-center gap-1 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Tillbaka till platser
        </button>
      </div>
      <p className="text-slate-600 text-sm mb-6">
        Denna plats har flera resurser. Klicka på en resurs nedan för att visa dess kalender.
      </p>

      {locationAssets.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
          <p className="text-slate-500">Inga resurser kopplade till denna plats.</p>
          <button
            onClick={onBack}
            className="mt-3 text-sm text-blue-600 hover:underline font-semibold"
          >
            Välj en annan plats
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {locationAssets.map((asset) => (
            <button
              key={asset.id}
              onClick={() => onSelectAsset(asset)}
              className="text-left bg-white border border-blue-200 hover:bg-blue-50/50 p-5 rounded-2xl transition-all group flex flex-col justify-between h-full hover:shadow-lg hover:border-blue-300"
            >
              <div>
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold px-2.5 py-0.5 bg-blue-50 text-blue-800 rounded-full border border-blue-100">
                    Resurs #{asset.assetId}
                  </span>
                </div>
                <h3 className="font-bold text-base text-slate-800 mt-2.5 group-hover:text-blue-800 transition-colors">
                  {asset.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Tillhör {selectedLocation.name}
                </p>
              </div>
              <div className="mt-4 pt-3 w-full border-t border-slate-100 flex items-center text-sm font-semibold text-blue-600 group-hover:translate-x-1 transition-transform">
                Välj resurs och se kalender <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

