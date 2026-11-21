/**
 * Localized picker text and the locale namespace this bundle owns.
 *
 * The Plugin Manager metadata lives in `locale/*.json`; this table is the
 * runtime copy the slot's locale seat resolves. Every dictionary holds the same
 * key set, so a missing translation is a compile error rather than an English
 * fallback surfacing at render time.
 */
import type {} from '@deepseek-ai/dsh-client-ui-slots'

/** Locale registration namespace of this bundle. */
export const NS = 'dsh-workspace-welcome-switcher'

/** Runtime dictionary keys; keep all eight dictionaries in step. */
export type LabelKey =
  | 'defaultName'
  | 'search.placeholder'
  | 'search.label'
  | 'search.clear'
  | 'recent'
  | 'others'
  | 'all'
  | 'results'
  | 'expandCount'
  | 'expandResults'
  | 'add'
  | 'adding'
  | 'addHint'
  | 'empty.title'
  | 'empty.body'
  | 'empty.noWorkspacesTitle'
  | 'empty.noWorkspacesBody'
  | 'empty.noAddBody'
  | 'error.title'
  | 'error.body'
  | 'addFailed'
  | 'dismiss'
  | 'dialog.title'
  | 'dialog.subtitle'
  | 'dialog.hint'
  | 'sorted'
  | 'time.now'
  | 'time.minutes'
  | 'time.hours'
  | 'time.yesterday'
  | 'time.days'
  | 'time.weeks'
  | 'time.months'
  | 'time.years'
  | 'list.label'
  | 'error.stale'
  | 'back'
  | 'loading'
  | 'close'
  | 'count.one'
  | 'count.other'
  | 'countResults'
  | 'sessions.one'
  | 'sessions.other'

/** One locale's complete dictionary. */
export type LabelDict = Record<LabelKey, string>

/** Locale seat this bundle's dictionary resolves through. */
export type TranslateSeat = (key: LabelKey, params?: Record<string, unknown>) => string

const en: LabelDict = {
  "defaultName": "Default workspace",
  "search.placeholder": "Search workspaces",
  "search.label": "Search workspaces",
  "search.clear": "Clear search",
  "recent": "Recently used",
  "others": "Other workspaces",
  "all": "All workspaces",
  "results": "Results",
  "expandCount": "All {n}",
  "expandResults": "All {n} results",
  "add": "Add workspace",
  "adding": "Adding…",
  "addHint": "Pick a folder on this machine",
  "empty.title": "No matching workspaces",
  "empty.body": "Try another name or path, or add a new workspace.",
  "empty.noWorkspacesTitle": "No workspaces yet",
  "empty.noWorkspacesBody": "Add a folder to start a new session in it.",
  "empty.noAddBody": "No workspace is available to choose here.",
  "error.title": "Could not load workspaces",
  "error.body": "The workspace list is unavailable. Reconnect, then reopen the picker.",
  "addFailed": "Could not add workspace",
  "dismiss": "Dismiss",
  "dialog.title": "Choose a workspace",
  "dialog.subtitle": "The new session will start in this folder.",
  "dialog.hint": "↑↓ to navigate · ↵ to open · Esc to go back",
  "sorted": "Sorted by recent use",
  "time.now": "Just now",
  "time.minutes": "{n} min ago",
  "time.hours": "{n} hr ago",
  "time.yesterday": "Yesterday",
  "time.days": "{n} days ago",
  "time.weeks": "{n} wk ago",
  "time.months": "{n} mo ago",
  "time.years": "{n} yr ago",
  "list.label": "Workspaces",
  "error.stale": "The workspace list may be out of date.",
  "back": "Back",
  "loading": "Loading workspaces…",
  "close": "Close",
  "count.one": "1 workspace",
  "count.other": "{n} workspaces",
  "countResults": "{n} results",
  "sessions.one": "1 session",
  "sessions.other": "{n} sessions"
}

