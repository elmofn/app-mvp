import * as Location from 'expo-location';

export type LocationCoords = { lat: number; lng: number };

let cached: LocationCoords | null = null;
let inFlight: Promise<LocationCoords | null> | null = null;

// Pede permissao e devolve as coords (uma vez). Cacheia em memoria para
// proximas chamadas durante o ciclo de vida do app. Em qualquer falha
// (permissao negada, hardware indisponivel) devolve null silenciosamente -
// o login segue funcionando sem geo, apenas sem essa informacao extra.
export async function getCurrentLocation(): Promise<LocationCoords | null> {
  if (cached) return cached;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      cached = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      return cached;
    } catch (err) {
      console.warn('[location] failed to get coords:', err);
      return null;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

export function getCachedLocation(): LocationCoords | null {
  return cached;
}

export function formatLocationPayload(coords: LocationCoords | null): string {
  if (!coords) return '';
  // O backend faz JsonConvert.DeserializeObject sobre o conteudo de
  // geolocation (mesmo padrao do devInfo), entao mandamos um JSON
  // serializado em vez de "lat,lng".
  return JSON.stringify({ lat: coords.lat, lng: coords.lng });
}
