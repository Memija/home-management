import { waterFacts } from '../modules/bs/water-facts';
import { countryFacts } from '../modules/bs/country-facts/index';
import { electricityCountryFacts } from '../modules/bs/electricity-country-facts/index';
import { heatingCountryFacts } from '../modules/bs/heating-country-facts/index';

export const bsFacts = {
  WATER_FACTS: waterFacts,
  COUNTRY_FACTS: countryFacts,
  ELECTRICITY_COUNTRY_FACTS: electricityCountryFacts,
  HEATING_COUNTRY_FACTS: heatingCountryFacts,
};
