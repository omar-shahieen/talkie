import { CloseIcon } from '@chakra-ui/icons';
import { Box, Divider, Link, Text, IconButton } from '@chakra-ui/react';
import React from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { useThemedColors } from '../theme/colors';
import { logoutApi } from '../../app/services/auth-api.service';
import { disconnectSockets } from '../../app/realtime';

export type SettingsLayoutProps = {
  children: React.ReactNode;
};

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const colors = useThemedColors();
  const navigate = useNavigate();

  return (
    <Box display="flex" height="100vh" backgroundColor={colors.grayLight}>
      <SettingsLeftSidebar />
      <Box
        flex="2"
        height="100%"
        backgroundColor={colors.grayLight}
        overflowY="auto"
        paddingX={{ base: '20px', md: '40px' }}
        paddingY="48px"
        color={colors.white}
        position="relative"
      >
        <Box position="absolute" top="20px" right="28px">
          <IconButton
            aria-label="Close Settings"
            icon={<CloseIcon boxSize={3.5} />}
            variant="outline"
            borderRadius="full"
            borderColor={colors.border}
            color={colors.textDim}
            _hover={{
              color: colors.white,
              backgroundColor: colors.darkLight,
            }}
            onClick={() => navigate('/')}
          />
        </Box>
        <Box maxW="860px">{children}</Box>
      </Box>
    </Box>
  );
}

function SettingsLeftSidebar() {
  const colors = useThemedColors();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/settings/admin');

  return (
    <Box
      flex="1"
      maxW="320px"
      minW="220px"
      display="flex"
      justifyContent="flex-end"
      alignItems="start"
      height="100%"
      backgroundColor={colors.grayMedium}
      borderRight="1px solid"
      borderColor={colors.border}
      paddingY="48px"
      paddingX="16px"
      overflowY="auto"
    >
      <Box display="flex" flexDirection="column" width="100%" maxW="210px">
        <SettingsListHeader>User Settings</SettingsListHeader>

        <Link
          as={RouterLink}
          to="/settings"
          _hover={{ textDecoration: 'none' }}
        >
          <SettingsListItem label="My Account" active={!isAdminRoute} />
        </Link>

        <Link
          as={RouterLink}
          to="/settings/admin"
          _hover={{ textDecoration: 'none' }}
        >
          <SettingsListItem label="Admin Management" active={isAdminRoute} />
        </Link>

        <AppSettingsDivider />

        <SettingsListItem
          color="red.400"
          hoverBackgroundColor="rgba(244, 63, 94, 0.14)"
          onClick={async () => {
            await logoutApi().catch(() => {});
            disconnectSockets();
            localStorage.removeItem('access_token');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            navigate('/login', { replace: true });
            window.location.reload();
          }}
        >
          Log Out
        </SettingsListItem>
      </Box>
    </Box>
  );
}

type SettingsListItemProps = {
  label?: string;
  active?: boolean;
  children?: React.ReactNode;
  color?: string;
  hoverBackgroundColor?: string;
  onClick?: () => void;
};

function SettingsListItem({
  active,
  label,
  color,
  hoverBackgroundColor,
  onClick,
  children,
}: SettingsListItemProps) {
  const colors = useThemedColors();
  return (
    <Box
      onClick={onClick}
      paddingX="12px"
      paddingY="8px"
      marginY="2px"
      borderRadius="8px"
      cursor="pointer"
      fontSize="sm"
      fontWeight={active ? '600' : '500'}
      color={color ? color : active ? colors.white : colors.textDim}
      backgroundColor={active ? colors.accentSoft : 'transparent'}
      transition="all 0.14s ease"
      _hover={{
        backgroundColor: hoverBackgroundColor
          ? hoverBackgroundColor
          : active
            ? colors.accentSoft
            : colors.darkLight,
      }}
    >
      <Text>{label ? label : children}</Text>
    </Box>
  );
}

type SettingsListHeaderProps = {
  children?: React.ReactNode;
};

function SettingsListHeader({ children }: SettingsListHeaderProps) {
  const colors = useThemedColors();
  return (
    <Text
      color={colors.textMuted}
      fontWeight="700"
      textTransform="uppercase"
      letterSpacing="0.06em"
      fontSize="11px"
      paddingX="12px"
      marginBottom="8px"
    >
      {children}
    </Text>
  );
}

function AppSettingsDivider() {
  const colors = useThemedColors();
  return (
    <Box>
      <Divider marginY="14px" borderColor={colors.border} />
    </Box>
  );
}
