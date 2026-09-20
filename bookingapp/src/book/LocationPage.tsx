import { MapPin, Mail, Phone, ChevronRight } from 'lucide-react';
import type { Location, AssetLocation } from '../types/models';

interface LocationPageProps {
  locations: Location[];
  assetLocations: AssetLocation[];
  onSelectLocation: (loc: Location) => void;
}

export default function LocationPage({
  locations,
  assetLocations,
  onSelectLocation,
}: LocationPageProps) {
  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-600" />
          a31. Välj en plats (OPEN)
        </h2>
        <span className="text-xs font-semibold px-2.5 py-1 bg-green-50 text-green-700 rounded-full border border-green-200">
          Öppen för alla
        </span>
      </div>
      <p className="text-slate-600 text-sm mb-6">
        Välj en av de tillgängliga anläggningarna för att visa kalender och lediga tider.
      </p>

      {locations.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
          <p className="text-slate-500">Inga platser finns tillgängliga i systemet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {locations.map((location) => {
            const locAssetsCount = assetLocations.filter((al) => al.locationId === location.id).length;
            return (
              <button
                key={location.id}
                onClick={() => onSelectLocation(location)}
                className="text-left bg-white border border-blue-200 hover:bg-blue-50/50 p-5 rounded-2xl transition-all group flex flex-col justify-between h-full hover:shadow-lg hover:border-blue-300"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold px-2.5 py-0.5 bg-blue-50 text-blue-800 rounded-full border border-blue-100">
                      Plats #{location.id}
                    </span>
                    {locAssetsCount > 0 && (
                      <span className="text-xs font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                        {locAssetsCount} {locAssetsCount === 1 ? 'resurs' : 'resurser'}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-lg text-slate-800 mt-2.5 group-hover:text-blue-800 transition-colors">
                    {location.name}
                  </h3>
                  {location.address && (
                    <div className="text-sm text-slate-600 mt-2.5 space-y-1">
                      {location.address.email && (
                        <p className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          {location.address.email}
                        </p>
                      )}
                      {location.address.phone && (
                        <p className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {location.address.phone}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="mt-5 pt-3 w-full border-t border-slate-100 flex items-center text-sm font-semibold text-blue-600 group-hover:translate-x-1 transition-transform">
                  {locAssetsCount > 1 ? 'Välj plats och se resurser' : 'Välj plats och se kalender'}{' '}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

