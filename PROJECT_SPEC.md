# SSIS Compliance Checker App

## Overview
Mobile-first PWA for checking product nutritional compliance with SSIS standards using image recognition.

## Architecture

### Frontend (React PWA)
- **Framework**: Modern React.js with Vite
- **Target**: Mobile devices (responsive web app)
- **Features**: Full PWA enabled with service worker, offline capability, installable on iOS/Android
- **Image Processing**: Automatic compression for Claude API 5MB limit compliance
- **Deployment**: Railway (https://client-production-7bb8.up.railway.app)

### Backend Requirements
- Express.js server for API proxy
- Claude API integration for OCR text extraction
- Base64 image processing with size validation
- CORS configuration for production deployment
- **Deployment**: Railway (https://server-production-525b.up.railway.app)

## User Flow

1. **Capture**: User takes photo of product nutritional label using device camera
2. **Compress**: Image automatically compressed if > 4.5MB (quality adjustment + resizing)
3. **Convert**: Image converted to base64 format in browser
4. **Process**: Frontend sends base64 image to backend API via HTTPS
5. **Extract**: Backend calls Claude API for text extraction
6. **Parse**: Claude returns structured JSON with nutritional data
7. **Analyze**: Frontend runs SSIS compliance logic on extracted data
8. **Result**: Display compliance status:
   - ✅ **Compliant**: Green checkmark
   - ❌ **Non-compliant**: Red X + explanation

## Technical Stack

### Frontend
- React.js (modern/hooks) with Vite build system
- Full PWA capabilities (service worker, manifest, installable)
- Camera API integration with file upload support
- Automatic image compression (Canvas API, quality adjustment)
- Base64 image conversion
- Responsive design for mobile devices
- Environment variable configuration (`VITE_BACKEND_URL`)

### Backend Services
- Express.js API server with CORS configuration
- Claude API integration (OCR/text extraction)
- Image size validation (5MB limit handling)
- Error handling and logging
- Environment variable configuration (`CLAUDE_API_KEY`)

## Implementation Status ✅

### Completed Components
- **CameraCapture.jsx** - Camera component with permission handling
- **claude.js** - Claude API service integration
- **App.jsx** - Main app component with image processing flow
- **App.css** - Mobile-responsive styling
- **server/index.js** - Express backend with Claude API proxy

### Key Components
- ✅ Camera capture component (`/client/src/components/CameraCapture.jsx`)
- ✅ Base64 image processing with compression (`/client/src/App.jsx`)
- ✅ API service layer (`/client/src/services/claude.js` + `/server/index.js`)
- ✅ PWA configuration (Vite PWA plugin, manifest, service worker)
- ✅ App icons and PWA assets (64x64, 192x192, 512x512, Apple touch icon)
- ⏳ Compliance checker logic
- ✅ Nutritional data display component
- ✅ Production deployment configuration (Railway)

### Setup Instructions

#### Local Development
1. **Backend Setup:**
   - Navigate to `/server` folder
   - Copy `.env.example` to `.env` 
   - Add your Claude API key to `CLAUDE_API_KEY`
   - Run `npm install`
   - Run `npm run dev`

2. **Frontend Setup:**
   - Navigate to `/client` folder
   - Run `npm install`
   - Add `VITE_BACKEND_URL=http://localhost:3001` to `.env`
   - Run `npm run dev`

#### Production Deployment (Railway)
1. **Server Deployment:**
   - Deploy server code to Railway
   - Set environment variable: `CLAUDE_API_KEY=your_key`
   - Configure CORS origins for client URL

2. **Client Deployment:**
   - Deploy client code to Railway  
   - Set environment variable: `VITE_BACKEND_URL=https://server-production-525b.up.railway.app`
   - PWA automatically configured for production build

#### PWA Installation (iOS)
1. Open Safari and navigate to: https://client-production-7bb8.up.railway.app
2. Tap Share button → "Add to Home Screen" 
3. App installs as native PWA with offline capability

## SSIS Compliance Guidelines

Each product must comply with **ALL** of the following nutritional guidelines to be considered SSIS compliant:

### Nutritional Requirements
- **Calories**: 200 calories or less
- **Sodium**: 200 mg or less  
- **Total Fat**: 35% of calories or less
- **Saturated Fat**: Less than 10% of calories
- **Trans Fat**: 0 grams
- **Total Sugars**: 35% by weight or less

### Compliance Logic
A product is SSIS compliant **ONLY** if it meets all six criteria above. If any single requirement is not met, the product is non-compliant.

### Next Steps
- Implement SSIS compliance logic using the guidelines above
- ✅ PWA manifest and service worker implemented

## Data Flow
```
Camera → Image File → [Compression if >4.5MB] → Base64 Conversion → Backend API (CORS) → Claude API → JSON → Nutritional Display → Compliance Logic → UI Result
```

## Technical Implementation Details

### Image Compression Algorithm
- **Trigger**: Files larger than 4.5MB
- **Method**: HTML5 Canvas with quality adjustment
- **Sizing**: Max dimensions 2048x2048px
- **Quality**: Dynamic based on original file size ratio
- **Output**: Compressed file under Claude's 5MB limit

### PWA Configuration
- **Vite Plugin**: `vite-plugin-pwa` with automatic service worker generation
- **Manifest**: Generated with app metadata, icons, and theme colors
- **Icons**: Multiple sizes (64x64, 192x192, 512x512) + Apple touch icon
- **Offline**: Service worker caches app assets for offline functionality
- **Installable**: Native app-like installation on iOS/Android

### CORS Configuration
- **Development**: `localhost:5173, localhost:5174`
- **Production**: `https://client-production-7bb8.up.railway.app`
- **Server**: Express CORS middleware with credentials support

### Environment Variables
- **Client**: `VITE_BACKEND_URL` - Backend API endpoint
- **Server**: `CLAUDE_API_KEY` - Anthropic Claude API authentication
- **Railway**: Automatic deployment with environment variable support