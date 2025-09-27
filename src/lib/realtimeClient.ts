export {
  RealtimeConnectionManager,
  type ChannelSubscriptionConfig,
  type ConnectionStatus,
  subscribeToChannel,
  unsubscribeFromChannel,
  cleanupAllChannels,
  getChannelStatus,
  isChannelActive,
  ensureChannelReady,
  getExistingChannel,
  resetConnectionState,
  getConnectionStatus,
  addConnectionStatusListener,
  destroyRealtimeManager,
  resetRealtimeManager,
} from './realtimeConnectionManager';

