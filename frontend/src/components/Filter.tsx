import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Box,
  Chip,
  Typography,
  CircularProgress,
  Stack,
} from '@mui/material';
import { Delete as DeleteIcon, Filter as FilterIcon, Add as AddIcon } from '@mui/icons-material';
import { FilterState, ColumnFilter, ValueFilter, RangeFilter, Metadata } from './types';
import { api } from '../utils/api';

interface FilterProps {
  open: boolean;
  onClose: () => void;
  metadata: Metadata | null;
  filterState: FilterState;
  onFilterUpdate: (newFilters: ColumnFilter[]) => void;
  onOpen: () => void;
}

export const Filter: React.FC<FilterProps> = ({
  open,
  onClose,
  metadata,
  filterState,
  onFilterUpdate,
  onOpen,
}) => {
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [filterType, setFilterType] = useState<'value' | 'range'>('value');
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [rangeMin, setRangeMin] = useState<string>('');
  const [rangeMax, setRangeMax] = useState<string>('');
  const [uniqueValues, setUniqueValues] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingFilterIndex, setEditingFilterIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!selectedColumn) {
      setUniqueValues([]);
      return;
    }

    const fetchUniqueValues = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // If we're editing a filter, exclude it from the filter state to get all possible values
        const filterStateForFetch = editingFilterIndex !== null
          ? {
              ...filterState,
              filters: filterState.filters.filter((_, index) => index !== editingFilterIndex)
            }
          : filterState;

        const response = await api.post(
          `/data/unique-values/${selectedColumn}`,
          filterStateForFetch
        );
        setUniqueValues(response.data.values);
      } catch (err) {
        console.error('Error fetching unique values:', err);
        setError('Failed to fetch values');
      } finally {
        setLoading(false);
      }
    };

    fetchUniqueValues();
  }, [selectedColumn, filterState.filters, editingFilterIndex]);

  const handleColumnChange = (column: string) => {
    setSelectedColumn(column);
    // Automatically set filter type based on column type
    if (metadata) {
      const isMetric = metadata.column_classifications.metrics.includes(column);
      setFilterType(isMetric ? 'range' : 'value');
    }
    // Reset other values
    setSelectedValues([]);
    setRangeMin('');
    setRangeMax('');
  };

  const handleAddFilter = () => {
    if (!selectedColumn) return;

    const newFilter: ColumnFilter = {
      column: selectedColumn,
      filter: filterType === 'value'
        ? { type: 'value', values: selectedValues }
        : { type: 'range', min: parseFloat(rangeMin), max: parseFloat(rangeMax) },
    };

    const updatedFilters = [...filterState.filters, newFilter];
    onFilterUpdate(updatedFilters);
    resetForm();
  };

  const handleUpdateFilter = () => {
    if (!selectedColumn || editingFilterIndex === null) return;

    const updatedFilter: ColumnFilter = {
      column: selectedColumn,
      filter: filterType === 'value'
        ? { type: 'value', values: selectedValues }
        : { type: 'range', min: parseFloat(rangeMin), max: parseFloat(rangeMax) },
    };

    const updatedFilters = filterState.filters.map((filter, index) => 
      index === editingFilterIndex ? updatedFilter : filter
    );
    onFilterUpdate(updatedFilters);
    resetForm();
  };

  const handleRemoveFilter = (index: number) => {
    const updatedFilters = filterState.filters.filter((_, i) => i !== index);
    onFilterUpdate(updatedFilters);
    if (editingFilterIndex === index) {
      resetForm();
    }
  };

  const handleEditFilter = (filter: ColumnFilter, index: number) => {
    setSelectedColumn(filter.column);
    setFilterType(filter.filter.type);
    if (filter.filter.type === 'value') {
      setSelectedValues((filter.filter as ValueFilter).values);
    } else {
      setRangeMin((filter.filter as RangeFilter).min.toString());
      setRangeMax((filter.filter as RangeFilter).max.toString());
    }
    setEditingFilterIndex(index);
  };

  const resetForm = () => {
    setSelectedColumn('');
    setFilterType('value');
    setSelectedValues([]);
    setRangeMin('');
    setRangeMax('');
    setUniqueValues([]);
    setError(null);
    setEditingFilterIndex(null);
  };

  return (
    <>
      {/* Inline Filter Display */}
      <Box sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1} mb={1}>
          <Typography variant="subtitle2">Filters</Typography>
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={() => {
              resetForm();
              onOpen();
            }}
          >
            Add Filter
          </Button>
        </Stack>
        <Box display="flex" flexWrap="wrap" gap={1}>
          {filterState.filters.map((filter, index) => (
            <Chip
              key={index}
              label={`${filter.column}: ${
                filter.filter.type === 'value'
                  ? (filter.filter as ValueFilter).values.join(', ')
                  : `${(filter.filter as RangeFilter).min} - ${(filter.filter as RangeFilter).max}`
              }`}
              onClick={() => {
                handleEditFilter(filter, index);
                onOpen();
              }}
              onDelete={() => handleRemoveFilter(index)}
              deleteIcon={<DeleteIcon />}
              color="primary"
              variant="outlined"
            />
          ))}
        </Box>
      </Box>

      {/* Filter Dialog */}
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <FilterIcon />
            <Typography variant="h6">
              {editingFilterIndex !== null ? 'Edit Filter' : 'Add New Filter'}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={2}>
            <FormControl fullWidth>
              <InputLabel>Column</InputLabel>
              <Select
                value={selectedColumn}
                onChange={(e) => handleColumnChange(e.target.value as string)}
                label="Column"
                disabled={editingFilterIndex !== null}
              >
                {metadata?.columns.map((column) => (
                  <MenuItem key={column} value={column}>
                    {column}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedColumn && (
              <FormControl fullWidth>
                <InputLabel>Filter Type</InputLabel>
                <Select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as 'value' | 'range')}
                  label="Filter Type"
                  disabled={metadata?.column_classifications.metrics.includes(selectedColumn)}
                >
                  <MenuItem value="value">Value Filter</MenuItem>
                  <MenuItem value="range">Range Filter</MenuItem>
                </Select>
              </FormControl>
            )}

            {selectedColumn && filterType === 'value' && (
              <FormControl fullWidth>
                <InputLabel>Values</InputLabel>
                <Select
                  multiple
                  value={selectedValues}
                  onChange={(e) => setSelectedValues(e.target.value as string[])}
                  label="Values"
                  disabled={loading}
                >
                  {loading ? (
                    <MenuItem disabled>
                      <CircularProgress size={20} />
                      Loading values...
                    </MenuItem>
                  ) : error ? (
                    <MenuItem disabled>
                      Error loading values
                    </MenuItem>
                  ) : (
                    uniqueValues.map((value) => (
                      <MenuItem key={value} value={value}>
                        {value}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            )}

            {selectedColumn && filterType === 'range' && (
              <Box display="flex" gap={2}>
                <TextField
                  label="Min"
                  type="number"
                  value={rangeMin}
                  onChange={(e) => setRangeMin(e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Max"
                  type="number"
                  value={rangeMax}
                  onChange={(e) => setRangeMax(e.target.value)}
                  fullWidth
                />
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
          {editingFilterIndex !== null && (
            <Button onClick={resetForm}>Cancel Edit</Button>
          )}
          <Button
            variant="contained"
            onClick={editingFilterIndex !== null ? handleUpdateFilter : handleAddFilter}
            disabled={!selectedColumn || (filterType === 'value' && selectedValues.length === 0) || (filterType === 'range' && (!rangeMin || !rangeMax))}
          >
            {editingFilterIndex !== null ? 'Update Filter' : 'Add Filter'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}; 