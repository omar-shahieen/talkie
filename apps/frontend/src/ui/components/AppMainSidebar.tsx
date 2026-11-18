import { Avatar, Box, Divider, Tooltip, VStack } from '@chakra-ui/react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AddIcon } from '@chakra-ui/icons';
import {
  discoverPublicServers,
  fetchMyServers,
  fetchServers,
} from '../../app/services/server.service';
import { getAccessToken } from '../../app/authStorage';
import { useAuth } from '../../hooks/useAuth';
import { useThemedColors } from '../theme/colors';

export default function AppMainSidebar() {
  const colors = useThemedColors();
  const user = useAuth();
  const navigate = useNavigate();
  const { serverId: activeServerId } = useParams<{ serverId?: string }>();
  const [servers, setServers] = useState<any[]>([]);
  const logoSrc = '/talkie-logo.png';

  useEffect(() => {
    let isMounted = true;

    async function loadServers() {
      try {
        if (user?.id) {
          const mine = await fetchMyServers(user.id);
          const list =
            Array.isArray(mine) && mine.length > 0
              ? mine
              : await fetchServers();
          if (isMounted) {
            setServers(Array.isArray(list) ? list : []);
          }
          return;
        }

        if (getAccessToken()) {
          const list = await fetchServers();
          if (isMounted) {
            setServers(Array.isArray(list) ? list : []);
          }
          return;
        }

        const discovered = await discoverPublicServers({ limit: 20 });
        if (isMounted) {
          setServers(Array.isArray(discovered) ? discovered : []);
        }
      } catch {
        if (isMounted) {
          setServers([]);
        }
      }
    }

    void loadServers();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  function handleServerClick(server: any) {
    const firstChannelId = server?.channels?.[0]?.id;
    if (server?.id && firstChannelId) {
      navigate(`/servers/${server.id}/channels/${firstChannelId}`);
    }
  }

  return (
    <Box
      width="68px"
      minWidth="68px"
      paddingY="12px"
      backgroundColor={colors.grayDarkest}
      borderRight="1px solid"
      borderColor={colors.border}
      display="flex"
      flexDirection="column"
      alignItems="center"
      overflowX="hidden"
      overflowY="auto"
      css={{
        '&::-webkit-scrollbar': { display: 'none' },
        scrollbarWidth: 'none',
      }}
    >
      <Tooltip label="Talkie Home" placement="right" hasArrow>
        <Box
          borderRadius="10px"
          border="1px solid"
          borderColor={colors.borderStrong}
          backgroundColor={colors.surfaceElevated}
          cursor="pointer"
          onClick={() => navigate('/')}
          transition="all 0.15s ease"
          _hover={{
            borderColor: colors.accent,
          }}
        >
          <Avatar
            height="38px"
            width="38px"
            borderRadius="9px"
            src={logoSrc}
            name="Talkie"
            bg={colors.surfaceElevated}
          />
        </Box>
      </Tooltip>

      <Divider marginY="12px" width="28px" borderColor={colors.border} />

      <VStack spacing="8px" align="center" width="full">
        {servers.map((server, index) => {
          const isActive = Boolean(
            activeServerId && server.id === activeServerId,
          );
          return (
            <Tooltip
              key={server.id ?? `${server.name ?? 'server'}-${index}`}
              label={server.name || 'Workspace'}
              placement="right"
              hasArrow
            >
              <Box
                position="relative"
                display="flex"
                alignItems="center"
                justifyContent="center"
                width="full"
                onClick={() => handleServerClick(server)}
              >
                <Box
                  position="absolute"
                  left="0"
                  width="3px"
                  height={isActive ? '22px' : '0px'}
                  borderRightRadius="full"
                  backgroundColor={colors.accent}
                  transition="height 0.15s ease"
                />
                <Avatar
                  size="sm"
                  width="38px"
                  height="38px"
                  cursor="pointer"
                  borderRadius="10px"
                  border="1px solid"
                  borderColor={isActive ? colors.accent : colors.border}
                  backgroundColor={
                    isActive ? colors.accent : colors.surfaceElevated
                  }
                  color={colors.white}
                  fontWeight="600"
                  fontSize="xs"
                  src={server.icon || undefined}
                  name={server.name}
                  transition="all 0.15s ease"
                  _hover={{
                    borderColor: colors.accent,
                    backgroundColor: isActive
                      ? colors.accent
                      : colors.darkLight,
                  }}
                />
              </Box>
            </Tooltip>
          );
        })}

        {user?.id && (
          <Tooltip
            label="Manage Workspaces & Settings"
            placement="right"
            hasArrow
          >
            <Box
              cursor="pointer"
              onClick={() => navigate('/settings')}
              display="flex"
              alignItems="center"
              justifyContent="center"
              width="38px"
              height="38px"
              borderRadius="10px"
              border="1px solid"
              borderColor={colors.border}
              backgroundColor={colors.surfaceElevated}
              color={colors.textDim}
              transition="all 0.15s ease"
              _hover={{
                backgroundColor: colors.darkLight,
                borderColor: colors.borderStrong,
                color: colors.white,
              }}
            >
              <AddIcon boxSize={3} />
            </Box>
          </Tooltip>
        )}
      </VStack>
    </Box>
  );
}
