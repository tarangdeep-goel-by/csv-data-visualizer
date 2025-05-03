import React from 'react';
import {
  Paper,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  CircularProgress,
  useTheme
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Metadata as MetadataType, CompleteData, FilterState, ValueFilter } from './types';
import { metricColors } from '../theme';

interface VisualizationProps {
  metadata: MetadataType | null;
  completeData: CompleteData | null;
  loading: boolean;
  filterState: FilterState;
  onVisualizationMetricsChange: (metrics: string[]) => void;
}

export const Visualization: React.FC<VisualizationProps> = ({
  metadata,
  completeData,
  loading,
  filterState,
  onVisualizationMetricsChange
}) => {
  const theme = useTheme();

  if (!metadata || !completeData) return null;

  const handleMetricToggle = (metric: string) => {
    const newMetrics = filterState.visualization_metrics.includes(metric)
      ? filterState.visualization_metrics.filter(m => m !== metric)
      : [...filterState.visualization_metrics, metric];
    onVisualizationMetricsChange(newMetrics);
  };

  // Get color for a metric based on its index
  const getMetricColor = (index: number) => {
    const colorKeys = Object.keys(metricColors);
    const colorKey = colorKeys[index % colorKeys.length];
    return metricColors[colorKey as keyof typeof metricColors].main;
  };

  // Only show metrics that are currently in the view
  const availableMetrics = filterState.metrics;

  // Find the dimension that has multiple values selected for comparison
  const comparisonFilter = filterState.filters.find(filter => 
    filter.filter.type === 'value' && 
    (filter.filter as ValueFilter).values.length > 1
  );

  // Get all metric columns from visualization data
  const getMetricColumns = () => {
    if (!completeData.visualization_data.length) return [];
    const firstRow = completeData.visualization_data[0];
    const excludeColumns = ['index', metadata.dimension_flags.index_dimension];
    return Object.keys(firstRow).filter(key => !excludeColumns.includes(key));
  };

  // Format tooltip value based on whether it's a comparison view or not
  const formatTooltipValue = (value: number, name: string) => {
    if (comparisonFilter) {
      // For comparison view, the name includes both metric and dimension value
      const match = name.match(/^(.*?) \((.*?): (.*?)\)$/);
      if (match) {
        const [_, metric, dimension, dimensionValue] = match;
        return [`${metric}: ${value.toLocaleString()}`, `${dimension}: ${dimensionValue}`];
      }
    }
    return [`${name}: ${value.toLocaleString()}`, name];
  };

  return (
    <Paper 
      elevation={2}
      sx={{ 
        p: 4,
        mb: 3,
        borderRadius: 2,
        backgroundColor: 'background.paper',
        border: 'none'
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" sx={{ 
          fontWeight: 600,
          color: 'text.primary'
        }}>
          {comparisonFilter ? 
            `Comparing ${comparisonFilter.column} Values` : 
            'Visualization'} {loading && <CircularProgress size={20} sx={{ ml: 2 }} />}
        </Typography>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel sx={{ color: 'text.secondary' }}>Select Metrics</InputLabel>
          <Select
            multiple
            value={filterState.visualization_metrics.filter(m => availableMetrics.includes(m))}
            onChange={(e) => onVisualizationMetricsChange(e.target.value as string[])}
            label="Select Metrics"
            disabled={loading}
            sx={{
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255, 255, 255, 0.12)'
              }
            }}
          >
            {availableMetrics.map((metric) => (
              <MenuItem key={metric} value={metric}>
                {metric}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <Box sx={{ height: 400, width: '100%' }}>
        {completeData.visualization_data.length > 0 && filterState.visualization_metrics.some(m => availableMetrics.includes(m)) ?
          <ResponsiveContainer>
            <LineChart
              data={completeData.visualization_data}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 20,
              }}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                vertical={false}
                stroke="rgba(255, 255, 255, 0.12)"
              />
              <XAxis 
                dataKey="index"
                stroke="#bdb8ae"
                tick={{ fill: '#bdb8ae' }}
                tickLine={{ stroke: '#bdb8ae' }}
                axisLine={{ stroke: '#bdb8ae' }}
              />
              <YAxis 
                stroke="#bdb8ae"
                tick={{ fill: '#bdb8ae' }}
                tickLine={{ stroke: '#bdb8ae' }}
                axisLine={{ stroke: '#bdb8ae' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1e1e30',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '4px',
                  color: '#e1e1e1'
                }}
                itemStyle={{
                  color: '#bdb8ae'
                }}
                labelStyle={{
                  color: '#e1e1e1',
                  fontWeight: 'bold',
                  marginBottom: '8px'
                }}
                formatter={formatTooltipValue}
              />
              <Legend 
                wrapperStyle={{
                  color: '#bdb8ae'
                }}
              />
              {getMetricColumns().map((column, index) => {
                const color = getMetricColor(index);
                return (
                  <Line
                    key={column}
                    type="monotone"
                    dataKey={column}
                    name={column}
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, fill: color }}
                    fill={`${color}20`}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        :
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.secondary'
            }}
          >
            <Typography>
              Select metrics to visualize
            </Typography>
          </Box>
        }
      </Box>
    </Paper>
  );
}; 