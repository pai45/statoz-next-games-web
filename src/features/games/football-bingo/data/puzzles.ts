import { clubCode, clubLabel } from "./clubs";
import { gridSize } from "../constants";
import type { BingoAxis, BingoCell, BingoPuzzle } from "../types";

/**
 * Two hundred authored career grids — the web port of
 * `football_bingo_puzzles.dart`.
 *
 * Each row is `rowClubs|columnClubs|players`: three row axes, three column
 * axes, and the nine players in row-major order, which is the order the app's
 * blueprint map is written in and therefore the order its cells are built in.
 * That order matters beyond layout — it is the list the daily shuffle permutes
 * to decide which player is asked for first.
 *
 * Ids and titles are reproduced exactly (`daily-career-v2-001`,
 * `Career Grid 001`) so a save written by one build is read by the next.
 */

const rows: readonly string[] = [
  "barca,tottenham,mancity|realmadrid,westham,chelsea|figo,mascherano,deco,bale,carrick,gallas,anelka,bellamy,ake",
  "marseille,manutd,tottenham|mancity,juventus,barca|nasri,deschamps,alexis-sanchez,tevez,di-maria,depay,adebayor,kulusevski,davids",
  "galatasaray,astonvilla,arsenal|mancity,chelsea,bayern|sane,drogba,podolski,delph,barkley,coutinho,gabriel-jesus,ashley-cole,gnabry",
  "juventus,atletico,psg|realmadrid,manutd,sevilla|cannavaro,ibrahimovic,dani-alves,courtois,falcao,simeone,hakimi,beckham,sergio-ramos",
  "lagalaxy,benfica,psv|realmadrid,barca,chelsea|beckham,ibrahimovic,ashley-cole,di-maria,saviola,david-luiz,ronaldo-nazario,kluivert,robben",
  "liverpool,acmilan,realmadrid|corinthians,chelsea,psg|mascherano,sterling,wijnaldum,pato,crespo,ronaldinho,ronaldo-nazario,hazard,mbappe",
  "chelsea,realmadrid,psg|napoli,lagalaxy,benfica|jorginho,ashley-cole,joao-felix,higuain,beckham,saviola,lavezzi,ibrahimovic,draxler",
  "psg,realmadrid,riverplate|monaco,manutd,chelsea|mbappe,di-maria,anelka,james-rodriguez,casemiro,morata,saviola,falcao,crespo",
  "galatasaray,ajax,liverpool|arsenal,manutd,realmadrid|podolski,mata,hagi,bergkamp,eriksen,huntelaar,oxlade,michael-owen,xabi-alonso",
  "lagalaxy,atletico,psg|chelsea,barca,liverpool|ashley-cole,ibrahimovic,gerrard,diego-costa,aguero,suarez,david-luiz,dembele-o,wijnaldum",
  "barca,monaco,acmilan|juventus,psg,riverplate|laudrup,messi,mascherano,henry,mbappe,falcao,baggio,ronaldinho,higuain",
  "psg,mancity,monaco|arsenal,marseille,liverpool|david-luiz,benarfa,anelka,vieira,nasri,fowler,fabregas,barthez,fabinho",
  "parma,juventus,bayern|lazio,inter,psg|crespo,adriano,buffon,laudrup,vieri,matuidi,klose,vidal,coman",
  "barca,arsenal,benfica|inter,monaco,schalke|eto,marquez,rakitic,mkhitaryan,petit,ozil,julio-cesar,bernardo-silva,draxler",
  "bayern,manutd,inter|everton,psv,arsenal|james-rodriguez,robben,gnabry,fellaini,depay,vanpersie,lukaku,ronaldo-nazario,alexis-sanchez",
  "inter,barca,monaco|juventus,manutd,psg|baggio,ashley-young,djorkaeff,zambrotta,larsson,neymar,thuram,pogba,mbappe",
  "mancity,inter,bayern|juventus,realmadrid,everton|tevez,danilo,gareth-barry,cannavaro,cambiasso,eto,de-ligt,alaba,james-rodriguez",
  "realmadrid,inter,arsenal|westbrom,napoli,roma|anelka,higuain,w-samuel,lukaku,cannavaro,batistuta,gnabry,jorginho,mkhitaryan",
  "astonvilla,ajax,manutd|lagalaxy,bayern,inter|robbie-keane,coutinho,ashley-young,ibrahimovic,de-ligt,seedorf,beckham,schweinsteiger,forlan",
  "corinthians,realmadrid,barca|flamengo,arsenal,tottenham|adriano,willian,paulinho,vinicius-jr,odegaard,modric,vidal,overmars,davids",
  "westham,manutd,liverpool|barca,chelsea,lagalaxy|mascherano,lampard,robbie-keane,larsson,matic,beckham,suarez,torres,gerrard",
  "manutd,arsenal,atletico|fulham,bayern,tottenham|vandersar,schweinsteiger,carrick,willian,podolski,campbell,m-dembele,mandzukic,trippier",
  "barca,bayern,dortmund|inter,chelsea,liverpool|figo,pedro,coutinho,vidal,ballack,mane,hakimi,pulisic,emre-can",
  "barca,realmadrid,acmilan|psg,mancity,psv|dani-alves,gundogan,depay,sergio-ramos,danilo,robben,ronaldinho,robinho,kluivert",
  "inter,westham,mancity|arsenal,chelsea,juventus|bergkamp,eto,vieri,ljungberg,moses,tevez,zinchenko,kdb,vieira",
  "mancity,chelsea,westham|juventus,barca,astonvilla|danilo,yaya-toure,given,deschamps,deco,barkley,tevez,mascherano,ings",
  "benfica,liverpool,ajax|barca,acmilan,arsenal|saviola,joao-felix,david-luiz,suarez,origi,oxlade,de-jong,huntelaar,overmars",
  "manutd,chelsea,arsenal|liverpool,dortmund,fenerbahce|michael-owen,kagawa,fred,torres,sancho,moses,sterling,mkhitaryan,ozil",
  "manutd,inter,acmilan|roma,mancity,barca|matic,tevez,larsson,batistuta,vieira,alexis-sanchez,cafu,robinho,rivaldo",
  "juventus,manutd,realmadrid|valencia,bayern,barca|deschamps,coman,henry,nani,schweinsteiger,alexis-sanchez,isco,kroos,hagi",
  "barca,inter,realmadrid|bayern,tottenham,manutd|lewandowski,paulinho,depay,podolski,eriksen,vidic,alaba,vandervaart,ronaldo",
  "leverkusen,realmadrid,astonvilla|chelsea,liverpool,inter|havertz,emre-can,vidal,courtois,xabi-alonso,sneijder,barkley,benteke,ashley-young",
  "tottenham,realmadrid,barca|arsenal,corinthians,psg|adebayor,paulinho,pochettino,odegaard,ronaldo-nazario,hakimi,fabregas,mascherano,dembele-o",
  "barca,galatasaray,realmadrid|atletico,chelsea,liverpool|griezmann,pedro,coutinho,arda-turan,drogba,babel,morata,hazard,michael-owen",
  "psg,juventus,barca|intermiami,dortmund,realmadrid|matuidi,dembele-o,sergio-ramos,higuain,emre-can,khedira,messi,gundogan,figo",
  "everton,leicester,liverpool|realmadrid,mancity,chelsea|james-rodriguez,lescott,lukaku,cambiasso,mahrez,kante,xabi-alonso,milner,sterling",
  "manutd,tottenham,atletico|celtic,newcastle,juventus|larsson,michael-owen,pogba,wanyama,townsend,kulusevski,m-dembele,trippier,mandzukic",
  "realmadrid,acmilan,barca|mancity,riverplate,santos|danilo,higuain,rodrygo,vieira,crespo,robinho,aguero,saviola,neymar",
  "galatasaray,bayern,realmadrid|mancity,atletico,inter|sane,arda-turan,sneijder,boateng,mandzukic,podolski,robinho,courtois,seedorf",
  "galatasaray,benfica,realmadrid|mancity,barca,manutd|sane,arda-turan,mata,ederson,saviola,matic,anelka,hagi,casemiro",
  "chelsea,juventus,acmilan|liverpool,manutd,psg|torres,sancho,david-luiz,emre-can,ronaldo,rabiot,origi,dalot,ronaldinho",
  "riverplate,chelsea,psg|realmadrid,monaco,inter|higuain,falcao,crespo,hazard,petit,moses,di-maria,mbappe,djorkaeff",
  "mancity,arsenal,barca|schalke,psg,manutd|sane,anelka,tevez,ozil,david-luiz,welbeck,rakitic,dani-alves,alexis-sanchez",
  "barca,liverpool,benfica|manutd,chelsea,mancity|depay,deco,yaya-toure,michael-owen,sterling,bellamy,matic,joao-felix,ruben-dias",
  "tottenham,realmadrid,atletico|lazio,mancity,inter|gascoigne,walker,davids,laudrup,danilo,w-samuel,simeone,aguero,godin",
  "tottenham,benfica,arsenal|chelsea,manutd,barca|werner,carrick,davids,joao-felix,di-maria,saviola,cech,vanpersie,fabregas",
  "acmilan,chelsea,barca|arsenal,porto,psv|vieira,dalot,ronaldo-nazario,cech,falcao,robben,henry,deco,kluivert",
  "barca,monaco,ajax|realmadrid,psg,tottenham|figo,messi,paulinho,james-rodriguez,mbappe,adebayor,huntelaar,ibrahimovic,vandervaart",
  "liverpool,juventus,bayern|leverkusen,manutd,mancity|emre-can,michael-owen,fowler,vidal,vandersar,danilo,ballack,schweinsteiger,boateng",
  "mancity,psg,parma|acmilan,monaco,tottenham|robinho,bernardo-silva,walker,ronaldinho,mbappe,pochettino,crespo,thuram,kulusevski",
  "liverpool,realmadrid,atletico|monaco,inter,tottenham|fabinho,robbie-keane,crouch,james-rodriguez,cambiasso,bale,falcao,forlan,trippier",
  "chelsea,wolfsburg,bayern|psg,acmilan,mancity|anelka,desailly,ake,draxler,origi,kdb,coman,laudrup-b,boateng",
  "psg,barca,realmadrid|tottenham,parma,psv|pochettino,buffon,wijnaldum,davids,thuram,kluivert,modric,cannavaro,robben",
  "realmadrid,chelsea,manutd|mancity,barca,dortmund|robinho,hagi,hakimi,lampard,pedro,pulisic,tevez,larsson,kagawa",
  "barca,chelsea,westham|juventus,manutd,mancity|zambrotta,alexis-sanchez,gundogan,morata,mata,ake,tevez,rio-ferdinand,bellamy",
  "newcastle,chelsea,manutd|atletico,marseille,barca|trippier,benarfa,kluivert,diego-costa,drogba,petit,forlan,barthez,depay",
  "monaco,tottenham,inter|arsenal,atletico,juventus|adebayor,falcao,trezeguet,campbell,trippier,kulusevski,bergkamp,godin,baggio",
  "bayern,barca,realmadrid|realsociedad,liverpool,arsenal|xabi-alonso,mane,gnabry,griezmann,suarez,overmars,odegaard,michael-owen,ozil",
  "parma,arsenal,atletico|realmadrid,inter,chelsea|cannavaro,adriano,crespo,odegaard,bergkamp,gallas,courtois,godin,diego-costa",
  "juventus,arsenal,barca|inter,mancity,sevilla|vieri,vieira,dani-alves,mkhitaryan,gabriel-jesus,nasri,eto,yaya-toure,rakitic",
  "bayern,realmadrid,chelsea|manutd,westbrom,bremen|schweinsteiger,gnabry,klose,casemiro,anelka,ozil,sancho,lukaku,kdb",
  "schalke,ajax,juventus|bayern,barca,realmadrid|neuer,rakitic,huntelaar,de-ligt,frank-de-boer,seedorf,coman,zambrotta,zidane",
  "psg,lagalaxy,everton|tottenham,realmadrid,barca|pochettino,sergio-ramos,neymar,robbie-keane,beckham,ibrahimovic,richarlison,james-rodriguez,eto",
  "sevilla,manutd,monaco|psg,juventus,arsenal|sergio-ramos,dani-alves,nasri,di-maria,pogba,welbeck,mbappe,trezeguet,fabregas",
  "inter,realmadrid,marseille|arsenal,sevilla,manutd|bergkamp,simeone,vidic,odegaard,isco,ronaldo,pires,nasri,barthez",
  "chelsea,juventus,ajax|manutd,arsenal,bayern|mata,havertz,laudrup-b,vandersar,ramsey,mandzukic,eriksen,overmars,de-ligt",
  "dortmund,manutd,liverpool|roma,inter,mancity|mkhitaryan,hakimi,gundogan,lukaku,vidic,tevez,alisson,robbie-keane,milner",
  "mancity,juventus,realmadrid|bayern,dortmund,barca|boateng,gundogan,aguero,coman,emre-can,henry,kroos,hakimi,laudrup",
  "psv,realmadrid,psg|bayern,mancity,manutd|robben,zinchenko,depay,alaba,danilo,casemiro,coman,anelka,beckham",
  "realmadrid,mancity,astonvilla|liverpool,arsenal,barca|xabi-alonso,odegaard,figo,fowler,gabriel-jesus,yaya-toure,benteke,pires,coutinho",
  "bayern,chelsea,benfica|juventus,inter,monaco|de-ligt,podolski,james-rodriguez,deschamps,moses,petit,di-maria,julio-cesar,bernardo-silva",
  "barca,psg,lagalaxy|chelsea,realmadrid,acmilan|pedro,hagi,rivaldo,david-luiz,sergio-ramos,ronaldinho,ashley-cole,beckham,ibrahimovic",
  "chelsea,atletico,arsenal|psv,juventus,barca|robben,deschamps,deco,depay,morata,griezmann,zinchenko,ramsey,fabregas",
  "barca,arsenal,psg|dortmund,inter,tottenham|lewandowski,davids,paulinho,mkhitaryan,bergkamp,campbell,dembele-o,djorkaeff,pochettino",
  "realmadrid,arsenal,inter|mancity,manutd,roma|robinho,ronaldo,w-samuel,gabriel-jesus,vanpersie,ashley-cole,vieira,ashley-young,batistuta",
  "inter,arsenal,chelsea|everton,marseille,bayern|eto,alexis-sanchez,vidal,walcott,pires,gnabry,barkley,drogba,ballack",
  "barca,atletico,realmadrid|liverpool,lazio,galatasaray|suarez,pedro,hagi,torres,simeone,arda-turan,xabi-alonso,laudrup,sneijder",
  "realmadrid,atletico,ajax|acmilan,inter,bayern|kaka,cambiasso,kroos,vieri,forlan,mandzukic,seedorf,eriksen,de-ligt",
  "tottenham,realmadrid,inter|psg,everton,atletico|pochettino,gascoigne,trippier,hakimi,james-rodriguez,courtois,djorkaeff,lukaku,godin",
  "monaco,chelsea,juventus|psg,manutd,liverpool|mbappe,barthez,fabinho,david-luiz,sancho,sterling,rabiot,pogba,emre-can",
  "psg,chelsea,realmadrid|manutd,bayern,benfica|beckham,coman,draxler,mata,laudrup-b,joao-felix,casemiro,alaba,di-maria",
  "galatasaray,realmadrid,mancity|inter,barca,porto|podolski,arda-turan,falcao,sneijder,figo,pepe,vieira,aguero,danilo",
  "benfica,arsenal,lagalaxy|barca,psg,roma|saviola,draxler,matic,henry,david-luiz,mkhitaryan,ibrahimovic,beckham,ashley-cole",
  "monaco,marseille,ajax|galatasaray,psg,manutd|falcao,mbappe,pogba,drogba,benarfa,barthez,babel,ibrahimovic,vandersar",
  "napoli,liverpool,barca|realmadrid,chelsea,juventus|higuain,jorginho,cannavaro,xabi-alonso,torres,emre-can,laudrup,petit,thuram",
  "wolfsburg,barca,acmilan|chelsea,bayern,benfica|kdb,mandzukic,draxler,deco,lewandowski,saviola,shevchenko,laudrup-b,joao-felix",
  "barca,chelsea,acmilan|inter,mancity,liverpool|ronaldo-nazario,yaya-toure,coutinho,moses,lampard,sterling,baggio,robinho,origi",
  "celtic,arsenal,bayern|barca,southampton,inter|larsson,vandijk,robbie-keane,overmars,walcott,bergkamp,lewandowski,mane,vidal",
  "rangers,atletico,realmadrid|tottenham,lazio,bayern|defoe,gascoigne,laudrup-b,trippier,simeone,mandzukic,bale,laudrup,kroos",
  "chelsea,acmilan,realmadrid|napoli,riverplate,inter|jorginho,falcao,moses,higuain,crespo,baggio,cannavaro,saviola,w-samuel",
  "barca,psg,monaco|realmadrid,arsenal,liverpool|figo,fabregas,suarez,sergio-ramos,anelka,wijnaldum,james-rodriguez,adebayor,fabinho",
  "bayern,inter,galatasaray|arsenal,atletico,chelsea|gnabry,mandzukic,ballack,alexis-sanchez,forlan,eto,podolski,arda-turan,drogba",
  "atletico,chelsea,arsenal|tottenham,psv,barca|trippier,depay,griezmann,werner,robben,pedro,gallas,zinchenko,henry",
  "manutd,realmadrid,psg|benfica,dortmund,chelsea|matic,kagawa,sancho,di-maria,hakimi,hazard,draxler,dembele-o,david-luiz",
  "liverpool,inter,psv|atletico,arsenal,chelsea|suarez,oxlade,torres,godin,bergkamp,lukaku,depay,zinchenko,robben",
  "monaco,juventus,chelsea|riverplate,bayern,marseille|falcao,james-rodriguez,barthez,higuain,de-ligt,rabiot,crespo,ballack,deschamps",
  "inter,acmilan,psg|lagalaxy,mancity,juventus|robbie-keane,vieira,vieri,ibrahimovic,robinho,pirlo,beckham,anelka,buffon",
  "realmadrid,acmilan,liverpool|barca,arsenal,tottenham|hagi,ozil,modric,rivaldo,vieira,davids,coutinho,oxlade,crouch",
  "realmadrid,fulham,acmilan|manutd,corinthians,atletico|ronaldo,ronaldo-nazario,courtois,vandersar,willian,m-dembele,dalot,pato,morata",
  "leverkusen,marseille,liverpool|juventus,chelsea,inter|emre-can,havertz,vidal,rabiot,deschamps,alexis-sanchez,anelka,sterling,robbie-keane",
  "barca,atletico,everton|tottenham,bayern,chelsea|paulinho,lewandowski,petit,trippier,mandzukic,diego-costa,richarlison,james-rodriguez,barkley",
  "realmadrid,manutd,mancity|inter,tottenham,chelsea|cambiasso,vandervaart,hazard,vidic,carrick,mata,vieira,walker,ake",
  "inter,arsenal,psg|mancity,tottenham,liverpool|vieira,eriksen,robbie-keane,gabriel-jesus,campbell,oxlade,anelka,pochettino,wijnaldum",
  "ajax,everton,galatasaray|inter,barca,arsenal|seedorf,de-jong,overmars,lukaku,eto,walcott,sneijder,arda-turan,podolski",
  "arsenal,realmadrid,bayern|chelsea,mancity,psg|cech,adebayor,david-luiz,hazard,danilo,sergio-ramos,ballack,boateng,coman",
  "inter,psg,realmadrid|manutd,napoli,ajax|ashley-young,lukaku,eriksen,di-maria,lavezzi,ibrahimovic,casemiro,cannavaro,vandervaart",
  "psg,liverpool,roma|realmadrid,chelsea,lagalaxy|hakimi,david-luiz,beckham,michael-owen,torres,gerrard,w-samuel,matic,ashley-cole",
  "manutd,barca,bayern|psv,acmilan,everton|depay,dalot,rooney,kluivert,rivaldo,eto,robben,laudrup-b,james-rodriguez",
  "barca,westbrom,marseille|juventus,chelsea,mancity|zambrotta,deco,aguero,anelka,lukaku,gareth-barry,rabiot,drogba,nasri",
  "barca,atletico,psg|newcastle,liverpool,mancity|kluivert,mascherano,gundogan,trippier,suarez,aguero,benarfa,wijnaldum,anelka",
  "napoli,psg,riverplate|realmadrid,acmilan,manutd|cannavaro,higuain,lukaku,sergio-ramos,ronaldinho,di-maria,saviola,crespo,falcao",
  "everton,villarreal,acmilan|inter,arsenal,manutd|eto,walcott,fellaini,godin,pires,forlan,baggio,vieira,dalot",
  "barca,chelsea,tottenham|parma,fluminense,inter|thuram,ronaldinho,davids,crespo,deco,moses,kulusevski,richarlison,eriksen",
  "juventus,mancity,riverplate|monaco,barca,manutd|trezeguet,zambrotta,pogba,bernardo-silva,yaya-toure,tevez,saviola,mascherano,falcao",
  "manutd,chelsea,schalke|barca,galatasaray,benfica|larsson,falcao,matic,fabregas,mata,joao-felix,rakitic,sane,draxler",
  "juventus,realmadrid,liverpool|monaco,psg,barca|trezeguet,matuidi,dani-alves,mbappe,hakimi,figo,fabinho,wijnaldum,coutinho",
  "arsenal,chelsea,realmadrid|bayern,juventus,fenerbahce|gnabry,ramsey,vanpersie,ballack,morata,moses,alaba,khedira,roberto-carlos",
  "realmadrid,barca,monaco|atletico,mancity,psg|courtois,danilo,sergio-ramos,griezmann,gundogan,messi,falcao,bernardo-silva,mbappe",
  "inter,psg,lagalaxy|realmadrid,tottenham,barca|cambiasso,eriksen,ronaldo-nazario,hakimi,pochettino,neymar,beckham,robbie-keane,ibrahimovic",
  "inter,barca,acmilan|flamengo,juventus,psv|julio-cesar,vieri,ronaldo-nazario,vidal,thuram,depay,ronaldinho,pirlo,kluivert",
  "mancity,manutd,chelsea|monaco,dortmund,marseille|bernardo-silva,gundogan,nasri,pogba,kagawa,barthez,petit,pulisic,deschamps",
  "westbrom,tottenham,acmilan|manutd,mancity,psg|lukaku,gareth-barry,anelka,carrick,walker,pochettino,dalot,robinho,ronaldinho",
  "realmadrid,manutd,galatasaray|barca,monaco,mancity|hagi,mbappe,danilo,larsson,barthez,tevez,arda-turan,falcao,sane",
  "barca,inter,mancity|arsenal,boca,dortmund|henry,riquelme,dembele-o,bergkamp,batistuta,mkhitaryan,gabriel-jesus,tevez,gundogan",
  "everton,boca,arsenal|barca,mancity,realmadrid|eto,delph,james-rodriguez,riquelme,tevez,w-samuel,overmars,zinchenko,odegaard",
  "liverpool,bayern,corinthians|acmilan,chelsea,psv|origi,sterling,wijnaldum,laudrup-b,ballack,robben,pato,willian,ronaldo-nazario",
  "chelsea,inter,manutd|napoli,galatasaray,everton|jorginho,drogba,barkley,cannavaro,sneijder,eto,lukaku,mata,rooney",
  "galatasaray,atletico,acmilan|chelsea,ajax,bayern|drogba,babel,sane,diego-costa,suarez,mandzukic,desailly,huntelaar,laudrup-b",
  "realmadrid,chelsea,marseille|arsenal,mancity,monaco|ozil,robinho,saviola,cech,lampard,fabregas,pires,nasri,barthez",
  "chelsea,juventus,realmadrid|monaco,acmilan,dortmund|petit,shevchenko,pulisic,trezeguet,pirlo,emre-can,mbappe,kaka,hakimi",
  "roma,manutd,astonvilla|liverpool,inter,arsenal|alisson,batistuta,ashley-cole,michael-owen,vidic,welbeck,ings,ashley-young,pires",
  "juventus,barca,inter|psg,tottenham,benfica|buffon,kulusevski,di-maria,messi,paulinho,saviola,djorkaeff,davids,julio-cesar",
  "arsenal,chelsea,barca|mancity,realmadrid,psv|adebayor,odegaard,zinchenko,ake,hazard,robben,yaya-toure,laudrup,kluivert",
  "bayern,mancity,juventus|marseille,barca,arsenal|ribery,lewandowski,gnabry,nasri,aguero,gabriel-jesus,rabiot,zambrotta,ramsey",
  "tottenham,realmadrid,acmilan|atletico,parma,corinthians|trippier,kulusevski,paulinho,courtois,cannavaro,ronaldo-nazario,morata,crespo,pato",
  "napoli,barca,sevilla|inter,realmadrid,psg|cannavaro,higuain,lavezzi,alexis-sanchez,figo,neymar,simeone,isco,dani-alves",
  "inter,juventus,realmadrid|psg,mancity,porto|djorkaeff,vieira,quaresma,matuidi,tevez,danilo,sergio-ramos,robinho,pepe",
  "arsenal,inter,chelsea|manutd,liverpool,acmilan|welbeck,oxlade,vieira,vidic,robbie-keane,seedorf,sancho,torres,desailly",
  "acmilan,westham,realmadrid|juventus,newcastle,corinthians|pirlo,kluivert,pato,tevez,carroll,mascherano,zidane,michael-owen,ronaldo-nazario",
  "chelsea,mancity,manutd|westham,realmadrid,psv|lampard,hazard,robben,bellamy,danilo,zinchenko,rio-ferdinand,ronaldo,depay",
  "realmadrid,bayern,barca|schalke,porto,atletico|huntelaar,pepe,morata,neuer,james-rodriguez,mandzukic,rakitic,deco,griezmann",
  "chelsea,acmilan,atletico|wolfsburg,inter,juventus|kdb,moses,deschamps,origi,baggio,pirlo,mandzukic,forlan,vieri",
  "lyon,inter,liverpool|psg,manutd,realmadrid|benarfa,depay,benzema,djorkaeff,ashley-young,cambiasso,wijnaldum,michael-owen,xabi-alonso",
  "mancity,tottenham,realmadrid|newcastle,arsenal,juventus|given,adebayor,danilo,townsend,gallas,kulusevski,michael-owen,ozil,khedira",
  "acmilan,realmadrid,manutd|benfica,juventus,riverplate|joao-felix,pirlo,crespo,di-maria,zidane,higuain,matic,vandersar,falcao",
  "ajax,napoli,fenerbahce|inter,realmadrid,manutd|seedorf,vandervaart,vandersar,cannavaro,higuain,lukaku,moses,roberto-carlos,fred",
  "inter,arsenal,juventus|bayern,leverkusen,manutd|podolski,vidal,vidic,gnabry,xhaka,vanpersie,de-ligt,emre-can,ronaldo",
  "arsenal,realmadrid,ajax|lagalaxy,tottenham,bayern|ashley-cole,campbell,gnabry,beckham,bale,kroos,ibrahimovic,vandervaart,de-ligt",
  "acmilan,barca,napoli|arsenal,chelsea,inter|vieira,shevchenko,baggio,henry,pedro,davids,jorginho,higuain,cannavaro",
  "dortmund,realmadrid,monaco|chelsea,manutd,mancity|pulisic,kagawa,gundogan,courtois,casemiro,robinho,fabregas,pogba,bernardo-silva",
  "liverpool,flamengo,porto|bayern,acmilan,realmadrid|mane,origi,xabi-alonso,vidal,ronaldinho,vinicius-jr,james-rodriguez,dalot,pepe",
  "westham,barca,crystalpalace|liverpool,manutd,tottenham|carroll,rio-ferdinand,defoe,coutinho,larsson,paulinho,benteke,zaha,townsend",
  "villarreal,chelsea,acmilan|inter,arsenal,barca|godin,pires,riquelme,moses,havertz,pedro,seedorf,vieira,rivaldo",
  "tottenham,mancity,arsenal|westham,astonvilla,liverpool|defoe,robbie-keane,crouch,bellamy,grealish,milner,rice,pires,oxlade",
  "chelsea,boca,westbrom|realmadrid,inter,mancity|hazard,moses,ake,w-samuel,batistuta,tevez,anelka,lukaku,gareth-barry",
  "monaco,arsenal,mancity|everton,realmadrid,barca|james-rodriguez,mbappe,marquez,walcott,odegaard,overmars,lescott,robinho,yaya-toure",
  "lazio,galatasaray,arsenal|bayern,realmadrid,barca|klose,laudrup,pedro,sane,sneijder,arda-turan,podolski,ozil,henry",
  "juventus,chelsea,tottenham|arsenal,parma,bordeaux|ramsey,buffon,zidane,cech,crespo,deschamps,gallas,kulusevski,pochettino",
  "tottenham,astonvilla,liverpool|barca,southampton,chelsea|paulinho,wanyama,werner,coutinho,ings,barkley,mascherano,vandijk,sterling",
  "mancity,inter,psg|acmilan,liverpool,tottenham|robinho,fowler,walker,vieri,robbie-keane,eriksen,ronaldinho,wijnaldum,pochettino",
  "bayern,acmilan,liverpool|psg,barca,psv|coman,lewandowski,robben,ronaldinho,rivaldo,kluivert,anelka,suarez,wijnaldum",
  "everton,psg,liverpool|arsenal,mancity,manutd|walcott,delph,fellaini,david-luiz,anelka,di-maria,oxlade,milner,michael-owen",
  "realmadrid,marseille,liverpool|psg,arsenal,manutd|sergio-ramos,odegaard,casemiro,benarfa,pires,barthez,wijnaldum,oxlade,michael-owen",
  "atletico,barca,acmilan|porto,tottenham,intermiami|falcao,trippier,suarez,deco,paulinho,messi,dalot,davids,higuain",
  "chelsea,mancity,barca|manutd,inter,realmadrid|sancho,eto,morata,tevez,vieira,danilo,larsson,figo,hagi",
  "barca,realmadrid,bayern|inter,schalke,psg|alexis-sanchez,rakitic,neymar,cambiasso,huntelaar,hakimi,podolski,neuer,coman",
  "mancity,chelsea,intermiami|psg,realmadrid,juventus|anelka,robinho,danilo,david-luiz,courtois,morata,messi,higuain,matuidi",
  "ajax,newcastle,chelsea|tottenham,psg,psv|vandervaart,ibrahimovic,kluivert,townsend,benarfa,wijnaldum,werner,david-luiz,robben",
  "realsociedad,leverkusen,acmilan|bayern,arsenal,barca|xabi-alonso,odegaard,griezmann,ballack,xhaka,vidal,laudrup-b,vieira,rivaldo",
  "newcastle,monaco,tottenham|barca,psg,mancity|kluivert,benarfa,given,marquez,mbappe,bernardo-silva,davids,pochettino,walker",
  "psg,everton,astonvilla|arsenal,inter,mancity|david-luiz,djorkaeff,anelka,walcott,eto,lescott,pires,ashley-young,grealish",
  "tottenham,westham,arsenal|astonvilla,inter,corinthians|crouch,eriksen,paulinho,ings,moses,mascherano,pires,mkhitaryan,willian",
  "psg,inter,chelsea|benfica,lagalaxy,barca|draxler,beckham,dembele-o,julio-cesar,robbie-keane,figo,joao-felix,ashley-cole,petit",
  "barca,manutd,marseille|inter,chelsea,galatasaray|figo,fabregas,arda-turan,forlan,sancho,mata,alexis-sanchez,deschamps,drogba",
  "realmadrid,inter,chelsea|corinthians,arsenal,psg|ronaldo-nazario,ozil,sergio-ramos,adriano,bergkamp,djorkaeff,pato,havertz,david-luiz",
  "realmadrid,acmilan,inter|mancity,roma,riverplate|danilo,w-samuel,saviola,robinho,cafu,higuain,vieira,batistuta,crespo",
  "realmadrid,inter,psg|barca,liverpool,benfica|hagi,xabi-alonso,di-maria,alexis-sanchez,robbie-keane,julio-cesar,neymar,wijnaldum,draxler",
  "ajax,mancity,inter|tottenham,psv,acmilan|vandervaart,kluivert,huntelaar,walker,zinchenko,robinho,eriksen,ronaldo-nazario,baggio",
  "realmadrid,juventus,psg|monaco,tottenham,benfica|james-rodriguez,modric,saviola,trezeguet,kulusevski,di-maria,mbappe,pochettino,draxler",
  "inter,juventus,barca|riverplate,ajax,sporting|crespo,sneijder,quaresma,higuain,vandersar,ronaldo,mascherano,frank-de-boer,figo",
  "psg,juventus,chelsea|intermiami,wolfsburg,tottenham|messi,draxler,pochettino,matuidi,mandzukic,kulusevski,higuain,kdb,werner",
  "chelsea,juventus,acmilan|psg,lagalaxy,realmadrid|david-luiz,ashley-cole,hazard,buffon,ibrahimovic,khedira,ronaldinho,beckham,kaka",
  "atletico,tottenham,psg|chelsea,ajax,monaco|diego-costa,suarez,falcao,gallas,vandervaart,adebayor,david-luiz,ibrahimovic,mbappe",
  "newcastle,psg,mancity|acmilan,liverpool,realmadrid|kluivert,carroll,michael-owen,ronaldinho,wijnaldum,hakimi,robinho,fowler,danilo",
  "sevilla,inter,manutd|juventus,mancity,atletico|dani-alves,nasri,simeone,vieri,vieira,godin,pogba,tevez,forlan",
  "manutd,barca,inter|psv,villarreal,ajax|depay,forlan,vandersar,kluivert,riquelme,de-jong,ronaldo-nazario,godin,seedorf",
  "lazio,manutd,chelsea|everton,atletico,inter|gascoigne,vieri,simeone,rooney,forlan,vidic,barkley,diego-costa,moses",
  "arsenal,ajax,inter|psg,acmilan,tottenham|david-luiz,vieira,campbell,ibrahimovic,huntelaar,vandervaart,djorkaeff,baggio,eriksen",
  "marseille,atletico,arsenal|barca,galatasaray,mancity|alexis-sanchez,drogba,nasri,griezmann,arda-turan,aguero,overmars,podolski,gabriel-jesus",
  "celtic,arsenal,juventus|barca,tottenham,westham|larsson,wanyama,robbie-keane,henry,campbell,ljungberg,thuram,kulusevski,tevez",
  "bayern,inter,arsenal|barca,westbrom,marseille|lewandowski,gnabry,ribery,davids,lukaku,alexis-sanchez,overmars,anelka,nasri",
  "manutd,realmadrid,ajax|psv,bayern,psg|depay,schweinsteiger,beckham,robben,alaba,sergio-ramos,kluivert,de-ligt,ibrahimovic",
  "lagalaxy,juventus,realmadrid|liverpool,psg,arsenal|gerrard,beckham,ashley-cole,emre-can,buffon,ramsey,xabi-alonso,hakimi,ozil",
  "galatasaray,juventus,psv|barca,realmadrid,inter|arda-turan,hagi,sneijder,zambrotta,khedira,baggio,depay,robben,ronaldo-nazario",
  "acmilan,bayern,mancity|wolfsburg,juventus,barca|origi,pirlo,rivaldo,mandzukic,coman,lewandowski,kdb,danilo,yaya-toure",
  "manutd,inter,acmilan|liverpool,ajax,benfica|michael-owen,vandersar,matic,robbie-keane,seedorf,julio-cesar,origi,huntelaar,joao-felix",
  "juventus,barca,chelsea|riverplate,dortmund,marseille|higuain,emre-can,rabiot,mascherano,dembele-o,alexis-sanchez,crespo,pulisic,deschamps",
  "juventus,chelsea,barca|atletico,porto,monaco|morata,danilo,trezeguet,diego-costa,falcao,petit,griezmann,deco,marquez",
  "westham,bayern,westbrom|astonvilla,chelsea,arsenal|ings,lampard,rice,coutinho,ballack,podolski,gareth-barry,lukaku,gnabry",
  "inter,bremen,everton|mancity,westbrom,realmadrid|vieira,lukaku,cambiasso,kdb,gnabry,ozil,delph,gareth-barry,james-rodriguez",
];

