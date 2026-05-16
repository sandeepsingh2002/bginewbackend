const { nanoid } = require('nanoid');
const { getCityFromReverseGeocode } = require('./reverseGeocode');
const { getMPRTOCode } = require('./mpRtoCode');

const generateCustomIdFromGeo = async (geoLocation, fallbackCode = 'MP00') => {
  try {
    const city = await getCityFromReverseGeocode(geoLocation?.lat, geoLocation?.lng);
    const code = getMPRTOCode(city) || fallbackCode;
    const randomPart = nanoid(10);
    return `${code}-${randomPart}`;
  } catch (_err) {
    const randomPart = nanoid(10);
    return `${fallbackCode}-${randomPart}`;
  }
};

module.exports = { generateCustomIdFromGeo };
