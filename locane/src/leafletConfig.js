import L from 'leaflet';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: import.meta.env.DEV 
    ? '/node_modules/leaflet/dist/images/marker-icon-2x.png'
    : '/images/marker-icon-2x.png',
  iconUrl: import.meta.env.DEV 
    ? '/node_modules/leaflet/dist/images/marker-icon.png'
    : '/images/marker-icon.png',
  shadowUrl: import.meta.env.DEV 
    ? '/node_modules/leaflet/dist/images/marker-shadow.png'
    : '/images/marker-shadow.png',
});

export default L;