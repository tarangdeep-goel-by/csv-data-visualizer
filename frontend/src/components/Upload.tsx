import { 
  Paper, 
  Typography, 
  Button, 
  Stack,
  CircularProgress,
  Chip,
  Alert
} from '@mui/material'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import { AppProps } from './types'

interface UploadProps {
  file: File | null
  loading: boolean
  error: string | null
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onUpload: () => void
}

export const Upload = ({ file, loading, error, onFileChange, onUpload }: UploadProps) => {
  return (
    <Paper 
      elevation={2}
      sx={{ 
        p: 4, 
        mb: 3,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'grey.200'
      }}
    >
      <Stack direction="row" spacing={3} alignItems="center">
        <input
          accept=".csv"
          style={{ display: 'none' }}
          id="csv-file"
          type="file"
          onChange={onFileChange}
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
          onClick={onUpload}
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
