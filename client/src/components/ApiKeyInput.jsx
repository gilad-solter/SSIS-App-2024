import { useState } from 'react'

function ApiKeyInput({ onApiKeySubmit, error }) {
  const [apiKey, setApiKey] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!apiKey.trim()) {
      return
    }
    
    setIsSubmitting(true)
    await onApiKeySubmit(apiKey.trim())
    setIsSubmitting(false)
  }

  return (
    <div className="api-key-container">
      <div className="api-key-modal">
        <h2>🔐 API Key Required</h2>
        <p>Please enter your API key to access the SSIS Compliance Checker:</p>
        
        {error && (
          <div className="error-message">
            <p>❌ {error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key..."
              required
              disabled={isSubmitting}
              className="api-key-input"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={!apiKey.trim() || isSubmitting}
            className="api-key-submit"
          >
            {isSubmitting ? 'Verifying...' : 'Access App'}
          </button>
        </form>
        
        <div className="api-key-info">
          <p><small>🔒 Your API key will be stored locally in your browser for future visits.</small></p>
          <p><small>💡 Contact the app administrator if you need an API key.</small></p>
        </div>
      </div>
    </div>
  )
}

export default ApiKeyInput