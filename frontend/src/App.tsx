import { useState, useEffect } from 'react'
import { 
  Container, 
  Paper, 
  Typography, 
  Button, 
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Stack,
  useTheme,
  Chip,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  TextField,
  InputAdornment,
  FormControlLabel,
  Tooltip
} from '@mui/material'
import axios from 'axios'
import DownloadIcon from '@mui/icons-material/Download'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import TableChartIcon from '@mui/icons-material/TableChart'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import SearchIcon from '@mui/icons-material/Search'
import KeyIcon from '@mui/icons-material/Key'
import AccessTimeIcon from '@mui/icons-material/AccessTime'

interface Metadata {
  columns: string[]
  row_count: number
  column_types: Record<string, string>
  sample_data: Record<string, any>[]
  column_classifications: {
    dimensions: string[]
    metrics: string[]
  }
  dimension_flags: {
    index_dimension: string
    time_dimension: string | null
  }
}

interface CompleteData {
  data: Record<string, any>[]
  total_rows: number
}

function App() {
  const theme = useTheme()
  const [file, setFile] = useState<File | null>(null)
  const [metadata, setMetadata] = useState<Metadata | null>(null)
  const [completeData, setCompleteData] = useState<CompleteData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showClassifications, setShowClassifications] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage] = useState(10)
  const [showDimensionFlags, setShowDimensionFlags] = useState(false)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0])
      setError(null)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first')
      return
    }

    setLoading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await axios.post('http://localhost:8000/upload', formData)
      setMetadata(response.data)
      await fetchCompleteData()
    } catch (err) {
      setError('Error uploading file. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchCompleteData = async () => {
    try {
      const response = await axios.get('http://localhost:8000/data')
      setCompleteData(response.data)
    } catch (err) {
      console.error('Error fetching complete data:', err)
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
    if (!metadata) return

    const newClassifications = {
      dimensions: [...metadata.column_classifications.dimensions],
      metrics: [...metadata.column_classifications.metrics]
    }

    if (isMetric) {
      newClassifications.metrics.push(column)
      newClassifications.dimensions = newClassifications.dimensions.filter(c => c !== column)
    } else {
      newClassifications.dimensions.push(column)
      newClassifications.metrics = newClassifications.metrics.filter(c => c !== column)
    }

    try {
      const response = await axios.put('http://localhost:8000/metadata/classifications', newClassifications)
      setMetadata(response.data)
    } catch (err) {
      setError('Error updating classifications. Please try again.')
      console.error(err)
    }
  }

  const handleDimensionFlagsChange = async (indexDimension: string, timeDimension: string | null) => {
    if (!metadata) return

    try {
      const response = await axios.put('http://localhost:8000/metadata/dimension-flags', {
        index_dimension: indexDimension,
        time_dimension: timeDimension || undefined
      })
      setMetadata(response.data)
      setError(null)
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(`Error updating dimension flags: ${err.response?.data?.detail || err.message}`)
      } else {
        setError('Error updating dimension flags. Please try again.')
      }
      console.error(err)
    }
  }

  const filteredData = completeData?.data.filter(row => 
    Object.values(row).some(value => 
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    )
  ) || []

  const renderColumnHeader = (column: string) => {
    if (!metadata) return column;

    const isIndex = metadata.dimension_flags.index_dimension === column;
    const isTime = metadata.dimension_flags.time_dimension === column;
    const isMetric = metadata.column_classifications.metrics.includes(column);

    return (
      <Stack direction="row" spacing={1} alignItems="center">
        <span>{column}</span>
        <Stack direction="row" spacing={0.5}>
          {isIndex && (
            <Tooltip title="Index Dimension">
              <KeyIcon sx={{ fontSize: 16, color: theme.palette.warning.main }} />
            </Tooltip>
          )}
          {isTime && (
            <Tooltip title="Time Dimension">
              <AccessTimeIcon sx={{ fontSize: 16, color: theme.palette.info.main }} />
            </Tooltip>
          )}
        </Stack>
      </Stack>
    );
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      bgcolor: theme.palette.grey[100],
      py: 4
    }}>
      <Container maxWidth="lg">
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom
          sx={{
            fontWeight: 600,
            color: theme.palette.primary.main,
            mb: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}
        >
          <TableChartIcon sx={{ fontSize: 40 }} />
          CSV Data Visualizer
        </Typography>

        <Paper 
          elevation={2}
          sx={{ 
            p: 4, 
            mb: 3,
            borderRadius: 2,
            border: `1px solid ${theme.palette.grey[200]}`
          }}
        >
          <Stack direction="row" spacing={3} alignItems="center">
            <input
              accept=".csv"
              style={{ display: 'none' }}
              id="csv-file"
              type="file"
              onChange={handleFileChange}
            />
            <label htmlFor="csv-file">
              <Button 
                variant="contained" 
                component="span"
                startIcon={<UploadFileIcon />}
                sx={{ 
                  py: 1.5,
                  px: 3,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '1rem'
                }}
              >
                Select CSV File
              </Button>
            </label>
            {file && (
              <Chip 
                label={`Selected: ${file.name}`}
                color="primary"
                variant="outlined"
                sx={{ fontSize: '0.9rem' }}
              />
            )}
            <Button
              variant="contained"
              color="primary"
              onClick={handleUpload}
              disabled={!file || loading}
              sx={{ 
                py: 1.5,
                px: 4,
                borderRadius: 2,
                textTransform: 'none',
                fontSize: '1rem'
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Upload'}
            </Button>
          </Stack>
          {error && (
            <Typography 
              color="error" 
              sx={{ 
                mt: 2,
                bgcolor: theme.palette.error.light,
                color: theme.palette.error.dark,
                p: 2,
                borderRadius: 1
              }}
            >
              {error}
            </Typography>
          )}
        </Paper>

        {metadata && (
          <>
            <Paper 
              elevation={2}
              sx={{ 
                p: 4,
                mb: 3,
                borderRadius: 2,
                border: `1px solid ${theme.palette.grey[200]}`
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  Dataset Metadata
                </Typography>
                <Stack direction="row" spacing={2}>
                  <Button
                    variant="outlined"
                    startIcon={<SwapHorizIcon />}
                    onClick={() => setShowClassifications(true)}
                    sx={{ 
                      py: 1.5,
                      px: 3,
                      borderRadius: 2,
                      textTransform: 'none'
                    }}
                  >
                    Manage Classifications
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={handleDownload}
                    sx={{ 
                      py: 1.5,
                      px: 3,
                      borderRadius: 2,
                      textTransform: 'none'
                    }}
                  >
                    Download CSV
                  </Button>
                </Stack>
              </Stack>

              <Box sx={{ mb: 4 }}>
                <Stack direction="row" spacing={4}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Total Rows
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {metadata.row_count.toLocaleString()}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Total Columns
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {metadata.columns.length}
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              <Box sx={{ mb: 4 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Column Classifications
                </Typography>
                <Stack direction="row" spacing={2}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Dimensions ({metadata.column_classifications.dimensions.length})
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {metadata.column_classifications.dimensions.map((column) => {
                        const isIndex = metadata.dimension_flags.index_dimension === column;
                        const isTime = metadata.dimension_flags.time_dimension === column;
                        return (
                          <Chip 
                            key={column}
                            label={
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <span>{column}</span>
                                {isIndex && <KeyIcon sx={{ fontSize: 16 }} />}
                                {isTime && <AccessTimeIcon sx={{ fontSize: 16 }} />}
                              </Stack>
                            }
                            color="primary"
                            variant="outlined"
                            size="small"
                            sx={{ fontSize: '0.85rem' }}
                          />
                        );
                      })}
                    </Box>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Metrics ({metadata.column_classifications.metrics.length})
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {metadata.column_classifications.metrics.map((column) => {
                        const isIndex = metadata.dimension_flags.index_dimension === column;
                        const isTime = metadata.dimension_flags.time_dimension === column;
                        return (
                          <Chip 
                            key={column}
                            label={
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <span>{column}</span>
                                {isIndex && <KeyIcon sx={{ fontSize: 16 }} />}
                                {isTime && <AccessTimeIcon sx={{ fontSize: 16 }} />}
                              </Stack>
                            }
                            color="secondary"
                            variant="outlined"
                            size="small"
                            sx={{ fontSize: '0.85rem' }}
                          />
                        );
                      })}
                    </Box>
                  </Box>
                </Stack>
                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<SwapHorizIcon />}
                    onClick={() => setShowDimensionFlags(true)}
                  >
                    Manage Dimension Flags
                  </Button>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <KeyIcon sx={{ fontSize: 16, color: theme.palette.warning.main }} />
                      <Typography variant="caption">Index</Typography>
                    </Stack>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <AccessTimeIcon sx={{ fontSize: 16, color: theme.palette.info.main }} />
                      <Typography variant="caption">Time</Typography>
                    </Stack>
                  </Stack>
                </Stack>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Sample Data (First 5 Rows)
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {metadata.columns.map((column) => (
                          <TableCell key={column}>{renderColumnHeader(column)}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {metadata.sample_data.map((row, index) => (
                        <TableRow key={index}>
                          {metadata.columns.map((column) => (
                            <TableCell key={column}>{row[column]}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Paper>

            <Paper 
              elevation={2}
              sx={{ 
                p: 4,
                borderRadius: 2,
                border: `1px solid ${theme.palette.grey[200]}`
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  Complete Dataset
                </Typography>
                <TextField
                  size="small"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ width: 300 }}
                />
              </Stack>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {metadata.columns.map((column) => (
                        <TableCell key={column}>{renderColumnHeader(column)}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredData
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((row, index) => (
                        <TableRow key={index}>
                          {metadata.columns.map((column) => (
                            <TableCell key={column}>{row[column]}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </>
        )}

        <Dialog 
          open={showClassifications} 
          onClose={() => setShowClassifications(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Manage Column Classifications</DialogTitle>
          <DialogContent>
            <List>
              {metadata?.columns.map((column) => (
                <ListItem key={column}>
                  <ListItemText 
                    primary={column}
                    secondary={metadata.column_types[column]}
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      edge="end"
                      checked={metadata.column_classifications.metrics.includes(column)}
                      onChange={(e) => handleClassificationChange(column, e.target.checked)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowClassifications(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        <Dialog 
          open={showDimensionFlags} 
          onClose={() => setShowDimensionFlags(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Manage Dimension Flags</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Select columns to be used as index and time dimensions. Any column can be used for these purposes, regardless of its classification.
            </Typography>
            <List>
              {metadata?.columns.map((column) => {
                const isMetric = metadata.column_classifications.metrics.includes(column);
                return (
                  <ListItem key={column}>
                    <ListItemText 
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <span>{column}</span>
                          <Chip 
                            label={isMetric ? "Metric" : "Dimension"} 
                            size="small" 
                            color={isMetric ? "secondary" : "primary"}
                            variant="outlined"
                          />
                        </Stack>
                      }
                      secondary={metadata.column_types[column]}
                    />
                    <Stack direction="row" spacing={2}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={metadata.dimension_flags.index_dimension === column}
                            onChange={(e) => {
                              if (e.target.checked) {
                                handleDimensionFlagsChange(column, metadata.dimension_flags.time_dimension)
                              }
                            }}
                          />
                        }
                        label="Index"
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={metadata.dimension_flags.time_dimension === column}
                            onChange={(e) => {
                              handleDimensionFlagsChange(
                                metadata.dimension_flags.index_dimension,
                                e.target.checked ? column : null
                              )
                            }}
                          />
                        }
                        label="Time"
                      />
                    </Stack>
                  </ListItem>
                );
              })}
            </List>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Note: Index dimension is required and cannot be unset. To change it, select a different column as index.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowDimensionFlags(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  )
}

export default App
