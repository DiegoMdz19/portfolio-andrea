import { createRemoteJWKSet, jwtVerify } from 'jose';

const PROJECT_ID = 'andrea-portfolio-a0817';
const ADMIN_EMAIL = 'admin@andrealopezfoto.es';

const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

/**
 * Verifica el ID token de Firebase Auth enviado por el cliente y confirma
 * que pertenece a la cuenta admin real. Se usa en cada endpoint de /api
 * que toca credenciales de Bunny, para que no queden abiertos a cualquiera.
 *
 * Uso: const email = await verifyAdminToken(request.headers.get('authorization'));
 * Lanza un Error con `.status` si el token falta, es inválido o no es admin.
 */
export async function verifyAdminToken(authorizationHeader){
  const token = (authorizationHeader || '').replace(/^Bearer\s+/i, '');
  if(!token){
    const err = new Error('Falta el token de autenticación.');
    err.status = 401;
    throw err;
  }

  let payload;
  try {
    ({ payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID,
    }));
  } catch (e) {
    const err = new Error('Token inválido o caducado.');
    err.status = 401;
    throw err;
  }

  if(payload.email !== ADMIN_EMAIL){
    const err = new Error('No autorizado.');
    err.status = 403;
    throw err;
  }

  return payload.email;
}
