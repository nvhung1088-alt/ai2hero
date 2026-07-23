importScripts("/js/function.js", "/js/init.js");

// Service Worker 5分钟后会强制终止扩展
// https://bugs.chromium.org/p/chromium/issues/detail?id=1271154
// https://stackoverflow.com/questions/66618136/persistent-service-worker-in-chrome-extension/70003493#70003493
chrome.webNavigation.onBeforeNavigate.addListener(function () { return; });
chrome.webNavigation.onHistoryStateUpdated.addListener(function () { return; });
chrome.runtime.onConnect.addListener(function (Port) {
    if (chrome.runtime.lastError || Port.name !== "HeartBeat") return;
    Port.postMessage("HeartBeat");
    Port.onMessage.addListener(function (message, Port) { return; });
    const interval = setInterval(function () {
        clearInterval(interval);
        Port.disconnect();
    }, 250000);
    Port.onDisconnect.addListener(function () {
        interval && clearInterval(interval);
        if (chrome.runtime.lastError) { return; }
    });
});

const AI2HERO_FOLDER_MARKER = "_ai2hero_open_folder.txt";
const AI2HERO_MARKER_DOWNLOADS_KEY = "herovideo_marker_downloads";

function sanitizeWorkspaceSlug(workspaceSlug) {
    return String(workspaceSlug || "")
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

function openDownloadWhenComplete(downloadId, sendResponse) {
    let settled = false;
    let timeout = null;
    const listener = (delta) => {
        if (delta.id !== downloadId || delta.state?.current !== "complete") return;
        finish();
    };
    function finish() {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        chrome.downloads.onChanged.removeListener(listener);
        chrome.downloads.show(downloadId);
        sendResponse?.({ ok: true, downloadId });
    }

    timeout = setTimeout(() => {
        finish();
    }, 1500);

    chrome.downloads.onChanged.addListener(listener);
}

function ensureWorkspaceFolder(subfolderPath, openFolder, sendResponse) {
    if (!subfolderPath) {
        sendResponse?.({ ok: false, error: "missing_subfolder_path" });
        return;
    }

    const filename = `${subfolderPath}/${AI2HERO_FOLDER_MARKER}`;
    const markerText = "AI2Hero folder marker. Safe to keep.";
    const url = "data:text/plain;charset=utf-8," + encodeURIComponent(markerText);

    chrome.downloads.download({
        url,
        filename,
        saveAs: false,
        conflictAction: "overwrite"
    }, function (downloadId) {
        if (chrome.runtime.lastError || !downloadId) {
            sendResponse?.({ ok: false, error: chrome.runtime.lastError?.message || "download_failed" });
            return;
        }

        chrome.storage.local.get([AI2HERO_MARKER_DOWNLOADS_KEY], function (res) {
            const markers = res[AI2HERO_MARKER_DOWNLOADS_KEY] || {};
            markers[subfolderPath] = downloadId;
            chrome.storage.local.set({ [AI2HERO_MARKER_DOWNLOADS_KEY]: markers });
        });

        if (openFolder) {
            openDownloadWhenComplete(downloadId, sendResponse);
            return;
        }

        sendResponse?.({ ok: true, downloadId });
    });
}

/**
 *  定时任务
 *  nowClear clear 清理冗余数据
 *  save 保存数据
 */
chrome.alarms.onAlarm.addListener(function (alarm) {
    if (alarm.name === "nowClear" || alarm.name === "clear") {
        clearRedundant();
        return;
    }
    if (alarm.name === "save") {
        (chrome.storage.session ?? chrome.storage.local).set({ MediaData: cacheData });
        return;
    }
});

// onBeforeRequest 浏览器发送请求之前使用正则匹配发送请求的URL
// chrome.webRequest.onBeforeRequest.addListener(
//     function (data) {
//         try { findMedia(data, true); } catch (e) { console.log(e); }
//     }, { urls: ["<all_urls>"] }, ["requestBody"]
// );
// 保存requestHeaders
chrome.webRequest.onSendHeaders.addListener(
    function (data) {
        if (G && G.initSyncComplete && !G.enable) { return; }
        if (data.requestHeaders) {
            G.requestHeaders.set(data.requestId, data.requestHeaders);
            data.allRequestHeaders = data.requestHeaders;
        }
        try { findMedia(data, true); } catch (e) { console.log(e); }
    }, { urls: ["<all_urls>"] }, ['requestHeaders',
        chrome.webRequest.OnBeforeSendHeadersOptions.EXTRA_HEADERS].filter(Boolean)
);
// onResponseStarted 浏览器接收到第一个字节触发，保证有更多信息判断资源类型
chrome.webRequest.onResponseStarted.addListener(
    function (data) {
        try {
            data.allRequestHeaders = G.requestHeaders.get(data.requestId);
            if (data.allRequestHeaders) {
                G.requestHeaders.delete(data.requestId);
            }
            findMedia(data);
        } catch (e) { console.log(e, data); }
    }, { urls: ["<all_urls>"] }, ["responseHeaders"]
);
// 删除失败的requestHeadersData
chrome.webRequest.onErrorOccurred.addListener(
    function (data) {
        G.requestHeaders.delete(data.requestId);
        G.blackList.delete(data.requestId);
    }, { urls: ["<all_urls>"] }
);

function findMedia(data, isRegex = false, filter = false, timer = false) {
    // Service Worker被强行杀死之后重新自我唤醒，等待全局变量初始化完成。
    if (!G || !G.initSyncComplete || !G.initLocalComplete || G.tabId == undefined || cacheData.init) {
        if (timer) { return; }
        setTimeout(() => {
            findMedia(data, isRegex, filter, true);
        }, 500);
        return;
    }

    if (G.damn && G.damnUrlSet.has(data.tabId)) {
        return;
    }

    // 检查 是否启用 是否在当前标签是否在屏蔽列表中
    const blockUrlFlag = data.tabId && data.tabId > 0 && G.blockUrlSet.has(data.tabId);
    if (!G.enable || (G.blockUrlWhite ? !blockUrlFlag : blockUrlFlag)) {
        return;
    }

    data.getTime = Date.now();

    if (!isRegex && G.blackList.has(data.requestId)) {
        G.blackList.delete(data.requestId);
        return;
    }
    // 屏蔽特殊页面发起的资源
    if (data.initiator != "null" &&
        data.initiator != undefined &&
        isSpecialPage(data.initiator)) { return; }
    if (G.isFirefox &&
        data.originUrl &&
        isSpecialPage(data.originUrl)) { return; }
    // 屏蔽特殊页面的资源
    if (isSpecialPage(data.url)) { return; }
    const urlParsing = new URL(data.url);
    let [name, ext] = fileNameParse(urlParsing.pathname);

    //正则匹配
    if (isRegex && !filter) {
        for (let key in G.Regex) {
            if (!G.Regex[key].state) { continue; }
            G.Regex[key].regex.lastIndex = 0;
            let result = G.Regex[key].regex.exec(data.url);
            if (result == null) { continue; }
            if (G.Regex[key].blackList) {
                G.blackList.add(data.requestId);
                return;
            }
            data.extraExt = G.Regex[key].ext ? G.Regex[key].ext : undefined;
            if (result.length == 1) {
                findMedia(data, true, true);
                return;
            }
            result.shift();
            result = result.map(str => decodeURIComponent(str));
            if (!result[0].startsWith('https://') && !result[0].startsWith('http://')) {
                result[0] = urlParsing.protocol + "//" + data.url;
            }
            data.url = result.join("");
            findMedia(data, true, true);
            return;
        }
        return;
    }

    // 非正则匹配
    if (!isRegex) {
        // 获取头部信息
        data.header = getResponseHeadersValue(data);
        //检查后缀
        if (!filter && ext != undefined) {
            filter = CheckExtension(ext, data.header?.size);
            if (filter == "break") { return; }
        }
        //检查类型
        if (!filter && data.header?.type != undefined) {
            filter = CheckType(data.header.type, data.header?.size);
            if (filter == "break") { return; }
        }
        //查找附件
        if (!filter && data.header?.attachment != undefined) {
            const res = data.header.attachment.match(reFilename);
            if (res && res[1]) {
                [name, ext] = fileNameParse(decodeURIComponent(res[1]));
                filter = CheckExtension(ext, 0);
                if (filter == "break") { return; }
            }
        }
        //放过类型为media的资源
        if (data.type == "media") {
            filter = true;
        }
    }

    if (!filter) { return; }

    // 谜之原因 获取得资源 tabId可能为 -1 firefox中则正常
    // 检查是 -1 使用当前激活标签得tabID
    data.tabId = data.tabId == -1 ? G.tabId : data.tabId;

    cacheData[data.tabId] ??= [];
    cacheData[G.tabId] ??= [];

    // 缓存数据大于9999条 清空缓存 避免内存占用过多
    if (cacheData[data.tabId].length > G.maxLength) {
        cacheData[data.tabId] = [];
        (chrome.storage.session ?? chrome.storage.local).set({ MediaData: cacheData });
        return;
    }

    // 查重 避免CPU占用 大于500 强制关闭查重
    // if (G.checkDuplicates && cacheData[data.tabId].length <= 500) {
    //     for (let item of cacheData[data.tabId]) {
    //         if (item.url.length == data.url.length &&
    //             item.cacheURL.pathname == urlParsing.pathname &&
    //             item.cacheURL.host == urlParsing.host &&
    //             item.cacheURL.search == urlParsing.search) { return; }
    //     }
    // }

    if (G.checkDuplicates && cacheData[data.tabId].length <= 500) {
        const tabFingerprints = G.urlMap.get(data.tabId) || new Set();
        if (tabFingerprints.has(data.url)) {
            return; // 找到重复，直接返回
        }
        tabFingerprints.add(data.url);
        G.urlMap.set(data.tabId, tabFingerprints);
        if (tabFingerprints.size >= 500) {
            tabFingerprints.clear();
        }
    }

    chrome.tabs.get(data.tabId, async function (webInfo) {
        if (chrome.runtime.lastError) { return; }
        data.requestHeaders = getRequestHeaders(data);
        // requestHeaders 中cookie 单独列出来
        if (data.requestHeaders?.cookie) {
            data.cookie = data.requestHeaders.cookie;
            data.requestHeaders.cookie = undefined;
        }
        const info = {
            name: name,
            url: data.url,
            size: data.header?.size,
            ext: ext,
            type: data.mime ?? data.header?.type,
            tabId: data.tabId,
            isRegex: isRegex,
            requestId: data.requestId ?? Date.now().toString(),
            initiator: data.initiator,
            requestHeaders: data.requestHeaders,
            cookie: data.cookie,
            // cacheURL: { host: urlParsing.host, search: urlParsing.search, pathname: urlParsing.pathname },
            getTime: data.getTime
        };
        // 不存在扩展使用类型
        if (info.ext === undefined && info.type !== undefined) {
            info.ext = info.type.split("/")[1];
        }
        // 正则匹配的备注扩展
        if (data.extraExt) {
            info.ext = data.extraExt;
        }
        // 不存在 initiator 和 referer 使用web url代替initiator
        if (info.initiator == undefined || info.initiator == "null") {
            info.initiator = info.requestHeaders?.referer ?? webInfo?.url;
        }
        // 装载页面信息
        info.title = webInfo?.title ?? "NULL";
        info.favIconUrl = webInfo?.favIconUrl;
        info.webUrl = webInfo?.url;
        // 屏蔽资源
        if (!isRegex && G.blackList.has(data.requestId)) {
            G.blackList.delete(data.requestId);
            return;
        }
        // 发送到popup 并检查自动下载
        chrome.runtime.sendMessage({ Message: "popupAddData", data: info }, function () {
            if (G.featAutoDownTabId.size > 0 && G.featAutoDownTabId.has(info.tabId) && chrome.downloads?.State) {
                try {
                    const downDir = info.title == "NULL" ? "CatCatch/" : stringModify(info.title) + "/";
                    let fileName = isEmpty(info.name) ? stringModify(info.title) + '.' + info.ext : decodeURIComponent(stringModify(info.name));
                    if (G.TitleName) {
                        fileName = filterFileName(templates(G.downFileName, info));
                    } else {
                        fileName = downDir + fileName;
                    }
                    chrome.storage.local.get(['herovideo_subfolder'], function(res) {
                        const subfolder = res.herovideo_subfolder || "";
                        const fullPath = subfolder ? (subfolder.endsWith('/') ? subfolder : subfolder + '/') + fileName : fileName;
                        chrome.downloads.download({
                            url: info.url,
                            filename: fullPath
                        });
                    });
                } catch (e) { return; }
            }
            if (chrome.runtime.lastError) { return; }
        });

        // 数据发送
        if (G.send2local) {
            try { send2local("catch", { ...info, requestHeaders: data.allRequestHeaders }, info.tabId); } catch (e) { console.log(e); }
        }

        // 储存数据
        cacheData[info.tabId] ??= [];
        cacheData[info.tabId].push(info);

        // 当前标签媒体数量大于100 开启防抖 等待5秒储存 或 积累10个资源储存一次。
        if (cacheData[info.tabId].length >= 100 && debounceCount <= 10) {
            debounceCount++;
            clearTimeout(debounce);
            debounce = setTimeout(function () { save(info.tabId); }, 5000);
            return;
        }
        // 时间间隔小于500毫秒 等待2秒储存
        if (Date.now() - debounceTime <= 500) {
            clearTimeout(debounce);
            debounceTime = Date.now();
            debounce = setTimeout(function () { save(info.tabId); }, 2000);
            return;
        }
        save(info.tabId);
    });
}
// cacheData数据 储存到 chrome.storage.local
function save(tabId) {
    clearTimeout(debounce);
    debounceTime = Date.now();
    debounceCount = 0;
    if (cacheData[tabId]) {
        // 单个标签数据超过99条 不再保存到storage
        if (cacheData[tabId]?.length <= 99) {
            (chrome.storage.session ?? chrome.storage.local).set({ MediaData: cacheData }, function () {
                chrome.runtime.lastError && console.log(chrome.runtime.lastError);
            });
        }
        SetIcon({ number: cacheData[tabId].length, tabId: tabId });
    }
}

/**
 * 监听 扩展 message 事件
 */
chrome.runtime.onMessage.addListener(function (Message, sender, sendResponse) {
    if (chrome.runtime.lastError) { return; }

    // [AI2HERO] Mở thư mục download mặc định của Chrome
    if (Message.Message == "ensureWorkspaceFolder") {
        const targetPath = Message.subfolderPath || Message.workspaceSlug;
        ensureWorkspaceFolder(targetPath, Boolean(Message.open), sendResponse);
        return true;
    }

    if (Message.Message == "openDefaultFolder") {
        try {
            chrome.storage.local.get(['herovideo_subfolder'], function(res) {
                const subfolder = res.herovideo_subfolder || "";
                if (subfolder) {
                    ensureWorkspaceFolder(subfolder, true, sendResponse);
                    return;
                }
                chrome.downloads.showDefaultFolder();
                sendResponse("ok");
            });
        } catch (err) {
            console.error("Error opening default folder:", err);
            sendResponse("error");
        }
        return true;
    }

    if (!G.initLocalComplete || !G.initSyncComplete) {
        sendResponse("error");
        return true;
    }
    // 以下检查是否有 tabId 不存在使用当前标签
    Message.tabId = Message.tabId ?? G.tabId;

    // 从缓存中保存数据到本地
    if (Message.Message == "pushData") {
        (chrome.storage.session ?? chrome.storage.local).set({ MediaData: cacheData });
        sendResponse("ok");
        return true;
    }
    // 获取所有数据
    if (Message.Message == "getAllData") {
        sendResponse(cacheData);
        return true;
    }
    /**
     * 设置扩展图标数字
     * 提供 type 删除标签为 tabId 的数字
     * 不提供type 删除所有标签的数字
     */
    if (Message.Message == "ClearIcon") {
        Message.type ? SetIcon({ tabId: Message.tabId }) : SetIcon();
        sendResponse("ok");
        return true;
    }
    // 启用/禁用扩展
    if (Message.Message == "enable") {
        G.enable = !G.enable;
        chrome.storage.sync.set({ enable: G.enable });
        chrome.action.setIcon({ path: G.enable ? "/img/icon.png" : "/img/icon-disable.png" });
        sendResponse(G.enable);
        return true;
    }
    /**
     * 提供requestId数组 获取指定的数据
     */
    if (Message.Message == "getData" && Message.requestId) {
        // 判断Message.requestId是否数组
        if (!Array.isArray(Message.requestId)) {
            Message.requestId = [Message.requestId];
        }
        const response = [];
        if (Message.requestId.length) {
            for (let item in cacheData) {
                for (let data of cacheData[item]) {
                    if (Message.requestId.includes(data.requestId)) {
                        response.push(data);
                    }
                }
            }
        }
        sendResponse(response.length ? response : "error");
        return true;
    }
    /**
     * 提供 tabId 获取该标签数据
     */
    if (Message.Message == "getData") {
        sendResponse(cacheData[Message.tabId]);
        return true;
    }
    /**
     * 获取各按钮状态
     * 模拟手机 自动下载 启用 以及各种脚本状态
     */
    if (Message.Message == "getButtonState") {
        let state = {
            MobileUserAgent: G.featMobileTabId.has(Message.tabId),
            AutoDown: G.featAutoDownTabId.has(Message.tabId),
            enable: G.enable,
        }
        G.scriptList.forEach(function (item, key) {
            state[item.key] = item.tabId.has(Message.tabId);
        });
        sendResponse(state);
        return true;
    }
    // 对tabId的标签 进行模拟手机操作
    if (Message.Message == "mobileUserAgent") {
        mobileUserAgent(Message.tabId, !G.featMobileTabId.has(Message.tabId));
        chrome.tabs.reload(Message.tabId, { bypassCache: true });
        sendResponse("ok");
        return true;
    }
    // 对tabId的标签 开启 关闭 自动下载
    if (Message.Message == "autoDown") {
        if (G.featAutoDownTabId.has(Message.tabId)) {
            G.featAutoDownTabId.delete(Message.tabId);
        } else {
            G.featAutoDownTabId.add(Message.tabId);
        }
        (chrome.storage.session ?? chrome.storage.local).set({ featAutoDownTabId: Array.from(G.featAutoDownTabId) });
        sendResponse("ok");
        return true;
    }
    // 对tabId的标签 脚本注入或删除
    if (Message.Message == "script") {
        if (G.damn && G.damnUrlSet.has(Message.tabId)) {
            return;
        }
        if (!G.scriptList.has(Message.script)) {
            sendResponse("error no exists");
            return false;
        }
        const script = G.scriptList.get(Message.script);
        const scriptTabid = script.tabId;
        const refresh = Message.refresh ?? script.refresh;
        if (scriptTabid.has(Message.tabId)) {
            scriptTabid.delete(Message.tabId);
            if (Message.script == "search.js") {
                G.deepSearchTemporarilyClose = Message.tabId;
            }
            refresh && chrome.tabs.reload(Message.tabId, { bypassCache: true });
            sendResponse("ok");
            return true;
        }
        scriptTabid.add(Message.tabId);
        if (refresh) {
            chrome.tabs.reload(Message.tabId, { bypassCache: true });
        } else {
            const files = [`catch-script/${Message.script}`];
            script.i18n && files.unshift("catch-script/i18n.js");
            chrome.scripting.executeScript({
                target: { tabId: Message.tabId, allFrames: script.allFrames },
                files: files,
                injectImmediately: true,
                world: script.world
            });
        }
        sendResponse("ok");
        return true;
    }
    // 脚本注入 脚本申请多语言文件
    if (Message.Message == "scriptI18n") {
        chrome.scripting.executeScript({
            target: { tabId: Message.tabId, allFrames: true },
            files: ["catch-script/i18n.js"],
            injectImmediately: true,
            world: "MAIN"
        });
        sendResponse("ok");
        return true;
    }
    // Heart Beat
    if (Message.Message == "HeartBeat") {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs[0] && tabs[0].id) {
                G.tabId = tabs[0].id;
            }
        });
        sendResponse("HeartBeat OK");
        return true;
    }
    // 清理数据
    if (Message.Message == "clearData") {
        // 当前标签
        if (Message.type) {
            delete cacheData[Message.tabId];
            (chrome.storage.session ?? chrome.storage.local).set({ MediaData: cacheData });
            clearRedundant();
            sendResponse("OK");
            return true;
        }
        // 其他标签
        for (let item in cacheData) {
            if (item == Message.tabId) { continue; }
            delete cacheData[item];
        }
        (chrome.storage.session ?? chrome.storage.local).set({ MediaData: cacheData });
        clearRedundant();
        sendResponse("OK");
        return true;
    }
    // 清理冗余数据
    if (Message.Message == "clearRedundant") {
        clearRedundant();
        sendResponse("OK");
        return true;
    }
    // 从 content-script 或 catch-script 传来的媒体url
    if (Message.Message == "addMedia") {
        chrome.tabs.query({}, function (tabs) {
            for (let item of tabs) {
                if (item.url == Message.href) {
                    findMedia({ url: Message.url, tabId: item.id, extraExt: Message.extraExt, mime: Message.mime, requestId: Message.requestId, requestHeaders: Message.requestHeaders }, true, true);
                    return true;
                }
            }
            findMedia({ url: Message.url, tabId: -1, extraExt: Message.extraExt, mime: Message.mime, requestId: Message.requestId, initiator: Message.href, requestHeaders: Message.requestHeaders }, true, true);
        });
        sendResponse("ok");
        return true;
    }
    // ffmpeg网页通信
    if (Message.Message == "catCatchFFmpeg") {
        const data = { ...Message, Message: "ffmpeg", tabId: Message.tabId ?? sender.tab.id, version: G.ffmpegConfig.version };
        chrome.tabs.query({ url: G.ffmpegConfig.url + "*" }, function (tabs) {
            if (chrome.runtime.lastError || !tabs.length) {
                chrome.tabs.create({ url: G.ffmpegConfig.url, active: Message.active ?? true }, function (tab) {
                    if (chrome.runtime.lastError) { return; }
                    G.ffmpegConfig.tab = tab.id;
                    G.ffmpegConfig.cacheData.push(data);
                });
                return true;
            }
            if (tabs[0].status == "complete") {
                chrome.tabs.sendMessage(tabs[0].id, data);
            } else {
                G.ffmpegConfig.tab = tabs[0].id;
                G.ffmpegConfig.cacheData.push(data);
            }
        });
        sendResponse("ok");
        return true;
    }
    // 发送数据到本地
    if (Message.Message == "send2local" && G.send2local) {
        try { send2local(Message.action, Message.data, Message.tabId); } catch (e) { console.log(e); }
        sendResponse("ok");
        return true;
    }
    if (Message.Message == "damnUrlHas") {
        sendResponse(G.damnUrlSet.has(Message.tabId));
        return true;
    }
});

