import { useState, useEffect } from 'react'
import { 
  Box,
  useTheme
} from '@mui/material'
import axios from 'axios'
import { Upload } from './components/Upload'
import { Metadata } from './components/Metadata'
import { Data } from './components/Data'
import { Metadata as MetadataType, CompleteData, FilterState, ColumnFilter } from './components/types'
import { Visualization } from './components/Visualization'

function App() {
  const theme = useTheme()
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
      const response = await axios.post('http://localhost:8000/upload', formData);
      
      // Only validate metrics since dimensions can be added later
      if (response.data.column_classifications.metrics.length === 0) {
        setError('No metric columns identified in the file. Please ensure your CSV contains at least one metric column.');
        return;
      }

      setMetadata(response.data);
      setPendingMetadata(response.data);
      
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
    } catch (err) {
      if (axios.isAxiosError(err)) {
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
      const response = await axios.post('http://localhost:8000/data/filter', dataToSend)
      console.log('Received response:', response.data)
      setCompleteData(response.data)
      setError(null)
    } catch (err) {
      console.error('Error fetching complete data:', err)
      if (axios.isAxiosError(err)) {
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
      const response = await axios.get('http://localhost:8000/download', {
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
      const response = await axios.put(
        'http://localhost:8000/metadata/classifications',
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
      const response = await axios.put(
        'http://localhost:8000/metadata/dimension-flags',
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
      if (axios.isAxiosError(err)) {
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
      const response = await axios.post('http://localhost:8000/download/filtered', filterState, {
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

  return (
    <Box sx={{ 
      minHeight: '100vh',
      bgcolor: 'background.default',
      p: 4
    }}>
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

