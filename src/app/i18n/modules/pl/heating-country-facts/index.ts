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
    'Około 50% energii zużywanej w domu idzie na ogrzewanie i ciepłą wodę.',
    'Obniżenie temperatury o 1°C pozwala zaoszczędzić około 6% kosztów ogrzewania.',
    'Właściwa wentylacja (krótkie, intensywne wietrzenie) pomaga zachować ciepło.',
    'Zalecana temperatura w dzień to 20-22°C, a w nocy 17-18°C.',
    'Niesprawne uszczelki w oknach to nawet 15% strat energii grzewczej.',
    'Pompy ciepła mogą dostarczyć 3-4 razy więcej energii niż same jej zużywają.',
    'Ogrzewanie miejskie (sieciowe) służy ponad 50 milionom domów w samej Europie.',
    'Dobra izolacja budynków może zmniejszyć zapotrzebowanie na ogrzewanie nawet o 80%.',
    'Inteligentne termostaty mogą obniżyć koszty całego ogrzewania o 10–15%.',
    'Drewno było głównym paliwem grzewczym przez ponad 400 000 lat historii człowieka.',
    'Pierwsze systemy centralnego ogrzewania pojawiły się już w starożytnym Rzymie.',
    'Ogrzewanie geotermalne wykorzystuje stałą podziemną temperaturę naszej Ziemi.',
  ],
  WORLD: [
    'Budynki odpowiadają za około 40% globalnego zużycia energii elektrycznej i cieplnej.',
    'Globalnie odchodzi się od ogrzewania paliwami kopalnymi na rzecz OZE.',
    'Ogrzewanie systemowe jest uważane za jedno z najefektywniejszych w gęstej zabudowie.',
    'Izolacja ścian to najważniejszy krok w modernizacji energetycznej domu.',
    'Standard energetyczny budynków w UE staje się coraz bardziej rygorystyczny.',
    'Przed erą centralnego ogrzewania, bogate rodziny zatrudniały służbę tylko do utrzymywania ognia.',
    'Wynalezienie termostatu w 1883 roku przez Warrena Johnsona umożliwiło automatyczną kontrolę.',
    'Starożytni Koreańczycy opracowali ondol (ogrzewane podłogi) ponad 5000 lat temu.',
    'Pompy ciepła mogą zapewnić 3-4 razy więcej energii niż zużywają, co czyni je niezwykle wydajnymi.',
    'Wielki Pożar Londynu w 1666 roku doprowadził do przepisów wymagających budowy kominów.',
    'Gaz ziemny stał się dominującym paliwem grzewczym w Europie dopiero w latach 60. XX wieku.',
    'Nowoczesne kotły kondensacyjne mogą osiągać sprawność ponad 90%.',
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
