// Claude API service for nutritional label text extraction (via backend proxy)

const BACKEND_API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export const extractNutritionalDataFromBase64 = async (imageBase64, mimeType) => {
  try {
    console.log('=== Claude API Debug Info ===');
    console.log('Environment variables:', {
      VITE_BACKEND_URL: import.meta.env.VITE_BACKEND_URL,
      NODE_ENV: import.meta.env.NODE_ENV,
      MODE: import.meta.env.MODE
    });
    console.log('Resolved BACKEND_API_URL:', BACKEND_API_URL);
    console.log('Full API endpoint URL:', `${BACKEND_API_URL}/api/claude/extract-base64`);
    console.log('Starting Claude API text extraction from base64 image');
    console.log('Image size:', imageBase64.length, 'characters');
    console.log('MIME type:', mimeType);

    const requestBody = {
      imageBase64: imageBase64,
      mimeType: mimeType || 'image/jpeg'
    };

    console.log('Sending base64 image to backend proxy...');

    const response = await fetch(`${BACKEND_API_URL}/api/claude/extract-base64`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('Backend API error response:', errorData);
      throw new Error(errorData.error || `Backend API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Backend API response:', data);

    return data; // Backend already returns the correct format

  } catch (error) {
    console.error('Claude API extraction failed:', error);
    
    let errorMessage = error.message || 'Failed to extract text from image';
    
    // Handle specific API errors
    if (error.message?.includes('Claude API key not configured')) {
      errorMessage = 'Server configuration error: Claude API key missing.';
    } else if (error.message?.includes('401')) {
      errorMessage = 'Invalid Claude API key. Please check your server configuration.';
    } else if (error.message?.includes('429')) {
      errorMessage = 'API rate limit exceeded. Please try again later.';
    } else if (error.message?.includes('413')) {
      errorMessage = 'Image too large for processing. Please use a smaller image.';
    } else if (error.message?.includes('Failed to fetch')) {
      errorMessage = 'Cannot connect to server. Please make sure the backend server is running on port 3001.';
    } else if (error.message?.includes('Network Error')) {
      errorMessage = 'Network error. Please check your internet connection.';
    }

    return {
      success: false,
      error: errorMessage,
      originalError: error
    };
  }
};

// Helper function to validate required nutritional data
export const validateNutritionalData = (data) => {
  const required = ['calories', 'totalFat', 'sodium', 'totalCarbohydrates', 'protein'];
  const missing = required.filter(field => data[field] === null || data[field] === undefined);
  
  return {
    isValid: missing.length === 0,
    missingFields: missing,
    completeness: ((required.length - missing.length) / required.length) * 100
  };
};