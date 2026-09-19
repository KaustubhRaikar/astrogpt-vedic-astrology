import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Switch, Pressable, Alert, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User as UserIcon, Globe, Bell, LogOut, Trash2, Calendar, MapPin, Sparkles, ShieldAlert } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useSessionStore } from '../../store/useSessionStore';
import { useChartStore } from '../../store/useChartStore';
import { authApi } from '../../api/endpoints/auth';
import Card from '../../components/Card';
import Button from '../../components/Button';
import TextInput from '../../components/TextInput';

export const SettingsScreen: React.FC = () => {
  const { colors, spacing, typography, theme, toggleTheme } = useTheme();
  
  const user = useSessionStore((state) => state.user);
  const logout = useSessionStore((state) => state.logout);
  const activeChart = useChartStore((state) => state.activeChart);
  const clearChartStore = useChartStore((state) => state.clearStore);

  const [language, setLanguage] = useState<string>('en');

  const languagesList = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'Hindi (हिन्दी)' },
    { code: 'bn', name: 'Bengali (বাংলা)' },
    { code: 'ta', name: 'Tamil (தமிழ்)' },
    { code: 'te', name: 'Telugu (తెలుగు)' },
    { code: 'mr', name: 'Marathi (मરાठी)' },
    { code: 'gu', name: 'Gujarati (ગુજરાતી)' },
    { code: 'kn', name: 'Kannada (ಕನ್ನಡ)' },
    { code: 'ml', name: 'Malayalam (മലയാളം)' },
    { code: 'pa', name: 'Punjabi (ਪੰਜਾਬੀ)' },
  ];
  const [notifications, setNotifications] = useState(true);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to end your session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          clearChartStore();
          logout();
        },
      },
    ]);
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      await authApi.deleteAccount(user.id);
      setDeleteModalVisible(false);
      clearChartStore();
      logout();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to delete account. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const changeLanguage = (lang: string) => {
    setLanguage(lang);
    const langObj = languagesList.find(l => l.code === lang);
    Alert.alert('Language Updated', `AI interpretations will now be generated in ${langObj?.name || lang}.`);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary, fontSize: typography.sizes.lg, fontFamily: typography.fonts.heading }]}>
          Profile Settings
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* User Card */}
        <Card variant="glow" style={styles.userCard}>
          <View style={[styles.avatar, { backgroundColor: colors.surfaceElevated, borderColor: colors.accent }]}>
            <UserIcon size={32} color={colors.accent} />
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.name, { color: colors.textPrimary, fontSize: typography.sizes.lg, fontFamily: typography.fonts.heading }]}>
              {user?.displayName || 'Seeker'}
            </Text>
            <Text style={[styles.email, { color: colors.textSecondary, fontSize: typography.sizes.sm }]}>
              {user?.email || user?.phone || 'Vedic Traveler'}
            </Text>
          </View>
        </Card>

        {/* Saved Birth Details */}
        <Text style={[styles.sectionHeading, { color: colors.textPrimary, fontSize: typography.sizes.md, fontFamily: typography.fonts.heading }]}>
          Saved Birth Coordinates
        </Text>
        <Card variant="elevated" style={styles.settingsCard}>
          {activeChart ? (
            <View style={styles.savedDetails}>
              <View style={styles.detailsRow}>
                <Calendar size={16} color={colors.accent} style={{ marginRight: 10 }} />
                <Text style={[styles.detailsText, { color: colors.textSecondary, fontSize: typography.sizes.sm }]}>
                  {activeChart.birthDetails.dateOfBirth} at {activeChart.birthDetails.timeOfBirth}
                </Text>
              </View>
              <View style={[styles.detailsRow, { marginTop: spacing.sm }]}>
                <MapPin size={16} color={colors.accent} style={{ marginRight: 10 }} />
                <Text style={[styles.detailsText, { color: colors.textSecondary, fontSize: typography.sizes.sm }]} numberOfLines={1}>
                  {activeChart.birthDetails.placeOfBirth}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={{ color: colors.textMuted, fontSize: typography.sizes.sm, fontStyle: 'italic' }}>
              No birth details registered yet.
            </Text>
          )}
        </Card>

        {/* Preferences */}
        <Text style={[styles.sectionHeading, { color: colors.textPrimary, fontSize: typography.sizes.md, fontFamily: typography.fonts.heading }]}>
          Preferences
        </Text>
        <Card variant="elevated" style={styles.settingsCard}>
          {/* Theme Toggle */}
          <View style={styles.settingRow}>
            <View style={styles.settingLabelCol}>
              <Sparkles size={18} color={colors.accent} style={{ marginRight: 10 }} />
              <Text style={[styles.settingLabel, { color: colors.textPrimary, fontSize: typography.sizes.md, fontFamily: typography.fonts.bodySemibold }]}>
                Dark Mode
              </Text>
            </View>
            <Switch
              value={theme === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={Platform.OS === 'android' ? (theme === 'dark' ? colors.surface : colors.surfaceElevated) : ''}
            />
          </View>

          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

          {/* Language selection */}
          <View style={styles.settingRowComplex}>
            <View style={[styles.settingLabelCol, { marginBottom: 12 }]}>
              <Globe size={18} color={colors.accent} style={{ marginRight: 10 }} />
              <Text style={[styles.settingLabel, { color: colors.textPrimary, fontSize: typography.sizes.md, fontFamily: typography.fonts.bodySemibold }]}>
                AI Translation Language
              </Text>
            </View>
            <ScrollView
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.languageScrollContainer}
            >
              {languagesList.map((lang) => {
                const isSelected = language === lang.code;
                return (
                  <Pressable
                    key={lang.code}
                    onPress={() => changeLanguage(lang.code)}
                    style={[
                      styles.langBadgeScroll,
                      {
                        backgroundColor: isSelected ? colors.accent : colors.surfaceElevated,
                        borderColor: isSelected ? colors.accent : colors.border,
                        borderRadius: spacing.borderRadius.sm,
                      },
                    ]}
                  >
                    <Text style={[styles.langText, { color: isSelected ? (colors.background === '#FAF9F6' ? '#FFF' : '#000') : colors.textSecondary, fontSize: typography.sizes.sm }]}>
                      {lang.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

          {/* Notifications Toggle */}
          <View style={styles.settingRow}>
            <View style={styles.settingLabelCol}>
              <Bell size={18} color={colors.accent} style={{ marginRight: 10 }} />
              <Text style={[styles.settingLabel, { color: colors.textPrimary, fontSize: typography.sizes.md, fontFamily: typography.fonts.bodySemibold }]}>
                Daily Transit Alerts
              </Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={Platform.OS === 'android' ? (notifications ? colors.surface : colors.surfaceElevated) : ''}
            />
          </View>
        </Card>

        {/* Security & Actions */}
        <View style={styles.actionsContainer}>
          <Button
            title="Sign Out"
            variant="secondary"
            onPress={handleLogout}
            icon={<LogOut size={18} color={colors.textPrimary} />}
            style={styles.actionBtn}
          />
          
          <Button
            title="Delete Account"
            variant="ghost"
            onPress={() => setDeleteModalVisible(true)}
            icon={<Trash2 size={18} color={colors.error} />}
            textStyle={{ color: colors.error }}
            style={styles.actionBtn}
          />
        </View>
      </ScrollView>

      {/* Account Deletion Confirm-Twice Dialog Modal */}
      <Modal
        visible={deleteModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Card variant="glow" style={styles.deleteCard}>
            <ShieldAlert size={36} color={colors.error} style={{ marginBottom: 12 }} />
            <Text style={[styles.modalTitle, { color: colors.textPrimary, fontSize: typography.sizes.lg, fontFamily: typography.fonts.heading }]}>
              Critical: Delete Account
            </Text>
            <Text style={[styles.modalDesc, { color: colors.textSecondary, fontSize: typography.sizes.sm }]}>
              This action is permanent. All your custom charts, report files, chat histories, and remaining token balance will be wiped from our database.
            </Text>
            
            <TextInput
              label="Type DELETE to confirm"
              placeholder="DELETE"
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              autoCapitalize="characters"
              style={{ textAlign: 'center' }}
            />

            <View style={styles.deleteModalButtons}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => {
                  setDeleteModalVisible(false);
                  setDeleteConfirmText('');
                }}
                style={styles.modalBtn}
              />
              <Button
                title="Delete Permanent"
                variant="danger"
                disabled={deleteConfirmText !== 'DELETE'}
                loading={deleting}
                onPress={handleDeleteAccount}
                style={styles.modalBtn}
              />
            </View>
          </Card>
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
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  scrollContainer: {
    padding: 24,
    paddingBottom: 96,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 24,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  name: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  email: {
    fontWeight: '500',
  },
  sectionHeading: {
    fontWeight: 'bold',
    marginBottom: 12,
    marginLeft: 4,
  },
  settingsCard: {
    padding: 16,
    marginBottom: 24,
  },
  savedDetails: {
    gap: 4,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailsText: {
    flex: 1,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  settingLabelCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    fontWeight: '600',
  },
  rowDivider: {
    height: 1,
    width: '100%',
    marginVertical: 12,
  },
  settingRowComplex: {
    paddingVertical: 4,
  },
  languageScrollContainer: {
    gap: 8,
    paddingRight: 16,
  },
  langBadgeScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  langText: {
    fontWeight: 'bold',
  },
  actionsContainer: {
    gap: 12,
    marginTop: 8,
    marginBottom: 32,
  },
  actionBtn: {
    width: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  deleteCard: {
    width: '100%',
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalDesc: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalBtn: {
    flex: 1,
  },
});
export default SettingsScreen;
