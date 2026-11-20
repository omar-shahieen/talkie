import {
  Box,
  Button,
  ButtonGroup,
  FormControl,
  FormLabel,
  Heading,
  Image,
  Input,
  Text,
  useToast,
  VStack,
} from '@chakra-ui/react';
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getAccessToken } from '../../app/authStorage';
import {
  getGoogleAuthUrl,
  login,
  requestPasswordReset,
  signup,
  verifyTfa,
} from '../../app/services/auth-api.service';
import { resolveDefaultRedirectRoute } from '../../routes/defaultRoute';
import { useThemedColors } from '../theme/colors';

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

export default function LoginView() {
  const colors = useThemedColors();
  const toast = useToast();
  const location = useLocation();
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>(() => {
    const mode = new URLSearchParams(location.search).get('mode');
    return mode === 'signup' ? 'signup' : 'signin';
  });
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [tfaLoginToken, setTfaLoginToken] = useState('');
  const [tfaToken, setTfaToken] = useState('');
  const [authStatus, setAuthStatus] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [postLoginRoute, setPostLoginRoute] = useState<string | null>(null);

  useEffect(() => {
    const pending = localStorage.getItem('pending_tfa_login_token');
    if (!pending) {
      return;
    }
    setAuthMode('signin');
    setTfaLoginToken(pending);
    setAuthStatus(
      'Two-factor authentication is required. Enter your 6-digit code.',
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    const token = getAccessToken();
    if (!token) {
      return;
    }

    resolveDefaultRedirectRoute().then((route) => {
      if (!cancelled && route !== '/login') {
        setPostLoginRoute(route);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (postLoginRoute) {
    return <Navigate to={postLoginRoute} replace />;
  }

  function loginWithGoogle() {
    window.location.href = getGoogleAuthUrl();
  }

  async function submitLogin() {
    if (!email || !password) {
      toast({
        title: 'Missing credentials',
        description: 'Enter email and password to sign in.',
        status: 'warning',
        duration: 2500,
        isClosable: true,
      });
      return;
    }

    setIsSigningIn(true);
    setAuthStatus('');

    try {
      const data = await login({ email, password });

      if (data?.tfaRequired) {
        setTfaLoginToken(data?.tfaLoginToken ?? '');
        setAuthStatus(
          'Two-factor authentication is required. Enter your 6-digit code.',
        );
        return;
      }

      const accessToken = data?.access_token;
      if (!accessToken) {
        throw new Error('Missing access token in login response');
      }

      const payload = decodeJwtPayload(accessToken) as {
        sub?: string;
        email?: string;
      } | null;

      localStorage.setItem('access_token', accessToken);
      localStorage.removeItem('token');
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: payload?.sub ?? '',
          email: payload?.email ?? email,
          name: (payload?.email ?? email).split('@')[0] || 'User',
          avatar: null,
        }),
      );

      const nextRoute = await resolveDefaultRedirectRoute();
      window.location.replace(nextRoute);
    } catch (error) {
      toast({
        title: 'Login failed',
        description:
          error instanceof Error ? error.message : 'Unable to sign in.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSigningIn(false);
    }
  }

  async function submitTfa() {
    if (!tfaLoginToken || !tfaToken) {
      setAuthStatus('Enter the 6-digit TFA code.');
      return;
    }

    setIsSigningIn(true);
    setAuthStatus('');

    try {
      const data = await verifyTfa({ tfaToken, tfaLoginToken });

      const accessToken = data?.access_token;
      if (!accessToken) {
        throw new Error('Missing access token in TFA response');
      }

      const payload = decodeJwtPayload(accessToken) as {
        sub?: string;
        email?: string;
      } | null;

      localStorage.removeItem('pending_tfa_login_token');
      localStorage.setItem('access_token', accessToken);
      localStorage.removeItem('token');
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: payload?.sub ?? '',
          email: payload?.email ?? email,
          name: (payload?.email ?? email).split('@')[0] || 'User',
          avatar: null,
        }),
      );

      setTfaLoginToken('');
      setTfaToken('');
      const nextRoute = await resolveDefaultRedirectRoute();
      window.location.replace(nextRoute);
    } catch (error) {
      setAuthStatus(
        error instanceof Error ? error.message : 'Unable to verify TFA.',
      );
    } finally {
      setIsSigningIn(false);
    }
  }

  async function submitSignup() {
    if (
      !firstName ||
      !lastName ||
      !username ||
      !email ||
      !password ||
      !passwordConfirm
    ) {
      toast({
        title: 'Missing fields',
        description: 'Fill in all fields to create an account.',
        status: 'warning',
        duration: 2500,
        isClosable: true,
      });
      return;
    }

    if (password !== passwordConfirm) {
      toast({
        title: 'Password mismatch',
        description: 'Password confirmation must match.',
        status: 'warning',
        duration: 2500,
        isClosable: true,
      });
      return;
    }

    setIsSigningIn(true);

    try {
      await signup({
        firstName,
        lastName,
        email,
        username,
        password,
        passwordConfirm,
      });

      toast({
        title: 'Account created',
        description: 'Signing you in now.',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });

      await submitLogin();
    } catch (error) {
      toast({
        title: 'Signup failed',
        description:
          error instanceof Error ? error.message : 'Unable to create account.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSigningIn(false);
    }
  }

  async function submitPasswordResetRequest() {
    if (!email) {
      toast({
        title: 'Missing email',
        description: 'Enter your email first.',
        status: 'warning',
        duration: 2500,
        isClosable: true,
      });
      return;
    }

    try {
      await requestPasswordReset(email);

      toast({
        title: 'Recovery email sent',
        description: 'Check your inbox for the reset link.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Reset request failed',
        description:
          error instanceof Error
            ? error.message
            : 'Unable to send recovery email.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  }

  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      backgroundColor={colors.grayDarkest}
      backgroundImage="radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.16), transparent 55%)"
      padding="24px"
    >
      <Box
        width="100%"
        maxW="420px"
        backgroundColor={colors.surfaceElevated}
        border="1px solid"
        borderColor={colors.border}
        borderRadius="14px"
        padding="32px"
        color={colors.white}
        boxShadow="2xl"
      >
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          marginBottom="22px"
        >
          <Box
            p="2px"
            borderRadius="14px"
            border="1px solid"
            borderColor={colors.borderStrong}
            backgroundColor={colors.darkLight}
            marginBottom="12px"
          >
            <Image
              src="/talkie-logo.png"
              alt="Talkie logo"
              boxSize="52px"
              borderRadius="12px"
              objectFit="cover"
            />
          </Box>
          <Heading size="md" letterSpacing="-0.02em" marginBottom="4px">
            Talkie
          </Heading>
          <Text color={colors.textDim} fontSize="xs" textAlign="center">
            {authMode === 'signin'
              ? 'Sign in to your workspace account'
              : 'Create a new workspace account'}
          </Text>
        </Box>

        <Box
          display="flex"
          padding="4px"
          borderRadius="12px"
          backgroundColor={colors.grayDarkest}
          border="1px solid"
          borderColor={colors.border}
          marginBottom="20px"
        >
          <Button
            flex="1"
            size="sm"
            borderRadius="9px"
            backgroundColor={
              authMode === 'signin' ? colors.accent : 'transparent'
            }
            color={authMode === 'signin' ? 'white' : colors.textDim}
            _hover={{
              backgroundColor:
                authMode === 'signin' ? colors.accentHover : colors.darkLight,
            }}
            onClick={() => {
              setAuthMode('signin');
              setAuthStatus('');
            }}
          >
            Sign in
          </Button>
          <Button
            flex="1"
            size="sm"
            borderRadius="9px"
            backgroundColor={
              authMode === 'signup' ? colors.accent : 'transparent'
            }
            color={authMode === 'signup' ? 'white' : colors.textDim}
            _hover={{
              backgroundColor:
                authMode === 'signup' ? colors.accentHover : colors.darkLight,
            }}
            onClick={() => {
              setAuthMode('signup');
              setAuthStatus('');
            }}
          >
            Sign up
          </Button>
        </Box>

        {authStatus ? (
          <Box
            padding="10px 12px"
            borderRadius="10px"
            backgroundColor="rgba(245, 158, 11, 0.12)"
            border="1px solid rgba(245, 158, 11, 0.3)"
            marginBottom="16px"
          >
            <Text color="yellow.300" fontSize="xs">
              {authStatus}
            </Text>
          </Box>
        ) : null}

        <VStack spacing="14px" align="stretch">
          {tfaLoginToken ? (
            <FormControl>
              <FormLabel fontSize="xs" color={colors.textDim}>
                TFA Code
              </FormLabel>
              <Input
                value={tfaToken}
                onChange={(e) => setTfaToken(e.target.value)}
                placeholder="123456"
                backgroundColor={colors.darkLight}
                borderColor={colors.border}
              />
            </FormControl>
          ) : null}

          {authMode === 'signup' && !tfaLoginToken ? (
            <>
              <Box display="flex" gap="12px">
                <FormControl>
                  <FormLabel fontSize="xs" color={colors.textDim}>
                    First Name
                  </FormLabel>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    backgroundColor={colors.darkLight}
                    borderColor={colors.border}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="xs" color={colors.textDim}>
                    Last Name
                  </FormLabel>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    backgroundColor={colors.darkLight}
                    borderColor={colors.border}
                  />
                </FormControl>
              </Box>
              <FormControl>
                <FormLabel fontSize="xs" color={colors.textDim}>
                  Username
                </FormLabel>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                  backgroundColor={colors.darkLight}
                  borderColor={colors.border}
                />
              </FormControl>
            </>
          ) : null}

          {!tfaLoginToken ? (
            <>
              <FormControl>
                <FormLabel fontSize="xs" color={colors.textDim}>
                  Email
                </FormLabel>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  backgroundColor={colors.darkLight}
                  borderColor={colors.border}
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="xs" color={colors.textDim}>
                  Password
                </FormLabel>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  backgroundColor={colors.darkLight}
                  borderColor={colors.border}
                />
              </FormControl>
            </>
          ) : null}

          {authMode === 'signup' && !tfaLoginToken ? (
            <FormControl>
              <FormLabel fontSize="xs" color={colors.textDim}>
                Confirm Password
              </FormLabel>
              <Input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="••••••••"
                backgroundColor={colors.darkLight}
                borderColor={colors.border}
              />
            </FormControl>
          ) : null}
        </VStack>

        <VStack spacing="10px" marginTop="22px" align="stretch">
          {tfaLoginToken ? (
            <Button
              backgroundColor={colors.accent}
              color="white"
              _hover={{ backgroundColor: colors.accentHover }}
              onClick={submitTfa}
              isLoading={isSigningIn}
              width="full"
            >
              Verify TFA
            </Button>
          ) : authMode === 'signin' ? (
            <Button
              backgroundColor={colors.accent}
              color="white"
              _hover={{ backgroundColor: colors.accentHover }}
              onClick={submitLogin}
              isLoading={isSigningIn}
              width="full"
            >
              Sign In
            </Button>
          ) : (
            <Button
              backgroundColor={colors.accent}
              color="white"
              _hover={{ backgroundColor: colors.accentHover }}
              onClick={submitSignup}
              isLoading={isSigningIn}
              width="full"
            >
              Create Account
            </Button>
          )}

          <ButtonGroup spacing={2} width="full">
            {tfaLoginToken ? (
              <Button
                flex="1"
                variant="outline"
                borderColor={colors.border}
                onClick={() => setTfaLoginToken('')}
              >
                Back
              </Button>
            ) : authMode === 'signin' ? (
              <Button
                flex="1"
                variant="ghost"
                size="sm"
                color={colors.textDim}
                _hover={{
                  backgroundColor: colors.darkLight,
                  color: colors.white,
                }}
                onClick={submitPasswordResetRequest}
              >
                Forgot password?
              </Button>
            ) : null}

            {!tfaLoginToken ? (
              <Button
                flex="1"
                variant="outline"
                size="sm"
                borderColor={colors.border}
                color={colors.white}
                _hover={{ backgroundColor: colors.darkLight }}
                onClick={loginWithGoogle}
              >
                Continue with Google
              </Button>
            ) : null}
          </ButtonGroup>
        </VStack>
      </Box>
    </Box>
  );
}