// 选定标签 更新G.tabId
// chrome.tabs.onHighlighted.addListener(function (activeInfo) {
//     if (activeInfo.windowId == -1 || !activeInfo.tabIds || !activeInfo.tabIds.length) { return; }
//     G.tabId = activeInfo.tabIds[0];
// });

/**
 * 监听 切换标签
 * 更新全局变量 G.tabId 为当前标签
 */
chrome.tabs.onActivated.addListener(function (activeInfo) {
    G.tabId = activeInfo.tabId;
    if (cacheData[G.tabId] !== undefined) {
        SetIcon({ number: cacheData[G.tabId].length, tabId: G.tabId });
        return;
    }
    SetIcon({ tabId: G.tabId });
});

// 切换窗口，更新全局变量G.tabId
chrome.windows.onFocusChanged.addListener(function (activeInfo) {
    if (activeInfo == -1) { return; }
    chrome.tabs.query({ active: true, windowId: activeInfo }, function (tabs) {
        if (tabs[0] && tabs[0].id) {
            G.tabId = tabs[0].id;
        } else {
            G.tabId = -1;
        }
    });
}, { filters: ["normal"] });

/**
 * 监听 标签页面更新
 * 检查 清理数据
 * 检查 是否在屏蔽列表中
 */
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (isSpecialPage(tab.url) || tabId <= 0 || !G.initSyncComplete) { return; }
    // console.log('onUpdated', tabId, changeInfo, tab);
    if (changeInfo.status && changeInfo.status == "loading" && G.autoClearMode == 2) {
        G.urlMap.delete(tabId);
        chrome.alarms.get("save", function (alarm) {
            if (!alarm) {
                delete cacheData[tabId];
                SetIcon({ tabId: tabId });
                chrome.alarms.create("save", { when: Date.now() + 1000 });
            }
        });
    }
    // 检查当前标签是否在屏蔽列表中
    if (changeInfo.url && tabId > 0) {
        if (G.blockUrl.length) {
            G.blockUrlSet.delete(tabId);
            if (isLockUrl(changeInfo.url)) {
                G.blockUrlSet.add(tabId);
            }
        }

        G.damnUrlSet.delete(tabId);
        if (isDamnUrl(changeInfo.url)) {
            G.damnUrlSet.add(tabId);
        }
    }
    chrome.sidePanel.setOptions({
        tabId,
        path: "popup.html?tabId=" + tabId
    });
});

