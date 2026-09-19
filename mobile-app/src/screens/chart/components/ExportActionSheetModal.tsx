import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Share2, Download, FileText, X, CheckCircle, AlertCircle } from 'lucide-react-native';
import { useTheme } from '../../../theme/ThemeProvider';

interface ExportActionSheetModalProps {
  visible: boolean;
  onClose: () => void;
  onShareImage: () => void;
  onSaveGallery: () => void;
  onSharePdf: () => void;
  divisionLabel: string;
  isLoading: boolean;
  loadingText: string;
  statusMessage: { type: 'success' | 'error'; text: string } | null;
}

export const ExportActionSheetModal: React.FC<ExportActionSheetModalProps> = ({
  visible,
  onClose,
  onShareImage,
  onSaveGallery,
  onSharePdf,
  divisionLabel,
  isLoading,
  loadingText,
  statusMessage,
}) => {
  const { colors, spacing, typography } = useTheme();

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={isLoading ? undefined : onClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop press to close when not loading */}
        <Pressable
          style={styles.backdrop}
          onPress={isLoading ? undefined : onClose}
        />

        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Top handle pill */}
          <View style={styles.handleWrapper}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          {/* Sheet Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.title,
                  {
                    color: colors.textPrimary,
                    fontSize: typography.sizes.md,
                    fontFamily: typography.fonts.heading,
                  },
                ]}
              >
                Export Birth Chart
              </Text>
              <Text style={{ color: colors.accent, fontSize: typography.sizes.xs, marginTop: 2 }}>
                Current View: {divisionLabel}
              </Text>
            </View>

            <Pressable
              disabled={isLoading}
              onPress={onClose}
              style={[styles.closeButton, { backgroundColor: colors.background }]}
            >
              <X size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Inline Loading Banner */}
          {isLoading && (
            <View style={[styles.loadingBox, { backgroundColor: colors.background, borderColor: colors.accent }]}>
              <ActivityIndicator size="small" color={colors.accent} style={{ marginRight: 10 }} />
              <Text style={{ color: colors.textPrimary, fontSize: typography.sizes.sm }}>
                {loadingText || 'Processing export...'}
              </Text>
            </View>
          )}

          {/* Inline Status Feedback Banner */}
          {!isLoading && statusMessage && (
            <View
              style={[
                styles.statusBox,
                {
                  backgroundColor:
                    statusMessage.type === 'success' ? '#0f291e' : '#2a1215',
                  borderColor:
                    statusMessage.type === 'success' ? colors.success || '#10B981' : colors.error || '#EF4444',
                },
              ]}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle size={18} color={colors.success || '#10B981'} style={{ marginRight: 8 }} />
              ) : (
                <AlertCircle size={18} color={colors.error || '#EF4444'} style={{ marginRight: 8 }} />
              )}
              <Text
                style={{
                  flex: 1,
                  color: statusMessage.type === 'success' ? '#a7f3d0' : '#fecaca',
                  fontSize: typography.sizes.xs,
                }}
              >
                {statusMessage.text}
              </Text>
            </View>
          )}

          {/* Action Options */}
          <View style={styles.optionsList}>
            {/* Share as Image */}
            <Pressable
              disabled={isLoading}
              onPress={onShareImage}
              style={({ pressed }) => [
                styles.optionItem,
                {
                  backgroundColor: pressed ? colors.background : colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={[styles.iconContainer, { backgroundColor: colors.background }]}>
                <Share2 size={20} color={colors.accent} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>
                  Share as Image
                </Text>
                <Text style={[styles.optionSubtext, { color: colors.textSecondary }]}>
                  Open native share sheet to send chart PNG via WhatsApp, Messages, etc.
                </Text>
              </View>
            </Pressable>

            {/* Save to Gallery */}
            <Pressable
              disabled={isLoading}
              onPress={onSaveGallery}
              style={({ pressed }) => [
                styles.optionItem,
                {
                  backgroundColor: pressed ? colors.background : colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={[styles.iconContainer, { backgroundColor: colors.background }]}>
                <Download size={20} color={colors.accent} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>
                  Save to Photo Gallery
                </Text>
                <Text style={[styles.optionSubtext, { color: colors.textSecondary }]}>
                  Save high-res PNG image directly to your device photo library.
                </Text>
              </View>
            </Pressable>

            {/* Share as PDF */}
            <Pressable
              disabled={isLoading}
              onPress={onSharePdf}
              style={({ pressed }) => [
                styles.optionItem,
                {
                  backgroundColor: pressed ? colors.background : colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={[styles.iconContainer, { backgroundColor: colors.background }]}>
                <FileText size={20} color={colors.accent} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>
                  Save or Share as PDF
                </Text>
                <Text style={[styles.optionSubtext, { color: colors.textSecondary }]}>
                  Generate a 1-page printable PDF with birth metadata and chart layout.
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 10,
  },
  handleWrapper: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontWeight: 'bold',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  optionsList: {
    gap: 12,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionSubtext: {
    fontSize: 11,
    lineHeight: 15,
  },
});

export default ExportActionSheetModal;
