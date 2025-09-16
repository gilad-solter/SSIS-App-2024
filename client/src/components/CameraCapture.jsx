import { useState, useRef } from 'react';

const CameraCapture = ({ onImageCapture, onUploadComplete }) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const fileInputRef = useRef(null);

  // Detect if device is Android (not iOS)
  const isAndroid = /Android/i.test(navigator.userAgent) && !/iPhone|iPad|iPod/i.test(navigator.userAgent);

  const handleCameraClick = async () => {
    // Trigger file input for image capture - this will automatically request camera permission
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setCapturedImage(URL.createObjectURL(file));
      if (onImageCapture) {
        onImageCapture(file);
      }
    }
  };

  return (
    <div className="camera-capture">
      {!capturedImage ? (
        <div className="capture-container">
          <button 
            className="capture-button"
            onClick={handleCameraClick}
            disabled={isCapturing}
          >
            {isCapturing ? 'Processing...' : '📷 Take Picture'}
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            {...(isAndroid && { capture: "environment" })}
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
          
          <p className="instruction-text">
            Tap the camera button to capture a photo of the product's nutritional label
          </p>
        </div>
      ) : (
        <div className="preview-container">
          <img 
            src={capturedImage} 
            alt="Captured nutritional label" 
            className="captured-image"
          />
          <div className="preview-actions">
            <button 
              className="retake-button"
              onClick={() => {
                setCapturedImage(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
            >
              Retake Photo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraCapture;