async function test() {
  const apiKey = '6b8280942f8d4a749cc0545681a03ce2';
  const shopId = '860217017';

  const res = await fetch(`https://pos.pages.fm/api/v1/shops/${shopId}/orders?api_key=${apiKey}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    }
  });

  const json = await res.json();
  console.log("=== PANCAKE NATIVE JSON ===");
  console.log(JSON.stringify(json).substring(0, 1000));
}

test().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