/**
 * 监听 frame 正在载入
 * 检查 是否在屏蔽列表中 (frameId == 0 为主框架)
 * 检查 自动清理 (frameId == 0 为主框架)
 * 检查 注入脚本
 */
chrome.webNavigation.onCommitted.addListener(function (details) {
    if (isSpecialPage(details.url) || details.tabId <= 0 || !G.initSyncComplete) { return; }
    // console.log('onCommitted', details);

    // 刷新页面 检查是否在屏蔽列表中
    if (details.frameId == 0) {
        G.blockUrlSet.delete(details.tabId);
        if (isLockUrl(details.url)) {
            G.blockUrlSet.add(details.tabId);
        }

        G.damnUrlSet.delete(details.tabId);
        if (isDamnUrl(details.url)) {
            G.damnUrlSet.add(details.tabId);
        }
    }

    // 刷新清理角标数
    if (details.frameId == 0 && (!['auto_subframe', 'manual_subframe', 'form_submit'].includes(details.transitionType)) && G.autoClearMode == 1) {
        delete cacheData[details.tabId];
        G.urlMap.delete(details.tabId);
        (chrome.storage.session ?? chrome.storage.local).set({ MediaData: cacheData });
        SetIcon({ tabId: details.tabId });
    }

    // chrome内核版本 102 以下不支持 chrome.scripting.executeScript API
    if (G.version < 102) { return; }

    if (G.deepSearch && G.deepSearchTemporarilyClose != details.tabId) {
        G.scriptList.get("search.js").tabId.add(details.tabId);
        G.deepSearchTemporarilyClose = null;
    }

    // catch-script 脚本
    G.scriptList.forEach(function (item, script) {
        if (!item.tabId.has(details.tabId) || !item.allFrames) { return true; }

        const files = [`catch-script/${script}`];
        item.i18n && files.unshift("catch-script/i18n.js");
        chrome.scripting.executeScript({
            target: { tabId: details.tabId, frameIds: [details.frameId] },
            files: files,
            injectImmediately: true,
            world: item.world
        });
    });

    // 模拟手机
    if (G.initLocalComplete && G.featMobileTabId.size > 0 && G.featMobileTabId.has(details.tabId)) {
        chrome.scripting.executeScript({
            args: [G.MobileUserAgent.toString()],
            target: { tabId: details.tabId, frameIds: [details.frameId] },
            func: function () {
                Object.defineProperty(navigator, 'userAgent', { value: arguments[0], writable: false });
            },
            injectImmediately: true,
            world: "MAIN"
        });
    }
});

