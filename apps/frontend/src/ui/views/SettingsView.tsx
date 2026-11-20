import React, { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Code,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  SimpleGrid,
  Text,
  VStack,
} from '@chakra-ui/react';
import { useThemedColors } from '../theme/colors';
import {
  changePassword as changePasswordRequest,
  initiateTfa as initiateTfaRequest,
  setTfa,
} from '../../app/services/auth-api.service';
import {
  createChannel as createChannelRequest,
  deleteChannel as deleteChannelRequest,
  fetchChannels,
  renameChannel as renameChannelRequest,
} from '../../app/services/channel.service';
import {
  fetchNotifications,
  markNotificationAsRead as markNotificationAsReadRequest,
} from '../../app/services/notification.service';
import {
  createServerInvitation,
  createServer as createServerRequest,
  deleteServer as deleteServerRequest,
  fetchServerInvitations,
  fetchServers,
  leaveServer as leaveServerRequest,
  renameServer as renameServerRequest,
} from '../../app/services/server.service';
import {
  acceptFriendRequest,
  cancelFriendRequest,
  fetchFriends,
  fetchIncomingFriendRequests,
  fetchOutgoingFriendRequests,
  rejectFriendRequest,
  sendFriendRequest,
  unfriend,
} from '../../app/services/friends.service';
import {
  acceptInvitation,
  resolveInvitation,
} from '../../app/services/invitation.service';
import { searchUsers, UserPayload } from '../../app/services/user.service';

