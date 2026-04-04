// Main electricity country facts index - merges all regional fact files
import { europeElectricityFacts } from './europe';
import { americasElectricityFacts } from './americas';
import { asiaPacificElectricityFacts } from './asia-pacific';
import { middleEastElectricityFacts } from './middle-east';
import { africaElectricityFacts } from './africa';

// Default/historical facts about electricity
const defaultElectricityFacts = {
  DEFAULT: [
    'Lampu LED menggunakan setidaknya 75% lebih sedikit energi daripada pencahayaan pijar.',
    'Peralatan dalam mode siaga dapat menyumbang 10% dari tagihan listrik tahunan rumah tangga.',
    'Listrik merambat dengan kecepatan cahaya, yaitu sekitar 300.000 kilometer per detik.',
    'Kilat dapat menghasilkan listrik yang cukup untuk menyalai rumah selama seminggu.',
    'Islandia bergantung hampir seluruhnya pada energi terbarukan untuk produksi listriknya.',
    'Belut listrik dapat menghasilkan sengatan hingga 600 volt.',
    'Benjamin Franklin membuktikan bahwa kilat adalah salah satu bentuk listrik.',
    'Energi angin adalah salah satu sumber listrik dengan pertumbuhan tercepat di dunia.',
    'Panel surya tetap dapat menghasilkan listrik di hari berawan, meskipun kurang efektif.',
    'Pembangkit listrik tenaga nuklir menyediakan sekitar 10% listrik dunia.',
    'Pembangkit listrik terbesar di dunia adalah Bendungan Tiga Ngarai di Tiongkok.',
    'Tembaga adalah salah satu konduktor listrik terbaik dan banyak digunakan dalam kabel.',
  ],
  WORLD: [
    'Motor listrik pertama dibangun pada tahun 1821 oleh Michael Faraday.',
    'Arus bolak-balik (AC) memenangkan "Perang Arus" melawan arus searah (DC).',
    'Tembaga adalah salah satu konduktor listrik terbaik dan banyak digunakan dalam kabel.',
    'Burung dapat duduk di atas kabel listrik tanpa tersengat karena mereka tidak menyentuh tanah.',
    'Sekitar sepertiga listrik dunia dihasilkan dari batu bara.',
    'Mobil listrik menjadi semakin populer sebagai cara untuk mengurangi ketergantungan pada bahan bakar fosil.',
    'Meteran pintar memungkinkan rumah tangga untuk melacak konsumsi listrik mereka secara real-time.',
    'Jaringan mikro adalah jaringan listrik skala kecil yang dapat beroperasi secara mandiri dari jaringan utama.',
    'Arus searah tegangan tinggi (HVDC) memungkinkan transmisi daya jarak jauh yang efisien.',
    'Tenaga air adalah sumber daya listrik terbarukan terbesar di seluruh dunia.',
    'Thomas Edison membuka pembangkit listrik komersial pertama di dunia di New York.',
    'Kata "listrik" berasal dari kata Yunani "elektron" yang berarti amber.',
  ],
};

// Merge all regional facts
export const electricityCountryFacts: Record<string, string[]> = {
  ...europeElectricityFacts,
  ...americasElectricityFacts,
  ...asiaPacificElectricityFacts,
  ...middleEastElectricityFacts,
  ...africaElectricityFacts,
  ...defaultElectricityFacts,
};