const zh: LabelDict = {
  "defaultName": "默认工作区",
  "search.placeholder": "搜索工作区",
  "search.label": "搜索工作区",
  "search.clear": "清除搜索",
  "recent": "最近使用",
  "others": "其他工作区",
  "all": "全部工作区",
  "results": "搜索结果",
  "expandCount": "全部 {n} 个",
  "expandResults": "全部 {n} 个结果",
  "add": "添加工作区",
  "adding": "正在添加…",
  "addHint": "选择一个本机目录",
  "empty.title": "没有匹配的工作区",
  "empty.body": "换个名称或路径试试，也可以添加新工作区。",
  "empty.noWorkspacesTitle": "还没有工作区",
  "empty.noWorkspacesBody": "添加一个目录，让新会话从那里开始。",
  "empty.noAddBody": "这里没有可选择的工作区。",
  "error.title": "无法加载工作区",
  "error.body": "工作区列表暂时不可用，重新连接后再打开选择器。",
  "addFailed": "无法添加工作区",
  "dismiss": "关闭提示",
  "dialog.title": "选择工作区",
  "dialog.subtitle": "新会话将在所选目录中开始。",
  "dialog.hint": "↑↓ 选择 · ↵ 打开 · Esc 返回",
  "sorted": "按最近使用排序",
  "time.now": "刚刚",
  "time.minutes": "{n} 分钟前",
  "time.hours": "{n} 小时前",
  "time.yesterday": "昨天",
  "time.days": "{n} 天前",
  "time.weeks": "{n} 周前",
  "time.months": "{n} 个月前",
  "time.years": "{n} 年前",
  "list.label": "工作区",
  "error.stale": "工作区列表可能不是最新状态。",
  "back": "返回",
  "loading": "正在加载工作区…",
  "close": "关闭",
  "count.one": "1 个工作区",
  "count.other": "{n} 个工作区",
  "countResults": "{n} 个结果",
  "sessions.one": "1 个会话",
  "sessions.other": "{n} 个会话"
}

const ja: LabelDict = {
  "defaultName": "デフォルトのワークスペース",
  "search.placeholder": "ワークスペースを検索",
  "search.label": "ワークスペースを検索",
  "search.clear": "検索をクリア",
  "recent": "最近使用したもの",
  "others": "その他のワークスペース",
  "all": "すべてのワークスペース",
  "results": "検索結果",
  "expandCount": "すべて {n} 件",
  "expandResults": "全 {n} 件の結果",
  "add": "ワークスペースを追加",
  "adding": "追加しています…",
  "addHint": "このコンピューター上のフォルダーを選択",
  "empty.title": "一致するワークスペースがありません",
  "empty.body": "別の名前やパスを試すか、新しいワークスペースを追加してください。",
  "empty.noWorkspacesTitle": "ワークスペースがまだありません",
  "empty.noWorkspacesBody": "フォルダーを追加すると、そこから新しいセッションを開始できます。",
  "empty.noAddBody": "選択できるワークスペースがありません。",
  "error.title": "ワークスペースを読み込めませんでした",
  "error.body": "ワークスペース一覧を利用できません。再接続してからピッカーを開き直してください。",
  "addFailed": "ワークスペースを追加できませんでした",
  "dismiss": "閉じる",
  "dialog.title": "ワークスペースを選択",
  "dialog.subtitle": "新しいセッションはこのフォルダーで開始されます。",
  "dialog.hint": "↑↓ 移動 · ↵ 開く · Esc 戻る",
  "sorted": "最近の使用順",
  "time.now": "たった今",
  "time.minutes": "{n} 分前",
  "time.hours": "{n} 時間前",
  "time.yesterday": "昨日",
  "time.days": "{n} 日前",
  "time.weeks": "{n} 週間前",
  "time.months": "{n} か月前",
  "time.years": "{n} 年前",
  "list.label": "ワークスペース",
  "error.stale": "ワークスペース一覧が最新でない可能性があります。",
  "back": "戻る",
  "loading": "ワークスペースを読み込んでいます…",
  "close": "閉じる",
  "count.one": "1 個のワークスペース",
  "count.other": "{n} 個のワークスペース",
  "countResults": "{n} 件の結果",
  "sessions.one": "1 件のセッション",
  "sessions.other": "{n} 件のセッション"
}

