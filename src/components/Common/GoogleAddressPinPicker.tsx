import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  APIProvider,
  AdvancedMarker,
  Map as GoogleMap,
  Pin,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { MapPin, Search, Loader2, CheckCircle2, Navigation } from 'lucide-react';

interface GoogleAddressPinPickerProps {
  address: string;
  coordinates: { lat: number; lng: number };
  onLocationChange: (data: { address: string; lat: number; lng: number }) => void;
}

const AGS_CENTER = { lat: 21.8853, lng: -102.2916 };

interface PlacePredictionLike {
  text: { text: string };
  toPlace: () => {
    fetchFields: (opts: { fields: string[] }) => Promise<void>;
    formattedAddress?: string | null;
    location?: { lat: () => number; lng: () => number } | null;
  };
}

interface AutocompleteSuggestionLike {
  placePrediction?: PlacePredictionLike | null;
}

function PlacesAutocompleteInput({
  value,
  onChange,
  onSelectPlace,
}: {
  value: string;
  onChange: (val: string) => void;
  onSelectPlace: (data: { address: string; lat: number; lng: number }) => void;
}) {
  const placesLib = useMapsLibrary('places');
  const sessionTokenRef = useRef<unknown>(null);
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestionLike[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (!placesLib) return;
    const trimmed = value.trim();
    if (trimmed.length < 3 || !showDropdown) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const { AutocompleteSessionToken, AutocompleteSuggestion } = placesLib;
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new AutocompleteSessionToken();
        }
        setIsLoading(true);
        const res = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: trimmed,
          sessionToken: sessionTokenRef.current as never,
          includedRegionCodes: ['mx'],
          locationBias: {
            center: AGS_CENTER,
            radius: 30000,
          },
        });
        setSuggestions((res.suggestions as AutocompleteSuggestionLike[]) || []);
      } catch {
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [placesLib, value, showDropdown]);

  const handleSelect = useCallback(
    async (suggestion: AutocompleteSuggestionLike) => {
      if (!placesLib || !suggestion.placePrediction) return;
      try {
        const place = suggestion.placePrediction.toPlace();
        await place.fetchFields({
          fields: ['displayName', 'formattedAddress', 'location', 'viewport'],
        });
        const loc = place.location;
        const formatted =
          place.formattedAddress ||
          suggestion.placePrediction.text.text ||
          value;
        if (loc) {
          onSelectPlace({
            address: formatted,
            lat: Number(loc.lat().toFixed(6)),
            lng: Number(loc.lng().toFixed(6)),
          });
        } else {
          onChange(formatted);
        }
      } catch {
        // Fallback: keep prediction text
        const txt = suggestion.placePrediction.text.text;
        if (txt) onChange(txt);
      } finally {
        sessionTokenRef.current = null;
        setSuggestions([]);
        setShowDropdown(false);
      }
    },
    [placesLib, onSelectPlace, onChange, value]
  );

  return (
    <div className="relative">
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={value}
          onFocus={() => setShowDropdown(true)}
          onChange={(e) => {
            setShowDropdown(true);
            onChange(e.target.value);
          }}
          placeholder="Escribe dirección en Aguascalientes (Google Places)..."
          className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-amber-500"
        />
        {isLoading && (
          <Loader2 className="w-4 h-4 text-amber-500 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
        )}
      </div>

      {showDropdown && suggestions.length > 0 && (
        <ul className="absolute z-30 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
          {suggestions.map((sug, idx) => (
            <li key={idx}>
              <button
                type="button"
                onClick={() => void handleSelect(sug)}
                className="w-full text-left px-3 py-2.5 text-xs hover:bg-amber-50 transition flex items-start gap-2 cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                <span className="font-semibold text-slate-800 leading-snug">
                  {sug.placePrediction?.text.text}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export const GoogleAddressPinPicker: React.FC<GoogleAddressPinPickerProps> = ({
  address,
  coordinates,
  onLocationChange,
}) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const [mapCenter, setMapCenter] = useState(coordinates);
  const [quotaError, setQuotaError] = useState(false);

  useEffect(() => {
    setMapCenter(coordinates);
  }, [coordinates.lat, coordinates.lng]);

  useEffect(() => {
    const handler = () => setQuotaError(true);
    window.addEventListener('gmp-quota-exceeded', handler);
    return () => window.removeEventListener('gmp-quota-exceeded', handler);
  }, []);

  if (!apiKey || quotaError) {
    return (
      <div className="space-y-2.5">
        <div className="relative">
          <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={address}
            onChange={(e) =>
              onLocationChange({
                address: e.target.value,
                lat: coordinates.lat,
                lng: coordinates.lng,
              })
            }
            placeholder="Av. Colosio #412, Col. Bosques del Prado"
            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-amber-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Latitud (Pin GPS)
            </label>
            <input
              type="number"
              step="0.0001"
              value={coordinates.lat}
              onChange={(e) =>
                onLocationChange({
                  address,
                  lat: Number(e.target.value) || AGS_CENTER.lat,
                  lng: coordinates.lng,
                })
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Longitud (Pin GPS)
            </label>
            <input
              type="number"
              step="0.0001"
              value={coordinates.lng}
              onChange={(e) =>
                onLocationChange({
                  address,
                  lat: coordinates.lat,
                  lng: Number(e.target.value) || AGS_CENTER.lng,
                })
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey} language="es" region="MX" libraries={['places', 'marker']}>
      <div className="space-y-2.5">
        <PlacesAutocompleteInput
          value={address}
          onChange={(nextAddress) =>
            onLocationChange({
              address: nextAddress,
              lat: coordinates.lat,
              lng: coordinates.lng,
            })
          }
          onSelectPlace={(selected) => {
            setMapCenter({ lat: selected.lat, lng: selected.lng });
            onLocationChange(selected);
          }}
        />

        <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-xs relative h-52 w-full">
          <GoogleMap
            mapId="DEMO_MAP_ID"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            defaultZoom={14}
            center={mapCenter}
            onCenterChanged={(ev) => setMapCenter(ev.detail.center)}
            onClick={(ev) => {
              const latLng = ev.detail.latLng;
              if (latLng) {
                onLocationChange({
                  address,
                  lat: Number(latLng.lat.toFixed(6)),
                  lng: Number(latLng.lng.toFixed(6)),
                });
              }
            }}
            gestureHandling="greedy"
            disableDefaultUI={true}
            className="w-full h-full"
          >
            <AdvancedMarker
              position={coordinates}
              draggable={true}
              onDragEnd={(ev) => {
                if (ev.latLng) {
                  onLocationChange({
                    address,
                    lat: Number(ev.latLng.lat().toFixed(6)),
                    lng: Number(ev.latLng.lng().toFixed(6)),
                  });
                }
              }}
            >
              <Pin background="#d97706" borderColor="#78350f" glyphColor="#ffffff" />
            </AdvancedMarker>
          </GoogleMap>
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2 bg-white/95 backdrop-blur-sm px-2.5 py-1.5 rounded-xl border border-slate-200 text-[10px] font-bold text-slate-700 pointer-events-none">
            <span className="flex items-center gap-1 text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Haz clic o arrastra el pin para fijar coordenadas exactas
            </span>
            <span className="font-mono text-slate-500 flex items-center gap-1">
              <Navigation className="w-3 h-3 text-amber-600" />
              {coordinates.lat.toFixed(5)}, {coordinates.lng.toFixed(5)}
            </span>
          </div>
        </div>
      </div>
    </APIProvider>
  );
};
