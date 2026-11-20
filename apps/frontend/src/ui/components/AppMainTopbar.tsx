import {
  AtSignIcon,
  EmailIcon,
  MoonIcon,
  NotAllowedIcon,
  SearchIcon,
  QuestionIcon,
  StarIcon,
  SunIcon,
} from '@chakra-ui/icons';
import {
  Box,
  Divider,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  useColorMode,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useThemedColors } from '../theme/colors';
import AppIconButton from './AppIconButton';
import AppNotificationCenter from './AppNotificationCenter';
import { getChannel, searchMessages } from '../../app/services/message.service';

type SearchResult = {
  id?: string;
  content?: string;
  text?: string;
  createdAt?: string;
  created_at?: string;
  channelId?: string;
  channel_id?: string;
  authorId?: string;
  sent_by?: string;
};

export default function AppMainTopbar() {
  const colors = useThemedColors();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isHelpOpen,
    onOpen: onHelpOpen,
    onClose: onHelpClose,
  } = useDisclosure();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTotal, setSearchTotal] = useState<number | null>(null);
  const { colorMode, toggleColorMode } = useColorMode();
  const navigate = useNavigate();
  const toast = useToast();
  const params = useParams<{ serverId?: string; channelId?: string }>();

  const normalizedQuery = query.trim();

  async function runSearch() {
    if (!normalizedQuery) {
      setResults([]);
      setSearchTotal(null);
      return;
    }

    try {
      setIsSearching(true);
      const data = await searchMessages({
        keyword: normalizedQuery,
        channelId: params.channelId,
        serverId: params.serverId,
        limit: 10,
      });

      setResults(Array.isArray(data.items) ? data.items : []);
      setSearchTotal(typeof data.total === 'number' ? data.total : null);
      onOpen();
    } catch (error) {
      console.error(error);
      toast({
        title: 'Search failed',
        description: 'Could not load message results.',
        status: 'error',
        duration: 2000,
        position: 'top',
      });
    } finally {
      setIsSearching(false);
    }
  }

  function handleResultClick(result: SearchResult) {
    if (params.serverId && (result.channelId ?? result.channel_id)) {
      navigate(
        `/servers/${params.serverId}/channels/${result.channelId ?? result.channel_id}`,
      );
    }
    onClose();
  }

  return (
    <>
      <Box
        height="52px"
        minHeight="52px"
        backgroundColor={colors.glassBg}
        backdropFilter="blur(10px)"
        borderBottom="1px solid"
        borderColor={colors.border}
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        paddingX="16px"
      >
        <AppMainTopbarChannelName channelId={params.channelId} />

        <HStack spacing="4px">
          <AppNotificationCenter />
          <AppIconButton
            tooltip="Mute channel"
            ariaLabel="Mute channel"
            icon={<NotAllowedIcon boxSize={3.5} />}
          />
          <AppIconButton
            tooltip="Pinned Messages"
            ariaLabel="View pinned messages"
            icon={<AtSignIcon boxSize={3.5} />}
          />
          <AppIconButton
            tooltip="Member Directory"
            ariaLabel="Toggle Memberlist"
            icon={<StarIcon boxSize={3.5} />}
          />

          <Divider
            orientation="vertical"
            height="18px"
            borderColor={colors.border}
            marginX="6px"
          />

          <InputGroup width="auto">
            <InputLeftElement pointerEvents="none" height="30px">
              <SearchIcon color={colors.textMuted} boxSize={3} />
            </InputLeftElement>
            <Input
              placeholder="Search messages..."
              color={colors.white}
              _placeholder={{ color: colors.textMuted }}
              width="180px"
              height="30px"
              fontSize="xs"
              borderRadius="7px"
              border="1px solid"
              borderColor={colors.border}
              backgroundColor={colors.grayDarkest}
              value={query}
              transition="all 0.15s ease"
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setQuery(event.target.value)
              }
              onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
                if (event.key === 'Enter') {
                  void runSearch();
                }
              }}
              _focus={{
                width: '240px',
                borderColor: colors.accent,
                boxShadow: `0 0 0 1px ${colors.accent}`,
              }}
            />
          </InputGroup>

          <AppIconButton
            tooltip="Inbox"
            ariaLabel="See inbox"
            icon={<EmailIcon boxSize={3.5} />}
          />
          <AppIconButton
            tooltip="Help"
            ariaLabel="Open help"
            icon={<QuestionIcon boxSize={3.5} />}
            onClick={onHelpOpen}
          />
          <AppIconButton
            tooltip={colorMode === 'dark' ? 'Light theme' : 'Dark theme'}
            ariaLabel="Toggle theme"
            icon={
              colorMode === 'dark' ? (
                <SunIcon boxSize={3.5} />
              ) : (
                <MoonIcon boxSize={3.5} />
              )
            }
            onClick={toggleColorMode}
          />
        </HStack>
      </Box>

      <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
        <ModalOverlay />
        <ModalContent
          backgroundColor={colors.surfaceElevated}
          color={colors.white}
          border="1px solid"
          borderColor={colors.border}
        >
          <ModalHeader
            fontSize="sm"
            fontWeight="600"
            borderBottom="1px solid"
            borderColor={colors.border}
          >
            Search Results {searchTotal !== null ? `(${searchTotal})` : ''}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody paddingY="16px">
            {isSearching ? (
              <Text color={colors.textDim} fontSize="xs">
                Searching messages...
              </Text>
            ) : results.length ? (
              <Box display="grid" gap="8px" maxH="400px" overflowY="auto">
                {results.map((result, index) => (
                  <Box
                    key={result.id ?? `${index}`}
                    padding="10px 12px"
                    borderRadius="8px"
                    backgroundColor={colors.darkLight}
                    border="1px solid"
                    borderColor={colors.border}
                    cursor="pointer"
                    transition="border-color 0.14s ease"
                    _hover={{ borderColor: colors.accent }}
                    onClick={() => handleResultClick(result)}
                  >
                    <HStack justifyContent="space-between" alignItems="start">
                      <Box minWidth={0}>
                        <Text fontSize="xs" fontWeight="600">
                          {result.content ?? result.text ?? 'Untitled message'}
                        </Text>
                        <Text fontSize="11px" color={colors.textMuted} mt="2px">
                          Channel:{' '}
                          {result.channelId ?? result.channel_id ?? 'unknown'}
                        </Text>
                      </Box>
                      <Text
                        fontSize="11px"
                        color={colors.textMuted}
                        flexShrink={0}
                      >
                        {result.createdAt ?? result.created_at ?? ''}
                      </Text>
                    </HStack>
                  </Box>
                ))}
              </Box>
            ) : (
              <Text color={colors.textDim} fontSize="xs">
                No matching messages found.
              </Text>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      <Modal isOpen={isHelpOpen} onClose={onHelpClose} size="md" isCentered>
        <ModalOverlay />
        <ModalContent
          backgroundColor={colors.surfaceElevated}
          color={colors.white}
          border="1px solid"
          borderColor={colors.border}
        >
          <ModalHeader
            fontSize="sm"
            fontWeight="600"
            borderBottom="1px solid"
            borderColor={colors.border}
          >
            Workspace Guide
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody paddingY="16px">
            <Box display="grid" gap="10px">
              <Text fontSize="xs" color={colors.textDim} lineHeight="1.6">
                • Search messages across channels by typing a query and pressing
                Enter.
              </Text>
              <Text fontSize="xs" color={colors.textDim} lineHeight="1.6">
                • Use the notification center to monitor mentions and unread
                activity in real time.
              </Text>
              <Text fontSize="xs" color={colors.textDim} lineHeight="1.6">
                • Hover over any message to add reactions, reply inline, or open
                a dedicated discussion thread.
              </Text>
            </Box>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}

function AppMainTopbarChannelName({ channelId }: { channelId?: string }) {
  const colors = useThemedColors();
  const [channelName, setChannelName] = useState('general');

  useEffect(() => {
    let isMounted = true;
    if (!channelId) {
      setChannelName('general');
      return;
    }

    getChannel(channelId)
      .then((channel) => {
        if (isMounted && channel?.name) {
          setChannelName(channel.name);
        }
      })
      .catch(() => {
        if (isMounted) {
          setChannelName('general');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [channelId]);

  return (
    <HStack spacing="8px" cursor="default" minWidth={0}>
      <Text color={colors.textMuted} fontWeight="600" fontSize="md">
        #
      </Text>
      <Text color={colors.white} fontWeight="600" fontSize="sm" isTruncated>
        {channelName}
      </Text>
    </HStack>
  );
}
