// Main country facts index - merges all regional fact files
import { europeFacts } from './europe';
import { americasFacts } from './americas';
import { asiaPacificFacts } from './asia-pacific';
import { middleEastFacts } from './middle-east';
import { africaFacts } from './africa';

// Default facts for countries without specific data or as fallback
const defaultFacts = {
  DEFAULT: [
    'Woda jest jedyną substancją występującą naturalnie w trzech stanach skupienia.',
    'Ludzkie ciało składa się w około 60% z wody.',
    'Dla szklanki piwa w restauracji zużywa się do 75 litrów wody w całym łańcuchu produkcji.',
    'Kapiący kran może zmarnować 11.000 litrów wody rocznie.',
    'Tylko 3% wody na Ziemi to woda słodka nadająca się do picia.',
    '5-minutowy prysznic zużywa około 45 litrów wody.',
    'Średnia zmywarka zużywa 15 litrów wody na cykl.',
    'Wyprodukowanie 1 kg wołowiny wymaga aż 15.000 litrów wody.',
    'Woda potrafi rozpuścić więcej substancji niż jakakolwiek inna ciecz.',
    'Gorąca woda w pewnych warunkach zamarza szybciej niż zimna.',
    'Kapiący kran marnuje tyle wody, że co miesiąc mógłbyś napełnić nią wannę.',
    'Woda pokrywa ponad 70% powierzchni naszej planety.',
  ],
  WORLD: [
    '71% powierzchni Ziemi to woda.',
    'Około 97% ziemskiej wody to słona woda w oceanach.',
    'Globalnie 2,2 miliarda ludzi nie ma dostępu do bezpiecznej wody pitnej.',
    'Choroby związane z brakiem wody odpowiadają za 3,4 mln zgonów rocznie.',
    'ONZ ma cel równego dostępu do czystej wody do 2030 roku.',
    'Rolnictwo jest największym konsumentem wody na całym świecie.',
    'Niedobór wody dotyka ponad 40% populacji świata.',
    'Przeciętny człowiek potrzebuje 50–100 litrów wody dziennie do zaspokojenia potrzeb.',
    'Lodowce i czapy lodowe magazynują około 68% światowej wody słodkiej.',
    'Amazonka jest największą rzeką świata pod względem objętości przepływu.',
    'Morze Martwe jest tak słone, że ludzie mogą bez wysiłku unosić się na jego powierzchni.',
    'Średni czas, jaki woda spędza w atmosferze to 9 dni.',
  ],
};

// Merge all regional facts
export const countryFacts = {
  ...europeFacts,
  ...americasFacts,
  ...asiaPacificFacts,
  ...middleEastFacts,
  ...africaFacts,
  ...defaultFacts,
};
