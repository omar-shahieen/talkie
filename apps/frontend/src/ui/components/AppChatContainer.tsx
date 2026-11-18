import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Avatar,
  Box,
  Center,
  Link,
  Spinner,
  Text,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import AppChatInput from './AppChatInput';
import AppThreadPanel from './AppThreadPanel';
import { useThemedColors } from '../theme/colors';
import { getChatSocket, getNotificationsSocket } from '../../app/realtime';
import { Message } from '../../app/datamodels';
import { useAuth } from '../../hooks/useAuth';
import {
  deleteMessage as deleteChatMessage,
  deleteMessageForEveryone as deleteChatMessageForEveryone,
  editMessage as editChatMessage,
  fetchMessages as fetchChannelMessages,
  getChannel,
  normalizeMessage,
  toggleMessageReaction as toggleChatReaction,
} from '../../app/services/message.service';
import {
  canDeleteMessage,
  canDeleteMessageForEveryone,
  canEditMessage,
} from '../../app/access-control';
import { normalizeBlobUrl } from '../../app/services/api.service';
import { useSocketEvent } from '../../hooks/useSocketEvent';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '🎉'];

export type AppChatContainerProps = {
  serverId: string;
  channelId: string;
};

export default function AppChatContainer({
  serverId,
  channelId,
}: AppChatContainerProps) {
  const colors = useThemedColors();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setLoading] = useState<boolean>(false);
  const [typingLabel, setTypingLabel] = useState<string>('');
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [replyTarget, setReplyTarget] = useState<Message | null>(null);
  const [threadRoot, setThreadRoot] = useState<Message | null>(null);
  const {
    isOpen: isThreadOpen,
    onOpen: onThreadOpen,
    onClose: onThreadClose,
  } = useDisclosure();
  const currentUser = useAuth();
  const toast = useToast();
  const bottom = useRef<HTMLDivElement | null>(null);
  const userNamesRef = useRef<Record<string, string>>({});
  const hasMessages = messages.length > 0;

  useEffect(() => {
    userNamesRef.current = userNames;
  }, [userNames]);

  const fetchMessages = useCallback(async () => {
    setLoading(true);

    try {
      const data = await fetchChannelMessages(channelId);

      const nameCache: Record<string, string> = {};
      data.forEach((msg: any) => {
        if (msg.user?.id && msg.user?.name) {
          nameCache[msg.user.id] = msg.user.name;
        }
      });
      setUserNames(nameCache);

      setMessages(data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  async function toggleReaction(messageId: string, emoji: string) {
    if (!currentUser?.id) return;
    const currentUserId = currentUser.id;

    const currentMessage = messages.find((message) => message.id === messageId);
    const hasReaction = (currentMessage?.reactions ?? []).some(
      (reaction) =>
        reaction.emoji === emoji && reaction.userId === currentUser.id,
    );

    try {
      await toggleChatReaction(messageId, emoji, hasReaction);
      setMessages((old) =>
        old.map((item) => {
          if (item.id !== messageId) {
            return item;
          }

          const reactions = item.reactions ?? [];

          if (hasReaction) {
            return {
              ...item,
              reactions: reactions.filter(
                (reaction) =>
                  !(
                    reaction.emoji === emoji &&
                    reaction.userId === currentUser.id
                  ),
              ),
            };
          }

          if (
            reactions.some(
              (reaction) =>
                reaction.emoji === emoji && reaction.userId === currentUser.id,
            )
          ) {
            return item;
          }

          return {
            ...item,
            reactions: [
              ...reactions,
              {
                id: `${messageId}:${currentUserId}:${emoji}`,
                messageId,
                userId: currentUserId,
                emoji,
                created_at: new Date(),
                updated_at: new Date(),
              },
            ],
          };
        }),
      );
    } catch (error) {
      console.error('Failed to update reaction', error);
      toast({
        title: 'Reaction failed',
        status: 'error',
        duration: 2000,
      });
    }
  }

  const notifyNewMessage = useCallback(
    (payload: any) => {
      toast({
        title: 'New message',
        description: payload?.text,
        status: 'info',
        duration: 1000,
        position: 'top',
        isClosable: true,
      });
    },
    [toast],
  );

  const scrollToBottom = useCallback(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useSocketEvent<any>(
    getChatSocket,
    'typing:start',
    (payload) => {
      const payloadChannelId = payload?.channelId ?? payload?.channel_id;
      if (payloadChannelId && payloadChannelId !== channelId) {
        return;
      }

      const userId = payload?.userId;
      if (!userId) {
        return;
      }

      const userName =
        userNamesRef.current[userId] ||
        `User ${String(userId).substring(0, 8)}`;
      setTypingLabel(`${userName} is typing...`);
    },
    [channelId],
  );

  useSocketEvent<any>(
    getChatSocket,
    'typing:stop',
    (payload) => {
      const payloadChannelId = payload?.channelId ?? payload?.channel_id;
      if (payloadChannelId && payloadChannelId !== channelId) {
        return;
      }

      setTypingLabel('');
    },
    [channelId],
  );

  useSocketEvent<any>(
    getChatSocket,
    'message:created',
    (payload) => {
      const payloadChannelId = payload?.channelId ?? payload?.channel_id;
      if (payloadChannelId && payloadChannelId !== channelId) {
        return;
      }

      const newMessage = normalizeMessage(payload);

      if (payload?.user?.id && payload?.user?.name) {
        setUserNames((prev) => ({
          ...prev,
          [payload.user.id]: payload.user.name,
        }));
      }

      notifyNewMessage({
        ...payload,
        text: payload?.text ?? payload?.content,
      });
      setMessages((old) => {
        console.log('[Socket] message:created received', payload.id);
        if (old.some((item) => item.id === newMessage.id)) {
          return old.map((item) =>
            item.id === newMessage.id ? newMessage : item,
          );
        }

        return [newMessage, ...old];
      });
      scrollToBottom();
    },
    [channelId, notifyNewMessage],
  );

  useSocketEvent<any>(
    getChatSocket,
    'message:updated',
    (payload) => {
      const payloadChannelId = payload?.channelId ?? payload?.channel_id;
      if (payloadChannelId && payloadChannelId !== channelId) {
        return;
      }
      console.log('[Socket] message:updated received', payload.id);
      setMessages((old) =>
        old.map((item) =>
          item.id === payload.id
            ? {
                ...item,
                ...normalizeMessage({
                  ...item,
                  ...payload,
                  created_at: item.created_at,
                }),
              }
            : item,
        ),
      );
    },
    [channelId],
  );

  useSocketEvent<any>(
    getChatSocket,
    'message:deleted',
    (payload) => {
      const payloadChannelId = payload?.channelId ?? payload?.channel_id;
      if (payloadChannelId && payloadChannelId !== channelId) {
        return;
      }
      setMessages((old) => old.filter((item) => item.id !== payload?.id));
    },
    [channelId],
  );

  useSocketEvent<any>(
    getChatSocket,
    'message:deletedForEveryone',
    (payload) => {
      const payloadChannelId = payload?.channelId ?? payload?.channel_id;
      if (payloadChannelId && payloadChannelId !== channelId) {
        return;
      }
      setMessages((old) => old.filter((item) => item.id !== payload?.id));
    },
    [channelId],
  );

  useSocketEvent<any>(
    getChatSocket,
    'reaction:added',
    (payload) => {
      const payloadChannelId = payload?.channelId ?? payload?.channel_id;
      if (payloadChannelId && payloadChannelId !== channelId) {
        return;
      }

      const userId = String(payload?.userId || '');
      if (!userId) return;

      setMessages((old) =>
        old.map((item) => {
          if (item.id !== payload?.messageId) {
            return item;
          }

          const nextReactionId = `${payload.messageId}:${userId}:${payload.emoji}`;
          const hasExisting = (item.reactions ?? []).some(
            (reaction) =>
              reaction.emoji === payload.emoji && reaction.userId === userId,
          );

          if (hasExisting) {
            return item;
          }

          return {
            ...item,
            reactions: [
              ...(item.reactions ?? []),
              {
                id: nextReactionId,
                messageId: payload.messageId,
                userId,
                emoji: payload.emoji,
                created_at: new Date(),
                updated_at: new Date(),
              },
            ],
          };
        }),
      );
    },
    [channelId],
  );

  useSocketEvent<any>(
    getChatSocket,
    'reaction:removed',
    (payload) => {
      const payloadChannelId = payload?.channelId ?? payload?.channel_id;
      if (payloadChannelId && payloadChannelId !== channelId) {
        return;
      }

      setMessages((old) =>
        old.map((item) =>
          item.id === payload.messageId
            ? {
                ...item,
                reactions: (item.reactions ?? []).filter(
                  (reaction) =>
                    !(
                      reaction.emoji === payload.emoji &&
                      reaction.userId === payload.userId
                    ),
                ),
              }
            : item,
        ),
      );
    },
    [channelId],
  );

  useSocketEvent<any>(
    getNotificationsSocket,
    'notification:recieved',
    (payload) => {
      toast({
        title: 'Notification',
        description: payload?.content ?? 'You received an update.',
        status: 'info',
        duration: 1800,
        position: 'top',
        isClosable: true,
      });
    },
    [toast],
  );

  useEffect(() => {
    let isMounted = true;
    let roomType: 'channel' | 'dm' = 'channel';

    const socket = getChatSocket();

    async function joinRoom() {
      if (!socket) {
        return;
      }

      try {
        const channel = await getChannel(channelId);
        if (String(channel?.type).toUpperCase() === 'DM') {
          roomType = 'dm';
          socket.emit('dm:join', { channelId });
        } else {
          socket.emit('channel:join', { serverId, channelId });
        }
      } catch {
        socket.emit('channel:join', { serverId, channelId });
      }
    }

    if (socket) {
      if (socket.connected) {
        void joinRoom();
      }

      // Rejoin room on every reconnection
      socket.on('connect', joinRoom);
    }

    const retryInterval = setInterval(() => {
      if (socket && socket.connected) {
        void joinRoom();
        clearInterval(retryInterval);
      }
    }, 2000);

    fetchMessages().then(() => {
      if (isMounted) {
        scrollToBottom();
      }
    });

    return () => {
      isMounted = false;
      clearInterval(retryInterval);
      if (!socket) {
        return;
      }

      socket.off('connect', joinRoom);

      if (roomType === 'dm') {
        socket.emit('dm:leave', { channelId });
      } else {
        socket.emit('channel:leave', { serverId, channelId });
      }
    };
  }, [channelId, fetchMessages, scrollToBottom, serverId]);

  const MessageList = () => (
    <>
      {messages.map((message) => (
        <AppMessageContainer
          key={message.id}
          message={message}
          onToggleReaction={toggleReaction}
          currentUserId={currentUser?.id}
          onReply={(nextMessage) => setReplyTarget(nextMessage)}
          onOpenThread={(msg) => {
            setThreadRoot(msg);
            onThreadOpen();
          }}
          onMessageDeleted={(messageId) => {
            setMessages((old) => old.filter((item) => item.id !== messageId));

            if (threadRoot?.id === messageId) {
              setThreadRoot(null);
              onThreadClose();
            }

            if (replyTarget?.id === messageId) {
              setReplyTarget(null);
            }
          }}
          onMessageUpdated={() => {
            void fetchMessages();
          }}
        />
      ))}
    </>
  );

  return (
    <>
      <Box
        display="flex"
        flexGrow={1}
        flexDirection="column-reverse"
        height="0px"
        overflowY="scroll"
      >
        <div
          ref={bottom}
          style={{
            color: 'blue',
            height: '100px',
            width: '100px',
            position: 'relative',
          }}
        />

        {/* Messages */}
        {isLoading ? (
          <Center height="100%">
            <Spinner size="lg" color={colors.accent} thickness="3px" />
          </Center>
        ) : hasMessages ? (
          <MessageList />
        ) : (
          <Center height="100%" padding="24px">
            <Box textAlign="center" maxW="340px">
              <Text color={colors.white} fontWeight="600" fontSize="md" mb="4px">
                No messages yet
              </Text>
              <Text color={colors.textMuted} fontSize="sm">
                Start the conversation by sending the first message below.
              </Text>
            </Box>
          </Center>
        )}
      </Box>

      {typingLabel && (
        <Box
          marginY="4px"
          display="flex"
          justifyContent="start"
          alignItems="center"
          paddingX="20px"
        >
          <Text color={colors.accent} fontSize="xs" fontWeight="500">
            {typingLabel}
          </Text>
        </Box>
      )}

      <AppChatInput
        scrollToBottom={scrollToBottom}
        serverId={serverId}
        channelId={channelId}
        replyTarget={replyTarget}
        onClearReplyTarget={() => setReplyTarget(null)}
        onMessageSent={(sentMessage) => {
          if (!sentMessage) {
            return;
          }

          setMessages((old) => {
            if (old.some((item) => item.id === sentMessage.id)) {
              return old.map((item) =>
                item.id === sentMessage.id ? sentMessage : item,
              );
            }

            return [sentMessage, ...old];
          });

          scrollToBottom();
        }}
      />

      <AppThreadPanel
        isOpen={isThreadOpen}
        onClose={onThreadClose}
        rootMessage={threadRoot}
        serverId={serverId}
        channelId={channelId}
        onMessageSent={() => {
          // No fetch needed here
        }}
      />
    </>
  );
}

type AppMessageContainerProps = {
  message: Message;
  currentUserId?: string | null;
  onToggleReaction: (messageId: string, emoji: string) => Promise<void>;
  onReply: (message: Message) => void;
  onOpenThread: (message: Message) => void;
  onMessageDeleted: (messageId: string) => void;
  onMessageUpdated: VoidFunction;
};

function AppMessageContainer({
  message,
  currentUserId,
  onToggleReaction,
  onReply,
  onOpenThread,
  onMessageDeleted,
  onMessageUpdated,
}: AppMessageContainerProps) {
  const colors = useThemedColors();
  const canEditOwnMessage = canEditMessage(currentUserId, message.sent_by);
  const canDeleteOwnMessage = canDeleteMessage(currentUserId, message.sent_by);
  const canDeleteForEveryone = canDeleteMessageForEveryone(
    currentUserId,
    message.sent_by,
    message.created_at,
  );
  const [isHovering, setIsHovering] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const toast = useToast();

  const reactionGroups = (message.reactions ?? []).reduce(
    (groups, reaction) => {
      const existing = groups[reaction.emoji] ?? {
        emoji: reaction.emoji,
        count: 0,
        reactedByMe: false,
      };

      return {
        ...groups,
        [reaction.emoji]: {
          emoji: reaction.emoji,
          count: existing.count + 1,
          reactedByMe:
            existing.reactedByMe || reaction.userId === currentUserId,
        },
      };
    },
    {} as Record<
      string,
      { emoji: string; count: number; reactedByMe: boolean }
    >,
  );

  async function saveEdit() {
    if (!editText.trim()) {
      return;
    }

    try {
      await editChatMessage(message.id!, editText);
      setIsEditing(false);
      onMessageUpdated();
    } catch (error) {
      console.error('Failed to edit message', error);
    }
  }

  async function deleteMessage() {
    try {
      onMessageDeleted(message.id!);
      await deleteChatMessage(message.id!);
    } catch (error) {
      console.error('Failed to delete message', error);
      void onMessageUpdated();
    }
  }

  async function deleteForEveryone() {
    try {
      onMessageDeleted(message.id!);
      await deleteChatMessageForEveryone(message.id!);
    } catch (error) {
      console.error('Failed to delete message for everyone', error);
      void onMessageUpdated();
    }
  }

  const date = new Date(message.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Box
      position="relative"
      paddingY="2px"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Message Content */}
      <Box
        display="flex"
        paddingX="20px"
        paddingY="8px"
        transition="background 0.12s ease"
        _hover={{ backgroundColor: colors.messageHover }}
      >
        <Avatar
          size="sm"
          src={message.app_users?.avatar}
          name={message.app_users?.name}
          marginRight="14px"
          marginTop="2px"
        />
        <Box flex="1" minWidth={0}>
          <Box justifyContent="start" alignItems="baseline" display="flex" gap="8px">
            <Text color={colors.white} fontSize="sm" fontWeight="600">
              <Link _hover={{ textDecoration: 'underline', color: colors.accent }}>
                {message.app_users?.name}
              </Link>
            </Text>
            <Text fontSize="11px" color={colors.textMuted}>
              {date}
            </Text>
          </Box>
          {isEditing ? (
            <Box display="flex" gap="8px" marginTop="6px">
              <input
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.darkLight,
                  color: colors.white,
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
              <button
                onClick={saveEdit}
                style={{
                  padding: '6px 14px',
                  backgroundColor: colors.success,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditText(message.text);
                }}
                style={{
                  padding: '6px 14px',
                  backgroundColor: colors.darkLight,
                  color: colors.textDim,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
            </Box>
          ) : (
            <Box marginTop="2px">
              {message.parentMessageId ? (
                <Text fontSize="xs" color={colors.accent} marginBottom="4px" fontWeight="500">
                  ↳ Replying in thread
                </Text>
              ) : null}
              <Text fontSize="sm" color={colors.textDim} lineHeight="1.55" whiteSpace="pre-wrap">
                {message.text}
              </Text>
            </Box>
          )}

          {message.attachments?.length ? (
            <Box marginTop="8px" display="flex" flexWrap="wrap" gap="8px">
              {message.attachments.map((attachment) => (
                <Box
                  key={attachment.id ?? attachment.url}
                  padding="8px 12px"
                  borderRadius="10px"
                  backgroundColor={colors.surfaceElevated}
                  border="1px solid"
                  borderColor={colors.border}
                  _hover={{ borderColor: colors.accent }}
                  transition="border-color 0.14s ease"
                >
                  <a
                    href={normalizeBlobUrl(attachment.url)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Text color={colors.accentHover} fontSize="xs" fontWeight="500">
                      {attachment.fileName ?? attachment.url}
                    </Text>
                  </a>
                </Box>
              ))}
            </Box>
          ) : null}

          {(Object.values(reactionGroups).length > 0 || isHovering) && (
            <Box display="flex" flexWrap="wrap" gap="6px" marginTop="8px">
              {Object.values(reactionGroups).map((reaction) => (
                <button
                  key={`${message.id}-${reaction.emoji}`}
                  onClick={() => onToggleReaction(message.id!, reaction.emoji)}
                  style={{
                    border: '1px solid',
                    borderColor: reaction.reactedByMe ? colors.accent : colors.border,
                    backgroundColor: reaction.reactedByMe
                      ? colors.accentSoft
                      : colors.surfaceElevated,
                    color: colors.white,
                    borderRadius: '999px',
                    padding: '2px 10px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  {reaction.emoji} {reaction.count}
                </button>
              ))}

              {isHovering &&
                REACTION_EMOJIS.map((emoji) => (
                  <button
                    key={`${message.id}-${emoji}-picker`}
                    onClick={() => onToggleReaction(message.id!, emoji)}
                    title={`React with ${emoji}`}
                    style={{
                      border: `1px solid ${colors.border}`,
                      backgroundColor: colors.surfaceElevated,
                      color: colors.white,
                      borderRadius: '999px',
                      padding: '2px 8px',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    {emoji}
                  </button>
                ))}

              {isHovering && (
                <>
                  <button
                    onClick={() => onReply(message)}
                    style={{
                      border: `1px solid ${colors.border}`,
                      backgroundColor: colors.surfaceElevated,
                      color: colors.textDim,
                      borderRadius: '999px',
                      padding: '2px 10px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    Reply
                  </button>
                  <button
                    onClick={() => onOpenThread(message)}
                    style={{
                      border: `1px solid ${colors.border}`,
                      backgroundColor: colors.surfaceElevated,
                      color: colors.textDim,
                      borderRadius: '999px',
                      padding: '2px 10px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                    title="View thread"
                  >
                    Thread
                  </button>
                </>
              )}
            </Box>
          )}
        </Box>
      </Box>

      {/* Edit/Delete Buttons */}
      {canDeleteOwnMessage && isHovering && !isEditing && (
        <Box
          position="absolute"
          top="-10px"
          right="20px"
          display="flex"
          gap="4px"
          backgroundColor={colors.surfaceElevated}
          border="1px solid"
          borderColor={colors.border}
          padding="4px 6px"
          borderRadius="10px"
          boxShadow="lg"
          backdropFilter="blur(8px)"
        >
          {canEditOwnMessage ? (
            <button
              onClick={() => setIsEditing(true)}
              title="Edit"
              style={{
                background: 'none',
                border: 'none',
                color: colors.textDim,
                cursor: 'pointer',
                fontSize: '12px',
                padding: '3px 7px',
                fontWeight: 600,
              }}
            >
              Edit
            </button>
          ) : null}
          <button
            onClick={deleteMessage}
            title="Delete for me"
            style={{
              background: 'none',
              border: 'none',
              color: colors.danger,
              cursor: 'pointer',
              fontSize: '12px',
              padding: '3px 7px',
              fontWeight: 600,
            }}
          >
            Delete
          </button>
          {canDeleteForEveryone && (
            <button
              onClick={deleteForEveryone}
              title="Delete for everyone (within 24h)"
              style={{
                background: 'none',
                border: 'none',
                color: colors.warning,
                cursor: 'pointer',
                fontSize: '12px',
                padding: '3px 7px',
                fontWeight: 600,
              }}
            >
              Delete All
            </button>
          )}
        </Box>
      )}
    </Box>
  );
}
