"use client";

/**
 * Genera un Blob PDF a partir d'un element HTML del DOM.
 * S'utilitza només al client (browser).
 */
export async function generateClientSidePDF(
  elementId: string,
  fileName: string
): Promise<Blob> {
  const element = document.getElementById(elementId);
  if (!element) throw new Error(`Element amb ID '${elementId}' no trobat.`);

  // Importem dinàmicament per no carregar la llibreria fins que calgui
  const { default: html2pdf } = await import("html2pdf.js");

  // ✅ CORRECCIÓ: Afegim 'as const' als valors de text específics.
  // Això diu a TypeScript: "Això no és un string qualsevol, és exactament 'jpeg' o 'portrait'".
  const opt = {
    margin: 10,
    filename: fileName,
    image: { 
        type: "jpeg" as const,   // 👈 Solució a l'error de tipus
        quality: 0.98 
    },
    html2canvas: { 
        scale: 2, 
        useCORS: true, 
        logging: false 
    },
    jsPDF: { 
        unit: "mm" as const,        // 👈 També ho blindem aquí per seguretat
        format: "a4" as const,      // 👈 I aquí
        orientation: "portrait" as const // 👈 I aquí (evita futurs errors)
    },
    pagebreak: { 
        mode: "css" as const, 
        before: ".page-break-before" 
    },
  };

  // html2pdf retorna una promesa que resol amb el PDF generat
  return await html2pdf().from(element).set(opt).output("blob");
}