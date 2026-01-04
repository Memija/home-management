// Hauptindex für Länderfakten - führt alle regionalen Faktendateien zusammen
import { europeFacts } from './europe';
import { americasFacts } from './americas';
import { asiaPacificFacts } from './asia-pacific';
import { middleEastFacts } from './middle-east';
import { africaFacts } from './africa';

// Standardfakten für Länder ohne spezifische Daten oder als Fallback
const defaultFacts = {
    DEFAULT: [
        'Wasser ist die einzige Substanz, die natürlich in allen drei Zuständen existiert: fest, flüssig und gasförmig.',
        'Der menschliche Körper besteht zu etwa 60% aus Wasser.',
        'Es braucht 2.700 Liter Wasser, um ein Baumwoll-T-Shirt herzustellen.',
        'Ein tropfender Wasserhahn kann bis zu 11.000 Liter Wasser pro Jahr verschwenden.',
        'Nur 3% des Wassers auf der Erde ist Süßwasser.',
        'Die Landwirtschaft verbraucht etwa 70% des weltweiten Süßwassers.',
        'Eine 5-minütige Dusche verbraucht etwa 45 Liter Wasser.',
        'Der durchschnittliche Geschirrspüler verbraucht 15 Liter pro Zyklus.',
        'Die Produktion von 1 Kilogramm Rindfleisch erfordert 15.000 Liter Wasser.',
        'Wasser kann mehr Substanzen lösen als jede andere Flüssigkeit.',
        'Heißes Wasser gefriert unter bestimmten Bedingungen schneller als kaltes.',
        'Ein tropfender Wasserhahn verschwendet genug Wasser, um monatlich eine Badewanne zu füllen.'
    ],
    WORLD: [
        '71% der Erdoberfläche ist mit Wasser bedeckt.',
        'Etwa 97% des Wassers auf der Erde ist Salzwasser in den Ozeanen.',
        '2,5% des Wassers auf der Erde ist Süßwasser, aber das meiste ist in Eiskappen gefroren.',
        'Weniger als 1% des Wassers auf der Erde ist für den menschlichen Gebrauch zugänglich.',
        'Das Wasser, das Sie heute trinken, ist dasselbe, das Dinosaurier tranken!',
        'Weltweit haben 2,2 Milliarden Menschen keinen Zugang zu sicherem Trinkwasser.',
        'Wasserbedingte Krankheiten verursachen jährlich 3,4 Millionen Todesfälle.',
        'Der Klimawandel verändert die globale Wasserverfügbarkeit.',
        'Die durchschnittliche Person benötigt 50-100 Liter pro Tag für Grundbedürfnisse.',
        'Die Landwirtschaft ist weltweit der größte Wasserverbraucher.',
        'Wasserknappheit betrifft mehr als 40% der Weltbevölkerung.',
        'Die UN strebt bis 2030 universellen Zugang zu sauberem Wasser an.'
    ]
};

// Alle regionalen Fakten zusammenführen
export const countryFacts = {
    ...europeFacts,
    ...americasFacts,
    ...asiaPacificFacts,
    ...middleEastFacts,
    ...africaFacts,
    ...defaultFacts
};
