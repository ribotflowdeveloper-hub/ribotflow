// src/lib/utils/crypto.ts
// Aquest arxiu s'executa a l'entorn de Next.js (Node.js)
import { webcrypto } from "crypto";

// ✅ CORRECCIÓ: Importem el que falta per a la 'Via 2' (desxifratge antic)
import AES from 'crypto-js/aes';
import Utf8 from 'crypto-js/enc-utf8';

const subtle = webcrypto.subtle;

// --- Funcions Híbrides ---

async function getKey(secret: string): Promise<CryptoKey> {
  const secretBuffer = new TextEncoder().encode(secret);
  const keyBuffer = await subtle.digest("SHA-256", secretBuffer);
  return subtle.importKey("raw", keyBuffer, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

// ✅ CORRECCIÓ: Funció optimitzada per a Node.js (Buffer -> Base64)
function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  // Assegurem que sempre passem un Uint8Array a Buffer.from
  const uint8Buffer = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Buffer.from(uint8Buffer).toString('base64');
}

// ✅ CORRECCIÓ: Funció optimitzada per a Node.js (Base64 -> ArrayBuffer)
function base64ToBuffer(base64: string): ArrayBuffer {
  const buf = Buffer.from(base64, 'base64');
  // Retornem una còpia com a ArrayBuffer pur per evitar problemes de tipus amb 'subtle'
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

/**
 * Xifra text pla utilitzant AES-GCM (SubtleCrypto, el mètode ràpid).
 * Retorna el format 'iv:ciphertext' en Base64.
 */
export async function encryptToken(
  plaintext: string,
  secret: string,
): Promise<string> {
  if (!plaintext) return plaintext;
  if (!secret) throw new Error("ENCRYPTION_SECRET_KEY no proporcionada."); 
  
  try {
    const key = await getKey(secret);
    const iv = webcrypto.getRandomValues(new Uint8Array(12));
    const encodedPlaintext = new TextEncoder().encode(plaintext);

    const ciphertext = await subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      encodedPlaintext,
    );

    // ✅ CORRECCIÓ: Aquesta funció ara accepta Uint8Array
    const base64_iv = bufferToBase64(iv); 
    const base64_ciphertext = bufferToBase64(ciphertext);

    return `${base64_iv}:${base64_ciphertext}`;
  } catch (error) {
    console.error("Error encriptant amb SubtleCrypto:", error);
    throw new Error("No s'ha pogut xifrar el token.");
  }
}

/**
 * Desxifra dades que poden estar en format SubtleCrypto (iv:cipher)
 * o en format antic CryptoJS (U2Fsd...).
 */
export async function decryptToken(
  encryptedData: string | null,
  secret: string,
): Promise<string> {
  if (!secret) {
    throw new Error("[CRYPTO] ENCRYPTION_SECRET_KEY no està definida.");
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
      console.error(`[CRYPTO-SUBTLE] Error desxifrant:`, (error as Error).message);
      throw new Error("No s'ha pogut desxifrar el token (SubtleCrypto). La clau pot ser incorrecta o la dada corrupta.");
    }
  }

  // --- VIA 2: Format antic CryptoJS (Lent) ---
  if (encryptedData.startsWith("U2FsdGVkX1")) {
    console.warn("[CRYPTO-JS] S'està desxifrant un token antic (format CryptoJS).");
    try {
      // ✅ CORRECCIÓ: Ara 'AES' i 'Utf8' estan importats
      const bytes = AES.decrypt(encryptedData, secret);
      const decrypted = bytes.toString(Utf8);

      if (!decrypted) {
        throw new Error("Dades desxifrades buides (CryptoJS). La clau pot ser incorrecta.");
      }
      return decrypted;
    } catch (error) {
      console.error(`[CRYPTO-JS] Error desxifrant:`, (error as Error).message);
      throw new Error("No s'ha pogut desxifrar el token (CryptoJS).");
    }
  }

  // --- VIA 3: Dada no encriptada ---
  console.log("[CRYPTO] La dada no sembla encriptada, es retorna tal qual.");
  return encryptedData;
}