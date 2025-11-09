// Detect image brightness to choose contrasting background
export const detectImageBrightness = (imgElement: HTMLImageElement): Promise<'black' | 'white'> => {
    return new Promise((resolve) => {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                resolve('black'); // Default
                return;
            }

            // Use smaller canvas for performance
            const maxSize = 100;
            const scale = Math.min(maxSize / imgElement.naturalWidth, maxSize / imgElement.naturalHeight, 1);
            canvas.width = imgElement.naturalWidth * scale;
            canvas.height = imgElement.naturalHeight * scale;

            ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);

            // Sample pixels from edges (where background contrast matters most)
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            let totalBrightness = 0;
            let sampleCount = 0;

            // Sample every 10th pixel for performance
            for (let i = 0; i < data.length; i += 40) { // 40 = 10 pixels * 4 (RGBA)
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const a = data[i + 3];

                // Skip transparent pixels
                if (a < 128) continue;

                // Calculate brightness using standard luminance formula
                const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                totalBrightness += brightness;
                sampleCount++;
            }

            if (sampleCount === 0) {
                resolve('black'); // Default if no samples
                return;
            }

            const avgBrightness = totalBrightness / sampleCount;

            // If image is dark, use white background for contrast
            resolve(avgBrightness < 128 ? 'white' : 'black');
        } catch (error) {
            // If detection fails (CORS, etc.), default to black
            resolve('black');
        }
    });
};

// Detect if SVG has dark colors and should use white background
export const detectSvgBrightness = (svgContent: string): 'black' | 'white' => {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgContent, 'image/svg+xml');

        // Check for parsing errors
        const parserError = doc.querySelector('parsererror');
        if (parserError) {
            return 'white'; // Default to white on error
        }

        const svg = doc.documentElement;

        // Helper to convert color to brightness (0-255)
        const getBrightness = (color: string): number => {
            // Handle hex colors
            if (color.startsWith('#')) {
                const hex = color.slice(1);
                const r = parseInt(hex.slice(0, 2), 16);
                const g = parseInt(hex.slice(2, 4), 16);
                const b = parseInt(hex.slice(4, 6), 16);
                return (r * 299 + g * 587 + b * 114) / 1000;
            }

            // Handle rgb/rgba
            const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (rgbMatch) {
                const r = parseInt(rgbMatch[1]);
                const g = parseInt(rgbMatch[2]);
                const b = parseInt(rgbMatch[3]);
                return (r * 299 + g * 587 + b * 114) / 1000;
            }

            // Handle named colors (common ones)
            const namedColors: Record<string, number> = {
                'black': 0, 'white': 255, 'red': 76, 'green': 150, 'blue': 29,
                'gray': 128, 'grey': 128, 'darkgray': 85, 'darkgrey': 85,
                'lightgray': 170, 'lightgrey': 170, 'silver': 192
            };

            return namedColors[color.toLowerCase()] ?? 128; // Default to mid-brightness
        };

        // Collect all fill and stroke colors
        const colors: number[] = [];

        // Check all elements with fill or stroke
        const elements = svg.querySelectorAll('*');
        elements.forEach(el => {
            const fill = el.getAttribute('fill');
            const stroke = el.getAttribute('stroke');

            if (fill && fill !== 'none') {
                colors.push(getBrightness(fill));
            }
            if (stroke && stroke !== 'none') {
                colors.push(getBrightness(stroke));
            }
        });

        // Check inline styles
        const styleElements = svg.querySelectorAll('[style]');
        styleElements.forEach(el => {
            const style = el.getAttribute('style') || '';
            const fillMatch = style.match(/fill:\s*([^;]+)/);
            const strokeMatch = style.match(/stroke:\s*([^;]+)/);

            if (fillMatch && fillMatch[1] !== 'none') {
                colors.push(getBrightness(fillMatch[1].trim()));
            }
            if (strokeMatch && strokeMatch[1] !== 'none') {
                colors.push(getBrightness(strokeMatch[1].trim()));
            }
        });

        // If no colors found, default to white background
        if (colors.length === 0) {
            return 'white';
        }

        // Calculate average brightness
        const avgBrightness = colors.reduce((sum, b) => sum + b, 0) / colors.length;

        // If average brightness is low (dark colors), use white background
        // Threshold at 128 (mid-point)
        return avgBrightness < 128 ? 'white' : 'black';

    } catch (error) {
        // Default to white on any error
        return 'white';
    }
};
