// Main electricity country facts index - merges all regional fact files
import { europeElectricityFacts } from './europe';
import { americasElectricityFacts } from './americas';
import { asiaPacificElectricityFacts } from './asia-pacific';
import { middleEastElectricityFacts } from './middle-east';
import { africaElectricityFacts } from './africa';

// Default/historical facts about electricity
const defaultElectricityFacts = {
  DEFAULT: [
    'Urządzenia w trybie czuwania mogą odpowiadać za 10% rachunku za prąd.',
    'Żarówki LED zużywają do 85% mniej energii niż tradycyjne żarówki.',
    'Pranie w niskiej temperaturze pozwala zaoszczędzić dużo energii.',
    'Lodówka to jedno z najbardziej energochłonnych urządzeń w domu.',
    'Prawie 20% światowej energii elektrycznej pochodzi z OZE.',
    'Węgorze elektryczne mogą wytwarzać wstrząsy o napięciu do 600 woltów.',
    'Benjamin Franklin nie odkrył elektryczności, ale udowodnił, że piorun jest jej formą.',
    'Energia wiatrowa jest jednym z najszybciej rozwijających się źródeł prądu na świecie.',
    'Panele słoneczne mogą generować prąd nawet w pochmurne dni, choć mniej efektywnie.',
    'Elektrownie jądrowe dostarczają około 10% światowej energii elektrycznej.',
    'Największą elektrownią na świecie jest Zapora Trzech Przełomów w Chinach.',
    'Pierwsza publiczna sieć elektroenergetyczna powstała w 1881 roku w Wielkiej Brytanii.',
  ],
  WORLD: [
    'Około 13% populacji świata wciąż nie ma dostępu do energii elektrycznej.',
    'Największym konsumentem energii elektrycznej na świecie są Chiny.',
    'Globalnie odchodzi się od węgla na rzecz wiatru i słońca.',
    'Inteligentne sieci pomagają zintegrować więcej odnawialnej energii.',
    'Pojazdy elektryczne napędzają popyt na nową czystą energię.',
    'Ptaki mogą siedzieć na liniach energetycznych bez porażenia, ponieważ nie dotykają ziemi.',
    'Energia wodna jest największym źródłem odnawialnej energii elektrycznej na świecie.',
    'Samochody elektryczne stają się coraz popularniejsze jako sposób na zmniejszenie zależności od paliw kopalnych.',
    'Inteligentne liczniki pozwalają gospodarstwom domowym śledzić zużycie prądu w czasie rzeczywistym.',
    'Mikrosieci to małe sieci energetyczne, które mogą działać niezależnie od sieci głównej.',
    'Przesył prądu stałego o wysokim napięciu (HVDC) umożliwia efektywny transport energii na duże odległości.',
    'Miedź jest jednym z najlepszych przewodników prądu i powszechnie stosuje się ją w kablach.',
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
