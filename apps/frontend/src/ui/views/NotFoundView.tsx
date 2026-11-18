import React from 'react';
import { Box, Button, Heading, Text, VStack } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useThemedColors } from '../theme/colors';

export default function NotFoundView() {
  const colors = useThemedColors();
  const navigate = useNavigate();

  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      backgroundColor={colors.grayDarkest}
      backgroundImage="radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.14), transparent 55%)"
      padding="24px"
    >
      <VStack
        spacing="14px"
        padding="36px"
        borderRadius="20px"
        backgroundColor={colors.surfaceElevated}
        border="1px solid"
        borderColor={colors.border}
        textAlign="center"
        maxW="400px"
      >
        <Text fontSize="xs" fontWeight="700" color={colors.accent} letterSpacing="0.1em">
          404
        </Text>
        <Heading size="lg" color={colors.white}>
          Page Not Found
        </Heading>
        <Text fontSize="sm" color={colors.textDim}>
          The channel or page you are looking for does not exist or has been moved.
        </Text>
        <Button
          marginTop="8px"
          backgroundColor={colors.accent}
          color="white"
          _hover={{ backgroundColor: colors.accentHover }}
          onClick={() => navigate('/')}
        >
          Back to Home
        </Button>
      </VStack>
    </Box>
  );
}
