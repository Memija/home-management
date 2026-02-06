// Main electricity country facts index - merges all regional fact files (German)
import { europeElectricityFacts } from './europe';
import { americasElectricityFacts } from './americas';
import { asiaPacificElectricityFacts } from './asia-pacific';
import { middleEastElectricityFacts } from './middle-east';
import { africaElectricityFacts } from './africa';

// Default/historical facts about electricity - German
const defaultElectricityFacts = {
  DEFAULT: [
    'LED-Lampen verbrauchen mindestens 75% weniger Energie und halten 25-mal länger als Glühlampen.',
    'Geräte im Standby-Modus können 10% der jährlichen Stromrechnung eines durchschnittlichen Haushalts ausmachen.',
    'Die erste öffentliche Stromversorgung wurde 1881 in Godalming, Surrey, Großbritannien bereitgestellt.',
    'Strom bewegt sich mit Lichtgeschwindigkeit, etwa 300.000 Kilometer pro Sekunde.',
    'Ein einzelner Blitz kann genug Strom erzeugen, um ein Haus eine Woche lang zu versorgen.',
    'Island verlässt sich für seine Stromproduktion fast vollständig auf erneuerbare Energien.',
    'Zitteraale können Stromstöße von bis zu 600 Volt erzeugen.',
    'Benjamin Franklin hat Elektrizität nicht entdeckt, aber er bewies, dass Blitze eine Form von Elektrizität sind.',
    'Windenergie ist eine der am schnellsten wachsenden Stromquellen der Welt.',
    'Solarmodule können auch an bewölkten Tagen Strom erzeugen, wenn auch weniger effektiv.',
    'Kernkraftwerke liefern etwa 10% des weltweiten Stroms.',
    'Das größte Kraftwerk der Welt ist der Drei-Schluchten-Staudamm in China.'
  ],
  WORLD: [
    'Der erste Elektromotor wurde 1821 von Michael Faraday gebaut.',
    'Thomas Edison eröffnete 1882 das erste kommerzielle Kraftwerk in New York City.',
    'Wechselstrom (AC) gewann den „Stromkrieg" gegen Gleichstrom (DC) bei der Stromverteilung.',
    'Das Wort „Elektrizität" stammt vom griechischen Wort „elektron", was Bernstein bedeutet.',
    'Kupfer ist einer der besten Stromleiter und wird häufig in Kabeln verwendet.',
    'Vögel können auf Stromleitungen sitzen, ohne einen Schlag zu bekommen, weil sie den Boden nicht berühren.',
    'Etwa ein Drittel des weltweiten Stroms wird aus Kohle erzeugt.',
    'Wasserkraft ist die größte Quelle erneuerbaren Stroms weltweit.',
    'Elektroautos werden immer beliebter, um die Abhängigkeit von fossilen Brennstoffen zu reduzieren.',
    'Smart Meter ermöglichen Haushalten, ihren Stromverbrauch in Echtzeit zu verfolgen.',
    'Mikronetze sind kleine Stromnetze, die unabhängig vom Hauptnetz arbeiten können.',
    'Hochspannungs-Gleichstrom (HGÜ) ermöglicht eine effiziente Stromübertragung über lange Strecken.'
  ]
};

// Merge all regional facts
export const electricityCountryFacts: Record<string, string[]> = {
  ...europeElectricityFacts,
  ...americasElectricityFacts,
  ...asiaPacificElectricityFacts,
  ...middleEastElectricityFacts,
  ...africaElectricityFacts,
  ...defaultElectricityFacts
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
  { code: 'MA', nameKey: 'COUNTRIES.MOROCCO' }
];
