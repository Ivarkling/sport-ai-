const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.static(__dirname));
async function nhl(path) {
  const response = await fetch(`https://api-web.nhle.com/v1/${path}`, {headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)});
  if (!response.ok) throw new Error(`NHL API: ${response.status}`);
  return response.json();
}
app.get('/api/nhl', async (req,res)=>{
  try {res.json(await nhl('score/now'));}
  catch(e){console.error(e);res.status(502).json({error:'NHL:s matchdata kunde inte hämtas.'});}
});
app.get('/api/nhl/standings', async (req,res)=>{
  try {res.json(await nhl('standings/now'));}
  catch(e){console.error(e);res.status(502).json({error:'NHL:s tabell kunde inte hämtas.'});}
});
app.listen(PORT,()=>console.log(`Sport-IQ körs på port ${PORT}`));
