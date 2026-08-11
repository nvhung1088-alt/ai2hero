fetch('http://localhost:3000/api/hero-dub/scan-configs', {
  headers: { 'Authorization': 'Bearer 123' } // Need a valid token. Oh wait, the local server is running at 3001? Or 3000?
}).then(r => r.json()).then(console.log);