/**
 * 监听 标签关闭 清理数据
 */
chrome.tabs.onRemoved.addListener(function (tabId) {
    // 清理缓存数据
    chrome.alarms.get("nowClear", function (alarm) {
        !alarm && chrome.alarms.create("nowClear", { when: Date.now() + 1000 });
    });
    if (G.initSyncComplete) {
        G.blockUrlSet.has(tabId) && G.blockUrlSet.delete(tabId);
        G.damnUrlSet.has(tabId) && G.damnUrlSet.delete(tabId);
    }
});

/**
 * 浏览器 扩展快捷键
 */
chrome.commands.onCommand.addListener(function (command) {
    if (command == "auto_down") {
        if (G.featAutoDownTabId.has(G.tabId)) {
            G.featAutoDownTabId.delete(G.tabId);
        } else {
            G.featAutoDownTabId.add(G.tabId);
        }
        (chrome.storage.session ?? chrome.storage.local).set({ featAutoDownTabId: Array.from(G.featAutoDownTabId) });
    } else if (command == "catch") {
        const scriptTabid = G.scriptList.get("catch.js").tabId;
        scriptTabid.has(G.tabId) ? scriptTabid.delete(G.tabId) : scriptTabid.add(G.tabId);
        chrome.tabs.reload(G.tabId, { bypassCache: true });
    } else if (command == "m3u8") {
        chrome.tabs.create({ url: "m3u8.html" });
    } else if (command == "clear") {
        delete cacheData[G.tabId];
        (chrome.storage.session ?? chrome.storage.local).set({ MediaData: cacheData });
        clearRedundant();
        SetIcon({ tabId: G.tabId });
    } else if (command == "enable") {
        G.enable = !G.enable;
        chrome.storage.sync.set({ enable: G.enable });
        chrome.action.setIcon({ path: G.enable ? "/img/icon.png" : "/img/icon-disable.png" });
    } else if (command == "reboot") {
        chrome.runtime.reload();
    } else if (command == "deepSearch") {
        const script = G.scriptList.get("search.js");
        const scriptTabid = script.tabId;
        if (scriptTabid.has(G.tabId)) {
            scriptTabid.delete(G.tabId);
            G.deepSearchTemporarilyClose = G.tabId;
            chrome.tabs.reload(G.tabId, { bypassCache: true });
            return;
        }
        scriptTabid.add(G.tabId);
        chrome.tabs.reload(G.tabId, { bypassCache: true });
    } else if (command == "preview") {
        chrome.tabs.create({ url: `preview.html?tabId=${G.tabId}` });
    }
});

