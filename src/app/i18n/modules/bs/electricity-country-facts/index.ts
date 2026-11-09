// Main electricity country facts index - merges all regional fact files
import { europeElectricityFacts } from './europe';
import { americasElectricityFacts } from './americas';
import { asiaPacificElectricityFacts } from './asia-pacific';
import { middleEastElectricityFacts } from './middle-east';
import { africaElectricityFacts } from './africa';
import { AVAILABLE_COUNTRIES_WITH_WORLD } from '../../../../models/country-codes.data';

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
export const availableElectricityCountries = AVAILABLE_COUNTRIES_WITH_WORLD;