// List of available countries with translation keys
export const availableElectricityCountries = [
  // Europe
  { code: 'DE', nameKey: 'COUNTRIES.GERMANY' },
  { code: 'AT', nameKey: 'COUNTRIES.AUSTRIA' },
  { code: 'CH', nameKey: 'COUNTRIES.SWITZERLAND' },
  { code: 'NL', nameKey: 'COUNTRIES.NETHERLANDS' },
  { code: 'FR', nameKey: 'COUNTRIES.FRANCE' },
  { code: 'GB', nameKey: 'COUNTRIES.UNITED_KINGDOM' },
  { code: 'IT', nameKey: 'COUNTRIES.ITALY' },
  { code: 'ES', nameKey: 'COUNTRIES.SPAIN' },
  { code: 'BE', nameKey: 'COUNTRIES.BELGIUM' },
  { code: 'IE', nameKey: 'COUNTRIES.IRELAND' },
  { code: 'NO', nameKey: 'COUNTRIES.NORWAY' },
  { code: 'DK', nameKey: 'COUNTRIES.DENMARK' },
  { code: 'FI', nameKey: 'COUNTRIES.FINLAND' },
  { code: 'SE', nameKey: 'COUNTRIES.SWEDEN' },
  { code: 'PL', nameKey: 'COUNTRIES.POLAND' },
  { code: 'PT', nameKey: 'COUNTRIES.PORTUGAL' },
  { code: 'GR', nameKey: 'COUNTRIES.GREECE' },
  { code: 'HR', nameKey: 'COUNTRIES.CROATIA' },
  { code: 'CZ', nameKey: 'COUNTRIES.CZECH_REPUBLIC' },
  { code: 'HU', nameKey: 'COUNTRIES.HUNGARY' },
  { code: 'RO', nameKey: 'COUNTRIES.ROMANIA' },
  { code: 'SK', nameKey: 'COUNTRIES.SLOVAKIA' },
  { code: 'SI', nameKey: 'COUNTRIES.SLOVENIA' },
  { code: 'BG', nameKey: 'COUNTRIES.BULGARIA' },
  { code: 'RS', nameKey: 'COUNTRIES.SERBIA' },
  { code: 'BA', nameKey: 'COUNTRIES.BOSNIA_AND_HERZEGOVINA' },
  { code: 'AL', nameKey: 'COUNTRIES.ALBANIA' },
  { code: 'ME', nameKey: 'COUNTRIES.MONTENEGRO' },
  { code: 'MK', nameKey: 'COUNTRIES.NORTH_MACEDONIA' },
  { code: 'XK', nameKey: 'COUNTRIES.KOSOVO' },
  { code: 'IS', nameKey: 'COUNTRIES.ICELAND' },
  { code: 'LU', nameKey: 'COUNTRIES.LUXEMBOURG' },
  { code: 'MT', nameKey: 'COUNTRIES.MALTA' },
  { code: 'CY', nameKey: 'COUNTRIES.CYPRUS' },
  { code: 'EE', nameKey: 'COUNTRIES.ESTONIA' },
  { code: 'LV', nameKey: 'COUNTRIES.LATVIA' },
  { code: 'LT', nameKey: 'COUNTRIES.LITHUANIA' },

  // Americas
  { code: 'US', nameKey: 'COUNTRIES.USA' },
  { code: 'CA', nameKey: 'COUNTRIES.CANADA' },
  { code: 'MX', nameKey: 'COUNTRIES.MEXICO' },
  { code: 'BR', nameKey: 'COUNTRIES.BRAZIL' },
  { code: 'AR', nameKey: 'COUNTRIES.ARGENTINA' },

  // Asia-Pacific
  { code: 'JP', nameKey: 'COUNTRIES.JAPAN' },
  { code: 'CN', nameKey: 'COUNTRIES.CHINA' },
  { code: 'IN', nameKey: 'COUNTRIES.INDIA' },
  { code: 'AU', nameKey: 'COUNTRIES.AUSTRALIA' },
  { code: 'NZ', nameKey: 'COUNTRIES.NEW_ZEALAND' },

  // Middle East
  { code: 'SA', nameKey: 'COUNTRIES.SAUDI_ARABIA' },
  { code: 'AE', nameKey: 'COUNTRIES.UAE' },
  { code: 'IL', nameKey: 'COUNTRIES.ISRAEL' },
  { code: 'TR', nameKey: 'COUNTRIES.TURKEY' },

  // Africa
  { code: 'ZA', nameKey: 'COUNTRIES.SOUTH_AFRICA' },
  { code: 'EG', nameKey: 'COUNTRIES.EGYPT' },
  { code: 'NG', nameKey: 'COUNTRIES.NIGERIA' },
  { code: 'KE', nameKey: 'COUNTRIES.KENYA' },
  { code: 'MA', nameKey: 'COUNTRIES.MOROCCO' },

  // World (average)
  { code: 'WORLD', nameKey: 'COUNTRIES.WORLD' },
];
