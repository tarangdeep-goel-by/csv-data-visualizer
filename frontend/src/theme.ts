import { createTheme } from '@mui/material/styles';

// Define a color palette for metrics visualization
const metricColors = {
  primary: {
    main: '#ff073a',
    light: '#ff073a20',
    dark: '#ff073add',
  },
  secondary: {
    main: '#007bff',
    light: '#007bff20',
    dark: '#007bffdd',
  },
  success: {
    main: '#28a745',
    light: '#28a74520',
    dark: '#28a745dd',
  },
  warning: {
    main: '#ffc107',
    light: '#ffc10720',
    dark: '#ffc107dd',
  },
  info: {
    main: '#17a2b8',
    light: '#17a2b820',
    dark: '#17a2b8dd',
  },
  error: {
    main: '#6c757d',
    light: '#6c757d20',
    dark: '#6c757ddd',
  },
  // Additional colors for more metrics
  purple: {
    main: '#9673b9',
    light: '#9673b920',
    dark: '#9673b9dd',
  },
  teal: {
    main: '#20c997',
    light: '#20c99720',
    dark: '#20c997dd',
  },
  orange: {
    main: '#fd7e14',
    light: '#fd7e1420',
    dark: '#fd7e14dd',
  },
  pink: {
    main: '#e83e8c',
    light: '#e83e8c20',
    dark: '#e83e8cdd',
  },
};

export const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#161625',
      paper: '#1e1e30',
    },
    ...metricColors,
    text: {
      primary: '#e1e1e1',
      secondary: '#bdb8ae',
    },
    divider: 'rgba(255, 255, 255, 0.12)',
  },
  typography: {
    fontFamily: [
      'archia',
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      'Segoe UI',
      'Roboto',
      'Helvetica Neue',
      'Arial',
      'sans-serif',
    ].join(','),
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          padding: '8px 16px',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 4,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
          color: '#bdb8ae',
        },
        head: {
          fontWeight: 600,
          backgroundColor: '#1e1e30',
          color: '#e1e1e1',
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#161625',
          color: '#e1e1e1',
        },
      },
    },
  },
});

// Export the metric colors for use in other components
export { metricColors }; 