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
export const availableElectricityCountries = AVAILABLE_COUNTRIES_WITH_WORLD;
