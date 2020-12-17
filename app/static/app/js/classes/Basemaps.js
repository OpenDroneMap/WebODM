import { _ } from './gettext';

export default [
  {
    attribution: "Map data: &copy; Google Maps",
    subdomains: ["mt0", "mt1", "mt2", "mt3"],
    maxZoom: 21,
    minZoom: 0,
    label: _("Google Maps Hybrid"),
    url: "//{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}"
  },
  {
    attribution:
      "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
    maxZoom: 21,
    minZoom: 0,
    label: _("ESRI Satellite"),
    url:
      "//server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
  },
  {
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 21,
    minZoom: 0,
    label: _("OSM Mapnik"),
    url: "//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  }
];
