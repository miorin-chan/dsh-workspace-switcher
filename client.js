/**
 * Browser half of `dsh-workspace-picker`.
 *
 * A more capable performer of the blank-session Workspace chooser. The shipped
 * picker is one flat menu in Host order; this entry shadows it (a single slot,
 * lowest priority renders) with recently-used ordering, a search field, a
 * five-row shortlist, and a focused chooser dialog for users with many
 * Workspaces.
 *
 * Data comes only from the slot's standard shares: `useWorkspaces` for the
 * registry rows and `useSessions` for each member Session's activity time, so
 * "recently used" means the latest activity of the Workspaces' Sessions, not
 * the Workspace row's own last-mutation stamp. Recency is computed at render
 * time and never written back — the durable Workspace order is left alone.
 *
 * Adding a Workspace cannot reuse the shipped directory-flow hole: the hole is
 * declared by the registration this entry shadows, and one slot has exactly one
 * declaring entry. The entry therefore asks the Host's composed chooser through
 * `ctx.uiWorkspace.pickDirectory()` and adopts the path through
 * `ctx.workspaces.create()`, and it offers that action only while the hole is
 * occupied (the same published signal the shipped picker reads).
 *
 * Everything is fail-safe: without the standard hooks or services the entry
 * renders nothing and leaves the hero's own trigger in charge; a failed pick or
 * adoption keeps the chooser open with the Host's message.
 */
