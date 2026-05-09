/**
 * Palette Lab - Color Generator Logic
 */

const UI = {
    colorCards: document.querySelectorAll('.color-card'),
    generateBtn: document.getElementById('generate-btn'),
    baseColorPicker: document.getElementById('base-color-picker'),
    baseColorText: document.getElementById('base-color-text'),
    harmonySelect: document.getElementById('harmony-select'),
    currentHarmonyText: document.getElementById('current-harmony'),
};

const ColorUtils = {
    // Converts HEX to RGB object {r, g, b}
    hexToRgb: (hex) => {
        hex = hex.replace(/^#/, '');
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        return {
            r: parseInt(hex.substring(0, 2), 16),
            g: parseInt(hex.substring(2, 4), 16),
            b: parseInt(hex.substring(4, 6), 16)
        };
    },

    // Converts RGB components back to HEX string
    rgbToHex: (r, g, b) => {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    },

    // Extracts Hue, Saturation, Lightness from HEX
    hexToHsl: (hex) => {
        let { r, g, b } = ColorUtils.hexToRgb(hex);
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return { h: h * 360, s: s * 100, l: l * 100 };
    },

    // Converts Hue, Saturation, Lightness back to HEX
    hslToHex: (h, s, l) => {
        s /= 100; l /= 100;
        const k = n => (n + h / 30) % 12;
        const a = s * Math.min(l, 1 - l);
        const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
        return ColorUtils.rgbToHex(Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4)));
    },

    // Adjusts HSL values ensuring they stay within valid visual ranges
    shiftHsl: (h, s, l, hShift, lShift = 0) => {
        let newH = (h + hShift) % 360;
        if (newH < 0) newH += 360;
        let newL = Math.max(5, Math.min(95, l + lShift)); // clamp lightness 5-95
        return ColorUtils.hslToHex(newH, s, newL);
    },

    // Calculates relative brightness for WCAG checking
    getLuminance: (r, g, b) => {
        const [aR, aG, aB] = [r, g, b].map(v => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return aR * 0.2126 + aG * 0.7152 + aB * 0.0722;
    },

    // Determines highly readable text color based on WCAG math
    getContrastInfo: (hex) => {
        const { r, g, b } = ColorUtils.hexToRgb(hex);
        const lum = ColorUtils.getLuminance(r, g, b);
        const lumWhite = ColorUtils.getLuminance(255, 255, 255);
        const lumBlack = ColorUtils.getLuminance(17, 17, 17); // Soft black #111111 

        const contrastWhite = (Math.max(lum, lumWhite) + 0.05) / (Math.min(lum, lumWhite) + 0.05);
        const contrastBlack = (Math.max(lum, lumBlack) + 0.05) / (Math.min(lum, lumBlack) + 0.05);

        return {
            readableText: contrastWhite > contrastBlack ? '#FFFFFF' : '#111111',
            passAA: contrastWhite >= 4.5
        };
    },

    // Generates a random valid hex color string
    generateRandomHex: () => {
        return "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0').toUpperCase();
    }
};

const Harmonies = {
    // Each property maps to an array of objects describing the HSL shifts to derive from a base color
    // Defines shifts needed for [Color 1, Color 2, Base Color, Color 4, Color 5]
    analogous: [
        { h: -60, l: 0 }, { h: -30, l: 0 }, { h: 0, l: 0 }, { h: 30, l: 0 }, { h: 60, l: 0 }
    ],
    monochromatic: [
        { h: 0, l: -30 }, { h: 0, l: -15 }, { h: 0, l: 0 }, { h: 0, l: 15 }, { h: 0, l: 30 }
    ],
    triadic: [
        { h: 0, l: 20 }, { h: 120, l: 0 }, { h: 0, l: 0 }, { h: 240, l: 0 }, { h: 0, l: -20 }
    ],
    complementary: [
        { h: 0, l: 30 }, { h: 180, l: 15 }, { h: 0, l: 0 }, { h: 180, l: 0 }, { h: 0, l: -30 }
    ],
    'split-complementary': [
        { h: 0, l: 20 }, { h: 150, l: 0 }, { h: 0, l: 0 }, { h: 210, l: 0 }, { h: 0, l: -20 }
    ],

    // Core engine: takes the baseHex and maps through shift values
    generate: (baseHex, harmonyName) => {
        const { h, s, l } = ColorUtils.hexToHsl(baseHex);
        const shifts = Harmonies[harmonyName] || Harmonies.analogous;
        return shifts.map(shift => ColorUtils.shiftHsl(h, s, l, shift.h, shift.l));
    }
};

