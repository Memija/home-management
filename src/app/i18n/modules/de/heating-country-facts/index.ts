// Main German heating country facts index - merges all regional fact files
import { europeHeatingFacts } from './europe';
import { americasHeatingFacts } from './americas';
import { asiaPacificHeatingFacts } from './asia-pacific';
import { middleEastHeatingFacts } from './middle-east';
import { africaHeatingFacts } from './africa';
import { AVAILABLE_COUNTRIES_WITH_WORLD } from '../../../../models/country-codes.data';

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
    'Geothermische Heizung nutzt die konstante Untergrundtemperatur der Erde.',
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
    'Moderne Brennwertkessel können Wirkungsgrade von über 90% erreichen, verglichen mit 60% bei älteren Modellen.',
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

// List of available countries with translation keys (same as English version)
export const availableHeatingCountries = AVAILABLE_COUNTRIES_WITH_WORLD;
