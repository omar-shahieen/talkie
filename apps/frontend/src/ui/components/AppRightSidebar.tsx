import { Box } from '@chakra-ui/react';
import React from 'react';
import { useThemedColors } from '../theme/colors';
import AppMemberList from './AppMemberList';

export default function AppRightSidebar() {
  const colors = useThemedColors();
  return (
    <Box
      width="250px"
      minWidth="250px"
      display={{ base: 'none', lg: 'flex' }}
      paddingX="8px"
      backgroundColor={colors.grayMedium}
      borderLeft="1px solid"
      borderColor={colors.border}
      flexDirection="column"
    >
      <AppMemberList />
    </Box>
  );
}
