import { 
  Paper, 
  Typography, 
  Button, 
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Chip,
  Tooltip,
  Badge
} from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import FilterListIcon from '@mui/icons-material/FilterList'
import KeyIcon from '@mui/icons-material/Key'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import { Metadata as MetadataType, CompleteData, FilterState, ColumnFilter, ValueFilter, RangeFilter } from './types'
import { Filter } from './Filter'
import { useState } from 'react'

/**
 * TODO: Data Component Improvements
 * 
 * 1. Column Sorting
 *    - Add sortable headers to all columns
 *    - Implement both ascending and descending sort
 *    - Allow sorting by multiple columns (shift+click)
 *    - Visual indicators for sort direction
 *    - Server-side sorting for large datasets
 * 
 * 2. Drag and Drop Column Reordering
 *    - Implement drag handles for columns
 *    - Visual feedback during drag operation
 *    - Smooth animation when reordering
 *    - Save column order in user preferences
 *    - Consider using react-beautiful-dnd or @dnd-kit/sortable
 * 
 * 3. Column Management Improvements
 *    - Replace current "Add to View" with a more intuitive interface
 *    - Add a dedicated column management panel/drawer
 *    - Group columns by type (dimension/metric)
 *    - Search/filter available columns
 *    - Show column metadata (type, description, etc.)
 *    - Quick actions (hide/show, pin, etc.)
 * 
 * 4. Dimension/Metric Separation
 *    - Visually separate dimensions and metrics in the table
 *    - Different styling/background for dimension vs metric columns
 *    - Option to group all dimensions to left/right
 *    - Sticky dimension columns option
 *    - Clear labeling of column types
 *    - Different aggregation options for metrics
 */

interface DataProps {
  metadata: MetadataType | null
  completeData: CompleteData | null
  loading: boolean
  filterState: FilterState
  onDownloadFilteredView: () => void
  onRemoveFromView: (column: string) => void
  onAddToView: (column: string) => void
  onApplyFilters: () => void
  showFilters: boolean
  setShowFilters: (show: boolean) => void
  tempFilterState: FilterState
  setTempFilterState: (state: FilterState) => void
  onFilterUpdate: (filters: ColumnFilter[]) => void
}

export const Data = ({
  metadata,
  completeData,
  loading,
  filterState,
  onDownloadFilteredView,
  onRemoveFromView,
  onAddToView,
  onApplyFilters,
  showFilters,
  setShowFilters,
  tempFilterState,
  setTempFilterState,
  onFilterUpdate
}: DataProps) => {
  const [showFilterDialog, setShowFilterDialog] = useState(false);

  if (!metadata || !completeData) return null;

  const renderColumnHeader = (column: string) => {
    const isIndex = metadata.dimension_flags.index_dimension === column;
    const isTime = metadata.dimension_flags.time_dimension === column;
    const isMetric = metadata.column_classifications.metrics.includes(column);

    return (
      <Stack direction="row" spacing={1} alignItems="center">
        <span>{column}</span>
        <Stack direction="row" spacing={0.5}>
          {isIndex && (
            <Tooltip title="Index Dimension">
              <KeyIcon sx={{ fontSize: 16, color: 'warning.main' }} />
            </Tooltip>
          )}
          {isTime && (
            <Tooltip title="Time Dimension">
              <AccessTimeIcon sx={{ fontSize: 16, color: 'info.main' }} />
            </Tooltip>
          )}
        </Stack>
      </Stack>
    );
  };

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
          Complete Dataset {loading && <CircularProgress size={20} sx={{ ml: 2 }} />}
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={onDownloadFilteredView}
            sx={{ 
              py: 1.5,
              px: 3,
              borderRadius: 2,
              textTransform: 'none'
            }}
          >
            Download View
          </Button>
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={() => {
              setTempFilterState(filterState);
              setShowFilters(true);
            }}
            sx={{ 
              py: 1.5,
              px: 3,
              borderRadius: 2,
              textTransform: 'none'
            }}
          >
            Manage View
          </Button>
        </Stack>
      </Stack>

      <Filter
        open={showFilterDialog}
        onClose={() => setShowFilterDialog(false)}
        onOpen={() => setShowFilterDialog(true)}
        metadata={metadata}
        filterState={filterState}
        onFilterUpdate={onFilterUpdate}
      />

      <TableContainer 
        sx={{ 
          maxHeight: 600,
          overflow: 'auto',
          '& .MuiTableCell-root': {
            whiteSpace: 'nowrap'
          }
        }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {[...filterState.dimensions, ...filterState.metrics].map((column) => (
                <TableCell 
                  key={`header-${column}`}
                  sx={{
                    backgroundColor: 'background.paper',
                    position: 'sticky',
                    top: 0,
                    zIndex: 1
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    {renderColumnHeader(column)}
                    {column !== metadata?.dimension_flags.index_dimension && (
                      <Tooltip title="Remove from view">
                        <IconButton
                          size="small"
                          onClick={() => onRemoveFromView(column)}
                          color="primary"
                        >
                          <FilterListIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {completeData.data.map((row, index) => (
              <TableRow key={index}>
                {[...filterState.dimensions, ...filterState.metrics].map((column) => (
                  <TableCell key={`data-${column}`}>{row[column]}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog 
        open={showFilters} 
        onClose={() => setShowFilters(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Manage Filters and Aggregation</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Selected Dimensions
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {tempFilterState.dimensions.map((dimension) => (
                  <Chip
                    key={`selected-dimension-${dimension}`}
                    label={dimension}
                    onDelete={dimension !== metadata?.dimension_flags.index_dimension ? 
                      () => onRemoveFromView(dimension) : undefined}
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>

            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle1" gutterBottom>
                  Selected Metrics
                </Typography>
                <Button
                  size="small"
                  onClick={() => {
                    if (metadata) {
                      setTempFilterState({
                        ...tempFilterState,
                        metrics: metadata.column_classifications.metrics,
                        dimensions: tempFilterState.dimensions,
                        filters: tempFilterState.filters
                      });
                    }
                  }}
                >
                  Select All Metrics
                </Button>
              </Stack>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {tempFilterState.metrics.map((metric) => (
                  <Chip
                    key={`selected-metric-${metric}`}
                    label={metric}
                    onDelete={() => onRemoveFromView(metric)}
                    color="secondary"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>

            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Available Columns
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {metadata.columns
                  .filter(col => !tempFilterState.dimensions.includes(col) && !tempFilterState.metrics.includes(col))
                  .map((column) => {
                    const isMetric = metadata.column_classifications.metrics.includes(column);
                    return (
                      <Chip
                        key={`available-${column}`}
                        label={column}
                        onClick={() => onAddToView(column)}
                        color={isMetric ? "secondary" : "primary"}
                        variant="outlined"
                      />
                    );
                  })}
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowFilters(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={onApplyFilters}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Apply Filters'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}
