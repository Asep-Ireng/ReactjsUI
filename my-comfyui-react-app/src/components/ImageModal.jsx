// src/components/ImageModal.jsx
import React from "react";

const ImageModal = ({ src, onClose }) => {
  if (!src) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <img src={src} alt="Full size view" />
        <button onClick={onClose} className="modal-close-button">
          Close
        </button>
      </div>
    </div>
  );
};

export default ImageModal;