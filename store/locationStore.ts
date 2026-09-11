import { create } from 'zustand';
import * as Location from 'expo-location';

type Coords = { latitude: number; longitude: number };

interface LocationState {
  coords: Coords | null;
  cityName: string | null;
  locationGranted: boolean;
  locationResolved: boolean;
  isFetching: boolean;
  fetchLocation: (force?: boolean) => Promise<void>;
  requestPermissionAndFetch: () => Promise<void>;
  setCityName: (cityName: string | null) => void;
}

export const useLocationStore = create<LocationState>((set, get) => ({
  coords: null,
  cityName: null,
  locationGranted: false,
  locationResolved: false,
  isFetching: false,

  fetchLocation: async (force = false) => {
    // If already resolved and not forcing, reuse stored location
    if (!force && get().locationResolved && get().coords) {
      return;
    }

    try {
      set({ isFetching: true });
      const { status } = await Location.getForegroundPermissionsAsync();
      const granted = status === 'granted';
      set({ locationGranted: granted });

      if (!granted) {
        set({ coords: null, cityName: null, locationResolved: true, isFetching: false });
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      set({ coords });

      try {
        const results = await Location.reverseGeocodeAsync(coords);
        const resolved = results[0]?.city ?? results[0]?.subregion ?? results[0]?.district ?? null;
        set({ cityName: resolved });
      } catch {
        // reverse geocoding fallback
      }
    } catch {
      set({ coords: null, cityName: null });
    } finally {
      set({ locationResolved: true, isFetching: false });
    }
  },

  requestPermissionAndFetch: async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        await get().fetchLocation(true);
      } else {
        set({ locationGranted: false, locationResolved: true });
      }
    } catch {
      // Permission request flow failed
    }
  },

  setCityName: (cityName) => set({ cityName }),
}));