const de: LabelDict = {
  "defaultName": "Standardarbeitsbereich",
  "search.placeholder": "Arbeitsbereiche durchsuchen",
  "search.label": "Arbeitsbereiche durchsuchen",
  "search.clear": "Suche löschen",
  "recent": "Zuletzt verwendet",
  "others": "Weitere Arbeitsbereiche",
  "all": "Alle Arbeitsbereiche",
  "results": "Ergebnisse",
  "expandCount": "Alle {n}",
  "expandResults": "Alle {n} Ergebnisse",
  "add": "Arbeitsbereich hinzufügen",
  "adding": "Wird hinzugefügt…",
  "addHint": "Einen Ordner auf diesem Rechner auswählen",
  "empty.title": "Keine passenden Arbeitsbereiche",
  "empty.body": "Versuchen Sie einen anderen Namen oder Pfad oder fügen Sie einen Arbeitsbereich hinzu.",
  "empty.noWorkspacesTitle": "Noch keine Arbeitsbereiche",
  "empty.noWorkspacesBody": "Fügen Sie einen Ordner hinzu, in dem eine neue Sitzung startet.",
  "empty.noAddBody": "Hier ist kein Arbeitsbereich zum Auswählen verfügbar.",
  "error.title": "Arbeitsbereiche konnten nicht geladen werden",
  "error.body": "Die Arbeitsbereichsliste ist nicht verfügbar. Stellen Sie die Verbindung wieder her und öffnen Sie den Auswahldialog erneut.",
  "addFailed": "Arbeitsbereich konnte nicht hinzugefügt werden",
  "dismiss": "Schließen",
  "dialog.title": "Arbeitsbereich auswählen",
  "dialog.subtitle": "Die neue Sitzung startet in diesem Ordner.",
  "dialog.hint": "↑↓ Navigieren · ↵ Öffnen · Esc Zurück",
  "sorted": "Nach letzter Verwendung sortiert",
  "time.now": "Gerade eben",
  "time.minutes": "Vor {n} Min.",
  "time.hours": "Vor {n} Std.",
  "time.yesterday": "Gestern",
  "time.days": "Vor {n} Tagen",
  "time.weeks": "Vor {n} Wo.",
  "time.months": "Vor {n} Mon.",
  "time.years": "Vor {n} Jahren",
  "list.label": "Arbeitsbereiche",
  "error.stale": "Die Arbeitsbereichsliste ist möglicherweise nicht aktuell.",
  "back": "Zurück",
  "loading": "Arbeitsbereiche werden geladen…",
  "close": "Schließen",
  "count.one": "1 Arbeitsbereich",
  "count.other": "{n} Arbeitsbereiche",
  "countResults": "{n} Ergebnisse",
  "sessions.one": "1 Sitzung",
  "sessions.other": "{n} Sitzungen"
}

const es: LabelDict = {
  "defaultName": "Espacio de trabajo predeterminado",
  "search.placeholder": "Buscar espacios de trabajo",
  "search.label": "Buscar espacios de trabajo",
  "search.clear": "Borrar búsqueda",
  "recent": "Usados recientemente",
  "others": "Otros espacios de trabajo",
  "all": "Todos los espacios de trabajo",
  "results": "Resultados",
  "expandCount": "Todos ({n})",
  "expandResults": "Los {n} resultados",
  "add": "Añadir espacio de trabajo",
  "adding": "Añadiendo…",
  "addHint": "Elige una carpeta de este equipo",
  "empty.title": "No hay espacios de trabajo coincidentes",
  "empty.body": "Prueba con otro nombre o ruta, o añade un espacio de trabajo.",
  "empty.noWorkspacesTitle": "Aún no hay espacios de trabajo",
  "empty.noWorkspacesBody": "Añade una carpeta donde iniciar una nueva sesión.",
  "empty.noAddBody": "No hay ningún espacio de trabajo disponible para elegir.",
  "error.title": "No se pudieron cargar los espacios de trabajo",
  "error.body": "La lista no está disponible. Vuelve a conectarte y abre el selector de nuevo.",
  "addFailed": "No se pudo añadir el espacio de trabajo",
  "dismiss": "Cerrar",
  "dialog.title": "Elegir un espacio de trabajo",
  "dialog.subtitle": "La nueva sesión se iniciará en esta carpeta.",
  "dialog.hint": "↑↓ navegar · ↵ abrir · Esc volver",
  "sorted": "Ordenado por uso reciente",
  "time.now": "Ahora mismo",
  "time.minutes": "Hace {n} min",
  "time.hours": "Hace {n} h",
  "time.yesterday": "Ayer",
  "time.days": "Hace {n} días",
  "time.weeks": "Hace {n} sem",
  "time.months": "Hace {n} meses",
  "time.years": "Hace {n} años",
  "list.label": "Espacios de trabajo",
  "error.stale": "Puede que la lista de espacios de trabajo no esté actualizada.",
  "back": "Volver",
  "loading": "Cargando espacios de trabajo…",
  "close": "Cerrar",
  "count.one": "1 espacio de trabajo",
  "count.other": "{n} espacios de trabajo",
  "countResults": "{n} resultados",
  "sessions.one": "1 sesión",
  "sessions.other": "{n} sesiones"
}

