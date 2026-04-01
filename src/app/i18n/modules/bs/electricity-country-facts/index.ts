// Main electricity country facts index - merges all regional fact files
import { europeElectricityFacts } from './europe';
import { americasElectricityFacts } from './americas';
import { asiaPacificElectricityFacts } from './asia-pacific';
import { middleEastElectricityFacts } from './middle-east';
import { africaElectricityFacts } from './africa';

// Default/historical facts about electricity
const defaultElectricityFacts = {
  DEFAULT: [
    'LED sijalice troše najmanje 75% manje energije i traju 25 puta duže od običnih.',
    'Uređaji u stanju mirovanja (standby) mogu činiti i do 10% godišnjeg računa za struju.',
    'Prva javna zaliha električne energije omogućena je u godini 1881. u Engleskoj.',
    'Struja putuje brzinom svjetlosti, što iznosi otprilike 300.000 kilometara u sekundi.',
    'Samo jedan bljesak munje generiše dovoljno struje da bi cijelo domaćinstvo trošilo sedmicu dana.',
    'Island se gotovo u potpunosti oslanja na besprijekornu obnovljivu energiju za svoju struju.',
    'Električne jegulje mogu ispustiti opasan strujni šok i do ogromnih 600 volti.',
    'Benjamin Franklin nije u potpunosti otkrio struju, ali je uspješno dokazao njenu povezanost s munjom.',
    'Energija vjetra spada među najveće, najčišće i najbrže rastuće izvore struje u svijetu.',
    'Solarni paneli i dalje generišu određeni podjeljak struje čak i tokom oblačnih i tamnih dana.',
    'Oko jedne desetine svjetske upotrebljive elektroenergetske zalihe stiže ravno sa nuklearnih elektrana.',
    'Najgrandioznija elektrocentralna elektrana leži na Brani tri klanca ukorijenjena usred Kine.',
  ],
  WORLD: [
    'Prvi električni motor formulisao je i uspješno izgradio niko drugi nego Michael Faraday tokom 1821. godine.',
    'Poznati pionir Thomas Edison otvorio je prvu izgrađenu komercijalnu mrežnu elektranu usred New Yorka 1882. godine.',
    'Kratica naizmjenične struje (AC) slavno je osvojila takozvani "Rat struja" koji se vodio s krajem decenije po tom pitanju.',
    'Originalna staromodna riječ "elektricitet" izvedena je iz prastare predivne grčke riječi za pojam jantara.',
    'Fizički element žutozlatni bakar najstandardniji je i jedan od uveliko primjenjivih svjetskih strujnih vodiča.',
    'Brojne su ptice savršeno otporne spram šoka dok uspješno staju na gole žice samo ukoliko svojim tijelom ne zatvaraju strujni krug ka podu.',
    'Skoro jednoj trećini današnjih zaliha za planetarni nivo struje presuđuje najpoznatiji stari, crni element kamen uglja.',
    'Snaga riječnih tokova s takozvanom hidroenergijom ubjedljivo nosi krunu prvenstva spram globalnih zelenih nivoa obnovljivih izvora.',
    'Trendi i pametni električni automobili znatno doprinose smanjenim procentima emisija gasnog trovanja staklenikom.',
    'Napredno očitavanje pametnih metara obezbjeđuje ljudima redovan i stalan prozor pri uživom očitanju njihove rastrošne tekuće kućne konzumacije.',
    'Pojava malih takozvanih nezavisnih mikromreža obezbjeđuje stabilne opskrbitelje električne snage po općoj formaciji dislokalnih nezavisnih zona.',
    'Istosmjerne linije ekstremnih dugačkih visokonaponskih kanala uvjerljivo nude najsigurnije duge prijenosne kanale po kopnima.',
  ],
};

// Merge all regional facts
export const electricityCountryFacts: Record<string, string[]> = {
  ...europeElectricityFacts,
  ...americasElectricityFacts,
  ...asiaPacificElectricityFacts,
  ...middleEastElectricityFacts,
  ...africaElectricityFacts,
  ...defaultElectricityFacts,
};

