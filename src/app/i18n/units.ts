import { Language } from '../services/language.service';
import { UnitTranslations } from './plural-rules.helper';

export const enUnits: UnitTranslations = {
  over: 'over',
  million: { one: 'million', other: 'million' },
  thousand: { one: 'thousand', other: 'thousand' },
  year: { one: 'year', other: 'years' },
  month: { one: 'month', other: 'months' },
  day: { one: 'day', other: 'days' },
  hour: { one: 'hour', other: 'hours' },
  minute: { one: 'minute', other: 'minutes' },
  dayKeywords: ['days', 'day'],
  minuteKeywords: ['minutes', 'minute'],
};

export const deUnits: UnitTranslations = {
  over: 'über',
  million: { other: 'Millionen' },
  thousand: { one: 'Tausend', other: 'Tausend' },
  year: { one: 'Jahr', other: 'Jahre' },
  month: { one: 'Monat', other: 'Monate' },
  day: { one: 'Tag', other: 'Tage' },
  hour: { one: 'Stunde', other: 'Stunden' },
  minute: { one: 'Minute', other: 'Minuten' },
  dayKeywords: ['Tage', 'Tag'],
  minuteKeywords: ['Minuten', 'Minute'],
};

export const bsUnits: UnitTranslations = {
  over: 'preko',
  million: { one: 'milion', other: 'miliona' },
  thousand: { one: 'hiljadu', other: 'hiljada' },
  year: { one: 'godinu', other: 'godina' },
  month: { one: 'mjesec', other: 'mjeseci' },
  day: { one: 'dan', other: 'dana' },
  hour: { one: 'sat', other: 'sati' },
  minute: { one: 'minutu', other: 'minuta' },
  dayKeywords: ['dana', 'dan'],
  minuteKeywords: ['minuta', 'minutu', 'minute'],
};

export const srUnits: UnitTranslations = {
  over: 'преко',
  million: { one: 'милион', other: 'милиона' },
  thousand: { one: 'хиљаду', other: 'хиљада' },
  year: { one: 'годину', other: 'година' },
  month: { one: 'месец', other: 'месеци' },
  day: { one: 'дан', other: 'дана' },
  hour: { one: 'сат', other: 'сати' },
  minute: { one: 'минуту', other: 'минута' },
  dayKeywords: ['дана', 'дан'],
  minuteKeywords: ['минута', 'минуту', 'минуте'],
};

export const plUnits: UnitTranslations = {
  over: 'ponad',
  million: { one: 'milion', few: 'miliony', many: 'milionów', other: 'milionów' },
  thousand: { one: 'tysiąc', few: 'tysiące', many: 'tysięcy', other: 'tysięcy' },
  year: { one: 'rok', few: 'lata', many: 'lat', other: 'lat' },
  month: { one: 'miesiąc', few: 'miesiące', many: 'miesięcy', other: 'miesięcy' },
  day: { one: 'dzień', few: 'dni', many: 'dni', other: 'dni' },
  hour: { one: 'godzinę', few: 'godziny', many: 'godzin', other: 'godzin' },
  minute: { one: 'minutę', few: 'minuty', many: 'minut', other: 'minut' },
  dayKeywords: ['dni', 'dzień'],
  minuteKeywords: ['minut', 'minuty', 'minutę'],
};

export const idUnits: UnitTranslations = {
  over: 'lebih dari',
  million: { other: 'juta' },
  thousand: { other: 'ribu' },
  year: { other: 'tahun' },
  month: { other: 'bulan' },
  day: { other: 'hari' },
  hour: { other: 'jam' },
  minute: { other: 'menit' },
  dayKeywords: ['hari'],
  minuteKeywords: ['menit'],
};

export const UNITS_CONFIG: Record<Language, UnitTranslations> = {
  en: enUnits,
  de: deUnits,
  bs: bsUnits,
  sr: srUnits,
  pl: plUnits,
  id: idUnits,
};
