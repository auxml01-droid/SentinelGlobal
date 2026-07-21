export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function isWithinRadius(
  lat: number,
  lng: number,
  centerLat: number,
  centerLng: number,
  radiusKm: number,
): boolean {
  return haversineDistance(lat, lng, centerLat, centerLng) <= radiusKm;
}

export function getCountryFromCoords(
  lat: number,
  lng: number,
): string | null {
  const countries: Array<{ code: string; bounds: [number, number, number, number] }> = [
    { code: 'BR', bounds: [-35, -35, -70, 5] },
    { code: 'US', bounds: [-130, 25, -65, 50] },
    { code: 'JP', bounds: [125, 30, 150, 45] },
    { code: 'RU', bounds: [20, 50, 180, 80] },
    { code: 'CN', bounds: [75, 15, 135, 55] },
    { code: 'IN', bounds: [65, 5, 100, 35] },
  ];

  for (const country of countries) {
    const [w, s, e, n] = country.bounds;
    if (lng >= w && lng <= e && lat >= s && lat <= n) {
      return country.code;
    }
  }

  return null;
}
