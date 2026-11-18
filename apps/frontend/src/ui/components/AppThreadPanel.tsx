import React, { useEffect, useState } from 'react';
import {
  Avatar,
  Badge,
  Box,
  Text,
  Center,
  Spinner,
  Link,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
} from '@chakra-ui/react';
import { AttachmentIcon } from '@chakra-ui/icons';
import { useThemedColors } from '../theme/colors';
import { Message } from '../../app/datamodels';
import AppChatInput from './AppChatInput';
import { useAuth } from '../../hooks/useAuth';
import { getChatSocket } from '../../app/realtime';
import {
  fetchThreadMessages,
  toggleMessageReaction as toggleThreadReaction,
  normalizeMessage,
} from '../../app/services/message.service';
import { normalizeBlobUrl } from '../../app/services/api.service';
import { useSocketEvent } from '../../hooks/useSocketEvent';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '🎉'];

export type AppThreadPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  rootMessage: Message | null;
  serverId: string;
  channelId: string;
  onMessageSent?: () => void;
};

export default function AppThreadPanel({
  isOpen,
  onClose,
  rootMessage,
  serverId,
  channelId,
  onMessageSent,
}: AppThreadPanelProps) {
  const colors = useThemedColors();
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [isLoading, setLoading] = useState(false);
  const currentUser = useAuth();

  useSocketEvent<any>(
    getChatSocket,
    'message:deleted',
    (payload) => {
      const payloadChannelId = payload?.channelId ?? payload?.channel_id;
      if (payloadChannelId && payloadChannelId !== channelId) {
        return;
      }

      if (payload?.id === rootMessage?.id) {
        onClose();
        return;
      }

      setThreadMessages((old) => old.filter((item) => item.id !== payload?.id));
    },
    [channelId, rootMessage?.id, onClose],
  );

  useSocketEvent<any>(
    getChatSocket,
    'message:deletedForEveryone',
    (payload) => {
      const payloadChannelId = payload?.channelId ?? payload?.channel_id;
      if (payloadChannelId && payloadChannelId !== channelId) {
        return;
      }

      if (payload?.id === rootMessage?.id) {
        onClose();
        return;
      }

      setThreadMessages((old) => old.filter((item) => item.id !== payload?.id));
    },
    [channelId, rootMessage?.id, onClose],
  );

  useEffect(() => {
    if (!isOpen || !rootMessage?.id) {
      return;
    }

    void loadThreadMessages();
  }, [isOpen, rootMessage?.id]);

  const loadThreadMessages = async () => {
    if (!rootMessage?.id) return;

    setLoading(true);
    try {
      const data = await fetchThreadMessages(rootMessage.id);
      const messages = data
        .filter((msg: any) => msg.id !== rootMessage.id)
        .map((msg: any) => normalizeMessage(msg));

      setThreadMessages(messages);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching thread messages:', error);
      setLoading(false);
    }
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    const currentMessage = [rootMessage, ...threadMessages].find(
      (m) => m?.id === messageId,
    );
    if (!currentMessage) return;

    const hasReaction = (currentMessage.reactions ?? []).some(
      (reaction) =>
        reaction.emoji === emoji && reaction.userId === currentUser?.id,
    );

    try {
      await toggleThreadReaction(messageId, emoji, hasReaction);
      await loadThreadMessages();
    } catch (error) {
      console.error('Failed to update thread reaction', error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
      <ModalOverlay />
      <ModalContent
        backgroundColor={colors.surfaceElevated}
        border="1px solid"
        borderColor={colors.border}
        borderRadius="12px"
        maxHeight="82vh"
        display="flex"
        flexDirection="column"
        overflow="hidden"
      >
        <ModalHeader
          color={colors.white}
          fontSize="sm"
          fontWeight="600"
          borderBottomWidth="1px"
          borderBottomColor={colors.border}
        >
          Discussion Thread
        </ModalHeader>
        <ModalCloseButton color={colors.textDim} />
        <ModalBody
          flex="1"
          overflowY="auto"
          display="flex"
          flexDirection="column"
          padding="0px"
        >
          {isLoading ? (
            <Center height="100%" paddingY="28px">
              <Spinner size="md" color={colors.accent} />
            </Center>
          ) : (
            <>
              {rootMessage && (
                <Box
                  borderBottomWidth="1px"
                  borderBottomColor={colors.border}
                  backgroundColor={colors.grayLight}
                >
                  <ThreadMessageItem
                    message={rootMessage}
                    isRoot
                    currentUserId={currentUser?.id}
                    onToggleReaction={toggleReaction}
                  />
                </Box>
              )}

              {threadMessages.length === 0 ? (
                <Center paddingY="32px">
                  <Text color={colors.textMuted} fontSize="xs">
                    No replies in this thread yet.
                  </Text>
                </Center>
              ) : (
                threadMessages.map((msg) => (
                  <ThreadMessageItem
                    key={msg.id}
                    message={msg}
                    currentUserId={currentUser?.id}
                    onToggleReaction={toggleReaction}
                  />
                ))
              )}
            </>
          )}
        </ModalBody>

        <Box
          borderTopWidth="1px"
          borderTopColor={colors.border}
          backgroundColor={colors.grayLight}
          paddingTop="6px"
        >
          <AppChatInput
            scrollToBottom={() => {}}
            serverId={serverId}
            channelId={channelId}
            replyTarget={rootMessage}
            onClearReplyTarget={() => {}}
            onMessageSent={onMessageSent}
          />
        </Box>
      </ModalContent>
    </Modal>
  );
}

type ThreadMessageItemProps = {
  message: Message;
  currentUserId?: string | null;
  isRoot?: boolean;
  onToggleReaction: (messageId: string, emoji: string) => Promise<void>;
};

function ThreadMessageItem({
  message,
  currentUserId,
  isRoot = false,
  onToggleReaction,
}: ThreadMessageItemProps) {
  const colors = useThemedColors();
  const [isHovering, setIsHovering] = useState(false);

  const reactionGroups = (message.reactions ?? []).reduce(
    (groups, reaction) => {
      const existing = groups[reaction.emoji] ?? {
        emoji: reaction.emoji,
        count: 0,
        reactedByMe: false,
      };

      existing.count += 1;
      if (reaction.userId === currentUserId) {
        existing.reactedByMe = true;
      }

      groups[reaction.emoji] = existing;
      return groups;
    },
    {} as Record<
      string,
      { emoji: string; count: number; reactedByMe: boolean }
    >,
  );

  const isToday =
    new Date(message.created_at).toLocaleDateString() ===
    new Date().toLocaleDateString();

  const date = `${
    isToday ? 'Today' : new Date(message.created_at).toLocaleDateString()
  } at ${new Date(message.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;

  return (
    <Box
      display="flex"
      paddingX="16px"
      paddingY="12px"
      borderLeft={isRoot ? `3px solid ${colors.accent}` : 'none'}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      _hover={{ backgroundColor: colors.messageHover }}
    >
      <Avatar
        src={message.app_users?.avatar}
        name={message.app_users?.name}
        marginRight="12px"
        size="xs"
        marginTop="2px"
      />
      <Box flex="1">
        <Box justifyContent="start" alignItems="center" display="flex" gap="8px">
          <Text color={colors.white} fontSize="xs" fontWeight="600">
            <Link>{message.app_users?.name}</Link>
          </Text>
          <Text fontSize="11px" color={colors.textMuted}>
            {date}
          </Text>
          {isRoot && (
            <Badge
              fontSize="9px"
              borderRadius="4px"
              backgroundColor={colors.accentSoft}
              color={colors.accent}
              textTransform="none"
            >
              Original
            </Badge>
          )}
        </Box>
        <Text fontSize="sm" color={colors.textDim} marginTop="4px" lineHeight="1.5">
          {message.text}
        </Text>

        {message.attachments?.length ? (
          <Box marginTop="8px" display="flex" flexWrap="wrap" gap="6px">
            {message.attachments.map((attachment) => (
              <Box
                key={attachment.id ?? attachment.url}
                padding="6px 10px"
                borderRadius="8px"
                backgroundColor={colors.darkLight}
                border="1px solid"
                borderColor={colors.border}
              >
                <a
                  href={normalizeBlobUrl(attachment.url)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Text color={colors.accent} fontSize="xs" fontWeight="500">
                    <AttachmentIcon mr="4px" boxSize={3} />
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
                  borderColor: reaction.reactedByMe
                    ? colors.accent
                    : colors.border,
                  backgroundColor: reaction.reactedByMe
                    ? colors.accentSoft
                    : colors.darkLight,
                  color: colors.white,
                  borderRadius: '6px',
                  padding: '2px 8px',
                  fontSize: '11px',
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
                    backgroundColor: colors.darkLight,
                    color: colors.white,
                    borderRadius: '6px',
                    padding: '2px 7px',
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  {emoji}
                </button>
              ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
