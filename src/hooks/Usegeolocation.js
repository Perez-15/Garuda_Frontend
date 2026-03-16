// hooks/useGeolocation.js
import { useState, useCallback } from 'react';

const OFFICE = {
 latitude:  14.6252222,
  longitude: 121.0522895,
  radius:    50,
};

/**
 * Haversine formula — returns distance in meters between two GPS points.
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R    = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * useGeolocation
 *
 * Returns:
 *   getPosition()   — async fn that resolves to { latitude, longitude, isWithinOffice, distance }
 *   loading         — true while waiting for the browser GPS response
 *   error           — string error message, or null
 */
export function useGeolocation() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const getPosition = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const msg = 'Geolocation is not supported by your browser.';
        setError(msg);
        return reject(new Error(msg));
      }

      setLoading(true);
      setError(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const distance = haversineDistance(
            latitude, longitude,
            OFFICE.latitude, OFFICE.longitude,
          );

          setLoading(false);
          resolve({
            latitude,
            longitude,
            distance:        Math.round(distance),
            isWithinOffice:  distance <= OFFICE.radius,
          });
        },
        (err) => {
          setLoading(false);
          let msg = 'Unable to retrieve your location.';
          if (err.code === err.PERMISSION_DENIED)
            msg = 'Location permission denied. Please allow location access.';
          if (err.code === err.POSITION_UNAVAILABLE)
            msg = 'Location information is unavailable.';
          if (err.code === err.TIMEOUT)
            msg = 'Location request timed out.';

          setError(msg);
          reject(new Error(msg));
        },
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
      );
    });
  }, []);

  return { getPosition, loading, error };
}

export { OFFICE, haversineDistance };