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
  CircularProgress
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
import { Metadata as MetadataType, CompleteData, FilterState } from './types';

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
  // TODO: Fix rendering when multiple values are selected for the same dimension
  // Currently, the visualization might show duplicate or incorrect data points
  // Need to ensure proper aggregation and display of data when multiple dimension values are selected
  if (!metadata || !completeData) return null;

  const handleMetricToggle = (metric: string) => {
    const newMetrics = filterState.visualization_metrics.includes(metric)
      ? filterState.visualization_metrics.filter(m => m !== metric)
      : [...filterState.visualization_metrics, metric];
    onVisualizationMetricsChange(newMetrics);
  };

  const colors = [
    '#8884d8',
    '#82ca9d',
    '#ffc658',
    '#ff7300',
    '#ff0000',
    '#00C49F',
    '#FFBB28',
    '#FF8042',
    '#0088FE',
    '#00C49F'
  ];

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
          Visualization {loading && <CircularProgress size={20} sx={{ ml: 2 }} />}
        </Typography>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Select Metrics</InputLabel>
          <Select
            multiple
            value={filterState.visualization_metrics}
            onChange={(e) => onVisualizationMetricsChange(e.target.value as string[])}
            label="Select Metrics"
            disabled={loading}
          >
            {metadata.column_classifications.metrics.map((metric) => (
              <MenuItem key={metric} value={metric}>
                {metric}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>Selected Metrics:</Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {metadata.column_classifications.metrics.map((metric) => (
            <Chip
              key={metric}
              label={metric}
              onClick={() => handleMetricToggle(metric)}
              color={filterState.visualization_metrics.includes(metric) ? "primary" : "default"}
              variant={filterState.visualization_metrics.includes(metric) ? "filled" : "outlined"}
            />
          ))}
        </Stack>
      </Box>

      <Box sx={{ height: 400, width: '100%' }}>
        {completeData.visualization_data.length > 0 ? (
          <ResponsiveContainer>
            <LineChart
              data={completeData.visualization_data}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="index" 
                label={{ 
                  value: metadata.dimension_flags.index_dimension,
                  position: 'bottom',
                  offset: 0
                }}
              />
              <YAxis 
                label={{ 
                  value: 'Value',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 0
                }}
              />
              <Tooltip 
                formatter={(value: number, name: string) => {
                  return [`${name}: ${value.toLocaleString()}`, name];
                }}
                labelFormatter={(label: string) => {
                  return `${metadata.dimension_flags.index_dimension}: ${label}`;
                }}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  border: '1px solid #ccc',
                  borderRadius: '4px'
                }}
                itemStyle={{
                  color: '#666',
                  fontWeight: 'bold'
                }}
                labelStyle={{
                  color: '#333',
                  fontWeight: 'bold',
                  marginBottom: '4px'
                }}
              />
              <Legend />
              {filterState.visualization_metrics.map((metric, index) => (
                <Line
                  key={metric}
                  type="monotone"
                  dataKey={metric}
                  stroke={colors[index % colors.length]}
                  activeDot={{ r: 8 }}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Typography color="text.secondary">
              Select metrics to visualize
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
}; 