/**
 * 监听 页面完全加载完成 判断是否在线ffmpeg页面
 * 如果是在线ffmpeg 则发送数据
 */
chrome.webNavigation.onCompleted.addListener(function (details) {
    if (G.ffmpegConfig.tab && details.tabId == G.ffmpegConfig.tab) {
        setTimeout(() => {
            G.ffmpegConfig.cacheData.forEach(data => {
                chrome.tabs.sendMessage(details.tabId, data);
            });
            G.ffmpegConfig.cacheData = [];
            G.ffmpegConfig.tab = 0;
        }, 500);
    }
});

// 操作符检查
function operatorCheck(size, Obj) {
    const unitNumber = {
        "B": 1,
        "BYTE": 1,
        "KB": 1024,
        "MB": 1048576,
        "GB": 1073741824
    };
    const unit = (Obj.unit || "B");
    const targetSize = Obj.size * (unitNumber[unit] || 1);
    switch (Obj.operator) {
        case "=":
            return size == targetSize;
        case "<":
            return size < targetSize;
        case ">":
            return size > targetSize;
        case "<=":
            return size <= targetSize;
        case ">=":
            return size >= targetSize;
        case "!=":
            return size != targetSize;
        case "~":
            return (Obj.min ? size >= Obj.min * (unitNumber[unit] || 1) : true) && (Obj.max ? size <= Obj.max * (unitNumber[unit] || 1) : true);
        default:
            return size <= targetSize;
    }
}

