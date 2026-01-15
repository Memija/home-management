// Main heating country facts index - merges all regional fact files
import { europeHeatingFacts } from './europe';
import { americasHeatingFacts } from './americas';
import { asiaPacificHeatingFacts } from './asia-pacific';
import { middleEastHeatingFacts } from './middle-east';
import { africaHeatingFacts } from './africa';

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
        'Geothermal heating uses Earth\'s constant underground temperature.'
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
        'Modern condensing boilers can achieve efficiency ratings of over 90%, compared to 60% for older models.'
    ]
};

// Merge all regional facts
export const heatingCountryFacts: Record<string, string[]> = {
    ...europeHeatingFacts,
    ...americasHeatingFacts,
    ...asiaPacificHeatingFacts,
    ...middleEastHeatingFacts,
    ...africaHeatingFacts,
    ...defaultHeatingFacts
};

// List of available countries with translation keys
export const availableHeatingCountries = [
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
    { code: 'CL', nameKey: 'COUNTRIES.CHILE' },
    { code: 'CO', nameKey: 'COUNTRIES.COLOMBIA' },
    { code: 'PE', nameKey: 'COUNTRIES.PERU' },
    { code: 'VE', nameKey: 'COUNTRIES.VENEZUELA' },
    { code: 'EC', nameKey: 'COUNTRIES.ECUADOR' },
    { code: 'UY', nameKey: 'COUNTRIES.URUGUAY' },
    { code: 'PY', nameKey: 'COUNTRIES.PARAGUAY' },
    { code: 'BO', nameKey: 'COUNTRIES.BOLIVIA' },
    // Asia-Pacific
    { code: 'JP', nameKey: 'COUNTRIES.JAPAN' },
    { code: 'CN', nameKey: 'COUNTRIES.CHINA' },
    { code: 'KR', nameKey: 'COUNTRIES.SOUTH_KOREA' },
    { code: 'IN', nameKey: 'COUNTRIES.INDIA' },
    { code: 'AU', nameKey: 'COUNTRIES.AUSTRALIA' },
    { code: 'NZ', nameKey: 'COUNTRIES.NEW_ZEALAND' },
    { code: 'ID', nameKey: 'COUNTRIES.INDONESIA' },
    { code: 'TH', nameKey: 'COUNTRIES.THAILAND' },
    { code: 'VN', nameKey: 'COUNTRIES.VIETNAM' },
    { code: 'PH', nameKey: 'COUNTRIES.PHILIPPINES' },
    { code: 'MY', nameKey: 'COUNTRIES.MALAYSIA' },
    { code: 'SG', nameKey: 'COUNTRIES.SINGAPORE' },
    { code: 'TW', nameKey: 'COUNTRIES.TAIWAN' },
    { code: 'HK', nameKey: 'COUNTRIES.HONG_KONG' },
    { code: 'BD', nameKey: 'COUNTRIES.BANGLADESH' },
    { code: 'PK', nameKey: 'COUNTRIES.PAKISTAN' },
    { code: 'LK', nameKey: 'COUNTRIES.SRI_LANKA' },
    { code: 'NP', nameKey: 'COUNTRIES.NEPAL' },
    { code: 'MN', nameKey: 'COUNTRIES.MONGOLIA' },
    { code: 'KZ', nameKey: 'COUNTRIES.KAZAKHSTAN' },
    // Middle East
    { code: 'SA', nameKey: 'COUNTRIES.SAUDI_ARABIA' },
    { code: 'AE', nameKey: 'COUNTRIES.UAE' },
    { code: 'QA', nameKey: 'COUNTRIES.QATAR' },
    { code: 'KW', nameKey: 'COUNTRIES.KUWAIT' },
    { code: 'BH', nameKey: 'COUNTRIES.BAHRAIN' },
    { code: 'OM', nameKey: 'COUNTRIES.OMAN' },
    { code: 'IL', nameKey: 'COUNTRIES.ISRAEL' },
    { code: 'JO', nameKey: 'COUNTRIES.JORDAN' },
    { code: 'LB', nameKey: 'COUNTRIES.LEBANON' },
    { code: 'TR', nameKey: 'COUNTRIES.TURKEY' },
    { code: 'IR', nameKey: 'COUNTRIES.IRAN' },
    // Africa
    { code: 'ZA', nameKey: 'COUNTRIES.SOUTH_AFRICA' },
    { code: 'MA', nameKey: 'COUNTRIES.MOROCCO' },
    { code: 'DZ', nameKey: 'COUNTRIES.ALGERIA' },
    { code: 'TN', nameKey: 'COUNTRIES.TUNISIA' },
    { code: 'EG', nameKey: 'COUNTRIES.EGYPT' },
    { code: 'NG', nameKey: 'COUNTRIES.NIGERIA' },
    { code: 'KE', nameKey: 'COUNTRIES.KENYA' },
    { code: 'ET', nameKey: 'COUNTRIES.ETHIOPIA' },
    { code: 'GH', nameKey: 'COUNTRIES.GHANA' },
    { code: 'TZ', nameKey: 'COUNTRIES.TANZANIA' }
];
