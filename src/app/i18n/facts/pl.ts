import { waterFacts } from '../modules/pl/water-facts';
import { countryFacts } from '../modules/pl/country-facts/index';
import { electricityCountryFacts } from '../modules/pl/electricity-country-facts/index';
import { heatingCountryFacts } from '../modules/pl/heating-country-facts/index';

export const plFacts = {
  WATER_FACTS: waterFacts,
  COUNTRY_FACTS: countryFacts,
  ELECTRICITY_COUNTRY_FACTS: electricityCountryFacts,
  HEATING_COUNTRY_FACTS: heatingCountryFacts,
};
