const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  // OPTIONS preflight
  if(event.httpMethod === 'OPTIONS'){
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const store = getStore('andrea-config');

    // GET — leer config
    if(event.httpMethod === 'GET'){
      const config = await store.get('site-config', { type: 'json' });
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(config || {}),
      };
    }

    // POST — guardar config
    if(event.httpMethod === 'POST'){
      const body = JSON.parse(event.body || '{}');
      await store.setJSON('site-config', body);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: true }),
      };
    }

    return { statusCode: 405, headers, body: 'Method not allowed' };

  } catch(e) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: e.message }),
    };
  }
};