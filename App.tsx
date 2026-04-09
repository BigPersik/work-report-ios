import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
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
  task: string;
  notes: string;
};

type Language = 'uk' | 'en' | 'ro';
type Screen = 'calendar' | 'report' | 'settings';
type ThemeMode = 'light' | 'dark' | 'colorful';

type BreakEntry = {
  id: string;
  startedAt: string;
  endedAt?: string;
};

type WorkDayState = {
  date: string;
  startedAt?: string;
  endedAt?: string;
  breaks: BreakEntry[];
  accumulatedWorkMs: number;
};

const STORAGE_KEY = 'work-report-entries-v1';
const LANGUAGE_KEY = 'work-report-language-v1';
const WORKDAY_KEY = 'work-report-workday-v1';
const THEME_KEY = 'work-report-theme-v1';
const SOUND_KEY = 'work-report-sound-v1';
const HAPTICS_KEY = 'work-report-haptics-v1';
const formatLocalDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
const formatLocalTime = (date: Date) => {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
};
const today = formatLocalDate(new Date());

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
    theme: string;
    sound: string;
    haptics: string;
    on: string;
    off: string;
    themeLight: string;
    themeDark: string;
    themeColorful: string;
    workDay: string;
    startDay: string;
    endDay: string;
    pauseDay: string;
    resumeDay: string;
    workTime: string;
    breakTime: string;
    netTime: string;
    dayNotStarted: string;
    dayFinished: string;
    nextTask: string;
    noNextTask: string;
    currentTask: string;
    noCurrentTask: string;
    complete: string;
    completed: string;
    pending: string;
    calendarTitle: string;
    selectDay: string;
    openDatePicker: string;
    openTimePicker: string;
    addTask: string;
    timePlaceholder: string;
    taskPlaceholder: string;
    notesPlaceholder: string;
    addTaskButton: string;
    startTask: string;
    pauseTask: string;
    resumeTask: string;
    startNow: string;
    taskTime: string;
    exportCsv: string;
    generalTasks: string;
    noGeneralTasks: string;
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
    title: 'DayFlow',
    subtitle: 'Планувальник задач по днях',
    menuTitle: 'Розділи',
    menuSubtitle: 'Навігація',
    menuCalendar: 'Календар',
    menuReport: 'Звіт',
    menuSettings: 'Налаштування',
    backToMenu: 'Назад',
    language: 'Мова',
    theme: 'Тема',
    sound: 'Звук',
    haptics: 'Вібрація',
    on: 'Увімк.',
    off: 'Вимк.',
    themeLight: 'Світла',
    themeDark: 'Темна',
    themeColorful: 'Кольорова',
    workDay: 'Робочий день',
    startDay: 'Розпочати день',
    endDay: 'Завершити день',
    pauseDay: 'Пауза',
    resumeDay: 'Продовжити',
    workTime: 'Відпрацьовано',
    breakTime: 'Перерви',
    netTime: 'Чистий час',
    dayNotStarted: 'Робочий день ще не розпочато.',
    dayFinished: 'Робочий день завершено.',
    nextTask: 'Наступна задача',
    noNextTask: 'Наступних задач немає.',
    currentTask: 'Поточне завдання',
    noCurrentTask: 'Наразі немає активних задач.',
    complete: 'Завершити',
    completed: 'Завершено',
    pending: 'В процесі',
    calendarTitle: 'Календар',
    selectDay: 'Обраний день',
    openDatePicker: 'Обрати дату',
    openTimePicker: 'Обрати час',
    addTask: 'Додати завдання',
    timePlaceholder: 'Час (HH:mm)',
    taskPlaceholder: 'Задача',
    notesPlaceholder: 'Коментар',
    addTaskButton: 'Додати задачу',
    startTask: 'Старт',
    pauseTask: 'Пауза',
    resumeTask: 'Продовжити',
    startNow: 'Взяти в роботу зараз',
    taskTime: 'Час задачі',
    exportCsv: 'Експорт CSV',
    generalTasks: 'Загальні задачі',
    noGeneralTasks: 'Немає запланованих незавершених задач.',
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
    csvHeader: 'Дата,Час,Задача,Коментар,Статус,Час задачі',
  },
  en: {
    title: 'DayFlow',
    subtitle: 'Daily task planner',
    menuTitle: 'Sections',
    menuSubtitle: 'Navigation',
    menuCalendar: 'Calendar',
    menuReport: 'Report',
    menuSettings: 'Settings',
    backToMenu: 'Back',
    language: 'Language',
    theme: 'Theme',
    sound: 'Sound',
    haptics: 'Haptics',
    on: 'On',
    off: 'Off',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeColorful: 'Colorful',
    workDay: 'Work day',
    startDay: 'Start day',
    endDay: 'End day',
    pauseDay: 'Pause',
    resumeDay: 'Resume',
    workTime: 'Worked',
    breakTime: 'Breaks',
    netTime: 'Net time',
    dayNotStarted: 'Work day has not started yet.',
    dayFinished: 'Work day is finished.',
    nextTask: 'Next task',
    noNextTask: 'No upcoming tasks.',
    currentTask: 'Current task',
    noCurrentTask: 'No active tasks right now.',
    complete: 'Complete',
    completed: 'Completed',
    pending: 'Pending',
    calendarTitle: 'Calendar',
    selectDay: 'Selected day',
    openDatePicker: 'Pick date',
    openTimePicker: 'Pick time',
    addTask: 'Add task',
    timePlaceholder: 'Time (HH:mm)',
    taskPlaceholder: 'Task',
    notesPlaceholder: 'Notes',
    addTaskButton: 'Add task',
    startTask: 'Start',
    pauseTask: 'Pause',
    resumeTask: 'Resume',
    startNow: 'Start now',
    taskTime: 'Task time',
    exportCsv: 'Export CSV',
    generalTasks: 'General tasks',
    noGeneralTasks: 'No scheduled unfinished tasks.',
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
    csvHeader: 'Date,Time,Task,Notes,Status,Task Time',
  },
  ro: {
    title: 'DayFlow',
    subtitle: 'Planificator zilnic de sarcini',
    menuTitle: 'Secțiuni',
    menuSubtitle: 'Navigare',
    menuCalendar: 'Calendar',
    menuReport: 'Raport',
    menuSettings: 'Setări',
    backToMenu: 'Înapoi',
    language: 'Limbă',
    theme: 'Temă',
    sound: 'Sunet',
    haptics: 'Vibratie',
    on: 'Pornit',
    off: 'Oprit',
    themeLight: 'Luminoasă',
    themeDark: 'Întunecată',
    themeColorful: 'Colorată',
    workDay: 'Zi de lucru',
    startDay: 'Începe ziua',
    endDay: 'Termină ziua',
    pauseDay: 'Pauză',
    resumeDay: 'Reia',
    workTime: 'Timp lucrat',
    breakTime: 'Pauze',
    netTime: 'Timp net',
    dayNotStarted: 'Ziua de lucru nu a început încă.',
    dayFinished: 'Ziua de lucru este finalizată.',
    nextTask: 'Următoarea sarcină',
    noNextTask: 'Nu există sarcini următoare.',
    currentTask: 'Sarcina curentă',
    noCurrentTask: 'Nu există sarcini active acum.',
    complete: 'Finalizează',
    completed: 'Finalizat',
    pending: 'În lucru',
    calendarTitle: 'Calendar',
    selectDay: 'Zi selectată',
    openDatePicker: 'Alege data',
    openTimePicker: 'Alege ora',
    addTask: 'Adaugă sarcină',
    timePlaceholder: 'Ora (HH:mm)',
    taskPlaceholder: 'Sarcină',
    notesPlaceholder: 'Comentariu',
    addTaskButton: 'Adaugă sarcina',
    startTask: 'Start',
    pauseTask: 'Pauză',
    resumeTask: 'Reia',
    startNow: 'Începe acum',
    taskTime: 'Timp sarcină',
    exportCsv: 'Exportă CSV',
    generalTasks: 'Sarcini generale',
    noGeneralTasks: 'Nu există sarcini planificate nefinalizate.',
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
    csvHeader: 'Data,Ora,Sarcină,Comentariu,Status,Timp sarcină',
  },
};

