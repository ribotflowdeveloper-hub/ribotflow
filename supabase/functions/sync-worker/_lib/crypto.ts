import CryptoJS from "https://deno.land/x/cryptojs@v3.1.2/main.ts";
// Importem els 'encodings' necessaris
import "https://deno.land/x/cryptojs@v3.1.2/enc-base64.ts";
import "https://deno.land/x/cryptojs@v3.1.2/enc-utf8.ts";
import "https://deno.land/x/cryptojs@v3.1.2/aes.ts";

/**
 * Desxifra dades encriptades amb CryptoJS.AES.encrypt
 * @param encryptedData La cadena que comença amb U2FsdGVkX1...
 * @param secret La clau secreta
 * @returns La cadena de text desxifrada
 */
export function decrypt(encryptedData: string, secret: string): string {
  if (!secret) {
    throw new Error("[CRYPTO] ENCRYPTION_SECRET no està definida.");
  }
  
  // Si la dada no sembla encriptada (o és buida), la retornem tal qual.
  // Això dona suport a tokens antics que podrien no estar encriptats.
  if (!encryptedData || !encryptedData.startsWith("U2FsdGVkX1")) {
    console.log("[CRYPTO] La dada no sembla encriptada, es retorna tal qual.");
    return encryptedData;
  }

  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, secret);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);

    if (!decrypted) {
      throw new Error("Dades desxifrades buides. La clau pot ser incorrecta.");
    }
    
    return decrypted;
  } catch (error) {
    console.error(`[CRYPTO] Error en desxifrar: ${(error as Error).message}`);
    // No llancem el token en el missatge d'error per seguretat
    throw new Error("No s'ha pogut desxifrar el token. Verifica la ENCRYPTION_SECRET.");
  }
}