const fr: LabelDict = {
  "defaultName": "Espace de travail par défaut",
  "search.placeholder": "Rechercher des espaces de travail",
  "search.label": "Rechercher des espaces de travail",
  "search.clear": "Effacer la recherche",
  "recent": "Utilisés récemment",
  "others": "Autres espaces de travail",
  "all": "Tous les espaces de travail",
  "results": "Résultats",
  "expandCount": "Tous ({n})",
  "expandResults": "Les {n} résultats",
  "add": "Ajouter un espace de travail",
  "adding": "Ajout…",
  "addHint": "Choisir un dossier sur cet ordinateur",
  "empty.title": "Aucun espace de travail correspondant",
  "empty.body": "Essayez un autre nom ou chemin, ou ajoutez un espace de travail.",
  "empty.noWorkspacesTitle": "Aucun espace de travail pour l’instant",
  "empty.noWorkspacesBody": "Ajoutez un dossier où démarrer une nouvelle session.",
  "empty.noAddBody": "Aucun espace de travail n’est disponible ici.",
  "error.title": "Impossible de charger les espaces de travail",
  "error.body": "La liste est indisponible. Reconnectez-vous, puis rouvrez le sélecteur.",
  "addFailed": "Impossible d’ajouter l’espace de travail",
  "dismiss": "Fermer",
  "dialog.title": "Choisir un espace de travail",
  "dialog.subtitle": "La nouvelle session démarrera dans ce dossier.",
  "dialog.hint": "↑↓ naviguer · ↵ ouvrir · Esc revenir",
  "sorted": "Triés par utilisation récente",
  "time.now": "À l’instant",
  "time.minutes": "Il y a {n} min",
  "time.hours": "Il y a {n} h",
  "time.yesterday": "Hier",
  "time.days": "Il y a {n} jours",
  "time.weeks": "Il y a {n} sem",
  "time.months": "Il y a {n} mois",
  "time.years": "Il y a {n} ans",
  "list.label": "Espaces de travail",
  "error.stale": "La liste des espaces de travail n’est peut-être pas à jour.",
  "back": "Retour",
  "loading": "Chargement des espaces de travail…",
  "close": "Fermer",
  "count.one": "1 espace de travail",
  "count.other": "{n} espaces de travail",
  "countResults": "{n} résultats",
  "sessions.one": "1 session",
  "sessions.other": "{n} sessions"
}

