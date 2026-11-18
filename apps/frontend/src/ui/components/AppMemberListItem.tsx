import { Avatar, Badge, Box, HStack, Text, Tooltip } from '@chakra-ui/react';
import React from 'react';
import { useThemedColors } from '../theme/colors';

export type AppMemberListItemProps = {
  name: string;
  isOwner?: boolean;
};

export default function AppMemberListItem({
  name,
  isOwner,
}: AppMemberListItemProps) {
  const colors = useThemedColors();
  return (
    <HStack
      spacing="10px"
      paddingX="8px"
      paddingY="6px"
      marginY="1px"
      borderRadius="6px"
      cursor="pointer"
      transition="background 0.12s ease"
      _hover={{
        backgroundColor: colors.darkLight,
      }}
    >
      <Box position="relative" flexShrink={0}>
        <Avatar size="xs" name={name} />
        <Box
          position="absolute"
          bottom="-1px"
          right="-1px"
          width="7px"
          height="7px"
          borderRadius="full"
          backgroundColor={colors.success}
          border="1.5px solid"
          borderColor={colors.grayMedium}
        />
      </Box>
      <Text
        color={colors.textDim}
        fontSize="xs"
        fontWeight="500"
        isTruncated
        flex="1"
      >
        {name}
      </Text>
      {isOwner ? (
        <Tooltip
          aria-label="server owner tooltip"
          label="Workspace Owner"
          hasArrow
        >
          <Badge
            fontSize="9px"
            px="5px"
            py="1px"
            borderRadius="4px"
            backgroundColor={colors.accentSoft}
            color={colors.accent}
            textTransform="uppercase"
          >
            Owner
          </Badge>
        </Tooltip>
      ) : null}
    </HStack>
  );
}