function SettingsView() {
  const [servers, setServers] = useState<any[] | null>([]);
  const [channels, setChannels] = useState<any[] | null>([]);
  const [notifications, setNotifications] = useState<any[] | null>([]);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [changePasswordStatus, setChangePasswordStatus] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [tfaToken, setTfaToken] = useState('');
  const [tfaStatus, setTfaStatus] = useState('');
  const [tfaUri, setTfaUri] = useState('');
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelServerId, setNewChannelServerId] = useState('');
  const [createChannelStatus, setCreateChannelStatus] = useState('');
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [newServerPublic, setNewServerPublic] = useState(false);
  const [createServerStatus, setCreateServerStatus] = useState('');
  const [isCreatingServer, setIsCreatingServer] = useState(false);
  const [incomingRequests, setIncomingRequests] = useState<any[] | null>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<any[] | null>([]);
  const [friends, setFriends] = useState<any[] | null>([]);
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const [friendSearchResults, setFriendSearchResults] = useState<UserPayload[]>(
    [],
  );
  const [selectedFriendUser, setSelectedFriendUser] =
    useState<UserPayload | null>(null);
  const [isSearchingFriends, setIsSearchingFriends] = useState(false);
  const [friendStatus, setFriendStatus] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [invitationStatus, setInvitationStatus] = useState('');
  const [invitationPreview, setInvitationPreview] = useState<any | null>(null);
  const [selectedServerForInvite, setSelectedServerForInvite] = useState('');
  const [serverInvites, setServerInvites] = useState<any[] | null>([]);

  function getCurrentUser() {
    try {
      const value = localStorage.getItem('user');
      if (!value) {
        return null;
      }

      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  function getCurrentUserId() {
    return getCurrentUser()?.id ?? '';
  }

  async function createServer() {
    const ownerId = getCurrentUserId();

    if (!ownerId || !newServerName) {
      setCreateServerStatus('Enter a server name and sign in again if needed.');
      return;
    }

    setIsCreatingServer(true);
    setCreateServerStatus('');

    try {
      const data = await createServerRequest({
        name: newServerName,
        ownerId,
        isPublic: newServerPublic,
      });

      setServers((current) => [...(current ?? []), data]);
      setNewServerName('');
      setNewServerPublic(false);
      setCreateServerStatus('Server created successfully.');
    } catch (error) {
      setCreateServerStatus(
        error instanceof Error ? error.message : 'Unable to create server.',
      );
    } finally {
      setIsCreatingServer(false);
    }
  }

  useEffect(() => {
    void Promise.all([
      fetchServers(),
      fetchChannels(),
      fetchNotifications(),
      fetchIncomingFriendRequests(),
      fetchOutgoingFriendRequests(),
      fetchFriends(),
    ])
      .then(
        ([
          serversData,
          channelsData,
          notificationsData,
          incomingData,
          outgoingData,
          friendsData,
        ]) => {
          setServers(serversData ?? []);
          setChannels(channelsData ?? []);
          setNotifications(notificationsData ?? []);
          setIncomingRequests(incomingData ?? []);
          setOutgoingRequests(outgoingData ?? []);
          setFriends(friendsData ?? []);
        },
      )
      .catch((err) => console.error('Error fetching settings data:', err));
  }, []);

  async function refreshFriendData() {
    const [incomingData, outgoingData, friendsData] = await Promise.all([
      fetchIncomingFriendRequests(),
      fetchOutgoingFriendRequests(),
      fetchFriends(),
    ]);

    setIncomingRequests(incomingData ?? []);
    setOutgoingRequests(outgoingData ?? []);
    setFriends(friendsData ?? []);
  }

  async function markNotificationAsRead(notificationId: string) {
    await markNotificationAsReadRequest(notificationId);

    setNotifications((current) =>
      (current ?? []).map((notification) =>
        notification.id === notificationId
          ? { ...notification, isRead: true }
          : notification,
      ),
    );
  }

  async function changePassword() {
    if (!oldPassword || !newPassword || !newPasswordConfirm) {
      setChangePasswordStatus('Fill in all password fields.');
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      setChangePasswordStatus('New password confirmation does not match.');
      return;
    }

    setIsChangingPassword(true);
    setChangePasswordStatus('');

    try {
      await changePasswordRequest({
        oldPassword,
        newPassword,
        newPasswordConfirm,
      });

      setChangePasswordStatus('Password changed successfully.');
      setOldPassword('');
      setNewPassword('');
      setNewPasswordConfirm('');
    } catch (error) {
      setChangePasswordStatus(
        error instanceof Error ? error.message : 'Unable to change password.',
      );
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function initiateTfa() {
    try {
      const data = await initiateTfaRequest();

      setTfaUri(data?.uri ?? '');
      setTfaStatus('TFA setup started. Scan the QR URI or copy it.');
    } catch (error) {
      setTfaStatus(
        error instanceof Error ? error.message : 'Unable to initiate TFA.',
      );
    }
  }

  async function verifyTfa(mode: 'enable' | 'disable') {
    if (!tfaToken) {
      setTfaStatus('Enter the 6-digit TFA code.');
      return;
    }

    try {
      await setTfa(mode, tfaToken);

      setTfaStatus(`TFA ${mode}d successfully.`);
      setTfaToken('');
    } catch (error) {
      setTfaStatus(
        error instanceof Error ? error.message : `Unable to ${mode} TFA.`,
      );
    }
  }

  async function leaveServer(serverId: string) {
    const userId = getCurrentUserId();
    if (!userId) {
      setChangePasswordStatus('Missing current user. Sign in again.');
      return;
    }

    try {
      await leaveServerRequest(serverId, userId);

      setServers((current) =>
        (current ?? []).filter((server) => server.id !== serverId),
      );
    } catch (error) {
      setChangePasswordStatus(
        error instanceof Error ? error.message : 'Unable to leave server.',
      );
    }
  }

  async function deleteServer(serverId: string) {
    const userId = getCurrentUserId();
    if (!userId) {
      setChangePasswordStatus('Missing current user. Sign in again.');
      return;
    }

    try {
      await deleteServerRequest(serverId, userId);

      setServers((current) =>
        (current ?? []).filter((server) => server.id !== serverId),
      );
    } catch (error) {
      setChangePasswordStatus(
        error instanceof Error ? error.message : 'Unable to delete server.',
      );
    }
  }

  async function renameServer(serverId: string) {
    const nextName = window.prompt('New server name');
    if (!nextName?.trim()) {
      return;
    }

    try {
      await renameServerRequest(serverId, nextName.trim());

      setServers((current) =>
        (current ?? []).map((server) =>
          server.id === serverId
            ? { ...server, name: nextName.trim() }
            : server,
        ),
      );
    } catch (error) {
      setChangePasswordStatus(
        error instanceof Error ? error.message : 'Unable to update server.',
      );
    }
  }

  async function deleteChannel(channelId: string) {
    try {
      await deleteChannelRequest(channelId);

      setChannels((current) =>
        (current ?? []).filter((channel) => channel.id !== channelId),
      );
    } catch (error) {
      setChangePasswordStatus(
        error instanceof Error ? error.message : 'Unable to delete channel.',
      );
    }
  }

  async function renameChannel(channelId: string) {
    const nextName = window.prompt('New channel name');
    if (!nextName?.trim()) {
      return;
    }

    try {
      await renameChannelRequest(channelId, nextName.trim());

      setChannels((current) =>
        (current ?? []).map((channel) =>
          channel.id === channelId
            ? { ...channel, name: nextName.trim() }
            : channel,
        ),
      );
    } catch (error) {
      setChangePasswordStatus(
        error instanceof Error ? error.message : 'Unable to update channel.',
      );
    }
  }

  async function createChannel() {
    if (!newChannelName || !newChannelServerId) {
      setCreateChannelStatus('Enter a channel name and server id.');
      return;
    }

    setIsCreatingChannel(true);
    setCreateChannelStatus('');

    try {
      const data = await createChannelRequest({
        name: newChannelName,
        serverId: newChannelServerId,
      });

      setChannels((current) => [...(current ?? []), data]);
      setNewChannelName('');
      setCreateChannelStatus('Channel created successfully.');
    } catch (error) {
      setCreateChannelStatus(
        error instanceof Error ? error.message : 'Unable to create channel.',
      );
    } finally {
      setIsCreatingChannel(false);
    }
  }

  async function performFriendSearch() {
    const query = friendSearchQuery.trim();

    if (query.length < 2) {
      setFriendSearchResults([]);
      setFriendStatus('Type at least 2 characters to search users.');
      return;
    }

    try {
      setIsSearchingFriends(true);
      setFriendStatus('');
      const results = await searchUsers(query);
      setFriendSearchResults(results);

      if (!results.length) {
        setFriendStatus('No users found for your search query.');
      }
    } catch (error) {
      setFriendSearchResults([]);
      setFriendStatus(
        error instanceof Error ? error.message : 'Unable to search users.',
      );
    } finally {
      setIsSearchingFriends(false);
    }
  }

  async function submitFriendRequest() {
    if (!selectedFriendUser?.id) {
      setFriendStatus('Select a user from search results first.');
      return;
    }

    try {
      await sendFriendRequest(selectedFriendUser.id);
      setFriendSearchQuery('');
      setFriendSearchResults([]);
      setSelectedFriendUser(null);
      setFriendStatus('Friend request sent.');
      await refreshFriendData();
    } catch (error) {
      setFriendStatus(
        error instanceof Error
          ? error.message
          : 'Unable to send friend request.',
      );
    }
  }

  async function updateFriendRequest(
    requestId: string,
    action: 'accept' | 'reject' | 'cancel',
  ) {
    try {
      if (action === 'accept') {
        await acceptFriendRequest(requestId);
      } else if (action === 'reject') {
        await rejectFriendRequest(requestId);
      } else {
        await cancelFriendRequest(requestId);
      }

      await refreshFriendData();
    } catch (error) {
      setFriendStatus(
        error instanceof Error
          ? error.message
          : `Unable to ${action} this friend request.`,
      );
    }
  }

  async function removeFriend(friendship: any) {
    const userId = getCurrentUserId();
    const targetId =
      friendship?.userId1 === userId
        ? friendship?.userId2
        : friendship?.userId1;

    if (!targetId) {
      setFriendStatus('Unable to determine friend id.');
      return;
    }

    try {
      await unfriend(targetId);
      await refreshFriendData();
    } catch (error) {
      setFriendStatus(
        error instanceof Error ? error.message : 'Unable to remove friend.',
      );
    }
  }

  async function previewInvitation() {
    if (!inviteCode) {
      setInvitationStatus('Enter an invitation code.');
      return;
    }

    try {
      const data = await resolveInvitation(inviteCode);
      setInvitationPreview(data);
      setInvitationStatus('Invitation found. You can accept it now.');
    } catch (error) {
      setInvitationPreview(null);
      setInvitationStatus(
        error instanceof Error
          ? error.message
          : 'Unable to resolve invitation.',
      );
    }
  }

  async function acceptInvite() {
    if (!inviteCode) {
      setInvitationStatus('Enter an invitation code first.');
      return;
    }

    try {
      await acceptInvitation(inviteCode);
      setInvitationStatus('Invitation accepted successfully.');
      setInviteCode('');
      setInvitationPreview(null);
      setServers(await fetchServers());
    } catch (error) {
      setInvitationStatus(
        error instanceof Error ? error.message : 'Unable to accept invitation.',
      );
    }
  }

  async function loadServerInvitations() {
    if (!selectedServerForInvite) {
      setInvitationStatus('Select a server id first.');
      return;
    }

    try {
      const data = await fetchServerInvitations(selectedServerForInvite);
      setServerInvites(data ?? []);
    } catch (error) {
      setServerInvites([]);
      setInvitationStatus(
        error instanceof Error
          ? error.message
          : 'Unable to load server invitations.',
      );
    }
  }

  async function createInvitationCode() {
    if (!selectedServerForInvite) {
      setInvitationStatus('Select a server id first.');
      return;
    }

    try {
      await createServerInvitation(selectedServerForInvite, 24);
      setInvitationStatus('Invitation created. Refresh list to view it.');
      await loadServerInvitations();
    } catch (error) {
      setInvitationStatus(
        error instanceof Error
          ? error.message
          : 'Unable to create invitation code.',
      );
    }
  }

  const colors = useThemedColors();
  const isAdmin = getCurrentUser()?.appRole === 'admin';

  const cardProps = {
    backgroundColor: colors.surfaceElevated,
    border: '1px solid',
    borderColor: colors.border,
    borderRadius: '12px',
    padding: '20px',
  };

  const inputProps = {
    size: 'sm' as const,
    backgroundColor: colors.darkLight,
    borderColor: colors.border,
    borderRadius: '8px',
    color: colors.white,
    _placeholder: { color: colors.textMuted },
  };

  return (
    <VStack align="stretch" spacing="24px" paddingBottom="48px">
      <HStack
        justifyContent="space-between"
        alignItems="flex-start"
        flexWrap="wrap"
        gap="12px"
      >
        <Box>
          <Heading
            size="md"
            color={colors.white}
            letterSpacing="-0.02em"
            mb="4px"
          >
            Account & Workspace Settings
          </Heading>
          <Text fontSize="xs" color={colors.textDim}>
            Manage security credentials, workspaces, channels, directory
            connections, and invitations.
          </Text>
        </Box>
        {isAdmin ? (
          <Button
            as={RouterLink}
            to="/settings/admin"
            size="sm"
            variant="outline"
            borderColor={colors.borderStrong}
            color={colors.white}
            _hover={{ backgroundColor: colors.darkLight }}
          >
            Open Admin Console
          </Button>
        ) : null}
      </HStack>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing="16px">
        {/* Password Card */}
        <Box {...cardProps}>
          <Text fontSize="sm" fontWeight="600" color={colors.white} mb="2px">
            Change Password
          </Text>
          <Text fontSize="xs" color={colors.textMuted} mb="16px">
            Update your account password to keep your session secure.
          </Text>
          <VStack spacing="10px" align="stretch">
            <FormControl>
              <FormLabel fontSize="xs" color={colors.textDim} mb="4px">
                Current Password
              </FormLabel>
              <Input
                {...inputProps}
                type="password"
                placeholder="Current password"
                value={oldPassword}
                onChange={(event) => setOldPassword(event.target.value)}
              />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="xs" color={colors.textDim} mb="4px">
                New Password
              </FormLabel>
              <Input
                {...inputProps}
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="xs" color={colors.textDim} mb="4px">
                Confirm New Password
              </FormLabel>
              <Input
                {...inputProps}
                type="password"
                placeholder="Confirm new password"
                value={newPasswordConfirm}
                onChange={(event) => setNewPasswordConfirm(event.target.value)}
              />
            </FormControl>
            <Box pt="4px">
              <Button
                size="sm"
                backgroundColor={colors.accent}
                color="white"
                _hover={{ backgroundColor: colors.accentHover }}
                onClick={changePassword}
                isLoading={isChangingPassword}
              >
                Update Password
              </Button>
            </Box>
            {changePasswordStatus ? (
              <Text fontSize="xs" color={colors.accent}>
                {changePasswordStatus}
              </Text>
            ) : null}
          </VStack>
        </Box>

        {/* Two-Factor Authentication Card */}
        <Box {...cardProps}>
          <HStack justifyContent="space-between" mb="2px">
            <Text fontSize="sm" fontWeight="600" color={colors.white}>
              Two-Factor Authentication (TFA)
            </Text>
            <Badge
              fontSize="10px"
              borderRadius="4px"
              backgroundColor={colors.accentSoft}
              color={colors.accent}
            >
              TOTP
            </Badge>
          </HStack>
          <Text fontSize="xs" color={colors.textMuted} mb="16px">
            Protect your account with an authenticator app verification code.
          </Text>
          <VStack spacing="12px" align="stretch">
            <Box>
              <Button
                size="xs"
                variant="outline"
                borderColor={colors.borderStrong}
                color={colors.white}
                _hover={{ backgroundColor: colors.darkLight }}
                onClick={initiateTfa}
              >
                Generate Setup Key
              </Button>
            </Box>
            <FormControl>
              <FormLabel fontSize="xs" color={colors.textDim} mb="4px">
                Verification Code
              </FormLabel>
              <Input
                {...inputProps}
                type="text"
                placeholder="6-digit TFA code"
                value={tfaToken}
                onChange={(event) => setTfaToken(event.target.value)}
              />
            </FormControl>
            <HStack spacing="8px">
              <Button
                size="sm"
                backgroundColor={colors.accent}
                color="white"
                _hover={{ backgroundColor: colors.accentHover }}
                onClick={() => verifyTfa('enable')}
              >
                Enable TFA
              </Button>
              <Button
                size="sm"
                variant="outline"
                borderColor={colors.border}
                color={colors.textDim}
                _hover={{
                  backgroundColor: colors.darkLight,
                  color: colors.white,
                }}
                onClick={() => verifyTfa('disable')}
              >
                Disable TFA
              </Button>
            </HStack>
            {tfaUri ? (
              <Code
                p="8px"
                borderRadius="6px"
                fontSize="11px"
                backgroundColor={colors.grayDarkest}
                color={colors.textDim}
                wordBreak="break-all"
              >
                {tfaUri}
              </Code>
            ) : null}
            {tfaStatus ? (
              <Text fontSize="xs" color={colors.accent}>
                {tfaStatus}
              </Text>
            ) : null}
          </VStack>
        </Box>
      </SimpleGrid>

      {/* Workspaces / Servers Section */}
      <Box {...cardProps}>
        <Text fontSize="sm" fontWeight="600" color={colors.white} mb="2px">
          Workspaces & Servers
        </Text>
        <Text fontSize="xs" color={colors.textMuted} mb="16px">
          Create new workspaces or manage existing server memberships.
        </Text>

        <HStack spacing="10px" mb="16px" alignItems="center" flexWrap="wrap">
          <Input
            {...inputProps}
            maxW="280px"
            placeholder="New workspace name"
            value={newServerName}
            onChange={(event) => setNewServerName(event.target.value)}
          />
          <Checkbox
            size="sm"
            colorScheme="purple"
            isChecked={newServerPublic}
            onChange={(event) => setNewServerPublic(event.target.checked)}
          >
            <Text fontSize="xs" color={colors.textDim}>
              Public workspace
            </Text>
          </Checkbox>
          <Button
            size="sm"
            backgroundColor={colors.accent}
            color="white"
            _hover={{ backgroundColor: colors.accentHover }}
            onClick={createServer}
            isLoading={isCreatingServer}
          >
            Create Server
          </Button>
        </HStack>
        {createServerStatus ? (
          <Text fontSize="xs" color={colors.accent} mb="12px">
            {createServerStatus}
          </Text>
        ) : null}

        {(servers ?? []).length ? (
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing="10px">
            {(servers ?? []).map((server) => (
              <Box
                key={server.id}
                padding="12px 14px"
                borderRadius="8px"
                backgroundColor={colors.grayLight}
                border="1px solid"
                borderColor={colors.border}
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                gap="8px"
              >
                <Box minW={0}>
                  <Text
                    fontSize="xs"
                    fontWeight="600"
                    color={colors.white}
                    isTruncated
                  >
                    {server.name ?? server.id}
                  </Text>
                  <Text fontSize="11px" color={colors.textMuted} isTruncated>
                    ID: {server.id}
                  </Text>
                </Box>
                <HStack spacing="6px" flexShrink={0}>
                  <Button
                    size="xs"
                    variant="outline"
                    borderColor={colors.border}
                    color={colors.textDim}
                    _hover={{
                      backgroundColor: colors.darkLight,
                      color: colors.white,
                    }}
                    onClick={() => renameServer(server.id)}
                  >
                    Rename
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    borderColor={colors.border}
                    color={colors.textDim}
                    _hover={{
                      backgroundColor: colors.darkLight,
                      color: colors.white,
                    }}
                    onClick={() => leaveServer(server.id)}
                  >
                    Leave
                  </Button>
                  {server.ownerId === getCurrentUserId() ? (
                    <Button
                      size="xs"
                      variant="outline"
                      borderColor="rgba(225, 29, 72, 0.35)"
                      color="red.400"
                      _hover={{ backgroundColor: 'rgba(225, 29, 72, 0.14)' }}
                      onClick={() => deleteServer(server.id)}
                    >
                      Delete
                    </Button>
                  ) : null}
                </HStack>
              </Box>
            ))}
          </SimpleGrid>
        ) : (
          <Text fontSize="xs" color={colors.textMuted}>
            No workspaces available.
          </Text>
        )}
      </Box>

      {/* Channels Section */}
      <Box {...cardProps}>
        <Text fontSize="sm" fontWeight="600" color={colors.white} mb="2px">
          Channels
        </Text>
        <Text fontSize="xs" color={colors.textMuted} mb="16px">
          Provision and manage channels across your workspaces.
        </Text>

        <HStack spacing="10px" mb="16px" flexWrap="wrap">
          <Input
            {...inputProps}
            maxW="220px"
            placeholder="Channel name"
            value={newChannelName}
            onChange={(event) => setNewChannelName(event.target.value)}
          />
          <Input
            {...inputProps}
            maxW="240px"
            placeholder="Target server ID"
            value={newChannelServerId}
            onChange={(event) => setNewChannelServerId(event.target.value)}
          />
          <Button
            size="sm"
            backgroundColor={colors.accent}
            color="white"
            _hover={{ backgroundColor: colors.accentHover }}
            onClick={createChannel}
            isLoading={isCreatingChannel}
          >
            Create Channel
          </Button>
        </HStack>
        {createChannelStatus ? (
          <Text fontSize="xs" color={colors.accent} mb="12px">
            {createChannelStatus}
          </Text>
        ) : null}

        {(channels ?? []).length ? (
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing="10px">
            {(channels ?? []).map((channel) => (
              <Box
                key={channel.id}
                padding="10px 14px"
                borderRadius="8px"
                backgroundColor={colors.grayLight}
                border="1px solid"
                borderColor={colors.border}
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <HStack spacing="6px" minW={0}>
                  <Text color={colors.textMuted} fontSize="xs" fontWeight="600">
                    #
                  </Text>
                  <Text
                    fontSize="xs"
                    fontWeight="500"
                    color={colors.white}
                    isTruncated
                  >
                    {channel.name ?? channel.id}
                  </Text>
                </HStack>
                <HStack spacing="6px" flexShrink={0}>
                  <Button
                    size="xs"
                    variant="outline"
                    borderColor={colors.border}
                    color={colors.textDim}
                    _hover={{
                      backgroundColor: colors.darkLight,
                      color: colors.white,
                    }}
                    onClick={() => renameChannel(channel.id)}
                  >
                    Rename
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    borderColor="rgba(225, 29, 72, 0.35)"
                    color="red.400"
                    _hover={{ backgroundColor: 'rgba(225, 29, 72, 0.14)' }}
                    onClick={() => deleteChannel(channel.id)}
                  >
                    Delete
                  </Button>
                </HStack>
              </Box>
            ))}
          </SimpleGrid>
        ) : (
          <Text fontSize="xs" color={colors.textMuted}>
            No channels found.
          </Text>
        )}
      </Box>

      {/* Friends & Directory Section */}
      <Box {...cardProps}>
        <Text fontSize="sm" fontWeight="600" color={colors.white} mb="2px">
          Directory & Connections
        </Text>
        <Text fontSize="xs" color={colors.textMuted} mb="16px">
          Find teammates by username or email and manage connection requests.
        </Text>

        <HStack spacing="10px" mb="12px" flexWrap="wrap">
          <Input
            {...inputProps}
            maxW="320px"
            placeholder="Search by username, name, or email..."
            value={friendSearchQuery}
            onChange={(event) => setFriendSearchQuery(event.target.value)}
          />
          <Button
            size="sm"
            variant="outline"
            borderColor={colors.borderStrong}
            color={colors.white}
            _hover={{ backgroundColor: colors.darkLight }}
            onClick={performFriendSearch}
            isLoading={isSearchingFriends}
          >
            Search Directory
          </Button>
          <Button
            size="sm"
            backgroundColor={colors.accent}
            color="white"
            _hover={{ backgroundColor: colors.accentHover }}
            onClick={submitFriendRequest}
            isDisabled={!selectedFriendUser}
          >
            Send Request
          </Button>
        </HStack>

        {selectedFriendUser ? (
          <Text fontSize="xs" color={colors.accent} mb="10px">
            Selected: {selectedFriendUser.firstName}{' '}
            {selectedFriendUser.lastName} (
            {selectedFriendUser.username ||
              selectedFriendUser.email ||
              selectedFriendUser.id}
            )
          </Text>
        ) : null}

        {(friendSearchResults ?? []).length ? (
          <VStack
            align="stretch"
            spacing="6px"
            mb="14px"
            p="8px"
            borderRadius="8px"
            backgroundColor={colors.grayLight}
            border="1px solid"
            borderColor={colors.border}
          >
            {friendSearchResults.map((user) => (
              <HStack
                key={user.id}
                justifyContent="space-between"
                p="6px 8px"
                borderRadius="6px"
                _hover={{ backgroundColor: colors.darkLight }}
              >
                <Box>
                  <Text fontSize="xs" fontWeight="600" color={colors.white}>
                    {[user.firstName, user.lastName]
                      .filter(Boolean)
                      .join(' ') ||
                      user.username ||
                      'Unknown user'}
                  </Text>
                  <Text fontSize="11px" color={colors.textMuted}>
                    {user.username ? `@${user.username}` : ''}{' '}
                    {user.email ? `• ${user.email}` : ''}
                  </Text>
                </Box>
                <Button
                  size="xs"
                  variant="outline"
                  borderColor={colors.border}
                  color={colors.white}
                  onClick={() => setSelectedFriendUser(user)}
                >
                  Select
                </Button>
              </HStack>
            ))}
          </VStack>
        ) : null}

        {friendStatus ? (
          <Text fontSize="xs" color={colors.accent} mb="12px">
            {friendStatus}
          </Text>
        ) : null}

        <SimpleGrid columns={{ base: 1, md: 3 }} spacing="12px" mt="12px">
          <Box
            p="12px"
            borderRadius="8px"
            backgroundColor={colors.grayLight}
            border="1px solid"
            borderColor={colors.border}
          >
            <Text
              fontSize="xs"
              fontWeight="600"
              color={colors.textDim}
              mb="8px"
            >
              Incoming Requests ({(incomingRequests ?? []).length})
            </Text>
            <VStack align="stretch" spacing="6px">
              {(incomingRequests ?? []).map((request) => (
                <HStack key={request.id} justifyContent="space-between">
                  <Text fontSize="xs" color={colors.white} isTruncated>
                    {request.senderId}
                  </Text>
                  <HStack spacing="4px">
                    <Button
                      size="xs"
                      backgroundColor={colors.success}
                      color="white"
                      onClick={() => updateFriendRequest(request.id, 'accept')}
                    >
                      Accept
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      borderColor={colors.border}
                      color={colors.textDim}
                      onClick={() => updateFriendRequest(request.id, 'reject')}
                    >
                      Decline
                    </Button>
                  </HStack>
                </HStack>
              ))}
            </VStack>
          </Box>

          <Box
            p="12px"
            borderRadius="8px"
            backgroundColor={colors.grayLight}
            border="1px solid"
            borderColor={colors.border}
          >
            <Text
              fontSize="xs"
              fontWeight="600"
              color={colors.textDim}
              mb="8px"
            >
              Outgoing Requests ({(outgoingRequests ?? []).length})
            </Text>
            <VStack align="stretch" spacing="6px">
              {(outgoingRequests ?? []).map((request) => (
                <HStack key={request.id} justifyContent="space-between">
                  <Text fontSize="xs" color={colors.white} isTruncated>
                    {request.receiverId}
                  </Text>
                  <Button
                    size="xs"
                    variant="outline"
                    borderColor={colors.border}
                    color={colors.textDim}
                    onClick={() => updateFriendRequest(request.id, 'cancel')}
                  >
                    Cancel
                  </Button>
                </HStack>
              ))}
            </VStack>
          </Box>

          <Box
            p="12px"
            borderRadius="8px"
            backgroundColor={colors.grayLight}
            border="1px solid"
            borderColor={colors.border}
          >
            <Text
              fontSize="xs"
              fontWeight="600"
              color={colors.textDim}
              mb="8px"
            >
              Active Connections ({(friends ?? []).length})
            </Text>
            <VStack align="stretch" spacing="6px">
              {(friends ?? []).map((friendship) => {
                const userId = getCurrentUserId();
                const friendId =
                  friendship.userId1 === userId
                    ? friendship.userId2
                    : friendship.userId1;

                return (
                  <HStack
                    key={`${friendship.userId1}:${friendship.userId2}`}
                    justifyContent="space-between"
                  >
                    <Text fontSize="xs" color={colors.white} isTruncated>
                      {friendId}
                    </Text>
                    <Button
                      size="xs"
                      variant="ghost"
                      color="red.400"
                      onClick={() => removeFriend(friendship)}
                    >
                      Remove
                    </Button>
                  </HStack>
                );
              })}
            </VStack>
          </Box>
        </SimpleGrid>
      </Box>

      {/* Invitations & Notifications Grid */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing="16px">
        <Box {...cardProps}>
          <Text fontSize="sm" fontWeight="600" color={colors.white} mb="2px">
            Workspace Invitations
          </Text>
          <Text fontSize="xs" color={colors.textMuted} mb="16px">
            Redeem an invitation code or generate invite links for your server.
          </Text>

          <VStack align="stretch" spacing="12px">
            <HStack spacing="8px">
              <Input
                {...inputProps}
                placeholder="Enter invite code"
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value)}
              />
              <Button
                size="sm"
                variant="outline"
                borderColor={colors.borderStrong}
                color={colors.white}
                onClick={previewInvitation}
              >
                Inspect
              </Button>
              <Button
                size="sm"
                backgroundColor={colors.accent}
                color="white"
                _hover={{ backgroundColor: colors.accentHover }}
                onClick={acceptInvite}
              >
                Join
              </Button>
            </HStack>

            {invitationPreview ? (
              <Code
                p="8px"
                borderRadius="6px"
                fontSize="11px"
                backgroundColor={colors.grayDarkest}
                color={colors.textDim}
                whiteSpace="pre-wrap"
              >
                {JSON.stringify(invitationPreview, null, 2)}
              </Code>
            ) : null}

            <HStack spacing="8px" pt="4px">
              <Input
                {...inputProps}
                placeholder="Server ID for invite generation"
                value={selectedServerForInvite}
                onChange={(event) =>
                  setSelectedServerForInvite(event.target.value)
                }
              />
              <Button
                size="sm"
                variant="outline"
                borderColor={colors.borderStrong}
                color={colors.white}
                onClick={createInvitationCode}
              >
                Generate
              </Button>
              <Button
                size="sm"
                variant="outline"
                borderColor={colors.border}
                color={colors.textDim}
                onClick={loadServerInvitations}
              >
                List
              </Button>
            </HStack>

            {(serverInvites ?? []).length ? (
              <Code
                p="8px"
                borderRadius="6px"
                fontSize="11px"
                backgroundColor={colors.grayDarkest}
                color={colors.textDim}
                whiteSpace="pre-wrap"
              >
                {JSON.stringify(serverInvites, null, 2)}
              </Code>
            ) : null}

            {invitationStatus ? (
              <Text fontSize="xs" color={colors.accent}>
                {invitationStatus}
              </Text>
            ) : null}
          </VStack>
        </Box>

        <Box {...cardProps}>
          <Text fontSize="sm" fontWeight="600" color={colors.white} mb="2px">
            Recent Notifications
          </Text>
          <Text fontSize="xs" color={colors.textMuted} mb="16px">
            Activity and system alerts associated with your account.
          </Text>

          {(notifications ?? []).length ? (
            <VStack align="stretch" spacing="8px" maxH="240px" overflowY="auto">
              {(notifications ?? []).map((notification) => (
                <HStack
                  key={notification.id}
                  p="10px 12px"
                  borderRadius="8px"
                  backgroundColor={colors.grayLight}
                  border="1px solid"
                  borderColor={colors.border}
                  justifyContent="space-between"
                >
                  <Box minW={0}>
                    <Text fontSize="xs" color={colors.white} fontWeight="500">
                      {notification.content}
                    </Text>
                    <Text fontSize="11px" color={colors.textMuted}>
                      {notification.type} •{' '}
                      {notification.isRead ? 'Read' : 'Unread'}
                    </Text>
                  </Box>
                  {!notification.isRead && (
                    <Button
                      size="xs"
                      variant="ghost"
                      color={colors.accent}
                      onClick={() => markNotificationAsRead(notification.id)}
                    >
                      Mark read
                    </Button>
                  )}
                </HStack>
              ))}
            </VStack>
          ) : (
            <Text fontSize="xs" color={colors.textMuted}>
              No notifications recorded.
            </Text>
          )}
        </Box>
      </SimpleGrid>
    </VStack>
  );
}

export default SettingsView;
