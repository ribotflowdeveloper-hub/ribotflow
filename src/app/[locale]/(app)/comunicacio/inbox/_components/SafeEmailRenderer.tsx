// src/app/[locale]/(app)/comunicacio/inbox/_components/SafeEmailRenderer.tsx
"use client";

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface SafeEmailRendererProps {
    htmlBody: string;
}

// ====================================================================================
// CSS v4.0: MÀXIMA COMPATIBILITAT I FIDELITAT
// ====================================================================================
const compatibilityStyles = `
    /* --- 1. PREPARACIÓ DE L'ENTORN --- */
    :root {
        color-scheme: dark light;
    }
    body {
        background-color: transparent;
        color: hsl(var(--foreground));
        margin: 0;
        /* ✅ NOU: El padding es posa aquí, dins de l'iframe, no fora. */
        padding: 0; /* ✅ CANVI: El padding ara anirà al wrapper */
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
        /* ✅ NOU: Assegurem que paraules llargues (URLs, etc.) no trenquin el layout */
        word-wrap: break-word;
        overflow-wrap: break-word;
    }
    * {
        box-sizing: border-box;
    }

    /* --- 2. REGLES DE SEGURETAT ESTRUCTURAL (NO NEGOCIABLE) --- */
    img, video, iframe, embed, object {
        max-width: 100% !important;
        height: auto !important;
        width: auto; /* Permet que s'encongeixi si cal */
    }

    table {
        /* ✅ MILLORAT: Forcem un layout que respecti l'amplada màxima */
        table-layout: fixed;
        width: 100% !important; /* Molts correus antics no ho fan bé */
        max-width: 100% !important;
    }
    
    td, th {
       /* ✅ NOU: Permet que el text dins les cel·les es trenqui correctament */
       word-break: break-word;
    }

    /* --- 3. SOLUCIÓ AL PROBLEMA DEL TEXT FOSC SOBRE FONS FOSC (MANTINGUT) --- */
    [style*="color:#000"]:not([style*="background"]),
    [style*="color:black"]:not([style*="background"]),
    [style*="color:#000000"]:not([style*="background"]) {
        color: hsl(var(--foreground)) !important;
    }

    /* --- 4. MILLORES DE VISUALITZACIÓ --- */
    a {
        /* ✅ NOU: Donem un color als enllaços per defecte, si el correu no ho fa */
        color: hsl(var(--primary));
    }
           /* ✅ NOU: El wrapper que actua com a llenç per al correu */
    #email-wrapper {
        background-color: #ffffff; /* Fons blanc garantit */
        color: #000000; /* Color de text per defecte negre */
        padding: 1.5rem; /* El padding que abans teníem al body */
    }
`;

export const SafeEmailRenderer: React.FC<SafeEmailRendererProps> = ({ htmlBody }) => {
    const t = useTranslations('InboxPage');
    const iframeRef = useRef<HTMLIFrameElement>(null);
    // ✅ MILLORAT: Comencem amb '100%' per evitar salts visuals mentre es calcula l'alçada real
    const [iframeHeight, setIframeHeight] = useState<string | number>('100%');

    const documentSource = useMemo(() => {
        return `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>${compatibilityStyles}</style>
                </head>
                <body>
                    <div id="email-wrapper">
                        ${htmlBody}
                    </div>
                    <script>
                        document.addEventListener('DOMContentLoaded', () => {
                            const body = document.body;
                            const html = document.documentElement;
                            const sendHeight = () => {
                                // Utilitzem el màxim de diverses propietats per ser més robustos
                                const height = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight);
                                window.parent.postMessage({ type: 'iframeResize', height: height }, '*');
                            };
                            
                         // ✅ LÒGICA DEBOUNCE:
                            // Aquesta funció embolcalla 'sendHeight' i s'assegura que no es cridi
                            // massa ràpidament, esperant 150ms d'inactivitat.
                            const debouncedSendHeight = () => {
                                clearTimeout(debounceTimeout);
                                debounceTimeout = setTimeout(sendHeight, 150);
                            };


                            // Observem canvis en el cos (imatges que es carreguen, contingut dinàmic)
                            const resizeObserver = new ResizeObserver(sendHeight);
                            resizeObserver.observe(body);

                            // Un últim intent quan tots els recursos (imatges) s'han carregat
                            window.addEventListener('load', sendHeight);
                        });
                    </script>
                </body>
            </html>
        `;
    }, [htmlBody]);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (
                iframeRef.current &&
                event.source === iframeRef.current.contentWindow &&
                event.data.type === 'iframeResize' &&
                event.data.height > 0
            ) {
                // Li donem un píxel extra per evitar problemes d'arrodoniment
                setIframeHeight(event.data.height + 1);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // ✅ SOLUCIÓ: Retornem directament l'iframe, sense la 'div' que el limitava.
    return (
        <iframe
            ref={iframeRef}
            srcDoc={documentSource}
            title={t('emailContentTitle')}
            sandbox="allow-scripts"
            width="100%"
            height={iframeHeight}
            style={{
                border: 'none',
                display: 'block',
                background: 'transparent',
                // ✅ Afegim un alçada mínima per evitar que es col·lapsi a 0px mentre carrega
                minHeight: '200px'
            }}
            scrolling="no"
        />
    );
};