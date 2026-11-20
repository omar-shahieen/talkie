import React, { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Badge,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  Link,
  SimpleGrid,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
} from '@chakra-ui/react';
import { useThemedColors } from '../theme/colors';
import {
  createRole,
  deleteRole,
  fetchRoles,
  updateRole,
  RoleRecord,
} from '../../app/services/roles.service';
import {
  resolveAppAccess,
  resolveServerAccess,
} from '../../app/services/access-control.service';
import { fetchCurrentUser, UserPayload } from '../../app/services/user.service';

const PERMISSIONS: Array<{ key: string; value: number }> = [
  { key: 'ViewChannel', value: Math.pow(2, 0) },
  { key: 'SendMessages', value: Math.pow(2, 1) },
  { key: 'ManageMessages', value: Math.pow(2, 2) },
  { key: 'ManageChannels', value: Math.pow(2, 3) },
  { key: 'ManageRoles', value: Math.pow(2, 4) },
  { key: 'KickMembers', value: Math.pow(2, 5) },
  { key: 'BanMembers', value: Math.pow(2, 6) },
  { key: 'Administrator', value: Math.pow(2, 7) },
];

function toPermissionString(keys: string[]) {
  return keys
    .reduce((acc, key) => {
      const found = PERMISSIONS.find((item) => item.key === key);
      return found ? acc | found.value : acc;
    }, 0)
    .toString();
}

function fromPermissionString(value?: string) {
  let bits = 0;

  try {
    bits = Number(value || '0');
  } catch {
    bits = 0;
  }

  return PERMISSIONS.filter((item) => (bits & item.value) === item.value).map(
    (item) => item.key,
  );
}

