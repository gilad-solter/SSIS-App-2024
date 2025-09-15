import { useState, useEffect } from 'react'
import CameraCapture from './components/CameraCapture'
import ComplianceResults from './components/ComplianceResults'
import ApiKeyInput from './components/ApiKeyInput'
import { extractNutritionalDataFromBase64, testApiKey } from './services/claude'
import './App.css'

// Test data for development
const testData = {
  compliant: {
    productName: "Healthy Snack Bar",
    servingSize: "1 bar (30g)",
    servingWeightGrams: 30,
    calories: 150,
    totalFat: 5,
    saturatedFat: 1,
    transFat: 0,
    sodium: 100,
    totalSugars: 8,
    protein: 4
  },
  nonCompliant: {
    productName: "High Sugar Cookie",
    servingSize: "2 cookies (40g)",
    servingWeightGrams: 40,
    calories: 250,
    totalFat: 12,
    saturatedFat: 6,
    transFat: 0.5,
    sodium: 220,
    totalSugars: 18,
    protein: 3
  }
}

function App() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [nutritionalData, setNutritionalData] = useState(null)
  const [error, setError] = useState(null)
  const [showCompliance, setShowCompliance] = useState(false)
  const [compressionStatus, setCompressionStatus] = useState(null)
  const [debugLogs, setDebugLogs] = useState([])
  const [showDebug, setShowDebug] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [apiKeyError, setApiKeyError] = useState(null)

  // Check for stored API key on component mount
  useEffect(() => {
    const checkStoredApiKey = async () => {
      const storedApiKey = localStorage.getItem('ssisApiKey')
      if (storedApiKey) {
        const keyValidation = await testApiKey(storedApiKey)
        if (keyValidation.valid) {
          setIsAuthenticated(true)
        } else {
          setApiKeyError('Stored API key is no longer valid. Please enter a new one.')
          localStorage.removeItem('ssisApiKey')
        }
      }
    }
    
    checkStoredApiKey()
  }, [])

  // Handle API key submission
  const handleApiKeySubmit = async (apiKey) => {
    setApiKeyError(null)
    
    const keyValidation = await testApiKey(apiKey)
    if (keyValidation.valid) {
      localStorage.setItem('ssisApiKey', apiKey)
      setIsAuthenticated(true)
    } else {
      setApiKeyError(keyValidation.error || 'Invalid API key. Please try again.')
    }
  }

  // Handle logout (clear API key)
  const handleLogout = () => {
    localStorage.removeItem('ssisApiKey')
    setIsAuthenticated(false)
    setApiKeyError(null)
    resetApp()
  }

  // Custom logger that shows on mobile
  const mobileLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    const logEntry = { timestamp, message, type }
    setDebugLogs(prev => [...prev.slice(-9), logEntry]) // Keep last 10 logs
    console.log(message) // Still log to console too
  }

  const compressImage = async (file, targetSizeMB = 4.0, maxAttempts = 6, logger = console.log) => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
      img.onload = async () => {
        const originalSizeMB = file.size / 1024 / 1024
        logger(`🔄 Starting compression: ${originalSizeMB.toFixed(2)}MB → target: ${targetSizeMB}MB`)
        
        let currentFile = file
        let quality = 0.9
        let width = img.width
        let height = img.height
        let attempt = 0
        
        // Initial resize if image is too large
        const maxDimension = 2048
        if (width > maxDimension || height > maxDimension) {
          const ratio = Math.min(maxDimension / width, maxDimension / height)
          width = Math.floor(width * ratio)
          height = Math.floor(height * ratio)
        }
        
        while (attempt < maxAttempts) {
          attempt++
          
          // Set canvas size
          canvas.width = width
          canvas.height = height
          
          // Clear canvas and draw image
          ctx.clearRect(0, 0, width, height)
          ctx.drawImage(img, 0, 0, width, height)
          
          // Create blob with current quality
          const blob = await new Promise(resolve => {
            canvas.toBlob(resolve, file.type, quality)
          })
          
          const compressedSizeMB = blob.size / 1024 / 1024
          logger(`🔄 Attempt ${attempt}/${maxAttempts}: ${compressedSizeMB.toFixed(2)}MB (q:${quality.toFixed(2)}, ${width}x${height})`)
          
          if (compressedSizeMB <= targetSizeMB) {
            const compressedFile = new File([blob], file.name, { type: blob.type })
            logger(`✅ SUCCESS: ${originalSizeMB.toFixed(2)}MB → ${compressedSizeMB.toFixed(2)}MB in ${attempt} attempts`)
            resolve(compressedFile)
            return
          } else {
            logger(`❌ Attempt ${attempt} failed - still ${compressedSizeMB.toFixed(2)}MB > ${targetSizeMB}MB`)
          }
          
          // Adjust compression parameters for next attempt
          if (attempt < maxAttempts) {
            if (quality > 0.3) {
              quality = Math.max(0.3, quality - 0.15) // Reduce quality
            } else {
              // If quality is already low, reduce dimensions
              const reductionFactor = 0.8
              width = Math.floor(width * reductionFactor)
              height = Math.floor(height * reductionFactor)
              quality = 0.7 // Reset quality when reducing dimensions
            }
          }
        }
        
        // If we get here, compression failed
        logger(`❌ Compression failed after ${maxAttempts} attempts`)
        reject(new Error('Unable to compress image below size limit'))
      }
      
      img.onerror = () => reject(new Error('Failed to load image for compression'))
      img.src = URL.createObjectURL(file)
    })
  }

  const handleImageCapture = async (imageFile) => {
    setIsProcessing(true)
    setError(null)
    setNutritionalData(null)
    setCompressionStatus(null)
    
    try {
      mobileLog(`📷 Processing image: ${imageFile.name}`, 'info')
      const originalSizeMB = imageFile.size / 1024 / 1024
      mobileLog(`📏 Original file size: ${originalSizeMB.toFixed(2)}MB`, 'info')
      
      let processedFile = imageFile
      
      // Check if compression is needed and notify user (lower threshold for safety)
      if (originalSizeMB > 3.0) {
        mobileLog(`🔄 File size ${originalSizeMB.toFixed(2)}MB exceeds 3MB threshold - starting compression`, 'warning')
        setCompressionStatus({
          type: 'warning',
          message: `⚠️ Image size is ${originalSizeMB.toFixed(2)}MB. Compressing to meet 5MB limit...`
        })
        
        // Add a small delay to ensure UI updates
        await new Promise(resolve => setTimeout(resolve, 100))
        
        try {
          mobileLog('🔄 Starting image compression...', 'info')
          processedFile = await compressImage(imageFile, 4.0, 6, mobileLog)
          
          const compressedSizeMB = processedFile.size / 1024 / 1024
          mobileLog(`✅ Compression completed: ${originalSizeMB.toFixed(2)}MB → ${compressedSizeMB.toFixed(2)}MB`, 'success')
          
          setCompressionStatus({
            type: 'success',
            message: `✅ Image compressed: ${originalSizeMB.toFixed(2)}MB → ${compressedSizeMB.toFixed(2)}MB`
          })
          
          // Keep success message visible for a moment
          await new Promise(resolve => setTimeout(resolve, 1500))
          
        } catch (compressionError) {
          mobileLog(`❌ Compression failed: ${compressionError.message}`, 'error')
          setCompressionStatus({
            type: 'error',
            message: `❌ Unable to compress image below 5MB limit. Please use a smaller image.`
          })
          setError('Image is too large and could not be compressed enough. Please use a smaller image or take a new photo with lower resolution.')
          setIsProcessing(false)
          return
        }
      } else {
        mobileLog(`✅ File size ${originalSizeMB.toFixed(2)}MB is acceptable - no compression needed`, 'success')
      }
      
      // Final size validation before API call
      const finalSizeMB = processedFile.size / 1024 / 1024
      if (finalSizeMB > 5) {
        setError(`Image is still too large (${finalSizeMB.toFixed(2)}MB) after compression. Please use a smaller image.`)
        setCompressionStatus({
          type: 'error',
          message: `❌ Final size: ${finalSizeMB.toFixed(2)}MB exceeds 5MB limit`
        })
        setIsProcessing(false)
        return
      }
      
      // Convert image to base64 for direct processing
      const reader = new FileReader()
      const imageBase64 = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result.split(',')[1]) // Remove data:image/jpeg;base64, prefix
        reader.onerror = reject
        reader.readAsDataURL(processedFile)
      })
      
      console.log('Image converted to base64, sending to Claude API...')
      console.log('Final image size:', finalSizeMB.toFixed(2), 'MB')
      
      const extractionResult = await extractNutritionalDataFromBase64(imageBase64, processedFile.type)
      
      if (extractionResult.success) {
        setNutritionalData(extractionResult.data)
        console.log('Nutritional data extracted successfully:', extractionResult.data)
      } else {
        setError(extractionResult.error || 'Failed to extract nutritional data')
      }
    } catch (err) {
      console.error('Process error:', err)
      setError('Failed to process image')
    } finally {
      setIsProcessing(false)
    }
  }

  const resetApp = () => {
    setNutritionalData(null)
    setError(null)
    setIsProcessing(false)
    setShowCompliance(false)
    setCompressionStatus(null)
  }

  const handleCheckCompliance = () => {
    setShowCompliance(true)
  }

  const handleTestCompliant = () => {
    setNutritionalData(testData.compliant)
    setShowCompliance(false)
    setError(null)
  }

  const handleTestNonCompliant = () => {
    setNutritionalData(testData.nonCompliant)
    setShowCompliance(false)
    setError(null)
  }

  // If not authenticated, show API key input
  if (!isAuthenticated) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>SSIS Compliance Checker</h1>
          <p>Secure access required</p>
        </header>
        <ApiKeyInput onApiKeySubmit={handleApiKeySubmit} error={apiKeyError} />
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>SSIS Compliance Checker</h1>
        <p>Take a photo of nutritional labels to check SSIS compliance</p>
        <button 
          onClick={handleLogout}
          className="logout-button"
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            background: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '8px 12px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          🔓 Logout
        </button>
      </header>

      <main className="app-main">
        {/* Debug Console Toggle - controlled by environment variable */}
        {import.meta.env.VITE_SHOW_DEBUG_BUTTON === 'true' && (
          <div className="debug-toggle">
            <button
              onClick={() => setShowDebug(!showDebug)}
              style={{
                position: 'fixed',
                top: '10px',
                right: '10px',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                fontSize: '16px',
                zIndex: 1000,
                cursor: 'pointer'
              }}
            >
              🐛
            </button>
          </div>
        )}

        {/* Mobile Debug Console */}
        {showDebug && (
          <div className="debug-console">
            <div className="debug-header">
              <span>Debug Console</span>
              <button onClick={() => setDebugLogs([])}>Clear</button>
            </div>
            <div className="debug-logs">
              {debugLogs.map((log, index) => (
                <div key={index} className={`debug-log ${log.type}`}>
                  <span className="debug-time">{log.timestamp}</span>
                  <span className="debug-message">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="error-message">
            <p>❌ {error}</p>
            <button onClick={resetApp}>Try Again</button>
          </div>
        )}

        {compressionStatus && (
          <div className={`compression-status ${compressionStatus.type}`}>
            <p>{compressionStatus.message}</p>
            {compressionStatus.type === 'warning' && (
              <p className="compression-text">⚙️ Please wait while we reduce the file size...</p>
            )}
          </div>
        )}

        {isProcessing && (
          <div className="loading-message">
            <p>🤖 Extracting nutritional data...</p>
            <p className="sub-text">Claude AI is analyzing your image</p>
          </div>
        )}

        {nutritionalData ? (
          showCompliance ? (
            <ComplianceResults 
              nutritionalData={nutritionalData}
              onNewScan={resetApp}
            />
          ) : (
            <div className="results-container">
              <div className="nutritional-results">
                <h2>📊 Nutritional Information Extracted</h2>
                
                {nutritionalData.productName && (
                  <div className="product-info">
                    <h3>{nutritionalData.productName}</h3>
                    {nutritionalData.servingSize && (
                      <p className="serving-size">Serving Size: {nutritionalData.servingSize}</p>
                    )}
                  </div>
                )}

                <div className="nutrition-grid">
                  <div className="nutrition-item">
                    <span className="label">Calories:</span>
                    <span className="value">{nutritionalData.calories || 'N/A'}</span>
                  </div>
                  <div className="nutrition-item">
                    <span className="label">Total Fat:</span>
                    <span className="value">{nutritionalData.totalFat ? `${nutritionalData.totalFat}g` : 'N/A'}</span>
                  </div>
                  <div className="nutrition-item">
                    <span className="label">Saturated Fat:</span>
                    <span className="value">{nutritionalData.saturatedFat ? `${nutritionalData.saturatedFat}g` : 'N/A'}</span>
                  </div>
                  <div className="nutrition-item">
                    <span className="label">Trans Fat:</span>
                    <span className="value">{nutritionalData.transFat !== null && nutritionalData.transFat !== undefined ? `${nutritionalData.transFat}g` : 'N/A'}</span>
                  </div>
                  <div className="nutrition-item">
                    <span className="label">Sodium:</span>
                    <span className="value">{nutritionalData.sodium ? `${nutritionalData.sodium}mg` : 'N/A'}</span>
                  </div>
                  <div className="nutrition-item">
                    <span className="label">Total Sugars:</span>
                    <span className="value">{nutritionalData.totalSugars ? `${nutritionalData.totalSugars}g` : 'N/A'}</span>
                  </div>
                  <div className="nutrition-item">
                    <span className="label">Protein:</span>
                    <span className="value">{nutritionalData.protein ? `${nutritionalData.protein}g` : 'N/A'}</span>
                  </div>
                  {nutritionalData.servingWeightGrams && (
                    <div className="nutrition-item">
                      <span className="label">Serving Weight:</span>
                      <span className="value">{nutritionalData.servingWeightGrams}g</span>
                    </div>
                  )}
                </div>

                {nutritionalData.ingredients && nutritionalData.ingredients.length > 0 && (
                  <div className="ingredients-section">
                    <h4>Ingredients:</h4>
                    <p className="ingredients-list">{nutritionalData.ingredients.join(', ')}</p>
                  </div>
                )}

                <div className="action-buttons">
                  <button onClick={handleCheckCompliance} className="compliance-check-button">
                    Check SSIS Compliance
                  </button>
                  <button onClick={resetApp} className="new-scan-button">
                    Scan Another Product
                  </button>
                </div>
              </div>
            </div>
          )
        ) : (
          !isProcessing && !error && (
            <div>
              <CameraCapture 
                onImageCapture={handleImageCapture}
              />
              
              {/* Development Test Buttons */}
              {import.meta.env.DEV && (
                <div className="test-buttons">
                  <h3>Test SSIS Compliance (Development)</h3>
                  <div className="test-button-group">
                    <button onClick={handleTestCompliant} className="test-compliant-button">
                      Test Compliant Product
                    </button>
                    <button onClick={handleTestNonCompliant} className="test-non-compliant-button">
                      Test Non-Compliant Product
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        )}
      </main>
    </div>
  )
}

export default App
