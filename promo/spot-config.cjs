// Loads promo/<spot>/spot.json. A spot with "base": "<other spot>" reuses that
// spot's compose.html and synth.py; the base's keys are the defaults, except
// its scene list, which every spot states for itself.
const fs = require('fs');

module.exports = function loadSpot(root, spot) {
    const own = JSON.parse(fs.readFileSync(`${root}/${spot}/spot.json`, 'utf8'));
    if (!own.base) return own;
    const base = JSON.parse(fs.readFileSync(`${root}/${own.base}/spot.json`, 'utf8'));
    delete base.scenes;
    return { ...base, ...own };
};
