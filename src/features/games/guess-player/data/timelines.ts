/**
 * The authored career routes, one line per player: the full name the card pool
 * is matched on, then every club spell as `club@year` in the order the player
 * moved. Lifted verbatim from `data/guess_player_data.dart`.
 *
 * Data, not design — nothing here belongs in the token layer, and the routes
 * are the puzzle, so a name or a year edited here changes what the game asks.
 */

export type ClubSpell = {
  clubName: string;
  startYear: number;
};

export type GuessPlayerTimeline = {
  /** Matches the card's `name` exactly; a miss drops the route. */
  playerName: string;
  career: ClubSpell[];
};

function parse(rows: string[]): GuessPlayerTimeline[] {
  return rows.map((row) => {
    const [playerName, spells] = row.split("|");
    return {
      playerName,
      career:
        spells === ""
          ? []
          : spells.split(",").map((spell) => {
              const at = spell.lastIndexOf("@");
              return {
                clubName: spell.slice(0, at),
                startYear: Number.parseInt(spell.slice(at + 1), 10),
              };
            }),
    };
  });
}

const footballGuessTimelinesRows: string[] = [
  "Lionel Messi|Barcelona@2004,Paris SG@2021,Inter Miami@2023",
  "Cristiano Ronaldo|Sporting CP@2002,Man United@2003,Real Madrid@2009,Juventus@2018,Man United@2021,Al Nassr@2023",
  "Kevin De Bruyne|Genk@2008,Chelsea@2012,Werder Bremen@2012,VfL Wolfsburg@2014,Man City@2015",
  "Jude Bellingham|Birmingham@2019,Dortmund@2020,Real Madrid@2023",
  "Harry Kane|Tottenham@2009,Leyton Orient@2011,Millwall@2012,Norwich@2012,Leicester@2013,Bayern Munich@2023",
  "Vinícius Júnior|Flamengo@2017,Real Madrid@2018",
  "Lautaro Martínez|Racing Club@2015,Inter@2018",
  "Julián Álvarez|River Plate@2018,Man City@2022,Atlético Madrid@2024",
  "Rodrigo De Paul|Racing Club@2012,Valencia@2014,Udinese@2016,Atlético Madrid@2021",
  "Enzo Fernández|River Plate@2019,Defensa y Justicia@2020,River Plate@2021,Benfica@2022,Chelsea@2023",
  "Alexis Mac Allister|Argentinos Juniors@2016,Brighton@2019,Boca Juniors@2019,Brighton@2020,Liverpool@2023",
  "Neymar|Santos@2009,Barcelona@2013,Paris SG@2017,Al Hilal@2023,Santos@2025",
  "Raphinha|Avaí@2016,Vitória Guimarães@2016,Sporting CP@2017,Rennes@2018,Leeds United@2020,Barcelona@2022",
  "Bruno Guimarães|Audax@2015,Athletico Paranaense@2017,Lyon@2020,Newcastle United@2022",
  "Matheus Cunha|Coritiba@2017,Sion@2018,RB Leipzig@2018,Hertha Berlin@2020,Atlético Madrid@2021,Wolves@2023",
  "Kylian Mbappé|Monaco@2015,Paris SG@2017,Real Madrid@2024",
  "Ousmane Dembélé|Rennes@2015,Dortmund@2016,Barcelona@2017,Paris SG@2023",
  "Michael Olise|Reading@2017,Crystal Palace@2021,Bayern Munich@2024",
  "Bukayo Saka|Arsenal@2018",
  "Phil Foden|Man City@2017",
  "Marcus Rashford|Man United@2015,Aston Villa@2025",
  "Cole Palmer|Man City@2020,Chelsea@2023",
  "Rafael Leão|Sporting CP@2017,Lille@2018,AC Milan@2019",
  "Bruno Fernandes|Novara@2012,Udinese@2013,Sampdoria@2016,Sporting CP@2017,Man United@2020",
  "Bernardo Silva|Benfica@2013,Monaco@2014,Man City@2017",
  "Vitinha|Porto@2020,Wolves@2020,Porto@2021,Paris SG@2022",
  "Lamine Yamal|Barcelona@2023",
  "Nico Williams|Athletic Club@2021",
  "Pedri González|Las Palmas@2019,Barcelona@2020",
  "Mikel Oyarzabal|Real Sociedad@2015",
  "Jamal Musiala|Bayern Munich@2020",
];