/**
 * 检查扩展名和大小
 * @param {String} ext 
 * @param {Number} size 
 * @returns {Boolean|String}
 */
function CheckExtension(ext, size) {
    const Ext = G.Ext.get(ext);
    if (!Ext) { return false; }
    if (!Ext.state) { return "break"; }
    if (Ext.size != 0 && size != undefined && !operatorCheck(size, Ext)) {
        return "break";
    }
    return true;
}

/**
 * 检查类型和大小
 * @param {String} dataType 
 * @param {Number} dataSize 
 * @returns {Boolean|String}
 */
function CheckType(dataType, dataSize) {
    const typeInfo = G.Type.get(dataType.split("/")[0] + "/*") || G.Type.get(dataType);
    if (!typeInfo) { return false; }
    if (!typeInfo.state) { return "break"; }
    if (typeInfo.size != 0 && dataSize != undefined && !operatorCheck(dataSize, typeInfo)) {
        return "break";
    }
    return true;
}

/**
 * 获取文件名及扩展名
 * @param {String} pathname 
 * @returns {Array}
 */
function fileNameParse(pathname) {
    let fileName = decodeURI(pathname.split("/").pop());
    let ext = fileName.split(".");
    ext = ext.length == 1 ? undefined : ext.pop().toLowerCase();
    return [fileName, ext ? ext : undefined];
}

/**
 * 获取响应头信息
 * @param {Object} data 
 * @returns {Object}
 */
function getResponseHeadersValue(data) {
    const header = {};
    if (data.responseHeaders == undefined || data.responseHeaders.length == 0) { return header; }
    for (let item of data.responseHeaders) {
        item.name = item.name.toLowerCase();
        if (item.name == "content-length") {
            header.size ??= parseInt(item.value);
        } else if (item.name == "content-type") {
            header.type = item.value.split(";")[0].toLowerCase();
        } else if (item.name == "content-disposition") {
            header.attachment = item.value;
        } else if (item.name == "content-range") {
            let size = item.value.split('/')[1];
            if (size !== '*') {
                header.size = parseInt(size);
            }
        }
    }
    return header;
}

/**
 * 获取请求头
 * @param {Object} data 
 * @returns {Object|Boolean}
 */
function getRequestHeaders(data) {
    if (data.allRequestHeaders == undefined || data.allRequestHeaders.length == 0) { return false; }
    const header = {};
    for (let item of data.allRequestHeaders) {
        item.name = item.name.toLowerCase();
        if (item.name == "referer") {
            header.referer = item.value;
        } else if (item.name == "origin") {
            header.origin = item.value;
        } else if (item.name == "cookie") {
            header.cookie = item.value;
        } else if (item.name == "authorization") {
            header.authorization = item.value;
        }
    }
    if (Object.keys(header).length) {
        return header;
    }
    return false;
}
//设置扩展图标
function SetIcon(obj) {
    if (obj?.number == 0 || obj?.number == undefined) {
        chrome.action.setBadgeText({ text: "", tabId: obj?.tabId ?? G.tabId }, function () { if (chrome.runtime.lastError) { return; } });
        // chrome.action.setTitle({ title: "还没闻到味儿~", tabId: obj.tabId }, function () { if (chrome.runtime.lastError) { return; } });
    } else if (G.badgeNumber) {
        obj.number = obj.number > 999 ? "999+" : obj.number.toString();
        chrome.action.setBadgeText({ text: obj.number, tabId: obj.tabId }, function () { if (chrome.runtime.lastError) { return; } });
        // chrome.action.setTitle({ title: "抓到 " + obj.number + " 条鱼", tabId: obj.tabId }, function () { if (chrome.runtime.lastError) { return; } });
    }
}

// 模拟手机端
function mobileUserAgent(tabId, change = false) {
    if (change) {
        G.featMobileTabId.add(tabId);
        (chrome.storage.session ?? chrome.storage.local).set({ featMobileTabId: Array.from(G.featMobileTabId) });
        chrome.declarativeNetRequest.updateSessionRules({
            removeRuleIds: [tabId],
            addRules: [{
                "id": tabId,
                "action": {
                    "type": "modifyHeaders",
                    "requestHeaders": [{
                        "header": "User-Agent",
                        "operation": "set",
                        "value": G.MobileUserAgent
                    }]
                },
                "condition": {
                    "tabIds": [tabId],
                    "resourceTypes": Object.values(chrome.declarativeNetRequest.ResourceType)
                }
            }]
        });
        return true;
    }
    G.featMobileTabId.delete(tabId) && (chrome.storage.session ?? chrome.storage.local).set({ featMobileTabId: Array.from(G.featMobileTabId) });
    chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds: [tabId]
    });
}

