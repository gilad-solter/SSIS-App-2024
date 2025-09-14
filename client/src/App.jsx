import { useState } from 'react'
import CameraCapture from './components/CameraCapture'
import ComplianceResults from './components/ComplianceResults'
import { extractNutritionalDataFromBase64 } from './services/claude'
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

  const compressImage = async (file, targetSizeMB = 4.8, maxAttempts = 5) => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
      img.onload = async () => {
        const originalSizeMB = file.size / 1024 / 1024
        console.log(`Starting compression: ${originalSizeMB.toFixed(2)}MB → target: ${targetSizeMB}MB`)
        
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
          console.log(`Compression attempt ${attempt}: ${compressedSizeMB.toFixed(2)}MB (quality: ${quality.toFixed(2)}, dimensions: ${width}x${height})`)
          
          if (compressedSizeMB <= targetSizeMB) {
            const compressedFile = new File([blob], file.name, { type: blob.type })
            console.log(`✅ Compression successful: ${originalSizeMB.toFixed(2)}MB → ${compressedSizeMB.toFixed(2)}MB`)
            resolve(compressedFile)
            return
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
        console.log(`❌ Compression failed after ${maxAttempts} attempts`)
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
      console.log('Processing image:', imageFile.name)
      const originalSizeMB = imageFile.size / 1024 / 1024
      console.log('Original file size:', originalSizeMB.toFixed(2), 'MB')
      
      let processedFile = imageFile
      
      // Check if compression is needed and notify user
      if (originalSizeMB > 4.8) {
        setCompressionStatus({
          type: 'warning',
          message: `Image size is ${originalSizeMB.toFixed(2)}MB. Compressing to meet 5MB limit...`
        })
        
        try {
          console.log('Starting image compression...')
          processedFile = await compressImage(imageFile)
          
          const compressedSizeMB = processedFile.size / 1024 / 1024
          setCompressionStatus({
            type: 'success',
            message: `✅ Image compressed: ${originalSizeMB.toFixed(2)}MB → ${compressedSizeMB.toFixed(2)}MB`
          })
        } catch (compressionError) {
          console.error('Compression failed:', compressionError)
          setCompressionStatus({
            type: 'error',
            message: `❌ Unable to compress image below 5MB limit. Please use a smaller image.`
          })
          setError('Image is too large and could not be compressed enough. Please use a smaller image or take a new photo with lower resolution.')
          setIsProcessing(false)
          return
        }
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

  return (
    <div className="app">
      <header className="app-header">
        <h1>SSIS Compliance Checker</h1>
        <p>Take a photo of nutritional labels to check SSIS compliance</p>
      </header>

      <main className="app-main">
        {compressionStatus && (
          <div className={`compression-status ${compressionStatus.type}`}>
            <p>{compressionStatus.message}</p>
          </div>
        )}

        {error && (
          <div className="error-message">
            <p>❌ {error}</p>
            <button onClick={resetApp}>Try Again</button>
          </div>
        )}

        {isProcessing && (
          <div className="loading-message">
            <p>🤖 Extracting nutritional data...</p>
            <p className="sub-text">Claude AI is analyzing your image</p>
            {compressionStatus && compressionStatus.type === 'warning' && (
              <p className="compression-text">⚙️ Compressing image...</p>
            )}
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
