import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Box, Button, Input, Text } from '@chakra-ui/react';
import { resetPassword } from '../../app/services/auth-api.service';

export default function ResetPasswordView() {
  const location = useLocation();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetToken = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('token') ?? '';
  }, [location.search]);

  async function submitResetPassword() {
    if (!resetToken) {
      setStatus('Missing reset token.');
      return;
    }

    if (!newPassword || !confirmPassword) {
      setStatus('Enter and confirm the new password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    setStatus('');

    try {
      await resetPassword({
        newPassword,
        newPasswordConfirm: confirmPassword,
        resetToken,
      });

      setStatus('Password updated successfully. You can sign in now.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : 'Unable to reset password.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      backgroundColor="#0B0D12"
      backgroundImage="radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.16), transparent 55%)"
      padding="24px"
    >
      <Box
        width="100%"
        maxW="420px"
        backgroundColor="#1B1F2C"
        border="1px solid rgba(255, 255, 255, 0.08)"
        borderRadius="20px"
        padding="32px"
        color="#F4F6FB"
        boxShadow="2xl"
      >
        <Text fontSize="2xl" fontWeight="bold" letterSpacing="-0.02em" marginBottom="6px">
          Reset Password
        </Text>

        <Text marginBottom="20px" color="rgba(244, 246, 251, 0.65)" fontSize="sm">
          Enter a new password for your Talkie account.
        </Text>

        <Input
          type="password"
          placeholder="New password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          backgroundColor="#232838"
          borderColor="rgba(255, 255, 255, 0.08)"
          marginBottom="12px"
        />
        <Input
          type="password"
          placeholder="Confirm password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          backgroundColor="#232838"
          borderColor="rgba(255, 255, 255, 0.08)"
          marginBottom="16px"
        />

        {status ? (
          <Text marginBottom="16px" color="yellow.300" fontSize="xs">
            {status}
          </Text>
        ) : null}

        <Button
          backgroundColor="#6366F1"
          color="white"
          _hover={{ backgroundColor: '#818CF8' }}
          width="full"
          onClick={submitResetPassword}
          isLoading={isSubmitting}
        >
          Update Password
        </Button>
      </Box>
    </Box>
  );
}