const INITIAL_FORM: NewTask = {
  date: today,
  time: '08:30',
  task: '',
  notes: '',
};

const parseDateTime = (entry: Pick<TaskEntry, 'date' | 'time'>) => new Date(`${entry.date}T${entry.time}:00`);
const getTaskTrackedMs = (entry: TaskEntry, nowMs: number) => {
  const live = entry.trackingStartedAt ? Math.max(0, nowMs - new Date(entry.trackingStartedAt).getTime()) : 0;
  return Math.max(0, entry.trackedMs + live);
};
const WHEEL_ITEM_HEIGHT = 40;
const CLICK_SOUND_URI =
  'data:audio/wav;base64,UklGRjwAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YRgAAAAAABkAMgBKAGAAdABmAE8AOQAjAAwAAAAA8f/k/9f/yv/N/9f/6f8AAP//';

function TabGlyph({
  type,
  active,
  color,
}: {
  type: 'calendar' | 'report' | 'settings';
  active: boolean;
  color: string;
}) {
  if (type === 'calendar') {
    return (
      <View style={[styles.glyphCalendar, { borderColor: color }]}>
        <View style={[styles.glyphCalendarTop, { backgroundColor: color }]} />
        <View style={styles.glyphCalendarDotsRow}>
          <View style={[styles.glyphDot, { backgroundColor: color }]} />
          <View style={[styles.glyphDot, { backgroundColor: color }]} />
          <View style={[styles.glyphDot, { backgroundColor: color }]} />
        </View>
      </View>
    );
  }

  if (type === 'report') {
    return (
      <View style={styles.glyphReportRow}>
        <View style={[styles.glyphBar, { height: 8, backgroundColor: color, opacity: active ? 1 : 0.7 }]} />
        <View style={[styles.glyphBar, { height: 12, backgroundColor: color, opacity: active ? 1 : 0.8 }]} />
        <View style={[styles.glyphBar, { height: 16, backgroundColor: color }]} />
      </View>
    );
  }

  return (
    <View style={[styles.glyphGear, { borderColor: color }]}>
      <View style={[styles.glyphGearCore, { backgroundColor: color }]} />
    </View>
  );
}

