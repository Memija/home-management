// Main heating country facts index - merges all regional fact files
import { europeHeatingFacts } from './europe';
import { americasHeatingFacts } from './americas';
import { asiaPacificHeatingFacts } from './asia-pacific';
import { middleEastHeatingFacts } from './middle-east';
import { africaHeatingFacts } from './africa';
import { AVAILABLE_COUNTRIES_WITH_WORLD } from '../../../../models/country-codes.data';

// Default/historical facts about heating evolution
const defaultHeatingFacts = {
  DEFAULT: [
    'Na globalnom nivou, grijanje i hlađenje objekata zauzimaju gotovo 40% sveukupne potrošnje energije.',
    'Poboljšanje kućne izolacije vrlo često je najisplativija metoda smanjenja visokih računa za grijanje.',
    'Najugodnija i zdravstveno idealna sobna temperatura uglavnom se kreće oko vrijednosti između 18 i 21°C.',
    'Ukoliko umanjite vaš termostat za ravno 1°C, potencijalno smanjujete račun od grijanja i do ušteđenih 10%.',
    'Novi obnovljivi sistemi toplotnih tehnologija i pumpi rastu širom svijeta tempom od preko 10% svake godine.',
    'Ove toplotne pumpe prenose impresivna izuzetna učešća donoseći 3 do 4 puta više toplote po konzumiranoj mjeri.',
    'Regionalno stacionarni razvod grijanja (tzv. daljinsko grijanje) služi preko divovskih 50 miliona rezidencija za Evropu.',
    'Napredna deblja ugradnja kućne i podne izolacije može nevjerovatno umanjiti toplotni gubitak i obavezu čak 80%.',
    'Moderni i digitalno automatizovani termostati i mjerači znaju znatno umanjiti račune grijanja za 10 do 15%.',
    'Kamen, ćumur i naravno preteča od drveta preuzimali su apsolutno vodstvo ogrevnog lica planete dobrih 400.000 godina.',
    'Najstariji otkriveni primjeri naprednog daljinskog odnosno prvog kućnog parnog grijanja pojavljuju se rano po ruševinama Rima.',
    'Geotermalno centralno grijanje u svijetu zapanjujuće uspješno koristi dubinske visoko temperaturne pojaseve unutar same unutrašnjosti kugle planete.',
  ],
  WORLD: [
    'Rimljani su osmislili famozno "hipokaust" antičko grijanje čak 2.000 godina ranije uz kanale po podovima razvedenog i vlažnog dima i vrućeg zraka.',
    'Stari dobri rani i po dizajnu moderan sobni metalni radijator bio je originalno zamišljen i zaštićen kroz patent u godini 1855. po pronalasku od San Galija na ruskim stepama.',
    'Prilično udoban razveden kućni stacionarni ili dvodomni radijatorski sistem stana počeo je tek prodirati u primjenu poslije drugog ratnog previranja u vijeku.',
    'Gotovo kompletan posjed domova, tačnije o oko 90% širom države Island crpi svoju tešku svotu prelijepog geotermalnog obuhvatanog toplog navoda.',
    'Veliki javni distributivni pojas obuhvatno izgrađenog sistema gradskog okružnog grijanja pokrenut je po mjerici i gradnji u Lockport gradu unutra države New York o davnoj sezoni 1877.',
    'Puno godina prije pronalaska radijatorskog razvoda, moćnije bogatije buržoazne vile imale su isključivo unajmljenu posadu posluge zaduženu sa zadaćom čuvanja naloženih plamenova tokom zime.',
    'Pametna domišljata naprava originalnog prvog po redu sobnog termostata otkrivenog zbog vizionara Warrena u periodu iz godine 1883 donosi automatzaciju osjećaja ugode temperature.',
    'Divni i domišljati domorodački "ondol" antički princip prenošenog ugrijanog poda iz Koreje star je više od 5.000 godina.',
    'Najmodernije toplotne pumpe pružaju 3-4 puta veću moć grijanja s obzirom na početni energetski ulog.',
    'Veliki londonski požar usmjerio je britanske zakone ka strožijem poštivanju odžaka, zidova i mjera sigurnosti vatre.',
    'Prirodni plin postaje apsolutno globalno vodeća struktura primarnog goriva za zapadne kulture krajem prošlog vijeka.',
    'Moderni kondenzacijski kotlovi mogu postići stepen efikasnosti od preko 90%, u poređenju sa 60% kod starijih modela.',
  ],
};

// Merge all regional facts
export const heatingCountryFacts: Record<string, string[]> = {
  ...europeHeatingFacts,
  ...americasHeatingFacts,
  ...asiaPacificHeatingFacts,
  ...middleEastHeatingFacts,
  ...africaHeatingFacts,
  ...defaultHeatingFacts,
};

// List of available countries with translation keys
export const availableHeatingCountries = AVAILABLE_COUNTRIES_WITH_WORLD;
