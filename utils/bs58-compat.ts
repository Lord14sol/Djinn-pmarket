/**
 * 🔧 BS58 Compatibility Layer
 * Soluciona problemas de importación con bs58 v6.0.0
 */

let bs58Instance: any = null;

/**
 * Obtiene la instancia correcta de bs58
 * Compatible con v5.x y v6.x
 */
export function getBS58() {
    if (bs58Instance) return bs58Instance;

    try {
        // Intentar importar bs58
        // En Next.js / Webpack, a veces necesitamos usar require para evitar problemas de hoisting/ESM
        const bs58Module = require('bs58');

        // v6.0.0 puede exportar como { default: ... } o directamente
        const bs58 = bs58Module.default || bs58Module;

        // Validar que tenga las funciones necesarias
        if (!bs58.encode || !bs58.decode) {
            // Intento final por si acaso es un objeto anidado
            if (bs58.default && (bs58.default.encode || bs58.default.decode)) {
                bs58Instance = bs58.default;
                return bs58Instance;
            }
            throw new Error('BS58 module missing encode/decode functions');
        }

        bs58Instance = bs58;
        return bs58Instance;
    } catch (error) {
        console.error('❌ Error cargando bs58:', error);
        throw new Error('Failed to load bs58 library');
    }
}

/**
 * 🔐 Encode a Uint8Array to base58 string
 */
export function encodeBS58(buffer: Uint8Array | number[]): string {
    try {
        const bs58 = getBS58();
        return bs58.encode(buffer);
    } catch (error) {
        console.error('❌ Error encoding BS58:', error);
        throw error;
    }
}

/**
 * 🔓 Decode a base58 string to Uint8Array
 */
export function decodeBS58(str: string): Uint8Array {
    try {
        const bs58 = getBS58();
        return bs58.decode(str);
    } catch (error) {
        console.error('❌ Error decoding BS58:', error);
        throw error;
    }
}

/**
 * ✅ Verificar si bs58 está disponible
 */
export function isBS58Available(): boolean {
    try {
        getBS58();
        return true;
    } catch {
        return false;
    }
}
