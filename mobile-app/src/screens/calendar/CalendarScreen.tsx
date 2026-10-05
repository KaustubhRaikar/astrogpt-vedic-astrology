import React, { useEffect, useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Bell,
  BellOff,
  Sun,
  Moon,
  Sparkles,
  MapPin,
  X,
  Info,
  Clock,
  CheckCircle2,
} from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { panchangApi } from '../../api/endpoints/panchang';
import { PanchangData, MuhurtaData, MonthPanchangData } from '../../api/types';
import { notificationService } from '../../utils/notificationService';
import { useChartStore } from '../../store/useChartStore';
import Card from '../../components/Card';
import Button from '../../components/Button';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const CalendarScreen: React.FC = () => {
  const { colors, spacing, typography } = useTheme();
  const { activeChart } = useChartStore();

  const userLat = activeChart?.birthDetails?.latitude || 28.6139;
  const userLon = activeChart?.birthDetails?.longitude || 77.2090;
  const userPlace = activeChart?.birthDetails?.placeOfBirth || 'New Delhi, India';

  // Current view year & month (0-indexed month)
  const today = new Date();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0..11

  const [monthData, setMonthData] = useState<MonthPanchangData | null>(null);
  const [loadingMonth, setLoadingMonth] = useState<boolean>(true);
  const [scheduledMap, setScheduledMap] = useState<Record<string, any>>({});

  // Selected Day Modal
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [selectedPanchang, setSelectedPanchang] = useState<PanchangData | null>(null);
  const [selectedMuhurta, setSelectedMuhurta] = useState<MuhurtaData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [detailModalVisible, setDetailModalVisible] = useState<boolean>(false);
  const [notifToggling, setNotifToggling] = useState<boolean>(false);

  // Load scheduled notifications map
  useEffect(() => {
    notificationService.getScheduledMap().then(setScheduledMap);
  }, []);

  // Fetch month data on year/month change
  useEffect(() => {
    let isMounted = true;
    setLoadingMonth(true);
    panchangApi
      .getMonthPanchang(currentYear, currentMonth + 1, userLat, userLon)
      .then((res) => {
        if (isMounted) {
          setMonthData(res);
          setLoadingMonth(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load month panchang', err);
        if (isMounted) setLoadingMonth(false);
      });
    return () => {
      isMounted = false;
    };
  }, [currentYear, currentMonth, userLat, userLon]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleTodayPress = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  // Open Day Detail Modal
  const handleSelectDay = async (dateStr: string, pData?: PanchangData) => {
    setSelectedDateStr(dateStr);
    setSelectedPanchang(pData || null);
    setDetailModalVisible(true);
    setLoadingDetail(true);

    try {
      const [pRes, mRes] = await Promise.all([
        pData ? Promise.resolve(pData) : panchangApi.getPanchang(dateStr, userLat, userLon),
        panchangApi.getMuhurta(dateStr, userLat, userLon),
      ]);
      setSelectedPanchang(pRes);
      setSelectedMuhurta(mRes);
    } catch (e) {
      console.error('Error loading day details', e);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Toggle Notification for selected day
  const handleToggleNotify = async () => {
    if (!selectedDateStr) return;
    setNotifToggling(true);
    const festName = selectedPanchang?.festival?.name || `Panchang Notification (${selectedDateStr})`;
    const muhurtaHint = selectedPanchang?.festival?.muhurta_hint || selectedMuhurta ? `Abhijit Muhurta: ${formatTime(selectedMuhurta?.abhijit_muhurta.start)}` : undefined;

    const isNowScheduled = await notificationService.toggleNotification(selectedDateStr, festName, muhurtaHint);
    const updatedMap = await notificationService.getScheduledMap();
    setScheduledMap(updatedMap);
    setNotifToggling(false);
  };

  // Calculate grid matrix for month
  const gridCells = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    // Sunday is 0 in JS Date, convert so Mon=0, Sun=6
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek < 0) startDayOfWeek = 6;

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const cells = [];

    // Empty cells before month start
    for (let i = 0; i < startDayOfWeek; i++) {
      cells.push({ type: 'empty', id: `empty-${i}` });
    }

    // Days in month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear.toString().padStart(4, '0')}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const dayPanchang = monthData?.days?.find((d) => d.date === dateStr);
      cells.push({
        type: 'day',
        dayNumber: day,
        dateStr,
        panchang: dayPanchang,
        id: dateStr,
      });
    }
    return cells;
  }, [currentYear, currentMonth, monthData]);

  const todayStr = `${today.getFullYear().toString().padStart(4, '0')}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

  const formatTime = (isoString?: string) => {
    if (!isoString) return '--:--';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Header Bar */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <View style={styles.titleRow}>
            <CalendarIcon size={20} color={colors.accent} style={{ marginRight: 8 }} />
            <Text style={[styles.title, { color: colors.textPrimary, fontSize: typography.sizes.lg, fontFamily: typography.fonts.heading }]}>
              Vedic Panchang & Calendar
            </Text>
          </View>
          <View style={styles.locationRow}>
            <MapPin size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
            <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.xs }} numberOfLines={1}>
              {userPlace}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={handleTodayPress}
          style={({ pressed }) => [
            styles.todayBtn,
            { backgroundColor: 'rgba(212, 175, 55, 0.15)', borderColor: colors.accent, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={{ color: colors.accent, fontSize: typography.sizes.xs, fontFamily: typography.fonts.bodyBold }}>
            TODAY
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Month Navigator Header */}
        <Card variant="glow" style={styles.navCard}>
          <View style={styles.navRow}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.arrowBtn}>
              <ChevronLeft size={22} color={colors.textPrimary} />
            </TouchableOpacity>

            <View style={{ alignItems: 'center' }}>
              <Text style={[styles.monthTitle, { color: colors.textPrimary, fontSize: typography.sizes.md, fontFamily: typography.fonts.heading }]}>
                {MONTH_NAMES[currentMonth]} {currentYear}
              </Text>
              <Text style={{ color: colors.accent, fontSize: 11, fontFamily: typography.fonts.bodyMedium }}>
                Vikram Samvat 2083
              </Text>
            </View>

            <TouchableOpacity onPress={handleNextMonth} style={styles.arrowBtn}>
              <ChevronRight size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </Card>

        {/* Disclaimer / Sourcing Note */}
        <View style={styles.sourceNoticeBanner}>
          <Info size={13} color={colors.textMuted} style={{ marginRight: 6 }} />
          <Text style={[styles.sourceNoticeText, { color: colors.textMuted, fontSize: 11 }]}>
            Festival dates sourced from curated Panchang datasets. Tithi & Muhurta calculated astronomically.
          </Text>
        </View>

        {/* Weekday Header */}
        <View style={styles.weekdayRow}>
          {WEEKDAYS.map((wd) => (
            <View key={wd} style={styles.weekdayCol}>
              <Text style={[styles.weekdayText, { color: colors.textSecondary, fontSize: typography.sizes.xs }]}>
                {wd}
              </Text>
            </View>
          ))}
        </View>

        {/* Calendar Days Grid */}
        {loadingMonth ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.xs, marginTop: 12 }}>
              Computing Sidereal Panchang...
            </Text>
          </View>
        ) : (
          <View style={styles.gridContainer}>
            {gridCells.map((cell) => {
              if (cell.type === 'empty') {
                return <View key={cell.id} style={styles.dayCellEmpty} />;
              }

              const isToday = cell.dateStr === todayStr;
              const hasFestival = !!cell.panchang?.festival;
              const isScheduled = !!scheduledMap[cell.dateStr!];

              return (
                <TouchableOpacity
                  key={cell.id}
                  activeOpacity={0.7}
                  onPress={() => handleSelectDay(cell.dateStr!, cell.panchang)}
                  style={[
                    styles.dayCell,
                    {
                      backgroundColor: isToday ? 'rgba(212, 175, 55, 0.12)' : colors.surface,
                      borderColor: isToday ? colors.accent : hasFestival ? colors.accent : colors.border,
                      borderWidth: isToday ? 1.5 : hasFestival ? 1 : 0.5,
                    },
                  ]}
                >
                  {/* Top Bar inside cell */}
                  <View style={styles.cellTopRow}>
                    <Text
                      style={[
                        styles.dayNum,
                        {
                          color: isToday ? colors.accent : colors.textPrimary,
                          fontFamily: isToday ? typography.fonts.heading : typography.fonts.bodyBold,
                        },
                      ]}
                    >
                      {cell.dayNumber}
                    </Text>
                    {isScheduled && <Bell size={10} color={colors.accent} fill={colors.accent} />}
                  </View>

                  {/* Tithi short label */}
                  {cell.panchang?.tithi && (
                    <Text style={[styles.tithiText, { color: colors.textSecondary }]} numberOfLines={1}>
                      {cell.panchang.tithi.name}
                    </Text>
                  )}

                  {/* Festival Badge */}
                  {hasFestival && (
                    <View style={[styles.festBadge, { backgroundColor: colors.accent }]}>
                      <Text style={styles.festBadgeText} numberOfLines={1}>
                        {cell.panchang?.festival?.name}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Selected Day Detail Modal */}
      <Modal visible={detailModalVisible} transparent animationType="slide" onRequestClose={() => setDetailModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary, fontSize: typography.sizes.md, fontFamily: typography.fonts.heading }]}>
                  {selectedDateStr}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.xs }}>
                  {selectedPanchang?.vara ? `${selectedPanchang.vara} Day` : 'Panchang Details'}
                </Text>
              </View>

              <TouchableOpacity onPress={() => setDetailModalVisible(false)} style={styles.closeBtn}>
                <X size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
              {/* Festival Banner if available */}
              {selectedPanchang?.festival && (
                <Card variant="glow" style={styles.festCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <Sparkles size={18} color={colors.accent} style={{ marginRight: 8 }} />
                    <Text style={[styles.festTitle, { color: colors.accent, fontSize: typography.sizes.md, fontFamily: typography.fonts.heading }]}>
                      {selectedPanchang.festival.name}
                    </Text>
                  </View>

                  <View style={[styles.catBadge, { backgroundColor: 'rgba(212, 175, 55, 0.15)', borderColor: colors.accent }]}>
                    <Text style={{ color: colors.accent, fontSize: 10, fontFamily: typography.fonts.bodyBold }}>
                      {selectedPanchang.festival.category.toUpperCase()}
                    </Text>
                  </View>

                  <Text style={[styles.festDesc, { color: colors.textPrimary, fontSize: typography.sizes.xs, marginTop: 8 }]}>
                    {selectedPanchang.festival.description}
                  </Text>

                  <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 6, fontStyle: 'italic' }}>
                    {selectedPanchang.festival.significance}
                  </Text>

                  {selectedPanchang.festival.muhurta_hint && (
                    <View style={styles.hintBox}>
                      <Clock size={12} color={colors.accent} style={{ marginRight: 6 }} />
                      <Text style={{ color: colors.accent, fontSize: 11, fontFamily: typography.fonts.bodyMedium }}>
                        {selectedPanchang.festival.muhurta_hint}
                      </Text>
                    </View>
                  )}
                </Card>
              )}

              {/* One-Click Notification Toggle Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleToggleNotify}
                disabled={notifToggling}
                style={[
                  styles.notifyBtn,
                  {
                    backgroundColor: scheduledMap[selectedDateStr!] ? 'rgba(239, 68, 68, 0.12)' : 'rgba(212, 175, 55, 0.15)',
                    borderColor: scheduledMap[selectedDateStr!] ? colors.error : colors.accent,
                  },
                ]}
              >
                {notifToggling ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <>
                    {scheduledMap[selectedDateStr!] ? (
                      <>
                        <BellOff size={18} color={colors.error} style={{ marginRight: 8 }} />
                        <Text style={{ color: colors.error, fontSize: typography.sizes.sm, fontFamily: typography.fonts.bodyBold }}>
                          Cancel Festival Notification (Set for 7 AM)
                        </Text>
                      </>
                    ) : (
                      <>
                        <Bell size={18} color={colors.accent} fill={colors.accent} style={{ marginRight: 8 }} />
                        <Text style={{ color: colors.accent, fontSize: typography.sizes.sm, fontFamily: typography.fonts.bodyBold }}>
                          Set 1-Click Notification (7:00 AM)
                        </Text>
                      </>
                    )}
                  </>
                )}
              </TouchableOpacity>

              {loadingDetail ? (
                <ActivityIndicator size="small" color={colors.accent} style={{ marginVertical: 20 }} />
              ) : (
                <>
                  {/* Panchang Limb Cards */}
                  <Card variant="flat" style={{ padding: 14 }}>
                    <Text style={[styles.sectionHeading, { color: colors.textPrimary, fontSize: typography.sizes.sm, fontFamily: typography.fonts.heading, marginBottom: 12 }]}>
                      Panchang (5 Limbs)
                    </Text>

                    <View style={styles.panchangGrid}>
                      <View style={styles.panchangItem}>
                        <Text style={styles.pLabel}>TITHI</Text>
                        <Text style={[styles.pValue, { color: colors.accent }]}>
                          {selectedPanchang?.tithi.name} ({selectedPanchang?.tithi.paksha})
                        </Text>
                      </View>

                      <View style={styles.panchangItem}>
                        <Text style={styles.pLabel}>VARA (WEEKDAY)</Text>
                        <Text style={[styles.pValue, { color: colors.textPrimary }]}>
                          {selectedPanchang?.vara}
                        </Text>
                      </View>

                      <View style={styles.panchangItem}>
                        <Text style={styles.pLabel}>NAKSHATRA</Text>
                        <Text style={[styles.pValue, { color: colors.textPrimary }]}>
                          {selectedPanchang?.nakshatra} (Pada {selectedPanchang?.nakshatra_pada})
                        </Text>
                      </View>

                      <View style={styles.panchangItem}>
                        <Text style={styles.pLabel}>YOGA</Text>
                        <Text style={[styles.pValue, { color: colors.textPrimary }]}>
                          {selectedPanchang?.yoga}
                        </Text>
                      </View>

                      <View style={styles.panchangItem}>
                        <Text style={styles.pLabel}>KARANA</Text>
                        <Text style={[styles.pValue, { color: colors.textPrimary }]}>
                          {selectedPanchang?.karana}
                        </Text>
                      </View>
                    </View>
                  </Card>

                  {/* Muhurta Windows Card */}
                  {selectedMuhurta && (
                    <Card variant="flat" style={{ padding: 14 }}>
                      <Text style={[styles.sectionHeading, { color: colors.textPrimary, fontSize: typography.sizes.sm, fontFamily: typography.fonts.heading, marginBottom: 12 }]}>
                        Muhurta Timing Windows
                      </Text>

                      {/* Sunrise / Sunset */}
                      <View style={styles.sunRow}>
                        <View style={styles.sunItem}>
                          <Sun size={16} color="#F59E0B" style={{ marginRight: 6 }} />
                          <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Sunrise: </Text>
                          <Text style={{ color: colors.textPrimary, fontSize: 12, fontFamily: typography.fonts.bodyBold }}>
                            {formatTime(selectedMuhurta.sunrise)}
                          </Text>
                        </View>

                        <View style={styles.sunItem}>
                          <Moon size={16} color="#6366F1" style={{ marginRight: 6 }} />
                          <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Sunset: </Text>
                          <Text style={{ color: colors.textPrimary, fontSize: 12, fontFamily: typography.fonts.bodyBold }}>
                            {formatTime(selectedMuhurta.sunset)}
                          </Text>
                        </View>
                      </View>

                      {/* Abhijit Muhurta (Auspicious) */}
                      <View style={[styles.muhurtaBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: colors.success }]}>
                        <View style={styles.mHead}>
                          <Text style={{ color: colors.success, fontSize: 11, fontFamily: typography.fonts.bodyBold }}>
                            ABHIJIT MUHURTA (AUSPICIOUS)
                          </Text>
                        </View>
                        <Text style={{ color: colors.textPrimary, fontSize: 13, fontFamily: typography.fonts.bodyBold, marginTop: 4 }}>
                          {formatTime(selectedMuhurta.abhijit_muhurta.start)} – {formatTime(selectedMuhurta.abhijit_muhurta.end)}
                        </Text>
                      </View>

                      {/* Rahu Kalam (Inauspicious) */}
                      <View style={[styles.muhurtaBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: colors.error }]}>
                        <View style={styles.mHead}>
                          <Text style={{ color: colors.error, fontSize: 11, fontFamily: typography.fonts.bodyBold }}>
                            RAHU KALAM (INAUSPICIOUS)
                          </Text>
                        </View>
                        <Text style={{ color: colors.textPrimary, fontSize: 13, fontFamily: typography.fonts.bodyBold, marginTop: 4 }}>
                          {formatTime(selectedMuhurta.rahu_kalam.start)} – {formatTime(selectedMuhurta.rahu_kalam.end)}
                        </Text>
                      </View>

                      {/* Yamaganda (Inauspicious) */}
                      <View style={[styles.muhurtaBox, { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: '#F59E0B' }]}>
                        <View style={styles.mHead}>
                          <Text style={{ color: '#F59E0B', fontSize: 11, fontFamily: typography.fonts.bodyBold }}>
                            YAMAGANDA (INAUSPICIOUS)
                          </Text>
                        </View>
                        <Text style={{ color: colors.textPrimary, fontSize: 13, fontFamily: typography.fonts.bodyBold, marginTop: 4 }}>
                          {formatTime(selectedMuhurta.yamaganda.start)} – {formatTime(selectedMuhurta.yamaganda.end)}
                        </Text>
                      </View>
                    </Card>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  todayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 96,
  },
  navCard: {
    padding: 12,
    marginBottom: 10,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  arrowBtn: {
    padding: 8,
  },
  monthTitle: {
    fontWeight: 'bold',
  },
  sourceNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 14,
  },
  sourceNoticeText: {
    flex: 1,
    lineHeight: 14,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayCol: {
    flex: 1,
    alignItems: 'center',
  },
  weekdayText: {
    fontWeight: 'bold',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  dayCellEmpty: {
    width: `${(100 - 6 * 1.2) / 7}%`,
    height: 72,
  },
  dayCell: {
    width: `${(100 - 6 * 1.2) / 7}%`,
    height: 76,
    borderRadius: 8,
    padding: 4,
    justifyContent: 'space-between',
  },
  cellTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayNum: {
    fontSize: 12,
  },
  tithiText: {
    fontSize: 9,
    textAlign: 'left',
  },
  festBadge: {
    paddingHorizontal: 3,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  festBadgeText: {
    color: '#000',
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 6,
  },
  festCard: {
    padding: 16,
  },
  festTitle: {
    fontWeight: 'bold',
  },
  catBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    marginTop: 4,
  },
  festDesc: {
    lineHeight: 18,
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    padding: 8,
    borderRadius: 6,
    marginTop: 10,
  },
  notifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  sectionHeading: {
    fontWeight: 'bold',
  },
  panchangGrid: {
    gap: 10,
  },
  panchangItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  pLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#8E8E93',
  },
  pValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  sunRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sunItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  muhurtaBox: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  mHead: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default CalendarScreen;
