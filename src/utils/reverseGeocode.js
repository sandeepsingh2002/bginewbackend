const getCityFromReverseGeocode = async (latitude, longitude) => {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;

  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('lat', String(latitude));
  url.searchParams.set('lon', String(longitude));
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'User-Agent': process.env.NOMINATIM_USER_AGENT || 'bgi-backend/1.0 (support@example.com)'
    }
  });

  if (!response.ok) return null;
  const data = await response.json();
  const address = data && data.address ? data.address : {};

  return address.city || address.town || address.village || address.municipality || null;
};

module.exports = { getCityFromReverseGeocode };