/**
 * Encapsulated update loop for a single color card element
 */
function renderCard(card, hex) {
    if (!card) return;

    const display = card.querySelector('.color-display');
    const hexText = card.querySelector('.color-hex');
    const copyBtn = card.querySelector('.copy-button');
    const badge = card.querySelector('.accessibility-badge');
    const { readableText, passAA } = ColorUtils.getContrastInfo(hex);

    // Apply color and layout directly to top color block block
    Object.assign(display.style, {
        backgroundColor: hex,
        color: readableText,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.75rem',
        fontWeight: 'bold'
    });

    // Stamp the hex string across all relevant card nodes
    display.textContent = hex;
    hexText.textContent = hex;
    copyBtn.setAttribute('data-color', hex);

    // Provide visual accessibility indicator
    if (badge) {
        badge.className = `accessibility-badge ${passAA ? 'pass' : 'fail'}`;
        badge.innerHTML = `<span class="icon-placeholder">${passAA ? '✔️' : '⚠️'}</span> AA ${passAA ? 'Pass' : 'Fail'}`;
        badge.style.color = passAA ? 'var(--success)' : '#ffb74d';
    }
}

/**
 * Re-evaluate colors and update all relevant displays and inputs
 */
function updatePalette(baseHex) {
    const harmony = UI.harmonySelect?.value || 'analogous';
    const colors = Harmonies.generate(baseHex, harmony);

    // Sync state back to our inputs. Because the 3rd index maps to `{h: 0, l: 0}`, it's safely the base
    UI.baseColorPicker.value = colors[2];
    UI.baseColorText.value = colors[2];

    // Sync to footer display
    if (UI.currentHarmonyText && UI.harmonySelect) {
        UI.currentHarmonyText.textContent = UI.harmonySelect.options[UI.harmonySelect.selectedIndex].text;
    }

    // Render cleanly without repeating DOM lookups natively
    colors.forEach((hex, index) => {
        renderCard(UI.colorCards[index], hex);
    });
}

/**
 * Central event binding
 */
function initEvents() {
    UI.generateBtn?.addEventListener('click', () => {
        updatePalette(ColorUtils.generateRandomHex());
    });

    UI.harmonySelect?.addEventListener('change', () => {
        updatePalette(UI.baseColorPicker.value);
    });

    UI.baseColorPicker?.addEventListener('input', (e) => {
        updatePalette(e.target.value);
    });

    UI.baseColorText?.addEventListener('change', (e) => {
        let val = e.target.value;
        if (!val.startsWith('#')) val = '#' + val;
        // Basic Hex format regex (6 chars, case insensitive)
        if (/^#[0-9A-F]{6}$/i.test(val)) {
            updatePalette(val);
        } else {
            e.target.value = UI.baseColorPicker.value; // Reset if invalid
        }
    });

    // Delegate copy events broadly for efficiency
    document.body.addEventListener('click', (e) => {
        const copyBtn = e.target.closest('.copy-button');
        if (!copyBtn) return;

        const color = copyBtn.getAttribute('data-color');
        if (color) {
            navigator.clipboard.writeText(color);
            const originalHTML = copyBtn.innerHTML;
            copyBtn.innerHTML = `<span class="icon-placeholder">✅</span> Copied!`;
            setTimeout(() => copyBtn.innerHTML = originalHTML, 1500);
        }
    });
}

// Boot application when the DOM naturally resolves
document.addEventListener('DOMContentLoaded', () => {
    initEvents();
    updatePalette(ColorUtils.generateRandomHex());
});
