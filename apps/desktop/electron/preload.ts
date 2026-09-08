import { contextBridge, ipcRenderer, webFrame, webUtils } from 'electron'

// Which translucency the OS can back. Asked synchronously because the renderer
// needs it before its first paint, and answered by main because deciding it
// needs `os.release()` — a sandboxed preload may only require electron, events,
// timers and url, so importing node:os here throws before contextBridge runs
// and takes the ENTIRE bridge down with it (window.anikaDesktop undefined =>
// "Desktop IPC bridge is unavailable"). No reply means no glass, which degrades
// to an ordinary opaque window rather than a page thinned over nothing.
const translucencySupport = ipcRenderer.sendSync('anika:translucency:support')
const hudWindowing = ipcRenderer.sendSync('anika:hud:windowing')
const hudNativeDrag = hudWindowing?.nativeDrag === true
const launchFlags = ipcRenderer.sendSync('anika:launch-flags')

contextBridge.exposeInMainWorld('anikaDesktop', {
  glassSupported: translucencySupport?.glass === true,
  translucencySupported: translucencySupport?.translucency === true,
  // Launch-flag fact: the app was started with --local, so the renderer may
  // show the local-models surfaces. Static for the window's lifetime.
  localModelsEnabled: launchFlags?.localModels === true,
  getConnection: (profile, opts) => ipcRenderer.invoke('anika:connection', profile, opts),
  // Registry-scoped backend resolution: { connectionId, profile } → descriptor.
  getConnectionFor: payload => ipcRenderer.invoke('anika:connection:for', payload),
  getProfileRoutes: profiles => ipcRenderer.invoke('anika:plugin-profile-routes', profiles),
  revalidateConnection: () => ipcRenderer.invoke('anika:connection:revalidate'),
  touchBackend: profile => ipcRenderer.invoke('anika:backend:touch', profile),
  getPoolLimits: () => ipcRenderer.invoke('anika:pool-limits:get'),
  setPoolLimits: limits => ipcRenderer.invoke('anika:pool-limits:set', limits),
  getGatewayWsUrl: profile => ipcRenderer.invoke('anika:gateway:ws-url', profile),
  // Registry-scoped fresh WS URL: { connectionId, profile } → result shape of
  // getGatewayWsUrl, minted against that connection's backend.
  getGatewayWsUrlFor: payload => ipcRenderer.invoke('anika:gateway:ws-url-for', payload),
  // Union agent roster across every registered connection.
  getAgentRoster: () => ipcRenderer.invoke('anika:agents:roster'),
  openSessionWindow: (sessionId, opts) => ipcRenderer.invoke('anika:window:openSession', sessionId, opts),
  openSessionInTerminal: (sessionId, opts) => ipcRenderer.invoke('anika:window:openInTerminal', sessionId, opts),
  openWindow: () => ipcRenderer.invoke('anika:window:openInstance'),
  openBrowserWindow: tabId => ipcRenderer.invoke('anika:window:openBrowser', tabId),
  onBrowserPopoutClosed: callback => {
    const listener = (_event, tabId) => callback(tabId)
    ipcRenderer.on('anika:browser-popout:closed', listener)

    return () => ipcRenderer.removeListener('anika:browser-popout:closed', listener)
  },
  claimAmbientCue: key => ipcRenderer.invoke('anika:ambient:claim', key),
  wakeIndicator: {
    getState: () => ipcRenderer.invoke('anika:wake-indicator:get'),
    setState: state => ipcRenderer.send('anika:wake-indicator:set', state),
    onState: callback => {
      const listener = (_event, state) => callback(state)
      ipcRenderer.on('anika:wake-indicator:state', listener)

      return () => ipcRenderer.removeListener('anika:wake-indicator:state', listener)
    }
  },
  petOverlay: {
    // Main renderer → main process: window lifecycle + drag. `request` is
    // `{ bounds, screen }`; resolves with the screen bounds it actually used.
    open: request => ipcRenderer.invoke('anika:pet-overlay:open', request),
    close: () => ipcRenderer.invoke('anika:pet-overlay:close'),
    setBounds: bounds => ipcRenderer.send('anika:pet-overlay:set-bounds', bounds),
    setIgnoreMouse: ignore => ipcRenderer.send('anika:pet-overlay:ignore-mouse', ignore),
    // Flip the overlay focusable (and focus it) while the composer needs keys.
    setFocusable: focusable => ipcRenderer.send('anika:pet-overlay:set-focusable', focusable),
    // Main renderer → overlay (forwarded by main): push the latest pet state.
    pushState: payload => ipcRenderer.send('anika:pet-overlay:state', payload),
    // Overlay → main renderer (forwarded by main): pop back in / composer submit.
    control: payload => ipcRenderer.send('anika:pet-overlay:control', payload),
    // Overlay subscribes to state pushes.
    onState: callback => {
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on('anika:pet-overlay:state', listener)

      return () => ipcRenderer.removeListener('anika:pet-overlay:state', listener)
    },
    // Main renderer subscribes to overlay control messages.
    onControl: callback => {
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on('anika:pet-overlay:control', listener)

      return () => ipcRenderer.removeListener('anika:pet-overlay:control', listener)
    }
  },
  // HUD mode: the chrome-free floating chat. A full app renderer (own gateway)
  // sized as a floating bar, so it mounts the real composer. Main owns the
  // window; `onChanged` keeps every window's toggle truthful.
  hud: {
    nativeDrag: hudNativeDrag,
    windowing: {
      clientPlacement: hudWindowing?.clientPlacement !== false,
      controlDrag: hudWindowing?.controlDrag === true,
      nativeDrag: hudNativeDrag,
      solid: hudWindowing?.solid === true,
      workspaceTransfer: hudWindowing?.workspaceTransfer === true
    },
    open: request => ipcRenderer.invoke('anika:hud:open', request),
    close: () => ipcRenderer.invoke('anika:hud:close'),
    setIgnoreMouse: ignore => ipcRenderer.send('anika:hud:ignore-mouse', ignore),
    beginMove: () => ipcRenderer.send('anika:hud:begin-move'),
    endMove: () => ipcRenderer.send('anika:hud:end-move'),
    moveBy: delta => ipcRenderer.send('anika:hud:move-by', delta),
    setWorkspaceTransfer: transferring => ipcRenderer.send('anika:hud:workspace-transfer', transferring),
    setBounds: bounds => ipcRenderer.send('anika:hud:set-bounds', bounds),
    resetLayout: () => ipcRenderer.invoke('anika:hud:reset-layout'),
    // Whether the band covers the window below the bar. Main pairs it with the
    // user's translucency setting to decide the native frost (macOS vibrancy /
    // Windows 11 DWM backdrop) — see hudFrostFor.
    setFrost: showing => ipcRenderer.invoke('anika:hud:frost', showing),
    // The HUD tells main which session it is on; main hands that back to the
    // app window when the HUD closes, so the app can re-home onto it.
    setSession: sessionId => ipcRenderer.send('anika:hud:session', sessionId),
    onGoto: callback => {
      const listener = (_event, sessionId) => callback(sessionId)
      ipcRenderer.on('anika:hud:goto', listener)

      return () => ipcRenderer.removeListener('anika:hud:goto', listener)
    },
    onChanged: callback => {
      const listener = (_event, state) => callback(state)
      ipcRenderer.on('anika:hud:changed', listener)

      return () => ipcRenderer.removeListener('anika:hud:changed', listener)
    },
    // Linux only, and silent elsewhere: where the cursor is, in page
    // coordinates, or null when it has left the window. Stands in for the
    // mousemove that `setIgnoreMouseEvents(true, { forward: true })` delivers on
    // macOS and Windows but not here.
    onCursor: callback => {
      const listener = (_event, point) => callback(point)
      ipcRenderer.on('anika:hud:cursor', listener)

      return () => ipcRenderer.removeListener('anika:hud:cursor', listener)
    },
    // Main's game-overlay watch: whether a fullscreen app (a game) is under
    // the HUD, so the renderer can step back to the low-opacity overlay
    // treatment while one owns the screen.
    onGameOverlay: callback => {
      const listener = (_event, state) => callback(state)
      ipcRenderer.on('anika:hud:game-overlay', listener)

      return () => ipcRenderer.removeListener('anika:hud:game-overlay', listener)
    }
  },
  // Quick Entry: the global-hotkey mini composer window. Main owns the OS
  // shortcut + the persisted preference; the quick window only captures text
  // and hands it back, and the primary renderer submits it through the normal
  // prompt path.
  quickEntry: {
    getSettings: () => ipcRenderer.invoke('anika:quick-entry:settings:get'),
    setSettings: patch => ipcRenderer.invoke('anika:quick-entry:settings:set', patch),
    submit: payload => ipcRenderer.send('anika:quick-entry:submit', payload),
    dismiss: () => ipcRenderer.send('anika:quick-entry:dismiss'),
    // Primary renderer → main → quick window: gateway connection state + the
    // recent-session options the target picker offers. Main caches the latest
    // payload so a freshly spawned quick window starts from truth.
    pushState: payload => ipcRenderer.send('anika:quick-entry:state', payload),
    // Quick window subscribes to those pushes.
    onState: callback => {
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on('anika:quick-entry:state', listener)

      return () => ipcRenderer.removeListener('anika:quick-entry:state', listener)
    },
    // Main → primary renderer: a submit captured by the quick window.
    onSubmit: callback => {
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on('anika:quick-entry:submit', listener)

      return () => ipcRenderer.removeListener('anika:quick-entry:submit', listener)
    },
    // Main → quick window: you were just summoned (reset draft + refocus).
    onShown: callback => {
      const listener = () => callback()
      ipcRenderer.on('anika:quick-entry:shown', listener)

      return () => ipcRenderer.removeListener('anika:quick-entry:shown', listener)
    }
  },
  getBootProgress: () => ipcRenderer.invoke('anika:boot-progress:get'),
  getConnectionConfig: profile => ipcRenderer.invoke('anika:connection-config:get', profile),
  saveConnectionConfig: payload => ipcRenderer.invoke('anika:connection-config:save', payload),
  applyConnectionConfig: payload => ipcRenderer.invoke('anika:connection-config:apply', payload),
  testConnectionConfig: payload => ipcRenderer.invoke('anika:connection-config:test', payload),
  // Opt-in OS-keychain encryption for stored gateway secrets (default off —
  // see secret-storage-policy.ts). get never touches the OS keychain.
  getSecretStorageEncryption: () => ipcRenderer.invoke('anika:secret-storage:get'),
  setSecretStorageEncryption: (on: boolean) => ipcRenderer.invoke('anika:secret-storage:set', on),
  // v2 multi-connection registry: named agent sources (local / remote / cloud / ssh).
  connections: {
    list: () => ipcRenderer.invoke('anika:connections:list'),
    save: payload => ipcRenderer.invoke('anika:connections:save', payload),
    remove: id => ipcRenderer.invoke('anika:connections:remove', id),
    setPrimary: id => ipcRenderer.invoke('anika:connections:set-primary', id),
    setLaunchMode: mode => ipcRenderer.invoke('anika:connections:set-launch-mode', mode),
    setLastUsed: id => ipcRenderer.invoke('anika:connections:set-last-used', id),
    test: id => ipcRenderer.invoke('anika:connections:test', id),
    updateManaged: id => ipcRenderer.invoke('anika:connections:update-managed', id),
    // Fan out `anika update` to every eligible registered connection.
    // Optional excludeIds skips rows the caller updates through another path.
    updateAll: options => ipcRenderer.invoke('anika:connections:update-all', options),
    // Registry lifecycle push (main → renderer): a connection was removed or
    // materially edited, so secondaries scoped to it must be disposed (and,
    // for edits, re-dialed at the new target).
    onChanged: callback => {
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on('anika:connections:changed', listener)

      return () => ipcRenderer.removeListener('anika:connections:changed', listener)
    }
  },
  sshConfigHosts: () => ipcRenderer.invoke('anika:ssh-config:hosts'),
  sshResolveHost: host => ipcRenderer.invoke('anika:ssh-config:resolve', host),
  probeConnectionConfig: remoteUrl => ipcRenderer.invoke('anika:connection-config:probe', remoteUrl),
  oauthLoginConnectionConfig: remoteUrl => ipcRenderer.invoke('anika:connection-config:oauth-login', remoteUrl),
  oauthLogoutConnectionConfig: remoteUrl => ipcRenderer.invoke('anika:connection-config:oauth-logout', remoteUrl),
  // Anika Cloud: one portal login powers discovery + silent per-agent sign-in
  // (cloud-auto-discovery Phase 3).
  cloud: {
    status: () => ipcRenderer.invoke('anika:cloud:status'),
    login: () => ipcRenderer.invoke('anika:cloud:login'),
    logout: () => ipcRenderer.invoke('anika:cloud:logout'),
    discover: org => ipcRenderer.invoke('anika:cloud:discover', org),
    agentSignIn: dashboardUrl => ipcRenderer.invoke('anika:cloud:agent-sign-in', dashboardUrl)
  },
  profile: {
    get: () => ipcRenderer.invoke('anika:profile:get'),
    remember: name => ipcRenderer.invoke('anika:profile:remember', name),
    set: name => ipcRenderer.invoke('anika:profile:set', name)
  },
  api: request => ipcRenderer.invoke('anika:api', request),
  notify: payload => ipcRenderer.invoke('anika:notify', payload),
  requestMicrophoneAccess: () => ipcRenderer.invoke('anika:requestMicrophoneAccess'),
  readWindowBelow: () => ipcRenderer.invoke('anika:window:readBelow'),
  readFileDataUrl: filePath => ipcRenderer.invoke('anika:readFileDataUrl', filePath),
  readFileDataUrlForAttach: filePath => ipcRenderer.invoke('anika:readFileDataUrlForAttach', filePath),
  dataUrlReadMax: {
    get: () => ipcRenderer.invoke('anika:data-url-read-max:get'),
    set: maxMb => ipcRenderer.invoke('anika:data-url-read-max:set', maxMb)
  },
  readFileText: filePath => ipcRenderer.invoke('anika:readFileText', filePath),
  readPluginSource: (filePath: string) => ipcRenderer.invoke('anika:readPluginSource', filePath),
  selectPaths: options => ipcRenderer.invoke('anika:selectPaths', options),
  selectSavePath: options => ipcRenderer.invoke('anika:selectSavePath', options),
  writeClipboard: text => ipcRenderer.invoke('anika:writeClipboard', text),
  readClipboard: () => ipcRenderer.invoke('anika:readClipboard'),
  saveGatewayFile: payload => ipcRenderer.invoke('anika:saveGatewayFile', payload),
  saveImageFromUrl: url => ipcRenderer.invoke('anika:saveImageFromUrl', url),
  contextMenuEdit: command => ipcRenderer.invoke('anika:context-menu:edit', command),
  contextMenuCopyImage: () => ipcRenderer.invoke('anika:context-menu:copy-image'),
  contextMenuSpellcheck: action => ipcRenderer.invoke('anika:context-menu:spellcheck', action),
  contextMenuGuestAddWord: payload => ipcRenderer.invoke('anika:context-menu:guest-add-word', payload),
  onContextMenuSpellcheck: callback => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('anika:context-menu-spellcheck', listener)

    return () => ipcRenderer.removeListener('anika:context-menu-spellcheck', listener)
  },
  saveImageBuffer: (data, ext, name) => ipcRenderer.invoke('anika:saveImageBuffer', { data, ext, name }),
  capturePreview: payload => ipcRenderer.invoke('anika:capturePreview', payload),
  saveClipboardImage: () => ipcRenderer.invoke('anika:saveClipboardImage'),
  getPathForFile: file => {
    try {
      return webUtils.getPathForFile(file) || ''
    } catch {
      return ''
    }
  },
  normalizePreviewTarget: (target, baseDir) => ipcRenderer.invoke('anika:normalizePreviewTarget', target, baseDir),
  watchPreviewFile: url => ipcRenderer.invoke('anika:watchPreviewFile', url),
  watchDirectory: dir => ipcRenderer.invoke('anika:watchDirectory', dir),
  stopPreviewFileWatch: id => ipcRenderer.invoke('anika:stopPreviewFileWatch', id),
  setActiveWork: payload => ipcRenderer.send('anika:active-work', payload),
  setTitleBarTheme: payload => ipcRenderer.send('anika:titlebar-theme', payload),
  setNativeTheme: mode => ipcRenderer.send('anika:native-theme', mode),
  setTranslucency: payload => ipcRenderer.send('anika:translucency', payload),
  setKeepAwake: on => ipcRenderer.send('anika:keep-awake', on),
  setDisableF12: blocked => ipcRenderer.send('anika:devtools:disable-f12', blocked),
  setPreviewShortcutActive: active => ipcRenderer.send('anika:previewShortcutActive', Boolean(active)),
  openExternal: url => ipcRenderer.invoke('anika:openExternal', url),
  mcpOauth: {
    // One-shot loopback listener for MCP OAuth against remote backends: bind
    // on this machine, hand redirectUri to mcp.servers.oauth.start, then wait
    // for the provider redirect and relay code/state via oauth.callback.
    listen: () => ipcRenderer.invoke('anika:mcp-oauth:listen'),
    wait: (id, timeoutMs) => ipcRenderer.invoke('anika:mcp-oauth:wait', id, timeoutMs),
    cancel: id => ipcRenderer.invoke('anika:mcp-oauth:cancel', id)
  },
  openPreviewInBrowser: url => ipcRenderer.invoke('anika:openPreviewInBrowser', url),
  reachPreviewUrl: url => ipcRenderer.invoke('anika:preview:reach', url),
  setActiveConnectionRoute: route => ipcRenderer.send('anika:connection:active-route', route),
  fetchLinkTitle: url => ipcRenderer.invoke('anika:fetchLinkTitle', url),
  resolveFavicon: url => ipcRenderer.invoke('anika:resolveFavicon', url),
  sanitizeWorkspaceCwd: cwd => ipcRenderer.invoke('anika:workspace:sanitize', cwd),
  settings: {
    getDefaultProjectDir: () => ipcRenderer.invoke('anika:setting:defaultProjectDir:get'),
    setDefaultProjectDir: dir => ipcRenderer.invoke('anika:setting:defaultProjectDir:set', dir),
    pickDefaultProjectDir: () => ipcRenderer.invoke('anika:setting:defaultProjectDir:pick')
  },
  zoom: {
    // Current zoom of this window, as { level, percent }.
    get: () => ipcRenderer.invoke('anika:zoom:get'),
    // Synchronous zoom factor (1 = 100%). Coordinate math needs it in the
    // same tick as the event it converts, so no IPC round-trip here.
    factor: () => webFrame.getZoomFactor(),
    setPercent: percent => ipcRenderer.send('anika:zoom:set-percent', percent),
    // Fires on every zoom change, including the Ctrl/Cmd +/-/0 shortcuts,
    // so the settings UI can stay in sync with the keyboard.
    onChanged: callback => {
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on('anika:zoom:changed', listener)

      return () => ipcRenderer.removeListener('anika:zoom:changed', listener)
    }
  },
  revealLogs: () => ipcRenderer.invoke('anika:logs:reveal'),
  getRecentLogs: () => ipcRenderer.invoke('anika:logs:recent'),
  // Fire-and-forget: persists a renderer error-boundary catch (with component
  // stack) to desktop.log so crashes survive the window (#79428).
  reportRendererError: report => ipcRenderer.send('anika:logs:renderer-error', report),
  readDir: dirPath => ipcRenderer.invoke('anika:fs:readDir', dirPath),
  gitRoot: startPath => ipcRenderer.invoke('anika:fs:gitRoot', startPath),
  revealPath: targetPath => ipcRenderer.invoke('anika:fs:reveal', targetPath),
  openDir: dirPath => ipcRenderer.invoke('anika:fs:openDir', dirPath),
  desktopPluginsRoot: () => ipcRenderer.invoke('anika:fs:desktopPluginsRoot'),
  logsRoot: () => ipcRenderer.invoke('anika:fs:logsRoot'),
  agentPluginsRoot: () => ipcRenderer.invoke('anika:fs:agentPluginsRoot'),
  renamePath: (targetPath, newName) => ipcRenderer.invoke('anika:fs:rename', targetPath, newName),
  writeTextFile: (filePath, content) => ipcRenderer.invoke('anika:fs:writeText', filePath, content),
  trashPath: targetPath => ipcRenderer.invoke('anika:fs:trash', targetPath),
  git: {
    worktreeList: repoPath => ipcRenderer.invoke('anika:git:worktreeList', repoPath),
    worktreeAdd: (repoPath, options) => ipcRenderer.invoke('anika:git:worktreeAdd', repoPath, options),
    worktreeRemove: (repoPath, worktreePath, options) =>
      ipcRenderer.invoke('anika:git:worktreeRemove', repoPath, worktreePath, options),
    branchSwitch: (repoPath, branch) => ipcRenderer.invoke('anika:git:branchSwitch', repoPath, branch),
    branchList: repoPath => ipcRenderer.invoke('anika:git:branchList', repoPath),
    baseBranchList: repoPath => ipcRenderer.invoke('anika:git:baseBranchList', repoPath),
    repoStatus: repoPath => ipcRenderer.invoke('anika:git:repoStatus', repoPath),
    fileDiff: (repoPath, filePath) => ipcRenderer.invoke('anika:git:fileDiff', repoPath, filePath),
    scanRepos: (roots, options) => ipcRenderer.invoke('anika:git:scanRepos', roots, options),
    review: {
      list: (repoPath, scope, baseRef) => ipcRenderer.invoke('anika:git:review:list', repoPath, scope, baseRef),
      diff: (repoPath, filePath, scope, baseRef, staged) =>
        ipcRenderer.invoke('anika:git:review:diff', repoPath, filePath, scope, baseRef, staged),
      stage: (repoPath, filePath) => ipcRenderer.invoke('anika:git:review:stage', repoPath, filePath),
      unstage: (repoPath, filePath) => ipcRenderer.invoke('anika:git:review:unstage', repoPath, filePath),
      revert: (repoPath, filePath) => ipcRenderer.invoke('anika:git:review:revert', repoPath, filePath),
      revParse: (repoPath, ref) => ipcRenderer.invoke('anika:git:review:revParse', repoPath, ref),
      commit: (repoPath, message, push) => ipcRenderer.invoke('anika:git:review:commit', repoPath, message, push),
      commitContext: repoPath => ipcRenderer.invoke('anika:git:review:commitContext', repoPath),
      push: repoPath => ipcRenderer.invoke('anika:git:review:push', repoPath),
      shipInfo: repoPath => ipcRenderer.invoke('anika:git:review:shipInfo', repoPath),
      prList: (repoPath, branches, numbers) =>
        ipcRenderer.invoke('anika:git:review:prList', repoPath, branches, numbers),
      fetchPrComment: (repoPath, url) => ipcRenderer.invoke('anika:git:review:fetchPrComment', repoPath, url),
      createPr: repoPath => ipcRenderer.invoke('anika:git:review:createPr', repoPath)
    }
  },
  terminal: {
    attach: id => ipcRenderer.invoke('anika:terminal:attach', id),
    cwd: id => ipcRenderer.invoke('anika:terminal:cwd', id),
    dispose: id => ipcRenderer.invoke('anika:terminal:dispose', id),
    resize: (id, size) => ipcRenderer.invoke('anika:terminal:resize', id, size),
    start: options => ipcRenderer.invoke('anika:terminal:start', options),
    write: (id, data) => ipcRenderer.invoke('anika:terminal:write', id, data),
    onData: (id, callback) => {
      const channel = `anika:terminal:${id}:data`
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on(channel, listener)

      return () => ipcRenderer.removeListener(channel, listener)
    },
    onExit: (id, callback) => {
      const channel = `anika:terminal:${id}:exit`
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on(channel, listener)

      return () => ipcRenderer.removeListener(channel, listener)
    }
  },
  onClosePreviewRequested: callback => {
    const listener = () => callback()
    ipcRenderer.on('anika:close-preview-requested', listener)

    return () => ipcRenderer.removeListener('anika:close-preview-requested', listener)
  },
  onPreviewNav: callback => {
    const listener = (_event, command) => callback(command)
    ipcRenderer.on('anika:preview-nav', listener)

    return () => ipcRenderer.removeListener('anika:preview-nav', listener)
  },
  onOpenFolderRequested: callback => {
    const listener = () => callback()
    ipcRenderer.on('anika:open-folder-requested', listener)

    return () => ipcRenderer.removeListener('anika:open-folder-requested', listener)
  },
  onOpenUpdatesRequested: callback => {
    const listener = () => callback()
    ipcRenderer.on('anika:open-updates', listener)

    return () => ipcRenderer.removeListener('anika:open-updates', listener)
  },
  onDeepLink: callback => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('anika:deep-link', listener)

    return () => ipcRenderer.removeListener('anika:deep-link', listener)
  },
  signalDeepLinkReady: () => ipcRenderer.invoke('anika:deep-link-ready'),
  probePluginRepo: payload => ipcRenderer.invoke('anika:plugin:probe', payload),
  installDesktopPlugin: payload => ipcRenderer.invoke('anika:plugin:installDesktop', payload),
  onWindowStateChanged: callback => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('anika:window-state-changed', listener)

    return () => ipcRenderer.removeListener('anika:window-state-changed', listener)
  },
  onFocusSession: callback => {
    const listener = (_event, sessionId) => callback(sessionId)
    ipcRenderer.on('anika:focus-session', listener)

    return () => ipcRenderer.removeListener('anika:focus-session', listener)
  },
  onNotificationAction: callback => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('anika:notification-action', listener)

    return () => ipcRenderer.removeListener('anika:notification-action', listener)
  },
  onNotificationActivate: callback => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('anika:notification-activate', listener)

    return () => ipcRenderer.removeListener('anika:notification-activate', listener)
  },
  onPreviewFileChanged: callback => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('anika:preview-file-changed', listener)

    return () => ipcRenderer.removeListener('anika:preview-file-changed', listener)
  },
  onBackendExit: callback => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('anika:backend-exit', listener)

    return () => ipcRenderer.removeListener('anika:backend-exit', listener)
  },
  // Soft gateway-mode apply finished tearing down the primary backend. Renderer
  // should wipe session lists + re-dial without a window reload.
  onConnectionApplied: callback => {
    const listener = () => callback()
    ipcRenderer.on('anika:connection:applied', listener)

    return () => ipcRenderer.removeListener('anika:connection:applied', listener)
  },
  onPowerResume: callback => {
    const listener = () => callback()
    ipcRenderer.on('anika:power-resume', listener)

    return () => ipcRenderer.removeListener('anika:power-resume', listener)
  },
  // AC ↔ battery transitions; renderers slow their backstop polls on battery.
  getOnBattery: () => ipcRenderer.invoke('anika:power-battery:get'),
  onBatteryChanged: callback => {
    const listener = (_event, onBattery) => callback(Boolean(onBattery))
    ipcRenderer.on('anika:power-battery', listener)

    return () => ipcRenderer.removeListener('anika:power-battery', listener)
  },
  onBootProgress: callback => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('anika:boot-progress', listener)

    return () => ipcRenderer.removeListener('anika:boot-progress', listener)
  },
  // First-launch bootstrap progress -- emitted by the install.ps1 stage
  // runner in main.ts (apps/desktop/electron/bootstrap-runner.ts).
  // Renderer's install overlay subscribes to live events and queries the
  // current snapshot via getBootstrapState() to recover after a devtools
  // reload mid-bootstrap.
  getBootstrapState: () => ipcRenderer.invoke('anika:bootstrap:get'),
  continueBootstrapLocal: () => ipcRenderer.invoke('anika:bootstrap:continue-local'),
  recycleBackend: profile => ipcRenderer.invoke('anika:backend:recycle', profile),
  resetBootstrap: () => ipcRenderer.invoke('anika:bootstrap:reset'),
  repairBootstrap: () => ipcRenderer.invoke('anika:bootstrap:repair'),
  cancelBootstrap: () => ipcRenderer.invoke('anika:bootstrap:cancel'),
  onBootstrapEvent: callback => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('anika:bootstrap:event', listener)

    return () => ipcRenderer.removeListener('anika:bootstrap:event', listener)
  },
  getVersion: () => ipcRenderer.invoke('anika:version'),
  relaunchApp: () => ipcRenderer.invoke('anika:app:relaunch'),
  getRemoteDisplayReason: () => ipcRenderer.invoke('anika:get-remote-display-reason'),
  uninstall: {
    summary: () => ipcRenderer.invoke('anika:uninstall:summary'),
    run: mode => ipcRenderer.invoke('anika:uninstall:run', { mode })
  },
  updates: {
    check: () => ipcRenderer.invoke('anika:updates:check'),
    apply: opts => ipcRenderer.invoke('anika:updates:apply', opts),
    getBranch: () => ipcRenderer.invoke('anika:updates:branch:get'),
    setBranch: name => ipcRenderer.invoke('anika:updates:branch:set', name),
    onProgress: callback => {
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on('anika:updates:progress', listener)

      return () => ipcRenderer.removeListener('anika:updates:progress', listener)
    }
  },
  themes: {
    fetchMarketplace: id => ipcRenderer.invoke('anika:vscode-theme:fetch', id),
    searchMarketplace: query => ipcRenderer.invoke('anika:vscode-theme:search', query)
  },
  // Find-in-page (Ctrl/Cmd+F): delegates to Electron's
  // webContents.findInPage on the IPC sender's window so a Cmd+F pressed
  // in a secondary session window searches THAT window, not the primary.
  // `onFoundInPage` returns the unsubscribe fn; the renderer wires it via
  // `initFindInPageListener` in store/find-in-page.ts and tears it down
  // when the FindBar unmounts.
  findInPage: (query, options) => ipcRenderer.invoke('anika:find-in-page', query, options),
  stopFindInPage: () => ipcRenderer.invoke('anika:stop-find-in-page'),
  onFoundInPage: callback => {
    const listener = (_event, result) => callback(result)
    ipcRenderer.on('anika:found-in-page', listener)

    return () => ipcRenderer.removeListener('anika:found-in-page', listener)
  },
  // Main-process `before-input-event` forwards Ctrl/Cmd+F here so renderer
  // can open the FindBar even when the GTK compositor has already grabbed
  // the chord at the windowing layer (#81727).
  onOpenFindBarRequested: callback => {
    const listener = () => callback()
    ipcRenderer.on('anika:open-find-bar', listener)

    return () => ipcRenderer.removeListener('anika:open-find-bar', listener)
  }
})