window.__ModuleLoader__.load({
  id: 'dsh-workspace-picker',
  factory(require) {
    const React = require('react')
    // The shell's module table exposes `react-dom` as an ES-module namespace
    // whose CommonJS object sits on `default` (the same interop other plugins use).
    const ReactDOMModule = require('react-dom')
    const ReactDOM = ReactDOMModule.default ?? ReactDOMModule
    const {
      useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState,
      useSyncExternalStore,
    } = React
    const h = React.createElement

    const NS = 'dsh-workspace-picker'
    /** Rows in the compact shortlist; the rest live in the expanded dialog. */
    const SHORTLIST = 5

    /** Visible text owned by this module; plugin-meta text lives in locale/*.json. */
    const LABELS = {
      'en': {
            'defaultName': 'Default workspace',
            'search.placeholder': 'Search workspaces',
            'search.label': 'Search workspaces',
            'search.clear': 'Clear search',
            'recent': 'Recently used',
            'others': 'Other workspaces',
            'all': 'All workspaces',
            'results': 'Results',
            'expandCount': 'All {n}',
            'expandResults': 'All {n} results',
            'add': 'Add workspace',
            'adding': 'Adding…',
            'addHint': 'Pick a folder on this machine',
            'empty.title': 'No matching workspaces',
            'empty.body': 'Try another name or path, or add a new workspace.',
            'empty.noWorkspacesTitle': 'No workspaces yet',
            'empty.noWorkspacesBody': 'Add a folder to start a new session in it.',
            'empty.noAddBody': 'No workspace is available to choose here.',
            'error.title': 'Could not load workspaces',
            'error.body': 'The workspace list is unavailable. Reconnect, then reopen the picker.',
            'addFailed': 'Could not add workspace',
            'dismiss': 'Dismiss',
            'dialog.title': 'Choose a workspace',
            'dialog.subtitle': 'The new session will start in this folder.',
            'dialog.hint': '↑↓ to navigate · ↵ to open · Esc to go back',
            'sorted': 'Sorted by recent use',
            'time.now': 'Just now',
            'time.minutes': '{n} min ago',
            'time.hours': '{n} hr ago',
            'time.yesterday': 'Yesterday',
            'time.days': '{n} days ago',
            'time.weeks': '{n} wk ago',
            'time.months': '{n} mo ago',
            'time.years': '{n} yr ago',
            'list.label': 'Workspaces',
            'error.stale': 'The workspace list may be out of date.',
            'back': 'Back',
            'loading': 'Loading workspaces…',
            'close': 'Close',
            'count.one': '1 workspace',
            'count.other': '{n} workspaces',
            'countResults': '{n} results',
            'sessions.one': '1 session',
            'sessions.other': '{n} sessions'
      },
      'zh': {
            'defaultName': '默认工作区',
            'search.placeholder': '搜索工作区',
            'search.label': '搜索工作区',
            'search.clear': '清除搜索',
            'recent': '最近使用',
            'others': '其他工作区',
            'all': '全部工作区',
            'results': '搜索结果',
            'expandCount': '全部 {n} 个',
            'expandResults': '全部 {n} 个结果',
            'add': '添加工作区',
            'adding': '正在添加…',
            'addHint': '选择一个本机目录',
            'empty.title': '没有匹配的工作区',
            'empty.body': '换个名称或路径试试，也可以添加新工作区。',
            'empty.noWorkspacesTitle': '还没有工作区',
            'empty.noWorkspacesBody': '添加一个目录，让新会话从那里开始。',
            'empty.noAddBody': '这里没有可选择的工作区。',
            'error.title': '无法加载工作区',
            'error.body': '工作区列表暂时不可用，重新连接后再打开选择器。',
            'addFailed': '无法添加工作区',
            'dismiss': '关闭提示',
            'dialog.title': '选择工作区',
            'dialog.subtitle': '新会话将在所选目录中开始。',
            'dialog.hint': '↑↓ 选择 · ↵ 打开 · Esc 返回',
            'sorted': '按最近使用排序',
            'time.now': '刚刚',
            'time.minutes': '{n} 分钟前',
            'time.hours': '{n} 小时前',
            'time.yesterday': '昨天',
            'time.days': '{n} 天前',
            'time.weeks': '{n} 周前',
            'time.months': '{n} 个月前',
            'time.years': '{n} 年前',
            'list.label': '工作区',
            'error.stale': '工作区列表可能不是最新状态。',
            'back': '返回',
            'loading': '正在加载工作区…',
            'close': '关闭',
            'count.one': '1 个工作区',
            'count.other': '{n} 个工作区',
            'countResults': '{n} 个结果',
            'sessions.one': '1 个会话',
            'sessions.other': '{n} 个会话'
      },
      'ja': {
            'defaultName': 'デフォルトのワークスペース',
            'search.placeholder': 'ワークスペースを検索',
            'search.label': 'ワークスペースを検索',
            'search.clear': '検索をクリア',
            'recent': '最近使用したもの',
            'others': 'その他のワークスペース',
            'all': 'すべてのワークスペース',
            'results': '検索結果',
            'expandCount': 'すべて {n} 件',
            'expandResults': '全 {n} 件の結果',
            'add': 'ワークスペースを追加',
            'adding': '追加しています…',
            'addHint': 'このコンピューター上のフォルダーを選択',
            'empty.title': '一致するワークスペースがありません',
            'empty.body': '別の名前やパスを試すか、新しいワークスペースを追加してください。',
            'empty.noWorkspacesTitle': 'ワークスペースがまだありません',
            'empty.noWorkspacesBody': 'フォルダーを追加すると、そこから新しいセッションを開始できます。',
            'empty.noAddBody': '選択できるワークスペースがありません。',
            'error.title': 'ワークスペースを読み込めませんでした',
            'error.body': 'ワークスペース一覧を利用できません。再接続してからピッカーを開き直してください。',
            'addFailed': 'ワークスペースを追加できませんでした',
            'dismiss': '閉じる',
            'dialog.title': 'ワークスペースを選択',
            'dialog.subtitle': '新しいセッションはこのフォルダーで開始されます。',
            'dialog.hint': '↑↓ 移動 · ↵ 開く · Esc 戻る',
            'sorted': '最近の使用順',
            'time.now': 'たった今',
            'time.minutes': '{n} 分前',
            'time.hours': '{n} 時間前',
            'time.yesterday': '昨日',
            'time.days': '{n} 日前',
            'time.weeks': '{n} 週間前',
            'time.months': '{n} か月前',
            'time.years': '{n} 年前',
            'list.label': 'ワークスペース',
            'error.stale': 'ワークスペース一覧が最新でない可能性があります。',
            'back': '戻る',
            'loading': 'ワークスペースを読み込んでいます…',
            'close': '閉じる',
            'count.one': '1 個のワークスペース',
            'count.other': '{n} 個のワークスペース',
            'countResults': '{n} 件の結果',
            'sessions.one': '1 件のセッション',
            'sessions.other': '{n} 件のセッション'
      },
      'de': {
            'defaultName': 'Standardarbeitsbereich',
            'search.placeholder': 'Arbeitsbereiche durchsuchen',
            'search.label': 'Arbeitsbereiche durchsuchen',
            'search.clear': 'Suche löschen',
            'recent': 'Zuletzt verwendet',
            'others': 'Weitere Arbeitsbereiche',
            'all': 'Alle Arbeitsbereiche',
            'results': 'Ergebnisse',
            'expandCount': 'Alle {n}',
            'expandResults': 'Alle {n} Ergebnisse',
            'add': 'Arbeitsbereich hinzufügen',
            'adding': 'Wird hinzugefügt…',
            'addHint': 'Einen Ordner auf diesem Rechner auswählen',
            'empty.title': 'Keine passenden Arbeitsbereiche',
            'empty.body': 'Versuchen Sie einen anderen Namen oder Pfad oder fügen Sie einen Arbeitsbereich hinzu.',
            'empty.noWorkspacesTitle': 'Noch keine Arbeitsbereiche',
            'empty.noWorkspacesBody': 'Fügen Sie einen Ordner hinzu, in dem eine neue Sitzung startet.',
            'empty.noAddBody': 'Hier ist kein Arbeitsbereich zum Auswählen verfügbar.',
            'error.title': 'Arbeitsbereiche konnten nicht geladen werden',
            'error.body': 'Die Arbeitsbereichsliste ist nicht verfügbar. Stellen Sie die Verbindung wieder her und öffnen Sie den Auswahldialog erneut.',
            'addFailed': 'Arbeitsbereich konnte nicht hinzugefügt werden',
            'dismiss': 'Schließen',
            'dialog.title': 'Arbeitsbereich auswählen',
            'dialog.subtitle': 'Die neue Sitzung startet in diesem Ordner.',
            'dialog.hint': '↑↓ Navigieren · ↵ Öffnen · Esc Zurück',
            'sorted': 'Nach letzter Verwendung sortiert',
            'time.now': 'Gerade eben',
            'time.minutes': 'Vor {n} Min.',
            'time.hours': 'Vor {n} Std.',
            'time.yesterday': 'Gestern',
            'time.days': 'Vor {n} Tagen',
            'time.weeks': 'Vor {n} Wo.',
            'time.months': 'Vor {n} Mon.',
            'time.years': 'Vor {n} Jahren',
            'list.label': 'Arbeitsbereiche',
            'error.stale': 'Die Arbeitsbereichsliste ist möglicherweise nicht aktuell.',
            'back': 'Zurück',
            'loading': 'Arbeitsbereiche werden geladen…',
            'close': 'Schließen',
            'count.one': '1 Arbeitsbereich',
            'count.other': '{n} Arbeitsbereiche',
            'countResults': '{n} Ergebnisse',
            'sessions.one': '1 Sitzung',
            'sessions.other': '{n} Sitzungen'
      },
      'es': {
            'defaultName': 'Espacio de trabajo predeterminado',
            'search.placeholder': 'Buscar espacios de trabajo',
            'search.label': 'Buscar espacios de trabajo',
            'search.clear': 'Borrar búsqueda',
            'recent': 'Usados recientemente',
            'others': 'Otros espacios de trabajo',
            'all': 'Todos los espacios de trabajo',
            'results': 'Resultados',
            'expandCount': 'Todos ({n})',
            'expandResults': 'Los {n} resultados',
            'add': 'Añadir espacio de trabajo',
            'adding': 'Añadiendo…',
            'addHint': 'Elige una carpeta de este equipo',
            'empty.title': 'No hay espacios de trabajo coincidentes',
            'empty.body': 'Prueba con otro nombre o ruta, o añade un espacio de trabajo.',
            'empty.noWorkspacesTitle': 'Aún no hay espacios de trabajo',
            'empty.noWorkspacesBody': 'Añade una carpeta donde iniciar una nueva sesión.',
            'empty.noAddBody': 'No hay ningún espacio de trabajo disponible para elegir.',
            'error.title': 'No se pudieron cargar los espacios de trabajo',
            'error.body': 'La lista no está disponible. Vuelve a conectarte y abre el selector de nuevo.',
            'addFailed': 'No se pudo añadir el espacio de trabajo',
            'dismiss': 'Cerrar',
            'dialog.title': 'Elegir un espacio de trabajo',
            'dialog.subtitle': 'La nueva sesión se iniciará en esta carpeta.',
            'dialog.hint': '↑↓ navegar · ↵ abrir · Esc volver',
            'sorted': 'Ordenado por uso reciente',
            'time.now': 'Ahora mismo',
            'time.minutes': 'Hace {n} min',
            'time.hours': 'Hace {n} h',
            'time.yesterday': 'Ayer',
            'time.days': 'Hace {n} días',
            'time.weeks': 'Hace {n} sem',
            'time.months': 'Hace {n} meses',
            'time.years': 'Hace {n} años',
            'list.label': 'Espacios de trabajo',
            'error.stale': 'Puede que la lista de espacios de trabajo no esté actualizada.',
            'back': 'Volver',
            'loading': 'Cargando espacios de trabajo…',
            'close': 'Cerrar',
            'count.one': '1 espacio de trabajo',
            'count.other': '{n} espacios de trabajo',
            'countResults': '{n} resultados',
            'sessions.one': '1 sesión',
            'sessions.other': '{n} sesiones'
      },
      'fr': {
            'defaultName': 'Espace de travail par défaut',
            'search.placeholder': 'Rechercher des espaces de travail',
            'search.label': 'Rechercher des espaces de travail',
            'search.clear': 'Effacer la recherche',
            'recent': 'Utilisés récemment',
            'others': 'Autres espaces de travail',
            'all': 'Tous les espaces de travail',
            'results': 'Résultats',
            'expandCount': 'Tous ({n})',
            'expandResults': 'Les {n} résultats',
            'add': 'Ajouter un espace de travail',
            'adding': 'Ajout…',
            'addHint': 'Choisir un dossier sur cet ordinateur',
            'empty.title': 'Aucun espace de travail correspondant',
            'empty.body': 'Essayez un autre nom ou chemin, ou ajoutez un espace de travail.',
            'empty.noWorkspacesTitle': 'Aucun espace de travail pour l’instant',
            'empty.noWorkspacesBody': 'Ajoutez un dossier où démarrer une nouvelle session.',
            'empty.noAddBody': 'Aucun espace de travail n’est disponible ici.',
            'error.title': 'Impossible de charger les espaces de travail',
            'error.body': 'La liste est indisponible. Reconnectez-vous, puis rouvrez le sélecteur.',
            'addFailed': 'Impossible d’ajouter l’espace de travail',
            'dismiss': 'Fermer',
            'dialog.title': 'Choisir un espace de travail',
            'dialog.subtitle': 'La nouvelle session démarrera dans ce dossier.',
            'dialog.hint': '↑↓ naviguer · ↵ ouvrir · Esc revenir',
            'sorted': 'Triés par utilisation récente',
            'time.now': 'À l’instant',
            'time.minutes': 'Il y a {n} min',
            'time.hours': 'Il y a {n} h',
            'time.yesterday': 'Hier',
            'time.days': 'Il y a {n} jours',
            'time.weeks': 'Il y a {n} sem',
            'time.months': 'Il y a {n} mois',
            'time.years': 'Il y a {n} ans',
            'list.label': 'Espaces de travail',
            'error.stale': 'La liste des espaces de travail n’est peut-être pas à jour.',
            'back': 'Retour',
            'loading': 'Chargement des espaces de travail…',
            'close': 'Fermer',
            'count.one': '1 espace de travail',
            'count.other': '{n} espaces de travail',
            'countResults': '{n} résultats',
            'sessions.one': '1 session',
            'sessions.other': '{n} sessions'
      },
      'pt': {
            'defaultName': 'Área de trabalho padrão',
            'search.placeholder': 'Pesquisar áreas de trabalho',
            'search.label': 'Pesquisar áreas de trabalho',
            'search.clear': 'Limpar pesquisa',
            'recent': 'Usadas recentemente',
            'others': 'Outras áreas de trabalho',
            'all': 'Todas as áreas de trabalho',
            'results': 'Resultados',
            'expandCount': 'Todas ({n})',
            'expandResults': 'Todos os {n} resultados',
            'add': 'Adicionar área de trabalho',
            'adding': 'Adicionando…',
            'addHint': 'Escolha uma pasta neste computador',
            'empty.title': 'Nenhuma área de trabalho correspondente',
            'empty.body': 'Tente outro nome ou caminho, ou adicione uma área de trabalho.',
            'empty.noWorkspacesTitle': 'Ainda não há áreas de trabalho',
            'empty.noWorkspacesBody': 'Adicione uma pasta para iniciar uma nova sessão nela.',
            'empty.noAddBody': 'Nenhuma área de trabalho disponível para escolher aqui.',
            'error.title': 'Não foi possível carregar as áreas de trabalho',
            'error.body': 'A lista está indisponível. Reconecte e reabra o seletor.',
            'addFailed': 'Não foi possível adicionar a área de trabalho',
            'dismiss': 'Fechar',
            'dialog.title': 'Escolher uma área de trabalho',
            'dialog.subtitle': 'A nova sessão será iniciada nesta pasta.',
            'dialog.hint': '↑↓ navegar · ↵ abrir · Esc voltar',
            'sorted': 'Ordenadas pelo uso recente',
            'time.now': 'Agora mesmo',
            'time.minutes': 'Há {n} min',
            'time.hours': 'Há {n} h',
            'time.yesterday': 'Ontem',
            'time.days': 'Há {n} dias',
            'time.weeks': 'Há {n} sem',
            'time.months': 'Há {n} meses',
            'time.years': 'Há {n} anos',
            'list.label': 'Áreas de trabalho',
            'error.stale': 'A lista de áreas de trabalho pode estar desatualizada.',
            'back': 'Voltar',
            'loading': 'Carregando áreas de trabalho…',
            'close': 'Fechar',
            'count.one': '1 área de trabalho',
            'count.other': '{n} áreas de trabalho',
            'countResults': '{n} resultados',
            'sessions.one': '1 sessão',
            'sessions.other': '{n} sessões'
      },
      'ru': {
            'defaultName': 'Рабочее пространство по умолчанию',
            'search.placeholder': 'Поиск рабочих пространств',
            'search.label': 'Поиск рабочих пространств',
            'search.clear': 'Очистить поиск',
            'recent': 'Недавние',
            'others': 'Другие рабочие пространства',
            'all': 'Все рабочие пространства',
            'results': 'Результаты',
            'expandCount': 'Все ({n})',
            'expandResults': 'Все результаты ({n})',
            'add': 'Добавить рабочее пространство',
            'adding': 'Добавление…',
            'addHint': 'Выберите папку на этом компьютере',
            'empty.title': 'Подходящих рабочих пространств нет',
            'empty.body': 'Попробуйте другое название или путь либо добавьте рабочее пространство.',
            'empty.noWorkspacesTitle': 'Рабочих пространств пока нет',
            'empty.noWorkspacesBody': 'Добавьте папку, в которой начнётся новый сеанс.',
            'empty.noAddBody': 'Здесь нет доступных рабочих пространств.',
            'error.title': 'Не удалось загрузить рабочие пространства',
            'error.body': 'Список недоступен. Переподключитесь и снова откройте выбор.',
            'addFailed': 'Не удалось добавить рабочее пространство',
            'dismiss': 'Закрыть',
            'dialog.title': 'Выбор рабочего пространства',
            'dialog.subtitle': 'Новый сеанс начнётся в этой папке.',
            'dialog.hint': '↑↓ выбор · ↵ открыть · Esc назад',
            'sorted': 'Сортировка по недавнему использованию',
            'time.now': 'Только что',
            'time.minutes': '{n} мин назад',
            'time.hours': '{n} ч назад',
            'time.yesterday': 'Вчера',
            'time.days': '{n} дн. назад',
            'time.weeks': '{n} нед. назад',
            'time.months': '{n} мес. назад',
            'time.years': '{n} г. назад',
            'list.label': 'Рабочие пространства',
            'error.stale': 'Список рабочих пространств может быть устаревшим.',
            'back': 'Назад',
            'loading': 'Загрузка рабочих пространств…',
            'close': 'Закрыть',
            'count.one': '1 рабочее пространство',
            'count.other': 'Рабочих пространств: {n}',
            'countResults': 'Результатов: {n}',
            'sessions.one': '1 сеанс',
            'sessions.other': 'Сеансов: {n}'
      }
}

    /** Component-local stylesheet; the portal carries it, so unmounting removes it. */
    const CSS = `
/* Surface vocabulary borrowed from the host primitives, not restyled to taste:
 * the compact popover is a Menu card (4px padding, translucent menu material,
 * 34px rows with a trailing check) and the expanded chooser is a Modal card
 * (l2 surface, panel radius, hairline rules, 28px buttons). Only theme tokens
 * are referenced, so both themes and future host revisions carry over. */
.wsp-layer { position: fixed; inset: 0; z-index: 1099; }
.wsp-popover {
  position: fixed; z-index: 1100; box-sizing: border-box;
  display: flex; flex-direction: column;
  width: 360px; max-width: calc(100vw - 24px); max-height: min(64vh, 420px);
  padding: 4px;
  border: 0;
  border-radius: var(--dsw-radius-lg);
  background: var(--dsw-specific-menu, var(--dsw-menu-surface-fill, var(--dsw-alias-bg-layer-1)));
  -webkit-backdrop-filter: var(--dsw-menu-backdrop-filter, blur(40px) saturate(150%));
  backdrop-filter: var(--dsw-menu-backdrop-filter, blur(40px) saturate(150%));
  box-shadow: var(--dsw-elevation-prominent, 0 0 0 .5px var(--dsw-alias-border-l1), 0 3px 8px rgba(0, 0, 0, .04), 0 0 20px rgba(0, 0, 0, .05));
  color: var(--dsw-alias-label-primary);
  --dsw-elevation-stroke-color: var(--dsw-alias-border-l1);
  --dsh-scrollbar-thumb: var(--dsw-alias-scrollbar-bg-l2);
  --dsh-scrollbar-thumb-hover: var(--dsw-alias-scrollbar-hover-l2);
  overflow: hidden;
  font-family: var(--dsw-font-family, inherit);
  animation: wsp-fade 150ms ease-out;
}
.wsp-pop-head { flex: none; padding: 0; }
.wsp-pop-body {
  min-height: 0; overflow: auto; overscroll-behavior: contain;
  padding: 0;
}
.wsp-search {
  box-sizing: border-box; position: relative; display: flex; align-items: center; gap: 6px;
  margin: 2px 0 3px; padding: 5px 8px;
  border: 0; border-radius: var(--dsw-radius-md);
  background: transparent;
}
.wsp-search[data-has-value='true'] { padding-right: 34px; }
.wsp-search-icon {
  flex: none; display: inline-flex; align-items: center; justify-content: center;
  width: 14px; height: 14px; color: var(--dsw-alias-label-tertiary);
}
.wsp-search-input {
  flex: 1; min-width: 0; padding: 0; border: 0; outline: 0;
  background: transparent; color: var(--dsw-alias-label-primary);
  font: inherit; font-size: 12px; line-height: normal;
}
.wsp-search-input::placeholder { color: var(--dsw-alias-label-caption); }
.wsp-search-input::-webkit-search-cancel-button { display: none; }
.wsp-search-clear {
  position: absolute; top: 50%; right: 4px; transform: translateY(-50%);
  display: inline-flex; align-items: center; justify-content: center;
  width: 24px; height: 24px; padding: 0; border: 0;
  border-radius: 999px; corner-shape: round;
  background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer;
}
@media (hover: hover) {
  .wsp-search-clear:hover { background: var(--dsw-alias-interactive-bg-hover); }
}
.wsp-search-clear:focus-visible {
  outline: none; background: var(--dsw-alias-interactive-bg-hover);
}
.wsp-section {
  display: flex; align-items: baseline; gap: 6px;
  padding: 6px 8px;
}
.wsp-section-label { font-size: 11px; line-height: 15px; color: var(--dsw-alias-label-tertiary); }
.wsp-section-count { font-size: 11px; line-height: 15px; color: var(--dsw-alias-label-tertiary); }
.wsp-list { display: flex; flex-direction: column; }
.wsp-row {
  box-sizing: border-box;
  display: flex; align-items: center; gap: 6px;
  width: 100%; min-height: 34px; padding: 6px 8px;
  border: 0; border-radius: var(--dsw-radius-md);
  background: transparent; color: var(--dsw-alias-label-primary);
  font: inherit; font-size: 13px; line-height: 20px;
  text-align: left; cursor: pointer;
}
@media (hover: hover) {
  .wsp-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
}
.wsp-row[data-active='true'], .wsp-row:focus-visible {
  background: var(--dsw-alias-interactive-bg-hover); outline: none;
}
.wsp-row[aria-disabled='true'] { opacity: .4; cursor: default; }
.wsp-row-icon {
  flex: none; display: inline-flex; align-items: center; justify-content: center;
  width: 14px; height: 14px; color: var(--dsw-alias-menu-icon);
}
.wsp-row-text { display: flex; flex-direction: column; min-width: 0; flex: 1; }
/* Compact rows keep the Menu's single 34px line: the disambiguating path
 * suffix rides beside the title, which gives way first, instead of adding a
 * second line. It stays quiet at 11/16 so the title keeps priority. */
.wsp-row-line { display: flex; align-items: baseline; gap: 4px; min-width: 0; flex: 1; }
.wsp-row-line .wsp-row-title { flex: 0 1 auto; min-width: 0; }
.wsp-row-suffix {
  flex: none; max-width: 70%;
  font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-tertiary);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.wsp-row-title {
  font-size: 13px; line-height: 20px;
  color: var(--dsw-alias-label-primary);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.wsp-row-path {
  font-size: 11px; line-height: 16px;
  color: var(--dsw-alias-label-tertiary);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.wsp-row-meta {
  flex: none; display: flex; flex-direction: column; align-items: flex-end;
  max-width: 42%;
}
.wsp-row-time { font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-tertiary); white-space: nowrap; }
.wsp-row-count { font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-tertiary); white-space: nowrap; }
.wsp-row-check {
  flex: none; display: inline-flex; align-items: center; justify-content: center;
  width: 14px; height: 14px; color: var(--dsw-alias-label-primary);
}
.wsp-foot {
  flex: none;
  display: flex; align-items: center; justify-content: space-between; gap: 4px;
  margin-top: 3px; padding-top: 3px;
  border-top: .5px solid var(--dsw-alias-border-l2);
}
.wsp-foot-action {
  display: inline-flex; align-items: center; gap: 6px;
  min-height: 34px; padding: 6px 8px;
  border: 0; border-radius: var(--dsw-radius-md);
  background: transparent; color: var(--dsw-alias-label-primary);
  font: inherit; font-size: 13px; line-height: 20px; cursor: pointer;
}
.wsp-foot-action svg { flex: none; color: var(--dsw-alias-menu-icon); }
@media (hover: hover) {
  .wsp-foot-action:hover { background: var(--dsw-alias-interactive-bg-hover); }
}
.wsp-foot-action:focus-visible {
  background: var(--dsw-alias-interactive-bg-hover); outline: none;
}
.wsp-foot-action[aria-disabled='true'] { opacity: .4; cursor: default; }
.wsp-foot-count, .wsp-foot-note {
  padding: 0 8px; font-size: 12px; line-height: 18px;
  color: var(--dsw-alias-label-tertiary);
}
.wsp-empty {
  display: flex; flex-direction: column; gap: 2px;
  padding: 8px 8px 12px;
}
.wsp-empty-title { font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-secondary); }
.wsp-empty-body { font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
.wsp-skeleton { display: flex; flex-direction: column; padding: 2px 0; }
.wsp-skeleton-row {
  display: flex; align-items: center; gap: 8px;
  min-height: 34px; padding: 6px 8px;
}
.wsp-skeleton-icon {
  flex: none; width: 14px; height: 14px; border-radius: var(--dsw-radius-xs);
  background: var(--dsw-alias-bg-skeleton); animation: wsp-pulse 1.4s ease-in-out infinite;
}
.wsp-skeleton-text { display: flex; flex-direction: column; gap: 5px; flex: 1; }
.wsp-skeleton-bar {
  height: 8px; border-radius: var(--dsw-radius-xs);
  background: var(--dsw-alias-bg-skeleton); animation: wsp-pulse 1.4s ease-in-out infinite;
}
.wsp-skeleton-bar-wide { width: 62%; }
.wsp-skeleton-bar-narrow { width: 38%; opacity: .7; }
.wsp-error {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 6px;
  margin: 0 0 3px; padding: 6px 7px;
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-interactive-bg-hover-danger);
  color: var(--dsw-alias-state-error-primary);
  font-size: 11px; line-height: 16px;
}
.wsp-warning {
  margin: 0 0 3px; padding: 6px 7px;
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-module-platform);
  color: var(--dsw-alias-state-warn-label);
  font-size: 11px; line-height: 16px;
}
.wsp-sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
.wsp-error-text { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.wsp-error-label { font-weight: 600; }
.wsp-error-dismiss {
  flex: none; padding: 0; border: 0; background: transparent;
  color: inherit; font: inherit; font-weight: 600; cursor: pointer;
}
.wsp-modal-layer {
  position: fixed; inset: 0; z-index: 1000;
  display: flex; align-items: center; justify-content: center;
  padding: max(24px, var(--dsh-frame-overlay-top, 24px)) 24px;
}
/* The mask starts below the Desktop frame chrome, as the host Modal's does;
 * a titlebar strip left un-dimmed keeps the window draggable around the card. */
.wsp-modal-layer::before {
  content: ''; position: absolute;
  inset: var(--dsh-frame-chrome-top, 0px) 0 0;
  background: var(--dsw-alias-bg-mask-1);
  -webkit-backdrop-filter: var(--dsw-mask-blur, none);
  backdrop-filter: var(--dsw-mask-blur, none);
  animation: wsp-fade var(--ds-transition-duration, .2s) var(--ds-ease-in-out, cubic-bezier(.4, 0, .2, 1));
}
.wsp-dialog {
  box-sizing: border-box; position: relative;
  display: flex; flex-direction: column;
  width: min(680px, 100%);
  height: min(520px, calc(100dvh - 48px));
  border: 0;
  border-radius: var(--dsw-radius-panel);
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
  box-shadow: var(--dsw-elevation-prominent);
  --dsh-scrollbar-thumb: var(--dsw-alias-scrollbar-bg-l2);
  --dsh-scrollbar-thumb-hover: var(--dsw-alias-scrollbar-hover-l2);
  overflow: hidden;
  font-family: var(--dsw-font-family, inherit);
  animation: wsp-fade var(--ds-transition-duration, .2s) var(--ds-ease-in-out, cubic-bezier(.4, 0, .2, 1));
}
.wsp-dialog-head {
  flex: none;
  display: flex; align-items: center; gap: 4px;
  padding: 16px 14px 8px 24px;
}
.wsp-dialog-heading { flex: 1; min-width: 0; }
.wsp-dialog-title {
  margin: 0; font-size: 16px; line-height: 24px; font-weight: 500;
  color: var(--dsw-alias-label-primary);
}
.wsp-dialog-subtitle { margin: 0; font-size: 14px; line-height: 22px; color: var(--dsw-alias-label-secondary); }
.wsp-icon-btn {
  flex: none; display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; padding: 0; border: 0;
  border-radius: var(--dsw-radius-sm);
  background: transparent; color: var(--dsw-alias-label-secondary);
  cursor: pointer;
}
@media (hover: hover) {
  .wsp-icon-btn:hover {
    background: var(--dsw-alias-interactive-bg-hover);
    color: var(--dsw-alias-label-primary);
  }
}
/* Optical overhang: the 14px glyph, not its 28px hitbox, lands on the 24px
 * gutter the rest of the card uses. */
.wsp-back { margin-left: -6px; }
.wsp-dialog-search {
  flex: none;
  padding: 0 24px 12px;
  border-bottom: .5px solid var(--dsw-alias-border-l3);
}
.wsp-dialog-search .wsp-search {
  height: 32px; margin: 0; padding: 0 8px;
  border: .5px solid var(--dsw-alias-border-l4);
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-layer-1);
}
.wsp-dialog-search .wsp-search:focus-within { border-color: var(--dsw-alias-state-business-primary); }
.wsp-dialog-search .wsp-search[data-has-value='true'] { padding-right: 34px; }
.wsp-dialog-search .wsp-search-icon { width: 16px; height: 16px; }
.wsp-dialog-search .wsp-search-input { font-size: 14px; line-height: 22px; }
.wsp-dialog-search .wsp-search-input::placeholder { color: var(--dsw-alias-label-dimmed); }
.wsp-dialog-body {
  flex: 1; min-height: 0; overflow: auto; overscroll-behavior: contain;
  padding: 0 24px 16px;
}
/* Sticky headings take the card fill so scrolling rows never show through;
 * the padding keeps the first one off the search divider. */
.wsp-dialog-body .wsp-section {
  position: sticky; top: 0; z-index: 1;
  padding: 12px 8px 6px; font-weight: 500;
  background: var(--dsw-alias-bg-layer-2);
}
.wsp-dialog-body .wsp-row { gap: 8px; }
.wsp-dialog-body .wsp-row-icon { width: 16px; height: 16px; }
.wsp-dialog-body .wsp-skeleton-icon { width: 16px; height: 16px; }
.wsp-dialog-body .wsp-empty { padding: 12px 8px; }
.wsp-dialog .wsp-error, .wsp-dialog .wsp-warning { margin: 0 24px 12px; }
.wsp-dialog-foot {
  flex: none;
  display: flex; align-items: center; gap: 8px;
  padding: 16px 24px;
  border-top: .5px solid var(--dsw-alias-border-l3);
}
.wsp-dialog-foot .wsp-foot-action {
  box-sizing: border-box; justify-content: center;
  height: 28px; min-height: 0; padding: 0 10px; gap: 4px;
  border: .5px solid transparent;
  border-radius: var(--dsw-radius-sm);
  box-shadow: inset 0 0 0 var(--dsh-hairline-width, .5px) var(--dsw-alias-border-l3);
  color: var(--dsw-alias-label-primary);
  font-size: 12px; line-height: 18px;
}
.wsp-dialog-foot .wsp-foot-action svg { color: inherit; }
.wsp-hints { display: flex; align-items: center; gap: 12px; min-width: 0; margin-left: auto; }
.wsp-hint {
  font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-tertiary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.wsp-dialog-count { flex: none; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); white-space: nowrap; }
.wsp-spinner {
  width: 12px; height: 12px; border-radius: 50%;
  border: 1.5px solid currentColor; border-right-color: transparent;
  animation: wsp-spin .7s linear infinite;
}
@keyframes wsp-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes wsp-pulse { 0%, 100% { opacity: .55; } 50% { opacity: 1; } }
@keyframes wsp-spin { to { transform: rotate(360deg); } }
@media (pointer: coarse) {
  .wsp-search-input { font-size: 16px; }
}
@media (prefers-reduced-motion: reduce) {
  .wsp-popover, .wsp-dialog, .wsp-modal-layer::before, .wsp-skeleton-icon,
  .wsp-skeleton-bar, .wsp-spinner { animation: none; }
}
@media (max-width: 640px) {
  .wsp-popover {
    left: 12px !important; right: 12px !important;
    top: auto !important;
    bottom: max(12px, env(safe-area-inset-bottom)) !important;
    width: auto !important; max-height: min(76vh, 560px) !important;
    animation: wsp-fade 150ms ease-out;
  }
  .wsp-modal-layer { padding: 10px; padding-bottom: max(10px, env(safe-area-inset-bottom)); }
  .wsp-dialog {
    width: 100%; height: 100%;
    border-radius: var(--dsw-radius-lg);
  }
  .wsp-dialog-head { padding: 14px 12px 6px 16px; }
  .wsp-dialog-search { padding: 0 16px 10px; }
  .wsp-dialog-body { padding: 0 16px 10px; }
  .wsp-dialog .wsp-error, .wsp-dialog .wsp-warning { margin: 0 16px 10px; }
  .wsp-dialog-foot { padding: 12px 16px; }
  .wsp-hint { display: none; }
}
`

    // ---------------------------------------------------------------------
    // Pure model helpers (exported through `__test` for the offline tests).
    // ---------------------------------------------------------------------

    /**
     * Normalize either an ISO string or a number timestamp to epoch ms.
     * @param {unknown} value raw timestamp.
     * @returns {number} epoch milliseconds, or 0.
     */
    function toMillis(value) {
      if (typeof value === 'number') {
        if (!Number.isFinite(value)) return 0
        return value < 1e12 ? value * 1000 : value
      }
      if (typeof value === 'string') {
        const parsed = Date.parse(value)
        return Number.isFinite(parsed) ? parsed : 0
      }
      return 0
    }

    /**
     * Leaf segment of a host path.
     * @param {string} path absolute path.
     * @returns {string} leaf name, or the input when it has none.
     */
    function leafName(path) {
      const parts = String(path).split(/[\\/]/).filter(Boolean)
      return parts.length === 0 ? String(path) : parts[parts.length - 1]
    }

    /**
     * Shorten a long host path for the compact row: keep two trailing segments.
     * @param {string} value absolute path.
     * @returns {string} display path.
     */
    function shortenPath(value) {
      const path = typeof value === 'string' ? value : ''
      if (path === '') return ''
      const parts = path.split(/[\\/]/).filter(Boolean)
      if (parts.length <= 3) return path
      const separator = path.includes('\\') ? '\\' : '/'
      return '…' + separator + parts.slice(-2).join(separator)
    }

    /**
     * Build the picker rows from the Workspace registry and Session catalog.
     * Recency is the latest `updatedAt` among the Workspace's member Sessions,
     * falling back to the Workspace's own last-mutation stamp. Rows sort newest
     * first; equal stamps sort by title so the order stays stable.
     * @param {readonly object[]} items Workspace rows.
     * @param {Record<string, object>} byId Session rows by id.
     * @param {string} defaultName localized name of the automatic Workspace.
     * @returns {object[]} display rows.
     */
    function buildRows(items, byId, defaultName) {
      const rows = []
      for (const workspace of items || []) {
        const sessionIds = Array.isArray(workspace.sessionIds) ? workspace.sessionIds : []
        let latest = 0
        let count = 0
        let readActivity = false
        for (const id of sessionIds) {
          const session = byId ? byId[id] : undefined
          if (session === undefined) continue
          readActivity = true
          if (session.origin !== 'subagent') count += 1
          const at = toMillis(session.updatedAt)
          if (at > latest) latest = at
        }
        // A rename bumps the Workspace row's own stamp without using the
        // Workspace; prefer real Session activity and fall back only when the
        // catalog has no summary for any member.
        if (!readActivity || latest === 0) latest = toMillis(workspace.updatedAt)
        const path = typeof workspace.path === 'string' ? workspace.path : ''
        const stored = typeof workspace.title === 'string' ? workspace.title : ''
        rows.push({
          id: workspace.workspaceId,
          title: stored === 'default-workspace'
            ? defaultName
            : stored === '' ? leafName(path) : stored,
          path,
          latest,
          count,
        })
      }
      rows.sort((left, right) => right.latest - left.latest || left.title.localeCompare(right.title))
      // The compact row keeps its second line only when the path tells the
      // reader something the title does not: a renamed Workspace, the
      // localized default, or a title shared with another row.
      const titleCounts = new Map()
      for (const row of rows) titleCounts.set(row.title, (titleCounts.get(row.title) ?? 0) + 1)
      for (const row of rows) {
        row.showPath = row.path !== ''
          && (leafName(row.path).toLowerCase() !== row.title.toLowerCase()
            || (titleCounts.get(row.title) ?? 0) > 1)
      }
      return rows
    }

    /**
     * Filter rows by whitespace-separated terms; every term must appear in the
     * title or the path.
     * @param {readonly object[]} rows display rows.
     * @param {string} query raw search text.
     * @returns {object[]} matching rows in their original order.
     */
    function filterRows(rows, query) {
      const terms = String(query).trim().toLowerCase().split(/\s+/).filter(Boolean)
      if (terms.length === 0) return [...rows]
      return rows.filter((row) => {
        const haystack = (row.title + ' ' + row.path).toLowerCase()
        return terms.every(term => haystack.includes(term))
      })
    }

    /**
     * Localized relative time for an activity stamp.
     * @param {number} at epoch ms, or 0 when unknown.
     * @param {number} now current epoch ms.
     * @param {(key: string, params?: object) => string} t locale seat.
     * @returns {string} relative label.
     */
    function relativeTime(at, now, t) {
      if (!at) return ''
      const diff = now - at
      const minute = 60000
      const hour = 60 * minute
      const day = 24 * hour
      if (diff < minute) return t('time.now')
      if (diff < hour) return t('time.minutes', { n: Math.max(1, Math.floor(diff / minute)) })
      if (diff < day) return t('time.hours', { n: Math.floor(diff / hour) })
      if (diff < 2 * day) return t('time.yesterday')
      if (diff < 7 * day) return t('time.days', { n: Math.floor(diff / day) })
      if (diff < 30 * day) return t('time.weeks', { n: Math.max(1, Math.floor(diff / (7 * day))) })
      if (diff < 365 * day) return t('time.months', { n: Math.max(1, Math.floor(diff / (30 * day))) })
      return t('time.years', { n: Math.max(1, Math.floor(diff / (365 * day))) })
    }

    // ---------------------------------------------------------------------
    // Icons: local stroke glyphs, sized to the host's 16px icon grid.
    // ---------------------------------------------------------------------

    /**
     * Render one stroked SVG glyph.
     * @param {{ paths: string[], size?: number, className?: string }} props glyph geometry.
     * @returns {object} svg element.
     */
    function Glyph({ paths, size = 16, className }) {
      return h('svg', {
        width: size, height: size, viewBox: '0 0 16 16', fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round',
        strokeLinejoin: 'round', 'aria-hidden': 'true', focusable: 'false',
        className,
      }, paths.map((d, index) => h('path', { key: index, d })))
    }

    const FolderGlyph = props => h(Glyph, {
      ...props,
      paths: ['M2.25 4.6c0-.75.6-1.35 1.35-1.35h3.1l1.35 1.5h5.6c.74 0 1.35.6 1.35 1.35v5.7c0 .75-.6 1.35-1.35 1.35H3.6c-.75 0-1.35-.6-1.35-1.35z'],
    })
    const SearchGlyph = props => h(Glyph, {
      ...props,
      paths: ['M7.2 2.75a4.45 4.45 0 1 0 0 8.9 4.45 4.45 0 0 0 0-8.9Z', 'm10.5 10.5 2.75 2.75'],
    })
    const PlusGlyph = props => h(Glyph, { ...props, paths: ['M8 3.25v9.5', 'M3.25 8h9.5'] })
    const CheckGlyph = props => h(Glyph, { ...props, paths: ['M3.1 8.2 6.3 11.4 12.9 4.8'] })
    const CloseGlyph = props => h(Glyph, { ...props, paths: ['M4.2 4.2l7.6 7.6', 'M11.8 4.2l-7.6 7.6'] })
    const ChevronRightGlyph = props => h(Glyph, { ...props, paths: ['M6.4 3.9 10.5 8l-4.1 4.1'] })
    const ChevronLeftGlyph = props => h(Glyph, { ...props, paths: ['M9.6 3.9 5.5 8l4.1 4.1'] })
    const GridGlyph = props => h(Glyph, {
      ...props,
      paths: [
        'M2.6 2.6h4.1v4.1H2.6z', 'M9.3 2.6h4.1v4.1H9.3z',
        'M2.6 9.3h4.1v4.1H2.6z', 'M9.3 9.3h4.1v4.1H9.3z',
      ],
    })

    // ---------------------------------------------------------------------
    // Presentational pieces.
    // ---------------------------------------------------------------------

    /**
     * Search field bound to the caller's query.
     * @param {object} props field props.
     * @returns {object} field element.
     */
    function SearchField({ t, value, onChange, inputRef, listId, activeOptionId }) {
      return h('div', {
        className: 'wsp-search',
        'data-has-value': value === '' ? undefined : 'true',
      },
        h('span', { className: 'wsp-search-icon' }, h(SearchGlyph, { size: 14 })),
        h('input', {
          ref: inputRef,
          className: 'wsp-search-input',
          type: 'search',
          value,
          placeholder: t('search.placeholder'),
          'aria-label': t('search.label'),
          role: 'combobox',
          'aria-autocomplete': 'list',
          'aria-expanded': true,
          'aria-controls': listId,
          'aria-activedescendant': activeOptionId,
          autoComplete: 'off',
          spellCheck: false,
          onChange: event => onChange(event.target.value),
        }),
        value === ''
          ? null
          : h('button', {
            type: 'button',
            className: 'wsp-search-clear',
            'aria-label': t('search.clear'),
            title: t('search.clear'),
            onClick: () => {
              onChange('')
              inputRef.current?.focus()
            },
          }, h(CloseGlyph, { size: 11 })),
      )
    }

    /**
     * One Workspace row.
     * @param {object} props row props.
     * @returns {object} row element.
     */
    function WorkspaceRow({
      row, id, active, selected, now, t, compact, busy, onChoose, onHover,
    }) {
      return h('button', {
        type: 'button',
        role: 'option',
        id,
        tabIndex: -1,
        'aria-disabled': busy === true ? 'true' : undefined,
        'data-wsp-row': 'true',
        'data-active': active ? 'true' : undefined,
        'data-selected': selected ? 'true' : undefined,
        'aria-selected': selected,
        className: 'wsp-row',
        title: row.path,
        onClick: () => onChoose(row),
        onMouseMove: () => onHover(row.id),
      },
        h('span', { className: 'wsp-row-icon' }, h(FolderGlyph, { size: compact ? 14 : 16 })),
        compact
          ? h('span', { className: 'wsp-row-line' },
            h('span', { className: 'wsp-row-title' }, row.title),
            row.showPath ? h('span', { className: 'wsp-row-suffix' }, shortenPath(row.path)) : null,
          )
          : h('span', { className: 'wsp-row-text' },
            h('span', { className: 'wsp-row-title' }, row.title),
            row.path === '' ? null : h('span', { className: 'wsp-row-path' }, row.path),
          ),
        h('span', { className: 'wsp-row-meta' },
          h('span', { className: 'wsp-row-time' }, relativeTime(row.latest, now, t)),
          compact || row.count === 0
            ? null
            : h('span', { className: 'wsp-row-count' },
              t(row.count === 1 ? 'sessions.one' : 'sessions.other', { n: row.count })),
        ),
        h('span', { className: 'wsp-row-check', 'aria-hidden': 'true' },
          selected ? h(CheckGlyph, { size: 14 }) : null),
      )
    }

    /**
     * Section heading inside the list.
     * @param {object} props heading props.
     * @returns {object} heading element.
     */
    function SectionHeader({ label, count }) {
      return h('div', { className: 'wsp-section', role: 'presentation' },
        h('span', { className: 'wsp-section-label' }, label),
        typeof count === 'number' && count > 0 ? h('span', { className: 'wsp-section-count' }, count) : null,
      )
    }

    /**
     * Empty-list state, in the host's quiet status-text voice.
     * @param {object} props state props.
     * @returns {object} state element.
     */
    function EmptyState({ title, body }) {
      return h('div', { className: 'wsp-empty', role: 'status' },
        h('span', { className: 'wsp-empty-title' }, title),
        h('span', { className: 'wsp-empty-body' }, body),
      )
    }

    /**
     * Loading skeleton.
     * @param {object} props skeleton props.
     * @returns {object} skeleton element.
     */
    function Skeleton({ rows = 4 }) {
      return h('div', { className: 'wsp-skeleton', 'aria-hidden': 'true' },
        Array.from({ length: rows }, (_, index) => h('div', { key: index, className: 'wsp-skeleton-row' },
          h('span', { className: 'wsp-skeleton-icon' }),
          h('span', { className: 'wsp-skeleton-text' },
            h('span', { className: 'wsp-skeleton-bar wsp-skeleton-bar-wide' }),
            h('span', { className: 'wsp-skeleton-bar wsp-skeleton-bar-narrow' }),
          ),
        )),
      )
    }

    /**
     * Inline adoption error with a dismiss action.
     * @param {object} props banner props.
     * @returns {object} banner element.
     */
    function ErrorBanner({ label, message, dismiss, onDismiss }) {
      return h('div', { className: 'wsp-error', role: 'alert' },
        h('span', { className: 'wsp-error-text' },
          h('span', { className: 'wsp-error-label' }, label + ': '),
          message,
        ),
        h('button', {
          type: 'button', className: 'wsp-error-dismiss', onClick: onDismiss,
        }, dismiss),
      )
    }

    // ---------------------------------------------------------------------
    // The picker.
    // ---------------------------------------------------------------------

    /**
     * The shadowing hero picker: compact popover plus the expanded chooser.
     * @param {object} props owner share, standard hooks, injected actions, locale seat.
     * @returns {object|null} portal content.
     */
    function WorkspacePicker(props) {
      const {
        open, anchorRef, selectedId, onPick, onClose, t,
        useWorkspaces, useSessions, useDirectoryFlow, pickDirectory, createWorkspace, localHost,
      } = props

      const useWorkspaceRows = typeof useWorkspaces === 'function'
        ? useWorkspaces
        : selector => useEmptySnapshot(EMPTY_WORKSPACES, selector)
      const useSessionRows = typeof useSessions === 'function'
        ? useSessions
        : selector => useEmptySnapshot(EMPTY_SESSIONS, selector)
      const useFlow = typeof useDirectoryFlow === 'function'
        ? useDirectoryFlow
        : selector => useEmptySnapshot(false, selector)

      const snapshot = useWorkspaceRows(state => state)
      const sessionState = useSessionRows(state => state)
      const flowAvailable = useFlow(value => value === true)

      const [query, setQuery] = useState('')
      const [expanded, setExpanded] = useState(false)
      const [activeId, setActiveId] = useState(null)
      const [placement, setPlacement] = useState(null)
      const [busy, setBusy] = useState(false)
      const [error, setError] = useState(null)
      const [now, setNow] = useState(() => Date.now())

      const inputRef = useRef(null)
      const panelRef = useRef(null)
      const wasOpen = useRef(false)
      const closedRef = useRef(false)
      const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
      const listId = 'wsp-list-' + uid
      const titleId = 'wsp-title-' + uid

      const rows = useMemo(
        () => buildRows(snapshot.items, sessionState.byId, t('defaultName')),
        [snapshot.items, sessionState.byId, t],
      )
      const filtered = useMemo(() => filterRows(rows, query), [rows, query])
      const compactRows = filtered.slice(0, SHORTLIST)
      const visibleRows = expanded ? filtered : compactRows
      // No row is highlighted until the user points at one, moves the keyboard
      // highlight, or types a query. Opening the picker and pressing Enter must
      // not silently select the most recent Workspace.
      const activeRow = visibleRows.find(row => row.id === activeId)
        ?? (query.trim() === '' ? undefined : visibleRows[0])
      const activeIndex = activeRow === undefined ? -1 : visibleRows.indexOf(activeRow)
      const optionId = index => 'wsp-opt-' + uid + '-' + index

      const pending = snapshot.phase !== 'ready' && snapshot.items.length === 0
      const listError = snapshot.state === 'error'
      const listRendered = !pending && filtered.length > 0 && !(listError && rows.length === 0)
      // The Host's native folder chooser is local-only; a remote or
      // SSH-forwarded Host is served by the in-app browse composition, whose
      // interaction this entry cannot render. Do not offer an action that can
      // only fail there.
      const canAdd = localHost === true
        && flowAvailable
        && typeof pickDirectory === 'function'
        && typeof createWorkspace === 'function'

      // Reset transient state while closed, and hand focus back to the trigger
      // after a dismissal. Resetting while closed keeps the next open frame clean.
      useEffect(() => {
        if (open) {
          wasOpen.current = true
          closedRef.current = false
          setNow(Date.now())
          return
        }
        if (!wasOpen.current) return
        wasOpen.current = false
        closedRef.current = true
        setQuery('')
        setExpanded(false)
        setActiveId(null)
        setPlacement(null)
        setError(null)
        setBusy(false)
        const anchor = anchorRef && anchorRef.current
        if (anchor && typeof anchor.focus === 'function') anchor.focus({ preventScroll: true })
      }, [open, anchorRef])

      // A host-side adoption that finishes after the owner unmounts must not
      // navigate the next screen.
      useEffect(() => () => { closedRef.current = true }, [])

      // Keep relative labels honest while the surface stays open.
      useEffect(() => {
        if (!open) return undefined
        setNow(Date.now())
        const timer = window.setInterval(() => setNow(Date.now()), 60000)
        return () => window.clearInterval(timer)
      }, [open])

      // Focus the search field on open and whenever the compact/dialog surface swaps.
      useLayoutEffect(() => {
        if (!open) return undefined
        const frame = window.requestAnimationFrame(() => {
          const input = inputRef.current
          if (input) input.focus({ preventScroll: true })
        })
        return () => window.cancelAnimationFrame(frame)
      }, [open, expanded])

      // The expanded chooser is modal: keep the page behind it still.
      useEffect(() => {
        if (!open || !expanded) return undefined
        const body = document.body
        const previous = body.style.overflow
        body.style.overflow = 'hidden'
        return () => { body.style.overflow = previous }
      }, [open, expanded])

      // Anchor the compact popover under the chip, clamped to the viewport, and
      // follow scrolls and resizes while it is open.
      useLayoutEffect(() => {
        if (!open || expanded) return undefined
        let frame = 0
        const update = () => {
          const anchor = anchorRef && anchorRef.current
          if (!anchor) return
          const rect = anchor.getBoundingClientRect()
          // Same geometry as the host Menu card: 12px viewport gutters and a
          // 4px gap under the trigger.
          const width = Math.min(360, window.innerWidth - 24)
          const left = Math.min(Math.max(12, rect.left), Math.max(12, window.innerWidth - width - 12))
          const below = window.innerHeight - rect.bottom >= 300 || rect.top < 300
          const available = below
            ? window.innerHeight - rect.bottom - 16
            : rect.top - 16
          const maxHeight = Math.max(180, Math.min(420, available))
          const next = below
            ? { left, width, top: rect.bottom + 4, maxHeight }
            : { left, width, bottom: window.innerHeight - rect.top + 4, maxHeight }
          setPlacement(previous => (
            previous !== null
            && previous.left === next.left
            && previous.width === next.width
            && previous.top === next.top
            && previous.bottom === next.bottom
            && previous.maxHeight === next.maxHeight
          ) ? previous : next)
        }
        const schedule = () => {
          window.cancelAnimationFrame(frame)
          frame = window.requestAnimationFrame(update)
        }
        update()
        window.addEventListener('resize', schedule)
        window.addEventListener('scroll', schedule, true)
        return () => {
          window.cancelAnimationFrame(frame)
          window.removeEventListener('resize', schedule)
          window.removeEventListener('scroll', schedule, true)
        }
      }, [open, expanded, anchorRef])

      // Follow the keyboard highlight inside a long list.
      useEffect(() => {
        if (!open) return
        const root = panelRef.current
        if (!root) return
        const active = root.querySelector('[data-active="true"]')
        if (active && typeof active.scrollIntoView === 'function') {
          active.scrollIntoView({ block: 'nearest' })
        }
      }, [open, expanded, activeRow && activeRow.id])

      const requestClose = useCallback(() => {
        closedRef.current = true
        onClose()
      }, [onClose])

      const choose = useCallback((row) => {
        if (busy) return
        onPick(row.id)
        onClose()
      }, [busy, onPick, onClose])

      const addWorkspace = useCallback(async () => {
        if (busy || !canAdd) return
        setBusy(true)
        setError(null)
        try {
          const path = await pickDirectory()
          if (closedRef.current || path === null || path === undefined || path === '') return
          const workspace = await createWorkspace({ path })
          if (closedRef.current) return
          if (workspace && workspace.workspaceId !== undefined) {
            onPick(workspace.workspaceId)
            onClose()
          }
        } catch (reason) {
          if (!closedRef.current) setError(reason instanceof Error ? reason.message : String(reason))
        } finally {
          if (!closedRef.current) setBusy(false)
        }
      }, [busy, canAdd, pickDirectory, createWorkspace, onPick, onClose])

      /**
       * Shared key handling: Escape steps back, arrows move the highlight,
       * Enter opens the highlighted row from the search field, Tab stays inside
       * the dialog.
       * @param {object} event React keyboard event.
       */
      const onKeyDown = (event) => {
        // Enter that commits an IME candidate must not choose a workspace.
        if (event.nativeEvent?.isComposing === true || event.isComposing === true || event.keyCode === 229) return
        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          if (expanded) setExpanded(false)
          else requestClose()
          return
        }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          if (visibleRows.length === 0) return
          event.preventDefault()
          const next = event.key === 'ArrowDown'
            ? (activeIndex < 0 ? 0 : Math.min(visibleRows.length - 1, activeIndex + 1))
            : (activeIndex < 0 ? visibleRows.length - 1 : Math.max(0, activeIndex - 1))
          setActiveId(visibleRows[next].id)
          return
        }
        if (event.key === 'Enter' && event.target === inputRef.current) {
          if (activeRow === undefined) return
          event.preventDefault()
          choose(activeRow)
          return
        }
        if (event.key !== 'Tab') return
        const root = panelRef.current
        if (!root) return
        const items = root.querySelectorAll(
          'button:not([disabled]):not([tabindex="-1"]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        )
        if (items.length === 0) return
        const first = items[0]
        const last = items[items.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }

      if (!open) return null
      if (!expanded && placement === null) return null

      /**
       * Render one ordered run of rows with stable option ids.
       * @param {readonly object[]} run rows to render.
       * @param {number} offset index of the first row in the visible list.
       * @returns {object[]} row elements.
       */
      const renderRows = (run, offset) => run.map((row, index) => h(WorkspaceRow, {
        key: row.id,
        row,
        id: optionId(offset + index),
        active: activeRow !== undefined && activeRow.id === row.id,
        selected: selectedId === row.id,
        now,
        t,
        compact: !expanded,
        busy,
        onChoose: choose,
        onHover: setActiveId,
      }))

      let body
      if (listError && rows.length === 0) {
        body = h(EmptyState, { title: t('error.title'), body: t('error.body') })
      } else if (pending) {
        body = h(React.Fragment, null,
          h('span', { className: 'wsp-sr-only', role: 'status' }, t('loading')),
          h(Skeleton, { rows: expanded ? 6 : 4 }),
        )
      } else if (rows.length === 0) {
        body = h(EmptyState, {
          title: t('empty.noWorkspacesTitle'),
          body: canAdd ? t('empty.noWorkspacesBody') : t('empty.noAddBody'),
        })
      } else if (filtered.length === 0) {
        body = h(EmptyState, { title: t('empty.title'), body: t('empty.body') })
      } else if (expanded) {
        const showRecent = query.trim() === '' && rows.length > SHORTLIST + 1
        const recentRows = showRecent ? filtered.slice(0, SHORTLIST) : []
        const restRows = showRecent ? filtered.slice(SHORTLIST) : filtered
        body = h('div', { role: 'listbox', id: listId, 'aria-label': t('list.label'), className: 'wsp-list' },
          showRecent ? h(SectionHeader, { key: 'recent', label: t('recent'), count: recentRows.length }) : null,
          showRecent ? renderRows(recentRows, 0) : null,
          h(SectionHeader, {
            key: 'rest',
            label: showRecent ? t('others') : query.trim() === '' ? t('all') : t('results'),
            count: restRows.length,
          }),
          renderRows(restRows, showRecent ? SHORTLIST : 0),
        )
      } else {
        const searching = query.trim() !== ''
        body = h('div', { role: 'listbox', id: listId, 'aria-label': t('list.label'), className: 'wsp-list' },
          h(SectionHeader, {
            key: 'head',
            label: searching ? t('results') : t('recent'),
            count: searching ? filtered.length : 0,
          }),
          renderRows(compactRows, 0),
        )
      }

      const banner = error === null ? null : h(ErrorBanner, {
        label: t('addFailed'),
        message: error,
        dismiss: t('dismiss'),
        onDismiss: () => setError(null),
      })
      const staleWarning = listError && rows.length > 0
        ? h('div', { className: 'wsp-warning', role: 'status' }, t('error.stale'))
        : null

      const search = h(SearchField, {
        t,
        value: query,
        onChange: setQuery,
        inputRef,
        listId: listRendered ? listId : undefined,
        activeOptionId: activeRow === undefined ? undefined : optionId(activeIndex),
      })

      if (expanded) {
        return ReactDOM.createPortal(h(React.Fragment, null,
          h('style', null, CSS),
          h('div', {
            className: 'wsp-modal-layer',
            onMouseDown: (event) => {
              if (event.target === event.currentTarget) requestClose()
            },
          },
            h('div', {
              ref: panelRef,
              className: 'wsp-dialog',
              role: 'dialog',
              'aria-modal': 'true',
              'aria-labelledby': titleId,
              'aria-busy': busy || pending || undefined,
              onMouseDown: event => event.stopPropagation(),
              onKeyDown,
            },
              h('div', { className: 'wsp-dialog-head' },
                h('button', {
                  type: 'button',
                  className: 'wsp-icon-btn wsp-back',
                  'aria-label': t('back'),
                  title: t('back'),
                  onClick: () => setExpanded(false),
                }, h(ChevronLeftGlyph, { size: 14 })),
                h('div', { className: 'wsp-dialog-heading' },
                  h('h2', { className: 'wsp-dialog-title', id: titleId }, t('dialog.title')),
                  h('p', { className: 'wsp-dialog-subtitle' }, t('dialog.subtitle')),
                ),
                h('button', {
                  type: 'button',
                  className: 'wsp-icon-btn',
                  'aria-label': t('close'),
                  title: t('close'),
                  onClick: requestClose,
                }, h(CloseGlyph, { size: 14 })),
              ),
              h('div', { className: 'wsp-dialog-search' }, search),
              h('div', { className: 'wsp-dialog-body' }, body),
              staleWarning,
              banner,
              h('div', { className: 'wsp-dialog-foot' },
                canAdd
                  ? h('button', {
                    type: 'button',
                    className: 'wsp-foot-action',
                    title: t('addHint'),
                    'aria-disabled': busy || undefined,
                    onClick: addWorkspace,
                  },
                    busy ? h('span', { className: 'wsp-spinner' }) : h(PlusGlyph, { size: 14 }),
                    h('span', null, t(busy ? 'adding' : 'add')),
                  )
                  : h('span', { className: 'wsp-foot-note' }, t('sorted')),
                h('div', { className: 'wsp-hints' },
                  h('span', { className: 'wsp-hint' }, t('dialog.hint')),
                  h('span', { className: 'wsp-dialog-count' },
                    query.trim() === ''
                      ? (filtered.length === 1
                        ? t('count.one')
                        : t('count.other', { n: filtered.length }))
                      : t('countResults', { n: filtered.length })),
                ),
              ),
            ),
          ),
        ), document.body)
      }

      const expandable = filtered.length > compactRows.length
      return ReactDOM.createPortal(h(React.Fragment, null,
        h('style', null, CSS),
        h('div', {
          className: 'wsp-layer',
          onMouseDown: (event) => {
            if (event.target === event.currentTarget) requestClose()
          },
        },
          h('div', {
            ref: panelRef,
            className: 'wsp-popover',
            role: 'dialog',
            'aria-label': t('dialog.title'),
            'aria-busy': busy || pending || undefined,
            style: {
              left: placement.left + 'px',
              width: placement.width + 'px',
              maxHeight: placement.maxHeight + 'px',
              ...(placement.top === undefined
                ? { bottom: placement.bottom + 'px' }
                : { top: placement.top + 'px' }),
            },
            onMouseDown: event => event.stopPropagation(),
            onKeyDown,
          },
            h('div', { className: 'wsp-pop-head' }, search),
            h('div', { className: 'wsp-pop-body' }, body),
            staleWarning,
            banner,
            h('div', { className: 'wsp-foot' },
              canAdd
                ? h('button', {
                  type: 'button',
                  className: 'wsp-foot-action',
                  title: t('addHint'),
                  'aria-disabled': busy || undefined,
                  onClick: addWorkspace,
                },
                  busy ? h('span', { className: 'wsp-spinner' }) : h(PlusGlyph, { size: 14 }),
                  h('span', null, t(busy ? 'adding' : 'add')),
                )
                : h('span', { className: 'wsp-foot-note' }, t('sorted')),
              expandable
                ? h('button', {
                  type: 'button',
                  className: 'wsp-foot-action',
                  onClick: () => setExpanded(true),
                },
                  h(GridGlyph, { size: 14 }),
                  h('span', null, query.trim() === ''
                    ? t('expandCount', { n: filtered.length })
                    : t('expandResults', { n: filtered.length })),
                  h(ChevronRightGlyph, { size: 12 }),
                )
                : h('span', { className: 'wsp-foot-count' },
                  query.trim() === ''
                    ? (filtered.length === 1
                      ? t('count.one')
                      : t('count.other', { n: filtered.length }))
                    : t('countResults', { n: filtered.length })),
            ),
          ),
        ),
      ), document.body)
    }

    const EMPTY_WORKSPACES = { items: [], phase: 'ready', state: 'idle' }
    const EMPTY_SESSIONS = { byId: {} }
    const NOOP_SUBSCRIBE = () => () => {}

    /**
     * A stand-in selector hook for a missing standard share. It still runs one
     * external-store hook, so the component's hook order never changes when a
     * standard provider appears or disappears.
     * @param {unknown} snapshot constant value.
     * @param {(value: unknown) => unknown} selector selector to apply.
     * @returns {unknown} the selected constant.
     */
    function useEmptySnapshot(snapshot, selector) {
      useSyncExternalStore(NOOP_SUBSCRIBE, () => snapshot, () => snapshot)
      return selector(snapshot)
    }

    return {
      inject: ['slots', 'locale', 'uiWorkspace', 'workspaces', 'remote'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, LABELS), `${NS}: locale`)

        // The published occupancy signal for the hero's directory-flow hole:
        // the action appears only while a composed picking interaction exists,
        // and the hook stays live when that package activates or unloads.
        const directoryFlow = {
          getSnapshot: () => ctx.slots.entries('conversation.hero.workspace.directoryFlow').length > 0,
          subscribe: listener => ctx.slots.subscribe('conversation.hero.workspace.directoryFlow', listener),
        }
        const injected = () => {
          let localHost = false
          try {
            localHost = ctx.remote.$host.isLoopback === true
          } catch {
            localHost = false
          }
          return {
            pickDirectory: () => ctx.uiWorkspace.pickDirectory(),
            createWorkspace: input => ctx.workspaces.create(input),
            localHost,
            hooks: { directoryFlow },
          }
        }
        // Priority -1 shadows the shipped picker: in a single slot the lowest
        // priority renders. Disabling this bundle restores the shipped menu.
        ctx.effect(() => ctx.slots.inject('conversation.hero.workspace', () => ctx.slots.register({
          name: 'conversation.hero.workspace',
          priority: -1,
          locale: NS,
          inject: injected,
        }, WorkspacePicker)), `${NS}: hero picker`)
      },
      __test: { SHORTLIST, buildRows, filterRows, shortenPath, relativeTime, toMillis },
    }
  },
})
