// English translations - composed from feature modules
import { common } from './modules/en/common';
import { water } from './modules/en/water';
import { heating } from './modules/en/heating';
import { settings } from './modules/en/settings';
import { chart } from './modules/en/chart';
import { countries } from './modules/en/countries';
import { contact } from './modules/en/contact';
import { errors } from './modules/en/errors';
import { excel } from './modules/en/excel';
import { waterFacts } from './modules/en/water-facts';
import { countryFacts } from './modules/en/country-facts/index';
import { electricity } from './modules/en/electricity';

export const en = {
  ...common,
  ...water,
  ...heating,
  ...settings,
  ...chart,
  ...countries,
  ...contact,
  ...errors,
  ...excel,
  ...electricity,
  WATER_FACTS: waterFacts,
  COUNTRY_FACTS: countryFacts
};
