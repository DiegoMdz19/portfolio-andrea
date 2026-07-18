import crypto from 'node:crypto';
import { verifyAdminToken } from './_lib/verifyAdmin.js';

export const config = {
  api: { bodyParser: { sizeLimit: '1mb' } }, // solo metadatos, nunca el vídeo en sí
};

export default async function handler(req, res){
  if(req.method !== 'POST'){
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    await verifyAdminToken(req.headers.authorization);
  } catch (e) {
    res.status(e.status || 401).json({ error: e.message });
    return;
  }

  const { title } = req.body || {};
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
  const apiKey    = process.env.BUNNY_STREAM_API_KEY;

  // 1. Crear el objeto de vídeo en Bunny Stream (llamada servidor-a-servidor, sin archivo).
  let videoId;
  try {
    const createRes = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos`, {
      method: 'POST',
      headers: { AccessKey: apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title || `Vídeo ${Date.now()}` }),
    });
    if(!createRes.ok) throw new Error(`Bunny Stream respondió ${createRes.status}`);
    const data = await createRes.json();
    videoId = data.guid;
  } catch (e) {
    console.error('Error creando vídeo en Bunny Stream:', e);
    res.status(502).json({ error: 'No se pudo iniciar la subida del vídeo.' });
    return;
  }

  // 2. Firma de subida TUS: el navegador sube el archivo directamente a Bunny con esta
  //    firma temporal, sin que la API key real pase nunca por el cliente.
  const expirationTime = Math.floor(Date.now() / 1000) + 3600; // 1 hora para completar la subida
  const authorizationSignature = crypto
    .createHash('sha256')
    .update(`${libraryId}${apiKey}${expirationTime}${videoId}`)
    .digest('hex');

  const pullHost = process.env.BUNNY_STREAM_PULL_HOST;

  res.status(200).json({
    videoId,
    libraryId,
    authorizationSignature,
    expirationTime,
    tusEndpoint: 'https://video.bunnycdn.com/tusupload',
    playbackUrl: `https://${pullHost}/${videoId}/play_720p.mp4`,
    thumbnailUrl: `https://${pullHost}/${videoId}/thumbnail.jpg`,
  });
}
