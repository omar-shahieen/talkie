import React from 'react';
import { IconButton, Tooltip } from '@chakra-ui/react';
import { useThemedColors } from '../theme/colors';

export type AppIconButtonProps = {
  ariaLabel: string;
  icon?: React.ReactElement;
  onClick?: VoidFunction;
  withBackground?: boolean;
  size?: (string & {}) | 'sm' | 'md' | 'lg' | 'xs' | undefined;
  tooltip?: string;
  disabled?: boolean;
  [key: string]: any;
};

export default function AppIconButton({
  ariaLabel,
  icon,
  onClick,
  withBackground,
  size = 'sm',
  tooltip,
  disabled,
  ...rest
}: AppIconButtonProps) {
  const colors = useThemedColors();
  return (
    <Tooltip label={tooltip} hasArrow placement="top">
      <IconButton
        aria-label={ariaLabel}
        icon={icon}
        onClick={onClick}
        borderRadius="10px"
        marginX="1px"
        size={size}
        isDisabled={disabled}
        backgroundColor={withBackground ? colors.darkLight : 'transparent'}
        color={colors.textDim}
        transition="all 0.16s ease"
        {...rest}
        _hover={{
          backgroundColor: colors.darkLight,
          color: colors.white,
        }}
        _active={{
          transform: 'scale(0.95)',
          backgroundColor: colors.darkLight,
        }}
      />
    </Tooltip>
  );
}
