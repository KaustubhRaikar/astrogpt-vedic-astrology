import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, MapPin, Calendar, Clock, Compass } from 'lucide-react-native';
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
import { CustomDateTimePicker } from '../../components/CustomDateTimePicker';

const birthSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter date as YYYY-MM-DD'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Enter time as HH:MM'),
  place: z.string().min(3, 'Search and select a birth place'),
});

type BirthFormValues = z.infer<typeof birthSchema>;

interface PlaceSuggestion {
  description: string;
  lat: number;
  lng: number;
}

export const BirthDataFormScreen: React.FC = () => {
  const { colors, spacing, typography } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  const user = useSessionStore((state) => state.user);
  const tokenStore = useTokenStore();
  const generateChart = useChartStore((state) => state.generateChart);

  const [loading, setLoading] = useState(false);
  const [placeQuery, setPlaceQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searchingPlace, setSearchingPlace] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceSuggestion | null>(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const getDisplayDate = (dateStr: string): string => {
    if (!dateStr) return 'Select Date';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    return dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getDisplayTime = (timeStr: string): string => {
    if (!timeStr) return 'Select Time';
    const parts = timeStr.split(':');
    if (parts.length !== 2) return timeStr;
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = String(minutes).padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  const searchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const { control, handleSubmit, setValue, formState: { errors } } = useForm<BirthFormValues>({
    resolver: zodResolver(birthSchema),
    defaultValues: { name: user?.displayName || '', date: '1995-08-20', time: '08:45', place: '' },
  });

  const handlePlaceSearch = (text: string) => {
    setPlaceQuery(text);
    setValue('place', text);
    setSelectedPlace(null);
    
    if (text.length < 3) {
      setSuggestions([]);
      return;
    }
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    setSearchingPlace(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await kundaliApi.resolvePlace(text);
        setSuggestions(results);
      } catch (e) {
        console.error(e);
      } finally {
        setSearchingPlace(false);
      }
    }, 350); // 350ms debounce
  };

  const handleSelectPlace = (place: PlaceSuggestion) => {
    setSelectedPlace(place);
    setPlaceQuery(place.description);
    setValue('place', place.description);
    setSuggestions([]);
  };

  const onSubmit = async (data: BirthFormValues) => {
    // 1. Check tokens (requires 5 tokens)
    if (tokenStore.tokens < 5) {
      tokenStore.setPaywallVisible(true);
      return;
    }

    if (!selectedPlace) {
      // Auto-fallback coordinate resolution if user typed but didn't tap Suggestion
      setSelectedPlace({ description: data.place, lat: 28.6139, lng: 77.2090 });
    }

    setLoading(true);
    try {
      const resolvedCoordinates = selectedPlace || { description: data.place, lat: 28.6139, lng: 77.2090 };
      await generateChart(user!.id, {
        name: data.name,
        dateOfBirth: data.date,
        timeOfBirth: data.time,
        placeOfBirth: data.place,
        latitude: resolvedCoordinates.lat,
        longitude: resolvedCoordinates.lng,
      });
      navigation.goBack();
    } catch (err) {
      console.error('Failed to generate chart', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={[styles.header, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.textPrimary, fontSize: typography.sizes.lg, fontFamily: typography.fonts.heading }]}>
            Enter Birth Details
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <Card variant="flat" style={styles.infoBox}>
            <Compass size={18} color={colors.accent} style={{ marginRight: 8 }} />
            <Text style={[styles.infoText, { color: colors.textSecondary, fontSize: typography.sizes.sm }]}>
              Precision casting costs <Text style={{ fontFamily: typography.fonts.bodyBold, color: colors.accent }}>5 tokens</Text>. Ensure details are as accurate as possible.
            </Text>
          </Card>

          <Card variant="elevated" style={styles.formCard}>
            <View style={styles.formFields}>
              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                  <TextInput
                    label="Full Name"
                    placeholder="Your Name"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    error={error?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="date"
                render={({ field: { onChange, value }, fieldState: { error } }) => (
                  <View style={styles.pickerFieldContainer}>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: typography.sizes.sm }]}>
                      Date of Birth
                    </Text>
                    <Pressable
                      onPress={() => setShowDatePicker(true)}
                      style={({ pressed }) => [
                        styles.pickerButton,
                        {
                          backgroundColor: colors.surface,
                          borderColor: error ? colors.error : colors.border,
                          borderRadius: spacing.borderRadius.sm,
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                    >
                      <Calendar size={18} color={colors.textSecondary} style={{ marginRight: 12 }} />
                      <Text style={[styles.pickerValueText, { color: colors.textPrimary, fontSize: typography.sizes.md }]}>
                        {getDisplayDate(value)}
                      </Text>
                    </Pressable>
                    {error && (
                      <Text style={[styles.errorText, { color: colors.error, fontSize: typography.sizes.xs }]}>
                        {error.message}
                      </Text>
                    )}
                    <CustomDateTimePicker
                      visible={showDatePicker}
                      mode="date"
                      value={value}
                      onClose={() => setShowDatePicker(false)}
                      onConfirm={onChange}
                    />
                  </View>
                )}
              />

              <Controller
                control={control}
                name="time"
                render={({ field: { onChange, value }, fieldState: { error } }) => (
                  <View style={styles.pickerFieldContainer}>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: typography.sizes.sm }]}>
                      Exact Time of Birth
                    </Text>
                    <Pressable
                      onPress={() => setShowTimePicker(true)}
                      style={({ pressed }) => [
                        styles.pickerButton,
                        {
                          backgroundColor: colors.surface,
                          borderColor: error ? colors.error : colors.border,
                          borderRadius: spacing.borderRadius.sm,
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                    >
                      <Clock size={18} color={colors.textSecondary} style={{ marginRight: 12 }} />
                      <Text style={[styles.pickerValueText, { color: colors.textPrimary, fontSize: typography.sizes.md }]}>
                        {getDisplayTime(value)}
                      </Text>
                    </Pressable>
                    {error && (
                      <Text style={[styles.errorText, { color: colors.error, fontSize: typography.sizes.xs }]}>
                        {error.message}
                      </Text>
                    )}
                    <CustomDateTimePicker
                      visible={showTimePicker}
                      mode="time"
                      value={value}
                      onClose={() => setShowTimePicker(false)}
                      onConfirm={onChange}
                    />
                  </View>
                )}
              />

              <View style={styles.autocompleteContainer}>
                <TextInput
                  label="Place of Birth"
                  placeholder="Search city/town"
                  value={placeQuery}
                  onChangeText={handlePlaceSearch}
                  error={errors.place?.message}
                  icon={<MapPin size={18} color={colors.textSecondary} />}
                />
                
                {searchingPlace && (
                  <View style={styles.searchingSpinner}>
                    <ActivityIndicator size="small" color={colors.accent} />
                  </View>
                )}

                {suggestions.length > 0 && (
                  <View style={[styles.suggestionsList, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                    {suggestions.map((suggestion, index) => (
                      <Pressable
                        key={index}
                        onPress={() => handleSelectPlace(suggestion)}
                        style={({ pressed }) => [
                          styles.suggestionItem,
                          {
                            borderBottomColor: colors.border,
                            backgroundColor: pressed ? colors.surface : 'transparent',
                          },
                        ]}
                      >
                        <MapPin size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                        <Text style={[styles.suggestionText, { color: colors.textPrimary, fontSize: typography.sizes.sm }]} numberOfLines={1}>
                          {suggestion.description}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              <Button
                title="Generate Kundali Chart (5 Tokens)"
                onPress={handleSubmit(onSubmit)}
                loading={loading}
                style={styles.submitButton}
              />
            </View>
          </Card>
        </ScrollView>
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
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    lineHeight: 18,
  },
  formCard: {
    padding: 20,
    overflow: 'visible', // Ensure suggestions fall out of the card boundaries
  },
  formFields: {
    gap: 16,
  },
  autocompleteContainer: {
    position: 'relative',
    zIndex: 99,
  },
  searchingSpinner: {
    position: 'absolute',
    right: 12,
    top: 36,
  },
  suggestionsList: {
    position: 'absolute',
    top: 72,
    left: 0,
    right: 0,
    borderWidth: 1.5,
    borderRadius: 8,
    maxHeight: 180,
    zIndex: 999,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  suggestionText: {
    flex: 1,
  },
  submitButton: {
    marginTop: 16,
  },
  pickerFieldContainer: {
    width: '100%',
    gap: 6,
  },
  fieldLabel: {
    fontWeight: '600',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1.5,
  },
  pickerValueText: {
    fontFamily: 'System',
  },
  errorText: {
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pickerModalContent: {
    width: '100%',
    padding: 24,
    alignItems: 'center',
  },
});
export default BirthDataFormScreen;
