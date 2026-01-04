// Main country facts index - merges all regional fact files
import { europeFacts } from './europe';
import { americasFacts } from './americas';
import { asiaPacificFacts } from './asia-pacific';
import { middleEastFacts } from './middle-east';
import { africaFacts } from './africa';

// Default facts for countries without specific data or as fallback
const defaultFacts = {
    DEFAULT: [
        'Water is the only substance that exists naturally in all three states: solid, liquid, and gas.',
        'The human body is about 60% water.',
        'It takes 2,700 liters of water to produce one cotton t-shirt.',
        'A leaky faucet can waste up to 11,000 liters of water per year.',
        'Only 3% of Earth\'s water is fresh water.',
        'Agriculture uses about 70% of global fresh water.',
        'A 5-minute shower uses about 45 liters of water.',
        'The average dishwasher uses 15 liters per cycle.',
        'Producing 1 kilogram of beef requires 15,000 liters of water.',
        'Water can dissolve more substances than any other liquid.',
        'Hot water freezes faster than cold water in some conditions.',
        'A dripping tap wastes enough water to fill a bathtub monthly.'
    ],
    WORLD: [
        '71% of Earth\'s surface is covered by water.',
        'About 97% of Earth\'s water is saltwater in oceans.',
        '2.5% of Earth\'s water is fresh, but most is frozen in ice caps.',
        'Less than 1% of Earth\'s water is accessible for human use.',
        'The water you drink today is the same water dinosaurs drank!',
        'Globally, 2.2 billion people lack safe drinking water.',
        'Water-related diseases cause 3.4 million deaths annually.',
        'Climate change is altering global water availability.',
        'The average person needs 50-100 liters per day for basic needs.',
        'Agriculture is the largest water consumer worldwide.',
        'Water scarcity affects more than 40% of the global population.',
        'UN aims for universal clean water access by 2030.'
    ]
};

// Merge all regional facts
export const countryFacts = {
    ...europeFacts,
    ...americasFacts,
    ...asiaPacificFacts,
    ...middleEastFacts,
    ...africaFacts,
    ...defaultFacts
};
