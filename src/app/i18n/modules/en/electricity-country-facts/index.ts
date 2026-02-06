// Main electricity country facts index - merges all regional fact files
import { europeElectricityFacts } from './europe';
import { americasElectricityFacts } from './americas';
import { asiaPacificElectricityFacts } from './asia-pacific';
import { middleEastElectricityFacts } from './middle-east';
import { africaElectricityFacts } from './africa';

// Default/historical facts about electricity
const defaultElectricityFacts = {
  DEFAULT: [
    'LED bulbs use at least 75% less energy, and last 25 times longer, than incandescent lighting.',
    'Appliances in standby mode can account for 10% of an average household\'s annual electricity bill.',
    'The first public electricity supply was provided in Godalming, Surrey, UK in 1881.',
    'Electricity travels at the speed of light, which is about 300,000 kilometers per second.',
    'A single bolt of lightning can generate enough electricity to power a home for a week.',
    'Iceland relies almost entirely on renewable energy for its electricity production.',
    'Electric eels can produce shocks of up to 600 volts.',
    'Benjamin Franklin did not discover electricity, but he proved that lightning is a form of electricity.',
    'Wind energy is one of the fastest-growing sources of electricity in the world.',
    'Solar panels can still generate electricity on cloudy days, although less effectively.',
    'Nuclear power plants provide about 10% of the world\'s electricity.',
    'The world\'s largest power station is the Three Gorges Dam in China.'
  ],
  WORLD: [
    'The first electric motor was built in 1821 by Michael Faraday.',
    'Thomas Edison opened the first commercial power plant in New York City in 1882.',
    'Alternating current (AC) won the "War of Currents" against direct current (DC) for power distribution.',
    'The word "electricity" comes from the Greek word "elektron," which means amber.',
    'Copper is one of the best conductors of electricity and is widely used in wiring.',
    'Birds can sit on power lines without getting shocked because they are not touching the ground.',
    'About one-third of the world\'s electricity is generated from coal.',
    'Hydropower is the largest source of renewable electricity globally.',
    'Electric cars are becoming more popular as a way to reduce reliance on fossil fuels.',
    'Smart meters allow households to track their real-time electricity consumption.',
    'Microgrids are small-scale power grids that can operate independently from the main grid.',
    'High-voltage direct current (HVDC) allows for efficient long-distance power transmission.'
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
  { code: 'MA', nameKey: 'COUNTRIES.MOROCCO' },

  // World (average)
  { code: 'WORLD', nameKey: 'COUNTRIES.WORLD' }
];
