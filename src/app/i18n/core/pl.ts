// Polish core UI translations - excludes bulky country/utility trivia facts
import { common } from '../modules/pl/common';
import { water } from '../modules/pl/water';
import { heating } from '../modules/pl/heating';
import { electricity } from '../modules/pl/electricity';
import { settings } from '../modules/pl/settings';
import { auth } from '../modules/pl/auth';
import { landing } from '../modules/pl/landing';
import { motivation } from '../modules/pl/motivation';
import { privacy } from '../modules/pl/privacy';
import { seo } from '../modules/pl/seo';
import { errors } from '../modules/pl/errors';
import { excel } from '../modules/pl/excel';
import { chart } from '../modules/pl/chart';
import { countries } from '../modules/pl/countries';
import { contact } from '../modules/pl/contact';

export const pl = {
  ...common,
  ...water,
  ...heating,
  ...electricity,
  ...settings,
  ...auth,
  ...landing,
  ...motivation,
  ...privacy,
  ...seo,
  ...errors,
  ...excel,
  ...chart,
  ...countries,
  ...contact,
};
