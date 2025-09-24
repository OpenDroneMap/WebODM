import React, { useState, useRef } from 'react';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import "./ImageViewer.css";

function ImageViewer({ image, index, onClose, onPointSelect, onPointDelete, hasPendingPoint }) {
  const [imagePoint, setImagePoint] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);
  // We no longer need the 'transform' state, as we'll get live data from the render prop.
  // const [transform, setTransform] = useState({ scale: 1, positionX: 0, positionY: 0 }); 
  const imageRef = useRef(null);

  // handleSelectClick, handleImageClick, and handleDeletePoint remain the same as before.
  const handleSelectClick = () => {
    if (!imagePoint) {
      setIsSelecting(true);
    }
  };

  const handleImageClick = (e) => {
    if (!isSelecting || !imageRef.current) return;
    const imageElement = imageRef.current;
    const rect = imageElement.getBoundingClientRect();
    const xOnImageElement = e.clientX - rect.left;
    const yOnImageElement = e.clientY - rect.top;

    if (
      xOnImageElement < 0 || xOnImageElement > rect.width ||
      yOnImageElement < 0 || yOnImageElement > rect.height
    ) {
      setIsSelecting(false);
      return;
    }

    const xRatio = xOnImageElement / rect.width;
    const yRatio = yOnImageElement / rect.height;
    const finalX = xRatio * imageElement.naturalWidth;
    const finalY = yRatio * imageElement.naturalHeight;
    const point = { x: finalX, y: finalY };

    setImagePoint(point);
    setIsSelecting(false);
    onPointSelect(point);
  };
  
  const handleDeletePoint = (e) => {
    e.stopPropagation();
    setImagePoint(null);
    setIsSelecting(false);
    onPointDelete();
  };


  return (
    <div className="image-viewer no-scroll">
      <TransformWrapper
        minScale={1}
        maxScale={50}
        centerOnInit
        wheel={{ step: 0.75 }}
        doubleClick={{ disabled: true }}
        pinch={{ step: 5 }}
      >
        {({ zoomIn, zoomOut, resetTransform, state }) => {
          const currentScale = state?.scale || 1;
          const markerStyle = imagePoint && imageRef.current?.naturalWidth
            ? {
                left: `${(imagePoint.x / imageRef.current.naturalWidth) * 100}%`,
                top: `${(imagePoint.y / imageRef.current.naturalHeight) * 100}%`,
                transform: `translate(-50%, -50%) scale(${1 / currentScale})`,
              }
            : {};

          return (
            <>
              <div className="viewer-header">
                <div className="viewer-title">{image.name} (#{index})</div>
                <div className="viewer-controls-row">
                  <button onClick={handleSelectClick} disabled={isSelecting || !!imagePoint || hasPendingPoint}>
                    {isSelecting ? "Click on Image..." : "Select Point"}
                  </button>
                  <button onClick={() => zoomIn()}>＋</button>
                  <button onClick={() => zoomOut()}>－</button>
                  <button onClick={() => resetTransform()}>Reset</button>
                  <button className="close-btn" onClick={onClose}>✖ Close</button>
                </div>
              </div>

              <div className="viewer-body" onClick={handleImageClick} style={{ cursor: isSelecting ? 'crosshair' : 'default' }}>
                <TransformComponent
                    wrapperStyle={{ width: "100%", height: "100%" }}
                    contentStyle={{ width: "100%", height: "100%" }}
                >
                  <div className="image-container-for-marker">
                      <div className="image-wrapper-for-marker">
                          <img
                            ref={imageRef}
                            src={image.url}
                            alt={image.name}
                            className="zoom-image"
                            style={{ cursor: isSelecting ? 'crosshair' : 'grab' }}
                          />
                          {imagePoint && (
                              <div className="image-marker" style={markerStyle}>
                                  <div className="marker-delete-btn" onClick={handleDeletePoint}>✖</div>
                              </div>
                          )}
                      </div>
                  </div>
                </TransformComponent>
              </div>
              {hasPendingPoint && !imagePoint && (
                  <div className="viewer-footer-notice">
                      A point is pending. Close and reopen to select a new point in this image.
                  </div>
              )}
              {imagePoint && hasPendingPoint && (
                  <div className="viewer-footer-notice">
                      Select the corresponding GCP on the map.
                  </div>
              )}
            </>
          );
        }}
      </TransformWrapper>
    </div>
  );
}

export default ImageViewer;