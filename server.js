const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

const LEAGUES = Object.freeze({
  premier: {sport:'soccer', code:'eng.1', label:'Premier League'},
  champions: {sport:'soccer', code:'uefa.champions', label:'Champions League'},
  allsvenskan: {sport:'soccer', code:'swe.1', label:'Allsvenskan'},
  laliga: {sport:'soccer', code:'esp.1', label:'La Liga'},
  seriea: {sport:'soccer', code:'ita.1', label:'Serie A'},
  nba: {sport:'basketball', code:'nba', label:'NBA'}
});
const BASE = 'https://site.api.espn.com/apis/site/v2/sports';
const CORE = 'https://site.api.espn.com/apis/v2/sports';

async function getJSON(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {signal:controller.signal, headers:{'Accept':'application/json','User-Agent':'SPORT-AI/1.0'}});
    if (!response.ok) throw new Error(`Datakällan svarade med HTTP ${response.status}`);
    return await response.json();
  } finally { clearTimeout(timeout); }
}
function route(fn) {
  return async (req,res) => {
    try { res.set('Cache-Control','public, max-age=45'); res.json(await fn(req)); }
    catch(err) { console.error(req.path,err.message); res.status(502).json({error:'Kunde inte hämta data från sportkällan',details:err.message}); }
  };
}
function league(req) {
  const found=LEAGUES[req.params.league];
  if (!found) { const e=new Error('Okänd liga'); e.status=400; throw e; }
  return found;
}
app.get('/api/leagues', (_req,res)=>res.json(LEAGUES));
app.get('/api/league/:league/scoreboard', route(req => {
  const l=league(req);
  const date=/^\d{8}$/.test(req.query.date||'') ? `?dates=${req.query.date}` : '';
  return getJSON(`${BASE}/${l.sport}/${l.code}/scoreboard${date}`);
}));
app.get('/api/league/:league/standings', route(req => {
  const l=league(req);
  return getJSON(`${CORE}/${l.sport}/${l.code}/standings`);
}));
app.get('/api/league/:league/team/:team/schedule', route(req => {
  const l=league(req);
  if(!/^\d{1,12}$/.test(req.params.team)) throw new Error('Ogiltigt lag-ID');
  return getJSON(`${BASE}/${l.sport}/${l.code}/teams/${req.params.team}/schedule`);
}));
app.get('/api/nhl', route(() => {
  const date=new Date().toLocaleDateString('sv-SE',{timeZone:'America/New_York'});
  return getJSON(`https://api-web.nhle.com/v1/score/${date}`);
}));
app.get('/api/nhl/team/:team/schedule', route(req => {
  const team = req.params.team.toUpperCase();
  if (!/^[A-Z]{3}$/.test(team)) throw new Error('Ogiltig NHL-lagkod');
  const now = new Date();
  const y = now.getUTCFullYear();
  const start = now.getUTCMonth() >= 8 ? y : y - 1;
  return getJSON(`https://api-web.nhle.com/v1/club-schedule-season/${team}/${start}${start+1}`);
}));
app.get('/api/nhl/standings', route(() => getJSON('https://api-web.nhle.com/v1/standings/now')));
// Behåll gamla API-adresser så tidigare versioner fortsätter fungera.
app.get('/api/nba', route(() => getJSON(`${BASE}/basketball/nba/scoreboard`)));
app.get('/api/fotboll', route(() => getJSON(`${BASE}/soccer/eng.1/scoreboard`)));
app.use(express.static(__dirname));
app.listen(PORT,()=>console.log(`SPORT AI fungerar på http://localhost:${PORT}/sport-ai-ny.html`));
