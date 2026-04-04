// Serbian Cyrillic translations - composed from feature modules
import { common } from './modules/sr/common';
import { water } from './modules/sr/water';
import { heating } from './modules/sr/heating';
import { settings } from './modules/sr/settings';
import { chart } from './modules/sr/chart';
import { countries } from './modules/sr/countries';
import { contact } from './modules/sr/contact';
import { errors } from './modules/sr/errors';
import { excel } from './modules/sr/excel';
import { waterFacts } from './modules/sr/water-facts';
import { countryFacts } from './modules/sr/country-facts/index';
import { electricity } from './modules/sr/electricity';
import { auth } from './modules/sr/auth';
import { landing } from './modules/sr/landing';
import { privacy } from './modules/sr/privacy';

import { electricityCountryFacts } from './modules/sr/electricity-country-facts/index';
import { heatingCountryFacts } from './modules/sr/heating-country-facts/index';

export const sr = {
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
  ...landing,
  ...privacy,
  WATER_FACTS: waterFacts,
  COUNTRY_FACTS: countryFacts,
  ELECTRICITY_COUNTRY_FACTS: electricityCountryFacts,
  HEATING_COUNTRY_FACTS: heatingCountryFacts,
};
