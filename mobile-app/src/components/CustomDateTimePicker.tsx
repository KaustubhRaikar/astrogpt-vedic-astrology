import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';
import RNDateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../theme/ThemeProvider';
import Button from './Button';
import Card from './Card';

interface CustomDateTimePickerProps {
  visible: boolean;
  mode: 'date' | 'time';
  value: string; // YYYY-MM-DD or HH:MM
  onClose: () => void;
  onConfirm: (val: string) => void;
  useNativePickerOnMobile?: boolean;
}

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const PADDING_ITEMS = 2; // 2 empty items top & bottom for center alignment

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Memoized Independent Scroll Column Component
const ScrollColumn = React.memo(({
  data,
  initialValue,
  onValueChange,
  formatter,
  mode,
}: {
  data: any[];
  initialValue: any;
  onValueChange: (val: any) => void;
  formatter?: (val: any) => string;
  mode: 'date' | 'time';
}) => {
  const { colors, typography } = useTheme();
  const listRef = useRef<FlatList>(null);
  
  const initialIndex = useMemo(() => {
    const idx = data.indexOf(initialValue);
    return idx !== -1 ? idx : 0;
  }, [data, initialValue]);

  const [activeIndex, setActiveIndex] = useState<number>(initialIndex);
  const isMountedRef = useRef<boolean>(false);

  const paddedData = useMemo(() => [null, null, ...data, null, null], [data]);

  // Scroll to initial index on mount/visibility reset
  useEffect(() => {
    const idx = data.indexOf(initialValue);
    const targetIdx = idx !== -1 ? idx : 0;
    setActiveIndex(targetIdx);
    
    // Smooth scroll to initial position
    const timer = setTimeout(() => {
      listRef.current?.scrollToOffset({
        offset: targetIdx * ITEM_HEIGHT,
        animated: false,
      });
    }, 50);

    return () => clearTimeout(timer);
  }, [data, initialValue]);

  const updateSelectionFromOffset = useCallback(
    (offsetY: number) => {
      const index = Math.round(offsetY / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, data.length - 1));
      setActiveIndex(clampedIndex);
      const val = data[clampedIndex];
      if (val !== undefined && val !== null) {
        onValueChange(val);
      }
    },
    [data, onValueChange]
  );

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, data.length - 1));
    if (clampedIndex !== activeIndex) {
      setActiveIndex(clampedIndex);
    }
  };

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    updateSelectionFromOffset(e.nativeEvent.contentOffset.y);
  };

  const handleItemPress = (index: number) => {
    const val = data[index];
    if (val !== undefined && val !== null) {
      setActiveIndex(index);
      onValueChange(val);
      listRef.current?.scrollToOffset({
        offset: index * ITEM_HEIGHT,
        animated: true,
      });
    }
  };

  return (
    <View style={styles.columnContainer}>
      <FlatList
        ref={listRef}
        data={paddedData}
        keyExtractor={(_, idx) => idx.toString()}
        snapToInterval={ITEM_HEIGHT}
        snapToAlignment="center"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onScrollEndDrag={handleScrollEnd}
        onMomentumScrollEnd={handleScrollEnd}
        getItemLayout={(_, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
        renderItem={({ item, index }) => {
          if (item === null) {
            return <View style={{ height: ITEM_HEIGHT }} />;
          }
          const dataIndex = index - PADDING_ITEMS;
          const isSelected = dataIndex === activeIndex;
          const distance = Math.abs(dataIndex - activeIndex);

          let label = formatter ? formatter(item) : String(item);
          if (typeof item === 'number' && mode === 'time' && data.length === 60) {
            label = String(item).padStart(2, '0');
          }

          return (
            <Pressable
              onPress={() => handleItemPress(dataIndex)}
              style={[styles.itemContainer, { height: ITEM_HEIGHT }]}
            >
              <Text
                style={[
                  styles.itemText,
                  {
                    color: isSelected
                      ? colors.accent
                      : distance === 1
                      ? colors.textPrimary
                      : colors.textMuted || colors.textSecondary,
                    fontSize: isSelected ? typography.sizes.md : typography.sizes.sm,
                    fontFamily: isSelected
                      ? typography.fonts.bodyBold
                      : typography.fonts.body,
                    opacity: isSelected ? 1 : distance === 1 ? 0.7 : 0.35,
                  },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
});

export const CustomDateTimePicker: React.FC<CustomDateTimePickerProps> = ({
  visible,
  mode,
  value,
  onClose,
  onConfirm,
  useNativePickerOnMobile = false,
}) => {
  const { colors, typography } = useTheme();

  // State initialization
  const [day, setDay] = useState<number>(20);
  const [month, setMonth] = useState<number>(8); // 1-indexed
  const [year, setYear] = useState<number>(1995);

  const [hour, setHour] = useState<number>(8);
  const [minute, setMinute] = useState<number>(45);
  const [ampm, setAmpm] = useState<'AM' | 'PM'>('AM');

  // Native Date Picker Date State
  const [nativeDate, setNativeDate] = useState<Date>(new Date());

  const getDaysInMonth = useCallback((m: number, y: number) => {
    return new Date(y, m, 0).getDate();
  }, []);

  const daysData = useMemo(
    () => Array.from({ length: getDaysInMonth(month, year) }, (_, i) => i + 1),
    [month, year, getDaysInMonth]
  );
  const yearsData = useMemo(() => Array.from({ length: 111 }, (_, i) => 2035 - i), []);

  const hoursData = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
  const minutesData = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);
  const ampmData = useMemo(() => ['AM', 'PM'], []);

  // Initialize values when modal opens
  useEffect(() => {
    if (visible) {
      if (mode === 'date') {
        const parts = value.split('-');
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10) || 1995;
          const m = parseInt(parts[1], 10) || 8;
          const d = parseInt(parts[2], 10) || 20;
          setYear(y);
          setMonth(m);
          setDay(d);
          setNativeDate(new Date(y, m - 1, d));
        }
      } else {
        const parts = value.split(':');
        if (parts.length === 2) {
          const h24 = parseInt(parts[0], 10) || 8;
          const m = parseInt(parts[1], 10) || 45;
          setMinute(m);
          setAmpm(h24 >= 12 ? 'PM' : 'AM');
          setHour(h24 % 12 || 12);
          const d = new Date();
          d.setHours(h24, m, 0, 0);
          setNativeDate(d);
        }
      }
    }
  }, [visible, value, mode]);

  // Handle Confirms
  const handleConfirmPress = () => {
    if (mode === 'date') {
      const maxDays = getDaysInMonth(month, year);
      const activeDay = Math.min(day, maxDays);
      const yStr = String(year);
      const mStr = String(month).padStart(2, '0');
      const dStr = String(activeDay).padStart(2, '0');
      onConfirm(`${yStr}-${mStr}-${dStr}`);
    } else {
      let h24 = hour % 12;
      if (ampm === 'PM') h24 += 12;
      const hStr = String(h24).padStart(2, '0');
      const mStr = String(minute).padStart(2, '0');
      onConfirm(`${hStr}:${mStr}`);
    }
    onClose();
  };

  const handleNativeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      onClose();
    }
    if (selectedDate) {
      setNativeDate(selectedDate);
      if (mode === 'date') {
        const yStr = String(selectedDate.getFullYear());
        const mStr = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const dStr = String(selectedDate.getDate()).padStart(2, '0');
        onConfirm(`${yStr}-${mStr}-${dStr}`);
      } else {
        const hStr = String(selectedDate.getHours()).padStart(2, '0');
        const mStr = String(selectedDate.getMinutes()).padStart(2, '0');
        onConfirm(`${hStr}:${mStr}`);
      }
    }
  };

  if (useNativePickerOnMobile && (Platform.OS === 'ios' || Platform.OS === 'android')) {
    if (!visible) return null;
    return (
      <RNDateTimePicker
        value={nativeDate}
        mode={mode}
        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
        onChange={handleNativeChange}
      />
    );
  }

  if (!visible) return null;

  // Formatted Live Preview
  const displayPreview =
    mode === 'date'
      ? `${String(day).padStart(2, '0')} ${MONTHS[month - 1] || 'Jan'} ${year}`
      : `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${ampm}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <Card
          variant="glow"
          style={[
            styles.modalCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Header */}
          <Text
            style={[
              styles.headerTitle,
              {
                color: colors.textPrimary,
                fontSize: typography.sizes.sm,
                fontFamily: typography.fonts.heading,
              },
            ]}
          >
            {mode === 'date' ? 'Select Birth Date' : 'Select Birth Time'}
          </Text>

          {/* Live Preview Pill */}
          <View
            style={[
              styles.previewBadge,
              { backgroundColor: colors.background, borderColor: colors.accent },
            ]}
          >
            <Text
              style={[
                styles.previewText,
                { color: colors.accent, fontSize: typography.sizes.md },
              ]}
            >
              {displayPreview}
            </Text>
          </View>

          {/* Wheels Picker Container */}
          <View style={styles.wheelsContainer}>
            {/* Center Selection Band */}
            <View
              style={[
                styles.selectionHighlight,
                {
                  borderColor: colors.accent,
                  backgroundColor: colors.accent + '15',
                },
              ]}
              pointerEvents="none"
            />

            {mode === 'date' ? (
              <>
                <ScrollColumn
                  key="col-day"
                  data={daysData}
                  initialValue={day}
                  onValueChange={setDay}
                  formatter={(d) => String(d).padStart(2, '0')}
                  mode={mode}
                />
                <ScrollColumn
                  key="col-month"
                  data={MONTHS}
                  initialValue={MONTHS[month - 1] || 'Aug'}
                  onValueChange={(mName) => setMonth(MONTHS.indexOf(mName) + 1)}
                  mode={mode}
                />
                <ScrollColumn
                  key="col-year"
                  data={yearsData}
                  initialValue={year}
                  onValueChange={setYear}
                  mode={mode}
                />
              </>
            ) : (
              <>
                <ScrollColumn
                  key="col-hour"
                  data={hoursData}
                  initialValue={hour}
                  onValueChange={setHour}
                  formatter={(h) => String(h).padStart(2, '0')}
                  mode={mode}
                />
                <ScrollColumn
                  key="col-min"
                  data={minutesData}
                  initialValue={minute}
                  onValueChange={setMinute}
                  formatter={(m) => String(m).padStart(2, '0')}
                  mode={mode}
                />
                <ScrollColumn
                  key="col-ampm"
                  data={ampmData}
                  initialValue={ampm}
                  onValueChange={setAmpm}
                  mode={mode}
                />
              </>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <Button
              title="Cancel"
              variant="secondary"
              onPress={onClose}
              style={styles.actionButton}
            />
            <Button
              title="Confirm"
              onPress={handleConfirmPress}
              style={styles.actionButton}
            />
          </View>
        </Card>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    padding: 20,
    alignItems: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  previewBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  previewText: {
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  wheelsContainer: {
    flexDirection: 'row',
    height: WHEEL_HEIGHT,
    width: '100%',
    position: 'relative',
    marginBottom: 20,
    justifyContent: 'space-between',
  },
  selectionHighlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ITEM_HEIGHT * PADDING_ITEMS,
    height: ITEM_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderRadius: 10,
    zIndex: 0,
  },
  columnContainer: {
    flex: 1,
    height: '100%',
    zIndex: 1,
  },
  itemContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  actionButton: {
    flex: 1,
  },
});

export default CustomDateTimePicker;
