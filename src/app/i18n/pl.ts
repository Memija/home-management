// Main Polish translation entry point
import { common } from './modules/pl/common';
import { water } from './modules/pl/water';
import { heating } from './modules/pl/heating';
import { electricity } from './modules/pl/electricity';
import { settings } from './modules/pl/settings';
import { auth } from './modules/pl/auth';
import { landing } from './modules/pl/landing';
import { privacy } from './modules/pl/privacy';
import { waterFacts } from './modules/pl/water-facts';
import { errors } from './modules/pl/errors';
import { excel } from './modules/pl/excel';
import { chart } from './modules/pl/chart';
import { countries } from './modules/pl/countries';
import { contact } from './modules/pl/contact';
import { countryFacts } from './modules/pl/country-facts/index';
import { electricityCountryFacts } from './modules/pl/electricity-country-facts/index';
import { heatingCountryFacts } from './modules/pl/heating-country-facts/index';

export const pl = {
  ...common,
  ...water,
  ...heating,
  ...electricity,
  ...settings,
  ...auth,
  ...landing,
  ...privacy,
  ...errors,
  ...excel,
  ...chart,
  ...countries,
  ...contact,
  WATER_FACTS: waterFacts,
  COUNTRY_FACTS: countryFacts,
  ELECTRICITY_COUNTRY_FACTS: electricityCountryFacts,
  HEATING_COUNTRY_FACTS: heatingCountryFacts,
};
