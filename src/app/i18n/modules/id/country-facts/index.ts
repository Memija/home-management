// Main country facts index - merges all regional fact files
import { europeFacts } from './europe';
import { americasFacts } from './americas';
import { asiaPacificFacts } from './asia-pacific';
import { middleEastFacts } from './middle-east';
import { africaFacts } from './africa';

// Default facts for countries without specific data or as fallback
const defaultFacts = {
  DEFAULT: [
    'Air adalah satu-satunya zat yang ada secara alami dalam tiga wujud: padat, cair, dan gas.',
    'Tubuh manusia terdiri dari sekitar 60% air.',
    'Dibutuhkan 2.700 liter air untuk memproduksi satu kaus katun.',
    'Kran yang bocor dapat membuang hingga 11.000 liter air per tahun.',
    'Hanya 3% air di Bumi yang merupakan air tawar.',
    'Pertanian menggunakan sekitar 70% air tawar global.',
    'Mandi shower selama 5 menit menggunakan sekitar 45 liter air.',
    'Rata-rata mesin pencuci piring menggunakan 15 liter per siklus.',
    'Memproduksi 1 kilogram daging sapi membutuhkan 15.000 liter air.',
    'Air dapat melarutkan lebih banyak zat daripada cairan lainnya.',
    'Air panas membeku lebih cepat daripada air dingin dalam kondisi tertentu.',
    'Kran yang menetes membuang cukup air untuk mengisi bak mandi setiap bulan.',
  ],
  WORLD: [
    '71% permukaan Bumi ditutupi oleh air.',
    'Sekitar 97% air di Bumi adalah air asin di lautan.',
    '2,5% air di Bumi adalah air tawar, tetapi sebagian besar membeku di es kutub.',
    'Kurang dari 1% air di Bumi yang dapat diakses untuk penggunaan manusia.',
    'Air yang Anda minum hari ini adalah air yang sama dengan yang diminum dinosaurus!',
    'Secara global, 2,2 miliar orang kekurangan air minum yang aman.',
    'Penyakit terkait air menyebabkan 3,4 juta kematian setiap tahun.',
    'Pertanian adalah konsumen air terbesar di seluruh dunia.',
    'Rata-rata orang membutuhkan 50-100 liter per hari untuk kebutuhan dasar.',
    'Kekurangan air mempengaruhi lebih dari 40% populasi global.',
    'PBB menargetkan akses air bersih universal pada tahun 2030.',
    'Sungai Amazon membawa air lebih banyak daripada sungai mana pun di dunia.',
  ],
};

// Merge all regional facts
export const countryFacts = {
  ...europeFacts,
  ...americasFacts,
  ...asiaPacificFacts,
  ...middleEastFacts,
  ...africaFacts,
  ...defaultFacts,
};
