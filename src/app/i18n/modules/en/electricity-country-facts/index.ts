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
    'LED bulbs use at least 75% less energy, and last 25 times longer, than incandescent lighting.',
    "Appliances in standby mode can account for 10% of an average household's annual electricity bill.",
    'The first public electricity supply was provided in Godalming, Surrey, UK in 1881.',
    'Electricity travels at the speed of light, which is about 300,000 kilometers per second.',
    'A single bolt of lightning can generate enough electricity to power a home for a week.',
    'Iceland relies almost entirely on renewable energy for its electricity production.',
    'Electric eels can produce shocks of up to 600 volts.',
    'Benjamin Franklin did not discover electricity, but he proved that lightning is a form of electricity.',
    'Wind energy is one of the fastest-growing sources of electricity in the world.',
    'Solar panels can still generate electricity on cloudy days, although less effectively.',
    "Nuclear power plants provide about 10% of the world's electricity.",
    "The world's largest power station is the Three Gorges Dam in China.",
  ],
  WORLD: [
    'The first electric motor was built in 1821 by Michael Faraday.',
    'Thomas Edison opened the first commercial power plant in New York City in 1882.',
    'Alternating current (AC) won the "War of Currents" against direct current (DC) for power distribution.',
    'The word "electricity" comes from the Greek word "elektron," which means amber.',
    'Copper is one of the best conductors of electricity and is widely used in wiring.',
    'Birds can sit on power lines without getting shocked because they are not touching the ground.',
    "About one-third of the world's electricity is generated from coal.",
    'Hydropower is the largest source of renewable electricity globally.',
    'Electric cars are becoming more popular as a way to reduce reliance on fossil fuels.',
    'Smart meters allow households to track their real-time electricity consumption.',
    'Microgrids are small-scale power grids that can operate independently from the main grid.',
    'High-voltage direct current (HVDC) allows for efficient long-distance power transmission.',
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
