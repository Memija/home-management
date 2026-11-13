// Main heating country facts index - merges all regional fact files
import { europeHeatingFacts } from './europe';
import { americasHeatingFacts } from './americas';
import { asiaPacificHeatingFacts } from './asia-pacific';
import { middleEastHeatingFacts } from './middle-east';
import { africaHeatingFacts } from './africa';
import { AVAILABLE_COUNTRIES_WITH_WORLD } from '../../../../models/country-codes.data';

// Default/historical facts about heating evolution
const defaultHeatingFacts = {
  DEFAULT: [
    'Secara global, pemanasan dan pendinginan bangunan menyumbang hampir 40% dari total konsumsi energi.',
    'Meningkatkan isolasi rumah sering kali merupakan cara yang paling hemat biaya untuk mengurangi tagihan pemanas.',
    'Suhu dalam ruangan yang paling nyaman dan sehat biasanya dianggap antara 18 dan 21°C.',
    'Menurunkan termostat Anda hanya 1°C dapat mengurangi tagihan pemanas Anda hingga 10%.',
    'Sistem pemanas terbarukan seperti pompa panas tumbuh lebih dari 10% setiap tahun di seluruh dunia.',
    'Pompa panas dapat memberikan 3 hingga 4 kali lebih banyak panas daripada energi listrik yang dikonsumsinya.',
    'Pemanasan distrik melayani lebih dari 50 juta rumah di Eropa melalui jaringan pipa bawah tanah.',
    'Isolasi loteng dan dinding yang baik dapat mengurangi kehilangan panas hingga 80% di rumah yang tidak terisolasi.',
    'Termostat cerdas dapat membantu mengurangi tagihan pemanas hingga 15% dengan mengotomatiskan kontrol suhu.',
    'Kayu, batu bara, dan kotoran hewan telah menjadi sumber utama pemanas rumah selama hampir 400.000 tahun.',
    'Pemanasan sentral pertama yang tercatat diciptakan oleh orang Romawi kuno menggunakan sistem "hypocaust".',
    'Pemanasan geotermal memanfaatkan suhu bawah tanah Bumi yang konstan.',
  ],
  WORLD: [
    'Bangsa Romawi menemukan sistem pemanas "hypocaust" 2.000 tahun yang lalu, mengalirkan udara panas di bawah lantai.',
    'Radiator besi modern pertama ditemukan oleh Franz San Galli pada tahun 1855 di Rusia.',
    'Sistem pemanas sentral perumahan menjadi standar di negara-negara Barat barulah setelah Perang Dunia II.',
    'Hampir 90% rumah di Islandia dipanaskan menggunakan energi geotermal alami dari gunung berapi.',
    'Sistem pemanasan distrik komersial pertama di dunia dimulai di Lockport, New York, pada tahun 1877.',
    'Sebelum penemuan radiator, rumah-rumah besar sering kali mempekerjakan staf hanya untuk menjaga perapian tetap menyala.',
    'Termostat listrik pertama ditemukan oleh Warren Johnson pada tahun 1883 untuk mengotomatiskan kontrol suhu.',
    'Prinsip pemanas lantai "ondol" tradisional di Korea telah digunakan selama lebih dari 5.000 tahun.',
    'Pompa panas udara modern dapat mengekstrak panas bahkan ketika suhu luar ruangan di bawah titik beku.',
    'Kebakaran Besar London pada tahun 1666 menyebabkan peraturan yang lebih ketat tentang pembangunan cerobong asap.',
    'Gas alam menggantikan batu bara sebagai bahan bakar pemanas utama di banyak kota pada abad ke-20.',
    'Konversi energi panas surya pertama untuk penggunaan domestik dipopulerkan di Amerika Serikat pada akhir abad ke-19.',
  ],
};

// Merge all regional facts
export const heatingCountryFacts: Record<string, string[]> = {
  ...europeHeatingFacts,
  ...americasHeatingFacts,
  ...asiaPacificHeatingFacts,
  ...middleEastHeatingFacts,
  ...africaHeatingFacts,
  ...defaultHeatingFacts,
};

// List of available countries with translation keys
export const availableHeatingCountries = AVAILABLE_COUNTRIES_WITH_WORLD;
