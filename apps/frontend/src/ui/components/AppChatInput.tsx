import React, { useEffect, useRef, useState } from 'react';
import { Box, Input, Text } from '@chakra-ui/react';
import {
  AddIcon,
  AtSignIcon,
  CalendarIcon,
  LinkIcon,
  ArrowForwardIcon,
} from '@chakra-ui/icons';
import AppIconButton from './AppIconButton';
import { useThemedColors } from '../theme/colors';
import { getChatSocket } from '../../app/realtime';
import { Message } from '../../app/datamodels';
import { useAuth } from '../../hooks/useAuth';
import {
  sendMessage as sendChatMessage,
  uploadMessageFiles,
} from '../../app/services/message.service';

const GUEST_USER_ID = '78085bee-8de6-4d20-afa7-4375d9971064';

type SendMessageDto = {
  channelId: string;
  message: string;
  attachments?: Array<{
    url: string;
    fileName?: string;
    mimeType?: string;
    sizeBytes?: number;
  }>;
};

export type AppChatInputProps = {
  scrollToBottom: VoidFunction;
  serverId: string;
  channelId: string;
  replyTarget?: Message | null;
  onClearReplyTarget?: VoidFunction;
  onMessageSent?: (message: Message) => void;
};

export default function AppChatInput({
  scrollToBottom,
  serverId,
  channelId,
  replyTarget,
  onClearReplyTarget,
  onMessageSent,
}: AppChatInputProps) {
  const colors = useThemedColors();
  const [message, setMessage] = useState<string>('');
  const [isLoading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [uploadedAttachments, setUploadedAttachments] = useState<
    SendMessageDto['attachments']
  >([]);
  const user = useAuth();
  const typingTimerRef = useRef<number | null>(null);
  const isTypingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function stopTyping() {
    const socket = getChatSocket();

    if (socket && isTypingRef.current) {
      socket.emit('typing:stop', { serverId, channelId });
    }

    isTypingRef.current = false;

    if (typingTimerRef.current) {
      window.clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  }

  function startTyping() {
    const socket = getChatSocket();
    if (!socket) {
      return;
    }

    if (!isTypingRef.current) {
      socket.emit('typing:start', { serverId, channelId });
      isTypingRef.current = true;
    }

    if (typingTimerRef.current) {
      window.clearTimeout(typingTimerRef.current);
    }

    typingTimerRef.current = window.setTimeout(() => {
      stopTyping();
    }, 1200);
  }

  async function sendMessage({
    channelId,
    message,
    attachments = [],
  }: SendMessageDto): Promise<Message | null | undefined> {
    setLoading(true);
    setErrorMessage('');
    stopTyping();

    try {
      const sentMessage = await sendChatMessage({
        channelId,
        content: message,
        parentMessageId: replyTarget?.id ?? null,
        threadRootMessageId:
          replyTarget?.threadRootMessageId ?? replyTarget?.id ?? null,
        attachments,
        guestUserId: user?.id ?? GUEST_USER_ID,
      });

      setMessage('');
      setUploadedAttachments([]);
      onClearReplyTarget?.();
      onMessageSent?.(sentMessage);
      scrollToBottom();
      return sentMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      setErrorMessage('Failed to send message. Please try again.');
      setLoading(false);
      return null;
    } finally {
      setLoading(false);
    }
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  async function uploadFiles(fileList: FileList | null) {
    if (!fileList?.length) {
      return;
    }

    try {
      setLoading(true);
      const attachments = await uploadMessageFiles(
        channelId,
        Array.from(fileList),
      );
      setUploadedAttachments((current) => [...(current ?? []), ...attachments]);
    } catch (error) {
      console.error('Error uploading files:', error);
      setErrorMessage('Failed to upload files.');
    } finally {
      setLoading(false);
    }
  }

  function handleSend() {
    if (!message && !uploadedAttachments?.length) {
      return;
    }

    sendMessage({
      channelId,
      message,
      attachments: uploadedAttachments ?? [],
    });
  }

  function onKeyPress({ key }: any) {
    if (key === 'Enter') {
      handleSend();
    }
  }

  function onInput(event: any) {
    if (!event) {
      return;
    }

    const nextMessage = event?.target?.value ?? '';
    setMessage(nextMessage);

    if (nextMessage) {
      startTyping();
    } else {
      stopTyping();
    }
  }

  useEffect(() => {
    return () => {
      stopTyping();
    };
  }, []);

  return (
    <Box
      paddingX="16px"
      paddingBottom="16px"
      paddingTop="6px"
      backgroundColor={colors.grayLight}
    >
      {replyTarget ? (
        <Box
          marginBottom="8px"
          paddingX="12px"
          paddingY="6px"
          borderRadius="10px"
          backgroundColor={colors.surfaceElevated}
          border="1px solid"
          borderColor={colors.border}
          borderLeft="3px solid"
          borderLeftColor={colors.accent}
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          color={colors.textDim}
          fontSize="xs"
        >
          <Text isTruncated>
            Replying to{' '}
            <Text as="span" fontWeight="600" color={colors.white}>
              {replyTarget.app_users?.name ?? 'message'}
            </Text>
          </Text>
          <Box
            as="button"
            onClick={onClearReplyTarget}
            marginLeft="10px"
            color={colors.textMuted}
            _hover={{ color: colors.white }}
            background="none"
            border="none"
            cursor="pointer"
            fontWeight="600"
          >
            Dismiss
          </Box>
        </Box>
      ) : null}

      <Box
        display="flex"
        alignItems="center"
        gap="6px"
        backgroundColor={colors.darkLight}
        border="1px solid"
        borderColor={colors.border}
        padding="5px 8px"
        borderRadius="10px"
        transition="border-color 0.16s ease, box-shadow 0.16s ease"
        _focusWithin={{
          borderColor: colors.accent,
          boxShadow: `0 0 0 1px ${colors.accent}`,
        }}
      >
        <AppIconButton
          ariaLabel="Attach files"
          tooltip="Attach files"
          size="sm"
          withBackground
          icon={<AddIcon boxSize={3} />}
          onClick={openFilePicker}
        />
        <Input
          ref={fileInputRef}
          type="file"
          multiple
          display="none"
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            void uploadFiles(event.target.files)
          }
        />
        <Input
          height="36px"
          backgroundColor="transparent"
          color={colors.white}
          fontSize="sm"
          value={message}
          border="none"
          _focus={{ boxShadow: 'none' }}
          placeholder="Message channel..."
          _placeholder={{ color: colors.textMuted }}
          onInput={onInput}
          onKeyPress={onKeyPress}
          disabled={isLoading}
        />
        <AppIconButton
          ariaLabel="Attach files"
          tooltip="Upload attachment"
          icon={<CalendarIcon boxSize={3.5} />}
          onClick={openFilePicker}
        />
        <AppIconButton
          ariaLabel="Mention"
          tooltip="Mention"
          icon={<AtSignIcon boxSize={3.5} />}
        />
        <AppIconButton
          ariaLabel="Send message"
          tooltip="Send"
          icon={<ArrowForwardIcon boxSize={4} />}
          onClick={handleSend}
          disabled={
            isLoading || (!message.trim() && !uploadedAttachments?.length)
          }
          backgroundColor={
            message.trim() || uploadedAttachments?.length
              ? colors.accent
              : 'transparent'
          }
          color={
            message.trim() || uploadedAttachments?.length
              ? 'white'
              : colors.textMuted
          }
          _hover={{
            backgroundColor:
              message.trim() || uploadedAttachments?.length
                ? colors.accentHover
                : colors.darkLight,
            color: 'white',
          }}
        />
      </Box>

      {uploadedAttachments?.length ? (
        <Box
          marginTop="8px"
          display="flex"
          flexWrap="wrap"
          gap="6px"
          color={colors.white}
          fontSize="xs"
        >
          {uploadedAttachments.map((attachment) => (
            <Box
              key={attachment.url}
              padding="3px 10px"
              borderRadius="6px"
              backgroundColor={colors.accentSoft}
              border="1px solid"
              borderColor={colors.border}
              color={colors.white}
            >
              {attachment.fileName ?? attachment.url}
            </Box>
          ))}
        </Box>
      ) : null}
      {errorMessage ? (
        <Text marginTop="6px" color="red.400" fontSize="xs">
          {errorMessage}
        </Text>
      ) : null}
    </Box>
  );
}
