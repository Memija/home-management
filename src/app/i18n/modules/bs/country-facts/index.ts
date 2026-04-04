// Main country facts index - merges all regional fact files
import { europeFacts } from './europe';
import { americasFacts } from './americas';
import { asiaPacificFacts } from './asia-pacific';
import { middleEastFacts } from './middle-east';
import { africaFacts } from './africa';

// Default facts for countries without specific data or as fallback
const defaultFacts = {
  DEFAULT: [
    'Voda je jedina supstanca koja prirodno postoji u sva tri stanja: čvrsto, tečno i gasovito.',
    'Ljudsko tijelo sadrži oko 60% vode.',
    'Potrebno je 2.700 litara vode za proizvodnju jedne pamučne majice.',
    'Slavina koja curi može izgubiti i do 11.000 litara vode godišnje.',
    'Samo 3% vode na Zemlji je slatka voda.',
    'Poljoprivreda troši oko 70% svjetskih zaliha slatke vode.',
    'Za 5 minuta tuširanja potroši se oko 45 litara vode.',
    'Prosječna mašina za pranje posuđa koristi 15 litara po pranju.',
    'Za proizvodnju 1 kilograma govedine potrebno je 15.000 litara vode.',
    'Voda može otopiti više supstanci nego bilo koja druga tečnost.',
    'U nekim uslovima, topla voda se smrzne brže od hladne.',
    'Kapalica vode koja curi dovoljno brzo može napuniti kadu za mjesec dana.',
  ],
  WORLD: [
    '71% Zemljine površine je prekriveno vodom.',
    'Oko 97% vode na Zemlji je slana voda u okeanima.',
    '2,5% vode na Zemlji je slatka, ali većina je zaleđena u ledenim kapama.',
    'Manje od 1% vode na Zemlji je dostupno za ljudsku upotrebu.',
    'Voda koju danas pijete ista je ona voda koju su pili dinosauri!',
    'Globalno, 2.2 milijarde ljudi nema pristup sigurnoj pitkoj vodi.',
    'Bolesti uzrokovane prljavom vodom odnose 3.4 miliona života godišnje.',
    'Klimatske promjene drastično mijenjaju dostupnost vode.',
    'Prosječnoj osobi potrebno je 50-100 litara vode dnevno za osnovne potrebe.',
    'Poljoprivreda je najveći potrošač vode širom svijeta.',
    'Nedostatak vode utiče na više od 40% svjetske populacije.',
    'UN ima cilj univerzalnog pristupa čistoj vodi do 2030.',
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
