// Main electricity country facts index - merges all regional fact files
import { europeElectricityFacts } from './europe';
import { americasElectricityFacts } from './americas';
import { asiaPacificElectricityFacts } from './asia-pacific';
import { middleEastElectricityFacts } from './middle-east';
import { africaElectricityFacts } from './africa';
import { AVAILABLE_COUNTRIES_WITH_WORLD } from '../../../../models/country-codes.data';

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
export const availableElectricityCountries = AVAILABLE_COUNTRIES_WITH_WORLD;
