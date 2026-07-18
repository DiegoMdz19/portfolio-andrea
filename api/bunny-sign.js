import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { verifyAdminToken } from './_lib/verifyAdmin.js';

export const config = {
  api: { bodyParser: { sizeLimit: '1mb' } }, // solo metadatos (nombre/tipo), nunca el archivo en sí
};

function sanitizeFilename(name){
  return String(name || 'archivo')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(-120);
}

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

  const { filename, contentType, kind } = req.body || {};
  if(!filename){
    res.status(400).json({ error: 'Falta el nombre de archivo.' });
    return;
  }

  const region = process.env.BUNNY_S3_REGION;
  const bucket = process.env.BUNNY_S3_BUCKET;
  const endpoint = `https://${region}-s3.storage.bunnycdn.com`;

  const s3 = new S3Client({
    region,
    endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.BUNNY_S3_ACCESS_KEY,
      secretAccessKey: process.env.BUNNY_S3_SECRET_KEY,
    },
  });

  const folder = kind === 'video' ? 'videos' : 'andrea-portfolio';
  const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${sanitizeFilename(filename)}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType || 'application/octet-stream',
  });

  try {
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 600 }); // 10 min para subir
    const publicUrl = `https://${process.env.BUNNY_PULL_ZONE_HOST}/${key}`;
    res.status(200).json({ uploadUrl, publicUrl });
  } catch (e) {
    console.error('Error firmando subida a Bunny:', e);
    res.status(502).json({ error: 'No se pudo generar la URL de subida.' });
  }
}
