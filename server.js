const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
const leagues = {
  premier: 'soccer/eng.1', champions: 'soccer/uefa.champions',
  allsvenskan: 'soccer/swe.1', laliga: 'soccer/esp.1',
  seriea: 'soccer/ita.1', nba: 'basketball/nba'
};
app.use(express.static(__dirname));
app.get('/', (req,res) => res.sendFile(path.join(__dirname, 'index.html')));
async function json(url) {
  const response = await fetch(url, {headers:{Accept:'application/json','User-Agent':'Sport-IQ/1.0'},signal:AbortSignal.timeout(12000)});
  if (!response.ok) throw new Error(`Datakälla svarade ${response.status}`);
  return response.json();
}
function api(handler) { return async (req,res) => {try {res.json(await handler(req));} catch(e) {console.error(e.message);res.status(502).json({error:'Sportdata kunde inte hämtas just nu.',details:e.message});}}; }
const nhl = p => json(`https://api-web.nhle.com/v1/${p}`);
const espn = (league,p) => json(`https://site.api.espn.com/apis/site/v2/sports/${leagues[league]}/${p}`);
app.get('/api/nhl', api(()=>nhl('score/now')));
app.get('/api/nhl/standings', api(()=>nhl('standings/now')));
app.get('/api/nhl/team/:abbr/schedule', api(req=>{
  const abbr=req.params.abbr.toUpperCase();
  if(!/^[A-Z]{2,4}$/.test(abbr)) throw Error('Ogiltig lagkod');
  const now=new Date(), year=now.getUTCFullYear()-(now.getUTCMonth()<8?1:0);
  return nhl(`club-schedule-season/${abbr}/${year}${year+1}`);
}));
function checkLeague(req){const l=req.params.league;if(!leagues[l])throw Error('Okänd liga');return l;}
app.get('/api/league/:league/scoreboard',api(req=>espn(checkLeague(req),'scoreboard?limit=100')));
app.get('/api/league/:league/standings',api(req=>{
  const l=checkLeague(req);
  return json(`https://site.api.espn.com/apis/v2/sports/${leagues[l]}/standings`);
}));
app.get('/api/league/:league/team/:id/schedule',api(req=>{
  const l=checkLeague(req),id=req.params.id;
  if(!/^\d{1,12}$/.test(id))throw Error('Ogiltigt lag-ID');
  return espn(l,`teams/${id}/schedule?limit=100`);
}));
// Spelarstatistik för vald match: officiell NHL-boxscore eller ESPN-matchsammanfattning.
app.get('/api/nhl/game/:id/boxscore',api(req=>{
  if(!/^\d{1,12}$/.test(req.params.id))throw Error('Ogiltigt match-ID');
  return nhl(`gamecenter/${req.params.id}/boxscore`);
}));
app.get('/api/league/:league/event/:id/summary',api(req=>{
  const l=checkLeague(req);
  if(!/^\d{1,12}$/.test(req.params.id))throw Error('Ogiltigt match-ID');
  return espn(l,`summary?event=${req.params.id}`);
}));
app.listen(PORT,()=>console.log(`Sport-IQ körs på port ${PORT}`));