export const footballGuessTimelines: GuessPlayerTimeline[] = parse(footballGuessTimelinesRows);

const cricketGuessTimelinesRows: string[] = [
  "Virat Kohli|Delhi@2006,India U19@2008,RCB@2008",
  "Suryakumar Yadav|Mumbai@2010,MI@2012,KKR@2014,MI@2018",
  "Shubman Gill|Punjab@2017,KKR@2018,GT@2022",
  "Heinrich Klaasen|Titans@2011,Chennai Super Kings@2018,Royal Challengers Bengaluru@2019,Rajasthan Royals@2020,Punjab Kings@2021,Sunrisers Hyderabad@2023",
  "Rohit Sharma|Deccan Chargers@2008,Mumbai Indians@2011",
  "Sunil Narine|Trinidad and Tobago@2009,Kolkata Knight Riders@2012",
  "Ravindra Jadeja|Rajasthan Royals@2008,Kochi Tuskers Kerala@2011,Chennai Super Kings@2012,Gujarat Lions@2016,Chennai Super Kings@2018",
  "Rishabh Pant|Delhi Capitals@2016,Lucknow Super Giants@2025",
  "Jos Buttler|Mumbai Indians@2016,Rajasthan Royals@2018,Gujarat Titans@2025",
  "Hardik Pandya|Mumbai Indians@2015,Gujarat Titans@2022,Mumbai Indians@2024",
  "Travis Head|South Australia@2009,Delhi Capitals@2016,Royal Challengers Bengaluru@2017,Sunrisers Hyderabad@2024",
  "Nicholas Pooran|Trinidad and Tobago@2012,Punjab Kings@2021,Sunrisers Hyderabad@2022,Lucknow Super Giants@2023",
  "MS Dhoni|Bihar@1999,Jharkhand@2004,Chennai Super Kings@2008,Rising Pune Supergiant@2016,Chennai Super Kings@2018",
  "Sanju Samson|Kerala@2011,Kolkata Knight Riders@2012,Rajasthan Royals@2013,Delhi Daredevils@2016,Rajasthan Royals@2018,Chennai Super Kings@2025",
  "Yashasvi Jaiswal|Mumbai@2019,Rajasthan Royals@2020",
  "KL Rahul|Karnataka@2010,Royal Challengers Bengaluru@2013,Sunrisers Hyderabad@2014,Royal Challengers Bengaluru@2016,Punjab Kings@2018,Lucknow Super Giants@2022",
  "Ruturaj Gaikwad|Maharashtra@2016,Chennai Super Kings@2019",
  "Quinton de Kock|Sunrisers Hyderabad@2014,Delhi Capitals@2016,Royal Challengers Bengaluru@2019,Mumbai Indians@2020,Lucknow Super Giants@2022,Mumbai Indians@2025",
  "Rinku Singh|Uttar Pradesh@2014,Kolkata Knight Riders@2018",
  "Abhishek Sharma|Punjab@2017,Delhi Capitals@2018,Sunrisers Hyderabad@2022",
  "Sam Curran|Surrey@2015,Punjab Kings@2019,Chennai Super Kings@2020,Punjab Kings@2023,Rajasthan Royals@2025",
  "Axar Patel|Gujarat@2010,Mumbai Indians@2013,Punjab Kings@2014,Delhi Capitals@2019",
  "Shreyas Iyer|Mumbai@2014,Delhi Capitals@2015,Kolkata Knight Riders@2022,Punjab Kings@2025",
  "Shivam Dube|Mumbai@2011,Royal Challengers Bengaluru@2019,Rajasthan Royals@2021,Chennai Super Kings@2022",
  "Phil Salt|Sussex@2013,Delhi Capitals@2020,Kolkata Knight Riders@2023,Royal Challengers Bengaluru@2025",
  "Cameron Green|Western Australia@2016,Mumbai Indians@2023,Royal Challengers Bengaluru@2024,Kolkata Knight Riders@2025",
  "Riyan Parag|Assam@2017,Rajasthan Royals@2019",
  "David Miller|Dolphins@2008,Punjab Kings@2012,Rajasthan Royals@2020,Gujarat Titans@2022,Delhi Capitals@2025",
  "Marcus Stoinis|Western Australia@2009,Delhi Capitals@2015,Punjab Kings@2016,Royal Challengers Bengaluru@2019,Lucknow Super Giants@2022,Punjab Kings@2025",
  "Wanindu Hasaranga|Sri Lanka@2017,Royal Challengers Bengaluru@2021,Rajasthan Royals@2022,Royal Challengers Bengaluru@2024,Lucknow Super Giants@2025",
];

