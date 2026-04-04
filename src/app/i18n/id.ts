// Indonesian translations - composed from feature modules
import { common } from './modules/id/common';
import { water } from './modules/id/water';
import { heating } from './modules/id/heating';
import { settings } from './modules/id/settings';
import { chart } from './modules/id/chart';
import { countries } from './modules/id/countries';
import { contact } from './modules/id/contact';
import { errors } from './modules/id/errors';
import { excel } from './modules/id/excel';
import { waterFacts } from './modules/id/water-facts';
import { countryFacts } from './modules/id/country-facts/index';
import { electricity } from './modules/id/electricity';
import { auth } from './modules/id/auth';
import { landing } from './modules/id/landing';
import { privacy } from './modules/id/privacy';
import { electricityCountryFacts } from './modules/id/electricity-country-facts/index';
import { heatingCountryFacts } from './modules/id/heating-country-facts/index';

export const id = {
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
