import React, { useEffect } from 'react';
import { Box, Spinner, Text } from '@chakra-ui/react';
import { resolveDefaultRedirectRoute } from '../../routes/defaultRoute';

function decodeJwtPayload(token: string) {
  const payloadPart = token.split('.')[1];
  if (!payloadPart) {
    return null;
  }

  const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');

  try {
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

export default function OAuthCallbackView() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const tfaRequired = params.get('tfaRequired');
    const tfaLoginToken = params.get('tfaLoginToken');

    async function completeOAuth() {
      if (token) {
        localStorage.setItem('access_token', token);
        localStorage.removeItem('token');
        localStorage.removeItem('pending_tfa_login_token');
        const payload = decodeJwtPayload(token) as {
          sub?: string;
          email?: string;
        } | null;

        if (payload?.sub) {
          localStorage.setItem(
            'user',
            JSON.stringify({
              id: payload.sub,
              email: payload.email ?? '',
              name: (payload.email ?? 'User').split('@')[0],
              avatar: null,
            }),
          );
        }

        window.location.replace(await resolveDefaultRedirectRoute());
        return;
      }

      if (tfaRequired === '1' && tfaLoginToken) {
        localStorage.setItem('pending_tfa_login_token', tfaLoginToken);
        window.location.replace(await resolveDefaultRedirectRoute());
        return;
      }

      window.location.replace('/login');
    }

    void completeOAuth();
  }, []);

  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      flexDirection="column"
      gap="14px"
      backgroundColor="#0B0D12"
      backgroundImage="radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.14), transparent 55%)"
      color="#F4F6FB"
    >
      <Spinner size="lg" color="#6366F1" thickness="3px" speed="0.7s" />
      <Text fontSize="sm" color="rgba(244, 246, 251, 0.72)">
        Completing sign in...
      </Text>
    </Box>
  );
}
