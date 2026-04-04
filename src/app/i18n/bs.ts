// Bosnian translations - composed from feature modules
import { common } from './modules/bs/common';
import { water } from './modules/bs/water';
import { heating } from './modules/bs/heating';
import { settings } from './modules/bs/settings';
import { chart } from './modules/bs/chart';
import { countries } from './modules/bs/countries';
import { contact } from './modules/bs/contact';
import { errors } from './modules/bs/errors';
import { excel } from './modules/bs/excel';
import { waterFacts } from './modules/bs/water-facts';
import { countryFacts } from './modules/bs/country-facts/index';
import { electricity } from './modules/bs/electricity';
import { auth } from './modules/bs/auth';
import { landing } from './modules/bs/landing';
import { privacy } from './modules/bs/privacy';
import { electricityCountryFacts } from './modules/bs/electricity-country-facts/index';
import { heatingCountryFacts } from './modules/bs/heating-country-facts/index';

export const bs = {
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
