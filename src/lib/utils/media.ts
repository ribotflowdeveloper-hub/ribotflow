// Ubicació: /lib/utils/media.ts (fitxer nou)

/**
 * Genera una miniatura (thumbnail) a partir del primer fotograma d'un fitxer de vídeo.
 * @param file El fitxer de vídeo.
 * @returns Una promesa que resol a un Data URL (string) de la imatge generada.
 */
export const generateVideoThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) {
            return reject(new Error('No es pot obtenir el context del canvas.'));
        }

        // Carreguem el vídeo en memòria
        video.src = URL.createObjectURL(file);
        video.muted = true;

        // Quan el vídeo ha carregat les seves metadades (dimensions, durada)...
        video.onloadedmetadata = () => {
            video.currentTime = 1; // Anem al segon 1 per evitar fotogrames negres
        };

        // Quan el fotograma actual ja es pot renderitzar...
        video.onseeked = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            
            // Netegem l'objecte URL per alliberar memòria
            URL.revokeObjectURL(video.src);
            
            // Retornem la imatge del canvas com a Data URL
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };

        video.onerror = () => {
            reject(new Error('Error en carregar el vídeo.'));
        };
    });
};