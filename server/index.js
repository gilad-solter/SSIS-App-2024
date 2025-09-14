const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting middleware - configurable requests per hour per IP
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_PER_HOUR) || 10;
const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: RATE_LIMIT_MAX, // limit each IP to configurable requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);

// API Key authentication middleware
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const validApiKey = process.env.API_SECRET_KEY;
  
  if (!validApiKey) {
    return res.status(500).json({ 
      error: 'Server configuration error: API key not configured' 
    });
  }
  
  if (!apiKey) {
    return res.status(401).json({ 
      error: 'Missing API key. Please provide x-api-key header.' 
    });
  }
  
  if (apiKey !== validApiKey) {
    return res.status(401).json({ 
      error: 'Invalid API key. Access denied.' 
    });
  }
  
  next();
};

// Apply API key authentication to all API routes
app.use('/api/', authenticateApiKey);

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173', 
    'http://localhost:5174', 
    'https://client-production-7bb8.up.railway.app'
  ], // Vite dev server + production client
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Claude API proxy endpoint for base64 images (new preferred method)
app.post('/api/claude/extract-base64', async (req, res) => {
  try {
    console.log('Received Claude API request with base64 image');
    
    const { imageBase64, mimeType } = req.body;
    
    if (!imageBase64) {
      return res.status(400).json({ error: 'Base64 image data is required' });
    }

    if (!process.env.CLAUDE_API_KEY) {
      return res.status(500).json({ error: 'Claude API key not configured on server' });
    }

    console.log('Processing base64 image:', {
      size: imageBase64.length,
      mimeType: mimeType || 'image/jpeg'
    });

    const requestBody = {
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType || 'image/jpeg',
                data: imageBase64
              }
            },
            {
              type: 'text',
              text: `Please extract all nutritional information from this food product label image for SSIS compliance checking.

Return the data as a JSON object with the following structure:
{
  "productName": "string",
  "servingSize": "string",
  "servingWeightGrams": "number (extract the weight in grams from serving size, e.g., from '28g' extract 28)",
  "calories": "number",
  "totalFat": "number",
  "saturatedFat": "number",
  "transFat": "number",
  "cholesterol": "number",
  "sodium": "number",
  "totalCarbohydrates": "number", 
  "dietaryFiber": "number",
  "totalSugars": "number",
  "addedSugars": "number",
  "protein": "number",
  "ingredients": ["array of ingredient strings"],
  "allergens": ["array of allergen strings"],
  "additionalInfo": "any other relevant nutritional information"
}

IMPORTANT: 
- Extract numbers without units (just the numeric value)
- For servingWeightGrams, convert serving size to grams (e.g., "1 cup (28g)" → 28, "2 pieces (30g)" → 30)
- If serving weight is in other units, convert to grams where possible
- If a value is not visible or available, use null
- Only return the JSON object, no additional text.`
            }
          ]
        }
      ]
    };

    console.log('Making request to Claude API...');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Claude API error:', errorData);
      return res.status(response.status).json({ 
        error: `Claude API error: ${response.status} ${response.statusText}`,
        details: errorData
      });
    }

    const data = await response.json();
    console.log('Claude API response received');

    if (!data.content || !data.content[0] || !data.content[0].text) {
      return res.status(500).json({ error: 'Invalid response format from Claude API' });
    }

    const extractedText = data.content[0].text;

    // Parse the JSON response
    let nutritionalData;
    try {
      nutritionalData = JSON.parse(extractedText);
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError);
      return res.status(500).json({ 
        error: 'Failed to parse nutritional data from image',
        rawText: extractedText
      });
    }

    res.json({
      success: true,
      data: nutritionalData,
      rawText: extractedText
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});


// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 SSIS Server running on port ${PORT}`);
  console.log(`📡 Claude API proxy available at http://localhost:${PORT}/api/claude/extract`);
  console.log(`🛡️ Rate limiting: ${RATE_LIMIT_MAX} requests per hour per IP`);
});