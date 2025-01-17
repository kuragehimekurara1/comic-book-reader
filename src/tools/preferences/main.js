/**
 * @license
 * Copyright 2020-2023 Álvaro García
 * www.binarynonsense.com
 * SPDX-License-Identifier: BSD-2-Clause
 */

const fs = require("fs");
const path = require("path");
const core = require("../../core/main");
const i18n = require("../../shared/main/i18n");
const { _ } = require("../../shared/main/i18n");
const settings = require("../../shared/main/settings");
const themes = require("../../shared/main/themes");
const reader = require("../../reader/main");

///////////////////////////////////////////////////////////////////////////////
// SETUP //////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

let g_isInitialized = false;

function init() {
  if (!g_isInitialized) {
    initOnIpcCallbacks();
    g_isInitialized = true;
  }
}

exports.open = function () {
  // called by switchTool when opening tool
  init();
  const data = fs.readFileSync(path.join(__dirname, "index.html"));
  sendIpcToCoreRenderer("replace-inner-html", "#tools", data.toString());
  updateLocalizedText();
  sendIpcToRenderer(
    "show",
    i18n.getLoadedLocale(),
    i18n.getAvailableLocales(),
    themes.getId(),
    themes.getAvailableList(),
    settings.get()
  );
};

exports.close = function () {
  // called by switchTool when closing tool
};

exports.onResize = function () {
  sendIpcToRenderer("update-window");
};

exports.onMaximize = function () {
  sendIpcToRenderer("update-window");
};

function onCloseClicked() {
  core.switchTool("reader");
}

///////////////////////////////////////////////////////////////////////////////
// IPC SEND ///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

function sendIpcToRenderer(...args) {
  core.sendIpcToRenderer("tool-preferences", ...args);
}

function sendIpcToCoreRenderer(...args) {
  core.sendIpcToRenderer("core", ...args);
}

function sendIpcToPreload(...args) {
  core.sendIpcToPreload(...args);
}

///////////////////////////////////////////////////////////////////////////////
// IPC RECEIVE ////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

let g_onIpcCallbacks = {};

exports.onIpcFromRenderer = function (...args) {
  const callback = g_onIpcCallbacks[args[0]];
  if (callback) callback(...args.slice(1));
  return;
};

function on(id, callback) {
  g_onIpcCallbacks[id] = callback;
}

function initOnIpcCallbacks() {
  on("close", () => {
    onCloseClicked();
  });
  on("set-setting", (id, value) => {
    settings.setValue(id, value);
  });
  on("set-language", (value) => {
    i18n.loadLocale(value);
    settings.setValue("locale", i18n.getLoadedLocale());
    reader.rebuildMenuAndToolBars();
    for (const [key, value] of Object.entries(core.getTools())) {
      value.updateLocalizedText();
    }
  });
  on("set-theme", (value) => {
    themes.load(value);
    settings.setValue("theme", value);
    sendIpcToCoreRenderer("update-css-properties", themes.getData());
    reader.rebuildMenuAndToolBars();
  });
  on("set-layout-clock", (value) => {
    settings.setValue("layoutClock", value);
    reader.updateLayoutClock();
  });
  on("set-layout-pagenum", (value) => {
    settings.setValue("layoutPageNum", value);
    reader.updateLayoutPageNum();
  });
  on("set-layout-audioplayer", (value) => {
    settings.setValue("layoutAudioPlayer", value);
    reader.updateLayoutAudioPlayer();
  });
  on("set-loading-bg", (value) => {
    settings.setValue("loadingIndicatorBG", value);
    reader.updateLoadingIndicator();
  });
  on("set-loading-isize", (value) => {
    settings.setValue("loadingIndicatorIconSize", value);
    reader.updateLoadingIndicator();
  });
  on("set-loading-ipos", (value) => {
    settings.setValue("loadingIndicatorIconPos", value);
    reader.updateLoadingIndicator();
  });
  on("set-cursor", (value) => {
    settings.setValue("cursorVisibility", value);
    reader.sendIpcToRenderer("set-hide-inactive-mouse-cursor", value === 1);
  });
  on("set-page-turn", (value) => {
    settings.setValue("turnPageOnScrollBoundary", value);
    reader.sendIpcToRenderer("set-page-turn-on-scroll-boundary", value);
  });
}

