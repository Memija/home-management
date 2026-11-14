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
    'Globally, heating and cooling buildings accounts for about 40% of total energy consumption.',
    'Improving insulation is often the most cost-effective way to reduce heating costs.',
    'The ideal room temperature for health and comfort is between 18-21°C.',
    'Lowering your thermostat by just 1°C can save up to 10% on heating costs.',
    'Renewable heating technologies like heat pumps are growing by over 10% annually worldwide.',
    'Heat pumps can deliver 3-4 times more energy than they consume.',
    'District heating serves over 50 million homes in Europe alone.',
    'Building insulation can reduce heating needs by up to 80%.',
    'Smart thermostats can reduce heating costs by 10-15%.',
    'Wood was the primary heating fuel for over 400,000 years of human history.',
    'The first central heating systems appeared in ancient Rome.',
    "Geothermal heating uses Earth's constant underground temperature.",
  ],
  WORLD: [
    'The Romans invented hypocaust heating over 2,000 years ago, using underfloor channels to distribute warm air.',
    'The first modern radiator was patented in 1855 by Franz San Galli in Russia.',
    'Central heating systems only became common in homes after World War II.',
    'Iceland heats over 90% of its homes with geothermal energy, leading the world in renewable heating.',
    'The first district heating system was built in 1877 in Lockport, New York.',
    'Before central heating, wealthy families employed servants just to maintain fires in multiple rooms.',
    'The invention of the thermostat in 1883 by Warren Johnson enabled automatic temperature control.',
    'Ancient Koreans developed ondol (heated floors) heating over 5,000 years ago, a tradition still used today.',
    'Heat pumps can provide 3-4 times more energy than they consume, making them incredibly efficient.',
    'The Great Fire of London in 1666 led to building codes requiring chimneys, making heating safer.',
    'Natural gas only became the dominant heating fuel in Europe in the 1960s, replacing coal and oil.',
    'Modern condensing boilers can achieve efficiency ratings of over 90%, compared to 60% for older models.',
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
