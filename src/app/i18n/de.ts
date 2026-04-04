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
import { landing } from './modules/de/landing';
import { privacy } from './modules/de/privacy';

import { electricityCountryFacts } from './modules/de/electricity-country-facts/index';
import { heatingCountryFacts } from './modules/de/heating-country-facts/index';

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
  ...landing,
  ...privacy,
  WATER_FACTS: waterFacts,
  COUNTRY_FACTS: countryFacts,
  ELECTRICITY_COUNTRY_FACTS: electricityCountryFacts,
  HEATING_COUNTRY_FACTS: heatingCountryFacts,
};
