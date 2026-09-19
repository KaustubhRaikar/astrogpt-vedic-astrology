import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput as RNTextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send, Sparkles, AlertCircle } from 'lucide-react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeProvider';
import { useSessionStore } from '../../store/useSessionStore';
import { useTokenStore } from '../../store/useTokenStore';
import { useChartStore } from '../../store/useChartStore';
import EmptyState from '../../components/EmptyState';
import TokenBadge from '../../components/TokenBadge';

export const ChatScreen: React.FC = () => {
  const { colors, spacing, typography } = useTheme();
  
  const user = useSessionStore((state) => state.user);
  const tokenStore = useTokenStore();
  const { activeChart, chatMessages, sendChatMessage, isSendingMessage } = useChartStore();

  const [inputVal, setInputVal] = useState('');
  const [chatError, setChatError] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatMessages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        try {
          flatListRef.current?.scrollToEnd({ animated: true });
        } catch (e) {
          // ignore transient layout race
        }
      }, 250);
    }
  }, [chatMessages.length, isSendingMessage]);

  const handleSend = async () => {
    if (!inputVal.trim() || isSendingMessage) return;

    // Check tokens (requires 2 tokens)
    if (tokenStore.tokens < 2) {
      tokenStore.setPaywallVisible(true);
      return;
    }

    const text = inputVal.trim();
    setInputVal('');
    setChatError(null);

    try {
      await sendChatMessage(user!.id, text);
    } catch (e: any) {
      console.error(e);
      // Restore input if error occurs
      setInputVal(text);
      setChatError('Failed to communicate with AI Counsel. Please check server connection.');
    }
  };

  const renderMessageItem = ({ item }: { item: any }) => {
    const isUser = item.role === 'user';
    return (
      <Animated.View
        entering={FadeIn.duration(300)}
        style={[
          styles.messageRow,
          {
            justifyContent: isUser ? 'flex-end' : 'flex-start',
            marginBottom: spacing.md,
          },
        ]}
      >
        {!isUser && (
          <View style={[styles.avatar, { backgroundColor: colors.surfaceElevated, borderColor: colors.accent }]}>
            <Sparkles size={12} color={colors.accent} />
          </View>
        )}
        <View
          style={[
            styles.bubble,
            {
              backgroundColor: isUser ? colors.accent : colors.surface,
              borderColor: isUser ? 'transparent' : colors.border,
              borderWidth: isUser ? 0 : 1,
              borderTopRightRadius: isUser ? 2 : spacing.borderRadius.md,
              borderTopLeftRadius: isUser ? spacing.borderRadius.md : 2,
              borderBottomRightRadius: spacing.borderRadius.md,
              borderBottomLeftRadius: spacing.borderRadius.md,
              maxWidth: '75%',
            },
          ]}
        >
          <Text
            style={[
              styles.messageText,
              {
                color: isUser ? (colors.background === '#FAF9F6' ? '#FFFFFF' : '#0A0A0C') : colors.textPrimary,
                fontSize: typography.sizes.md,
                fontFamily: typography.fonts.body,
              },
            ]}
          >
            {item.content}
          </Text>
          <Text
            style={[
              styles.timeText,
              {
                color: isUser ? (colors.background === '#FAF9F6' ? 'rgba(255,255,255,0.7)' : 'rgba(10,10,12,0.5)') : colors.textMuted,
                fontSize: 9,
                marginTop: 4,
                textAlign: isUser ? 'right' : 'left',
              },
            ]}
          >
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </Animated.View>
    );
  };

  if (!activeChart) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary, fontSize: typography.sizes.lg, fontFamily: typography.fonts.heading }]}>
            Spiritual Counseling
          </Text>
          <TokenBadge />
        </View>
        <EmptyState
          title="Guide Offline"
          description="Cast your birth chart on the Dashboard to start a consultation thread with AstroGPT."
          actionTitle="Go to Dashboard"
          onActionPress={() => {}}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary, fontSize: typography.sizes.lg, fontFamily: typography.fonts.heading }]}>
          Spiritual Counseling
        </Text>
        <TokenBadge />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={chatMessages}
          renderItem={renderMessageItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={() =>
            isSendingMessage ? (
              <Animated.View entering={FadeIn.duration(200)} style={styles.typingContainer}>
                <View style={[styles.avatar, { backgroundColor: colors.surfaceElevated, borderColor: colors.accent }]}>
                  <Sparkles size={12} color={colors.accent} />
                </View>
                <View style={[styles.bubble, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: spacing.borderRadius.md }]}>
                  <Text style={{ color: colors.textMuted, fontStyle: 'italic', fontSize: typography.sizes.sm }}>
                    Consulting your cosmic houses...
                  </Text>
                </View>
              </Animated.View>
            ) : null
          }
        />

        {/* Input Bar */}
        <View style={[styles.inputBarContainer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          {chatError ? (
            <Animated.View entering={FadeIn.duration(200)} style={[styles.errorBanner, { borderColor: colors.error }]}>
              <AlertCircle size={14} color={colors.error} style={{ marginRight: 6 }} />
              <Text style={{ color: colors.error, fontSize: 11, flex: 1 }}>{chatError}</Text>
              <Pressable onPress={() => setChatError(null)} style={{ paddingHorizontal: 6 }}>
                <Text style={{ color: colors.accent, fontSize: 11, fontWeight: 'bold' }}>Dismiss</Text>
              </Pressable>
            </Animated.View>
          ) : (
            <View style={styles.costWarning}>
              <AlertCircle size={12} color={colors.accent} style={{ marginRight: 4 }} />
              <Text style={[styles.costText, { color: colors.textSecondary, fontSize: 10 }]}>
                Consultation costs <Text style={{ color: colors.accent, fontWeight: 'bold' }}>2 tokens</Text> per message.
              </Text>
            </View>
          )}
          <View style={styles.inputRow}>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: spacing.borderRadius.lg,
                },
              ]}
            >
              <RNTextInput
                style={[styles.input, { color: colors.textPrimary, fontSize: typography.sizes.md }]}
                placeholder="Ask about relationships, career, or transits..."
                placeholderTextColor={colors.textMuted}
                value={inputVal}
                onChangeText={setInputVal}
                onSubmitEditing={handleSend}
                editable={!isSendingMessage}
              />
            </View>
            <Pressable
              onPress={handleSend}
              disabled={!inputVal.trim() || isSendingMessage}
              style={({ pressed }) => [
                styles.sendBtn,
                {
                  backgroundColor: colors.accent,
                  borderRadius: spacing.borderRadius.round,
                  opacity: pressed || !inputVal.trim() || isSendingMessage ? 0.8 : 1,
                },
              ]}
            >
              <Send size={18} color={colors.background === '#FAF9F6' ? '#FFFFFF' : '#0A0A0C'} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#242235',
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 24,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: '100%',
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: 'transparent',
  },
  messageText: {
    lineHeight: 22,
  },
  timeText: {
    fontFamily: 'System',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  inputBarContainer: {
    borderTopWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 96 : 84,
  },
  costWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  costText: {
    fontFamily: 'System',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inputWrapper: {
    flex: 1,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    height: 48,
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontFamily: 'System',
    padding: 0,
  },
  sendBtn: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
export default ChatScreen;
