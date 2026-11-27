import { waterFacts } from '../modules/sr/water-facts';
import { countryFacts } from '../modules/sr/country-facts/index';
import { electricityCountryFacts } from '../modules/sr/electricity-country-facts/index';
import { heatingCountryFacts } from '../modules/sr/heating-country-facts/index';

export const srFacts = {
  WATER_FACTS: waterFacts,
  COUNTRY_FACTS: countryFacts,
  ELECTRICITY_COUNTRY_FACTS: electricityCountryFacts,
  HEATING_COUNTRY_FACTS: heatingCountryFacts,
};
