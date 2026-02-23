// German translations - composed from feature modules
import { common } from './modules/de/common';
import { water } from './modules/de/water';
import { heating } from './modules/de/heating';
import { settings } from './modules/de/settings';
import { chart } from './modules/de/chart';
import { countries } from './modules/de/countries';
import { contact } from './modules/de/contact';
import { errors } from './modules/de/errors';
import { excel } from './modules/de/excel';
import { waterFacts } from './modules/de/water-facts';
import { countryFacts } from './modules/de/country-facts/index';
import { electricity } from './modules/de/electricity';
import { auth } from './modules/de/auth';

export const de = {
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
  ...auth,
  WATER_FACTS: waterFacts,
  COUNTRY_FACTS: countryFacts
};