export const cricketGuessTimelines: GuessPlayerTimeline[] = parse(cricketGuessTimelinesRows);

const basketballGuessTimelinesRows: string[] = [
  "LeBron James|Cleveland@2003,Miami Heat@2010,Cleveland@2014,LA Lakers@2018",
  "Kevin Durant|Seattle@2007,Oklahoma@2008,Golden State@2016,Brooklyn@2019,Phoenix@2023",
  "Jayson Tatum|Boston@2017",
  "Nikola Jokic|Mega Basket@2012,Denver@2015",
  "Shai Gilgeous-Alexander|Kentucky@2017,LA Clippers@2018,Oklahoma City@2019",
  "Luka Doncic|Real Madrid@2015,Dallas@2018,LA Lakers@2025",
  "Victor Wembanyama|Nanterre 92@2019,ASVEL@2021,Metropolitans 92@2022,San Antonio@2023",
  "Giannis Antetokounmpo|Filathlitikos@2011,Milwaukee@2013",
  "Stephen Curry|Davidson@2006,Golden State@2009",
  "Anthony Edwards|Georgia@2020,Minnesota@2020",
  "Donovan Mitchell|Louisville@2015,Utah@2017,Cleveland@2022",
  "Jalen Brunson|Villanova@2015,Dallas@2018,New York@2022",
  "Joel Embiid|Kansas@2013,Philadelphia@2014",
  "Devin Booker|Kentucky@2014,Phoenix@2015",
  "Cade Cunningham|Oklahoma State@2020,Detroit@2021",
  "Trae Young|Oklahoma@2017,Atlanta@2018",
  "Bam Adebayo|Kentucky@2016,Miami@2017",
  "Tyler Herro|Kentucky@2018,Miami@2019",
  "Kyrie Irving|Duke@2010,Cleveland@2011,Boston@2017,Brooklyn@2019,Dallas@2023",
  "Kawhi Leonard|San Diego State@2009,San Antonio@2011,Toronto@2018,LA Clippers@2019",
  "James Harden|Arizona State@2007,Oklahoma City@2009,Houston@2012,Brooklyn@2021,Philadelphia@2022,LA Clippers@2023",
  "Klay Thompson|Washington State@2008,Golden State@2011,Dallas@2024",
  "Jamal Murray|Kentucky@2015,Denver@2016",
  "Derrick White|Colorado@2012,San Antonio@2017,Boston@2022",
  "Jaylen Brown|California@2015,Boston@2016",
  "Pascal Siakam|New Mexico State@2014,Toronto@2016,Indiana@2024",
  "Karl-Anthony Towns|Kentucky@2014,Minnesota@2015,New York@2024",
  "Paul George|Fresno State@2008,Indiana@2010,Oklahoma City@2017,LA Clippers@2019,Philadelphia@2024",
  "Zion Williamson|Duke@2018,New Orleans@2019",
  "LaMelo Ball|Illawarra Hawks@2019,Charlotte@2020",
];

export const basketballGuessTimelines: GuessPlayerTimeline[] = parse(basketballGuessTimelinesRows);
