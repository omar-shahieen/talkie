import {
  ChevronDownIcon,
  InfoOutlineIcon,
  RepeatIcon,
  SettingsIcon,
} from '@chakra-ui/icons';
import {
  Avatar,
  Box,
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  HStack,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Text,
  useDisclosure,
} from '@chakra-ui/react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getChatSocket, disconnectSockets } from '../../app/realtime';
import { useAuth } from '../../hooks/useAuth';
import { OTHER_REDIRECT_ROUTE } from '../../routes/defaultRoute';
import { useThemedColors } from '../theme/colors';
import AppCategoryList from './AppCategoryList';
import AppIconButton from './AppIconButton';
import { logoutApi } from '../../app/services/auth-api.service';

function LogoAvatar(props: { size?: any; borderRadius?: string }) {
  return <Avatar src="/talkie-logo.png" name="Talkie" {...props} />;
}

export default function AppLeftSidebar() {
  const colors = useThemedColors();
  return (
    <Box
      width="260px"
      minWidth="260px"
      display="flex"
      flexDirection="column"
      justifyContent="space-between"
      backgroundColor={colors.grayMedium}
      borderRight="1px solid"
      borderColor={colors.border}
    >
      <AppLeftSidebarTopbar />

      <AppCategoryList />

      <BottomSection />
    </Box>
  );
}

function AppLeftSidebarTopbar() {
  const colors = useThemedColors();
  const navigate = useNavigate();
  const user = useAuth();

  return (
    <Box
      height="56px"
      minHeight="56px"
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      paddingX="12px"
      backgroundColor={colors.grayMedium}
      borderBottom="1px solid"
      borderColor={colors.border}
    >
      <Menu>
        <MenuButton
          as={Button}
          color={colors.white}
          width="full"
          height="38px"
          px="10px"
          borderRadius="10px"
          backgroundColor="transparent"
          rightIcon={<ChevronDownIcon color={colors.textDim} />}
          _hover={{ backgroundColor: colors.darkLight }}
          _active={{ backgroundColor: colors.darkLight }}
          fontWeight="600"
          fontSize="sm"
        >
          <HStack spacing="10px">
            <LogoAvatar size="xs" borderRadius="6px" />
            <Text isTruncated letterSpacing="-0.01em">
              Talkie Workspace
            </Text>
          </HStack>
        </MenuButton>
        <MenuList
          backgroundColor={colors.surfaceElevated}
          borderColor={colors.border}
        >
          {!user ? (
            <>
              <MenuItem
                backgroundColor="transparent"
                _hover={{ backgroundColor: colors.darkLight }}
                onClick={() => navigate('/login')}
              >
                Sign In
              </MenuItem>
              <MenuItem
                backgroundColor="transparent"
                _hover={{ backgroundColor: colors.darkLight }}
                onClick={() => navigate('/login?mode=signup')}
              >
                Sign Up
              </MenuItem>
            </>
          ) : (
            <>
              <MenuItem
                backgroundColor="transparent"
                _hover={{ backgroundColor: colors.darkLight }}
                onClick={() => navigate('/settings')}
              >
                Workspace & Account Settings
              </MenuItem>
              <MenuDivider borderColor={colors.border} />
              <MenuItem
                backgroundColor="transparent"
                color="red.400"
                _hover={{ backgroundColor: 'rgba(244, 63, 94, 0.14)' }}
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
                Logout
              </MenuItem>
            </>
          )}
        </MenuList>
      </Menu>
    </Box>
  );
}

function StatusDot({ color }: { color: string }) {
  return (
    <Box
      as="span"
      display="inline-block"
      width="8px"
      height="8px"
      borderRadius="full"
      backgroundColor={color}
      flexShrink={0}
    />
  );
}