function axis(clubId: string): BingoAxis {
  return { id: clubId, label: clubLabel(clubId), shortLabel: clubCode(clubId) };
}

function build(row: string, index: number): BingoPuzzle {
  const [rowIds, columnIds, playerIds] = row.split("|");
  const rowAxes = rowIds.split(",").map(axis);
  const columnAxes = columnIds.split(",").map(axis);
  const players = playerIds.split(",");
  const ordinal = String(index + 1).padStart(3, "0");

  const cells: BingoCell[] = [];
  for (const [r, rowAxis] of rowAxes.entries()) {
    for (const [c, columnAxis] of columnAxes.entries()) {
      cells.push({
        id: `${index + 1}-${rowAxis.id}-${columnAxis.id}`,
        rowId: rowAxis.id,
        columnId: columnAxis.id,
        playerId: `bingo-${players[r * gridSize + c]}`,
      });
    }
  }

  return {
    id: `daily-career-v2-${ordinal}`,
    title: `Career Grid ${ordinal}`,
    rows: rowAxes,
    columns: columnAxes,
    cells,
  };
}

export const bingoPuzzles: readonly BingoPuzzle[] = rows.map(build);

const byId = new Map(bingoPuzzles.map((puzzle) => [puzzle.id, puzzle]));

/** The puzzle with this id, or the first one — the app's `orElse`. */
export function bingoPuzzleFor(id: string | null | undefined): BingoPuzzle {
  if (id === null || id === undefined) return bingoPuzzles[0];
  return byId.get(id) ?? bingoPuzzles[0];
}

/** The season wraps: day 201 reuses the authored order from the top. */
export function bingoPuzzleForDayIndex(index: number): BingoPuzzle {
  return bingoPuzzles[index % bingoPuzzles.length];
}

/** The cell at a row/column position. */
export function cellAt(puzzle: BingoPuzzle, row: number, column: number): BingoCell {
  const rowId = puzzle.rows[row].id;
  const columnId = puzzle.columns[column].id;
  const found = puzzle.cells.find(
    (cell) => cell.rowId === rowId && cell.columnId === columnId,
  );
  // Every authored grid is complete, so this is unreachable; the fallback keeps
  // the return type honest rather than asserting.
  return found ?? puzzle.cells[row * gridSize + column];
}