export default function AdminManagementView() {
  const [currentUser, setCurrentUser] = useState<UserPayload | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [rolesError, setRolesError] = useState('');

  const [serverId, setServerId] = useState('');
  const [roleName, setRoleName] = useState('');
  const [rolePosition, setRolePosition] = useState('0');
  const [isEveryone, setIsEveryone] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const [editingRoleId, setEditingRoleId] = useState('');
  const [editName, setEditName] = useState('');
  const [editPosition, setEditPosition] = useState('0');
  const [editPermissions, setEditPermissions] = useState<string[]>([]);

  const [statusMessage, setStatusMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [resolveUserId, setResolveUserId] = useState('');
  const [resolveServerId, setResolveServerId] = useState('');
  const [accessCheckResult, setAccessCheckResult] = useState('');
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);

  const canAccessAdmin = useMemo(
    () => currentUser?.appRole === 'admin',
    [currentUser?.appRole],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadCurrentUser() {
      try {
        setIsLoadingUser(true);
        const user = await fetchCurrentUser();
        if (isMounted) {
          setCurrentUser(user);
        }
      } catch {
        if (isMounted) {
          setCurrentUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoadingUser(false);
        }
      }
    }

    void loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!canAccessAdmin) {
      return;
    }

    void loadRoles();
  }, [canAccessAdmin]);

  async function loadRoles() {
    try {
      setIsLoadingRoles(true);
      setRolesError('');
      const data = await fetchRoles();
      setRoles(data);
    } catch (error) {
      setRolesError(
        error instanceof Error ? error.message : 'Unable to load roles.',
      );
    } finally {
      setIsLoadingRoles(false);
    }
  }

  async function submitRoleCreate() {
    if (!serverId || !roleName.trim()) {
      setStatusMessage('Server id and role name are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setStatusMessage('');

      await createRole({
        serverId: serverId.trim(),
        name: roleName.trim(),
        position: Number(rolePosition || 0),
        isEveryone,
        permissions: toPermissionString(selectedPermissions),
      });

      setRoleName('');
      setRolePosition('0');
      setIsEveryone(false);
      setSelectedPermissions([]);
      setStatusMessage('Role created successfully.');
      await loadRoles();
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : 'Unable to create role.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEditingRole(role: RoleRecord) {
    setEditingRoleId(role.id);
    setEditName(role.name);
    setEditPosition(String(role.position ?? 0));
    setEditPermissions(fromPermissionString(role.permissions));
  }

  async function submitRoleUpdate(roleId: string) {
    try {
      setIsSubmitting(true);
      setStatusMessage('');

      await updateRole(roleId, {
        name: editName.trim(),
        position: Number(editPosition || 0),
        permissions: toPermissionString(editPermissions),
      });

      setEditingRoleId('');
      setStatusMessage('Role updated successfully.');
      await loadRoles();
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : 'Unable to update role.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitRoleDelete(roleId: string) {
    try {
      setIsSubmitting(true);
      setStatusMessage('');
      await deleteRole(roleId);
      setStatusMessage('Role deleted successfully.');
      await loadRoles();
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : 'Unable to delete role.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function checkAppAccess() {
    try {
      setIsCheckingAccess(true);
      const data = await resolveAppAccess();
      setAccessCheckResult(data?.message || 'App access resolved.');
    } catch (error) {
      setAccessCheckResult(
        error instanceof Error
          ? error.message
          : 'Unable to resolve app access.',
      );
    } finally {
      setIsCheckingAccess(false);
    }
  }

  async function checkServerAccess() {
    if (!resolveUserId || !resolveServerId) {
      setAccessCheckResult('User id and server id are required.');
      return;
    }

    try {
      setIsCheckingAccess(true);
      const data = await resolveServerAccess(
        resolveUserId.trim(),
        resolveServerId.trim(),
      );
      setAccessCheckResult(data?.message || 'Server access resolved.');
    } catch (error) {
      setAccessCheckResult(
        error instanceof Error
          ? error.message
          : 'Unable to resolve server access.',
      );
    } finally {
      setIsCheckingAccess(false);
    }
  }

  const colors = useThemedColors();

  if (isLoadingUser) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minH="200px"
      >
        <Spinner color={colors.accent} />
      </Box>
    );
  }

  if (!canAccessAdmin) {
    return (
      <Box
        padding="24px"
        borderRadius="12px"
        backgroundColor={colors.surfaceElevated}
        border="1px solid"
        borderColor={colors.border}
      >
        <Heading size="md" color={colors.white} marginBottom="8px">
          Admin Console
        </Heading>
        <Text fontSize="xs" color="red.400" marginBottom="12px">
          Access restricted: administrator privileges are required.
        </Text>
        <Link
          as={RouterLink}
          to="/settings"
          color={colors.accent}
          fontSize="xs"
        >
          ← Return to Account Settings
        </Link>
      </Box>
    );
  }

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
      <Box>
        <Heading
          size="md"
          color={colors.white}
          letterSpacing="-0.02em"
          marginBottom="4px"
        >
          Administration & Access Control
        </Heading>
        <Text fontSize="xs" color={colors.textDim}>
          Configure RBAC roles, bitmask permissions, and verify workspace policy
          enforcement.
        </Text>
      </Box>

      <Box
        padding="20px"
        backgroundColor={colors.surfaceElevated}
        border="1px solid"
        borderColor={colors.border}
        borderRadius="12px"
      >
        <Text
          fontSize="sm"
          fontWeight="600"
          color={colors.white}
          marginBottom="4px"
        >
          Roles & Permissions
        </Text>
        <Text fontSize="xs" color={colors.textMuted} marginBottom="16px">
          Define server-level roles and assign granular capability flags.
        </Text>

        <VStack align="stretch" spacing="12px" marginBottom="20px">
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing="12px">
            <FormControl>
              <FormLabel fontSize="xs" color={colors.textDim} mb="4px">
                Server ID
              </FormLabel>
              <Input
                {...inputProps}
                value={serverId}
                onChange={(event) => setServerId(event.target.value)}
                placeholder="Target server ID"
              />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="xs" color={colors.textDim} mb="4px">
                Role Name
              </FormLabel>
              <Input
                {...inputProps}
                value={roleName}
                onChange={(event) => setRoleName(event.target.value)}
                placeholder="e.g. Moderator"
              />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="xs" color={colors.textDim} mb="4px">
                Hierarchy Position
              </FormLabel>
              <HStack spacing="12px">
                <Input
                  {...inputProps}
                  value={rolePosition}
                  onChange={(event) => setRolePosition(event.target.value)}
                  placeholder="0"
                  type="number"
                  maxW="110px"
                />
                <Checkbox
                  size="sm"
                  isChecked={isEveryone}
                  onChange={(event) => setIsEveryone(event.target.checked)}
                >
                  <Text fontSize="xs" color={colors.textDim}>
                    Everyone role
                  </Text>
                </Checkbox>
              </HStack>
            </FormControl>
          </SimpleGrid>

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
              marginBottom="8px"
            >
              Capability Flags
            </Text>
            <SimpleGrid columns={{ base: 2, md: 4 }} spacing="8px">
              {PERMISSIONS.map((permission) => (
                <Checkbox
                  key={permission.key}
                  size="sm"
                  isChecked={selectedPermissions.includes(permission.key)}
                  onChange={(event) => {
                    setSelectedPermissions((current) =>
                      event.target.checked
                        ? [...current, permission.key]
                        : current.filter((item) => item !== permission.key),
                    );
                  }}
                >
                  <Text fontSize="xs" color={colors.white}>
                    {permission.key}
                  </Text>
                </Checkbox>
              ))}
            </SimpleGrid>
          </Box>

          <Box>
            <Button
              size="sm"
              backgroundColor={colors.accent}
              color="white"
              _hover={{ backgroundColor: colors.accentHover }}
              onClick={submitRoleCreate}
              isLoading={isSubmitting}
            >
              Create Role
            </Button>
          </Box>
        </VStack>

        {statusMessage ? (
          <Text marginBottom="12px" fontSize="xs" color={colors.accent}>
            {statusMessage}
          </Text>
        ) : null}

        {rolesError ? (
          <Text marginBottom="12px" fontSize="xs" color="red.400">
            {rolesError}
          </Text>
        ) : null}

        {isLoadingRoles ? (
          <Spinner size="sm" color={colors.accent} />
        ) : (
          <Box
            borderRadius="8px"
            border="1px solid"
            borderColor={colors.border}
            overflowX="auto"
          >
            <Table size="sm" variant="simple">
              <Thead backgroundColor={colors.grayLight}>
                <Tr>
                  <Th
                    color={colors.textMuted}
                    borderColor={colors.border}
                    fontSize="10px"
                  >
                    Name
                  </Th>
                  <Th
                    color={colors.textMuted}
                    borderColor={colors.border}
                    fontSize="10px"
                  >
                    Server
                  </Th>
                  <Th
                    color={colors.textMuted}
                    borderColor={colors.border}
                    fontSize="10px"
                  >
                    Position
                  </Th>
                  <Th
                    color={colors.textMuted}
                    borderColor={colors.border}
                    fontSize="10px"
                  >
                    Permissions
                  </Th>
                  <Th
                    color={colors.textMuted}
                    borderColor={colors.border}
                    fontSize="10px"
                  >
                    Actions
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {roles.map((role) => {
                  const isEditing = editingRoleId === role.id;

                  return (
                    <Tr key={role.id}>
                      <Td
                        borderColor={colors.border}
                        fontSize="xs"
                        fontWeight="600"
                      >
                        {isEditing ? (
                          <Input
                            {...inputProps}
                            value={editName}
                            onChange={(event) =>
                              setEditName(event.target.value)
                            }
                          />
                        ) : (
                          role.name
                        )}
                      </Td>
                      <Td
                        borderColor={colors.border}
                        fontSize="xs"
                        color={colors.textDim}
                      >
                        {role.serverId}
                      </Td>
                      <Td borderColor={colors.border} fontSize="xs">
                        {isEditing ? (
                          <Input
                            {...inputProps}
                            value={editPosition}
                            onChange={(event) =>
                              setEditPosition(event.target.value)
                            }
                            type="number"
                            maxW="80px"
                          />
                        ) : (
                          role.position
                        )}
                      </Td>
                      <Td borderColor={colors.border}>
                        {isEditing ? (
                          <VStack align="start" spacing="4px">
                            {PERMISSIONS.map((permission) => (
                              <Checkbox
                                key={`${role.id}-${permission.key}`}
                                size="sm"
                                isChecked={editPermissions.includes(
                                  permission.key,
                                )}
                                onChange={(event) => {
                                  setEditPermissions((current) =>
                                    event.target.checked
                                      ? [...current, permission.key]
                                      : current.filter(
                                          (item) => item !== permission.key,
                                        ),
                                  );
                                }}
                              >
                                <Text fontSize="xs">{permission.key}</Text>
                              </Checkbox>
                            ))}
                          </VStack>
                        ) : (
                          <HStack wrap="wrap" spacing="4px">
                            {fromPermissionString(role.permissions).length ? (
                              fromPermissionString(role.permissions).map(
                                (perm) => (
                                  <Badge
                                    key={perm}
                                    fontSize="10px"
                                    borderRadius="4px"
                                    backgroundColor={colors.accentSoft}
                                    color={colors.accent}
                                    textTransform="none"
                                  >
                                    {perm}
                                  </Badge>
                                ),
                              )
                            ) : (
                              <Text fontSize="xs" color={colors.textMuted}>
                                None
                              </Text>
                            )}
                          </HStack>
                        )}
                      </Td>
                      <Td borderColor={colors.border}>
                        <HStack spacing="6px">
                          {isEditing ? (
                            <>
                              <Button
                                size="xs"
                                backgroundColor={colors.success}
                                color="white"
                                onClick={() => void submitRoleUpdate(role.id)}
                                isLoading={isSubmitting}
                              >
                                Save
                              </Button>
                              <Button
                                size="xs"
                                variant="outline"
                                borderColor={colors.border}
                                onClick={() => setEditingRoleId('')}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="xs"
                              onClick={() => startEditingRole(role)}
                              variant="outline"
                              borderColor={colors.border}
                              color={colors.textDim}
                              _hover={{
                                backgroundColor: colors.darkLight,
                                color: colors.white,
                              }}
                            >
                              Edit
                            </Button>
                          )}
                          <Button
                            size="xs"
                            variant="outline"
                            borderColor="rgba(225, 29, 72, 0.35)"
                            color="red.400"
                            _hover={{
                              backgroundColor: 'rgba(225, 29, 72, 0.14)',
                            }}
                            onClick={() => void submitRoleDelete(role.id)}
                            isLoading={isSubmitting}
                          >
                            Delete
                          </Button>
                        </HStack>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </Box>
        )}
      </Box>

      <Box
        padding="20px"
        backgroundColor={colors.surfaceElevated}
        border="1px solid"
        borderColor={colors.border}
        borderRadius="12px"
      >
        <Text
          fontSize="sm"
          fontWeight="600"
          color={colors.white}
          marginBottom="4px"
        >
          Access Control Diagnostics
        </Text>
        <Text fontSize="xs" color={colors.textMuted} marginBottom="16px">
          Verify effective application-level and server-level permissions for
          any user.
        </Text>

        <HStack spacing="10px" marginBottom="14px">
          <Button
            size="sm"
            onClick={checkAppAccess}
            isLoading={isCheckingAccess}
            variant="outline"
            borderColor={colors.borderStrong}
            color={colors.white}
            _hover={{ backgroundColor: colors.darkLight }}
          >
            Check App Access
          </Button>
        </HStack>

        <HStack spacing="10px" marginBottom="14px" align="end" flexWrap="wrap">
          <FormControl maxW="260px">
            <FormLabel fontSize="xs" color={colors.textDim} mb="4px">
              User ID
            </FormLabel>
            <Input
              {...inputProps}
              value={resolveUserId}
              onChange={(event) => setResolveUserId(event.target.value)}
              placeholder="User UUID"
            />
          </FormControl>
          <FormControl maxW="260px">
            <FormLabel fontSize="xs" color={colors.textDim} mb="4px">
              Server ID
            </FormLabel>
            <Input
              {...inputProps}
              value={resolveServerId}
              onChange={(event) => setResolveServerId(event.target.value)}
              placeholder="Server UUID"
            />
          </FormControl>
          <Button
            size="sm"
            onClick={checkServerAccess}
            isLoading={isCheckingAccess}
            backgroundColor={colors.accent}
            color="white"
            _hover={{ backgroundColor: colors.accentHover }}
          >
            Check Server Access
          </Button>
        </HStack>

        <Box
          p="10px 12px"
          borderRadius="8px"
          backgroundColor={colors.grayLight}
          border="1px solid"
          borderColor={colors.border}
        >
          {accessCheckResult ? (
            <Text fontSize="xs" color={colors.accent} fontWeight="500">
              {accessCheckResult}
            </Text>
          ) : (
            <Text fontSize="xs" color={colors.textMuted}>
              Run a diagnostic check above to inspect access evaluation output.
            </Text>
          )}
        </Box>
      </Box>
    </VStack>
  );
}
