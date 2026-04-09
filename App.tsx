import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type WorkEntry = {
  id: string;
  date: string;
  project: string;
  task: string;
  hours: number;
  notes: string;
};

type NewEntry = {
  date: string;
  project: string;
  task: string;
  hours: string;
  notes: string;
};

const STORAGE_KEY = 'work-report-entries-v1';
const LANGUAGE_KEY = 'work-report-language-v1';
const today = new Date().toISOString().slice(0, 10);
type Language = 'uk' | 'en' | 'ro';

const translations: Record<
  Language,
  {
    title: string;
    subtitle: string;
    language: string;
    newEntry: string;
    datePlaceholder: string;
    projectPlaceholder: string;
    taskPlaceholder: string;
    hoursPlaceholder: string;
    notesPlaceholder: string;
    add: string;
    exportCsv: string;
    day: string;
    week: string;
    entriesForDate: string;
    emptyDay: string;
    delete: string;
    error: string;
    loadError: string;
    saveError: string;
    validationTitle: string;
    validationMessage: string;
    noDataTitle: string;
    noDataMessage: string;
    done: string;
    fileSaved: string;
    exportError: string;
    csvHeader: string;
  }
> = {
  uk: {
    title: 'Work Report iOS',
    subtitle: 'Швидкий щоденний звіт по роботі',
    language: 'Мова',
    newEntry: 'Новий запис',
    datePlaceholder: 'YYYY-MM-DD',
    projectPlaceholder: 'Проєкт',
    taskPlaceholder: 'Задача',
    hoursPlaceholder: 'Години (наприклад 2.5)',
    notesPlaceholder: 'Коментар',
    add: 'Додати',
    exportCsv: 'Експорт CSV',
    day: 'За день',
    week: 'За тиждень',
    entriesForDate: 'Записи за',
    emptyDay: 'Ще нема записів за цей день.',
    delete: 'Видалити',
    error: 'Помилка',
    loadError: 'Не вдалося завантажити збережені записи.',
    saveError: 'Не вдалося зберегти зміни.',
    validationTitle: 'Перевір поля',
    validationMessage: 'Дата, проєкт, задача та години обовʼязкові.',
    noDataTitle: 'Нема даних',
    noDataMessage: 'Додай хоча б один запис перед експортом.',
    done: 'Готово',
    fileSaved: 'Файл збережено',
    exportError: 'Не вдалося зробити експорт.',
    csvHeader: 'Дата,Проєкт,Задача,Години,Коментар',
  },
  en: {
    title: 'Work Report iOS',
    subtitle: 'Quick daily work reporting',
    language: 'Language',
    newEntry: 'New Entry',
    datePlaceholder: 'YYYY-MM-DD',
    projectPlaceholder: 'Project',
    taskPlaceholder: 'Task',
    hoursPlaceholder: 'Hours (for example 2.5)',
    notesPlaceholder: 'Notes',
    add: 'Add',
    exportCsv: 'Export CSV',
    day: 'Per Day',
    week: 'Per Week',
    entriesForDate: 'Entries for',
    emptyDay: 'No entries for this day yet.',
    delete: 'Delete',
    error: 'Error',
    loadError: 'Failed to load saved entries.',
    saveError: 'Failed to save changes.',
    validationTitle: 'Check fields',
    validationMessage: 'Date, project, task, and hours are required.',
    noDataTitle: 'No data',
    noDataMessage: 'Add at least one entry before export.',
    done: 'Done',
    fileSaved: 'File saved',
    exportError: 'Failed to export.',
    csvHeader: 'Date,Project,Task,Hours,Notes',
  },
  ro: {
    title: 'Work Report iOS',
    subtitle: 'Raport zilnic rapid de lucru',
    language: 'Limbă',
    newEntry: 'Intrare Nouă',
    datePlaceholder: 'YYYY-MM-DD',
    projectPlaceholder: 'Proiect',
    taskPlaceholder: 'Sarcină',
    hoursPlaceholder: 'Ore (de exemplu 2.5)',
    notesPlaceholder: 'Comentariu',
    add: 'Adaugă',
    exportCsv: 'Exportă CSV',
    day: 'Pe zi',
    week: 'Pe săptămână',
    entriesForDate: 'Intrări pentru',
    emptyDay: 'Nu există încă intrări pentru această zi.',
    delete: 'Șterge',
    error: 'Eroare',
    loadError: 'Nu s-au putut încărca intrările salvate.',
    saveError: 'Nu s-au putut salva modificările.',
    validationTitle: 'Verifică câmpurile',
    validationMessage: 'Data, proiectul, sarcina și orele sunt obligatorii.',
    noDataTitle: 'Fără date',
    noDataMessage: 'Adaugă cel puțin o intrare înainte de export.',
    done: 'Gata',
    fileSaved: 'Fișier salvat',
    exportError: 'Exportul a eșuat.',
    csvHeader: 'Data,Proiect,Sarcină,Ore,Comentariu',
  },
};

