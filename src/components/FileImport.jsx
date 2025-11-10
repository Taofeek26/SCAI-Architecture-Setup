import { useState } from 'react';
import { useData } from '../contexts/DataContext';
import './FileImport.css';

const FileImport = ({ onClose }) => {
  const { loadFiles } = useData();
  const [archFile, setArchFile] = useState(null);
  const [procFile, setProcFile] = useState(null);
  const [cfFile, setCfFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLoadFiles = async () => {
    if (!archFile || !procFile) {
      alert('Please select both required files (Architecture and Process) before loading.');
      return;
    }

    setLoading(true);

    const result = await loadFiles(archFile, procFile, cfFile);

    setLoading(false);

    if (result.success) {
      onClose();
    } else {
      alert(`Error loading files: ${result.error}`);
    }
  };

  if (loading) {
    return (
      <div className="import-overlay">
        <div className="loading-dialog">
          <div className="loading-title">Loading SCAI Data...</div>
          <div className="loading-item">📊 Architecture Template</div>
          <div className="loading-item">🔄 Process Definitions</div>
          <div className="loading-item">☁️ CloudFormation Resources</div>
          <div className="loading-message">Please wait...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="import-overlay">
      <div className="import-dialog">
        <button className="close-btn" onClick={onClose}>×</button>

        <div className="import-title">📁 Import Architecture Files</div>
        <div className="import-subtitle">
          Select the required JSON files to load the architecture:
        </div>

        <div className="file-input-group">
          <label className="file-label">
            1. Architecture Template <span className="required">*</span>
          </label>
          <input
            type="file"
            accept=".json"
            onChange={(e) => setArchFile(e.target.files[0])}
            className="file-input"
          />
        </div>

        <div className="file-input-group">
          <label className="file-label">
            2. Process-Oriented <span className="required">*</span>
          </label>
          <input
            type="file"
            accept=".json"
            onChange={(e) => setProcFile(e.target.files[0])}
            className="file-input"
          />
        </div>

        <div className="file-input-group">
          <label className="file-label">
            3. CloudFormation Template <span className="optional">(optional)</span>
          </label>
          <input
            type="file"
            accept=".json"
            onChange={(e) => setCfFile(e.target.files[0])}
            className="file-input"
          />
        </div>

        <div className="button-group">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="load-btn" onClick={handleLoadFiles}>
            Load Files
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileImport;