///////////////////////////////////////////////////////////////////////////////
// LOCALIZATION ///////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

function updateLocalizedText() {
  sendIpcToRenderer("update-localization", getLocalization());
}
exports.updateLocalizedText = updateLocalizedText;

function getLocalization() {
  return [
    {
      id: "tool-pre-title-text",
      text: _("tool-pre-title").toUpperCase(),
    },
    {
      id: "tool-pre-back-button-text",
      text: _("tool-shared-ui-back-button").toUpperCase(),
    },
    //////////////////////////////////////////////
    {
      id: "tool-pre-section-all-text",
      text: _("tool-pre-all"),
    },
    {
      id: "tool-pre-section-appearance-text",
      text: _("tool-pre-appearance"),
    },
    {
      id: "tool-pre-section-ui-text",
      text: _("tool-pre-ui"),
    },
    {
      id: "tool-pre-section-file-formats-text",
      text: _("tool-pre-file-formats"),
    },
    //////////////////////////////////////////////
    {
      id: "tool-pre-text-colors-text",
      text: _("tool-pre-text-colors"),
    },
    {
      id: "tool-pre-languages-text",
      text: _("tool-pre-language"),
    },
    {
      id: "tool-pre-themes-text",
      text: _("tool-pre-theme"),
    },
    //////////////////////////////////////////////
    {
      id: "tool-pre-zoom-text",
      text: _("tool-pre-zoom"),
    },
    {
      id: "tool-pre-zoom-default-text",
      text: _("tool-pre-zoom-default"),
    },
    {
      id: "tool-pre-zoom-default-fitwidth-text",
      text: _("tool-pre-zoom-default-fitwidth"),
    },
    {
      id: "tool-pre-zoom-default-fitheight-text",
      text: _("tool-pre-zoom-default-fitheight"),
    },
    {
      id: "tool-pre-zoom-default-lastused-text",
      text: _("tool-pre-zoom-default-lastused"),
    },
    {
      id: "tool-pre-zoom-fileloading-text",
      text: _("tool-pre-zoom-fileloading"),
    },
    {
      id: "tool-pre-zoom-fileloading-default-text",
      text: _("tool-pre-zoom-fileloading-default"),
    },
    {
      id: "tool-pre-zoom-fileloading-history-text",
      text: _("tool-pre-zoom-fileloading-history"),
    },
    {
      id: "tool-pre-layout-text",
      text: _("tool-pre-layout"),
    },
    {
      id: "tool-pre-layout-clock-text",
      text: _("tool-pre-layout-clock"),
    },
    {
      id: "tool-pre-layout-clock-0-text",
      text: _("menu-shared-top-left"),
    },
    {
      id: "tool-pre-layout-clock-1-text",
      text: _("menu-shared-top-center"),
    },
    {
      id: "tool-pre-layout-clock-2-text",
      text: _("menu-shared-top-right"),
    },
    {
      id: "tool-pre-layout-clock-3-text",
      text: _("menu-shared-bottom-left"),
    },
    {
      id: "tool-pre-layout-clock-4-text",
      text: _("menu-shared-bottom-center"),
    },
    {
      id: "tool-pre-layout-clock-5-text",
      text: _("menu-shared-bottom-right"),
    },
    //////////////////////////////////////////////
    {
      id: "tool-pre-layout-pagenum-text",
      text: _("tool-pre-layout-pagenum"),
    },
    {
      id: "tool-pre-layout-pagenum-0-text",
      text: _("menu-shared-top-left"),
    },
    {
      id: "tool-pre-layout-pagenum-1-text",
      text: _("menu-shared-top-center"),
    },
    {
      id: "tool-pre-layout-pagenum-2-text",
      text: _("menu-shared-top-right"),
    },
    {
      id: "tool-pre-layout-pagenum-3-text",
      text: _("menu-shared-bottom-left"),
    },
    {
      id: "tool-pre-layout-pagenum-4-text",
      text: _("menu-shared-bottom-center"),
    },
    {
      id: "tool-pre-layout-pagenum-5-text",
      text: _("menu-shared-bottom-right"),
    },
    {
      id: "tool-pre-layout-audioplayer-text",
      text: _("tool-pre-layout-audioplayer"),
    },
    {
      id: "tool-pre-layout-audioplayer-0-text",
      text: _("menu-shared-top-left"),
    },
    {
      id: "tool-pre-layout-audioplayer-1-text",
      text: _("menu-shared-bottom-left"),
    },
    //////////////////////////////////////////////
    {
      id: "tool-pre-loading-text",
      text: _("tool-pre-loading"),
    },
    {
      id: "tool-pre-loading-bg-text",
      text: _("tool-pre-loading-bg"),
    },
    {
      id: "tool-pre-loading-bg-0-text",
      text: _("tool-pre-loading-bg-0"),
    },
    {
      id: "tool-pre-loading-bg-1-text",
      text: _("tool-pre-loading-bg-1"),
    },
    {
      id: "tool-pre-loading-isize-text",
      text: _("tool-pre-loading-isize"),
    },
    {
      id: "tool-pre-loading-isize-0-text",
      text: _("tool-pre-loading-isize-0"),
    },
    {
      id: "tool-pre-loading-isize-1-text",
      text: _("tool-pre-loading-isize-1"),
    },
    {
      id: "tool-pre-loading-ipos-text",
      text: _("tool-pre-loading-ipos"),
    },
    {
      id: "tool-pre-loading-ipos-0-text",
      text: _("tool-pre-loading-ipos-0"),
    },
    {
      id: "tool-pre-loading-ipos-1-text",
      text: _("tool-pre-loading-ipos-1"),
    },
    //////////////////////////////////////////////
    {
      id: "tool-pre-mouse-keyboard-text",
      text: _("tool-pre-mouse-keyboard"),
    },
    {
      id: "tool-pre-hotspots-text",
      text: _("tool-pre-hotspots"),
    },
    {
      id: "tool-pre-hotspots-disabled-text",
      text: _("tool-pre-hotspots-disabled"),
    },
    {
      id: "tool-pre-hotspots-2columns-text",
      text: _("tool-pre-hotspots-2columns"),
    },
    {
      id: "tool-pre-hotspots-3columns-text",
      text: _("tool-pre-hotspots-3columns"),
    },
    {
      id: "tool-pre-cursor-text",
      text: _("tool-pre-cursor"),
    },
    {
      id: "tool-pre-cursor-always-text",
      text: _("tool-pre-cursor-always"),
    },
    {
      id: "tool-pre-cursor-hide-inactive-text",
      text: _("tool-pre-cursor-hide-inactive"),
    },
    //////////////////////////////////////////////
    {
      id: "tool-pre-navigation-text",
      text: _("tool-pre-navigation"),
    },
    {
      id: "tool-pre-autoopen-text",
      text: _("tool-pre-autoopen"),
    },
    {
      id: "tool-pre-autoopen-disabled-text",
      text: _("tool-pre-autoopen-disabled"),
    },
    {
      id: "tool-pre-autoopen-next-text",
      text: _("tool-pre-autoopen-next"),
    },
    {
      id: "tool-pre-autoopen-nextandprev-text",
      text: _("tool-pre-autoopen-nextandprev"),
    },
    {
      id: "tool-pre-page-turn-text",
      text: _("tool-pre-page-turn"),
    },
    {
      id: "tool-pre-page-turn-default-text",
      text: _("tool-pre-page-turn-default"),
    },
    {
      id: "tool-pre-page-turn-onscroll-text",
      text: _("tool-pre-page-turn-onscroll"),
    },
    //////////////////////////////////////////////
    {
      id: "tool-pre-epub-text",
      text: _("tool-pre-epub"),
    },
    {
      id: "tool-pre-epub-openas-text",
      text: _("tool-pre-epub-openas"),
    },
    {
      id: "tool-pre-epub-openas-0-text",
      text: _("tool-pre-epub-openas-0"),
    },
    {
      id: "tool-pre-epub-openas-1-text",
      text: _("tool-pre-epub-openas-1"),
    },
  ];
}
