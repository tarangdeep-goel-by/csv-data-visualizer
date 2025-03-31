import { 
  Paper, 
  Typography, 
  Button, 
  Stack,
  CircularProgress,
  Chip,
  Alert,
  Box,
  IconButton,
  Tooltip
} from '@mui/material'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import AddIcon from '@mui/icons-material/Add'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import { AppProps } from './types'

interface UploadProps {
  file: File | null
  loading: boolean
  error: string | null
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onUpload: () => void
  onDownload: () => void
  hasData: boolean
}

export const Upload = ({ file, loading, error, onFileChange, onUpload, onDownload, hasData }: UploadProps) => {
  return (
    <Paper 
      elevation={0}
      sx={{ 
        p: 3,
        mb: 3,
        borderRadius: 2,
        bgcolor: 'background.paper',
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Upload CSV
        </Typography>
        <Stack direction="row" spacing={1}>
          {hasData && (
            <Button
              variant="outlined"
              onClick={onDownload}
              disabled={loading}
              startIcon={<UploadFileIcon />}
            >
              Download
            </Button>
          )}
          <Tooltip title="More options">
            <IconButton size="small">
              <MoreHorizIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      <Box sx={{ 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        py: 4,
        px: 2,
        border: '1px dashed',
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.default',
        '&:hover': {
          borderColor: 'primary.main',
          cursor: 'pointer'
        }
      }}>
        <input
          accept=".csv"
          style={{ display: 'none' }}
          id="csv-file"
          type="file"
          onChange={onFileChange}
        />
        <label htmlFor="csv-file" style={{ width: '100%', cursor: 'pointer' }}>
          <Stack spacing={2} alignItems="center">
            <AddIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
            <Typography variant="body1" color="text.secondary">
              {file ? `Selected: ${file.name}` : 'Click to select a CSV file'}
            </Typography>
            {file && (
              <Button
                variant="contained"
                color="primary"
                onClick={(e) => {
                  e.preventDefault();
                  onUpload();
                }}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <UploadFileIcon />}
              >
                Upload File
              </Button>
            )}
          </Stack>
        </label>
      </Box>

      {error && (
        <Alert 
          severity="error" 
          sx={{ mt: 2 }}
          variant="filled"
        >
          {error}
        </Alert>
      )}
      {file && !error && (
        <Alert 
          severity="info" 
          sx={{ mt: 2 }}
          variant="outlined"
        >
          Please upload a valid CSV file. The file should contain at least one metric column (numeric data with sufficient variation). Dimensions can be configured after upload.
        </Alert>
      )}
    </Paper>
  )
}
