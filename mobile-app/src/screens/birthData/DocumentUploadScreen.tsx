import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, UploadCloud, FileText, CheckCircle2, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useSessionStore } from '../../store/useSessionStore';
import { useTokenStore } from '../../store/useTokenStore';
import { useChartStore } from '../../store/useChartStore';
import { kundaliApi } from '../../api/endpoints/kundali';
import Button from '../../components/Button';
import TextInput from '../../components/TextInput';
import Card from '../../components/Card';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { BirthDetails } from '../../api/types';

export const DocumentUploadScreen: React.FC = () => {
  const { colors, spacing, typography } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const user = useSessionStore((state) => state.user);
  const tokenStore = useTokenStore();
  const { setExtractedChart, generateChart } = useChartStore();

  const [step, setStep] = useState<'select' | 'uploading' | 'confirm'>('select');
  const [progress, setProgress] = useState(0);
  const [selectedFileName, setSelectedFileName] = useState('');
  
  // Confirmed details state
  const [extractedData, setExtractedData] = useState<BirthDetails>({
    name: 'Seeker',
    dateOfBirth: '1995-08-20',
    timeOfBirth: '08:45',
    placeOfBirth: 'New Delhi, India',
    latitude: 28.6139,
    longitude: 77.2090,
  });

  const handleSelectFile = (type: 'pdf' | 'img') => {
    setSelectedFileName(type === 'pdf' ? 'birth_certificate_scan.pdf' : 'kundali_handdrawn.jpg');
    setStep('uploading');
    setProgress(0);

    // Call API stub upload with progress callback
    kundaliApi.upload(user!.id, 'local_uri', (prog) => {
      setProgress(prog);
    }).then(({ extractedDetails }) => {
      setExtractedData(extractedDetails);
      setStep('confirm');
    }).catch(err => {
      console.error(err);
      setStep('select');
    });
  };

  const handleConfirm = async () => {
    // Requires 10 tokens
    if (tokenStore.tokens < 10) {
      tokenStore.setPaywallVisible(true);
      return;
    }

    setStep('uploading'); // reuse loader UI
    setProgress(100);
    
    try {
      // Cast chart directly with confirmed details (spends 10 tokens instead of normal 5)
      const chart = await generateChart(user!.id, extractedData);
      
      // Deduct the extra 5 tokens since normal generateChart spends 5, but upload costs 10 total
      tokenStore.spendTokens(5, 'Document OCR Chart Extraction Surcharge');

      navigation.goBack();
    } catch (e) {
      console.error(e);
      setStep('confirm');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary, fontSize: typography.sizes.lg, fontFamily: typography.fonts.heading }]}>
          Upload Chart Document
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {step === 'select' && (
          <View style={styles.selectStep}>
            <Card variant="flat" style={styles.infoBox}>
              <AlertTriangle size={18} color={colors.accent} style={{ marginRight: 8 }} />
              <Text style={[styles.infoText, { color: colors.textSecondary, fontSize: typography.sizes.sm }]}>
                OCR reading costs <Text style={{ fontFamily: typography.fonts.bodyBold, color: colors.accent }}>10 tokens</Text>. You will be asked to confirm the readings before casting.
              </Text>
            </Card>

            <Pressable
              onPress={() => handleSelectFile('img')}
              style={({ pressed }) => [
                styles.uploadArea,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: spacing.borderRadius.lg,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <UploadCloud size={48} color={colors.accent} style={styles.uploadIcon} />
              <Text style={[styles.uploadTitle, { color: colors.textPrimary, fontSize: typography.sizes.md, fontFamily: typography.fonts.heading }]}>
                Choose Photo / Take Picture
              </Text>
              <Text style={[styles.uploadDesc, { color: colors.textSecondary, fontSize: typography.sizes.xs }]}>
                Supports JPG, PNG up to 10MB
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleSelectFile('pdf')}
              style={({ pressed }) => [
                styles.uploadArea,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: spacing.borderRadius.lg,
                  opacity: pressed ? 0.9 : 1,
                  marginTop: spacing.md,
                },
              ]}
            >
              <FileText size={48} color={colors.accent} style={styles.uploadIcon} />
              <Text style={[styles.uploadTitle, { color: colors.textPrimary, fontSize: typography.sizes.md, fontFamily: typography.fonts.heading }]}>
                Select PDF Document
              </Text>
              <Text style={[styles.uploadDesc, { color: colors.textSecondary, fontSize: typography.sizes.xs }]}>
                Supports standard PDF files
              </Text>
            </Pressable>
          </View>
        )}

        {step === 'uploading' && (
          <View style={styles.loadingStep}>
            <ActivityIndicator size="large" color={colors.accent} style={{ marginBottom: spacing.md }} />
            <Text style={[styles.progressTitle, { color: colors.textPrimary, fontSize: typography.sizes.md, fontFamily: typography.fonts.heading }]}>
              {progress < 100 ? `Uploading ${selectedFileName}` : 'Extracting Astrological Data...'}
            </Text>
            <View style={[styles.progressBarBg, { backgroundColor: colors.border, borderRadius: spacing.borderRadius.round }]}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    backgroundColor: colors.accent,
                    width: `${progress}%`,
                    borderRadius: spacing.borderRadius.round,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressPercent, { color: colors.textSecondary, fontSize: typography.sizes.sm }]}>
              {progress}% completed
            </Text>
          </View>
        )}

        {step === 'confirm' && (
          <View style={styles.confirmStep}>
            <Card variant="flat" style={styles.confirmHeaderBox}>
              <CheckCircle2 size={20} color={colors.success} style={{ marginRight: 8 }} />
              <Text style={[styles.confirmHeaderText, { color: colors.textPrimary, fontSize: typography.sizes.sm }]}>
                We extracted the following details. Please correct any errors before casting.
              </Text>
            </Card>

            <Card variant="elevated" style={styles.formCard}>
              <View style={styles.formFields}>
                <TextInput
                  label="Extracted Name"
                  value={extractedData.name}
                  onChangeText={(text) => setExtractedData({ ...extractedData, name: text })}
                />
                
                <TextInput
                  label="Extracted Date of Birth"
                  value={extractedData.dateOfBirth}
                  onChangeText={(text) => setExtractedData({ ...extractedData, dateOfBirth: text })}
                  placeholder="YYYY-MM-DD"
                />

                <TextInput
                  label="Extracted Time of Birth"
                  value={extractedData.timeOfBirth}
                  onChangeText={(text) => setExtractedData({ ...extractedData, timeOfBirth: text })}
                  placeholder="HH:MM"
                />

                <TextInput
                  label="Extracted Place of Birth"
                  value={extractedData.placeOfBirth}
                  onChangeText={(text) => setExtractedData({ ...extractedData, placeOfBirth: text })}
                />

                <Button
                  title="Confirm & Cast Chart (10 Tokens)"
                  onPress={handleConfirm}
                  style={styles.submitButton}
                />
              </View>
            </Card>

            <Button
              title="Cancel"
              variant="ghost"
              onPress={() => setStep('select')}
              style={{ marginTop: spacing.md }}
            />
          </View>
        )}
      </ScrollView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  scrollContainer: {
    padding: 24,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    lineHeight: 18,
  },
  uploadArea: {
    paddingVertical: 40,
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  uploadIcon: {
    marginBottom: 16,
  },
  uploadTitle: {
    fontWeight: 'bold',
    marginBottom: 6,
  },
  uploadDesc: {
    letterSpacing: 0.5,
  },
  selectStep: {
    flex: 1,
  },
  loadingStep: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  progressTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  progressBarBg: {
    width: '80%',
    height: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
  },
  progressPercent: {
    fontWeight: '500',
  },
  confirmStep: {
    flex: 1,
  },
  confirmHeaderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 20,
  },
  confirmHeaderText: {
    flex: 1,
    fontWeight: '500',
  },
  formCard: {
    padding: 20,
  },
  formFields: {
    gap: 16,
  },
  submitButton: {
    marginTop: 16,
  },
});
export default DocumentUploadScreen;
