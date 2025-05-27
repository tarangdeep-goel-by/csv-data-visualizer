import { useState, useEffect } from 'react'
import { 
  Box,
  Typography
} from '@mui/material'
import { api, isAxiosError } from './utils/api'
import { Upload } from './components/Upload'
import { Metadata } from './components/Metadata'
import { Data } from './components/Data'
import { Metadata as MetadataType, CompleteData, FilterState, ColumnFilter } from './components/types'
import { Visualization } from './components/Visualization'
import { VersionManager } from './components/VersionManager/VersionManager'
import type { Version } from './components/VersionManager/types'
import { FileManager, FileInfo } from './components/FileManager'

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [metadata, setMetadata] = useState<MetadataType | null>(null)
  const [completeData, setCompleteData] = useState<CompleteData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showClassifications, setShowClassifications] = useState(false)
  const [showDimensionFlags, setShowDimensionFlags] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filterState, setFilterState] = useState<FilterState>({
    dimensions: [],
    metrics: [],
    filters: [],
    visualization_metrics: []
  })
  const [tempFilterState, setTempFilterState] = useState<FilterState>({
    dimensions: [],
    metrics: [],
    filters: [],
    visualization_metrics: []
  })
  const [pendingMetadata, setPendingMetadata] = useState<MetadataType | null>(null)
  const [versions, setVersions] = useState<Version[]>([])
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(null)
  const [parentId, setParentId] = useState<string | null>(null)
  const [hasExistingFiles, setHasExistingFiles] = useState<boolean>(false)
  const [checkingForFiles, setCheckingForFiles] = useState<boolean>(true)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      
      // Validate file type
      if (!file.name.toLowerCase().endsWith('.csv')) {
        setError('Please upload a CSV file');
        return;
      }

      // Validate file size (e.g., max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        setError('File size should be less than 50MB');
        return;
      }

      setFile(file);
      setError(null);
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/upload', formData);
      
      // Only validate metrics since dimensions can be added later
      if (response.data.column_classifications.metrics.length === 0) {
        setError('No metric columns identified in the file. Please ensure your CSV contains at least one metric column.');
        return;
      }

      setMetadata(response.data);
      setPendingMetadata(response.data);
      setParentId(response.data.parent_id);
      setCurrentVersionId(null);
      setVersions([]);
      setHasExistingFiles(true);
      
      // Initialize filter state with index dimension and all metrics
      const initialFilterState = {
        dimensions: [response.data.dimension_flags.index_dimension],
        metrics: response.data.column_classifications.metrics,
        filters: [],
        visualization_metrics: []
      };
      setFilterState(initialFilterState);
      setTempFilterState(initialFilterState);
      await fetchCompleteData(initialFilterState);
      
      // Automatically create an initial version with the original filename
      try {
        await api.post('/versions/save?parent_id=' + response.data.parent_id, {
          filter_criteria: initialFilterState,
          name: "Initial upload",
          description: file.name, // Save original filename in description
          created_by: "default_user"
        });
        
        // Fetch the updated versions list
        const versionsResponse = await api.get('/versions/list?parent_id=' + response.data.parent_id);
        setVersions(versionsResponse.data);
        if (versionsResponse.data.length > 0) {
          setCurrentVersionId(versionsResponse.data[0].id);
        }
      } catch (versionErr) {
        console.error('Error creating initial version:', versionErr);
        // Don't fail the upload if version creation fails
      }
      
    } catch (err) {
      if (isAxiosError(err)) {
        const errorMessage = err.response?.data?.detail || err.message;
        setError(`Error uploading file: ${errorMessage}`);
      } else {
        setError('Error uploading file. Please try again.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const fetchCompleteData = async (filterData?: FilterState) => {
    try {
      setLoading(true)
      const dataToSend = filterData || filterState
      console.log('Sending filter request:', dataToSend)
      const response = await api.post('/data/filter', dataToSend)
      console.log('Received response:', response.data)
      setCompleteData(response.data)
      setError(null)
    } catch (err) {
      console.error('Error fetching complete data:', err)
      if (isAxiosError(err)) {
        setError(`Error fetching data: ${err.response?.data?.detail || err.message}`)
      } else {
        setError('Error fetching data. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    try {
      const response = await api.get('/download', {
        responseType: 'blob'
      })
      
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'data.csv'
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError('Error downloading file. Please try again.')
      console.error(err)
    }
  }

  const handleClassificationChange = async (column: string, isMetric: boolean) => {
    if (!metadata || !pendingMetadata) return;

    const newClassifications = {
      dimensions: [...pendingMetadata.column_classifications.dimensions],
      metrics: [...pendingMetadata.column_classifications.metrics]
    };

    if (isMetric) {
      newClassifications.metrics.push(column);
      newClassifications.dimensions = newClassifications.dimensions.filter(c => c !== column);
    } else {
      newClassifications.dimensions.push(column);
      newClassifications.metrics = newClassifications.metrics.filter(c => c !== column);
    }

    // Update pending metadata with new classifications
    const updatedPendingMetadata = {
      ...pendingMetadata,
      column_classifications: newClassifications
    };
    setPendingMetadata(updatedPendingMetadata);

    // Reset temp filter state to include index dimension and all metrics
    setTempFilterState({
      dimensions: [pendingMetadata.dimension_flags.index_dimension],
      metrics: newClassifications.metrics,
      filters: [],
      visualization_metrics: []
    });
  };

  const handleApplyClassifications = async () => {
    if (!pendingMetadata) return;

    try {
      setLoading(true);
      const response = await api.put(
        '/metadata/classifications',
        pendingMetadata.column_classifications
      );
      setMetadata(response.data);
      setPendingMetadata(response.data);
      
      // Create new filter state with index dimension and all metrics
      const newFilterState = {
        dimensions: [response.data.dimension_flags.index_dimension],
        metrics: response.data.column_classifications.metrics,
        filters: [],
        visualization_metrics: []
      };
      
      // Apply filter changes
      setFilterState(newFilterState);
      setTempFilterState(newFilterState);
      await fetchCompleteData(newFilterState);
      setShowClassifications(false);
    } catch (err) {
      setError('Error updating classifications. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDimensionFlagsChange = async (indexDimension: string, timeDimension: string | null) => {
    if (!metadata || !pendingMetadata) return;

    const newFlags = {
      index_dimension: indexDimension,
      time_dimension: timeDimension
    };

    // Update pending metadata
    setPendingMetadata({
      ...pendingMetadata,
      dimension_flags: newFlags
    });

    // Update temp filter state to include new index dimension and all metrics
    setTempFilterState({
      dimensions: [indexDimension],
      metrics: pendingMetadata.column_classifications.metrics,
      filters: [],
      visualization_metrics: []
    });
  };

  const handleApplyDimensionFlags = async () => {
    if (!pendingMetadata) return;

    try {
      setLoading(true);
      const response = await api.put(
        '/metadata/dimension-flags',
        pendingMetadata.dimension_flags
      );
      setMetadata(response.data);
      setPendingMetadata(response.data);
      
      // Create new filter state with new index dimension and all metrics
      const newFilterState = {
        dimensions: [response.data.dimension_flags.index_dimension],
        metrics: response.data.column_classifications.metrics,
        filters: [],
        visualization_metrics: []
      };
      
      // Apply filter changes
      setFilterState(newFilterState);
      setTempFilterState(newFilterState);
      await fetchCompleteData(newFilterState);
      setShowDimensionFlags(false);
    } catch (err) {
      if (isAxiosError(err)) {
        setError(`Error updating dimension flags: ${err.response?.data?.detail || err.message}`);
      } else {
        setError('Error updating dimension flags. Please try again.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterUpdate = async (filters: ColumnFilter[]) => {
    const newFilterState = {
      ...filterState,
      filters
    };
    setFilterState(newFilterState);
    await fetchCompleteData(newFilterState);
  };

  const handleRemoveFromView = async (column: string) => {
    if (!metadata) return;
    
    // Don't allow removing index dimension
    if (column === metadata.dimension_flags.index_dimension) return;

    // Create new filter state without the removed column
    const newFilterState = {
      ...filterState,
      dimensions: filterState.dimensions.filter(d => d !== column),
      metrics: filterState.metrics.filter(m => m !== column),
      // Also remove from visualization metrics if it's there
      visualization_metrics: filterState.visualization_metrics.filter(m => m !== column)
    };

    // Update both states
    setFilterState(newFilterState);
    setTempFilterState(newFilterState);

    // Immediately fetch new data
    await fetchCompleteData(newFilterState);
  };

  const handleAddToView = (column: string) => {
    if (!metadata) return;
    
    const isMetric = metadata.column_classifications.metrics.includes(column);
    const newTempFilterState = {
      ...tempFilterState,
      [isMetric ? 'metrics' : 'dimensions']: [...tempFilterState[isMetric ? 'metrics' : 'dimensions'], column]
    };

    setTempFilterState(newTempFilterState);
  };

  const handleApplyFilters = async () => {
    setFilterState(tempFilterState);
    await fetchCompleteData(tempFilterState);
    setShowFilters(false);
  };

  const handleDownloadFilteredView = async () => {
    try {
      const response = await api.post('/download/filtered', filterState, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'filtered_data.csv';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Error downloading filtered view. Please try again.');
      console.error(err);
    }
  };

  const handleVisualizationMetricsChange = async (metrics: string[]) => {
    const newFilterState = {
      ...filterState,
      visualization_metrics: metrics
    };
    setFilterState(newFilterState);
    await fetchCompleteData(newFilterState);
  };

  // Update version management handlers
  const handleSaveVersion = async (name: string, description: string) => {
    try {
      setLoading(true);
      setError(null);
      if (!parentId) throw new Error('No parentId set. Please upload a file first.');
      // Save current view as new version
      const response = await api.post('/versions/save?parent_id=' + parentId,
        {
          filter_criteria: filterState,  // Send filter state as a nested object
          name,
          description
        }
      );
      // Update versions list
      const versionsResponse = await api.get('/versions/list?parent_id=' + parentId);
      setVersions(versionsResponse.data);
      // Set as current version
      setCurrentVersionId(response.data.id);
    } catch (err) {
      console.error('Error saving version:', err);
      if (isAxiosError(err)) {
        setError(`Error saving version: ${err.response?.data?.detail || err.message}`);
      } else {
        setError('Error saving version. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLoadVersion = async (versionId: string) => {
    try {
      setLoading(true);
      setError(null);

      // First, get the version details to retrieve the saved filter criteria
      const versionResponse = await api.get('/versions/' + versionId);
      const version = versionResponse.data;

      // Activate the version's snapshot as the current data file
      await api.post('/versions/' + versionId + '/activate');

      // Fetch the new metadata (as if a new file was uploaded)
      const metadataResponse = await api.get('/metadata');
      const newMetadata = metadataResponse.data;
      setMetadata(newMetadata);
      setPendingMetadata(newMetadata);

      // Restore the EXACT filter state that was saved with this version
      const restoredFilterState = version.filter_criteria;
      setFilterState(restoredFilterState);
      setTempFilterState(restoredFilterState);

      // Set as current version
      setCurrentVersionId(versionId);

      // Fetch data with the restored filter state (now using the snapshot file)
      await fetchCompleteData(restoredFilterState);

    } catch (err) {
      console.error('Error loading version:', err);
      if (isAxiosError(err)) {
        setError(`Error loading version: ${err.response?.data?.detail || err.message}`);
      } else {
        setError('Error loading version. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVersion = async (versionId: string) => {
    try {
      setLoading(true);
      setError(null);
      if (!parentId) throw new Error('No parentId set. Please upload a file first.');
      // Delete version
      await api.delete('/versions/' + versionId);
      // Update versions list
      const versionsResponse = await api.get('/versions/list?parent_id=' + parentId);
      setVersions(versionsResponse.data);
      // If deleted version was current, reset to original
      if (versionId === currentVersionId) {
        setCurrentVersionId(null);
        // Reset to original data
        await fetchCompleteData(filterState);
      }
    } catch (err) {
      console.error('Error deleting version:', err);
      if (isAxiosError(err)) {
        setError(`Error deleting version: ${err.response?.data?.detail || err.message}`);
      } else {
        setError('Error deleting version. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Add effect to fetch versions on mount and when metadata changes
  useEffect(() => {
    const fetchVersions = async () => {
      if (metadata && parentId) {  // Only fetch versions if we have data loaded and parentId
        try {
          const response = await api.get('/versions/list?parent_id=' + parentId);
          setVersions(response.data);
        } catch (err) {
          console.error('Error fetching versions:', err);
        }
      }
    };
    fetchVersions();
  }, [metadata, parentId]);  // Re-fetch when metadata or parentId changes

  // File activation handler
  const handleFileActivate = async (newParentId: string, _fileInfo: FileInfo) => {
    try {
      setLoading(true);
      setError(null);

      // Activate the file (loads most recent version)
      const response = await api.post('/files/' + newParentId + '/activate');
      
      // Set the new context
      setParentId(newParentId);
      setHasExistingFiles(true);

      // Restore the filter state from the activated version (most recent version of this file)
      const restoredFilterState = response.data.activated_version.filter_criteria;
      setFilterState(restoredFilterState);
      setTempFilterState(restoredFilterState);

      // Fetch data for the activated file with the restored filter state
      await fetchCompleteData(restoredFilterState);

    } catch (err) {
      console.error('Error activating file:', err);
      if (isAxiosError(err)) {
        setError(`Error switching to file: ${err.response?.data?.detail || err.message}`);
      } else {
        setError('Error switching to file. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // File deletion handler
  const handleFileDeleted = () => {
    // Clear current state since the active file was deleted
    setMetadata(null);
    setPendingMetadata(null);
    setCompleteData(null);
    setParentId(null);
    setCurrentVersionId(null);
    setVersions([]);
    setFilterState({
      dimensions: [],
      metrics: [],
      filters: [],
      visualization_metrics: []
    });
    setTempFilterState({
      dimensions: [],
      metrics: [],
      filters: [],
      visualization_metrics: []
    });
    
    // Recheck for existing files after deletion
    const recheckFiles = async () => {
      try {
        const response = await api.get('/files/check');
        setHasExistingFiles(response.data.has_existing_files);
      } catch (err) {
        console.error('Error rechecking for existing files:', err);
        setHasExistingFiles(false);
      }
    };
    recheckFiles();
  };

  // Add effect to check for existing files on app start
  useEffect(() => {
    const checkForExistingFiles = async () => {
      try {
        const response = await api.get('/files/check');
        setHasExistingFiles(response.data.has_existing_files);
      } catch (err) {
        console.error('Error checking for existing files:', err);
      } finally {
        setCheckingForFiles(false);
      }
    };
    checkForExistingFiles();
  }, []);

  return (
    <Box sx={{ 
      minHeight: '100vh',
      bgcolor: 'background.default',
      p: 4
    }}>
      <header className="App-header">
        <h1>Data Analysis Tool</h1>
        
        {/* Show loading while checking for existing files */}
        {checkingForFiles && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Checking for existing files...
            </Typography>
          </Box>
        )}
        
        {/* File Manager - Show if we have any data loaded OR if there are existing files */}
        {(metadata || hasExistingFiles) && !checkingForFiles && (
          <FileManager
            currentParentId={parentId}
            onFileActivate={handleFileActivate}
            onFileDeleted={handleFileDeleted}
          />
        )}
        
        <VersionManager
          onSaveVersion={handleSaveVersion}
          onLoadVersion={handleLoadVersion}
          onDeleteVersion={handleDeleteVersion}
          versions={versions}
          currentVersionId={currentVersionId}
          currentParentId={parentId}
        />
      </header>
      <Upload
        file={file}
        loading={loading}
        error={error}
        onFileChange={handleFileChange}
        onUpload={handleUpload}
        onDownload={handleDownload}
        hasData={!!completeData}
      />

      {metadata && (
        <>
          <Metadata
            metadata={metadata}
            loading={loading}
            onDownload={handleDownload}
            onClassificationsChange={handleClassificationChange}
            onDimensionFlagsChange={handleDimensionFlagsChange}
            onApplyClassifications={handleApplyClassifications}
            onApplyDimensionFlags={handleApplyDimensionFlags}
            showClassifications={showClassifications}
            setShowClassifications={setShowClassifications}
            showDimensionFlags={showDimensionFlags}
            setShowDimensionFlags={setShowDimensionFlags}
            pendingMetadata={pendingMetadata}
          />

          <Visualization
            metadata={metadata}
            completeData={completeData}
            loading={loading}
            filterState={filterState}
            onVisualizationMetricsChange={handleVisualizationMetricsChange}
          />

          <Data
            metadata={metadata}
            completeData={completeData}
            loading={loading}
            filterState={filterState}
            onDownloadFilteredView={handleDownloadFilteredView}
            onRemoveFromView={handleRemoveFromView}
            onAddToView={handleAddToView}
            onApplyFilters={handleApplyFilters}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
            tempFilterState={tempFilterState}
            setTempFilterState={setTempFilterState}
            onFilterUpdate={handleFilterUpdate}
          />
        </>
      )}
    </Box>
  )
}

export default App

