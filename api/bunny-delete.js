import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { verifyAdminToken } from './_lib/verifyAdmin.js';

export const config = {
  api: { bodyParser: { sizeLimit: '10kb' } },
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

  const { kind, url } = req.body || {};
  if(!url){
    res.status(400).json({ error: 'Falta la URL del archivo a borrar.' });
    return;
  }

  try {
    if(kind === 'video'){
      const pullHost = process.env.BUNNY_STREAM_PULL_HOST;
      const match = url.match(new RegExp(`https://${pullHost.replace(/\./g, '\\.')}/([^/]+)/`));
      const videoId = match && match[1];
      if(!videoId){
        // No es un vídeo de Bunny Stream (p.ej. sigue en Cloudinary): nada que borrar aquí.
        res.status(200).json({ ok: true, skipped: true });
        return;
      }
      const delRes = await fetch(`https://video.bunnycdn.com/library/${process.env.BUNNY_STREAM_LIBRARY_ID}/videos/${videoId}`, {
        method: 'DELETE',
        headers: { AccessKey: process.env.BUNNY_STREAM_API_KEY },
      });
      if(!delRes.ok && delRes.status !== 404){
        throw new Error(`Bunny Stream respondió ${delRes.status}`);
      }
    } else {
      const pullHost = process.env.BUNNY_PULL_ZONE_HOST;
      const prefix = `https://${pullHost}/`;
      if(!url.startsWith(prefix)){
        // No es una foto de Bunny Storage (p.ej. sigue en Cloudinary): nada que borrar aquí.
        res.status(200).json({ ok: true, skipped: true });
        return;
      }
      const key = decodeURIComponent(url.slice(prefix.length));

      const region = process.env.BUNNY_S3_REGION;
      const s3 = new S3Client({
        region,
        endpoint: `https://${region}-s3.storage.bunnycdn.com`,
        forcePathStyle: true,
        credentials: {
          accessKeyId: process.env.BUNNY_S3_ACCESS_KEY,
          secretAccessKey: process.env.BUNNY_S3_SECRET_KEY,
        },
      });
      await s3.send(new DeleteObjectCommand({ Bucket: process.env.BUNNY_S3_BUCKET, Key: key }));
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Error borrando archivo en Bunny:', e);
    res.status(502).json({ error: 'No se pudo borrar el archivo en Bunny.' });
  }
}