// 判断特殊页面
function isSpecialPage(url) {
    if (!url || url == "null") { return true; }
    return !(url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:"));
}

// 测试
// chrome.storage.local.get(function (data) { console.log(data.MediaData) });
// chrome.declarativeNetRequest.getSessionRules(function (rules) { console.log(rules); });
// chrome.tabs.query({}, function (tabs) { for (let item of tabs) { console.log(item.id); } });

// [AI2HERO] Inject Douyin Interceptor vào MAIN world để can thiệp fetch/XHR
chrome.webNavigation.onCommitted.addListener((details) => {
    if (details.frameId !== 0) return; // Chỉ main frame
    if (details.url && details.url.includes("douyin.com")) {
        chrome.scripting.executeScript({
            target: { tabId: details.tabId },
            world: "MAIN",
            files: ["js/interceptor.js"]
        }).catch(err => console.warn("[AI2Hero] Douyin inject failed:", err));
    }
});

// --- [AI2HERO] EXTENSION-FIRST DOUYIN PIPELINE ---
let isExtractingSyncing = false;
const extractingTabs = new Map(); // tabId -> {videoId, timeout, apiBase, token}

// Helper dynamically resolving API host from active tabs
async function getApiBase() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['herovideo_api_base'], async function(result) {
            if (result.herovideo_api_base) {
                resolve(result.herovideo_api_base);
                return;
            }
            // Fallback: Tự động phát hiện qua tab đang mở
            try {
                const tabs = await chrome.tabs.query({});
                for (const tab of tabs) {
                    if (tab.url) {
                        try {
                            const url = new URL(tab.url);
                            if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
                                if (url.port === '3000') {
                                    resolve('http://localhost:3000');
                                    return;
                                }
                            } else if (url.hostname.includes('ai2hero.com')) {
                                resolve('https://www.ai2hero.com');
                                return;
                            }
                        } catch(e) {}
                    }
                }
            } catch (err) {
                console.error("Error querying tabs:", err);
            }
            resolve('https://www.ai2hero.com');
        });
    });
}

setInterval(async () => {
    if (isExtractingSyncing) return;
    isExtractingSyncing = true;
    
    try {
        const storage = await chrome.storage.local.get([
            'herovideo_token', 'herovideo_workspace', 'herovideo_subfolder'
        ]);
        if (!storage.herovideo_token) {
            isExtractingSyncing = false;
            return;
        }
        
        const apiBase = await getApiBase();
        
        // Poll Server
        const res = await fetch(
            `${apiBase}/api/hero-downloader/extension/pending-extract`,
            { 
                headers: { 
                    'Authorization': 'Bearer ' + storage.herovideo_token 
                } 
            }
        );
        if (!res.ok) {
            isExtractingSyncing = false;
            return;
        }
        const data = await res.json();
        if (data && data.success && data.tasks && data.tasks.length > 0) {
            for (const task of data.tasks.slice(0, 3)) {
                await openHiddenTabForExtract(task, storage, apiBase);
            }
        }
    } catch(e) {
        console.error("[AI2Hero] Polling failed:", e);
    } finally {
        isExtractingSyncing = false;
    }
}, 5000);

async function openHiddenTabForExtract(task, storage, apiBase) {
    const { id: videoId, videoUrl } = task;
    
    try {
        // Mở tab ẩn (không active)
        const tab = await chrome.tabs.create({
            url: videoUrl,
            active: true
        });
        
        // Timeout 15 giây
        const timeout = setTimeout(async () => {
            try {
                await fetch(`${apiBase}/api/hero-downloader/extension/resolve`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + storage.herovideo_token
                    },
                    body: JSON.stringify({ videoId, error: 'Tab timeout - interceptor không bắt được link' })
                });
            } catch(e) {}
            try { chrome.tabs.remove(tab.id); } catch(e) {}
            extractingTabs.delete(tab.id);
        }, 15000);
        
        extractingTabs.set(tab.id, { videoId, timeout, apiBase, token: storage.herovideo_token });
    } catch (err) {
        console.error("[AI2Hero] Failed to create hidden tab:", err);
    }
}

// Lắng nghe khi content-script bắt được video
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action !== 'DOUYIN_VIDEOS_CAPTURED') return;
    
    const tabId = sender.tab?.id;
    if (!tabId) return;
    
    const extractInfo = extractingTabs.get(tabId);
    if (!extractInfo) return;
    
    const { videoId, timeout, apiBase, token } = extractInfo;
    clearTimeout(timeout);
    extractingTabs.delete(tabId);
    
    // Đóng tab ẩn ngay lập tức để tiết kiệm RAM
    try { chrome.tabs.remove(tabId); } catch(e) {}
    
    const captured = message.videos || [];
    const bestVideo = captured[0]; // video mới nhất
    
    if (bestVideo && bestVideo.direct_mp4_url) {
        fetch(`${apiBase}/api/hero-downloader/extension/resolve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ videoId, directMp4Url: bestVideo.direct_mp4_url })
        })
        .then(async (res) => {
            if (res.ok) {
                // Tự động tải nếu Worker không hoạt động
                await checkWorkerAndDownload(videoId, bestVideo.direct_mp4_url, token, apiBase);
            }
        })
        .catch(console.error);
    } else {
        fetch(`${apiBase}/api/hero-downloader/extension/resolve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ videoId, error: 'Không bắt được direct_mp4_url từ video' })
        }).catch(console.error);
    }
});

