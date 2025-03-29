import { 
  Paper, 
  Typography, 
  Button, 
  Stack,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  FormControlLabel,
  CircularProgress
} from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import KeyIcon from '@mui/icons-material/Key'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import { Metadata as MetadataType } from './types'

interface MetadataProps {
  metadata: MetadataType | null
  loading: boolean
  onDownload: () => void
  onClassificationsChange: (column: string, isMetric: boolean) => void
  onDimensionFlagsChange: (indexDimension: string, timeDimension: string | null) => void
  onApplyClassifications: () => void
  onApplyDimensionFlags: () => void
  showClassifications: boolean
  setShowClassifications: (show: boolean) => void
  showDimensionFlags: boolean
  setShowDimensionFlags: (show: boolean) => void
  pendingMetadata: MetadataType | null
}

export const Metadata = ({
  metadata,
  loading,
  onDownload,
  onClassificationsChange,
  onDimensionFlagsChange,
  onApplyClassifications,
  onApplyDimensionFlags,
  showClassifications,
  setShowClassifications,
  showDimensionFlags,
  setShowDimensionFlags,
  pendingMetadata
}: MetadataProps) => {
  if (!metadata) return null;

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
            onClick={onDownload}
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
                    key={`dimension-${column}`}
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
                    key={`metric-${column}`}
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
              <KeyIcon sx={{ fontSize: 16, color: 'warning.main' }} />
              <Typography variant="caption">Index</Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <AccessTimeIcon sx={{ fontSize: 16, color: 'info.main' }} />
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
                  <TableCell key={`sample-header-${column}`}>{column}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {metadata.sample_data.map((row, index) => (
                <TableRow key={index}>
                  {metadata.columns.map((column) => (
                    <TableCell key={`sample-data-${column}`}>{row[column]}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Dialog 
        open={showClassifications} 
        onClose={() => setShowClassifications(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Manage Column Classifications</DialogTitle>
        <DialogContent>
          <List>
            {metadata.columns.map((column) => (
              <ListItem key={`classification-${column}`}>
                <ListItemText 
                  primary={column}
                  secondary={metadata.column_types[column]}
                />
                <ListItemSecondaryAction>
                  <Switch
                    edge="end"
                    checked={pendingMetadata?.column_classifications.metrics.includes(column)}
                    onChange={(e) => onClassificationsChange(column, e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowClassifications(false)}>
            Cancel
          </Button>
          <Button 
            variant="contained"
            onClick={onApplyClassifications}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Apply Changes'}
          </Button>
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
            {metadata.columns.map((column) => {
              const isMetric = pendingMetadata?.column_classifications.metrics.includes(column);
              return (
                <ListItem key={`dimension-flag-${column}`}>
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
                          checked={pendingMetadata?.dimension_flags.index_dimension === column}
                          onChange={(e) => {
                            if (e.target.checked) {
                              onDimensionFlagsChange(column, pendingMetadata?.dimension_flags.time_dimension || null)
                            }
                          }}
                        />
                      }
                      label="Index"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={pendingMetadata?.dimension_flags.time_dimension === column}
                          onChange={(e) => {
                            onDimensionFlagsChange(
                              pendingMetadata?.dimension_flags.index_dimension || column,
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
          <Button onClick={() => setShowDimensionFlags(false)}>
            Cancel
          </Button>
          <Button 
            variant="contained"
            onClick={onApplyDimensionFlags}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Apply Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}
