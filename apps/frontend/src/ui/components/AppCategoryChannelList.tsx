import { ChevronDownIcon } from '@chakra-ui/icons';
import { Box, HStack, Text } from '@chakra-ui/react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppChannelListItem from './AppChannelListItem';
import { fetchVisibleChannelsByServer } from '../../app/services/channel.service';
import { useAuth } from '../../hooks/useAuth';
import { useThemedColors } from '../theme/colors';

type AppCategoryChannelListProps = {
  server?: any;
};

export default function AppCategoryChannelList({
  server,
}: AppCategoryChannelListProps) {
  const colors = useThemedColors();
  const [channels, setChannels] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();
  const { channelId: activeChannelId } = useParams<{ channelId?: string }>();
  const user = useAuth();

  useEffect(() => {
    let isMounted = true;

    async function loadChannels() {
      if (!server?.id || !user?.id) {
        setChannels(Array.isArray(server?.channels) ? server.channels : []);
        return;
      }

      try {
        setErrorMessage('');
        const data = await fetchVisibleChannelsByServer(server.id, user.id);

        if (isMounted) {
          setChannels(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Error fetching channels by server:', error);
        if (isMounted) {
          setErrorMessage('Unable to load channels.');
          setChannels(Array.isArray(server?.channels) ? server.channels : []);
        }
      }
    }

    void loadChannels();

    return () => {
      isMounted = false;
    };
  }, [server, user?.id]);

  const serverName = server?.name || 'Main';

  const handleChannelClick = (channelId: string) => {
    if (server?.id && channelId) {
      navigate(`/servers/${server.id}/channels/${channelId}`);
    }
  };

  return (
    <Box>
      <HStack spacing="4px" paddingX="8px" marginBottom="6px">
        <ChevronDownIcon boxSize={3} color={colors.textMuted} />
        <Text
          color={colors.textMuted}
          fontSize="11px"
          fontWeight="700"
          letterSpacing="0.06em"
          textTransform="uppercase"
          isTruncated
        >
          {serverName}
        </Text>
      </HStack>

      {errorMessage ? (
        <Text color="red.400" fontSize="xs" paddingX="8px" marginBottom="6px">
          {errorMessage}
        </Text>
      ) : null}

      {channels.length ? (
        channels.map((channel, idx) => (
          <AppChannelListItem
            key={channel.id || idx}
            label={`${channel.icon ? `${channel.icon} ` : ''}${channel.name || `channel-${idx}`}`}
            active={
              activeChannelId ? channel.id === activeChannelId : idx === 0
            }
            onClick={() => handleChannelClick(channel.id)}
          />
        ))
      ) : (
        <Text color={colors.textMuted} fontSize="xs" paddingLeft="14px">
          No channels
        </Text>
      )}
    </Box>
  );
}
