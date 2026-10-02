const PATH = 'data/third/sync-configuration-webdav'
const ZIP_JS_FILE = PATH + '/zip.min.js'
const ZIP_JS_URL = 'https://cdn.jsdelivr.net/npm/@zip.js/zip.js@2.10.0/dist/zip.min.js'
const CACHE_DIR = 'data/.cache/sync-configuration-webdav'
const UPLOAD_FILE = CACHE_DIR + '/upload.zip'
const DOWNLOAD_FILE = CACHE_DIR + '/download.zip'

/** @type {EsmPlugin} */
export default async () => {
  let Zip = {}

  /**
   * Load the standalone zip.js browser bundle from data/third.
   *
   * dist/zip.min.js exposes a top-level `zip` object. We append one ES module
   * export and import it through a Blob URL, following the same local-module
   * loading approach used by plugin-node-convert.
   */
  const loadZipModule = async () => {
    const source = await Plugins.ReadFile(ZIP_JS_FILE)
    const moduleSource = source + '\nexport default zip;\n'
    const blob = new Blob([moduleSource], { type: 'text/javascript' })
    const url = URL.createObjectURL(blob)

    try {
      const module = await import(url)
      Zip = module.default || {}

      if (
        typeof Zip.ZipWriter !== 'function' ||
        typeof Zip.ZipReader !== 'function' ||
        typeof Zip.Uint8ArrayWriter !== 'function' ||
        typeof Zip.Uint8ArrayReader !== 'function'
      ) {
        throw new Error('zip.js module export is incomplete')
      }

      // Keep all compression/decompression in the plugin context.
      // This avoids worker URL/CSP issues in the GUI plugin runtime.
      Zip.configure?.({
        useWebWorkers: false
      })
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  const downloadDependency = async () => {
    await Plugins.Download(
      ZIP_JS_URL,
      ZIP_JS_FILE,
      {},
      undefined,
      {}
    )

    if (!(await Plugins.FileExists(ZIP_JS_FILE))) {
      throw new Error(`zip.js 下载失败：${ZIP_JS_FILE} 不存在`)
    }
  }

  const ensureDependency = async (force = false) => {
    if (
      force ||
      !(await Plugins.FileExists(ZIP_JS_FILE))
    ) {
      await downloadDependency()
    }

    await loadZipModule()
  }

  try {
    await ensureDependency()
  } catch (error) {
    console.error(
      '[sync-configuration-webdav] zip.js initialization failed:',
      error
    )
  }

  const getZip = () => {
    if (
      typeof Zip.ZipWriter !== 'function' ||
      typeof Zip.ZipReader !== 'function'
    ) {
      throw 'ZIP 模块不可用，请右键插件卡片执行「更新依赖」'
    }

    return Zip
  }

  const Update = async () => {
    await ensureDependency(true)
    Plugins.message.success('ZIP 依赖更新成功')
  }

  const onInstall = async () => {
    await Plugins.MakeDir(PATH)
    await Plugins.MakeDir(CACHE_DIR)
    await ensureDependency(true)
  }

  const onUninstall = async () => {
    await Plugins.ignoredError(Plugins.RemoveFile, PATH)
    await Plugins.ignoredError(Plugins.RemoveFile, CACHE_DIR)
  }

  const onRun = async () => {
    const action = await Plugins.picker.single(
      '请选择操作',
      [
        { label: '测试连接', value: 'Test' },
        { label: '立即备份', value: 'Backup' },
        { label: '同步至本地', value: 'Sync' },
        { label: '查看备份列表', value: 'List' },
        { label: '管理备份列表', value: 'Remove' }
      ],
      ['List']
    )

    const handlers = {
      Test,
      Backup,
      Sync,
      List,
      Remove
    }

    await handlers[action]()
  }

  const getPassword = () => {
    return String(Plugin.Password || '')
  }

  const Test = async () => {
    await checkConfiguration()

    const { destroy, success, error } =
      Plugins.message.info(
        '正在测试 WebDAV 连接...',
        60 * 1000
      )

    try {
      const dav = createWebDAV()
      await dav.propfind(Plugin.DataPath)
      success('WebDAV 连接成功，保存路径可访问')
    } catch (e) {
      error('WebDAV 连接失败：' + formatWebDAVError(e))
    } finally {
      await Plugins.sleep(3000)
      destroy()
    }
  }

  /**
   * Create one real ZIP archive and upload it to WebDAV.
   *
   * Password empty:
   *   normal ZIP
   *
   * Password present:
   *   zip.js AES AE-2 / AES-256 encrypted ZIP
   */
  const Backup = async () => {
    await checkConfiguration()
    await ensureDependency()

    const backupFilename = await getBackupFilename()
    const files = await collectBackupFiles()

    if (files.length === 0) {
      throw '没有找到可备份文件'
    }

    await Plugins.MakeDir(CACHE_DIR)
    await Plugins.ignoredError(
      Plugins.RemoveFile,
      UPLOAD_FILE
    )

    const { id } = Plugins.message.info(
      '正在创建 ZIP 备份...',
      60 * 60 * 1000
    )

    try {
      const bytes = await createBackupZip(
        files,
        (current, total, file) => {
          Plugins.message.update(
            id,
            `正在压缩...[ ${current}/${total} ] ${file}`
          )
        }
      )

      await writeBinaryFile(
        UPLOAD_FILE,
        bytes
      )

      await verifyLocalZipFile(
        UPLOAD_FILE
      )

      Plugins.message.update(
        id,
        '正在上传 WebDAV...',
        'info'
      )

      const dav = createWebDAV()
      const remotePath = joinPath(
        Plugin.DataPath,
        backupFilename
      )

      await dav.upload(
        remotePath,
        UPLOAD_FILE,
        !!Plugin.CreateOnNotExist
      )

      Plugins.message.update(
        id,
        getPassword()
          ? '加密 ZIP 备份完成'
          : 'ZIP 备份完成',
        'success'
      )
    } catch (error) {
      Plugins.message.update(
        id,
        '备份失败：' +
          (error?.message || error),
        'error'
      )
      throw error
    } finally {
      await Plugins.ignoredError(
        Plugins.RemoveFile,
        UPLOAD_FILE
      )
      await Plugins.sleep(1500)
      Plugins.message.destroy(id)
    }
  }

  /**
   * Download a ZIP archive, optionally decrypt it, then restore its data files.
   */
  const Sync = async () => {
    await checkConfiguration()
    await ensureDependency()

    const dav = createWebDAV()
    const list = await dav.propfind(Plugin.DataPath)
    const backups = filterBackupList(list)

    if (backups.length === 0) {
      throw '没有可同步的 ZIP 备份'
    }

    const href = await Plugins.picker.single(
      '请选择要同步至本地的备份',
      backups,
      [backups[0].value]
    )

    await Plugins.MakeDir(CACHE_DIR)
    await Plugins.ignoredError(
      Plugins.RemoveFile,
      DOWNLOAD_FILE
    )

    const {
      update,
      destroy,
      success,
      error
    } = Plugins.message.info(
      '正在下载 ZIP 备份...',
      60 * 60 * 1000
    )

    try {
      await dav.download(
        href,
        DOWNLOAD_FILE
      )

      update('正在读取 ZIP...', 'info')

      const bytes =
        await readBinaryFile(DOWNLOAD_FILE)

      const entries =
        await readBackupZip(bytes)

      const restorable = entries.filter(
        (entry) =>
          !entry.directory &&
          entry.filename !== '_gfc-backup.json'
      )

      if (restorable.length === 0) {
        throw 'ZIP 中没有可恢复的数据文件'
      }

      let restored = 0

      for (
        let i = 0;
        i < restorable.length;
        i++
      ) {
        const entry = restorable[i]
        const filename =
          normalizeBackupPath(
            entry.filename
          )

        update(
          `正在恢复...[ ${i + 1}/${restorable.length} ] ${filename}`,
          'info'
        )

        const text =
          await readZipEntryText(entry)

        await Plugins.WriteFile(
          filename,
          text
        )

        restored++
      }

      success(`同步完成，共恢复 ${restored} 个文件`)
      await Plugins.sleep(1200)

      const kernelApiStore =
        Plugins.useKernelApiStore()

      if (kernelApiStore.running) {
        await kernelApiStore.stopCore()
      }

      await Plugins.WindowReloadApp()
    } catch (e) {
      const message =
        formatZipError(e)

      error('同步失败：' + message)
      throw message
    } finally {
      await Plugins.ignoredError(
        Plugins.RemoveFile,
        DOWNLOAD_FILE
      )
      await Plugins.sleep(1500)
      destroy()
    }
  }

  const List = async () => {
    await checkConfiguration()

    const dav = createWebDAV()
    const list = await dav.propfind(Plugin.DataPath)
    const backups = filterBackupList(list)

    if (backups.length === 0) {
      throw '备份列表为空'
    }

    await Plugins.picker.single(
      'ZIP 备份列表',
      backups,
      []
    )
  }

  const Remove = async () => {
    await checkConfiguration()

    const dav = createWebDAV()
    const list = await dav.propfind(Plugin.DataPath)
    const backups = filterBackupList(list)

    if (backups.length === 0) {
      throw '没有可管理的 ZIP 备份'
    }

    const hrefs =
      await Plugins.picker.multi(
        '请勾选要删除的备份',
        backups,
        []
      )

    for (const href of hrefs) {
      await dav.delete(href)
    }

    Plugins.message.success(
      `已删除 ${hrefs.length} 个备份`
    )
  }

  const createWebDAV = () => {
    return new WebDAV(
      Plugin.Address,
      Plugin.Username,
      Plugin.WebDAVPassword
    )
  }

  /**
   * Collect the same GUI configuration/data files that the old plugin backed up.
   */
  const collectBackupFiles = async () => {
    const files = new Set([
      'data/user.yaml',
      'data/profiles.yaml',
      'data/subscribes.yaml',
      'data/rulesets.yaml',
      'data/plugins.yaml',
      'data/scheduledtasks.yaml'
    ])

    const subscribesStore =
      Plugins.useSubscribesStore()
    const pluginsStore =
      Plugins.usePluginsStore()
    const rulesetsStore =
      Plugins.useRulesetsStore()

    for (
      const path of subscribesStore.subscribes
        .map((v) => v.path)
    ) {
      if (isBackupPath(path)) {
        files.add(path)
      }
    }

    for (
      const path of pluginsStore.plugins
        .map((v) => v.path)
    ) {
      if (isBackupPath(path)) {
        files.add(path)
      }
    }

    for (
      const path of rulesetsStore.rulesets
        .map((v) => v.path)
    ) {
      if (
        isBackupPath(path) &&
        (
          path.endsWith('.yaml') ||
          path.endsWith('.yml') ||
          path.endsWith('.json')
        )
      ) {
        files.add(path)
      }
    }

    const existing = []

    for (const path of files) {
      if (
        await Plugins.FileExists(path)
      ) {
        existing.push(path)
      }
    }

    return existing.sort()
  }

  const isBackupPath = (path) => {
    if (typeof path !== 'string') {
      return false
    }

    const normalized =
      path.replaceAll('\\', '/')

    return (
      normalized.startsWith('data/') &&
      !normalized.includes('/../') &&
      !normalized.endsWith('/..') &&
      !normalized.startsWith('data/.cache/')
    )
  }

  const createBackupZip = async (
    files,
    onProgress
  ) => {
    const Zip = getZip()
    const password = getPassword()

    const options = password
      ? {
          password,
          encryptionStrength: 3
        }
      : {}

    const writer = new Zip.ZipWriter(
      new Zip.Uint8ArrayWriter(),
      options
    )

    try {
      const manifest = {
        format: 1,
        application: Plugins.APP_TITLE,
        applicationVersion:
          Plugins.APP_VERSION,
        createdAt:
          new Date().toISOString(),
        encrypted: !!password
      }

      await writer.add(
        '_gfc-backup.json',
        new Zip.TextReader(
          JSON.stringify(
            manifest,
            null,
            2
          )
        )
      )

      for (
        let i = 0;
        i < files.length;
        i++
      ) {
        const file = files[i]

        onProgress?.(
          i + 1,
          files.length,
          file
        )

        const text =
          await Plugins.ReadFile(file)

        await writer.add(
          file.replaceAll('\\', '/'),
          new Zip.TextReader(text)
        )
      }

      return await writer.close()
    } catch (error) {
      await writer.close().catch(() => {})
      throw error
    }
  }

  const readBackupZip = async (bytes) => {
    const Zip = getZip()
    const password = getPassword()

    const reader = new Zip.ZipReader(
      new Zip.Uint8ArrayReader(bytes),
      password
        ? { password }
        : {}
    )

    try {
      const entries =
        await reader.getEntries()

      // Keep the reader alive while the entries are being used.
      // getData() depends on it.
      for (const entry of entries) {
        entry.__gfcReader = reader
      }

      return entries
    } catch (error) {
      await reader.close().catch(() => {})
      throw error
    }
  }

  const readZipEntryText = async (
    entry
  ) => {
    const Zip = getZip()
    const password = getPassword()

    try {
      return await entry.getData(
        new Zip.TextWriter(),
        password
          ? { password }
          : {}
      )
    } catch (error) {
      throw error
    }
  }

  /**
   * Only restore safe data/* relative paths.
   */
  const normalizeBackupPath = (
    filename
  ) => {
    const path = String(filename || '')
      .replaceAll('\\', '/')
      .replace(/^\/+/, '')

    const parts = path.split('/')

    if (
      !path.startsWith('data/') ||
      parts.some(
        (part) =>
          part === '..' ||
          part === ''
      )
    ) {
      throw `ZIP 中包含不安全的路径：${filename}`
    }

    return path
  }

  /**
   * Binary mode in GUI-for-Cores transports file content as Base64 text.
   *
   * Therefore:
   *   Uint8Array -> Base64 -> Plugins.WriteFile(..., { Mode: 'Binary' })
   *   Plugins.ReadFile(..., { Mode: 'Binary' }) -> Base64 -> Uint8Array
   *
   * Passing a raw binary string here causes the backend error:
   *   "illegal base data at input ..."
   */
  const uint8ArrayToBase64 = (
    bytes
  ) => {
    let binary = ''
    const chunkSize = 0x8000

    for (
      let offset = 0;
      offset < bytes.length;
      offset += chunkSize
    ) {
      binary += String.fromCharCode(
        ...bytes.subarray(
          offset,
          offset + chunkSize
        )
      )
    }

    return btoa(binary)
  }

  const base64ToUint8Array = (
    encoded
  ) => {
    const binary = atob(
      String(encoded || '')
    )

    const bytes =
      new Uint8Array(binary.length)

    for (
      let i = 0;
      i < binary.length;
      i++
    ) {
      bytes[i] =
        binary.charCodeAt(i)
    }

    return bytes
  }

  const writeBinaryFile = async (
    path,
    bytes
  ) => {
    await Plugins.WriteFile(
      path,
      uint8ArrayToBase64(bytes),
      { Mode: 'Binary' }
    )
  }

  const readBinaryFile = async (
    path
  ) => {
    const encoded =
      await Plugins.ReadFile(
        path,
        { Mode: 'Binary' }
      )

    return base64ToUint8Array(
      encoded
    )
  }

  /**
   * Verify that the temporary archive was really written as a non-empty ZIP
   * before WebDAV upload.
   */
  const verifyLocalZipFile = async (
    path
  ) => {
    const name = path
      .replaceAll('\\', '/')
      .split('/')
      .pop()

    const dir = path
      .replaceAll('\\', '/')
      .split('/')
      .slice(0, -1)
      .join('/')

    const entries =
      await Plugins.ReadDir(dir)

    const file =
      entries.find(
        (entry) =>
          !entry.isDir &&
          entry.name === name
      )

    if (!file || file.size <= 4) {
      throw `ZIP 临时文件为空：${path}`
    }

    const bytes =
      await readBinaryFile(path)

    if (
      bytes.length <= 4 ||
      bytes[0] !== 0x50 ||
      bytes[1] !== 0x4b
    ) {
      throw '生成的临时文件不是有效的 ZIP 数据'
    }
  }

  const getPrefix = () => {
    return Plugins.APP_TITLE.includes(
      'Clash'
    )
      ? 'GUI.for.Clash'
      : 'GUI.for.SingBox'
  }

  const getBackupFilename = async () => {
    const defaultFilename =
      getPrefix() +
      '-' +
      Plugins.APP_VERSION +
      '_' +
      Plugins.formatDate(
        Date.now(),
        'YYYYMMDD-HHmmss'
      ) +
      '.zip'

    const input =
      (
        await Plugins.prompt(
          '备份文件名',
          defaultFilename
        )
      ) || defaultFilename

    if (
      !input.startsWith(getPrefix()) ||
      !input.endsWith('.zip') ||
      /[\\/:*?"<>|]/.test(input)
    ) {
      throw (
        '备份文件名必须以 ' +
        getPrefix() +
        ' 开头、以 .zip 结尾，且不能包含 \\ / : * ? " < > |'
      )
    }

    return input
  }

  const filterBackupList = (list) => {
    const prefix = getPrefix()

    return list
      .filter(
        (item) =>
          item.displayname
            .startsWith(prefix) &&
          item.displayname
            .toLowerCase()
            .endsWith('.zip')
      )
      .map((item) => ({
        label: item.displayname,
        value: item.href,
        description:
          item.lastModified !== 'N/A'
            ? item.lastModified
            : undefined
      }))
      .reverse()
  }

  const checkConfiguration = async () => {
    let url

    try {
      url = new URL(Plugin.Address)
    } catch {
      throw 'WebDAV 连接地址配置不正确'
    }

    if (
      url.protocol !== 'http:' &&
      url.protocol !== 'https:'
    ) {
      throw 'WebDAV 连接地址必须使用 http 或 https'
    }
  }

  const formatWebDAVError = (
    error
  ) => {
    const message = String(
      error?.message ||
      error ||
      '未知错误'
    )

    if (
      message.includes('401') ||
      message.includes('403')
    ) {
      return 'WebDAV 用户名、密码或权限错误'
    }

    if (message.includes('404')) {
      return 'WebDAV 保存路径不存在'
    }

    if (message.includes('405')) {
      return 'WebDAV 请求方法不被允许'
    }

    if (
      /<!doctype html|<html/i.test(
        message
      )
    ) {
      return '服务器返回了 HTML 页面，请检查 WebDAV 连接地址'
    }

    return message
  }

  const formatZipError = (
    error
  ) => {
    const message = String(
      error?.message ||
      error ||
      '未知错误'
    )

    if (
      /password|encrypted|signature|authentication/i
        .test(message)
    ) {
      return 'ZIP 密码错误，或该备份需要密码'
    }

    return message
  }

  function joinPath(...parts) {
    return parts
      .filter(
        (part) =>
          part !== undefined &&
          part !== null &&
          String(part) !== ''
      )
      .map(
        (part) =>
          String(part).replace(
            /^\/+|\/+$/g,
            ''
          )
      )
      .filter(Boolean)
      .join('/')
  }

  /**
   * Encode arbitrary UTF-8 text as Base64.
   *
   * Plugins.base64Encode may expect byte-oriented/ASCII input. Converting the
   * credentials to a binary string first avoids "illegal base data" failures
   * when the WebDAV username or password contains non-ASCII characters.
   */
  const base64EncodeUtf8 = (text) => {
    const bytes = new TextEncoder().encode(String(text))
    let binary = ''

    const chunkSize = 0x8000
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      binary += String.fromCharCode(
        ...bytes.subarray(offset, offset + chunkSize)
      )
    }

    return btoa(binary)
  }

  class WebDAV {
    constructor(
      address,
      username,
      password
    ) {
      this.address =
        String(address)
          .replace(/\/+$/, '') + '/'

      this.baseURL =
        new URL(this.address)

      this.username =
        String(username || '')
      this.password =
        String(password || '')

      this.headers = {
        Authorization:
          'Basic ' +
          base64EncodeUtf8(
            String(username || '') +
            ':' +
            String(password || '')
          )
      }
    }

    resolveDataURL(path = '') {
      const relative =
        String(path || '')
          .replace(
            /^\/+|\/+$/g,
            ''
          )

      if (!relative) {
        return this.address
      }

      return new URL(
        relative + '/',
        this.address
      ).href
    }

    resolveRelativeFileURL(path) {
      const relative =
        String(path || '')
          .replace(/^\/+/, '')

      return new URL(
        relative,
        this.address
      ).href
    }

    resolveHref(href) {
      const value =
        String(href || '')

      if (
        /^https?:\/\//i.test(value)
      ) {
        return value
      }

      if (value.startsWith('/')) {
        return new URL(
          value,
          this.baseURL.origin
        ).href
      }

      return new URL(
        value,
        this.address
      ).href
    }

    async propfind(path = '') {
      const url =
        this.resolveDataURL(path)

      const {
        body,
        status
      } = await Plugins.Requests({
        method: 'PROPFIND',
        url,
        headers: {
          ...this.headers,
          Depth: '1',
          'Content-Type':
            'application/xml; charset=utf-8'
        }
      })

      if (status !== 207) {
        throw (
          `WebDAV PROPFIND failed: ` +
          `${status} ${body}`
        )
      }

      return this.parsePropfind(body)
    }

    parsePropfind(body) {
      const list = []
      const parser =
        new DOMParser()

      const xml =
        parser.parseFromString(
          body,
          'application/xml'
        )

      const localName = (node) =>
        (
          node.localName ||
          node.tagName
            ?.split(':')
            .pop() ||
          ''
        ).toLowerCase()

      const responses = Array
        .from(
          xml.getElementsByTagName('*')
        )
        .filter(
          (node) =>
            localName(node) ===
            'response'
        )

      const getText = (
        element,
        name
      ) => {
        const wanted =
          name.toLowerCase()

        for (
          const node of
            element.getElementsByTagName(
              '*'
            )
        ) {
          if (
            localName(node) === wanted
          ) {
            return node.textContent || ''
          }
        }

        return ''
      }

      for (
        const response of responses
      ) {
        const resourceType =
          Array.from(
            response
              .getElementsByTagName('*')
          )
            .filter(
              (node) =>
                localName(node) ===
                'resourcetype'
            )[0]

        const isCollection =
          resourceType
            ? Array.from(
                resourceType
                  .getElementsByTagName(
                    '*'
                  )
              ).some(
                (node) =>
                  localName(node) ===
                  'collection'
              )
            : false

        if (isCollection) {
          continue
        }

        const href =
          getText(response, 'href')

        if (!href) {
          continue
        }

        let decoded = href

        try {
          decoded =
            decodeURIComponent(href)
        } catch {}

        decoded =
          decoded.replace(/\/+$/, '')

        const displayname =
          getText(
            response,
            'displayname'
          ) ||
          decoded.substring(
            decoded.lastIndexOf('/') + 1
          )

        list.push({
          href,
          displayname,
          lastModified:
            getText(
              response,
              'getlastmodified'
            ) || 'N/A'
        })
      }

      return list
    }

    async upload(
      relativePath,
      localPath,
      createOnNotExist
    ) {
      const path =
        String(relativePath || '')
          .replace(/^\/+/, '')

      if (createOnNotExist) {
        const slash =
          path.lastIndexOf('/')

        const parent =
          slash >= 0
            ? path.slice(0, slash)
            : ''

        await this.mkdirRecursive(
          parent
        )
      }

      const url =
        this.resolveRelativeFileURL(
          path
        )

      const absolutePath =
        await Plugins.AbsolutePath(
          localPath
        )

      const args = [
        '--silent',
        '--show-error',
        '--fail-with-body',
        '--location',
        '--request',
        'PUT',
        '--header',
        'Content-Type: application/zip',
        '--upload-file',
        absolutePath
      ]

      if (
        this.username ||
        this.password
      ) {
        args.push(
          '--user',
          `${this.username}:${this.password}`
        )
      }

      args.push(url)

      try {
        await Plugins.Exec(
          'curl',
          args
        )
      } catch (error) {
        throw (
          'WebDAV PUT failed: ' +
          (error?.message || error)
        )
      }
    }

    async download(
      href,
      localPath
    ) {
      const url =
        this.resolveHref(href)

      const absolutePath =
        await Plugins.AbsolutePath(
          localPath
        )

      const args = [
        '--silent',
        '--show-error',
        '--fail-with-body',
        '--location',
        '--output',
        absolutePath
      ]

      if (
        this.username ||
        this.password
      ) {
        args.push(
          '--user',
          `${this.username}:${this.password}`
        )
      }

      args.push(url)

      try {
        await Plugins.Exec(
          'curl',
          args
        )
      } catch (error) {
        throw (
          'WebDAV GET failed: ' +
          (error?.message || error)
        )
      }

      if (!(await Plugins.FileExists(localPath))) {
        throw 'WebDAV 下载完成后文件不存在'
      }
    }

    async delete(href) {
      const {
        body,
        status
      } = await Plugins.Requests({
        method: 'DELETE',
        url: this.resolveHref(href),
        headers: this.headers
      })

      if (
        ![
          200,
          204
        ].includes(status)
      ) {
        throw (
          `WebDAV DELETE failed: ` +
          `${status} ${body || ''}`
        )
      }
    }

    async mkdirRecursive(
      relativePath
    ) {
      const segments =
        String(relativePath || '')
          .split('/')
          .filter(Boolean)

      let current = ''

      for (
        const segment of segments
      ) {
        current =
          joinPath(
            current,
            segment
          )

        const url =
          new URL(
            current + '/',
            this.address
          ).href

        const {
          body,
          status
        } =
          await Plugins.Requests({
            method: 'MKCOL',
            url,
            headers: this.headers
          })

        if (
          ![
            200,
            201,
            204,
            405
          ].includes(status)
        ) {
          throw (
            `MKCOL failed: ` +
            `${status} ${body || ''}`
          )
        }
      }
    }
  }

  return {
    onInstall,
    onUninstall,
    onRun,
    Update,
    Test,
    Backup,
    Sync,
    List,
    Remove
  }
}
