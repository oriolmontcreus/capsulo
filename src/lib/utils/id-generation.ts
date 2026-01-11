/**
 * Generate a unique ID with defensive fallbacks for non-secure contexts.
 * 
 * Uses crypto.randomUUID() when available (modern browsers and secure contexts),
 * falls back to Date.now() + crypto.getRandomValues() for cryptographic strength,
 * and finally uses Date.now() + Math.random() if crypto APIs are unavailable.
 * 
 * @param prefix - Optional prefix for the generated ID
 * @returns A unique identifier string
 */
export function generateId(prefix?: string): string {
    let id: string;
    
    // Prefer crypto.randomUUID() if available (modern browsers and Node.js 16.7.0+)
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        id = crypto.randomUUID();
    } else {
        // Fallback: use Date.now() + cryptographically strong random component
        const timestamp = Date.now();
        if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
            const randomBytes = new Uint8Array(8);
            crypto.getRandomValues(randomBytes);
            const hexString = Array.from(randomBytes)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
            id = `${timestamp}_${hexString}`;
        } else {
            // Final fallback: use Math.random() if crypto.getRandomValues is unavailable
            let hexString = '';
            for (let i = 0; i < 16; i++) {
                const randomByte = Math.floor(Math.random() * 256);
                hexString += randomByte.toString(16).padStart(2, '0');
            }
            id = `${timestamp}_${hexString}`;
        }
    }
    
    return prefix ? `${prefix}${id}` : id;
}

/**
 * Generate a unique ID for repeater items.
 * Convenience wrapper around generateId() with 'item_' prefix.
 */
export function generateItemId(): string {
    return generateId('item_');
}
