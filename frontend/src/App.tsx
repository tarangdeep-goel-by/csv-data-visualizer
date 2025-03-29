import { useState } from 'react'
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
  Divider
} from '@mui/material'
import axios from 'axios'
import DownloadIcon from '@mui/icons-material/Download'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import TableChartIcon from '@mui/icons-material/TableChart'

interface Metadata {
  columns: string[]
  row_count: number
  column_types: Record<string, string>
  sample_data: Record<string, any>[]
}

function App() {
  const theme = useTheme()
  const [file, setFile] = useState<File | null>(null)
  const [metadata, setMetadata] = useState<Metadata | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    } catch (err) {
      setError('Error uploading file. Please try again.')
      console.error(err)
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
                Dataset Metadata
              </Typography>
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
                Columns
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {metadata.columns.map((column) => (
                  <Chip 
                    key={column}
                    label={column}
                    variant="outlined"
                    size="small"
                    sx={{ fontSize: '0.85rem' }}
                  />
                ))}
              </Box>
            </Box>

            <Divider sx={{ my: 4 }} />

            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Sample Data
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: theme.palette.grey[50] }}>
                    {metadata.columns.map((column) => (
                      <TableCell 
                        key={column}
                        sx={{ 
                          fontWeight: 600,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {column}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {metadata.sample_data.map((row, index) => (
                    <TableRow 
                      key={index}
                      sx={{ 
                        '&:nth-of-type(odd)': { 
                          bgcolor: theme.palette.grey[50] 
                        }
                      }}
                    >
                      {metadata.columns.map((column) => (
                        <TableCell 
                          key={column}
                          sx={{ 
                            whiteSpace: 'nowrap',
                            maxWidth: 200,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {row[column]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </Container>
    </Box>
  )
}

export default App