async function checkWorkerAndDownload(videoId, directMp4Url, token, apiBase) {
    try {
        // Chờ 15 giây để Worker nhận task và tải. Nếu video vẫn ở trạng thái pending/force_pending thì Extension tự tải
        await new Promise(resolve => setTimeout(resolve, 15000));
        
        const statusRes = await fetch(`${apiBase}/api/hero-downloader/extension/check-status?videoId=${videoId}`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (statusRes.ok) {
            const statusData = await statusRes.json();
            if (statusData.status === 'pending' || statusData.status === 'force_pending') {
                console.log(`[AI2Hero] Worker không phản hồi. (Đã tắt tính năng extension tự tải).`);
                /*
                const storage = await chrome.storage.local.get(['herovideo_subfolder']);
                const subfolder = storage.herovideo_subfolder || 'HeroVideo';
                chrome.downloads.download({
                    url: directMp4Url,
                    filename: `${subfolder}/${videoId}_douyin.mp4`,
                    saveAs: false
                });
                */
            }
        }
    } catch(e) {
        console.error("[AI2Hero] checkWorkerAndDownload error:", e);
    }
}

// === [AI2HERO] CHANNEL SCANNING PIPELINE ===
let isScanningSyncing = false;
const scanningTabs = new Map(); // tabId -> {projectId, timeout, apiBase, token}

setInterval(async () => {
    if (isScanningSyncing) return;
    isScanningSyncing = true;
    
    try {
        const storage = await chrome.storage.local.get([
            'herovideo_token', 'herovideo_workspace'
        ]);
        if (!storage.herovideo_token) {
            isScanningSyncing = false;
            return;
        }
        
        const apiBase = await getApiBase();
        
        // Poll Server for pending scan projects
        const res = await fetch(
            `${apiBase}/api/hero-downloader/extension/pending-scan`,
            { 
                headers: { 
                    'Authorization': 'Bearer ' + storage.herovideo_token 
                } 
            }
        );
        if (!res.ok) {
            isScanningSyncing = false;
            return;
        }
        const data = await res.json();
        if (data && data.success && data.projects && data.projects.length > 0) {
            // Process only 1 project at a time to prevent opening too many tabs
            const project = data.projects[0];
            await openTabForChannelScan(project, storage, apiBase);
        }
    } catch(e) {
        console.error("[AI2Hero] Channel polling failed:", e);
    } finally {
        isScanningSyncing = false;
    }
}, 10000);
function cleanDouyinUserUrl(url) {
    if (!url) return url;
    if (url.includes('douyin.com/user/')) {
        try {
            const u = new URL(url);
            // Giữ lại pathname sạch, xóa hoàn toàn các param như ?vid=... để tránh mở modal popup khóa scroll trang cá nhân
            u.search = '';
            u.hash = '';
            return u.toString();
        } catch (e) {
            return url.split('?')[0];
        }
    }
    return url;
}

async function openTabForChannelScan(project, storage, apiBase) {
    const { id: projectId, sourceUrls, recentIds, maxScanVideos } = project;
    if (!sourceUrls || sourceUrls.length === 0) return;
    
    // Check if already scanning this project
    for (const info of scanningTabs.values()) {
        if (info.projectId === projectId) return;
    }
    
    try {
        const cleanedUrls = sourceUrls.map(cleanDouyinUserUrl);
        const firstUrl = cleanedUrls[0];
        console.log(`[AI2Hero] Bat dau quet kenh cho project ${projectId}: ${firstUrl} (1/${cleanedUrls.length})`);
        const tab = await chrome.tabs.create({
            url: firstUrl,
            active: true
        });
        
        setupTabScan(tab.id, projectId, cleanedUrls, 0, storage, apiBase, recentIds, maxScanVideos);
    } catch (err) {
        console.error("[AI2Hero] Failed to create channel scan tab:", err);
    }
}

function setupTabScan(tabId, projectId, sourceUrls, index, storage, apiBase, recentIds, maxScanVideos) {
    // Clear old timeout if any
    const existing = scanningTabs.get(tabId);
    if (existing && existing.timeout) {
        clearTimeout(existing.timeout);
    }
    
    // Timeout 60 giây cho mỗi URL quét
    const timeout = setTimeout(async () => {
        console.warn(`[AI2Hero] Tab quet kenh bi timeout cho project ${projectId} o URL thu ${index + 1}`);
        handleScanSegmentComplete(tabId);
    }, 60000);
    
    scanningTabs.set(tabId, {
        projectId,
        timeout,
        apiBase,
        token: storage.herovideo_token,
        sourceUrls,
        currentIndex: index,
        storage,
        recentIds: recentIds || [],
        maxScanVideos: maxScanVideos || 50
    });
    
    // Lắng nghe khi tab tải xong
    const listener = function(updatedTabId, info) {
        if (updatedTabId !== tabId || info.status !== 'complete') return;
        chrome.tabs.onUpdated.removeListener(listener);
        
        const state = scanningTabs.get(tabId);
        if (!state || state.currentIndex !== index) return;
        
        console.log(`[AI2Hero] Tab loaded, gui START_AUTO_CRAWL cho project ${projectId} (URL ${index + 1}/${sourceUrls.length})...`);
        chrome.tabs.sendMessage(tabId, {
            action: 'START_AUTO_CRAWL',
            token: storage.herovideo_token,
            teamId: storage.herovideo_workspace,
            apiBase: apiBase,
            projectId: projectId,
            recentIds: state.recentIds,
            maxScanVideos: state.maxScanVideos
        });
    };
    
    chrome.tabs.onUpdated.addListener(listener);
}

async function handleScanSegmentComplete(tabId) {
    const scanInfo = scanningTabs.get(tabId);
    if (!scanInfo) return;
    
    const { projectId, timeout, apiBase, token, sourceUrls, currentIndex, storage, recentIds, maxScanVideos } = scanInfo;
    clearTimeout(timeout);
    
    const nextIndex = currentIndex + 1;
    if (nextIndex < sourceUrls.length) {
        const nextUrl = sourceUrls[nextIndex]; // sourceUrls are already cleaned in openTabForChannelScan
        console.log(`[AI2Hero] URL thu ${currentIndex + 1} cua project ${projectId} quet xong. Chuyen sang URL thu ${nextIndex + 1}: ${nextUrl}`);
        try {
            await chrome.tabs.update(tabId, { url: nextUrl, active: true });
            setupTabScan(tabId, projectId, sourceUrls, nextIndex, storage, apiBase, recentIds, maxScanVideos);
        } catch (e) {
            console.error(`[AI2Hero] Khong the update tab de quet URL tiep theo:`, e);
            finalizeScan(tabId, projectId, token, apiBase);
        }
    } else {
        finalizeScan(tabId, projectId, token, apiBase);
    }
}

function finalizeScan(tabId, projectId, token, apiBase) {
    scanningTabs.delete(tabId);
    try { chrome.tabs.remove(tabId); } catch(e) {}
    
    console.log(`[AI2Hero] Tat ca URL da quet hoan tat cho project ${projectId}. Gui scan-complete len Server...`);
    
    fetch(`${apiBase}/api/hero-downloader/extension/scan-complete`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ projectId })
    }).catch(console.error);
}

// Lắng nghe tín hiệu hoàn thành quét kênh từ content-script
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === 'DOUYIN_SCAN_COMPLETE') {
        const tabId = sender.tab?.id;
        if (tabId) {
            handleScanSegmentComplete(tabId);
        }
    }
});
