import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import AppRouteProvider from './routes/AppRouteProvider';
import React from 'react';
import './App.css';
import '@fontsource/sora';

const config = {
  initialColorMode: 'dark' as const,
  useSystemColorMode: false,
};

const theme = extendTheme({
  config,
  fonts: {
    heading: `Sora, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
    body: `Sora, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
  },
  colors: {
    brand: {
      50: '#EEF0FF',
      100: '#DFE3FE',
      200: '#C4CBFD',
      300: '#9FA9FA',
      400: '#7B86F0',
      500: '#5E6AD2',
      600: '#4C56B8',
      700: '#3D4596',
      800: '#313878',
      900: '#282E60',
    },
  },
  semanticTokens: {
    colors: {
      'bg-primary': {
        light: '#FFFFFF',
        dark: '#12151C',
      },
      'bg-secondary': {
        light: '#F8F9FB',
        dark: '#0E1015',
      },
      'text-primary': {
        light: '#111827',
        dark: '#F3F4F6',
      },
      'border-color': {
        light: 'rgba(17, 24, 39, 0.08)',
        dark: 'rgba(255, 255, 255, 0.07)',
      },
    },
  },
  components: {
    Button: {
      baseStyle: {
        borderRadius: '8px',
        fontWeight: '500',
        letterSpacing: '-0.01em',
        transition: 'all 0.15s ease',
      },
    },
    Input: {
      defaultProps: {
        focusBorderColor: 'brand.500',
      },
      variants: {
        outline: {
          field: {
            borderRadius: '8px',
            fontSize: 'sm',
          },
        },
      },
    },
    Modal: {
      baseStyle: {
        overlay: {
          backdropFilter: 'blur(4px)',
          bg: 'blackAlpha.600',
        },
        dialog: {
          borderRadius: '12px',
          boxShadow: '2xl',
        },
      },
    },
    Menu: {
      baseStyle: {
        list: {
          borderRadius: '10px',
          p: '5px',
          boxShadow: 'xl',
        },
        item: {
          borderRadius: '6px',
          fontSize: 'xs',
          fontWeight: '500',
          transition: 'background 0.12s ease',
        },
      },
    },
    Tooltip: {
      baseStyle: {
        borderRadius: '6px',
        px: '8px',
        py: '4px',
        fontSize: '11px',
        fontWeight: '500',
      },
    },
  },
  styles: {
    global: {
      'html, body': {
        letterSpacing: '-0.011em',
        _light: {
          bg: '#FFFFFF',
          color: '#111827',
        },
        _dark: {
          bg: '#08090D',
          color: '#F3F4F6',
        },
      },
    },
  },
});

function App() {
  return (
    <ChakraProvider theme={theme}>
      <AppRouteProvider />
    </ChakraProvider>
  );
}

export default App;
