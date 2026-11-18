import { Box, Skeleton, Stack, Text } from '@chakra-ui/react';
import React, { useEffect, useState } from 'react';
import AppMemberListItem from './AppMemberListItem';
import { fetchCurrentUser } from '../../app/services/user.service';
import { useThemedColors } from '../theme/colors';

export default function AppMemberList() {
  const colors = useThemedColors();
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadUsers() {
      try {
        setIsLoading(true);
        setErrorMessage('');
        const currentUser = await fetchCurrentUser();
        if (isMounted) {
          setUsers(currentUser ? [currentUser] : []);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
        if (isMounted) {
          setErrorMessage('Unable to load member list.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadUsers();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <Box
      paddingTop="16px"
      flexGrow={1}
      height="0px"
      display="flex"
      overflowY="auto"
      flexDirection="column"
      paddingX="6px"
    >
      {isLoading ? (
        <Stack spacing="10px" paddingX="6px">
          <Skeleton height="14px" width="60%" borderRadius="6px" />
          <Skeleton height="36px" borderRadius="8px" />
          <Skeleton height="36px" borderRadius="8px" />
        </Stack>
      ) : null}

      {errorMessage ? (
        <Text color="red.400" fontSize="xs" paddingX="6px" marginBottom="12px">
          {errorMessage}
        </Text>
      ) : null}

      {users.length ? (
        <Box marginBottom="24px">
          <Text
            color={colors.textMuted}
            fontSize="11px"
            fontWeight="700"
            letterSpacing="0.06em"
            textTransform="uppercase"
            paddingX="8px"
            marginBottom="8px"
          >
            Members — {users.length}
          </Text>

          {users.slice(0, 20).map((user) => (
            <AppMemberListItem
              key={user.id}
              name={user.name ?? user.email ?? 'unknown'}
            />
          ))}
        </Box>
      ) : null}
    </Box>
  );
}
