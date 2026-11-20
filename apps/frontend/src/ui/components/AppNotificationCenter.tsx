import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Badge,
  Text,
  VStack,
  HStack,
  Button,
  Skeleton,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverCloseButton,
  Spinner,
  Center,
  useToast,
} from '@chakra-ui/react';
import { BellIcon } from '@chakra-ui/icons';
import { useThemedColors } from '../theme/colors';
import { getNotificationsSocket } from '../../app/realtime';
import {
  fetchNotifications,
  markNotificationAsRead,
} from '../../app/services/notification.service';
import { useSocketEvent } from '../../hooks/useSocketEvent';

type Notification = {
  id: string;
  title: string;
  content: string;
  isRead: boolean;
  created_at: string;
  link?: string;
};

export type AppNotificationCenterProps = {
  onNotificationClick?: (notification: Notification) => void;
};

export default function AppNotificationCenter({
  onNotificationClick,
}: AppNotificationCenterProps) {
  const colors = useThemedColors();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const initialRef = useRef(null);
  const toast = useToast();

  useEffect(() => {
    void fetchNotificationsList();
  }, []);

  const fetchNotificationsList = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const notifs = await fetchNotifications();
      setNotifications(notifs);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setErrorMessage('Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useSocketEvent<any>(
    getNotificationsSocket,
    'notification:recieved',
    (payload) => {
      const newNotification: Notification = {
        id: payload.id || `notif-${Date.now()}`,
        title: payload.title || 'New Notification',
        content: payload.content || payload.message || '',
        isRead: false,
        created_at:
          payload.created_at || payload.createdAt || new Date().toISOString(),
        link: payload.link,
      };

      setNotifications((prev) => {
        const exists = prev.some((item) => item.id === newNotification.id);
        if (exists) {
          return prev.map((item) =>
            item.id === newNotification.id
              ? { ...item, ...newNotification }
              : item,
          );
        }

        return [newNotification, ...prev];
      });
    },
    [],
  );

  useSocketEvent<any>(
    getNotificationsSocket,
    'notification:received',
    (payload) => {
      const newNotification: Notification = {
        id: payload.id || `notif-${Date.now()}`,
        title: payload.title || 'New Notification',
        content: payload.content || payload.message || '',
        isRead: false,
        created_at:
          payload.created_at || payload.createdAt || new Date().toISOString(),
        link: payload.link,
      };

      setNotifications((prev) => {
        const exists = prev.some((item) => item.id === newNotification.id);
        if (exists) {
          return prev.map((item) =>
            item.id === newNotification.id
              ? { ...item, ...newNotification }
              : item,
          );
        }

        return [newNotification, ...prev];
      });
    },
    [],
  );

  const markAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, isRead: true } : notif,
        ),
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast({
        title: 'Could not update notification',
        description: 'Please try again.',
        status: 'error',
        duration: 2200,
        isClosable: true,
      });
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
    await Promise.all(unreadIds.map((id) => markAsRead(id)));
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      void markAsRead(notification.id);
    }

    if (onNotificationClick) {
      onNotificationClick(notification);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const hasUnread = unreadCount > 0;

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <Popover
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      initialFocusRef={initialRef}
      placement="bottom-end"
    >
      <PopoverTrigger>
        <Box
          position="relative"
          cursor="pointer"
          onClick={() => setIsOpen(!isOpen)}
          display="flex"
          alignItems="center"
          justifyContent="center"
          width="32px"
          height="32px"
          borderRadius="8px"
          color={colors.textDim}
          _hover={{ backgroundColor: colors.darkLight, color: colors.white }}
          transition="all 0.14s ease"
          title="Notifications"
        >
          <BellIcon boxSize={4} />
          {hasUnread && (
            <Badge
              position="absolute"
              top="2px"
              right="2px"
              backgroundColor={colors.accent}
              color="white"
              borderRadius="full"
              padding="0px 4px"
              fontSize="9px"
              fontWeight="600"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Box>
      </PopoverTrigger>

      <PopoverContent
        backgroundColor={colors.surfaceElevated}
        borderColor={colors.border}
        borderRadius="12px"
        boxShadow="2xl"
        width="360px"
        maxHeight="480px"
        display="flex"
        flexDirection="column"
        overflow="hidden"
      >
        <PopoverHeader
          borderBottomWidth="1px"
          borderBottomColor={colors.border}
          color={colors.white}
          fontWeight="600"
          fontSize="xs"
          padding="12px 14px"
          display="flex"
          justifyContent="space-between"
          alignItems="center"
        >
          <Text>Notifications {unreadCount > 0 && `(${unreadCount})`}</Text>
          {unreadCount > 0 && (
            <Button
              size="xs"
              variant="ghost"
              fontSize="11px"
              color={colors.accent}
              _hover={{ color: colors.accentHover, bg: colors.accentSoft }}
              onClick={markAllAsRead}
              marginRight="20px"
            >
              Mark all read
            </Button>
          )}
        </PopoverHeader>

        <PopoverCloseButton color={colors.textDim} top="8px" />

        <PopoverBody padding="0px" overflowY="auto" maxHeight="380px" flex="1">
          {isLoading ? (
            <VStack spacing="8px" align="stretch" padding="12px">
              <Skeleton height="44px" borderRadius="8px" />
              <Skeleton height="44px" borderRadius="8px" />
              <Center py="2">
                <Spinner size="sm" color={colors.accent} />
              </Center>
            </VStack>
          ) : errorMessage ? (
            <Center height="120px" flexDirection="column" gap="10px">
              <Text color="red.400" fontSize="xs">
                {errorMessage}
              </Text>
              <Button size="xs" onClick={() => void fetchNotificationsList()}>
                Retry
              </Button>
            </Center>
          ) : notifications.length === 0 ? (
            <Center height="110px">
              <Text color={colors.textMuted} fontSize="xs">
                You are all caught up.
              </Text>
            </Center>
          ) : (
            <VStack spacing="0" align="stretch">
              {notifications.map((notification, index) => (
                <Box
                  key={notification.id}
                  padding="12px 14px"
                  borderBottomWidth={
                    index < notifications.length - 1 ? '1px' : '0px'
                  }
                  borderBottomColor={colors.border}
                  backgroundColor={
                    notification.isRead ? 'transparent' : colors.accentSoft
                  }
                  cursor="pointer"
                  _hover={{ backgroundColor: colors.darkLight }}
                  transition="background-color 0.14s ease"
                  onClick={() => handleNotificationClick(notification)}
                >
                  <HStack
                    justify="space-between"
                    align="flex-start"
                    spacing="8px"
                  >
                    <VStack align="start" spacing="3px" flex="1">
                      <HStack justify="space-between" width="100%">
                        <Text
                          color={colors.white}
                          fontWeight={notification.isRead ? '500' : '600'}
                          fontSize="xs"
                          flex="1"
                        >
                          {notification.title}
                        </Text>
                        <Text color={colors.textMuted} fontSize="11px">
                          {formatTime(notification.created_at)}
                        </Text>
                      </HStack>
                      <Text color={colors.textDim} fontSize="xs">
                        {notification.content}
                      </Text>
                    </VStack>
                    {!notification.isRead && (
                      <Box
                        width="7px"
                        height="7px"
                        borderRadius="full"
                        backgroundColor={colors.accent}
                        flexShrink={0}
                        marginTop="5px"
                      />
                    )}
                  </HStack>
                </Box>
              ))}
            </VStack>
          )}
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
}
