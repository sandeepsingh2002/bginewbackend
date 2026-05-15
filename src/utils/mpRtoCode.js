const madhyaPradeshRTOCodes = {
  bhopal: 'MP04',
  indore: 'MP09',
  jabalpur: 'MP20',
  gwalior: 'MP07',
  ujjain: 'MP13',
  sagar: 'MP15',
  rewa: 'MP17',
  satna: 'MP19',
  chhindwara: 'MP28',
  katni: 'MP21',
  dewas: 'MP41',
  ratlam: 'MP43',
  shivpuri: 'MP33',
  vidisha: 'MP40',
  sehore: 'MP37',
  hoshangabad: 'MP05',
  betul: 'MP48',
  khandwa: 'MP12',
  khargone: 'MP10',
  neemuch: 'MP44',
  mandsaur: 'MP14',
  damoh: 'MP34',
  tikamgarh: 'MP36',
  burhanpur: 'MP68',
  harda: 'MP47',
  guna: 'MP08',
  datia: 'MP32',
  shahdol: 'MP18',
  singrauli: 'MP66',
  sidhi: 'MP53',
  raisen: 'MP38',
  rajgarh: 'MP39',
  morena: 'MP06',
  bhind: 'MP30',
  barwani: 'MP46',
  dhar: 'MP11',
  alirajpur: 'MP69',
  agarmalwa: 'MP70',
  narsinghpur: 'MP49',
  panna: 'MP35',
  balaghat: 'MP50',
  mandla: 'MP51',
  dindori: 'MP52',
  anuppur: 'MP65',
  umaria: 'MP54',
  sheopur: 'MP31',
  ashoknagar: 'MP67'
};

const normalizeCity = (city) => String(city || '').trim().toLowerCase().replace(/\s+/g, '');

const getMPRTOCode = (city) => {
  const key = normalizeCity(city);
  if (!key) return null;
  return madhyaPradeshRTOCodes[key] || null;
};

module.exports = { getMPRTOCode };
