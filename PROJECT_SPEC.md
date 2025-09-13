# SSIS Compliance Checker App

## Overview
Mobile-first PWA for checking product nutritional compliance with SSIS standards using image recognition.

## Architecture

### Frontend (React PWA)
- **Framework**: Modern React.js
- **Target**: Mobile devices (responsive web app)
- **Features**: PWA enabled (offline capability, installable)

### Backend Requirements
- Express.js server for API proxy
- Claude API integration for OCR text extraction
- Base64 image processing

## User Flow

1. **Capture**: User takes photo of product nutritional label using device camera
2. **Convert**: Image converted to base64 format in browser
3. **Process**: Frontend sends base64 image to backend API
4. **Extract**: Backend calls Claude API for text extraction
5. **Parse**: Claude returns structured JSON with nutritional data
6. **Analyze**: Frontend runs SSIS compliance logic on extracted data
7. **Result**: Display compliance status:
   - ✅ **Compliant**: Green checkmark
   - ❌ **Non-compliant**: Red X + explanation

## Technical Stack

### Frontend
- React.js (modern/hooks)
- PWA capabilities (service worker, manifest)
- Camera API integration
- Base64 image conversion

### Backend Services
- Express.js API server
- Claude API (OCR/text extraction)

## Implementation Status ✅

### Completed Components
- **CameraCapture.jsx** - Camera component with permission handling
- **claude.js** - Claude API service integration
- **App.jsx** - Main app component with image processing flow
- **App.css** - Mobile-responsive styling
- **server/index.js** - Express backend with Claude API proxy

### Key Components
- ✅ Camera capture component (`/client/src/components/CameraCapture.jsx`)
- ✅ Base64 image processing (`/client/src/App.jsx`)
- ✅ API service layer (`/client/src/services/claude.js` + `/server/index.js`)
- ⏳ Compliance checker logic
- ✅ Nutritional data display component

### Setup Instructions
1. **Backend Setup:**
   - Navigate to `/server` folder
   - Copy `.env.example` to `.env` 
   - Add your Claude API key to `CLAUDE_API_KEY`
   - Run `npm install`
   - Run `npm run dev`

2. **Frontend Setup:**
   - Navigate to `/client` folder
   - Run `npm install`
   - Run `npm run dev`

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
- Add PWA manifest and service worker

## Data Flow
```
Camera → Image File → Base64 Conversion → Backend API → Claude API → JSON → Nutritional Display → Compliance Logic → UI Result
```