export default function App() {
  const [entries, setEntries] = useState<TaskEntry[]>([]);
  const [form, setForm] = useState<NewTask>(INITIAL_FORM);
  const [language, setLanguage] = useState<Language>('uk');
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [screen, setScreen] = useState<Screen>('calendar');
  const [displayedMonth, setDisplayedMonth] = useState<Date>(new Date(today));
  const [showGeneralTasks, setShowGeneralTasks] = useState(false);
  const [nowTick, setNowTick] = useState<number>(Date.now());
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const t = translations[language];
  const isDark = themeMode === 'dark';
  const isColorful = themeMode === 'colorful';
  const c = {
    appBg: isColorful ? '#0B1220' : isDark ? '#0f172a' : '#eef3ff',
    cardBg: isColorful ? '#111827' : isDark ? '#111b2f' : '#ffffff',
    cardBorder: isColorful ? '#1F2937' : isDark ? '#27344d' : '#e4e9f7',
    textPrimary: isColorful ? '#E5E7EB' : isDark ? '#e5ecff' : '#1b1b1f',
    textSecondary: isColorful ? '#9CA3AF' : isDark ? '#aab9da' : '#606781',
    tabBg: isColorful ? '#111827' : isDark ? '#0f1a2d' : '#ffffff',
    tabBorder: isColorful ? '#1F2937' : isDark ? '#243249' : '#dbe3f7',
    tabActiveBg: isColorful ? '#1E1B4B' : isDark ? '#1d335c' : '#eaf1ff',
    tabIcon: isColorful ? '#6366F1' : isDark ? '#9fb1d8' : '#6c7389',
    tabIconActive: isColorful ? '#4F46E5' : '#3b82f6',
  };
  const [workDay, setWorkDay] = useState<WorkDayState>({ date: today, breaks: [], accumulatedWorkMs: 0 });
  const lastDateIndexRef = useRef<number>(-1);
  const lastTimeIndexRef = useRef<number>(-1);
  const lastDateHapticIndexRef = useRef<number>(-1);
  const lastTimeHapticIndexRef = useRef<number>(-1);
  const dateWheelRef = useRef<FlatList<string> | null>(null);
  const timeWheelRef = useRef<FlatList<string> | null>(null);
  const quoteOpacity = useRef(new Animated.Value(1)).current;
  const quoteTranslateY = useRef(new Animated.Value(0)).current;
  const clickSoundRef = useRef<Audio.Sound | null>(null);
  const webAudioContextRef = useRef<AudioContext | null>(null);
  const webAudioUnlockedRef = useRef(false);
  const setWebMetaTag = (name: string, content: string) => {
    if (Platform.OS !== 'web') {
      return;
    }
    const existing = document.querySelector(`meta[name="${name}"]`);
    if (existing) {
      existing.setAttribute('content', content);
      return;
    }
    const tag = document.createElement('meta');
    tag.setAttribute('name', name);
    tag.setAttribute('content', content);
    document.head.appendChild(tag);
  };
  const setWebAppleMetaTag = (name: string, content: string) => {
    if (Platform.OS !== 'web') {
      return;
    }
    const existing = document.querySelector(`meta[name="${name}"]`);
    if (existing) {
      existing.setAttribute('content', content);
      return;
    }
    const tag = document.createElement('meta');
    tag.setAttribute('name', name);
    tag.setAttribute('content', content);
    document.head.appendChild(tag);
  };
  const triggerTapHaptic = () => {
    if (!hapticsEnabled) {
      return;
    }
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(12);
      }
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  const triggerTapSound = () => {
    if (!soundEnabled) {
      return;
    }
    if (Platform.OS === 'web') {
      const Ctx = globalThis.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) {
        return;
      }
      if (!webAudioContextRef.current) {
        webAudioContextRef.current = new Ctx();
      }
      const ctx = webAudioContextRef.current;
      if (!ctx) {
        return;
      }
      if (ctx.state === 'suspended') {
        void ctx.resume();
      }
      const now = ctx.currentTime;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(880, now);
      oscillator.frequency.exponentialRampToValueAtTime(660, now + 0.025);
      gain.gain.setValueAtTime(webAudioUnlockedRef.current ? 0.07 : 0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.045);
      webAudioUnlockedRef.current = true;
      return;
    }
    const sound = clickSoundRef.current;
    if (!sound) {
      return;
    }
    void sound.replayAsync().catch(() => {});
  };
  const withInteractionFeedback = (action: () => void | Promise<void>) => () => {
    triggerTapSound();
    triggerTapHaptic();
    void action();
  };

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }
    setWebMetaTag('theme-color', c.appBg);
    setWebMetaTag('viewport', 'width=device-width, initial-scale=1');
    setWebAppleMetaTag('apple-mobile-web-app-capable', 'yes');
    setWebAppleMetaTag('apple-mobile-web-app-status-bar-style', 'black');
    document.documentElement.style.backgroundColor = c.appBg;
    document.body.style.backgroundColor = c.appBg;
    document.body.style.margin = '0';
  }, [c.appBg]);

  useEffect(() => {
    let mounted = true;
    if (Platform.OS === 'web') {
      return () => {
        if (webAudioContextRef.current) {
          void webAudioContextRef.current.close();
          webAudioContextRef.current = null;
        }
      };
    }
    const prepareClickSound = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: CLICK_SOUND_URI },
          { volume: 0.2, shouldPlay: false },
        );
        if (mounted) {
          clickSoundRef.current = sound;
        } else {
          await sound.unloadAsync();
        }
      } catch {
        clickSoundRef.current = null;
      }
    };
    void prepareClickSound();
    return () => {
      mounted = false;
      if (clickSoundRef.current) {
        void clickSoundRef.current.unloadAsync();
        clickSoundRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const motivationalQuotes = useMemo(() => {
    if (language === 'uk') {
      return [
        'Почни з малого. Геніальність підключиться в процесі.',
        'План простий: робимо. Ниття після релізу.',
        'Твій дедлайн нервує більше, ніж ти. І це добре.',
        'Ще один таск — і ти офіційно машина.',
        'Якщо складно, зроби перший крок. Драма скасується.',
        'Список задач великий? Приємно. Є де бути героєм.',
        'Не відкладай на завтра те, що вже дивиться на тебе сьогодні.',
        'Фокус на максимум: телефон мовчить, вкладки плачуть.',
        'Ти не прокрастинуєш. Ти просто “розганяєшся”.',
        'Кава випита — значить продуктивність юридично активна.',
        'Тут або ти закриєш задачу, або задача закриє тебе. Обирай.',
        'Повільно — це теж швидко, якщо без істерики.',
        'Зроби одну задачу зараз. Бо “потім” — це країна без віз.',
        'Якщо відкрив TikTok на 2 хвилини — передавай вітання загубленому вечору.',
        'Ти не втомився. Ти просто ще не розігнався на другій каві.',
        'Дисципліна — це коли робиш, навіть коли “не хочу” кричить капсом.',
        'Сьогодні ти головний герой. Прокрастинація — масовка без реплік.',
        'Ще один крок, і хаос офіційно переходить у статус “план”.',
        'Не чекай мотивацію. Вона любить запізнюватись без попередження.',
        'Якщо задача страшна — подрібни її. Монстрів теж ріжуть на кроки.',
        'Поки інші думають, ти вже закрив пів списку. Красиво.',
        'Ніхто не прийде рятувати дедлайн. Ти і є спецназ.',
        'Ідеально не треба. Треба зроблено. І бажано сьогодні.',
        'Пауза — це ок. Зникнути на 3 години в мемах — вже квест.',
        'Починай криво. Рівно стане в процесі.',
        'Твоя продуктивність сьогодні виглядає підозріло легально.',
        'Спочатку важко, потім звичка, потім ти лякаєш людей ефективністю.',
        'Задача сама себе не закриє. Вона максимум подивиться на тебе осудливо.',
        'Поки ти читаєш цю фразу, можна було закрити маленький таск. Натяк.',
        'Стабільність — це коли ти працюєш, а не домовляєшся з совістю.',
        'Роби тихо. Нехай звіт кричить за тебе.',
        'Якщо хочеш магію — ось вона: 25 хвилин фокусу без цирку.',
      ];
    }
    if (language === 'ro') {
      return [
        'Incepe mic. Momentum-ul vine dupa.',
        'Planul zilei: faci treaba, apoi faci pe filozoful.',
        'Deadline-ul e stresat. Tu ramai calm.',
        'Inca un task si pari deja periculos de eficient.',
        'Daca e greu, fa primul pas. Restul vine.',
        'Lista e lunga? Perfect. Ai unde straluci.',
        'Nu amana pe maine ce te priveste urat azi.',
        'Focus maxim: notificari mute, rezultate tari.',
        'Nu procrastinezi. Doar “pregatesti terenul”.',
        'Cafeaua e gata. Productivitatea are unda verde.',
        'Ori inchizi taskul, ori te inchide el pe tine.',
        'Incet e ok, daca mergi constant.',
        'Fa un task acum. “Mai tarziu” e doar marketing bun.',
        'Daca intri pe reels 2 minute, ne vedem dupa o ora.',
        'Nu esti blocat. Esti doar la incalzire.',
        'Disciplina e cand lucrezi chiar si fara chef.',
        'Azi esti personajul principal. Scuzele sunt figuranti.',
        'Un pas mic bate orice plan perfect amanat.',
        'Nu astepta motivatie. Vine rar si fara notificare.',
        'Task mare? Taie-l in bucati. Functioneaza mereu.',
        'In timp ce altii analizeaza, tu deja bifezi.',
        'Deadline-ul nu are erou. Tu esti eroul.',
        'Perfect nu trebuie. Livrat trebuie.',
        'Pauza e normala. Disparitia in meme nu e.',
        'Incepe imperfect. Ajustezi pe parcurs.',
        'Productivitatea ta de azi pare suspect de eleganta.',
        'La inceput doare, apoi devine rutina, apoi devii periculos.',
        'Taskul nu se inchide singur. Doar te judeca in liniste.',
        'Cat citesti fraza asta, puteai termina ceva mic.',
        'Constanta bate entuziasmul care tine 15 minute.',
        'Lucreaza in liniste. Raportul vorbeste pentru tine.',
        'Magie reala: 25 minute focus fara drama.',
      ];
    }
    return [
      'Start small. Look unstoppable later.',
      'One task now beats ten excuses later.',
      'Deadline is loud? Be louder with results.',
      'Another task down. Main character energy unlocked.',
      'If it feels messy, do the first clear step.',
      'Your to-do list is long. Your excuses should be short.',
      'Close random tabs. Open actual progress.',
      'You call it pressure. I call it plot development.',
      'Not procrastinating, just... cinematic buildup.',
      'Coffee loaded. Productivity legally binding.',
      'Either you finish the task, or it haunts your evening.',
      'Slow is fine. Stuck is not.',
      'Do one task now. Future-you will stop roasting you.',
      'If you open reels for 2 minutes, see you next quarter.',
      'You are not behind. You are warming up.',
      'Discipline is doing it before your mood agrees.',
      'Today you are the main character. Excuses are extras.',
      'Tiny progress beats perfect plans in draft mode.',
      'Don’t wait for motivation. It ghosts people.',
      'Big task? Slice it. Conquer one chunk.',
      'While others overthink, you quietly ship.',
      'No one is coming to save your deadline. It is you.',
      'Perfect is optional. Done is required.',
      'Breaks are healthy. Doomscroll marathons are not.',
      'Start messy. Polish later.',
      'Your productivity today is suspiciously attractive.',
      'First it is hard, then routine, then people call you a machine.',
      'Tasks do not complete themselves. They just stare aggressively.',
      'By the time you read this, you could close a mini-task.',
      'Consistency beats motivation on bad days.',
      'Work in silence. Let the report flex.',
      'Real magic: 25 focused minutes, zero circus.',
    ];
  }, [language]);

  useEffect(() => {
    const quoteTimer = setInterval(() => {
      Animated.parallel([
        Animated.timing(quoteOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(quoteTranslateY, {
          toValue: -6,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setQuoteIndex((prev) => (prev + 1) % motivationalQuotes.length);
        quoteTranslateY.setValue(6);
        Animated.parallel([
          Animated.timing(quoteOpacity, {
            toValue: 1,
            duration: 220,
            useNativeDriver: true,
          }),
          Animated.timing(quoteTranslateY, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, 9000);
    return () => clearInterval(quoteTimer);
  }, [motivationalQuotes.length, quoteOpacity, quoteTranslateY]);

  useEffect(() => {
    const load = async () => {
      try {
        const [raw, savedLanguage, rawWorkDay, savedTheme, savedSound, savedHaptics] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(LANGUAGE_KEY),
          AsyncStorage.getItem(WORKDAY_KEY),
          AsyncStorage.getItem(THEME_KEY),
          AsyncStorage.getItem(SOUND_KEY),
          AsyncStorage.getItem(HAPTICS_KEY),
        ]);
        if (raw) {
          const parsed: TaskEntry[] = JSON.parse(raw);
          const migrated = parsed.map((item) => ({
            id: item.id,
            date: item.date,
            time: item.time ?? '09:00',
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
        if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'colorful') {
          setThemeMode(savedTheme);
        }
        if (savedSound === '0' || savedSound === '1') {
          setSoundEnabled(savedSound === '1');
        }
        if (savedHaptics === '0' || savedHaptics === '1') {
          setHapticsEnabled(savedHaptics === '1');
        }
        if (rawWorkDay) {
          const parsedWorkDay: WorkDayState = JSON.parse(rawWorkDay);
          setWorkDay({
            date: parsedWorkDay.date ?? today,
            startedAt: parsedWorkDay.startedAt,
            endedAt: parsedWorkDay.endedAt,
            breaks: Array.isArray(parsedWorkDay.breaks) ? parsedWorkDay.breaks : [],
            accumulatedWorkMs:
              typeof parsedWorkDay.accumulatedWorkMs === 'number' ? parsedWorkDay.accumulatedWorkMs : 0,
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
      AsyncStorage.setItem(THEME_KEY, themeMode),
      AsyncStorage.setItem(SOUND_KEY, soundEnabled ? '1' : '0'),
      AsyncStorage.setItem(HAPTICS_KEY, hapticsEnabled ? '1' : '0'),
    ]).catch(() => {
      Alert.alert(t.error, t.saveError);
    });
  }, [entries, hapticsEnabled, language, loading, soundEnabled, t.error, t.saveError, themeMode, workDay]);

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
  const nextTask = useMemo(() => {
    const now = new Date(nowTick);
    return entries
      .filter((item) => !item.completed && parseDateTime(item) > now)
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
      cells.push({ date: formatLocalDate(d), day: d.getDate(), inMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d += 1) {
      const date = formatLocalDate(new Date(base.getFullYear(), base.getMonth(), d));
      cells.push({ date, day: d, inMonth: true });
    }
    while (cells.length % 7 !== 0) {
      const last = new Date(cells[cells.length - 1].date);
      last.setDate(last.getDate() + 1);
      cells.push({ date: formatLocalDate(last), day: last.getDate(), inMonth: false });
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

  const dateOptions = useMemo(() => {
    const base = new Date();
    const list: string[] = [];
    for (let i = -30; i <= 180; i += 1) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      list.push(formatLocalDate(d));
    }
    return list;
  }, []);
  const timeOptions = useMemo(() => {
    const list: string[] = [];
    for (let h = 0; h < 24; h += 1) {
      for (let m = 0; m < 60; m += 15) {
        list.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      }
    }
    return list;
  }, []);

  const selectedDateIndex = Math.max(0, dateOptions.indexOf(form.date));
  const selectedTimeIndex = Math.max(0, timeOptions.indexOf(form.time));

  const formatReadableDate = (value: string) => {
    const date = new Date(`${value}T00:00:00`);
    return date.toLocaleDateString(language === 'uk' ? 'uk-UA' : language === 'ro' ? 'ro-RO' : 'en-US', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const updateField = (field: keyof NewTask, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const selectDate = async (value: string, withHaptic = true) => {
    setForm((prev) => ({ ...prev, date: value }));
    const selected = new Date(`${value}T00:00:00`);
    setDisplayedMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
    if (withHaptic && hapticsEnabled) {
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
          navigator.vibrate(8);
        }
      } else {
        await Haptics.selectionAsync();
      }
    }
  };

  const selectTime = async (value: string, withHaptic = true) => {
    setForm((prev) => ({ ...prev, time: value }));
    if (withHaptic && hapticsEnabled) {
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
          navigator.vibrate(8);
        }
      } else {
        await Haptics.selectionAsync();
      }
    }
  };

  useEffect(() => {
    lastDateIndexRef.current = selectedDateIndex;
    lastDateHapticIndexRef.current = selectedDateIndex;
  }, [selectedDateIndex]);

  useEffect(() => {
    lastTimeIndexRef.current = selectedTimeIndex;
    lastTimeHapticIndexRef.current = selectedTimeIndex;
  }, [selectedTimeIndex]);

  const getWheelIndex = (offsetY: number, length: number) => {
    const index = Math.round(offsetY / WHEEL_ITEM_HEIGHT);
    return Math.max(0, Math.min(length - 1, index));
  };

  const handleDateWheelScroll = (offsetY: number) => {
    const index = getWheelIndex(offsetY, dateOptions.length);
    if (index === lastDateIndexRef.current) {
      return;
    }
    lastDateIndexRef.current = index;
    lastDateHapticIndexRef.current = index;
    const target = dateOptions[index];
    if (target) {
      void selectDate(target, true);
    }
  };

  const handleTimeWheelScroll = (offsetY: number) => {
    const index = getWheelIndex(offsetY, timeOptions.length);
    if (index === lastTimeIndexRef.current) {
      return;
    }
    lastTimeIndexRef.current = index;
    lastTimeHapticIndexRef.current = index;
    const target = timeOptions[index];
    if (target) {
      void selectTime(target, true);
    }
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

  const startTaskNow = (id: string) => {
    const now = new Date();
    const nowIso = now.toISOString();
    const nowMs = now.getTime();
    const newDate = formatLocalDate(now);
    const newTime = formatLocalTime(now);

    setEntries((prev) =>
      prev.map((item) => {
        // Pause any running task before switching.
        if (item.id !== id && item.trackingStartedAt) {
          return {
            ...item,
            trackedMs: item.trackedMs + Math.max(0, nowMs - new Date(item.trackingStartedAt).getTime()),
            trackingStartedAt: undefined,
          };
        }
        if (item.id === id) {
          return {
            ...item,
            date: newDate,
            time: newTime,
            completed: false,
            trackingStartedAt: nowIso,
          };
        }
        return item;
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
  const generalPendingTasks = [...entries]
    .filter((item) => !item.completed)
    .sort((a, b) => {
      const byDate = a.date.localeCompare(b.date);
      return byDate !== 0 ? byDate : a.time.localeCompare(b.time);
    });
  const allTasks = [...entries].sort((a, b) => {
    const byDate = b.date.localeCompare(a.date);
    return byDate !== 0 ? byDate : b.time.localeCompare(a.time);
  });
  const hasTasksOnDay = (date: string) => entries.some((item) => item.date === date);

  const activeBreak = workDay.breaks.find((item) => !item.endedAt);
  const isDayRunning = Boolean(workDay.startedAt) && !workDay.endedAt;
  const dayStatusLabel = workDay.endedAt
    ? language === 'uk'
      ? 'Завершено'
      : language === 'ro'
        ? 'Finalizat'
        : 'Finished'
    : !workDay.startedAt
    ? language === 'uk'
      ? 'Не розпочато'
      : language === 'ro'
        ? 'Neinceput'
        : 'Not started'
    : activeBreak
        ? t.pauseDay
        : language === 'uk'
          ? 'В роботі'
          : language === 'ro'
            ? 'Activ'
            : 'Running';

  const formatDuration = (ms: number) => {
    const safeMs = Math.max(0, ms);
    const totalMinutes = Math.floor(safeMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  useEffect(() => {
    const currentDate = formatLocalDate(new Date(nowTick));
    if (workDay.date === currentDate) {
      return;
    }
    setWorkDay({
      date: currentDate,
      startedAt: undefined,
      endedAt: undefined,
      breaks: [],
      accumulatedWorkMs: 0,
    });
  }, [nowTick, workDay.date]);

  const startDay = () => {
    const now = new Date();
    const currentDate = formatLocalDate(now);
    const nowIso = now.toISOString();
    setWorkDay((prev) => {
      if (prev.date === currentDate) {
        return {
          ...prev,
          startedAt: nowIso,
          endedAt: undefined,
        };
      }
      return {
        date: currentDate,
        startedAt: nowIso,
        endedAt: undefined,
        breaks: [],
        accumulatedWorkMs: 0,
      };
    });
  };

  const endDay = () => {
    if (!workDay.startedAt) {
      return;
    }
    const nowIso = new Date().toISOString();
    const nowMs = new Date(nowIso).getTime();
    setWorkDay((prev) => {
      const sessionWorkMs = prev.startedAt ? Math.max(0, nowMs - new Date(prev.startedAt).getTime()) : 0;
      return {
        ...prev,
        startedAt: undefined,
        endedAt: nowIso,
        accumulatedWorkMs: prev.accumulatedWorkMs + sessionWorkMs,
        breaks: prev.breaks.map((item) => (item.endedAt ? item : { ...item, endedAt: nowIso })),
      };
    });
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

  const startPause = () => {
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
    const sessionMs = workDay.startedAt ? Math.max(0, nowTick - new Date(workDay.startedAt).getTime()) : 0;
    const workMs = Math.max(0, workDay.accumulatedWorkMs + sessionMs);
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

  const renderCalendar = () => (
    <>
      <View style={[styles.quoteCard, { backgroundColor: c.cardBg, borderColor: c.cardBorder }]}>
        <Animated.Text
          style={[
            styles.quoteText,
            { color: c.textPrimary, opacity: quoteOpacity, transform: [{ translateY: quoteTranslateY }] },
          ]}
        >
          {motivationalQuotes[quoteIndex]}
        </Animated.Text>
      </View>

      <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.cardBorder }]}>
        <View style={styles.workdayHeaderRow}>
          <Text style={[styles.cardTitle, { color: c.textPrimary }]}>{t.workDay}</Text>
          <View
            style={[
              styles.statusBadge,
              !workDay.startedAt
                ? styles.statusIdle
                : workDay.endedAt
                  ? styles.statusEnded
                  : activeBreak
                    ? styles.statusPaused
                    : styles.statusRunning,
            ]}
          >
            <Text style={styles.statusBadgeText}>{dayStatusLabel}</Text>
          </View>
        </View>
        {!workDay.startedAt && !workDay.endedAt && <Text style={styles.emptyText}>{t.dayNotStarted}</Text>}
        {!!workDay.endedAt && <Text style={styles.emptyText}>{t.dayFinished}</Text>}
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
          <Pressable style={styles.primaryButton} onPress={withInteractionFeedback(startDay)}>
            <Text style={styles.buttonText}>{t.startDay}</Text>
          </Pressable>
        )}
        {isDayRunning && (
          <>
            <View style={styles.dayControlRow}>
              <Pressable
                style={[styles.dayControlButton, styles.pauseButton]}
                onPress={withInteractionFeedback(activeBreak ? resumeDay : startPause)}
              >
                <Text style={styles.dayControlButtonText}>{activeBreak ? t.resumeDay : t.pauseDay}</Text>
              </Pressable>
              <Pressable style={[styles.dayControlButton, styles.endDayButton]} onPress={withInteractionFeedback(endDay)}>
                <Text style={styles.dayControlButtonText}>{t.endDay}</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.cardBorder }]}>
        <Text style={[styles.cardTitle, { color: c.textPrimary }]}>{t.currentTask}</Text>
        {currentTask ? (
          <>
            <Text style={styles.entryTask}>{currentTask.date} {currentTask.time}</Text>
            <Text style={styles.entryNotes}>{currentTask.task}</Text>
            {!!currentTask.notes && <Text style={styles.entryNotes}>{currentTask.notes}</Text>}
            <Text style={styles.entryNotes}>{t.taskTime}: {formatDuration(getTaskTrackedMs(currentTask, nowTick))}</Text>
            <View style={styles.taskActionRow}>
              <Pressable onPress={withInteractionFeedback(() => (currentTask.trackingStartedAt ? pauseTaskTimer(currentTask.id) : startTaskTimer(currentTask.id)))}>
                <Text style={styles.markDoneText}>
                  {currentTask.trackingStartedAt ? t.pauseTask : currentTask.trackedMs > 0 ? t.resumeTask : t.startTask}
                </Text>
              </Pressable>
              <Pressable onPress={withInteractionFeedback(() => markDone(currentTask.id))}>
                <Text style={styles.markDoneText}>{t.complete}</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <Text style={styles.emptyText}>{t.noCurrentTask}</Text>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.cardBorder }]}>
        <Text style={[styles.cardTitle, { color: c.textPrimary }]}>{t.nextTask}</Text>
        {nextTask ? (
          <>
            <Text style={styles.entryTask}>{nextTask.date} {nextTask.time}</Text>
            <Text style={styles.entryNotes}>{nextTask.task}</Text>
            <Pressable style={styles.primaryButton} onPress={withInteractionFeedback(() => startTaskNow(nextTask.id))}>
              <Text style={styles.buttonText}>{t.startNow}</Text>
            </Pressable>
          </>
        ) : (
          <Text style={styles.emptyText}>{t.noNextTask}</Text>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.cardBorder }]}>
        <View style={styles.monthHeaderRow}>
          <Pressable
            style={styles.monthNavButton}
            onPress={withInteractionFeedback(() => setDisplayedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)))}
          >
            <Text style={styles.monthNavText}>{'<'}</Text>
          </Pressable>
          <Text style={[styles.cardTitle, { color: c.textPrimary }]}>{monthLabel}</Text>
          <Pressable
            style={styles.monthNavButton}
            onPress={withInteractionFeedback(() => setDisplayedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)))}
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
                onPress={() => {
                  triggerTapSound();
                  triggerTapHaptic();
                  void selectDate(cell.date, false);
                }}
                style={[styles.dayCell, !cell.inMonth && styles.dayCellMuted]}
              >
                <View style={[styles.dayCellInner, selected && styles.dayCellSelected]}>
                  <Text style={[styles.dayCellText, !cell.inMonth && styles.dayCellTextMuted, selected && styles.dayCellTextSelected]}>
                    {cell.day}
                  </Text>
                  {hasTasksOnDay(cell.date) && <View style={styles.dayDot} />}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.cardBorder }]}>
        <Text style={[styles.cardTitle, { color: c.textPrimary }]}>{t.addTask}</Text>
        <Text style={styles.menuSubtitle}>{t.selectDay}: {formatReadableDate(form.date)}</Text>
        <View style={styles.pickerRow}>
          <View style={[styles.dateWheelContainer, styles.halfWheel]}>
            <FlatList
              ref={dateWheelRef}
              data={dateOptions}
              keyExtractor={(item) => item}
              initialScrollIndex={selectedDateIndex}
              getItemLayout={(_, index) => ({ length: WHEEL_ITEM_HEIGHT, offset: WHEEL_ITEM_HEIGHT * index, index })}
              showsVerticalScrollIndicator={false}
              snapToInterval={WHEEL_ITEM_HEIGHT}
              snapToAlignment="start"
              decelerationRate={Platform.OS === 'ios' ? 0.992 : 'fast'}
              bounces={false}
              contentContainerStyle={styles.wheelContent}
              scrollEventThrottle={16}
              onScroll={(event) => handleDateWheelScroll(event.nativeEvent.contentOffset.y)}
              onScrollToIndexFailed={(info) => {
                dateWheelRef.current?.scrollToOffset({
                  offset: info.index * WHEEL_ITEM_HEIGHT,
                  animated: false,
                });
              }}
              renderItem={({ item }) => {
                const selected = item === form.date;
                return (
                  <Pressable
                    style={[styles.dateWheelItem, selected && styles.dateWheelItemSelected]}
                    onPress={() => {
                      triggerTapSound();
                      triggerTapHaptic();
                      void selectDate(item, false);
                      const idx = dateOptions.indexOf(item);
                      if (idx >= 0) {
                        dateWheelRef.current?.scrollToIndex({ index: idx, animated: true });
                      }
                    }}
                  >
                    <Text style={[styles.dateWheelText, selected && styles.dateWheelTextSelected]}>
                      {formatReadableDate(item)}
                    </Text>
                  </Pressable>
                );
              }}
            />
            <View pointerEvents="none" style={styles.wheelCenterBand} />
          </View>
          <View style={[styles.timeWheelContainer, styles.halfWheel]}>
            <FlatList
              ref={timeWheelRef}
              data={timeOptions}
              keyExtractor={(item) => item}
              initialScrollIndex={selectedTimeIndex}
              getItemLayout={(_, index) => ({ length: WHEEL_ITEM_HEIGHT, offset: WHEEL_ITEM_HEIGHT * index, index })}
              showsVerticalScrollIndicator={false}
              snapToInterval={WHEEL_ITEM_HEIGHT}
              snapToAlignment="start"
              decelerationRate={Platform.OS === 'ios' ? 0.992 : 'fast'}
              bounces={false}
              contentContainerStyle={styles.wheelContent}
              scrollEventThrottle={16}
              onScroll={(event) => handleTimeWheelScroll(event.nativeEvent.contentOffset.y)}
              onScrollToIndexFailed={(info) => {
                timeWheelRef.current?.scrollToOffset({
                  offset: info.index * WHEEL_ITEM_HEIGHT,
                  animated: false,
                });
              }}
              renderItem={({ item }) => {
                const selected = item === form.time;
                return (
                  <Pressable
                    style={[styles.timeWheelItem, selected && styles.timeWheelItemSelected]}
                    onPress={() => {
                      triggerTapSound();
                      triggerTapHaptic();
                      void selectTime(item, false);
                      const idx = timeOptions.indexOf(item);
                      if (idx >= 0) {
                        timeWheelRef.current?.scrollToIndex({ index: idx, animated: true });
                      }
                    }}
                  >
                    <Text style={[styles.timeWheelText, selected && styles.timeWheelTextSelected]}>{item}</Text>
                  </Pressable>
                );
              }}
            />
            <View pointerEvents="none" style={styles.wheelCenterBand} />
          </View>
        </View>
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
        <Pressable style={styles.primaryButton} onPress={withInteractionFeedback(addTask)}>
          <Text style={styles.buttonText}>{t.addTaskButton}</Text>
        </Pressable>
      </View>

      <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.cardBorder }]}>
        <Text style={[styles.cardTitle, { color: c.textPrimary }]}>{t.tasksForDay} {form.date}</Text>
        <FlatList
          data={tasksForDay}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          ListEmptyComponent={<Text style={styles.emptyText}>{t.noTasksForDay}</Text>}
          renderItem={({ item }) => (
            <View style={styles.entryCard}>
              <View style={styles.entryHeader}>
                <Text style={styles.entryTask}>{item.time}</Text>
                <Text style={[styles.entryHours, item.completed && styles.completedText]}>
                  {item.completed ? t.completed : t.pending}
                </Text>
              </View>
              <Text style={styles.entryTask}>{item.task}</Text>
              {!!item.notes && <Text style={styles.entryNotes}>{item.notes}</Text>}
              <Text style={styles.entryNotes}>{t.taskTime}: {formatDuration(getTaskTrackedMs(item, nowTick))}</Text>
              <View style={styles.taskActionRow}>
                <Pressable onPress={withInteractionFeedback(() => (item.trackingStartedAt ? pauseTaskTimer(item.id) : startTaskTimer(item.id)))}>
                  <Text style={styles.markDoneText}>
                    {item.trackingStartedAt ? t.pauseTask : item.trackedMs > 0 ? t.resumeTask : t.startTask}
                  </Text>
                </Pressable>
                <Pressable onPress={withInteractionFeedback(() => toggleDone(item.id))}>
                  <Text style={styles.markDoneText}>{item.completed ? t.pending : t.complete}</Text>
                </Pressable>
                <Pressable onPress={withInteractionFeedback(() => removeTask(item.id))}>
                  <Text style={styles.deleteText}>{t.delete}</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      </View>

      <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.cardBorder }]}>
        <Pressable style={styles.secondaryButton} onPress={withInteractionFeedback(() => setShowGeneralTasks((prev) => !prev))}>
          <Text style={styles.secondaryButtonText}>{t.generalTasks}</Text>
        </Pressable>
        {showGeneralTasks && (
          <FlatList
            data={generalPendingTasks}
            keyExtractor={(item) => `general-${item.id}`}
            scrollEnabled={false}
            style={styles.generalList}
            ListEmptyComponent={<Text style={styles.emptyText}>{t.noGeneralTasks}</Text>}
            renderItem={({ item }) => (
              <View style={styles.entryCard}>
                <Text style={styles.entryTask}>{item.date} {item.time}</Text>
                <Text style={styles.entryNotes}>{item.task}</Text>
              </View>
            )}
          />
        )}
      </View>
    </>
  );

  const renderReport = () => (
    <>
      <View style={[styles.quoteCard, { backgroundColor: c.cardBg, borderColor: c.cardBorder }]}>
        <Animated.Text
          style={[
            styles.quoteText,
            { color: c.textPrimary, opacity: quoteOpacity, transform: [{ translateY: quoteTranslateY }] },
          ]}
        >
          {motivationalQuotes[quoteIndex]}
        </Animated.Text>
      </View>

      <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.cardBorder }]}>
        <Text style={[styles.cardTitle, { color: c.textPrimary }]}>{t.workDay}</Text>
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

      <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.cardBorder }]}>
        <Text style={[styles.cardTitle, { color: c.textPrimary }]}>{t.menuReport}</Text>
        <Pressable style={styles.secondaryButton} onPress={withInteractionFeedback(exportCsv)}>
          <Text style={styles.secondaryButtonText}>{t.exportCsv}</Text>
        </Pressable>
      </View>

      <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.cardBorder }]}>
        <Text style={[styles.cardTitle, { color: c.textPrimary }]}>{t.topTasks}</Text>
        <FlatList
          data={topTasks}
          keyExtractor={(item) => `top-${item.id}`}
          scrollEnabled={false}
          ListEmptyComponent={<Text style={styles.emptyText}>{t.noTasksForDay}</Text>}
          renderItem={({ item, index }) => (
            <View style={styles.entryCard}>
              <Text style={styles.entryTask}>{index + 1}. {item.task}</Text>
              <Text style={styles.entryNotes}>
                {t.taskTime}: {formatDuration(getTaskTrackedMs(item, nowTick))} (
                {dayStats.netMs > 0 ? Math.round((getTaskTrackedMs(item, nowTick) / dayStats.netMs) * 100) : 0}%)
              </Text>
            </View>
          )}
        />
      </View>

      <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.cardBorder }]}>
        <Text style={[styles.cardTitle, { color: c.textPrimary }]}>{t.allTasks}</Text>
        <FlatList
          data={allTasks}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          ListEmptyComponent={<Text style={styles.emptyText}>{t.noTasksForDay}</Text>}
          renderItem={({ item }) => (
            <View style={styles.entryCard}>
              <Text style={styles.entryTask}>{item.date} {item.time}</Text>
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
      <View style={[styles.quoteCard, { backgroundColor: c.cardBg, borderColor: c.cardBorder }]}>
        <Animated.Text
          style={[
            styles.quoteText,
            { color: c.textPrimary, opacity: quoteOpacity, transform: [{ translateY: quoteTranslateY }] },
          ]}
        >
          {motivationalQuotes[quoteIndex]}
        </Animated.Text>
      </View>
      <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.cardBorder }]}>
        <Text style={[styles.cardTitle, { color: c.textPrimary }]}>{t.language}</Text>
        <View style={styles.languageButtons}>
          {(['uk', 'en', 'ro'] as Language[]).map((lang) => (
            <Pressable
              key={lang}
              onPress={withInteractionFeedback(() => setLanguage(lang))}
              style={[styles.languageButton, language === lang && styles.languageButtonActive]}
            >
              <Text style={[styles.languageButtonText, language === lang && styles.languageButtonTextActive]}>
                {lang.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.cardBorder }]}>
        <Text style={[styles.cardTitle, { color: c.textPrimary }]}>{t.theme}</Text>
        <View style={styles.languageButtons}>
          {(['light', 'dark', 'colorful'] as ThemeMode[]).map((mode) => (
            <Pressable
              key={mode}
              onPress={withInteractionFeedback(() => setThemeMode(mode))}
              style={[styles.languageButton, themeMode === mode && styles.languageButtonActive]}
            >
              <Text style={[styles.languageButtonText, themeMode === mode && styles.languageButtonTextActive]}>
                {mode === 'light' ? t.themeLight : mode === 'dark' ? t.themeDark : t.themeColorful}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.cardBorder }]}>
        <Text style={[styles.cardTitle, { color: c.textPrimary }]}>{t.sound}</Text>
        <View style={styles.languageButtons}>
          <Pressable
            onPress={withInteractionFeedback(() => setSoundEnabled(true))}
            style={[styles.languageButton, soundEnabled && styles.languageButtonActive]}
          >
            <Text style={[styles.languageButtonText, soundEnabled && styles.languageButtonTextActive]}>
              {t.on}
            </Text>
          </Pressable>
          <Pressable
            onPress={withInteractionFeedback(() => setSoundEnabled(false))}
            style={[styles.languageButton, !soundEnabled && styles.languageButtonActive]}
          >
            <Text style={[styles.languageButtonText, !soundEnabled && styles.languageButtonTextActive]}>
              {t.off}
            </Text>
          </Pressable>
        </View>
      </View>
      <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.cardBorder }]}>
        <Text style={[styles.cardTitle, { color: c.textPrimary }]}>{t.haptics}</Text>
        <View style={styles.languageButtons}>
          <Pressable
            onPress={withInteractionFeedback(() => setHapticsEnabled(true))}
            style={[styles.languageButton, hapticsEnabled && styles.languageButtonActive]}
          >
            <Text style={[styles.languageButtonText, hapticsEnabled && styles.languageButtonTextActive]}>
              {t.on}
            </Text>
          </Pressable>
          <Pressable
            onPress={withInteractionFeedback(() => setHapticsEnabled(false))}
            style={[styles.languageButton, !hapticsEnabled && styles.languageButtonActive]}
          >
            <Text style={[styles.languageButtonText, !hapticsEnabled && styles.languageButtonTextActive]}>
              {t.off}
            </Text>
          </Pressable>
        </View>
      </View>
    </>
  );

  const renderTabBar = () => {
    const tabs: Array<{ key: Screen; label: string; iconType: 'calendar' | 'report' | 'settings' }> = [
      { key: 'calendar', label: t.menuCalendar, iconType: 'calendar' },
      { key: 'report', label: t.menuReport, iconType: 'report' },
      { key: 'settings', label: t.menuSettings, iconType: 'settings' },
    ];
    return (
      <View style={styles.tabBarWrap}>
        <View style={[styles.tabBar, { backgroundColor: c.tabBg, borderColor: c.tabBorder }]}>
          {tabs.map((tab) => {
            const active = screen === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={withInteractionFeedback(() => setScreen(tab.key))}
                style={[styles.tabItem, active && styles.tabItemActive, active && { backgroundColor: c.tabActiveBg }]}
              >
                <View style={[styles.tabIconWrap, active && styles.tabIconWrapActive]}>
                  <TabGlyph type={tab.iconType} active={active} color={active ? c.tabIconActive : c.tabIcon} />
                </View>
                <Text style={[styles.tabLabel, active && styles.tabLabelActive, { color: active ? c.tabIconActive : c.tabIcon }]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: c.appBg }]}>
      <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', default: undefined })} style={[styles.safeArea, { backgroundColor: c.appBg }]}>
        <StatusBar
          style={isDark || isColorful ? 'light' : 'dark'}
          translucent
          backgroundColor="transparent"
        />
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {screen === 'calendar' && renderCalendar()}
          {screen === 'report' && renderReport()}
          {screen === 'settings' && renderSettings()}
        </ScrollView>
        {renderTabBar()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#eef3ff',
  },
  scrollContainer: {
    padding: 16,
    paddingTop: Platform.OS === 'web' ? 0 : 16,
    paddingBottom: 92,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1b1b1f',
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 12,
    color: '#606781',
    fontSize: 14,
  },
  quoteCard: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  quoteText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
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
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e4e9f7',
    shadowColor: '#18233f',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    color: '#15161a',
  },
  workdayHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusIdle: {
    backgroundColor: '#edf2f7',
  },
  statusRunning: {
    backgroundColor: '#22C55E',
  },
  statusPaused: {
    backgroundColor: '#F59E0B',
  },
  statusEnded: {
    backgroundColor: '#EF4444',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0B1220',
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
  dateWheelContainer: {
    marginTop: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#dbe3f5',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#f9fbff',
    height: 200,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  halfWheel: {
    flex: 1,
    marginTop: 0,
    marginBottom: 0,
  },
  wheelContent: {
    paddingVertical: WHEEL_ITEM_HEIGHT * 2,
  },
  wheelCenterBand: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: WHEEL_ITEM_HEIGHT * 2,
    height: WHEEL_ITEM_HEIGHT,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#b8c8ef',
    backgroundColor: 'rgba(232, 240, 255, 0.45)',
  },
  dateWheelItem: {
    height: WHEEL_ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  dateWheelItemSelected: {
    backgroundColor: '#ecf3ff',
  },
  dateWheelText: {
    color: '#36415f',
    fontSize: 13,
    fontWeight: '600',
  },
  dateWheelTextSelected: {
    color: '#1e40af',
    fontWeight: '700',
  },
  timeWheelContainer: {
    marginTop: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#dbe3f5',
    borderRadius: 10,
    backgroundColor: '#f9fbff',
    overflow: 'hidden',
    height: 200,
  },
  timeWheelItem: {
    height: WHEEL_ITEM_HEIGHT,
    borderRadius: 9,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  timeWheelItemSelected: {
    backgroundColor: '#ecf3ff',
  },
  timeWheelText: {
    color: '#36415f',
    fontSize: 13,
    fontWeight: '600',
  },
  timeWheelTextSelected: {
    color: '#1e40af',
    fontWeight: '700',
  },
  generalList: {
    marginTop: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  dayControlRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  dayControlButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  pauseButton: {
    backgroundColor: '#1d4ed8',
  },
  endDayButton: {
    backgroundColor: '#dc2626',
  },
  dayControlButtonText: {
    color: '#ffffff',
    fontWeight: '700',
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
    marginHorizontal: -2,
  },
  dayCell: {
    width: '14.2857%',
    minHeight: 42,
    paddingHorizontal: 2,
    paddingVertical: 3,
  },
  dayCellInner: {
    flex: 1,
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
  tabBarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe3f7',
    borderRadius: 0,
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 6,
    shadowColor: '#1a2b55',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: -1 },
    elevation: 3,
  },
  tabItem: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabItemActive: {
    backgroundColor: '#eaf1ff',
  },
  tabIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrapActive: {
    backgroundColor: '#dbe8ff',
  },
  glyphCalendar: {
    width: 18,
    height: 18,
    borderWidth: 1.6,
    borderRadius: 4,
    overflow: 'hidden',
  },
  glyphCalendarTop: {
    height: 4,
    width: '100%',
  },
  glyphCalendarDotsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 2,
  },
  glyphDot: {
    width: 2.5,
    height: 2.5,
    borderRadius: 2,
  },
  glyphReportRow: {
    width: 18,
    height: 18,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 1,
    paddingBottom: 1,
  },
  glyphBar: {
    width: 4,
    borderRadius: 2,
  },
  glyphGear: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphGearCore: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tabLabel: {
    marginTop: 4,
    color: '#6c7389',
    fontSize: 11,
    fontWeight: '700',
  },
  tabLabelActive: {
    color: '#1d4ed8',
  },
});
