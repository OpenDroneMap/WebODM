import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.tilelayer.fallback';

// Function to create a custom tile layer with caching
const createCachedTileLayer = (urlTemplate, options, cacheName) => {
  const CachedLayer = L.TileLayer.extend({
    createTile: function (coords, done) {
      const tile = document.createElement('img');
      const url = this.getTileUrl(coords);

      const cachePromise = caches.open(cacheName);

      cachePromise.then(cache => {
        cache.match(url).then(response => {
          if (response) {
            // Use cached response
            response.blob().then(blob => {
              tile.src = URL.createObjectURL(blob);
              done(null, tile);
            });
          } else {
            // Fetch and cache
            fetch(url)
              .then(res => {
                if (res.ok) {
                  const resClone = res.clone();
                  cache.put(url, resClone);
                  return res.blob();
                } else {
                  // Use fallback if fetch fails
                  tile.src = this.options.errorTileUrl;
                  done(null, tile);
                }
              })
              .then(blob => {
                if (blob) {
                    tile.src = URL.createObjectURL(blob);
                    done(null, tile);
                }
              }).catch(() => {
                  tile.src = this.options.errorTileUrl;
                  done(null, tile);
              });
          }
        });
      });

      return tile;
    }
  });

  return new CachedLayer(urlTemplate, options);
};

const CachedTileLayer = ({ url, ...props }) => {
  const map = useMap();
  const layerRef = useRef(null);

  const cacheName = `tile-cache-v1-${props.projectId}-${props.taskId}`;

  useEffect(() => {
    // Clear old caches when the component mounts or cache key changes
    const clearOldCaches = async () => {
      const keys = await caches.keys();
      for (const key of keys) {
        if (key !== cacheName) {
          await caches.delete(key);
        }
      }
    };
    clearOldCaches();
  }, [cacheName]);

  useEffect(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
    }
    
    const options = {
        ...props,
        errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=' // 1x1 transparent png
    };

    layerRef.current = createCachedTileLayer(url, options, cacheName);
    map.addLayer(layerRef.current);

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
      }
    };
  }, [url, map, props.opacity, cacheName]); // Re-add layer if URL or opacity changes

  return null;
};

export default CachedTileLayer;
