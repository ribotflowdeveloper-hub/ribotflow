import CryptoJS from "crypto-js";
import "crypto-js/enc-base64";
import "crypto-js/enc-utf8";
import "crypto-js/aes";

const subtle = crypto.subtle; 

async function getKey(secret: string): Promise<CryptoKey> {
  const secretBuffer = new TextEncoder().encode(secret);
  const keyBuffer = await subtle.digest('SHA-256', secretBuffer);
  return subtle.importKey('raw', keyBuffer, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

/**
 * Converteix una cadena Base64 a un ArrayBuffer.
 */
function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function decrypt(
  encryptedData: string | null,
  secret: string,
): Promise<string> {
  if (!secret) {
    throw new Error("[CRYPTO] ENCRYPTION_SECRET no està definida.");
  }
  if (!encryptedData) {
    console.warn("[CRYPTO] La dada a desxifrar és nul·la.");
    return "";
  }

  // --- VIA 1: Nou format SubtleCrypto (Ràpid) ---
  if (encryptedData.includes(":")) {
    try {
      const parts = encryptedData.split(":");
      if (parts.length !== 2) {
        throw new Error("Format de dades SubtleCrypto invàlid.");
      }
      
      const [base64_iv, base64_ciphertext] = parts;
      const key = await getKey(secret);
      
      const iv = base64ToBuffer(base64_iv);
      const ciphertext = base64ToBuffer(base64_ciphertext);

      const decryptedBuffer = await subtle.decrypt(
        { name: 'AES-GCM', iv: iv }, 
        key,
        ciphertext,
      );

      return new TextDecoder().decode(decryptedBuffer);
    } catch (error) {
      console.error(`[CRYPTO-SUBTLE] Error desxifrant:`, error);
      throw new Error("No s'ha pogut desxifrar el token (SubtleCrypto). La clau pot ser incorrecta o la dada corrupta.");
    }
  }

  // --- VIA 2: Format antic CryptoJS (Lent) ---
  if (encryptedData.startsWith("U2FsdGVkX1")) {
    console.warn("[CRYPTO-JS] S'està desxifrant un token antic (format CryptoJS). Això és lent i pot causar timeouts de CPU.");
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, secret);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);

      if (!decrypted) {
        throw new Error("Dades desxifrades buides (CryptoJS). La clau pot ser incorrecta.");
      }
      return decrypted;
    } catch (error) {
      console.error(`[CRYPTO-JS] Error desxifrant:`, error);
      throw new Error("No s'ha pogut desxifrar el token (CryptoJS).");
    }
  }

  // --- VIA 3: Dada no encriptada ---
  console.log("[CRYPTO] La dada no sembla encriptada, es retorna tal qual.");
  return encryptedData;
}