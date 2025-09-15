// Google Analytics service for SSIS App

// Replace with your actual GA Measurement ID
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-HM3JL6H9CE'

let isInitialized = false

// Initialize Google Analytics
export const initGA = () => {
  if (isInitialized) return

  // Add GA script to head
  const script1 = document.createElement('script')
  script1.async = true
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
  document.head.appendChild(script1)

  // Initialize gtag
  window.dataLayer = window.dataLayer || []
  window.gtag = function() {
    window.dataLayer.push(arguments)
  }

  window.gtag('js', new Date())
  window.gtag('config', GA_MEASUREMENT_ID, {
    // Enable enhanced measurement for better tracking
    enhanced_measurement: true,
    // Custom page title for SPA
    page_title: document.title,
    // Send page view on init
    send_page_view: false // We'll handle this manually for better control
  })

  isInitialized = true
  console.log('Google Analytics initialized with ID:', GA_MEASUREMENT_ID)
}

// Track page views for the 3 main app states
export const trackPageView = (viewName, additionalData = {}) => {
  if (!isInitialized) {
    console.warn('GA not initialized, skipping page view tracking')
    return
  }

  const pageData = {
    page_title: `SSIS App - ${viewName}`,
    page_location: window.location.href,
    ...additionalData
  }

  window.gtag('event', 'page_view', pageData)
  console.log('Page view tracked:', viewName, pageData)
}

// Track the 3 specific views in your app
export const trackApiKeyView = () => {
  trackPageView('API Key Entry', {
    view_type: 'authentication',
    step: 1
  })
}

export const trackMainView = () => {
  trackPageView('Camera Capture', {
    view_type: 'main_interface',
    step: 2
  })
}

export const trackComplianceView = (isCompliant = null) => {
  trackPageView('Compliance Results', {
    view_type: 'results',
    step: 3,
    compliance_result: isCompliant
  })
}

// Track custom events
export const trackEvent = (eventName, parameters = {}) => {
  if (!isInitialized) {
    console.warn('GA not initialized, skipping event tracking')
    return
  }

  window.gtag('event', eventName, parameters)
  console.log('Event tracked:', eventName, parameters)
}

// Specific event trackers for SSIS app actions
export const trackApiKeySuccess = () => {
  trackEvent('api_key_validated', {
    event_category: 'authentication',
    event_label: 'success'
  })
}

export const trackImageCapture = (imageSize) => {
  trackEvent('image_captured', {
    event_category: 'user_interaction',
    event_label: 'photo_taken',
    value: Math.round(imageSize / 1024) // Size in KB
  })
}

export const trackComplianceCheck = (isCompliant, productName) => {
  trackEvent('compliance_check_completed', {
    event_category: 'analysis',
    event_label: isCompliant ? 'compliant' : 'non_compliant',
    product_name: productName
  })
}

export const trackError = (errorType, errorMessage) => {
  trackEvent('error_occurred', {
    event_category: 'error',
    event_label: errorType,
    error_message: errorMessage
  })
}