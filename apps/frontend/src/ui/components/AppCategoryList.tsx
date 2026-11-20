import { Box, Skeleton, Stack, Text } from '@chakra-ui/react';
import React, { useEffect, useState } from 'react';
import AppCategoryChannelList from './AppCategoryChannelList';
import {
  discoverPublicServers,
  fetchMyServers,
  fetchServers,
} from '../../app/services/server.service';
import { useAuth } from '../../hooks/useAuth';
import { getAccessToken } from '../../app/authStorage';
import { useThemedColors } from '../theme/colors';

export default function AppCategoryList() {
  const colors = useThemedColors();
  const user = useAuth();
  const [servers, setServers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadServers() {
      try {
        setIsLoading(true);
        setErrorMessage('');

        if (!user?.id && !getAccessToken()) {
          const discovered = await discoverPublicServers({ limit: 20 });
          if (isMounted) {
            setServers(Array.isArray(discovered) ? discovered : []);
          }
          return;
        }

        const data = user?.id
          ? await fetchMyServers(user.id)
          : await discoverPublicServers({ limit: 20 });

        const fallbackData =
          Array.isArray(data) && data.length === 0
            ? await fetchServers()
            : data;

        if (isMounted) {
          setServers(Array.isArray(fallbackData) ? fallbackData : []);
        }
      } catch (error) {
        console.error('Error fetching servers:', error);
        if (isMounted) {
          setErrorMessage('Unable to load servers.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadServers();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  if (isLoading) {
    return (
      <Box flexGrow={1} padding="14px 12px">
        <Stack spacing="10px">
          <Skeleton height="16px" width="55%" borderRadius="6px" />
          <Skeleton height="32px" borderRadius="8px" />
          <Skeleton height="32px" borderRadius="8px" />
          <Skeleton height="32px" borderRadius="8px" />
        </Stack>
      </Box>
    );
  }

  if (errorMessage) {
    return (
      <Box flexGrow={1} padding="14px 12px">
        <Text color="red.400" fontSize="xs">
          {errorMessage}
        </Text>
      </Box>
    );
  }

  if (!servers.length) {
    return (
      <Box flexGrow={1} padding="14px 12px">
        <Text color={colors.textMuted} fontSize="xs">
          No servers available.
        </Text>
      </Box>
    );
  }

  return (
    <Box
      flexGrow={1}
      height="0px"
      display="flex"
      overflowY="auto"
      flexDirection="column"
      paddingY="12px"
      paddingX="8px"
      gap="12px"
    >
      {servers.map((server, idx) => (
        <AppCategoryChannelList key={server.id || idx} server={server} />
      ))}
    </Box>
  );
}
