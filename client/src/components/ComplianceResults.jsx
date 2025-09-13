import { useState } from 'react';
import { checkSSISCompliance, getComplianceSummary, formatComplianceDetails } from '../services/ssisCompliance';
import './ComplianceResults.css';

const ComplianceResults = ({ nutritionalData, onNewScan }) => {
  const [showDetails, setShowDetails] = useState(false);
  
  if (!nutritionalData) {
    return null;
  }

  const complianceResults = checkSSISCompliance(nutritionalData);
  const summary = getComplianceSummary(complianceResults);
  const details = formatComplianceDetails(complianceResults);

  return (
    <div className="compliance-results">
      <div className={`compliance-summary ${summary.status}`}>
        <div className="compliance-icon">{summary.icon}</div>
        <div className="compliance-text">
          <h2>SSIS Compliance Results</h2>
          <p className="compliance-message">{summary.message}</p>
        </div>
      </div>

      <div className="compliance-actions">
        <button 
          className="details-toggle"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
        <button className="new-scan-button" onClick={onNewScan}>
          Scan Another Product
        </button>
      </div>

      {showDetails && (
        <div className="compliance-details">
          <h3>Detailed Requirements Check</h3>
          <div className="requirements-list">
            {details.map((detail, index) => (
              <div key={index} className={`requirement-item ${detail.passed ? 'passed' : 'failed'}`}>
                <div className="requirement-header">
                  <span className="requirement-icon">{detail.icon}</span>
                  <span className="requirement-name">{detail.name}</span>
                </div>
                <div className="requirement-details">
                  <div className="requirement-values">
                    <span className="actual-value">Actual: {detail.value}</span>
                    <span className="required-value">Required: {detail.requirement}</span>
                  </div>
                  <p className="requirement-explanation">{detail.explanation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!complianceResults.isCompliant && (
        <div className="non-compliance-summary">
          <h3>Issues Found:</h3>
          <ul>
            {complianceResults.failedTests.map((test, index) => (
              <li key={index}>
                <strong>{test.test.charAt(0).toUpperCase() + test.test.slice(1).replace(/([A-Z])/g, ' $1')}:</strong> {test.explanation}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ComplianceResults;