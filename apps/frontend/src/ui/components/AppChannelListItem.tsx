import React from 'react';
import { Box, Text } from '@chakra-ui/react';
import {
  useUserPresence,
  getPresenceColor,
  getPresenceLabel,
} from '../../hooks/usePresence';
import { useThemedColors } from '../theme/colors';

export type AppCategoryItemProps = {
  label: string;
  active?: boolean;
  onClick?: VoidFunction;
  isDm?: boolean;
  userId?: string;
};

export default function AppChannelListItem({
  label,
  active,
  onClick,
  isDm,
  userId,
}: AppCategoryItemProps) {
  const presence = useUserPresence(isDm ? userId : undefined);
  const presenceColor = getPresenceColor(presence.status);
  const presenceLabel = getPresenceLabel(presence.status);
  const colors = useThemedColors();

  return (
    <Box
      display="flex"
      justifyContent="start"
      alignItems="center"
      paddingX="10px"
      paddingY="7px"
      backgroundColor={active ? colors.accentSoft : 'transparent'}
      borderRadius="8px"
      marginY="2px"
      cursor="pointer"
      onClick={onClick}
      transition="all 0.14s ease"
      _hover={{
        backgroundColor: active ? colors.accentSoft : colors.darkLight,
      }}
      position="relative"
      title={isDm ? `${label} - ${presenceLabel}` : undefined}
    >
      {isDm ? (
        <Box
          width="8px"
          height="8px"
          borderRadius="full"
          backgroundColor={presenceColor}
          marginRight="10px"
          flexShrink={0}
        />
      ) : (
        <Text
          color={active ? colors.accent : colors.textMuted}
          marginRight="8px"
          fontWeight="600"
          fontSize="md"
          lineHeight="1"
        >
          #
        </Text>
      )}
      <Text
        color={active ? colors.white : colors.textDim}
        fontSize="sm"
        fontWeight={active ? '600' : '500'}
        isTruncated
      >
        {label}
      </Text>
      <Box flex="1" />
      {isDm && presence.status !== 'offline' && (
        <Box
          width="6px"
          height="6px"
          borderRadius="full"
          backgroundColor={presenceColor}
          marginLeft="6px"
        />
      )}
    </Box>
  );
}