const pt: LabelDict = {
  "defaultName": "Área de trabalho padrão",
  "search.placeholder": "Pesquisar áreas de trabalho",
  "search.label": "Pesquisar áreas de trabalho",
  "search.clear": "Limpar pesquisa",
  "recent": "Usadas recentemente",
  "others": "Outras áreas de trabalho",
  "all": "Todas as áreas de trabalho",
  "results": "Resultados",
  "expandCount": "Todas ({n})",
  "expandResults": "Todos os {n} resultados",
  "add": "Adicionar área de trabalho",
  "adding": "Adicionando…",
  "addHint": "Escolha uma pasta neste computador",
  "empty.title": "Nenhuma área de trabalho correspondente",
  "empty.body": "Tente outro nome ou caminho, ou adicione uma área de trabalho.",
  "empty.noWorkspacesTitle": "Ainda não há áreas de trabalho",
  "empty.noWorkspacesBody": "Adicione uma pasta para iniciar uma nova sessão nela.",
  "empty.noAddBody": "Nenhuma área de trabalho disponível para escolher aqui.",
  "error.title": "Não foi possível carregar as áreas de trabalho",
  "error.body": "A lista está indisponível. Reconecte e reabra o seletor.",
  "addFailed": "Não foi possível adicionar a área de trabalho",
  "dismiss": "Fechar",
  "dialog.title": "Escolher uma área de trabalho",
  "dialog.subtitle": "A nova sessão será iniciada nesta pasta.",
  "dialog.hint": "↑↓ navegar · ↵ abrir · Esc voltar",
  "sorted": "Ordenadas pelo uso recente",
  "time.now": "Agora mesmo",
  "time.minutes": "Há {n} min",
  "time.hours": "Há {n} h",
  "time.yesterday": "Ontem",
  "time.days": "Há {n} dias",
  "time.weeks": "Há {n} sem",
  "time.months": "Há {n} meses",
  "time.years": "Há {n} anos",
  "list.label": "Áreas de trabalho",
  "error.stale": "A lista de áreas de trabalho pode estar desatualizada.",
  "back": "Voltar",
  "loading": "Carregando áreas de trabalho…",
  "close": "Fechar",
  "count.one": "1 área de trabalho",
  "count.other": "{n} áreas de trabalho",
  "countResults": "{n} resultados",
  "sessions.one": "1 sessão",
  "sessions.other": "{n} sessões"
}

const ru: LabelDict = {
  "defaultName": "Рабочее пространство по умолчанию",
  "search.placeholder": "Поиск рабочих пространств",
  "search.label": "Поиск рабочих пространств",
  "search.clear": "Очистить поиск",
  "recent": "Недавние",
  "others": "Другие рабочие пространства",
  "all": "Все рабочие пространства",
  "results": "Результаты",
  "expandCount": "Все ({n})",
  "expandResults": "Все результаты ({n})",
  "add": "Добавить рабочее пространство",
  "adding": "Добавление…",
  "addHint": "Выберите папку на этом компьютере",
  "empty.title": "Подходящих рабочих пространств нет",
  "empty.body": "Попробуйте другое название или путь либо добавьте рабочее пространство.",
  "empty.noWorkspacesTitle": "Рабочих пространств пока нет",
  "empty.noWorkspacesBody": "Добавьте папку, в которой начнётся новый сеанс.",
  "empty.noAddBody": "Здесь нет доступных рабочих пространств.",
  "error.title": "Не удалось загрузить рабочие пространства",
  "error.body": "Список недоступен. Переподключитесь и снова откройте выбор.",
  "addFailed": "Не удалось добавить рабочее пространство",
  "dismiss": "Закрыть",
  "dialog.title": "Выбор рабочего пространства",
  "dialog.subtitle": "Новый сеанс начнётся в этой папке.",
  "dialog.hint": "↑↓ выбор · ↵ открыть · Esc назад",
  "sorted": "Сортировка по недавнему использованию",
  "time.now": "Только что",
  "time.minutes": "{n} мин назад",
  "time.hours": "{n} ч назад",
  "time.yesterday": "Вчера",
  "time.days": "{n} дн. назад",
  "time.weeks": "{n} нед. назад",
  "time.months": "{n} мес. назад",
  "time.years": "{n} г. назад",
  "list.label": "Рабочие пространства",
  "error.stale": "Список рабочих пространств может быть устаревшим.",
  "back": "Назад",
  "loading": "Загрузка рабочих пространств…",
  "close": "Закрыть",
  "count.one": "1 рабочее пространство",
  "count.other": "Рабочих пространств: {n}",
  "countResults": "Результатов: {n}",
  "sessions.one": "1 сеанс",
  "sessions.other": "Сеансов: {n}"
}

/** The runtime dictionaries: every locale this bundle ships. */
export const LABELS = { en, zh, ja, de, es, fr, pt, ru } satisfies Record<string, LabelDict>

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Switcher copy on the blank-session hero. */
    'dsh-workspace-welcome-switcher': LabelKey
  }
}
