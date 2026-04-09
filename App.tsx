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

type TaskEntry = {
  id: string;
  date: string;
  time: string;
  project: string;
  task: string;
  notes: string;
  completed: boolean;
  createdAt: string;
  trackedMs: number;
  trackingStartedAt?: string;
};

type NewTask = {
  date: string;
  time: string;
  project: string;
  task: string;
  notes: string;
};

type Language = 'uk' | 'en' | 'ro';
type Screen = 'menu' | 'calendar' | 'report' | 'settings';
type BreakReason = 'lunch' | 'smoke' | 'other';

type BreakEntry = {
  id: string;
  reason: BreakReason;
  startedAt: string;
  endedAt?: string;
};

type WorkDayState = {
  date: string;
  startedAt?: string;
  endedAt?: string;
  breaks: BreakEntry[];
};

const STORAGE_KEY = 'work-report-entries-v1';
const LANGUAGE_KEY = 'work-report-language-v1';
const WORKDAY_KEY = 'work-report-workday-v1';
const today = new Date().toISOString().slice(0, 10);

const translations: Record<
  Language,
  {
    title: string;
    subtitle: string;
    menuTitle: string;
    menuSubtitle: string;
    menuCalendar: string;
    menuReport: string;
    menuSettings: string;
    backToMenu: string;
    language: string;
    workDay: string;
    startDay: string;
    endDay: string;
    pauseDay: string;
    resumeDay: string;
    pauseReason: string;
    breakLunch: string;
    breakSmoke: string;
    breakOther: string;
    workTime: string;
    breakTime: string;
    netTime: string;
    dayNotStarted: string;
    dayFinished: string;
    currentTask: string;
    noCurrentTask: string;
    complete: string;
    completed: string;
    pending: string;
    calendarTitle: string;
    selectDay: string;
    addTask: string;
    timePlaceholder: string;
    projectPlaceholder: string;
    taskPlaceholder: string;
    notesPlaceholder: string;
    addTaskButton: string;
    startTask: string;
    pauseTask: string;
    resumeTask: string;
    taskTime: string;
    exportCsv: string;
    tasksForDay: string;
    noTasksForDay: string;
    allTasks: string;
    totalTasks: string;
    pendingTasks: string;
    doneTasks: string;
    productiveTime: string;
    idleTime: string;
    topTasks: string;
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
    subtitle: 'Планувальник задач по днях',
    menuTitle: 'Головне меню',
    menuSubtitle: 'Оберіть розділ',
    menuCalendar: '1. Календар',
    menuReport: '2. Звіт',
    menuSettings: '3. Налаштування',
    backToMenu: 'Назад у меню',
    language: 'Мова',
    workDay: 'Робочий день',
    startDay: 'Розпочати день',
    endDay: 'Завершити день',
    pauseDay: 'Пауза',
    resumeDay: 'Продовжити',
    pauseReason: 'Причина паузи',
    breakLunch: 'Обід',
    breakSmoke: 'Перекур',
    breakOther: 'Інше',
    workTime: 'Відпрацьовано',
    breakTime: 'Перерви',
    netTime: 'Чистий час',
    dayNotStarted: 'Робочий день ще не розпочато.',
    dayFinished: 'Робочий день завершено.',
    currentTask: 'Поточне завдання',
    noCurrentTask: 'Наразі немає активних задач.',
    complete: 'Завершити',
    completed: 'Завершено',
    pending: 'В процесі',
    calendarTitle: 'Календар',
    selectDay: 'Обраний день',
    addTask: 'Додати завдання',
    timePlaceholder: 'Час (HH:mm)',
    projectPlaceholder: 'Проєкт',
    taskPlaceholder: 'Задача',
    notesPlaceholder: 'Коментар',
    addTaskButton: 'Додати задачу',
    startTask: 'Старт',
    pauseTask: 'Пауза',
    resumeTask: 'Продовжити',
    taskTime: 'Час задачі',
    exportCsv: 'Експорт CSV',
    tasksForDay: 'Задачі за день',
    noTasksForDay: 'Ще немає задач на цей день.',
    allTasks: 'Усі задачі',
    totalTasks: 'Всього',
    pendingTasks: 'В процесі',
    doneTasks: 'Завершено',
    productiveTime: 'Продуктивний час',
    idleTime: 'Простій',
    topTasks: 'Топ-3 задачі за часом',
    delete: 'Видалити',
    error: 'Помилка',
    loadError: 'Не вдалося завантажити збережені записи.',
    saveError: 'Не вдалося зберегти зміни.',
    validationTitle: 'Перевір поля',
    validationMessage: 'Дата, час та назва задачі обовʼязкові.',
    noDataTitle: 'Нема даних',
    noDataMessage: 'Додай хоча б одну задачу перед експортом.',
    done: 'Готово',
    fileSaved: 'Файл збережено',
    exportError: 'Не вдалося зробити експорт.',
    csvHeader: 'Дата,Час,Проєкт,Задача,Коментар,Статус,Час задачі',
  },
  en: {
    title: 'Work Report iOS',
    subtitle: 'Daily task planner',
    menuTitle: 'Main Menu',
    menuSubtitle: 'Choose a section',
    menuCalendar: '1. Calendar',
    menuReport: '2. Report',
    menuSettings: '3. Settings',
    backToMenu: 'Back to menu',
    language: 'Language',
    workDay: 'Work day',
    startDay: 'Start day',
    endDay: 'End day',
    pauseDay: 'Pause',
    resumeDay: 'Resume',
    pauseReason: 'Pause reason',
    breakLunch: 'Lunch',
    breakSmoke: 'Smoke',
    breakOther: 'Other',
    workTime: 'Worked',
    breakTime: 'Breaks',
    netTime: 'Net time',
    dayNotStarted: 'Work day has not started yet.',
    dayFinished: 'Work day is finished.',
    currentTask: 'Current task',
    noCurrentTask: 'No active tasks right now.',
    complete: 'Complete',
    completed: 'Completed',
    pending: 'Pending',
    calendarTitle: 'Calendar',
    selectDay: 'Selected day',
    addTask: 'Add task',
    timePlaceholder: 'Time (HH:mm)',
    projectPlaceholder: 'Project',
    taskPlaceholder: 'Task',
    notesPlaceholder: 'Notes',
    addTaskButton: 'Add task',
    startTask: 'Start',
    pauseTask: 'Pause',
    resumeTask: 'Resume',
    taskTime: 'Task time',
    exportCsv: 'Export CSV',
    tasksForDay: 'Tasks for day',
    noTasksForDay: 'No tasks for this day yet.',
    allTasks: 'All tasks',
    totalTasks: 'Total',
    pendingTasks: 'Pending',
    doneTasks: 'Done',
    productiveTime: 'Productive time',
    idleTime: 'Idle time',
    topTasks: 'Top 3 tasks by time',
    delete: 'Delete',
    error: 'Error',
    loadError: 'Failed to load saved entries.',
    saveError: 'Failed to save changes.',
    validationTitle: 'Check fields',
    validationMessage: 'Date, time and task name are required.',
    noDataTitle: 'No data',
    noDataMessage: 'Add at least one task before export.',
    done: 'Done',
    fileSaved: 'File saved',
    exportError: 'Failed to export.',
    csvHeader: 'Date,Time,Project,Task,Notes,Status,Task Time',
  },
  ro: {
    title: 'Work Report iOS',
    subtitle: 'Planificator zilnic de sarcini',
    menuTitle: 'Meniu Principal',
    menuSubtitle: 'Alege o secțiune',
    menuCalendar: '1. Calendar',
    menuReport: '2. Raport',
    menuSettings: '3. Setări',
    backToMenu: 'Înapoi la meniu',
    language: 'Limbă',
    workDay: 'Zi de lucru',
    startDay: 'Începe ziua',
    endDay: 'Termină ziua',
    pauseDay: 'Pauză',
    resumeDay: 'Reia',
    pauseReason: 'Motiv pauză',
    breakLunch: 'Prânz',
    breakSmoke: 'Fumat',
    breakOther: 'Altceva',
    workTime: 'Timp lucrat',
    breakTime: 'Pauze',
    netTime: 'Timp net',
    dayNotStarted: 'Ziua de lucru nu a început încă.',
    dayFinished: 'Ziua de lucru este finalizată.',
    currentTask: 'Sarcina curentă',
    noCurrentTask: 'Nu există sarcini active acum.',
    complete: 'Finalizează',
    completed: 'Finalizat',
    pending: 'În lucru',
    calendarTitle: 'Calendar',
    selectDay: 'Zi selectată',
    addTask: 'Adaugă sarcină',
    timePlaceholder: 'Ora (HH:mm)',
    projectPlaceholder: 'Proiect',
    taskPlaceholder: 'Sarcină',
    notesPlaceholder: 'Comentariu',
    addTaskButton: 'Adaugă sarcina',
    startTask: 'Start',
    pauseTask: 'Pauză',
    resumeTask: 'Reia',
    taskTime: 'Timp sarcină',
    exportCsv: 'Exportă CSV',
    tasksForDay: 'Sarcini pe zi',
    noTasksForDay: 'Nu există încă sarcini pentru această zi.',
    allTasks: 'Toate sarcinile',
    totalTasks: 'Total',
    pendingTasks: 'În lucru',
    doneTasks: 'Finalizate',
    productiveTime: 'Timp productiv',
    idleTime: 'Timp inactiv',
    topTasks: 'Top 3 sarcini după timp',
    delete: 'Șterge',
    error: 'Eroare',
    loadError: 'Nu s-au putut încărca intrările salvate.',
    saveError: 'Nu s-au putut salva modificările.',
    validationTitle: 'Verifică câmpurile',
    validationMessage: 'Data, ora și sarcina sunt obligatorii.',
    noDataTitle: 'Fără date',
    noDataMessage: 'Adaugă cel puțin o sarcină înainte de export.',
    done: 'Gata',
    fileSaved: 'Fișier salvat',
    exportError: 'Exportul a eșuat.',
    csvHeader: 'Data,Ora,Proiect,Sarcină,Comentariu,Status,Timp sarcină',
  },
};

