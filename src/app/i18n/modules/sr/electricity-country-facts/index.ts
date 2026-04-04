// Main electricity country facts index - merges all regional fact files
import { europeElectricityFacts } from './europe';
import { americasElectricityFacts } from './americas';
import { asiaPacificElectricityFacts } from './asia-pacific';
import { middleEastElectricityFacts } from './middle-east';
import { africaElectricityFacts } from './africa';

// Default/historical facts about electricity
const defaultElectricityFacts = {
  DEFAULT: [
    'LED сијалице троше најмање 75% мање енергије него обичне.',
    'Уређаји у стању мировања (standby) могу чинити и до 10% рачуна.',
    'Прва јавна залиха електричне енергије омогућена је 1881. у Енглеској.',
    'Струја путује брзином светлости.',
    'Само један бљесак муње генерише довољно струје за целу седмицу.',
    'Исланд се готово у потпуности ослања на обновљиву енергију.',
    'Електричне јегуље могу испустити шок и до 600 волти.',
    'Бенџамин Франклин је доказао повезаност струје с муњом.',
    'Енергија ветра спада међу најчистије изворе струје.',
    'Соларни панели могу производити струју чак и у облачним данима, иако мање ефикасно.',
    'Нуклеарне електране обезбеђују око 10% светске електричне енергије.',
    'Највећа електрана на свету је брана Три кланца у Кини.',
  ],
  WORLD: [
    'Први електрични мотор изградио је Michael Faraday 1821. године.',
    'Thomas Edison отворио је прву комерцијалну електрану у New Yorku 1882.',
    'Наизменична струја (AC) славно је освојила "Рат струја".',
    'Реч "електрицитет" изведена је из грчке речи за јантар.',
    'Бакар је један од најважнијих светских струјних водича.',
    'Птице су отпорне на шок док стоје на жицама ако не затворају круг.',
    'Скоро једна трећина светске струје долази из угља.',
    'Хидроенергија носи круну у обновљивим изворима.',
    'Електрични аутомобили знатно смањују емисије стакленичких гасова.',
    'Паметна бројила обезбеђују детаљан увид у потрошњу.',
    'Микромреже обезбеђују стабилност независним зонама.',
    'Једносмерна струја високог напона (HVDC) омогућава ефикасан пренос енергије на велике удаљености.',
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
  { code: 'WORLD', nameKey: 'COUNTRIES.WORLD' },
];