// List of available countries with translation keys
export const availableElectricityCountries = [
  // Europe
  { code: 'DE', nameKey: 'COUNTRIES.GERMANY' },
  { code: 'AT', nameKey: 'COUNTRIES.AUSTRIA' },
  { code: 'CH', nameKey: 'COUNTRIES.SWITZERLAND' },
  { code: 'NL', nameKey: 'COUNTRIES.NETHERLANDS' },
  { code: 'FR', nameKey: 'COUNTRIES.FRANCE' },
  { code: 'GB', nameKey: 'COUNTRIES.UNITED_KINGDOM' },
  { code: 'IT', nameKey: 'COUNTRIES.ITALY' },
  { code: 'ES', nameKey: 'COUNTRIES.SPAIN' },
  { code: 'BE', nameKey: 'COUNTRIES.BELGIUM' },
  { code: 'IE', nameKey: 'COUNTRIES.IRELAND' },
  { code: 'NO', nameKey: 'COUNTRIES.NORWAY' },
  { code: 'DK', nameKey: 'COUNTRIES.DENMARK' },
  { code: 'FI', nameKey: 'COUNTRIES.FINLAND' },
  { code: 'SE', nameKey: 'COUNTRIES.SWEDEN' },
  { code: 'PL', nameKey: 'COUNTRIES.POLAND' },
  { code: 'PT', nameKey: 'COUNTRIES.PORTUGAL' },
  { code: 'GR', nameKey: 'COUNTRIES.GREECE' },
  { code: 'HR', nameKey: 'COUNTRIES.CROATIA' },
  { code: 'CZ', nameKey: 'COUNTRIES.CZECH_REPUBLIC' },
  { code: 'HU', nameKey: 'COUNTRIES.HUNGARY' },
  { code: 'RO', nameKey: 'COUNTRIES.ROMANIA' },
  { code: 'SK', nameKey: 'COUNTRIES.SLOVAKIA' },
  { code: 'SI', nameKey: 'COUNTRIES.SLOVENIA' },
  { code: 'BG', nameKey: 'COUNTRIES.BULGARIA' },
  { code: 'RS', nameKey: 'COUNTRIES.SERBIA' },
  { code: 'BA', nameKey: 'COUNTRIES.BOSNIA_AND_HERZEGOVINA' },
  { code: 'AL', nameKey: 'COUNTRIES.ALBANIA' },
  { code: 'ME', nameKey: 'COUNTRIES.MONTENEGRO' },
  { code: 'MK', nameKey: 'COUNTRIES.NORTH_MACEDONIA' },
  { code: 'XK', nameKey: 'COUNTRIES.KOSOVO' },
  { code: 'IS', nameKey: 'COUNTRIES.ICELAND' },
  { code: 'LU', nameKey: 'COUNTRIES.LUXEMBOURG' },
  { code: 'MT', nameKey: 'COUNTRIES.MALTA' },
  { code: 'CY', nameKey: 'COUNTRIES.CYPRUS' },
  { code: 'EE', nameKey: 'COUNTRIES.ESTONIA' },
  { code: 'LV', nameKey: 'COUNTRIES.LATVIA' },
  { code: 'LT', nameKey: 'COUNTRIES.LITHUANIA' },

  // Americas
  { code: 'US', nameKey: 'COUNTRIES.USA' },
  { code: 'CA', nameKey: 'COUNTRIES.CANADA' },
  { code: 'MX', nameKey: 'COUNTRIES.MEXICO' },
  { code: 'BR', nameKey: 'COUNTRIES.BRAZIL' },
  { code: 'AR', nameKey: 'COUNTRIES.ARGENTINA' },

  // Asia-Pacific
  { code: 'JP', nameKey: 'COUNTRIES.JAPAN' },
  { code: 'CN', nameKey: 'COUNTRIES.CHINA' },
  { code: 'IN', nameKey: 'COUNTRIES.INDIA' },
  { code: 'AU', nameKey: 'COUNTRIES.AUSTRALIA' },
  { code: 'NZ', nameKey: 'COUNTRIES.NEW_ZEALAND' },

  // Middle East
  { code: 'SA', nameKey: 'COUNTRIES.SAUDI_ARABIA' },
  { code: 'AE', nameKey: 'COUNTRIES.UAE' },
  { code: 'IL', nameKey: 'COUNTRIES.ISRAEL' },
  { code: 'TR', nameKey: 'COUNTRIES.TURKEY' },

  // Africa
  { code: 'ZA', nameKey: 'COUNTRIES.SOUTH_AFRICA' },
  { code: 'EG', nameKey: 'COUNTRIES.EGYPT' },
  { code: 'NG', nameKey: 'COUNTRIES.NIGERIA' },
  { code: 'KE', nameKey: 'COUNTRIES.KENYA' },
  { code: 'MA', nameKey: 'COUNTRIES.MOROCCO' },

  // World (average)
  { code: 'WORLD', nameKey: 'COUNTRIES.WORLD' },
];
