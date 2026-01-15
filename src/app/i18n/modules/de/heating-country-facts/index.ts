// Main German heating country facts index - merges all regional fact files
import { europeHeatingFacts } from './europe';
import { americasHeatingFacts } from './americas';
import { asiaPacificHeatingFacts } from './asia-pacific';
import { middleEastHeatingFacts } from './middle-east';
import { africaHeatingFacts } from './africa';

// Default/historical facts about heating evolution - German
const defaultHeatingFacts = {
    DEFAULT: [
        'Weltweit entfallen etwa 40% des Gesamtenergieverbrauchs auf das Heizen und Kühlen von Gebäuden.',
        'Die Verbesserung der Isolierung ist oft der kostengünstigste Weg, um Heizkosten zu senken.',
        'Die ideale Raumtemperatur für Gesundheit und Komfort liegt zwischen 18-21°C.',
        'Wenn Sie Ihren Thermostat um nur 1°C senken, können Sie bis zu 10% bei den Heizkosten sparen.',
        'Erneuerbare Heiztechnologien wie Wärmepumpen wachsen weltweit jährlich um über 10%.',
        'Wärmepumpen können 3-4 mal mehr Energie liefern als sie verbrauchen.',
        'Fernwärme versorgt allein in Europa über 50 Millionen Haushalte.',
        'Gebäudedämmung kann den Heizbedarf um bis zu 80% reduzieren.',
        'Intelligente Thermostate können Heizkosten um 10-15% senken.',
        'Holz war über 400.000 Jahre Menschheitsgeschichte der primäre Heizbrennstoff.',
        'Die ersten Zentralheizungssysteme erschienen im antiken Rom.',
        'Geothermische Heizung nutzt die konstante Untergrundtemperatur der Erde.'
    ],
    WORLD: [
        'Die Römer erfanden die Hypokaustenheizung vor über 2.000 Jahren und nutzten Kanäle unter dem Boden, um warme Luft zu verteilen.',
        'Der erste moderne Heizkörper wurde 1855 von Franz San Galli in Russland patentiert.',
        'Zentralheizungssysteme wurden erst nach dem Zweiten Weltkrieg in Haushalten üblich.',
        'Island heizt über 90% seiner Häuser mit Geothermie und ist damit Weltmarktführer bei erneuerbarer Heizung.',
        'Das erste Fernwärmesystem wurde 1877 in Lockport, New York gebaut.',
        'Vor der Zentralheizung beschäftigten wohlhabende Familien Bedienstete nur um Feuer in mehreren Räumen zu unterhalten.',
        'Die Erfindung des Thermostats 1883 durch Warren Johnson ermöglichte erstmals automatische Temperaturregelung.',
        'Die alten Koreaner entwickelten die Ondol-Heizung (beheizte Böden) vor über 5.000 Jahren, eine Tradition die heute noch verwendet wird.',
        'Wärmepumpen können 3-4 mal mehr Energie liefern als sie verbrauchen, was sie unglaublich effizient für Heizung macht.',
        'Das Große Feuer von London 1666 führte zu Bauvorschriften, die Schornsteine vorschrieben und das Heizen sicherer machten.',
        'Erdgas wurde in Europa erst in den 1960er Jahren zum dominierenden Heizbrennstoff und ersetzte Kohle und Öl.',
        'Moderne Brennwertkessel können Wirkungsgrade von über 90% erreichen, verglichen mit 60% bei älteren Modellen.'
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

// List of available countries with translation keys (same as English version)
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