const INITIAL_FORM: NewTask = {
  date: today,
  time: '09:00',
  project: '',
  task: '',
  notes: '',
};

const parseDateTime = (entry: Pick<TaskEntry, 'date' | 'time'>) => new Date(`${entry.date}T${entry.time}:00`);
const getTaskTrackedMs = (entry: TaskEntry, nowMs: number) => {
  const live = entry.trackingStartedAt ? Math.max(0, nowMs - new Date(entry.trackingStartedAt).getTime()) : 0;
  return Math.max(0, entry.trackedMs + live);
};

export default function App() {
  const [entries, setEntries] = useState<TaskEntry[]>([]);
  const [form, setForm] = useState<NewTask>(INITIAL_FORM);
  const [language, setLanguage] = useState<Language>('uk');
  const [screen, setScreen] = useState<Screen>('menu');
  const [displayedMonth, setDisplayedMonth] = useState<Date>(new Date(today));
  const [nowTick, setNowTick] = useState<number>(Date.now());
  const [loading, setLoading] = useState(true);
  const t = translations[language];
  const [workDay, setWorkDay] = useState<WorkDayState>({ date: today, breaks: [] });

  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [raw, savedLanguage, rawWorkDay] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(LANGUAGE_KEY),
          AsyncStorage.getItem(WORKDAY_KEY),
        ]);
        if (raw) {
          const parsed: TaskEntry[] = JSON.parse(raw);
          const migrated = parsed.map((item) => ({
            id: item.id,
            date: item.date,
            time: item.time ?? '09:00',
            project: item.project ?? '',
            task: item.task ?? '',
            notes: item.notes ?? '',
            completed: item.completed ?? false,
            createdAt: item.createdAt ?? new Date().toISOString(),
            trackedMs: typeof item.trackedMs === 'number' ? item.trackedMs : 0,
            trackingStartedAt: item.trackingStartedAt,
          }));
          setEntries(migrated);
        }
        if (savedLanguage === 'uk' || savedLanguage === 'en' || savedLanguage === 'ro') {
          setLanguage(savedLanguage);
        }
        if (rawWorkDay) {
          const parsedWorkDay: WorkDayState = JSON.parse(rawWorkDay);
          setWorkDay({
            date: parsedWorkDay.date ?? today,
            startedAt: parsedWorkDay.startedAt,
            endedAt: parsedWorkDay.endedAt,
            breaks: Array.isArray(parsedWorkDay.breaks) ? parsedWorkDay.breaks : [],
          });
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
      AsyncStorage.setItem(WORKDAY_KEY, JSON.stringify(workDay)),
    ]).catch(() => {
      Alert.alert(t.error, t.saveError);
    });
  }, [entries, language, loading, t.error, t.saveError, workDay]);

  const summary = useMemo(() => {
    const total = entries.length;
    const done = entries.filter((item) => item.completed).length;
    return { total, done, pending: total - done };
  }, [entries]);


  const currentTask = useMemo(() => {
    const now = new Date(nowTick);
    return entries
      .filter((item) => !item.completed && parseDateTime(item) <= now)
      .sort((a, b) => parseDateTime(a).getTime() - parseDateTime(b).getTime())[0];
  }, [entries, nowTick]);

  const monthCells = useMemo(() => {
    const base = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth(), 1);
    const daysInMonth = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    const startDay = (base.getDay() + 6) % 7;
    const cells: Array<{ date: string; day: number; inMonth: boolean }> = [];
    for (let i = 0; i < startDay; i += 1) {
      const d = new Date(base);
      d.setDate(d.getDate() - (startDay - i));
      cells.push({ date: d.toISOString().slice(0, 10), day: d.getDate(), inMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d += 1) {
      const date = new Date(base.getFullYear(), base.getMonth(), d).toISOString().slice(0, 10);
      cells.push({ date, day: d, inMonth: true });
    }
    while (cells.length % 7 !== 0) {
      const last = new Date(cells[cells.length - 1].date);
      last.setDate(last.getDate() + 1);
      cells.push({ date: last.toISOString().slice(0, 10), day: last.getDate(), inMonth: false });
    }
    return cells;
  }, [displayedMonth]);

  const monthLabel = displayedMonth.toLocaleDateString(
    language === 'uk' ? 'uk-UA' : language === 'ro' ? 'ro-RO' : 'en-US',
    { month: 'long', year: 'numeric' },
  );

  const dayNames =
    language === 'uk'
      ? ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']
      : language === 'ro'
        ? ['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ', 'Du']
        : ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  const updateField = (field: keyof NewTask, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const addTask = () => {
    const validTime = /^([01]\d|2[0-3]):([0-5]\d)$/.test(form.time);
    if (!form.date || !form.task.trim() || !validTime) {
      Alert.alert(t.validationTitle, t.validationMessage);
      return;
    }
    const entry: TaskEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date: form.date,
      time: form.time,
      project: form.project.trim(),
      task: form.task.trim(),
      notes: form.notes.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
      trackedMs: 0,
      trackingStartedAt: undefined,
    };
    setEntries((prev) => [entry, ...prev]);
    setForm((prev) => ({ ...INITIAL_FORM, date: prev.date, time: prev.time }));
  };

  const removeTask = (id: string) => {
    setEntries((prev) => prev.filter((item) => item.id !== id));
  };

  const markDone = (id: string) => {
    const nowIso = new Date().toISOString();
    const nowMs = new Date(nowIso).getTime();
    setEntries((prev) =>
      prev.map((item) => {
        if (item.id !== id) {
          return item;
        }
        const extra = item.trackingStartedAt ? Math.max(0, nowMs - new Date(item.trackingStartedAt).getTime()) : 0;
        return {
          ...item,
          completed: true,
          trackedMs: item.trackedMs + extra,
          trackingStartedAt: undefined,
        };
      }),
    );
  };

  const toggleDone = (id: string) => {
    const nowIso = new Date().toISOString();
    const nowMs = new Date(nowIso).getTime();
    setEntries((prev) =>
      prev.map((item) => {
        if (item.id !== id) {
          return item;
        }
        if (item.completed) {
          return { ...item, completed: false };
        }
        const extra = item.trackingStartedAt ? Math.max(0, nowMs - new Date(item.trackingStartedAt).getTime()) : 0;
        return {
          ...item,
          completed: true,
          trackedMs: item.trackedMs + extra,
          trackingStartedAt: undefined,
        };
      }),
    );
  };

  const startTaskTimer = (id: string) => {
    if (!isDayRunning || !!activeBreak) {
      return;
    }
    const nowIso = new Date().toISOString();
    const nowMs = new Date(nowIso).getTime();
    setEntries((prev) =>
      prev.map((item) => {
        if (item.completed) {
          return item.id === id ? { ...item, completed: false, trackingStartedAt: nowIso } : item;
        }
        if (item.id === id) {
          return item.trackingStartedAt ? item : { ...item, trackingStartedAt: nowIso };
        }
        if (item.trackingStartedAt) {
          return {
            ...item,
            trackedMs: item.trackedMs + Math.max(0, nowMs - new Date(item.trackingStartedAt).getTime()),
            trackingStartedAt: undefined,
          };
        }
        return item;
      }),
    );
  };

  const pauseTaskTimer = (id: string) => {
    const nowIso = new Date().toISOString();
    const nowMs = new Date(nowIso).getTime();
    setEntries((prev) =>
      prev.map((item) => {
        if (item.id !== id || !item.trackingStartedAt) {
          return item;
        }
        return {
          ...item,
          trackedMs: item.trackedMs + Math.max(0, nowMs - new Date(item.trackingStartedAt).getTime()),
          trackingStartedAt: undefined,
        };
      }),
    );
  };

  const exportCsv = async () => {
    if (entries.length === 0) {
      Alert.alert(t.noDataTitle, t.noDataMessage);
      return;
    }
    const sorted = [...entries].sort((a, b) => {
      const byDate = a.date.localeCompare(b.date);
      return byDate !== 0 ? byDate : a.time.localeCompare(b.time);
    });
    const rows = sorted.map((item) =>
      [
        item.date,
        item.time,
        item.project,
        item.task,
        item.notes,
        item.completed ? t.completed : t.pending,
        formatDuration(getTaskTrackedMs(item, nowTick)),
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(','),
    );
    const summaryRows = [
      `"${t.workDay}","${workDay.date}","","","","",""`,
      `"${t.workTime}","${formatDuration(dayStats.workMs)}","","","","",""`,
      `"${t.breakTime}","${formatDuration(dayStats.breakMs)}","","","","",""`,
      `"${t.netTime}","${formatDuration(dayStats.netMs)}","","","","",""`,
      `"${t.taskTime}","${formatDuration(totalTaskTrackedMs)}","","","","",""`,
      `"${t.productiveTime}","${formatDuration(productiveMs)}","","","","",""`,
      `"${t.idleTime}","${formatDuration(idleMs)}","","","","",""`,
      '',
    ];
    const csv = [...summaryRows, t.csvHeader, ...rows].join('\n');
    const fileUri = `${FileSystem.cacheDirectory}work-report-${Date.now()}.csv`;
    try {
      await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
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

  const tasksForDay = entries
    .filter((item) => item.date === form.date)
    .sort((a, b) => a.time.localeCompare(b.time));
  const allTasks = [...entries].sort((a, b) => {
    const byDate = b.date.localeCompare(a.date);
    return byDate !== 0 ? byDate : b.time.localeCompare(a.time);
  });
  const hasTasksOnDay = (date: string) => entries.some((item) => item.date === date);
  const reasonLabel = (reason: BreakReason) =>
    reason === 'lunch' ? t.breakLunch : reason === 'smoke' ? t.breakSmoke : t.breakOther;

  const activeBreak = workDay.breaks.find((item) => !item.endedAt);
  const isDayRunning = Boolean(workDay.startedAt) && !workDay.endedAt;

  const formatDuration = (ms: number) => {
    const safeMs = Math.max(0, ms);
    const totalMinutes = Math.floor(safeMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  const startDay = () => {
    setWorkDay({
      date: today,
      startedAt: new Date().toISOString(),
      endedAt: undefined,
      breaks: [],
    });
  };

  const endDay = () => {
    if (!workDay.startedAt) {
      return;
    }
    const nowIso = new Date().toISOString();
    const nowMs = new Date(nowIso).getTime();
    setWorkDay((prev) => ({
      ...prev,
      endedAt: nowIso,
      breaks: prev.breaks.map((item) => (item.endedAt ? item : { ...item, endedAt: nowIso })),
    }));
    setEntries((prev) =>
      prev.map((item) =>
        item.trackingStartedAt
          ? {
              ...item,
              trackedMs: item.trackedMs + Math.max(0, nowMs - new Date(item.trackingStartedAt).getTime()),
              trackingStartedAt: undefined,
            }
          : item,
      ),
    );
  };

  const startBreak = (reason: BreakReason) => {
    if (!isDayRunning || activeBreak) {
      return;
    }
    const nowIso = new Date().toISOString();
    const nowMs = new Date(nowIso).getTime();
    setWorkDay((prev) => ({
      ...prev,
      breaks: [
        ...prev.breaks,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          reason,
          startedAt: nowIso,
        },
      ],
    }));
    setEntries((prev) =>
      prev.map((item) =>
        item.trackingStartedAt
          ? {
              ...item,
              trackedMs: item.trackedMs + Math.max(0, nowMs - new Date(item.trackingStartedAt).getTime()),
              trackingStartedAt: undefined,
            }
          : item,
      ),
    );
  };

  const resumeDay = () => {
    if (!activeBreak) {
      return;
    }
    const nowIso = new Date().toISOString();
    setWorkDay((prev) => ({
      ...prev,
      breaks: prev.breaks.map((item) => (item.id === activeBreak.id ? { ...item, endedAt: nowIso } : item)),
    }));
  };

  const dayStats = useMemo(() => {
    if (!workDay.startedAt) {
      return { workMs: 0, breakMs: 0, netMs: 0 };
    }
    const started = new Date(workDay.startedAt).getTime();
    const endPoint = workDay.endedAt ? new Date(workDay.endedAt).getTime() : nowTick;
    const workMs = Math.max(0, endPoint - started);
    const breakMs = workDay.breaks.reduce((sum, item) => {
      const start = new Date(item.startedAt).getTime();
      const end = item.endedAt ? new Date(item.endedAt).getTime() : nowTick;
      return sum + Math.max(0, end - start);
    }, 0);
    return { workMs, breakMs, netMs: Math.max(0, workMs - breakMs) };
  }, [nowTick, workDay]);

  const totalTaskTrackedMs = useMemo(
    () => entries.reduce((sum, item) => sum + getTaskTrackedMs(item, nowTick), 0),
    [entries, nowTick],
  );
  const productiveMs = totalTaskTrackedMs;
  const idleMs = Math.max(0, dayStats.netMs - productiveMs);
  const topTasks = useMemo(
    () =>
      [...entries]
        .sort((a, b) => getTaskTrackedMs(b, nowTick) - getTaskTrackedMs(a, nowTick))
        .slice(0, 3),
    [entries, nowTick],
  );

  const renderMenu = () => (
    <View style={styles.menuContainer}>
      <Text style={styles.title}>{t.title}</Text>
      <Text style={styles.subtitle}>{t.subtitle}</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.menuTitle}</Text>
        <Text style={styles.menuSubtitle}>{t.menuSubtitle}</Text>
        <Pressable style={styles.menuButton} onPress={() => setScreen('calendar')}>
          <Text style={styles.menuButtonText}>{t.menuCalendar}</Text>
        </Pressable>
        <Pressable style={styles.menuButton} onPress={() => setScreen('report')}>
          <Text style={styles.menuButtonText}>{t.menuReport}</Text>
        </Pressable>
        <Pressable style={styles.menuButton} onPress={() => setScreen('settings')}>
          <Text style={styles.menuButtonText}>{t.menuSettings}</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderCalendar = () => (
    <>
      <View style={styles.topNavRow}>
        <Pressable style={styles.backButton} onPress={() => setScreen('menu')}>
          <Text style={styles.backButtonText}>{t.backToMenu}</Text>
        </Pressable>
      </View>
      <Text style={styles.title}>{t.calendarTitle}</Text>
      <Text style={styles.subtitle}>{t.subtitle}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.workDay}</Text>
        {!workDay.startedAt && <Text style={styles.emptyText}>{t.dayNotStarted}</Text>}
        {!!workDay.startedAt && !!workDay.endedAt && <Text style={styles.emptyText}>{t.dayFinished}</Text>}
        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>{t.workTime}</Text>
            <Text style={styles.summaryValue}>{formatDuration(dayStats.workMs)}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>{t.breakTime}</Text>
            <Text style={styles.summaryValue}>{formatDuration(dayStats.breakMs)}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>{t.netTime}</Text>
            <Text style={styles.summaryValue}>{formatDuration(dayStats.netMs)}</Text>
          </View>
        </View>
        {!isDayRunning && (
          <Pressable style={styles.primaryButton} onPress={startDay}>
            <Text style={styles.buttonText}>{t.startDay}</Text>
          </Pressable>
        )}
        {isDayRunning && (
          <>
            <View style={styles.actionsRow}>
              <Pressable style={styles.secondaryButton} onPress={() => startBreak('lunch')}>
                <Text style={styles.secondaryButtonText}>{t.breakLunch}</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={() => startBreak('smoke')}>
                <Text style={styles.secondaryButtonText}>{t.breakSmoke}</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={() => startBreak('other')}>
                <Text style={styles.secondaryButtonText}>{t.breakOther}</Text>
              </Pressable>
            </View>
            {!!activeBreak && (
              <View style={styles.activeBreakRow}>
                <Text style={styles.entryNotes}>{t.pauseReason}: {reasonLabel(activeBreak.reason)}</Text>
                <Pressable onPress={resumeDay}>
                  <Text style={styles.markDoneText}>{t.resumeDay}</Text>
                </Pressable>
              </View>
            )}
            <Pressable style={styles.primaryButton} onPress={endDay}>
              <Text style={styles.buttonText}>{t.endDay}</Text>
            </Pressable>
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.currentTask}</Text>
        {currentTask ? (
          <>
            <Text style={styles.entryTask}>{currentTask.date} {currentTask.time}</Text>
            <Text style={styles.entryProject}>{currentTask.project || '-'}</Text>
            <Text style={styles.entryNotes}>{currentTask.task}</Text>
            {!!currentTask.notes && <Text style={styles.entryNotes}>{currentTask.notes}</Text>}
            <Text style={styles.entryNotes}>{t.taskTime}: {formatDuration(getTaskTrackedMs(currentTask, nowTick))}</Text>
            <View style={styles.taskActionRow}>
              <Pressable onPress={() => (currentTask.trackingStartedAt ? pauseTaskTimer(currentTask.id) : startTaskTimer(currentTask.id))}>
                <Text style={styles.markDoneText}>
                  {currentTask.trackingStartedAt ? t.pauseTask : currentTask.trackedMs > 0 ? t.resumeTask : t.startTask}
                </Text>
              </Pressable>
              <Pressable onPress={() => markDone(currentTask.id)}>
                <Text style={styles.markDoneText}>{t.complete}</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <Text style={styles.emptyText}>{t.noCurrentTask}</Text>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.monthHeaderRow}>
          <Pressable
            style={styles.monthNavButton}
            onPress={() => setDisplayedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
          >
            <Text style={styles.monthNavText}>{'<'}</Text>
          </Pressable>
          <Text style={styles.cardTitle}>{monthLabel}</Text>
          <Pressable
            style={styles.monthNavButton}
            onPress={() => setDisplayedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
          >
            <Text style={styles.monthNavText}>{'>'}</Text>
          </Pressable>
        </View>
        <View style={styles.weekdaysRow}>
          {dayNames.map((day) => (
            <Text key={day} style={styles.weekdayText}>{day}</Text>
          ))}
        </View>
        <View style={styles.calendarGrid}>
          {monthCells.map((cell) => {
            const selected = cell.date === form.date;
            return (
              <Pressable
                key={`${cell.date}-${cell.day}`}
                onPress={() => updateField('date', cell.date)}
                style={[styles.dayCell, !cell.inMonth && styles.dayCellMuted, selected && styles.dayCellSelected]}
              >
                <Text style={[styles.dayCellText, !cell.inMonth && styles.dayCellTextMuted, selected && styles.dayCellTextSelected]}>
                  {cell.day}
                </Text>
                {hasTasksOnDay(cell.date) && <View style={styles.dayDot} />}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.addTask}</Text>
        <Text style={styles.menuSubtitle}>{t.selectDay}: {form.date}</Text>
        <TextInput
          style={styles.input}
          value={form.time}
          onChangeText={(text) => updateField('time', text)}
          placeholder={t.timePlaceholder}
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
          style={[styles.input, styles.notesInput]}
          value={form.notes}
          onChangeText={(text) => updateField('notes', text)}
          placeholder={t.notesPlaceholder}
          multiline
        />
        <Pressable style={styles.primaryButton} onPress={addTask}>
          <Text style={styles.buttonText}>{t.addTaskButton}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.tasksForDay} {form.date}</Text>
        <FlatList
          data={tasksForDay}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          ListEmptyComponent={<Text style={styles.emptyText}>{t.noTasksForDay}</Text>}
          renderItem={({ item }) => (
            <View style={styles.entryCard}>
              <View style={styles.entryHeader}>
                <Text style={styles.entryProject}>{item.time} • {item.project || '-'}</Text>
                <Text style={[styles.entryHours, item.completed && styles.completedText]}>
                  {item.completed ? t.completed : t.pending}
                </Text>
              </View>
              <Text style={styles.entryTask}>{item.task}</Text>
              {!!item.notes && <Text style={styles.entryNotes}>{item.notes}</Text>}
              <Text style={styles.entryNotes}>{t.taskTime}: {formatDuration(getTaskTrackedMs(item, nowTick))}</Text>
              <View style={styles.taskActionRow}>
                <Pressable onPress={() => (item.trackingStartedAt ? pauseTaskTimer(item.id) : startTaskTimer(item.id))}>
                  <Text style={styles.markDoneText}>
                    {item.trackingStartedAt ? t.pauseTask : item.trackedMs > 0 ? t.resumeTask : t.startTask}
                  </Text>
                </Pressable>
                <Pressable onPress={() => toggleDone(item.id)}>
                  <Text style={styles.markDoneText}>{item.completed ? t.pending : t.complete}</Text>
                </Pressable>
                <Pressable onPress={() => removeTask(item.id)}>
                  <Text style={styles.deleteText}>{t.delete}</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      </View>
    </>
  );

  const renderReport = () => (
    <>
      <View style={styles.topNavRow}>
        <Pressable style={styles.backButton} onPress={() => setScreen('menu')}>
          <Text style={styles.backButtonText}>{t.backToMenu}</Text>
        </Pressable>
      </View>
      <Text style={styles.title}>{t.menuReport}</Text>
      <Text style={styles.subtitle}>{t.subtitle}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.workDay}</Text>
        <Text style={styles.entryNotes}>{t.workTime}: {formatDuration(dayStats.workMs)}</Text>
        <Text style={styles.entryNotes}>{t.breakTime}: {formatDuration(dayStats.breakMs)}</Text>
        <Text style={styles.entryNotes}>{t.netTime}: {formatDuration(dayStats.netMs)}</Text>
        <Text style={styles.entryNotes}>{t.taskTime}: {formatDuration(totalTaskTrackedMs)}</Text>
        <Text style={styles.entryNotes}>{t.productiveTime}: {formatDuration(productiveMs)}</Text>
        <Text style={styles.entryNotes}>{t.idleTime}: {formatDuration(idleMs)}</Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>{t.totalTasks}</Text>
          <Text style={styles.summaryValue}>{summary.total}</Text>
        </View>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>{t.pendingTasks}</Text>
          <Text style={styles.summaryValue}>{summary.pending}</Text>
        </View>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>{t.doneTasks}</Text>
          <Text style={styles.summaryValue}>{summary.done}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.menuReport}</Text>
        <Pressable style={styles.secondaryButton} onPress={exportCsv}>
          <Text style={styles.secondaryButtonText}>{t.exportCsv}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.topTasks}</Text>
        <FlatList
          data={topTasks}
          keyExtractor={(item) => `top-${item.id}`}
          scrollEnabled={false}
          ListEmptyComponent={<Text style={styles.emptyText}>{t.noTasksForDay}</Text>}
          renderItem={({ item, index }) => (
            <View style={styles.entryCard}>
              <Text style={styles.entryTask}>{index + 1}. {item.task}</Text>
              <Text style={styles.entryNotes}>{item.project || '-'}</Text>
              <Text style={styles.entryNotes}>
                {t.taskTime}: {formatDuration(getTaskTrackedMs(item, nowTick))} (
                {dayStats.netMs > 0 ? Math.round((getTaskTrackedMs(item, nowTick) / dayStats.netMs) * 100) : 0}%)
              </Text>
            </View>
          )}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.allTasks}</Text>
        <FlatList
          data={allTasks}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          ListEmptyComponent={<Text style={styles.emptyText}>{t.noTasksForDay}</Text>}
          renderItem={({ item }) => (
            <View style={styles.entryCard}>
              <Text style={styles.entryTask}>{item.date} {item.time} • {item.project || '-'}</Text>
              <Text style={styles.entryNotes}>{item.task} ({item.completed ? t.completed : t.pending})</Text>
              <Text style={styles.entryNotes}>{t.taskTime}: {formatDuration(getTaskTrackedMs(item, nowTick))}</Text>
            </View>
          )}
        />
      </View>
    </>
  );

  const renderSettings = () => (
    <>
      <View style={styles.topNavRow}>
        <Pressable style={styles.backButton} onPress={() => setScreen('menu')}>
          <Text style={styles.backButtonText}>{t.backToMenu}</Text>
        </Pressable>
      </View>
      <Text style={styles.title}>{t.menuSettings}</Text>
      <Text style={styles.subtitle}>{t.subtitle}</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.language}</Text>
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
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', default: undefined })} style={styles.safeArea}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {screen === 'menu' && renderMenu()}
          {screen === 'calendar' && renderCalendar()}
          {screen === 'report' && renderReport()}
          {screen === 'settings' && renderSettings()}
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
  menuContainer: {
    paddingTop: 12,
  },
  menuSubtitle: {
    color: '#6a7081',
    marginBottom: 12,
    fontSize: 14,
  },
  menuButton: {
    borderWidth: 1,
    borderColor: '#d8dfef',
    backgroundColor: '#f7f9ff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  menuButtonText: {
    color: '#1e2b4d',
    fontSize: 15,
    fontWeight: '700',
  },
  topNavRow: {
    marginTop: 4,
    marginBottom: 8,
    flexDirection: 'row',
  },
  backButton: {
    backgroundColor: '#e9eefc',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    color: '#2b4ab8',
    fontSize: 13,
    fontWeight: '700',
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
  primaryButton: {
    marginTop: 4,
    backgroundColor: '#2563eb',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryButton: {
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
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  activeBreakRow: {
    marginTop: 6,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  monthHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  monthNavButton: {
    borderWidth: 1,
    borderColor: '#d0d9ec',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#f6f9ff',
  },
  monthNavText: {
    color: '#1f3b8f',
    fontWeight: '700',
    fontSize: 16,
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  weekdayText: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    color: '#6c7389',
    fontWeight: '600',
    fontSize: 12,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dayCell: {
    width: '13.2%',
    minHeight: 42,
    borderWidth: 1,
    borderColor: '#dce2ef',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fbff',
  },
  dayCellMuted: {
    opacity: 0.45,
  },
  dayCellSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#eaf1ff',
  },
  dayCellText: {
    color: '#233058',
    fontSize: 12,
    fontWeight: '700',
  },
  dayCellTextMuted: {
    color: '#66708a',
  },
  dayCellTextSelected: {
    color: '#1f45b5',
  },
  dayDot: {
    marginTop: 3,
    width: 5,
    height: 5,
    borderRadius: 5,
    backgroundColor: '#2563eb',
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
  taskActionRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  markDoneText: {
    color: '#155e75',
    fontWeight: '600',
    fontSize: 13,
  },
  deleteText: {
    color: '#c11c31',
    fontWeight: '600',
    fontSize: 13,
  },
  completedText: {
    color: '#0f766e',
  },
});
