// CARTO Basemaps raster tiles require an API key (free tier: 5M tiles/month).
// Attribution to CARTO + OpenStreetMap must stay visible on every map.
export const CARTO_API_KEY = "cb1_2qat_1_99e6fb0d263960059b09a7b6";

export const CARTO_LIGHT_TILE_URL =
  `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=${CARTO_API_KEY}`;

export const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
