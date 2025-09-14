// Claude API service for nutritional label text extraction (via backend proxy)

const BACKEND_API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

// Get API key from localStorage
const getApiKey = () => {
  return localStorage.getItem('ssisApiKey');
};

// Test API key validity
export const testApiKey = async (apiKey) => {
  try {
    console.log('Testing API key validity...');
    
    // Test with actual API endpoint using empty data to trigger validation
    const response = await fetch(`${BACKEND_API_URL}/api/claude/extract-base64`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({ imageBase64: '', mimeType: 'image/jpeg' })
    });
    
    console.log('API key test response status:', response.status);
    
    if (response.status === 401) {
      const errorData = await response.json().catch(() => ({}));
      console.log('API key validation failed:', errorData);
      return { 
        valid: false, 
        error: errorData.error || 'Invalid API key' 
      };
    } else if (response.status === 400) {
      // 400 with "Base64 image data is required" means API key was accepted
      const responseData = await response.json().catch(() => ({}));
      if (responseData.error && responseData.error.includes('Base64 image data is required')) {
        console.log('API key is valid (got expected validation error for empty data)');
        return { valid: true };
      }
    } else if (response.status === 429) {
      // Rate limited but API key was accepted
      console.log('API key is valid (rate limited)');
      return { valid: true };
    }
    
    // If we get any other response, the API key was likely accepted
    // but let's be safe and try to parse the response
    const responseData = await response.json().catch(() => ({}));
    console.log('API key test response data:', responseData);
    
    // If we get a specific validation error about image data, key is valid
    if (responseData.error && responseData.error.includes('Base64 image data is required')) {
      return { valid: true };
    }
    
    // Default to valid if we made it this far without a 401
    return { valid: true };
    
  } catch (error) {
    console.error('API key test failed:', error);
    
    if (error.message?.includes('Failed to fetch')) {
      return { 
        valid: false, 
        error: 'Unable to connect to server. Please check your connection.' 
      };
    }
    
    return { 
      valid: false, 
      error: 'Unable to verify API key. Please try again.' 
    };
  }
};

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

    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('API key not found. Please provide a valid API key.');
    }

    console.log('Sending base64 image to backend proxy...');

    const response = await fetch(`${BACKEND_API_URL}/api/claude/extract-base64`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
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
    if (error.message?.includes('API key not found')) {
      errorMessage = 'API key missing. Please provide a valid API key.';
    } else if (error.message?.includes('Invalid API key') || error.message?.includes('401')) {
      errorMessage = 'Invalid API key. Please check your API key and try again.';
    } else if (error.message?.includes('Claude API key not configured')) {
      errorMessage = 'Server configuration error: Claude API key missing.';
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