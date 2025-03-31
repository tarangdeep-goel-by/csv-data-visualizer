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
  IconButton,
  Typography,
  CircularProgress,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { Filter as FilterIcon } from '@mui/icons-material';
import { FilterState, ColumnFilter, ValueFilter, RangeFilter, Metadata } from './types';
import axios from 'axios';

interface FilterProps {
  open: boolean;
  onClose: () => void;
  metadata: Metadata | null;
  filterState: FilterState;
  onFilterUpdate: (newFilters: ColumnFilter[]) => void;
}

export const Filter: React.FC<FilterProps> = ({
  open,
  onClose,
  metadata,
  filterState,
  onFilterUpdate,
}) => {
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [filterType, setFilterType] = useState<'value' | 'range'>('value');
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [rangeMin, setRangeMin] = useState<string>('');
  const [rangeMax, setRangeMax] = useState<string>('');
  const [uniqueValues, setUniqueValues] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedColumn) {
      setUniqueValues([]);
      return;
    }

    const fetchUniqueValues = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get(`http://localhost:8000/data/unique-values/${selectedColumn}`);
        setUniqueValues(response.data.values);
      } catch (err) {
        console.error('Error fetching unique values:', err);
        setError('Failed to fetch values');
      } finally {
        setLoading(false);
      }
    };

    fetchUniqueValues();
  }, [selectedColumn]);

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

  const handleRemoveFilter = (index: number) => {
    const updatedFilters = filterState.filters.filter((_, i) => i !== index);
    onFilterUpdate(updatedFilters);
  };

  const resetForm = () => {
    setSelectedColumn('');
    setFilterType('value');
    setSelectedValues([]);
    setRangeMin('');
    setRangeMax('');
    setUniqueValues([]);
    setError(null);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <FilterIcon />
          <Typography variant="h6">Filters</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2} mt={2}>
          {/* Active Filters */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>Active Filters</Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {filterState.filters.map((filter, index) => (
                <Chip
                  key={index}
                  label={`${filter.column}: ${
                    filter.filter.type === 'value'
                      ? (filter.filter as ValueFilter).values.join(', ')
                      : `${(filter.filter as RangeFilter).min} - ${(filter.filter as RangeFilter).max}`
                  }`}
                  onDelete={() => handleRemoveFilter(index)}
                  deleteIcon={<DeleteIcon />}
                />
              ))}
            </Box>
          </Box>

          {/* Add New Filter */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>Add New Filter</Typography>
            <Box display="flex" flexDirection="column" gap={2}>
              <FormControl fullWidth>
                <InputLabel>Column</InputLabel>
                <Select
                  value={selectedColumn}
                  onChange={(e) => handleColumnChange(e.target.value as string)}
                  label="Column"
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
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          onClick={handleAddFilter}
          disabled={!selectedColumn || (filterType === 'value' && selectedValues.length === 0) || (filterType === 'range' && (!rangeMin || !rangeMax))}
        >
          Add Filter
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 