const INITIAL_FORM: NewEntry = {
  date: today,
  project: '',
  task: '',
  hours: '',
  notes: '',
};

export default function App() {
  const [entries, setEntries] = useState<WorkEntry[]>([]);
  const [form, setForm] = useState<NewEntry>(INITIAL_FORM);
  const [language, setLanguage] = useState<Language>('uk');
  const [loading, setLoading] = useState(true);
  const t = translations[language];

  useEffect(() => {
    const load = async () => {
      try {
        const [raw, savedLanguage] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(LANGUAGE_KEY),
        ]);
        if (raw) {
          const parsed: WorkEntry[] = JSON.parse(raw);
          setEntries(parsed);
        }
        if (savedLanguage === 'uk' || savedLanguage === 'en' || savedLanguage === 'ro') {
          setLanguage(savedLanguage);
        }
      } catch {
        Alert.alert(t.error, t.loadError);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    if (loading) {
      return;
    }

    Promise.all([
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries)),
      AsyncStorage.setItem(LANGUAGE_KEY, language),
    ]).catch(() => {
      Alert.alert(t.error, t.saveError);
    });
  }, [entries, language, loading, t.error, t.saveError]);

  const summary = useMemo(() => {
    const dayHours = entries
      .filter((item) => item.date === form.date)
      .reduce((sum, item) => sum + item.hours, 0);

    const weekStart = new Date(form.date);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const weekHours = entries.reduce((sum, item) => {
      const itemDate = new Date(item.date);
      if (itemDate >= weekStart && itemDate <= weekEnd) {
        return sum + item.hours;
      }
      return sum;
    }, 0);

    return {
      dayHours: dayHours.toFixed(1),
      weekHours: weekHours.toFixed(1),
    };
  }, [entries, form.date]);

  const updateField = (field: keyof NewEntry, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const addEntry = () => {
    const hours = Number(form.hours.replace(',', '.'));
    if (!form.date || !form.project.trim() || !form.task.trim() || Number.isNaN(hours) || hours <= 0) {
      Alert.alert(t.validationTitle, t.validationMessage);
      return;
    }

    const entry: WorkEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date: form.date,
      project: form.project.trim(),
      task: form.task.trim(),
      hours,
      notes: form.notes.trim(),
    };

    setEntries((prev) => [entry, ...prev]);
    setForm((prev) => ({ ...INITIAL_FORM, date: prev.date }));
  };

  const removeEntry = (id: string) => {
    setEntries((prev) => prev.filter((item) => item.id !== id));
  };

  const exportCsv = async () => {
    if (entries.length === 0) {
      Alert.alert(t.noDataTitle, t.noDataMessage);
      return;
    }

    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    const rows = sorted.map((item) =>
      [item.date, item.project, item.task, item.hours.toFixed(1), item.notes]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(','),
    );
    const csv = [t.csvHeader, ...rows].join('\n');
    const fileUri = `${FileSystem.cacheDirectory}work-report-${Date.now()}.csv`;

    try {
      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert(t.done, `${t.fileSaved}: ${fileUri}`);
        return;
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        UTI: 'public.comma-separated-values-text',
      });
    } catch {
      Alert.alert(t.error, t.exportError);
    }
  };

  const filteredEntries = entries.filter((item) => item.date === form.date);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', default: undefined })} style={styles.safeArea}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.title}>{t.title}</Text>
          <Text style={styles.subtitle}>{t.subtitle}</Text>

          <View style={styles.languageRow}>
            <Text style={styles.languageLabel}>{t.language}</Text>
            <View style={styles.languageButtons}>
              {(['uk', 'en', 'ro'] as Language[]).map((lang) => (
                <Pressable
                  key={lang}
                  onPress={() => setLanguage(lang)}
                  style={[styles.languageButton, language === lang && styles.languageButtonActive]}
                >
                  <Text style={[styles.languageButtonText, language === lang && styles.languageButtonTextActive]}>
                    {lang.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t.newEntry}</Text>
            <TextInput
              style={styles.input}
              value={form.date}
              onChangeText={(text) => updateField('date', text)}
              placeholder={t.datePlaceholder}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              value={form.project}
              onChangeText={(text) => updateField('project', text)}
              placeholder={t.projectPlaceholder}
            />
            <TextInput
              style={styles.input}
              value={form.task}
              onChangeText={(text) => updateField('task', text)}
              placeholder={t.taskPlaceholder}
            />
            <TextInput
              style={styles.input}
              value={form.hours}
              onChangeText={(text) => updateField('hours', text)}
              placeholder={t.hoursPlaceholder}
              keyboardType="decimal-pad"
            />
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={form.notes}
              onChangeText={(text) => updateField('notes', text)}
              placeholder={t.notesPlaceholder}
              multiline
            />

            <View style={styles.actionsRow}>
              <Pressable style={styles.primaryButton} onPress={addEntry}>
                <Text style={styles.buttonText}>{t.add}</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={exportCsv}>
                <Text style={styles.secondaryButtonText}>{t.exportCsv}</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>{t.day}</Text>
              <Text style={styles.summaryValue}>{summary.dayHours}h</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>{t.week}</Text>
              <Text style={styles.summaryValue}>{summary.weekHours}h</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t.entriesForDate} {form.date}</Text>
            <FlatList
              data={filteredEntries}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ListEmptyComponent={<Text style={styles.emptyText}>{t.emptyDay}</Text>}
              renderItem={({ item }) => (
                <View style={styles.entryCard}>
                  <View style={styles.entryHeader}>
                    <Text style={styles.entryProject}>{item.project}</Text>
                    <Text style={styles.entryHours}>{item.hours.toFixed(1)}h</Text>
                  </View>
                  <Text style={styles.entryTask}>{item.task}</Text>
                  {!!item.notes && <Text style={styles.entryNotes}>{item.notes}</Text>}
                  <Pressable onPress={() => removeEntry(item.id)}>
                    <Text style={styles.deleteText}>{t.delete}</Text>
                  </Pressable>
                </View>
              )}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f6f7fb',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1b1b1f',
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 14,
    color: '#5f6270',
    fontSize: 14,
  },
  languageRow: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  languageLabel: {
    color: '#4d5363',
    fontWeight: '600',
    fontSize: 14,
  },
  languageButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  languageButton: {
    borderWidth: 1,
    borderColor: '#cfd6e7',
    backgroundColor: '#ffffff',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  languageButtonActive: {
    borderColor: '#2563eb',
    backgroundColor: '#2563eb',
  },
  languageButtonText: {
    color: '#3f485d',
    fontSize: 12,
    fontWeight: '700',
  },
  languageButtonTextActive: {
    color: '#ffffff',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e8e8ef',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    color: '#15161a',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d9dce8',
    backgroundColor: '#fcfcff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    fontSize: 14,
  },
  notesInput: {
    minHeight: 66,
    textAlignVertical: 'top',
  },
  actionsRow: {
    marginTop: 6,
    flexDirection: 'row',
    gap: 8,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#ecf2ff',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c7dafd',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryButtonText: {
    color: '#1e40af',
    fontWeight: '700',
    fontSize: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  summaryBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e8e8ef',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
  },
  summaryLabel: {
    color: '#666a78',
    fontSize: 13,
  },
  summaryValue: {
    marginTop: 4,
    fontWeight: '700',
    color: '#17171b',
    fontSize: 20,
  },
  emptyText: {
    color: '#6d7180',
    fontSize: 14,
    paddingVertical: 6,
  },
  entryCard: {
    borderWidth: 1,
    borderColor: '#e8e8ef',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    backgroundColor: '#fcfcff',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryProject: {
    fontSize: 14,
    fontWeight: '700',
    color: '#15161a',
  },
  entryHours: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  entryTask: {
    marginTop: 4,
    color: '#22242b',
    fontSize: 14,
  },
  entryNotes: {
    marginTop: 4,
    color: '#656a7a',
    fontSize: 13,
  },
  deleteText: {
    marginTop: 8,
    color: '#c11c31',
    fontWeight: '600',
    fontSize: 13,
  },
});
