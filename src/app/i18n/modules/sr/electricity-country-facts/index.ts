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
export const availableElectricityCountries = AVAILABLE_COUNTRIES_WITH_WORLD;
