import { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, Trash2, Eye, RefreshCw, Loader, Check, AlertCircle, RotateCcw, Lock, Plus, ExternalLink } from 'lucide-react';
import api from '../utils/api';
import Pagination from '../components/Pagination';

function formatDate(dateString) {
  const date = new Date(dateString);
  const options = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  };
  return date.toLocaleDateString('en-US', options);
}

function getFileIcon(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  if (['pdf'].includes(ext)) return '📄';
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return '🖼️';
  if (['csv', 'xlsx', 'json'].includes(ext)) return '📊';
  if (['txt', 'md', 'html', 'docx'].includes(ext)) return '📝';
  return '📦';
}

const UPLOAD_STATES = {
  PENDING: 'pending',
  UPLOADING: 'uploading',
  SUCCESS: 'success',
  ERROR: 'error',
};

export default function TrainAI() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadError, setUploadError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadErrors, setUploadErrors] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadSection, setShowUploadSection] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('documents'); // 'documents' or 'urls'
  const [docsPage, setDocsPage] = useState(1);
  const [docsLimit, setDocsLimit] = useState(20);
  const [urlsPage, setUrlsPage] = useState(1);
  const [urlsLimit, setUrlsLimit] = useState(20);

  // URL states
  const [urlInputs, setUrlInputs] = useState(['']);
  const [urlPageNames, setUrlPageNames] = useState(['']);
  const [showUrlUploadSection, setShowUrlUploadSection] = useState(false);
  const [urlUploadProgress, setUrlUploadProgress] = useState({});
  const [urlUploadErrors, setUrlUploadErrors] = useState({});
  const [isUrlUploading, setIsUrlUploading] = useState(false);
  const [urlSearchQuery, setUrlSearchQuery] = useState('');

  // Fetch documents
  const { data: documentsData, isLoading: docsLoading, refetch } = useQuery({
    queryKey: ['train-documents'],
    queryFn: async () => {
      const { data } = await api.get('/api/train-chatbot');
      return data;
    },
  });

  const allDocuments = documentsData?.data || [];

  const filteredDocuments = allDocuments.filter((doc) => {
    const query = searchQuery.toLowerCase();
    return (
      doc.filename.toLowerCase().includes(query) ||
      (doc.ai_response_id && doc.ai_response_id.toLowerCase().includes(query))
    );
  });

  // Fetch URLs
  const { data: urlsData, isLoading: urlsLoading, refetch: refetchUrls } = useQuery({
    queryKey: ['train-urls'],
    queryFn: async () => {
      const { data } = await api.get('/api/train-chatbot-url');
      return data;
    },
  });

  const allUrls = urlsData?.data || [];

  const filteredUrls = allUrls.filter((url) => {
    const query = urlSearchQuery.toLowerCase();
    return (
      url.page_name.toLowerCase().includes(query) ||
      url.url.toLowerCase().includes(query) ||
      (url.ai_response_id && url.ai_response_id.toLowerCase().includes(query))
    );
  });

  // Delete/Revert mutation
  const revertMutation = useQuery({
    queryKey: ['train-documents'],
    enabled: false,
  });

  const handleRevert = async (documentId) => {
    try {
      await api.delete(`/api/train-chatbot/${documentId}`);
      queryClient.invalidateQueries({ queryKey: ['train-documents'] });
    } catch (error) {
      console.error('Revert failed:', error);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadError('');
    const maxSize = 50 * 1024 * 1024; // 50MB

    const validFiles = [];
    for (const file of files) {
      if (file.size > maxSize) {
        setUploadError(`${file.name}: exceeds 50MB limit`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setUploadedFiles(validFiles);
      setUploadProgress(
        Object.fromEntries(validFiles.map((f, i) => [i, UPLOAD_STATES.PENDING]))
      );
      setShowConfirmation(true);
    }
  };

  const handleConfirmUpload = async () => {
    setIsUploading(true);
    setUploadError('');
    setUploadErrors({});

    try {
      let hasErrors = false;

      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        setUploadProgress((prev) => ({
          ...prev,
          [i]: UPLOAD_STATES.UPLOADING,
        }));

        try {
          const formData = new FormData();
          formData.append('file', file);
          const { data } = await api.post('/api/train-chatbot/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });

          // Check if the ingest API returned success
          const ingestData = data?.ingestData;

          if (ingestData?.success) {
            setUploadProgress((prev) => ({
              ...prev,
              [i]: UPLOAD_STATES.SUCCESS,
            }));
          } else {
            // API returned false success or error
            hasErrors = true;
            const errorMsg = ingestData?.message || 'Ingest failed';
            setUploadProgress((prev) => ({
              ...prev,
              [i]: UPLOAD_STATES.ERROR,
            }));
            setUploadErrors((prev) => ({
              ...prev,
              [i]: errorMsg,
            }));
          }
        } catch (error) {
          hasErrors = true;
          const errorMsg = error?.response?.data?.error || 'Upload failed';
          setUploadProgress((prev) => ({
            ...prev,
            [i]: UPLOAD_STATES.ERROR,
          }));
          setUploadErrors((prev) => ({
            ...prev,
            [i]: errorMsg,
          }));
        }
      }

      // Refresh documents after all uploads (but keep UI visible)
      if (!hasErrors) {
        await queryClient.invalidateQueries({ queryKey: ['train-documents'] });
        await refetch();
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleRefreshUploadSection = () => {
    setUploadedFiles([]);
    setShowConfirmation(false);
    setUploadProgress({});
    setUploadErrors({});
    setUploadError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Prevent page unload/refresh during upload
  useEffect(() => {
    if (!isUploading && !isUrlUploading) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isUploading, isUrlUploading]);

  // URL Handlers
  const handleAddUrlInput = () => {
    if (urlInputs.length < 5) {
      setUrlInputs([...urlInputs, '']);
      setUrlPageNames([...urlPageNames, '']);
    }
  };

  const handleRemoveUrlInput = (index) => {
    setUrlInputs(urlInputs.filter((_, i) => i !== index));
    setUrlPageNames(urlPageNames.filter((_, i) => i !== index));
  };

  const handleUrlInputChange = (index, value) => {
    const newInputs = [...urlInputs];
    newInputs[index] = value;
    setUrlInputs(newInputs);
  };

  const handleUrlPageNameChange = (index, value) => {
    const newPageNames = [...urlPageNames];
    newPageNames[index] = value;
    setUrlPageNames(newPageNames);
  };

  const handleIngestUrls = async () => {
    const validUrls = urlInputs.filter((url) => url.trim());
    if (validUrls.length === 0) {
      alert('Please enter at least one URL');
      return;
    }

    setIsUrlUploading(true);
    setUrlUploadErrors({});

    try {
      const { data } = await api.post('/api/train-chatbot-url/ingest', {
        urls: validUrls,
        pageNames: urlPageNames,
      });

      const ingestDataArray = data?.ingestData || [];

      // Update progress for each URL
      ingestDataArray.forEach((result, index) => {
        if (result?.success) {
          setUrlUploadProgress((prev) => ({
            ...prev,
            [index]: UPLOAD_STATES.SUCCESS,
          }));
        } else {
          setUrlUploadProgress((prev) => ({
            ...prev,
            [index]: UPLOAD_STATES.ERROR,
          }));
          setUrlUploadErrors((prev) => ({
            ...prev,
            [index]: result?.message || 'Ingest failed',
          }));
        }
      });

      // Refresh URLs list
      await queryClient.invalidateQueries({ queryKey: ['train-urls'] });
      await refetchUrls();

      // Reset after 2 seconds
      setTimeout(() => {
        setUrlInputs(['']);
        setUrlPageNames(['']);
        setUrlUploadProgress({});
        setUrlUploadErrors({});
      }, 2000);
    } catch (error) {
      const errorMsg = error?.response?.data?.error || 'Upload failed';
      alert(`Error: ${errorMsg}`);
    } finally {
      setIsUrlUploading(false);
    }
  };

  const handleRevertUrl = async (urlId) => {
    try {
      await api.delete(`/api/train-chatbot-url/${urlId}`);
      queryClient.invalidateQueries({ queryKey: ['train-urls'] });
      await refetchUrls();
    } catch (error) {
      console.error('Revert failed:', error);
    }
  };

  const handleCancelUpload = () => {
    setUploadedFiles([]);
    setShowConfirmation(false);
    setUploadError('');
    setUploadProgress({});
    setUploadErrors({});
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRetryFile = async (index) => {
    const file = uploadedFiles[index];
    setUploadProgress((prev) => ({
      ...prev,
      [index]: UPLOAD_STATES.UPLOADING,
    }));
    setUploadErrors((prev) => ({
      ...prev,
      [index]: undefined,
    }));

    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/api/train-chatbot/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const ingestData = data?.ingestData;

      if (ingestData?.success) {
        setUploadProgress((prev) => ({
          ...prev,
          [index]: UPLOAD_STATES.SUCCESS,
        }));
      } else {
        const errorMsg = ingestData?.message || 'Ingest failed';
        setUploadProgress((prev) => ({
          ...prev,
          [index]: UPLOAD_STATES.ERROR,
        }));
        setUploadErrors((prev) => ({
          ...prev,
          [index]: errorMsg,
        }));
      }
    } catch (error) {
      const errorMsg = error?.response?.data?.error || 'Upload failed';
      setUploadProgress((prev) => ({
        ...prev,
        [index]: UPLOAD_STATES.ERROR,
      }));
      setUploadErrors((prev) => ({
        ...prev,
        [index]: errorMsg,
      }));
    }
  };

  const handleViewDocument = (documentId) => {
    window.open(`/api/train-chatbot/${documentId}/view`, '_blank');
  };

  return (
    <>
      {(isUploading || isUrlUploading) && (
        <div className="upload-blocking-overlay">
          <div className="overlay-content">
            <Loader size={40} className="spin" />
            <h3>Training in Progress</h3>
            <p>Please wait while your files are being trained.</p>
            <p className="warning-text">⚠️ Do not close, refresh, or navigate away from this page.</p>
          </div>
        </div>
      )}

      <div className="page-heading">
        <div>
          <p className="eyebrow">AI Training</p>
          <h1 className="page-title">Train Chatbot</h1>
        </div>
      </div>

      {/* Section Buttons */}
      <div className="section-buttons-group">
        <button
          className={`section-button ${activeTab === 'documents' ? 'active' : ''}`}
          onClick={() => setActiveTab('documents')}
        >
          Ingested Documents
        </button>
        <button
          className={`section-button ${activeTab === 'urls' ? 'active' : ''}`}
          onClick={() => setActiveTab('urls')}
        >
          Ingested URLs
        </button>
      </div>

      <div className="train-ai-container">
        {/* DOCUMENTS SECTION */}
        {activeTab === 'documents' && (
          <>
            {/* Upload Section */}
        {showUploadSection && (
          <section className="panel upload-panel">
            <div className="panel-header">
              <h2>Upload Documents to Train</h2>
              <div className="header-buttons">
                {/* Show refresh button if upload is done (has results) */}
                {showConfirmation && Object.keys(uploadProgress).length > 0 && !isUploading && (
                  <button
                    type="button"
                    className="btn-icon refresh-btn"
                    title="Clear and refresh upload section"
                    onClick={handleRefreshUploadSection}
                  >
                    <RefreshCw size={18} />
                  </button>
                )}
                <button
                  type="button"
                  className="btn-icon close-btn"
                  title={isUploading ? "Cannot close during upload" : "Close"}
                  disabled={isUploading}
                  onClick={() => {
                    if (!isUploading) {
                      setShowUploadSection(false);
                      setUploadedFiles([]);
                      setShowConfirmation(false);
                      setUploadProgress({});
                      setUploadError('');
                      setUploadErrors({});
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {isUploading && (
              <div className="upload-in-progress-banner">
                <Lock size={18} />
                <span>Upload in progress. Please don't close this tab or refresh the page.</span>
              </div>
            )}

          {!showConfirmation && (
            <div className="upload-area">
              <div className="upload-prompt">
                <Upload size={32} />
                <p>Click to upload files (max 50MB each)</p>
                <small>Supported: PDF, Images, CSV, Excel, Text, HTML, Word | Select multiple files</small>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                disabled={isUploading}
                className="file-input-hidden"
                accept=".pdf,.txt,.md,.jpg,.jpeg,.png,.webp,.csv,.xlsx,.json,.html,.docx"
                multiple
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader size={18} className="spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    Choose Files
                  </>
                )}
              </button>
              {uploadError && <div className="error-text">{uploadError}</div>}
            </div>
          )}

          {showConfirmation && uploadedFiles.length > 0 && (
            <div className="confirmation-section">
              <h3 className="section-title">
                Training {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''}
              </h3>

              <div className="files-list">
                {uploadedFiles.map((file, index) => {
                  const state = uploadProgress[index];
                  const isSuccess = state === UPLOAD_STATES.SUCCESS;
                  const isError = state === UPLOAD_STATES.ERROR;
                  const isUploading = state === UPLOAD_STATES.UPLOADING;
                  const isPending = state === UPLOAD_STATES.PENDING;

                  return (
                    <div key={index} className={`file-item ${state}`}>
                      <div className="file-header">
                        <span className="file-icon">{getFileIcon(file.name)}</span>
                        <div className="file-info">
                          <p className="file-name">{file.name}</p>
                          <small>{(file.size / 1024 / 1024).toFixed(2)} MB</small>
                        </div>
                        <div className="file-status">
                          {isSuccess && (
                            <>
                              <Check size={20} className="status-icon success" />
                              <span className="status-text success">Done</span>
                            </>
                          )}
                          {isError && (
                            <>
                              <AlertCircle size={20} className="status-icon error" />
                              <span className="status-text error">Failed</span>
                              <button
                                type="button"
                                className="btn-icon retry-btn"
                                title="Retry"
                                onClick={() => handleRetryFile(index)}
                              >
                                <RotateCcw size={18} />
                              </button>
                            </>
                          )}
                          {isUploading && (
                            <>
                              <Loader size={20} className="status-icon uploading spin" />
                              <span className="status-text uploading">Uploading...</span>
                            </>
                          )}
                          {isPending && (
                            <>
                              <div className="status-badge">Pending</div>
                            </>
                          )}
                        </div>
                      </div>
                      {isUploading && (
                        <div className="progress-bar">
                          <div className="progress-fill"></div>
                        </div>
                      )}
                      {isError && uploadErrors[index] && (
                        <div className="error-message">
                          {uploadErrors[index]}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="button-group">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleConfirmUpload}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader size={18} className="spin" />
                      Training...
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      Start Training
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCancelUpload}
                  disabled={isUploading}
                >
                  Cancel
                </button>
              </div>

              {uploadError && <div className="error-text">{uploadError}</div>}
            </div>
          )}
          </section>
        )}

            {/* Documents List */}
            <section className="panel">
              <div className="panel-header">
                <h2>Trained Documents</h2>
            <div className="header-actions">
              <input
                type="text"
                placeholder="Search by filename or document ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input-header"
              />
              {!showUploadSection && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setShowUploadSection(true)}
                >
                  <Upload size={18} />
                  Train Chatbot with Document
                </button>
              )}
            </div>
          </div>

            {docsLoading && (
              <div className="empty-state">Loading documents...</div>
            )}

            {!docsLoading && filteredDocuments.length === 0 && (
              <div className="empty-state">
                {searchQuery ? 'No documents found matching your search.' : 'No documents uploaded yet.'}
              </div>
            )}

            {!docsLoading && filteredDocuments.length > 0 && (
              <>
                <div className="table-wrap scrollable">
                  <table>
                    <thead>
                      <tr>
                        <th>Filename</th>
                        <th>Trained Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDocuments.slice((docsPage - 1) * docsLimit, docsPage * docsLimit).map((doc) => (
                      <tr key={doc.id} className={!doc.is_active ? 'reverted-row' : ''}>
                        <td>
                          <span className="filename-cell">
                            {getFileIcon(doc.filename)} {doc.filename}
                          </span>
                        </td>
                        <td>{formatDate(doc.trained_date)}</td>
                        <td>
                          <span
                            className={`badge ${
                              doc.is_active ? 'badge-yes' : 'badge-reverted'
                            }`}
                          >
                            {doc.is_active ? 'Active' : 'Reverted from AI'}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              type="button"
                              className="btn-icon"
                              title="View document"
                              onClick={() => handleViewDocument(doc.id)}
                            >
                              <Eye size={18} />
                            </button>
                            {doc.is_active && (
                              <button
                                type="button"
                                className="btn-icon btn-danger"
                                title="Revoke from AI"
                                onClick={() => handleRevert(doc.id)}
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  page={docsPage}
                  limit={docsLimit}
                  total={filteredDocuments.length}
                  onPageChange={setDocsPage}
                  onLimitChange={setDocsLimit}
                />
              </>
            )}
            </section>
          </>
        )}

        {/* URLS SECTION */}
        {activeTab === 'urls' && (
          <>
            {/* URL Upload Section */}
        {showUrlUploadSection && (
          <section className="panel upload-panel">
            <div className="panel-header">
              <h2>Train Chatbot with URLs</h2>
              <div className="header-buttons">
                {Object.keys(urlUploadProgress).length > 0 && !isUrlUploading && (
                  <button
                    type="button"
                    className="btn-icon refresh-btn"
                    title="Clear and refresh upload section"
                    onClick={() => {
                      setUrlInputs(['']);
                      setUrlPageNames(['']);
                      setUrlUploadProgress({});
                      setUrlUploadErrors({});
                    }}
                  >
                    <RefreshCw size={18} />
                  </button>
                )}
                <button
                  type="button"
                  className="btn-icon close-btn"
                  title={isUrlUploading ? "Cannot close during upload" : "Close"}
                  disabled={isUrlUploading}
                  onClick={() => {
                    if (!isUrlUploading) {
                      setShowUrlUploadSection(false);
                      setUrlInputs(['']);
                      setUrlPageNames(['']);
                      setUrlUploadProgress({});
                      setUrlUploadErrors({});
                    }
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {isUrlUploading && (
              <div className="upload-in-progress-banner">
                <Lock size={18} />
                <span>Upload in progress. Please don't close this tab or refresh the page.</span>
              </div>
            )}

            {!Object.keys(urlUploadProgress).length > 0 && (
              <div className="url-inputs-section">
                <div className="url-inputs-list">
                  {urlInputs.map((url, index) => (
                    <div key={index} className="url-input-row">
                      <div className="input-group">
                        <label>Page Name</label>
                        <input
                          type="text"
                          placeholder="e.g., Solar Products"
                          value={urlPageNames[index]}
                          onChange={(e) => handleUrlPageNameChange(index, e.target.value)}
                          disabled={isUrlUploading}
                        />
                      </div>
                      <div className="input-group">
                        <label>URL</label>
                        <input
                          type="url"
                          placeholder="https://example.com"
                          value={url}
                          onChange={(e) => handleUrlInputChange(index, e.target.value)}
                          disabled={isUrlUploading}
                        />
                      </div>
                      {urlInputs.length > 1 && (
                        <button
                          type="button"
                          className="btn-icon remove-btn"
                          onClick={() => handleRemoveUrlInput(index)}
                          disabled={isUrlUploading}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {urlInputs.length < 5 && (
                  <button
                    type="button"
                    className="btn-icon add-url-btn"
                    onClick={handleAddUrlInput}
                    disabled={isUrlUploading}
                  >
                    <Plus size={18} />
                    Add Another URL
                  </button>
                )}

                <div className="button-group">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleIngestUrls}
                    disabled={isUrlUploading || !urlInputs.some((u) => u.trim())}
                  >
                    {isUrlUploading ? (
                      <>
                        <Loader size={18} className="spin" />
                        Training...
                      </>
                    ) : (
                      <>
                        <Upload size={18} />
                        Start Training
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowUrlUploadSection(false);
                      setUrlInputs(['']);
                      setUrlPageNames(['']);
                    }}
                    disabled={isUrlUploading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {Object.keys(urlUploadProgress).length > 0 && (
              <div className="url-results">
                {urlInputs.map((url, index) => {
                  const state = urlUploadProgress[index];
                  return (
                    <div key={index} className={`url-result-item ${state || 'pending'}`}>
                      <div className="result-header">
                        <div className="result-info">
                          <p className="result-page-name">{urlPageNames[index] || new URL(url).hostname}</p>
                          <small className="result-url">{url}</small>
                        </div>
                        <div className="result-status">
                          {state === UPLOAD_STATES.SUCCESS && (
                            <>
                              <Check size={20} className="status-icon success" />
                              <span className="status-text success">Done</span>
                            </>
                          )}
                          {state === UPLOAD_STATES.ERROR && (
                            <>
                              <AlertCircle size={20} className="status-icon error" />
                              <span className="status-text error">Failed</span>
                              <button
                                type="button"
                                className="btn-icon retry-btn"
                                onClick={() => handleIngestUrls()}
                              >
                                <RotateCcw size={18} />
                              </button>
                            </>
                          )}
                          {state === UPLOAD_STATES.UPLOADING && (
                            <>
                              <Loader size={20} className="status-icon uploading spin" />
                              <span className="status-text uploading">Uploading...</span>
                            </>
                          )}
                          {!state && (
                            <div className="status-badge">Pending</div>
                          )}
                        </div>
                      </div>
                      {urlUploadErrors[index] && (
                        <div className="error-message">
                          {urlUploadErrors[index]}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

            {/* URL List Section */}
            <section className="panel">
              <div className="panel-header">
                <h2>Trained URLs</h2>
            <div className="header-actions">
              <input
                type="text"
                placeholder="Search by URL or page name..."
                value={urlSearchQuery}
                onChange={(e) => setUrlSearchQuery(e.target.value)}
                className="search-input-header"
              />
              {!showUrlUploadSection && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setShowUrlUploadSection(true)}
                >
                  <Upload size={18} />
                  Train Chatbot with URLs
                </button>
              )}
            </div>
          </div>

          {urlsLoading && (
            <div className="empty-state">Loading URLs...</div>
          )}

          {!urlsLoading && filteredUrls.length === 0 && (
            <div className="empty-state">
              {urlSearchQuery ? 'No URLs found matching your search.' : 'No URLs uploaded yet.'}
            </div>
          )}

          {!urlsLoading && filteredUrls.length > 0 && (
            <>
              <div className="table-wrap scrollable">
                <table>
                  <thead>
                    <tr>
                      <th>Page Name</th>
                      <th>URL</th>
                      <th>Trained Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUrls.slice((urlsPage - 1) * urlsLimit, urlsPage * urlsLimit).map((url) => (
                      <tr key={url.id} className={!url.is_active ? 'reverted-row' : ''}>
                        <td>
                          <span className="page-name-cell">{url.page_name}</span>
                        </td>
                        <td>
                          <a
                            href={url.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="url-cell"
                            title={url.url}
                          >
                            {url.url.length > 50 ? url.url.substring(0, 50) + '...' : url.url}
                            <ExternalLink size={14} className="external-icon" />
                          </a>
                        </td>
                        <td>{formatDate(url.trained_date)}</td>
                        <td>
                          <span
                            className={`badge ${
                              url.is_active ? 'badge-yes' : 'badge-reverted'
                            }`}
                          >
                            {url.is_active ? 'Active' : 'Reverted from AI'}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            {url.is_active && (
                              <button
                                type="button"
                                className="btn-icon btn-danger"
                                title="Revoke from AI"
                                onClick={() => handleRevertUrl(url.id)}
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={urlsPage}
                limit={urlsLimit}
                total={filteredUrls.length}
                onPageChange={setUrlsPage}
                onLimitChange={setUrlsLimit}
              />
            </>
          )}
            </section>
          </>
        )}
      </div>

      <style>{`
        .section-buttons-group {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .section-button {
          padding: 1.2rem 1.5rem;
          background: #f0f0f0;
          border: none;
          border-radius: 8px;
          color: #333;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .section-button:hover {
          background: #e8e8e8;
        }

        .section-button.active {
          background: linear-gradient(135deg, #c8723e 0%, #b86533 100%);
          color: white;
          box-shadow: 0 8px 20px rgba(200, 114, 62, 0.25);
        }

        .train-ai-container {
          display: grid;
          gap: 2rem;
        }

        .url-inputs-section {
          padding: 2rem;
        }

        .url-inputs-list {
          display: grid;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .url-input-row {
          display: grid;
          grid-template-columns: 1fr 2fr auto;
          gap: 1rem;
          align-items: flex-end;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .input-group label {
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--color-text-secondary);
        }

        .input-group input {
          padding: 0.75rem;
          border: 1px solid var(--color-border);
          border-radius: 6px;
          font-size: 0.9rem;
          background: var(--color-bg);
          color: var(--color-text-primary);
        }

        .input-group input:focus {
          outline: none;
          border-color: #c8723e;
          box-shadow: 0 0 0 3px rgba(200, 114, 62, 0.1);
        }

        .remove-btn {
          color: #f44336;
          cursor: pointer;
        }

        .remove-btn:hover {
          color: #d32f2f;
        }

        .add-url-btn {
          padding: 0.75rem 1rem;
          background: var(--color-bg-secondary);
          border: 1px dashed var(--color-border);
          border-radius: 6px;
          color: var(--color-text-primary);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .add-url-btn:hover:not(:disabled) {
          background: var(--color-bg);
          border-color: #c8723e;
          color: #c8723e;
        }

        .add-url-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .url-results {
          display: grid;
          gap: 1rem;
          padding: 2rem;
        }

        .url-result-item {
          padding: 1rem;
          background: var(--color-bg);
          border: 1px solid var(--color-border);
          border-radius: 8px;
        }

        .url-result-item.success {
          border-color: #4caf50;
          background: #f1f8f4;
        }

        .url-result-item.error {
          border-color: #f44336;
          background: #fef5f5;
        }

        .result-header {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 1rem;
          align-items: center;
        }

        .result-info {
          min-width: 0;
        }

        .result-page-name {
          margin: 0;
          font-weight: 500;
          color: var(--color-text-primary);
        }

        .result-url {
          display: block;
          color: var(--color-text-secondary);
          font-size: 0.85rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 0.25rem;
        }

        .result-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          white-space: nowrap;
        }

        .page-name-cell {
          font-weight: 500;
          color: var(--color-text-primary);
        }

        .url-cell {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #c8723e;
          text-decoration: none;
          word-break: break-all;
        }

        .url-cell:hover {
          text-decoration: underline;
        }

        .external-icon {
          flex-shrink: 0;
        }

        @media (max-width: 768px) {
          .tab-button-group {
            gap: 0.5rem;
          }

          .tab-button {
            padding: 0.75rem 1rem;
            font-size: 0.9rem;
          }

          .url-input-row {
            grid-template-columns: 1fr;
          }

          .result-header {
            grid-template-columns: 1fr;
          }

          .button-group {
            flex-direction: column;
          }
        }

        .train-ai-container {
          display: grid;
          gap: 2rem;
        }

        .upload-panel {
          /* inherits default panel styling */
        }

        .header-buttons {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .refresh-btn {
          color: var(--color-primary);
          cursor: pointer;
          transition: color 0.2s ease;
        }

        .refresh-btn:hover {
          color: var(--color-primary-dark);
        }

        .close-btn {
          font-size: 1.2rem;
          line-height: 1;
          cursor: pointer;
          transition: color 0.2s ease;
        }

        .close-btn:hover:not(:disabled) {
          color: var(--color-primary);
        }

        .close-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .upload-in-progress-banner {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background: #fff3e0;
          border-bottom: 1px solid var(--color-border);
          color: #e65100;
          font-weight: 500;
        }

        .upload-in-progress-banner svg {
          color: #ff6f00;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        .upload-blocking-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          backdrop-filter: blur(2px);
        }

        .overlay-content {
          background: white;
          padding: 2rem;
          border-radius: 12px;
          text-align: center;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
          max-width: 400px;
        }

        .overlay-content h3 {
          margin: 1rem 0 0.5rem 0;
          color: var(--color-text-primary);
          font-size: 1.3rem;
        }

        .overlay-content p {
          margin: 0.5rem 0;
          color: var(--color-text-secondary);
          font-size: 0.95rem;
        }

        .overlay-content .warning-text {
          margin-top: 1rem;
          color: #d32f2f;
          font-weight: 500;
        }

        .overlay-content .spin {
          color: var(--color-primary);
          animation: spin 1s linear infinite;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .search-input-header {
          min-width: 250px;
          padding: 0.5rem 0;
          border: none;
          border-bottom: 2px solid #c8723e;
          border-radius: 0;
          font-size: 0.9rem;
          background: transparent;
          color: var(--color-text-primary);
          transition: border-color 0.2s ease;
        }

        .search-input-header::placeholder {
          color: var(--color-text-tertiary);
        }

        .search-input-header:focus {
          outline: none;
          border-bottom-color: #c8723e;
        }

        .table-wrap.scrollable {
          max-height: 600px;
          overflow-y: auto;
          border-radius: 6px;
        }

        .table-wrap.scrollable table {
          width: 100%;
        }

        .table-wrap.scrollable thead {
          position: sticky;
          top: 0;
          background: var(--color-bg-secondary);
          z-index: 10;
        }

        .upload-area {
          border: 2px dashed var(--color-border);
          border-radius: 8px;
          padding: 2rem;
          text-align: center;
          background: var(--color-bg-secondary);
        }

        .upload-prompt {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          color: var(--color-text-secondary);
        }

        .upload-prompt svg {
          color: var(--color-text-tertiary);
        }

        .upload-prompt p {
          margin: 0;
          font-weight: 500;
        }

        .upload-prompt small {
          display: block;
          font-size: 0.85rem;
          margin-top: 0.25rem;
        }

        .file-input-hidden {
          display: none;
        }

        .confirmation-section {
          padding: 2rem;
          background: var(--color-bg-secondary);
          border-radius: 8px;
          margin-bottom: 1rem;
        }

        .section-title {
          margin: 0 0 1.5rem 0;
          font-size: 1.1rem;
          color: var(--color-text-primary);
        }

        .files-list {
          display: grid;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .file-item {
          padding: 1rem;
          background: var(--color-bg);
          border-radius: 8px;
          border: 1px solid var(--color-border);
        }

        .file-item.success {
          border-color: #4caf50;
          background: #f1f8f4;
        }

        .file-item.error {
          border-color: #f44336;
          background: #fef5f5;
        }

        .file-item.uploading {
          border-color: var(--color-primary);
          background: var(--color-bg);
        }

        .file-header {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 1rem;
          align-items: center;
        }

        .file-icon {
          font-size: 1.5rem;
        }

        .file-info {
          min-width: 0;
        }

        .file-name {
          margin: 0;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: var(--color-text-primary);
        }

        .file-info small {
          display: block;
          color: var(--color-text-secondary);
          font-size: 0.85rem;
        }

        .file-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          white-space: nowrap;
        }

        .status-icon {
          display: inline-block;
        }

        .status-icon.success {
          color: #4caf50;
        }

        .status-icon.error {
          color: #f44336;
        }

        .status-icon.uploading {
          color: var(--color-primary);
        }

        .status-text {
          font-size: 0.9rem;
          font-weight: 500;
        }

        .status-text.success {
          color: #4caf50;
        }

        .status-text.error {
          color: #f44336;
        }

        .status-text.uploading {
          color: var(--color-primary);
        }

        .status-badge {
          padding: 0.25rem 0.75rem;
          background: var(--color-bg-secondary);
          border-radius: 12px;
          font-size: 0.85rem;
          color: var(--color-text-secondary);
        }

        .retry-btn {
          color: #f44336;
          cursor: pointer;
          transition: color 0.2s ease;
        }

        .retry-btn:hover {
          color: #d32f2f;
        }

        .error-message {
          margin-top: 0.75rem;
          padding: 0.75rem;
          background: #fef5f5;
          border-left: 3px solid #f44336;
          border-radius: 4px;
          color: #f44336;
          font-size: 0.85rem;
          line-height: 1.4;
        }

        .progress-bar {
          width: 100%;
          height: 4px;
          background: var(--color-border);
          border-radius: 2px;
          margin-top: 0.75rem;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(
            90deg,
            var(--color-primary),
            var(--color-primary-light)
          );
          animation: progress 2s ease-in-out infinite;
        }

        @keyframes progress {
          0% { width: 0%; }
          50% { width: 100%; }
          100% { width: 100%; }
        }

        .confirmation-message {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: var(--color-bg);
          border-radius: 8px;
          border-left: 4px solid var(--color-primary);
        }

        .file-icon {
          font-size: 2rem;
        }

        .confirmation-text {
          margin: 0;
          font-size: 1rem;
        }

        .button-group {
          display: flex;
          gap: 1rem;
        }

        .button-group .btn {
          flex: 1;
        }

        .filename-cell {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-family: system-ui, -apple-system, sans-serif;
        }

        .action-buttons {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .reverted-row {
          opacity: 0.6;
          background: var(--color-bg-secondary);
        }

        .badge-reverted {
          background-color: #fee;
          color: #c00;
        }

        .text-muted {
          color: var(--color-text-tertiary);
          font-size: 0.9rem;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @media (max-width: 768px) {
          .table-wrap {
            overflow-x: auto;
          }

          .button-group {
            flex-direction: column;
          }

          .file-header {
            grid-template-columns: auto 1fr;
          }

          .file-status {
            grid-column: 2;
            margin-top: 0.5rem;
          }

          .confirmation-message {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </>
  );
}