function BottomSection() {
  const colors = useThemedColors();
  const user = useAuth();
  const navigate = useNavigate();
  const {
    isOpen: isInfoOpen,
    onOpen: onInfoOpen,
    onClose: onInfoClose,
  } = useDisclosure();
  const [presenceStatus, setPresenceStatus] = useState<
    'online' | 'dnd' | 'idle' | 'offline'
  >('online');

  function toSettingsView() {
    navigate('/settings');
  }

  function toOther() {
    navigate(OTHER_REDIRECT_ROUTE);
  }

  async function logout() {
    await logoutApi().catch((err) => console.log('Logout cleanup:', err));

    localStorage.removeItem('access_token');
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    navigate('/login', { replace: true });
    window.location.reload();
  }

  function setPresence(status: 'online' | 'dnd' | 'idle' | 'offline') {
    setPresenceStatus(status);

    const socket = getChatSocket();
    if (socket) {
      socket.emit('presence:set', { status });
    }
  }

  const statusColors: Record<string, string> = {
    online: '#10B981',
    dnd: '#F43F5E',
    idle: '#F59E0B',
    offline: '#6B7280',
  };

  const statusLabels: Record<string, string> = {
    online: 'Online',
    dnd: 'Do Not Disturb',
    idle: 'Away',
    offline: 'Offline',
  };

  return (
    <Box
      padding="10px 12px"
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      backgroundColor={colors.grayDark}
      borderTop="1px solid"
      borderColor={colors.border}
    >
      <HStack spacing="10px" minWidth={0} flex="1">
        <Box position="relative" flexShrink={0}>
          <LogoAvatar size="sm" />
          <Box
            position="absolute"
            bottom="0"
            right="0"
            width="10px"
            height="10px"
            borderRadius="full"
            backgroundColor={statusColors[presenceStatus]}
            border="2px solid"
            borderColor={colors.grayDark}
          />
        </Box>
        <Box minWidth={0}>
          <Text color={colors.white} fontSize="xs" fontWeight="600" isTruncated>
            {user?.name || user?.email || 'Guest'}
          </Text>
          <HStack spacing="5px">
            <Text color={colors.textMuted} fontSize="11px" isTruncated>
              {statusLabels[presenceStatus]}
            </Text>
          </HStack>
        </Box>
      </HStack>

      <HStack spacing="2px" flexShrink={0}>
        <AppIconButton
          ariaLabel="Open info"
          tooltip="Info"
          icon={<InfoOutlineIcon boxSize={3.5} />}
          onClick={onInfoOpen}
        />
        <AppIconButton
          ariaLabel="Switch channel"
          tooltip="Switch Channel"
          icon={<RepeatIcon boxSize={3.5} />}
          onClick={toOther}
        />
        <AppIconButton
          ariaLabel="Settings"
          tooltip="Settings"
          icon={<SettingsIcon boxSize={3.5} />}
          onClick={toSettingsView}
        />
        <Menu placement="top-end">
          <MenuButton
            as={Button}
            backgroundColor="transparent"
            color={colors.textDim}
            padding="0"
            minWidth="24px"
            height="28px"
            borderRadius="8px"
            _hover={{ backgroundColor: colors.darkLight, color: colors.white }}
            _active={{ backgroundColor: colors.darkLight }}
          >
            <ChevronDownIcon />
          </MenuButton>
          <MenuList
            bg={colors.surfaceElevated}
            border="1px solid"
            borderColor={colors.border}
          >
            <MenuItem
              bg="transparent"
              _hover={{ bg: colors.darkLight }}
              onClick={() => setPresence('online')}
            >
              <HStack spacing="8px">
                <StatusDot color={statusColors.online} />
                <Text>Online</Text>
              </HStack>
            </MenuItem>
            <MenuItem
              bg="transparent"
              _hover={{ bg: colors.darkLight }}
              onClick={() => setPresence('dnd')}
            >
              <HStack spacing="8px">
                <StatusDot color={statusColors.dnd} />
                <Text>Do Not Disturb</Text>
              </HStack>
            </MenuItem>
            <MenuItem
              bg="transparent"
              _hover={{ bg: colors.darkLight }}
              onClick={() => setPresence('idle')}
            >
              <HStack spacing="8px">
                <StatusDot color={statusColors.idle} />
                <Text>Away</Text>
              </HStack>
            </MenuItem>
            <MenuItem
              bg="transparent"
              _hover={{ bg: colors.darkLight }}
              onClick={() => setPresence('offline')}
            >
              <HStack spacing="8px">
                <StatusDot color={statusColors.offline} />
                <Text>Offline</Text>
              </HStack>
            </MenuItem>
            <MenuDivider borderColor={colors.border} />
            <MenuItem
              bg="transparent"
              _hover={{ bg: 'rgba(244, 63, 94, 0.14)' }}
              onClick={logout}
              color="red.400"
            >
              Logout
            </MenuItem>
          </MenuList>
        </Menu>
      </HStack>

      <Modal isOpen={isInfoOpen} onClose={onInfoClose} isCentered size="sm">
        <ModalOverlay />
        <ModalContent
          backgroundColor={colors.surfaceElevated}
          color={colors.white}
          border="1px solid"
          borderColor={colors.border}
        >
          <ModalHeader fontSize="md">About Talkie</ModalHeader>
          <ModalCloseButton />
          <ModalBody paddingBottom="24px">
            <Text fontSize="sm" color={colors.textDim} lineHeight="1.6">
              Real-time team collaboration & messaging. Use the gear icon for
              account and server settings, or the status menu to update your
              presence.
            </Text>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
