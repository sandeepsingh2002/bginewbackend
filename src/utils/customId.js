const { nanoid } = require('nanoid');
const { getCityFromReverseGeocode } = require('./reverseGeocode');
const { getMPRTOCode } = require('./mpRtoCode');

const generateCustomIdFromGeo = async (geoLocation, fallbackCode = 'MP00') => {
  try {
    const city = await getCityFromReverseGeocode(geoLocation?.lat, geoLocation?.lng);
    const code = getMPRTOCode(city) || fallbackCode;
    return `${code}-${nanoid(10)}`;
  } catch (_err) {
    return `${fallbackCode}-${nanoid(10)}`;
  }
};

module.exports = { generateCustomIdFromGeo };
