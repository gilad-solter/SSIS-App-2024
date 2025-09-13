import { useState, useRef } from 'react';

const CameraCapture = ({ onImageCapture, onUploadComplete }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const fileInputRef = useRef(null);

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Use back camera for mobile
      });
      stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately
      setHasPermission(true);
      return true;
    } catch (error) {
      console.error('Camera permission denied:', error);
      setHasPermission(false);
      return false;
    }
  };

  const handleCameraClick = async () => {
    // Check if device supports camera
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Camera not supported on this device');
      return;
    }

    // Request permission if not granted
    if (hasPermission === null) {
      const granted = await requestCameraPermission();
      if (!granted) return;
    } else if (hasPermission === false) {
      alert('Camera permission required to capture images');
      return;
    }

    // Trigger file input for image capture
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
            capture="environment"
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