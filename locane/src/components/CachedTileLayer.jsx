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

      // Check if Cache API is available (secure context required)
      if (typeof caches !== 'undefined') {
        // Use caching when available
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
        }).catch(() => {
          // Cache API failed, fallback to direct fetch
          this._fetchTileDirectly(tile, url, done);
        });
      } else {
        // Cache API not available (insecure context), use direct fetch
        this._fetchTileDirectly(tile, url, done);
      }

      return tile;
    },

    _fetchTileDirectly: function(tile, url, done) {
      // Direct fetch without caching for insecure contexts
      fetch(url)
        .then(res => {
          if (res.ok) {
            return res.blob();
          } else {
            tile.src = this.options.errorTileUrl;
            done(null, tile);
          }
        })
        .then(blob => {
          if (blob) {
            tile.src = URL.createObjectURL(blob);
            done(null, tile);
          }
        })
        .catch(() => {
          tile.src = this.options.errorTileUrl;
          done(null, tile);
        });
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
      if (typeof caches !== 'undefined') {
        try {
          const keys = await caches.keys();
          for (const key of keys) {
            if (key !== cacheName) {
              await caches.delete(key);
            }
          }
        } catch (error) {
          console.warn('Cache cleanup failed:', error);
        }
      }
      // If caches is not available, silently skip cleanup
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
