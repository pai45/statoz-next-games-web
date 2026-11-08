/**
 * The nine sub-ratings the rally physics reads, for all one hundred athletes.
 *
 * Generated from the Flutter roster (`lib/data/tennis_athletes.dart`), where
 * every value is hand-authored per athlete rather than derived from the
 * archetype. Names, countries, tiers and card art are NOT here: those come from
 * `packs/data/tennis-cards.ts`, which already ships the same hundred ids. This
 * file adds only what the engine needs, so `PlayerCard` — a shape five sports
 * share — stays out of it.
 *
 * Ratings shape play in three places: `speed` and `stamina` set how fast a body
 * covers the court and how quickly that decays, `control`/`spin`/`power` set how
 * wide a mishit sprays, and `reach` sets how far from the ball a swing can still
 * connect. `acceleration` and `volley` are carried for the card face; the engine
 * does not read them.
 */

import type { TennisAthlete } from "../types";

export const tennisAthletes: TennisAthlete[] = [
  { id: "jannik-sinner", archetype: "allCourtRival", signature: "Complete all-court pressure without a weak zone", overallRating: 96, ratings: { speed: 99, acceleration: 99, power: 97, control: 93, serve: 97, stamina: 96, volley: 93, spin: 94, reach: 96 } },
  { id: "alexander-zverev", archetype: "powerBaseliner", signature: "Big serve into an immediate forehand", overallRating: 94, ratings: { speed: 91, acceleration: 93, power: 96, control: 91, serve: 95, stamina: 94, volley: 93, spin: 97, reach: 96 } },
  { id: "carlos-alcaraz", archetype: "allCourtRival", signature: "Raises another level in the big moments", overallRating: 94, ratings: { speed: 91, acceleration: 94, power: 92, control: 99, serve: 96, stamina: 98, volley: 89, spin: 96, reach: 91 } },
  { id: "felix-auger-aliassime", archetype: "serveAndVolley", signature: "Fast serve followed by decisive net pressure", overallRating: 92, ratings: { speed: 93, acceleration: 94, power: 94, control: 91, serve: 94, stamina: 90, volley: 95, spin: 87, reach: 90 } },
  { id: "alex-de-minaur", archetype: "speedDefender", signature: "Relentless legs deep behind the baseline", overallRating: 92, ratings: { speed: 95, acceleration: 98, power: 90, control: 93, serve: 89, stamina: 93, volley: 91, spin: 93, reach: 86 } },
  { id: "ben-shelton", archetype: "powerBaseliner", signature: "Ends points early with raw power", overallRating: 89, ratings: { speed: 84, acceleration: 84, power: 96, control: 86, serve: 96, stamina: 89, volley: 88, spin: 85, reach: 93 } },
  { id: "novak-djokovic", archetype: "allCourtRival", signature: "Complete all-court pressure without a weak zone", overallRating: 89, ratings: { speed: 90, acceleration: 90, power: 87, control: 89, serve: 92, stamina: 91, volley: 88, spin: 91, reach: 83 } },
  { id: "daniil-medvedev", archetype: "speedDefender", signature: "Absorbs pace and resets the point", overallRating: 89, ratings: { speed: 98, acceleration: 98, power: 82, control: 94, serve: 81, stamina: 91, volley: 87, spin: 86, reach: 84 } },
  { id: "flavio-cobolli", archetype: "allRounder", signature: "Solid from everywhere with no clear hole", overallRating: 89, ratings: { speed: 93, acceleration: 93, power: 88, control: 90, serve: 88, stamina: 92, volley: 84, spin: 87, reach: 86 } },
  { id: "taylor-fritz", archetype: "powerBaseliner", signature: "Flattens the ball and takes time away", overallRating: 89, ratings: { speed: 87, acceleration: 89, power: 98, control: 89, serve: 92, stamina: 86, volley: 83, spin: 87, reach: 90 } },
  { id: "alexander-bublik", archetype: "serveAndVolley", signature: "Chips and charges at every opening", overallRating: 85, ratings: { speed: 84, acceleration: 84, power: 89, control: 80, serve: 93, stamina: 81, volley: 99, spin: 73, reach: 82 } },
  { id: "jiri-lehecka", archetype: "powerBaseliner", signature: "Big serve into an immediate forehand", overallRating: 85, ratings: { speed: 84, acceleration: 80, power: 99, control: 83, serve: 92, stamina: 82, volley: 77, spin: 82, reach: 86 } },
  { id: "casper-ruud", archetype: "spinSpecialist", signature: "Heavy topspin that climbs off the bounce", overallRating: 85, ratings: { speed: 86, acceleration: 89, power: 76, control: 90, serve: 80, stamina: 93, volley: 83, spin: 93, reach: 75 } },
  { id: "lorenzo-musetti", archetype: "spinSpecialist", signature: "Heavy topspin that climbs off the bounce", overallRating: 85, ratings: { speed: 83, acceleration: 88, power: 78, control: 92, serve: 81, stamina: 93, volley: 80, spin: 94, reach: 76 } },
  { id: "learner-tien", archetype: "speedDefender", signature: "Covers the court and outlasts the rally", overallRating: 85, ratings: { speed: 97, acceleration: 93, power: 74, control: 89, serve: 77, stamina: 91, volley: 80, spin: 84, reach: 80 } },
  { id: "andrey-rublev", archetype: "powerBaseliner", signature: "Ends points early with raw power", overallRating: 85, ratings: { speed: 80, acceleration: 84, power: 98, control: 85, serve: 90, stamina: 80, volley: 78, spin: 84, reach: 86 } },
  { id: "frances-tiafoe", archetype: "allRounder", signature: "Balanced timing and reliable recovery", overallRating: 85, ratings: { speed: 87, acceleration: 87, power: 83, control: 90, serve: 80, stamina: 87, volley: 82, spin: 88, reach: 81 } },
  { id: "luciano-darderi", archetype: "spinSpecialist", signature: "Never gives the same ball twice", overallRating: 85, ratings: { speed: 85, acceleration: 85, power: 83, control: 91, serve: 80, stamina: 89, volley: 83, spin: 95, reach: 74 } },
  { id: "jakub-mensik", archetype: "powerBaseliner", signature: "Big serve into an immediate forehand", overallRating: 85, ratings: { speed: 81, acceleration: 79, power: 96, control: 82, serve: 95, stamina: 86, volley: 77, spin: 82, reach: 87 } },
  { id: "alejandro-davidovich-fokina", archetype: "speedDefender", signature: "Absorbs pace and resets the point", overallRating: 85, ratings: { speed: 98, acceleration: 94, power: 77, control: 88, serve: 72, stamina: 94, volley: 79, spin: 89, reach: 74 } },
  { id: "valentin-vacherot", archetype: "allRounder", signature: "Balanced timing and reliable recovery", overallRating: 81, ratings: { speed: 82, acceleration: 86, power: 78, control: 85, serve: 76, stamina: 85, volley: 80, spin: 79, reach: 78 } },
  { id: "francisco-cerundolo", archetype: "spinSpecialist", signature: "Never gives the same ball twice", overallRating: 81, ratings: { speed: 77, acceleration: 81, power: 72, control: 91, serve: 79, stamina: 89, volley: 81, spin: 91, reach: 68 } },
  { id: "arthur-fils", archetype: "powerBaseliner", signature: "Big serve into an immediate forehand", overallRating: 81, ratings: { speed: 78, acceleration: 78, power: 94, control: 79, serve: 89, stamina: 78, volley: 72, spin: 77, reach: 84 } },
  { id: "tommy-paul", archetype: "speedDefender", signature: "Elite retrieval and counterattack speed", overallRating: 81, ratings: { speed: 92, acceleration: 92, power: 72, control: 85, serve: 68, stamina: 92, volley: 74, spin: 83, reach: 71 } },
  { id: "rafael-jodar", archetype: "allRounder", signature: "Adapts the plan as the match turns", overallRating: 81, ratings: { speed: 85, acceleration: 85, power: 77, control: 83, serve: 77, stamina: 82, volley: 79, spin: 81, reach: 80 } },
  { id: "karen-khachanov", archetype: "powerBaseliner", signature: "Flattens the ball and takes time away", overallRating: 81, ratings: { speed: 78, acceleration: 76, power: 94, control: 82, serve: 90, stamina: 78, volley: 74, spin: 77, reach: 80 } },
  { id: "joao-fonseca", archetype: "powerBaseliner", signature: "Heavy first strike from the baseline", overallRating: 81, ratings: { speed: 77, acceleration: 79, power: 91, control: 81, serve: 91, stamina: 80, volley: 71, spin: 78, reach: 81 } },
  { id: "arthur-rinderknech", archetype: "serveAndVolley", signature: "Wins the short points with clean hands", overallRating: 81, ratings: { speed: 79, acceleration: 82, power: 82, control: 73, serve: 95, stamina: 74, volley: 97, spin: 67, reach: 80 } },
  { id: "ugo-humbert", archetype: "serveAndVolley", signature: "Fast serve followed by decisive net pressure", overallRating: 81, ratings: { speed: 81, acceleration: 86, power: 84, control: 73, serve: 92, stamina: 73, volley: 94, spin: 67, reach: 79 } },
  { id: "tomas-martin-etcheverry", archetype: "spinSpecialist", signature: "Never gives the same ball twice", overallRating: 81, ratings: { speed: 75, acceleration: 83, power: 75, control: 91, serve: 78, stamina: 84, volley: 81, spin: 92, reach: 70 } },
  { id: "alejandro-tabilo", archetype: "allRounder", signature: "Steady rhythm that wears opponents down", overallRating: 81, ratings: { speed: 87, acceleration: 82, power: 80, control: 84, serve: 79, stamina: 81, volley: 78, spin: 80, reach: 78 } },
  { id: "brandon-nakashima", archetype: "allRounder", signature: "Solid from everywhere with no clear hole", overallRating: 81, ratings: { speed: 86, acceleration: 84, power: 79, control: 86, serve: 79, stamina: 80, volley: 80, spin: 79, reach: 76 } },
  { id: "ignacio-buse", archetype: "spinSpecialist", signature: "Heavy topspin that climbs off the bounce", overallRating: 81, ratings: { speed: 82, acceleration: 83, power: 75, control: 91, serve: 75, stamina: 88, volley: 74, spin: 94, reach: 67 } },
  { id: "matteo-arnaldi", archetype: "allRounder", signature: "Solid from everywhere with no clear hole", overallRating: 81, ratings: { speed: 82, acceleration: 85, power: 80, control: 85, serve: 79, stamina: 83, volley: 79, spin: 80, reach: 76 } },
  { id: "zizou-bergs", archetype: "powerBaseliner", signature: "Overwhelming pace off both wings", overallRating: 81, ratings: { speed: 77, acceleration: 80, power: 93, control: 82, serve: 91, stamina: 76, volley: 72, spin: 78, reach: 80 } },
  { id: "arthur-fery", archetype: "allRounder", signature: "Balanced timing and reliable recovery", overallRating: 78, ratings: { speed: 77, acceleration: 83, power: 75, control: 79, serve: 77, stamina: 82, volley: 76, spin: 77, reach: 76 } },
  { id: "alexander-blockx", archetype: "allRounder", signature: "Solid from everywhere with no clear hole", overallRating: 78, ratings: { speed: 80, acceleration: 82, power: 74, control: 79, serve: 77, stamina: 79, volley: 78, spin: 81, reach: 72 } },
  { id: "cameron-norrie", archetype: "speedDefender", signature: "Turns defence into offence in one step", overallRating: 78, ratings: { speed: 92, acceleration: 88, power: 63, control: 82, serve: 66, stamina: 89, volley: 72, spin: 82, reach: 68 } },
  { id: "denis-shapovalov", archetype: "powerBaseliner", signature: "Big serve into an immediate forehand", overallRating: 78, ratings: { speed: 74, acceleration: 70, power: 92, control: 79, serve: 88, stamina: 75, volley: 73, spin: 73, reach: 78 } },
  { id: "corentin-moutet", archetype: "speedDefender", signature: "Turns defence into offence in one step", overallRating: 78, ratings: { speed: 90, acceleration: 87, power: 70, control: 83, serve: 66, stamina: 87, volley: 71, spin: 77, reach: 71 } },
  { id: "jan-lennard-struff", archetype: "serveAndVolley", signature: "Cuts the rally short with soft touch", overallRating: 78, ratings: { speed: 76, acceleration: 80, power: 82, control: 70, serve: 89, stamina: 70, volley: 93, spin: 63, reach: 79 } },
  { id: "raphael-collignon", archetype: "allRounder", signature: "Clean fundamentals under pressure", overallRating: 78, ratings: { speed: 79, acceleration: 80, power: 75, control: 79, serve: 74, stamina: 85, volley: 74, spin: 80, reach: 76 } },
  { id: "matteo-berrettini", archetype: "powerBaseliner", signature: "Heavy first strike from the baseline", overallRating: 78, ratings: { speed: 73, acceleration: 71, power: 92, control: 79, serve: 87, stamina: 76, volley: 70, spin: 75, reach: 79 } },
  { id: "jaume-munar", archetype: "speedDefender", signature: "Covers the court and outlasts the rally", overallRating: 78, ratings: { speed: 93, acceleration: 90, power: 63, control: 81, serve: 70, stamina: 88, volley: 72, spin: 78, reach: 67 } },
  { id: "juan-manuel-cerundolo", archetype: "spinSpecialist", signature: "Never gives the same ball twice", overallRating: 78, ratings: { speed: 78, acceleration: 81, power: 69, control: 88, serve: 75, stamina: 83, volley: 72, spin: 91, reach: 65 } },
  { id: "alex-michelsen", archetype: "allRounder", signature: "Clean fundamentals under pressure", overallRating: 78, ratings: { speed: 81, acceleration: 76, power: 77, control: 82, serve: 75, stamina: 82, volley: 73, spin: 81, reach: 75 } },
  { id: "ethan-quinn", archetype: "powerBaseliner", signature: "Overwhelming pace off both wings", overallRating: 78, ratings: { speed: 72, acceleration: 74, power: 90, control: 79, serve: 89, stamina: 74, volley: 72, spin: 74, reach: 78 } },
  { id: "mariano-navone", archetype: "spinSpecialist", signature: "Sharp angles and disruptive changes of pace", overallRating: 78, ratings: { speed: 74, acceleration: 81, power: 69, control: 87, serve: 74, stamina: 83, volley: 75, spin: 93, reach: 66 } },
  { id: "adrian-mannarino", archetype: "speedDefender", signature: "Turns defence into offence in one step", overallRating: 78, ratings: { speed: 91, acceleration: 90, power: 67, control: 77, serve: 69, stamina: 88, volley: 73, spin: 78, reach: 69 } },
  { id: "terence-atmane", archetype: "serveAndVolley", signature: "Wins the short points with clean hands", overallRating: 78, ratings: { speed: 77, acceleration: 80, power: 83, control: 74, serve: 89, stamina: 69, volley: 91, spin: 62, reach: 77 } },
  { id: "aryna-sabalenka", archetype: "powerBaseliner", signature: "Ends points early with raw power", overallRating: 96, ratings: { speed: 97, acceleration: 96, power: 95, control: 99, serve: 95, stamina: 93, volley: 99, spin: 95, reach: 95 } },
  { id: "elena-rybakina", archetype: "powerBaseliner", signature: "Flattens the ball and takes time away", overallRating: 94, ratings: { speed: 94, acceleration: 93, power: 97, control: 91, serve: 95, stamina: 92, volley: 92, spin: 96, reach: 96 } },
  { id: "jessica-pegula", archetype: "allRounder", signature: "Solid from everywhere with no clear hole", overallRating: 94, ratings: { speed: 95, acceleration: 95, power: 92, control: 97, serve: 95, stamina: 97, volley: 93, spin: 93, reach: 89 } },
  { id: "coco-gauff", archetype: "speedDefender", signature: "Turns defence into offence in one step", overallRating: 92, ratings: { speed: 96, acceleration: 99, power: 85, control: 93, serve: 88, stamina: 94, volley: 89, spin: 93, reach: 91 } },
  { id: "mirra-andreeva", archetype: "allCourtRival", signature: "Elite in every phase of the point", overallRating: 92, ratings: { speed: 93, acceleration: 91, power: 95, control: 96, serve: 94, stamina: 96, volley: 87, spin: 90, reach: 86 } },
  { id: "karolina-muchova", archetype: "serveAndVolley", signature: "Cuts the rally short with soft touch", overallRating: 89, ratings: { speed: 89, acceleration: 89, power: 93, control: 84, serve: 93, stamina: 83, volley: 99, spin: 82, reach: 89 } },
  { id: "linda-noskova", archetype: "powerBaseliner", signature: "Ends points early with raw power", overallRating: 89, ratings: { speed: 86, acceleration: 87, power: 95, control: 92, serve: 92, stamina: 87, volley: 84, spin: 86, reach: 92 } },
  { id: "iga-swiatek", archetype: "spinSpecialist", signature: "Sharp angles and disruptive changes of pace", overallRating: 89, ratings: { speed: 89, acceleration: 91, power: 83, control: 94, serve: 89, stamina: 89, volley: 85, spin: 97, reach: 84 } },
  { id: "amanda-anisimova", archetype: "powerBaseliner", signature: "Big serve into an immediate forehand", overallRating: 89, ratings: { speed: 88, acceleration: 85, power: 97, control: 89, serve: 92, stamina: 87, volley: 87, spin: 88, reach: 88 } },
  { id: "elina-svitolina", archetype: "speedDefender", signature: "Turns defence into offence in one step", overallRating: 89, ratings: { speed: 95, acceleration: 94, power: 79, control: 94, serve: 86, stamina: 93, volley: 88, spin: 87, reach: 85 } },
  { id: "marta-kostyuk", archetype: "allRounder", signature: "Adapts the plan as the match turns", overallRating: 85, ratings: { speed: 87, acceleration: 89, power: 84, control: 91, serve: 80, stamina: 90, volley: 79, spin: 83, reach: 82 } },
  { id: "victoria-mboko", archetype: "powerBaseliner", signature: "Flattens the ball and takes time away", overallRating: 85, ratings: { speed: 84, acceleration: 80, power: 95, control: 85, serve: 92, stamina: 83, volley: 77, spin: 82, reach: 87 } },
  { id: "naomi-osaka", archetype: "powerBaseliner", signature: "Ends points early with raw power", overallRating: 85, ratings: { speed: 78, acceleration: 82, power: 98, control: 82, serve: 90, stamina: 84, volley: 76, spin: 86, reach: 89 } },
  { id: "belinda-bencic", archetype: "allRounder", signature: "Solid from everywhere with no clear hole", overallRating: 85, ratings: { speed: 84, acceleration: 87, power: 82, control: 90, serve: 83, stamina: 91, volley: 83, spin: 85, reach: 80 } },
  { id: "jasmine-paolini", archetype: "speedDefender", signature: "Turns defence into offence in one step", overallRating: 85, ratings: { speed: 97, acceleration: 96, power: 73, control: 89, serve: 77, stamina: 92, volley: 81, spin: 85, reach: 75 } },
  { id: "iva-jovic", archetype: "allRounder", signature: "Steady rhythm that wears opponents down", overallRating: 85, ratings: { speed: 84, acceleration: 84, power: 86, control: 91, serve: 83, stamina: 89, volley: 79, spin: 88, reach: 81 } },
  { id: "sorana-cirstea", archetype: "powerBaseliner", signature: "Flattens the ball and takes time away", overallRating: 85, ratings: { speed: 79, acceleration: 83, power: 94, control: 86, serve: 95, stamina: 81, volley: 79, spin: 84, reach: 84 } },
  { id: "diana-shnaider", archetype: "powerBaseliner", signature: "Heavy first strike from the baseline", overallRating: 85, ratings: { speed: 80, acceleration: 83, power: 95, control: 87, serve: 94, stamina: 84, volley: 78, spin: 81, reach: 83 } },
  { id: "ekaterina-alexandrova", archetype: "powerBaseliner", signature: "Flattens the ball and takes time away", overallRating: 85, ratings: { speed: 77, acceleration: 84, power: 94, control: 81, serve: 93, stamina: 85, volley: 78, spin: 86, reach: 87 } },
  { id: "anna-kalinskaya", archetype: "allRounder", signature: "Clean fundamentals under pressure", overallRating: 85, ratings: { speed: 90, acceleration: 86, power: 81, control: 91, serve: 81, stamina: 85, volley: 83, spin: 87, reach: 81 } },
  { id: "marie-bouzkova", archetype: "speedDefender", signature: "Covers the court and outlasts the rally", overallRating: 81, ratings: { speed: 93, acceleration: 92, power: 66, control: 85, serve: 73, stamina: 92, volley: 74, spin: 82, reach: 72 } },
  { id: "maja-chwalinska", archetype: "spinSpecialist", signature: "Sharp angles and disruptive changes of pace", overallRating: 81, ratings: { speed: 79, acceleration: 83, power: 73, control: 87, serve: 76, stamina: 85, volley: 80, spin: 93, reach: 73 } },
  { id: "jelena-ostapenko", archetype: "powerBaseliner", signature: "Overwhelming pace off both wings", overallRating: 81, ratings: { speed: 78, acceleration: 77, power: 91, control: 83, serve: 90, stamina: 79, volley: 70, spin: 79, reach: 82 } },
  { id: "clara-tauson", archetype: "powerBaseliner", signature: "Flattens the ball and takes time away", overallRating: 81, ratings: { speed: 74, acceleration: 81, power: 93, control: 78, serve: 93, stamina: 78, volley: 74, spin: 77, reach: 81 } },
  { id: "ann-li", archetype: "allRounder", signature: "Balanced timing and reliable recovery", overallRating: 81, ratings: { speed: 82, acceleration: 82, power: 75, control: 86, serve: 82, stamina: 83, volley: 80, spin: 84, reach: 75 } },
  { id: "barbora-krejcikova", archetype: "serveAndVolley", signature: "Cuts the rally short with soft touch", overallRating: 81, ratings: { speed: 81, acceleration: 83, power: 85, control: 76, serve: 94, stamina: 72, volley: 93, spin: 65, reach: 80 } },
  { id: "hailey-baptiste", archetype: "allRounder", signature: "Solid from everywhere with no clear hole", overallRating: 81, ratings: { speed: 82, acceleration: 86, power: 76, control: 85, serve: 77, stamina: 84, volley: 76, spin: 82, reach: 81 } },
  { id: "katerina-siniakova", archetype: "serveAndVolley", signature: "Wins the short points with clean hands", overallRating: 81, ratings: { speed: 81, acceleration: 83, power: 85, control: 75, serve: 95, stamina: 73, volley: 94, spin: 67, reach: 76 } },
  { id: "donna-vekic", archetype: "powerBaseliner", signature: "Overwhelming pace off both wings", overallRating: 81, ratings: { speed: 78, acceleration: 77, power: 94, control: 79, serve: 88, stamina: 80, volley: 71, spin: 77, reach: 85 } },
  { id: "jaqueline-cristian", archetype: "speedDefender", signature: "Relentless legs deep behind the baseline", overallRating: 81, ratings: { speed: 90, acceleration: 92, power: 69, control: 87, serve: 72, stamina: 91, volley: 77, spin: 79, reach: 72 } },
  { id: "maria-sakkari", archetype: "speedDefender", signature: "Relentless legs deep behind the baseline", overallRating: 81, ratings: { speed: 93, acceleration: 89, power: 67, control: 85, serve: 74, stamina: 88, volley: 73, spin: 85, reach: 75 } },
  { id: "emma-raducanu", archetype: "allRounder", signature: "Adapts the plan as the match turns", overallRating: 81, ratings: { speed: 84, acceleration: 84, power: 82, control: 87, serve: 78, stamina: 81, volley: 75, spin: 83, reach: 75 } },
  { id: "janice-tjen", archetype: "allRounder", signature: "Solid from everywhere with no clear hole", overallRating: 81, ratings: { speed: 81, acceleration: 83, power: 81, control: 86, serve: 81, stamina: 82, volley: 77, spin: 82, reach: 76 } },
  { id: "wang-xinyu", archetype: "powerBaseliner", signature: "Big serve into an immediate forehand", overallRating: 81, ratings: { speed: 77, acceleration: 78, power: 97, control: 78, serve: 91, stamina: 77, volley: 71, spin: 79, reach: 81 } },
  { id: "cristina-bucsa", archetype: "spinSpecialist", signature: "Carves the court open with shape and slice", overallRating: 81, ratings: { speed: 77, acceleration: 84, power: 75, control: 91, serve: 75, stamina: 84, volley: 79, spin: 92, reach: 72 } },
  { id: "sara-bejlek", archetype: "powerBaseliner", signature: "Ends points early with raw power", overallRating: 78, ratings: { speed: 72, acceleration: 74, power: 89, control: 79, serve: 85, stamina: 78, volley: 70, spin: 74, reach: 81 } },
  { id: "nikola-bartunkova", archetype: "allRounder", signature: "Clean fundamentals under pressure", overallRating: 78, ratings: { speed: 83, acceleration: 82, power: 73, control: 82, serve: 78, stamina: 78, volley: 76, spin: 77, reach: 73 } },
  { id: "magdalena-frech", archetype: "speedDefender", signature: "Covers the court and outlasts the rally", overallRating: 78, ratings: { speed: 87, acceleration: 89, power: 67, control: 82, serve: 68, stamina: 87, volley: 75, spin: 78, reach: 69 } },
  { id: "petra-marcinko", archetype: "allRounder", signature: "Adapts the plan as the match turns", overallRating: 78, ratings: { speed: 79, acceleration: 79, power: 73, control: 81, serve: 77, stamina: 81, volley: 73, spin: 82, reach: 77 } },
  { id: "mccartney-kessler", archetype: "allRounder", signature: "Adapts the plan as the match turns", overallRating: 78, ratings: { speed: 81, acceleration: 78, power: 78, control: 82, serve: 76, stamina: 80, volley: 75, spin: 76, reach: 76 } },
  { id: "viktorija-golubic", archetype: "speedDefender", signature: "Elite retrieval and counterattack speed", overallRating: 78, ratings: { speed: 88, acceleration: 85, power: 64, control: 81, serve: 71, stamina: 87, volley: 74, spin: 82, reach: 70 } },
  { id: "zeynep-sonmez", archetype: "spinSpecialist", signature: "Sharp angles and disruptive changes of pace", overallRating: 78, ratings: { speed: 76, acceleration: 82, power: 69, control: 84, serve: 77, stamina: 82, volley: 77, spin: 91, reach: 64 } },
  { id: "tereza-valentova", archetype: "allRounder", signature: "Adapts the plan as the match turns", overallRating: 78, ratings: { speed: 81, acceleration: 78, power: 76, control: 81, serve: 73, stamina: 82, volley: 77, spin: 79, reach: 75 } },
  { id: "antonia-ruzic", archetype: "spinSpecialist", signature: "Never gives the same ball twice", overallRating: 78, ratings: { speed: 79, acceleration: 81, power: 71, control: 87, serve: 74, stamina: 81, volley: 77, spin: 88, reach: 64 } },
  { id: "caty-mcnally", archetype: "serveAndVolley", signature: "Fast serve followed by decisive net pressure", overallRating: 78, ratings: { speed: 74, acceleration: 83, power: 80, control: 71, serve: 90, stamina: 75, volley: 90, spin: 64, reach: 75 } },
  { id: "talia-gibson", archetype: "allRounder", signature: "Balanced timing and reliable recovery", overallRating: 78, ratings: { speed: 80, acceleration: 80, power: 77, control: 80, serve: 78, stamina: 81, volley: 75, spin: 78, reach: 73 } },
  { id: "anhelina-kalinina", archetype: "speedDefender", signature: "Turns defence into offence in one step", overallRating: 78, ratings: { speed: 89, acceleration: 89, power: 67, control: 78, serve: 66, stamina: 88, volley: 75, spin: 78, reach: 72 } },
  { id: "peyton-stearns", archetype: "powerBaseliner", signature: "Ends points early with raw power", overallRating: 78, ratings: { speed: 73, acceleration: 77, power: 92, control: 76, serve: 90, stamina: 73, volley: 67, spin: 74, reach: 80 } },
  { id: "leylah-fernandez", archetype: "speedDefender", signature: "Turns defence into offence in one step", overallRating: 78, ratings: { speed: 90, acceleration: 85, power: 64, control: 83, serve: 71, stamina: 90, volley: 73, spin: 78, reach: 68 } },
  { id: "paula-badosa", archetype: "powerBaseliner", signature: "Ends points early with raw power", overallRating: 78, ratings: { speed: 70, acceleration: 72, power: 91, control: 79, serve: 89, stamina: 74, volley: 68, spin: 75, reach: 84 } },
];

const byId = new Map(tennisAthletes.map((athlete) => [athlete.id, athlete]));

/**
 * The athlete behind a card id.
 *
 * Falls back to the first of the roster rather than throwing, matching Flutter's
 * `firstWhere(orElse: ...)`: a stored id from an older roster should drop the
 * player into a playable match, not into an error boundary.
 */
export function tennisAthleteById(id: string): TennisAthlete {
  return byId.get(id) ?? tennisAthletes[0];
}
