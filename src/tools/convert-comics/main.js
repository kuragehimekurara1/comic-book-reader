/**
 * @license
 * Copyright 2020-2023 Álvaro García
 * www.binarynonsense.com
 * SPDX-License-Identifier: BSD-2-Clause
 */

const { BrowserWindow } = require("electron");
const fs = require("fs");
const path = require("path");
const core = require("../../core/main");
const { _ } = require("../../shared/main/i18n");

const { FileExtension, FileDataType } = require("../../shared/main/constants");
const { fork } = require("child_process");
const FileType = require("file-type");
const fileUtils = require("../../shared/main/file-utils");
const fileFormats = require("../../shared/main/file-formats");

///////////////////////////////////////////////////////////////////////////////
// SETUP //////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

let g_isInitialized = false;

let g_cancel = false;
let g_worker;
let g_workerWindow;
let g_pdfCreationMethod = "metadata";
let g_epubCreationImageFormat = "keep-selected";
let g_epubCreationImageStorage = "files";
let g_imageFormat = FileExtension.NOT_SET;

// hack to allow this at least for files from File>Convert...
let g_initialPassword = "";

function init() {
  if (!g_isInitialized) {
    initOnIpcCallbacks();
    initHandleIpcCallbacks();
    g_isInitialized = true;
  }
}

exports.open = function (fileData) {
  // called by switchTool when opening tool
  init();
  let filePath, fileType;
  if (fileData !== undefined) {
    filePath = fileData.path;
    fileType = fileData.type;
    g_initialPassword = fileData.password;
  }
  const data = fs.readFileSync(path.join(__dirname, "index.html"));
  sendIpcToCoreRenderer("replace-inner-html", "#tools", data.toString());

  updateLocalizedText();

  sendIpcToRenderer(
    "show",
    filePath !== undefined
      ? path.dirname(filePath)
      : fileUtils.getDesktopFolderPath()
  );

  updateLocalizedText();

  if (filePath !== undefined && fileType !== undefined)
    sendIpcToRenderer("add-file", filePath, fileType);
};

exports.close = function () {
  // called by switchTool when closing tool
  sendIpcToRenderer("close-modal");
  sendIpcToRenderer("hide"); // clean up

  if (g_workerWindow !== undefined) {
    g_workerWindow.destroy();
    g_workerWindow = undefined;
  }

  if (g_worker !== undefined) {
    g_worker.kill();
    g_worker = undefined;
  }
  fileUtils.cleanUpTempFolder();
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
  core.sendIpcToRenderer("tool-convert-comics", ...args);
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

  on("choose-file", (lastFilePath) => {
    let defaultPath;
    if (lastFilePath) defaultPath = path.dirname(lastFilePath);
    try {
      let allowMultipleSelection = true;
      let allowedFileTypesName = "Comic Book Files";
      let allowedFileTypesList = [
        FileExtension.CBZ,
        FileExtension.CBR,
        FileExtension.CB7,
        FileExtension.PDF,
        FileExtension.EPUB,
      ];
      let filePathsList = fileUtils.chooseOpenFiles(
        core.getMainWindow(),
        defaultPath,
        allowedFileTypesName,
        allowedFileTypesList,
        allowMultipleSelection
      );
      if (filePathsList === undefined) {
        return;
      }
      for (let index = 0; index < filePathsList.length; index++) {
        const filePath = filePathsList[index];
        let stats = fs.statSync(filePath);
        if (!stats.isFile()) continue; // avoid folders accidentally getting here
        let fileType;
        let fileExtension = path.extname(filePath).toLowerCase();
        (async () => {
          let _fileType = await FileType.fromFile(filePath);
          if (_fileType !== undefined) {
            fileExtension = "." + _fileType.ext;
          }
          if (fileExtension === "." + FileExtension.PDF) {
            fileType = FileDataType.PDF;
          } else if (fileExtension === "." + FileExtension.EPUB) {
            fileType = FileDataType.EPUB_COMIC;
          } else {
            if (
              fileExtension === "." + FileExtension.RAR ||
              fileExtension === "." + FileExtension.CBR
            ) {
              fileType = FileDataType.RAR;
            } else if (
              fileExtension === "." + FileExtension.ZIP ||
              fileExtension === "." + FileExtension.CBZ
            ) {
              fileType = FileDataType.ZIP;
            } else if (
              fileExtension === "." + FileExtension.SEVENZIP ||
              fileExtension === "." + FileExtension.CB7
            ) {
              fileType = FileDataType.SEVENZIP;
            } else {
              return;
            }
          }
          sendIpcToRenderer("add-file", filePath, fileType);
        })();
      }
    } catch (err) {
      // TODO: do something?
    }
  });

  on("choose-folder", (inputFilePath, outputFolderPath) => {
    let defaultPath;
    if (outputFolderPath !== undefined) {
      defaultPath = outputFolderPath;
    } else if (inputFilePath !== undefined) {
      defaultPath = path.dirname(inputFilePath);
    }
    let folderList = fileUtils.chooseFolder(core.getMainWindow(), defaultPath);
    if (folderList === undefined) {
      return;
    }
    let folderPath = folderList[0];
    if (folderPath === undefined || folderPath === "") return;

    sendIpcToRenderer("change-output-folder", folderPath);
  });

  /////////////////////////

  on("cancel", () => {
    if (!g_cancel) {
      g_cancel = true;
      if (g_workerWindow) {
        console.log("cancel pdf");
        g_workerWindow.webContents.send("cancel");
      }
    }
  });

  on("set-image-format", (format) => {
    g_imageFormat = format;
  });

  on("set-pdf-creation-method", (method) => {
    g_pdfCreationMethod = method;
  });

  on("set-epub-creation-image-format", (format) => {
    g_epubCreationImageFormat = format;
  });

  on("set-epub-creation-image-storage", (selection) => {
    g_epubCreationImageStorage = selection;
  });

  on(
    "start",
    (
      inputFilePath,
      inputFileType,
      fileNum,
      totalFilesNum,
      pdfExtractionMethod
    ) => {
      start(
        inputFilePath,
        inputFileType,
        fileNum,
        totalFilesNum,
        pdfExtractionMethod
      );
    }
  );

  on("stop-error", (err) => {
    stopError(err);
  });

  on(
    "resize-images",
    (
      inputFilePath,
      outputScale,
      outputQuality,
      outputFormat,
      outputFolderPath
    ) => {
      resizeImages(
        inputFilePath,
        outputScale,
        outputQuality,
        outputFormat,
        outputFolderPath
      );
    }
  );

  on(
    "resize-images",
    (
      inputFilePath,
      outputScale,
      outputQuality,
      outputFormat,
      outputFolderPath
    ) => {
      resizeImages(
        inputFilePath,
        outputScale,
        outputQuality,
        outputFormat,
        outputFolderPath
      );
    }
  );

  on("resizing-canceled", () => {
    if (g_cancel === false) stopCancel();
  });

  on("resizing-error", (err) => {
    stopError(err);
  });

  on(
    "create-file-from-images",
    (imgFilePaths, outputFormat, outputFilePath) => {
      createFileFromImages(imgFilePaths, outputFormat, outputFilePath);
    }
  );

  on("end", (wasCanceled, numFiles, numErrors, numAttempted) => {
    if (!wasCanceled) {
      sendIpcToRenderer(
        "update-title-text",
        _("tool-shared-modal-title-conversion-finished")
      );

      if (numErrors > 0) {
        sendIpcToRenderer(
          "update-info-text",
          _(
            "tool-shared-modal-info-conversion-error-num-files",
            numErrors,
            numFiles
          )
        );
      } else {
        sendIpcToRenderer(
          "update-info-text",
          _("tool-shared-modal-info-conversion-success-num-files", numFiles)
        );
      }
    } else {
      sendIpcToRenderer(
        "update-title-text",
        _("tool-shared-modal-title-conversion-canceled")
      );
      sendIpcToRenderer(
        "update-info-text",
        _(
          "tool-shared-modal-info-conversion-results",
          numAttempted - numErrors,
          numErrors,
          numFiles - numAttempted
        )
      );
    }

    sendIpcToRenderer("show-result");
  });
}

// HANDLE

let g_handleIpcCallbacks = {};

async function handleIpcFromRenderer(...args) {
  const callback = g_handleIpcCallbacks[args[0]];
  if (callback) return await callback(...args.slice(1));
  return;
}
exports.handleIpcFromRenderer = handleIpcFromRenderer;

function handle(id, callback) {
  g_handleIpcCallbacks[id] = callback;
}

function initHandleIpcCallbacks() {
  // handle(
  //   "pdf-save-dataurl-to-file",
  //   async (dataUrl, dpi, folderPath, pageNum) => {
  //     try {
  //       const { changeDpiDataUrl } = require("changedpi");
  //       let img = changeDpiDataUrl(dataUrl, dpi);
  //       let data = img.replace(/^data:image\/\w+;base64,/, "");
  //       let buf = Buffer.from(data, "base64");
  //       let filePath = path.join(folderPath, pageNum + "." + FileExtension.JPG);
  //       fs.writeFileSync(filePath, buf, "binary");
  //       return undefined;
  //     } catch (error) {
  //       return error;
  //     }
  //   }
  // );
}

///////////////////////////////////////////////////////////////////////////////
// TOOL ///////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

function stopError(error) {
  sendIpcToRenderer("update-log-text", error);
  sendIpcToRenderer(
    "update-log-text",
    _("tool-shared-modal-log-conversion-error")
  );
  sendIpcToRenderer("finished-error");
}

function stopCancel() {
  fileUtils.cleanUpTempFolder();
  sendIpcToRenderer(
    "update-log-text",
    _("tool-shared-modal-log-conversion-canceled")
  );
  sendIpcToRenderer("finished-canceled");
}

function start(
  inputFilePath,
  inputFileType,
  fileNum,
  totalFilesNum,
  pdfExtractionMethod
) {
  g_cancel = false;

  sendIpcToRenderer(
    "update-title-text",
    _("tool-shared-modal-title-converting") +
      (totalFilesNum > 1 ? " (" + fileNum + "/" + totalFilesNum + ")" : "")
  );
  sendIpcToRenderer(
    "update-info-text",
    fileUtils.reducePathString(inputFilePath)
  );
  sendIpcToRenderer("update-log-text", _("tool-shared-modal-title-converting"));
  sendIpcToRenderer("update-log-text", inputFilePath);

  let tempFolderPath = fileUtils.createTempFolder();
  // extract to temp folder
  if (
    inputFileType === FileDataType.ZIP ||
    inputFileType === FileDataType.RAR ||
    inputFileType === FileDataType.SEVENZIP ||
    inputFileType === FileDataType.EPUB_COMIC
  ) {
    sendIpcToRenderer(
      "update-log-text",
      _("tool-shared-modal-log-extracting-pages") + "..."
    );
    // ref: https://www.matthewslipper.com/2019/09/22/everything-you-wanted-electron-child-process.html
    if (g_worker !== undefined) {
      // kill it after one use
      g_worker.kill();
      g_worker = undefined;
    }
    if (g_worker === undefined) {
      g_worker = fork(
        path.join(__dirname, "../../shared/main/tools-worker.js")
      );
      g_worker.on("message", (message) => {
        g_worker.kill(); // kill it after one use
        if (message === "success") {
          if (g_cancel === true) {
            stopCancel();
            return;
          }
          sendIpcToRenderer("images-extracted");
          return;
        } else {
          stopError(message);
          return;
        }
      });
    }
    g_worker.send([
      "extract",
      inputFilePath,
      inputFileType,
      tempFolderPath,
      g_initialPassword,
    ]);
  } else if (inputFileType === FileDataType.PDF) {
    sendIpcToRenderer(
      "update-log-text",
      _("tool-shared-modal-log-extracting-pages") + "..."
    );
    /////////////////////////
    // use a hidden window for better performance and node api access
    if (g_workerWindow !== undefined) {
      // shouldn't happen
      g_workerWindow.destroy();
      g_workerWindow = undefined;
    }
    g_workerWindow = new BrowserWindow({
      show: false,
      webPreferences: { nodeIntegration: true, contextIsolation: false },
      parent: core.getMainWindow(),
    });
    g_workerWindow.loadFile(
      `${__dirname}/../../shared/renderer/tools-bg-worker.html`
    );

    g_workerWindow.webContents.on("did-finish-load", function () {
      //g_resizeWindow.webContents.openDevTools();
      g_workerWindow.webContents.send(
        "extract-pdf",
        "tool-convert-comics",
        inputFilePath,
        tempFolderPath,
        pdfExtractionMethod,
        _("tool-shared-modal-log-extracting-page") + ": ",
        g_initialPassword
      );
    });
  } else {
    stopError("start: invalid file type");
  }
}

exports.onIpcFromToolsWorkerRenderer = function (...args) {
  switch (args[0]) {
    case "update-log-text":
      sendIpcToRenderer("update-log-text", args[1]);
      break;
    case "pdf-images-extracted":
      g_workerWindow.destroy();
      g_workerWindow = undefined;
      if (!args[1]) sendIpcToRenderer("images-extracted");
      else stopCancel();
      break;
    case "stop-error":
      g_workerWindow.destroy();
      g_workerWindow = undefined;
      stopError(args[1]);
      break;
  }
};

async function resizeImages(
  inputFilePath,
  outputScale,
  outputQuality,
  outputFormat,
  outputFolderPath
) {
  if (g_cancel === true) {
    stopCancel();
    return;
  }
  try {
    const sharp = require("sharp");
    outputScale = parseInt(outputScale);
    outputQuality = parseInt(outputQuality);

    let fileName = path.basename(inputFilePath, path.extname(inputFilePath));
    let outputFilePath = path.join(
      outputFolderPath,
      fileName + "." + outputFormat
    );
    let i = 1;
    while (fs.existsSync(outputFilePath)) {
      i++;
      outputFilePath = path.join(
        outputFolderPath,
        fileName + "(" + i + ")." + outputFormat
      );
    }

    let tempFolderPath = fileUtils.getTempFolderPath();
    let comicInfoFilePath =
      fileUtils.getComicInfoFileInFolderRecursive(tempFolderPath);
    let imgFilePaths = fileUtils.getImageFilesInFolderRecursive(tempFolderPath);
    if (imgFilePaths === undefined || imgFilePaths.length === 0) {
      stopError("imgFiles === undefined || imgFiles.length === 0");
      return;
    }
    imgFilePaths.sort(fileUtils.compare);

    // resize
    if (g_cancel === true) {
      stopCancel();
      return;
    }
    let didResize = false;
    if (outputScale < 100) {
      didResize = true;
      sendIpcToRenderer(
        "update-log-text",
        _("tool-shared-modal-log-resizing-images") + "..."
      );
      sharp.cache(false);
      for (let index = 0; index < imgFilePaths.length; index++) {
        if (g_cancel === true) {
          stopCancel();
          return;
        }
        sendIpcToRenderer(
          "update-log-text",
          _("tool-shared-modal-log-resizing-image") +
            ": " +
            (index + 1) +
            " / " +
            imgFilePaths.length
        );
        let filePath = imgFilePaths[index];
        let fileFolderPath = path.dirname(filePath);
        let fileName = path.basename(filePath, path.extname(filePath));
        let tmpFilePath = path.join(
          fileFolderPath,
          fileName + "." + FileExtension.TMP
        );
        let data = await sharp(filePath).metadata();
        await sharp(filePath)
          .withMetadata()
          .resize(Math.round(data.width * (outputScale / 100)))
          .toFile(tmpFilePath);

        fs.unlinkSync(filePath);
        fileUtils.moveFile(tmpFilePath, filePath);
      }
    }

    // change image format if requested or pdfkit incompatible (not jpg or png)
    if (g_cancel === true) {
      stopCancel();
      return;
    }
    let didChangeFormat = false;
    if (
      outputFormat === FileExtension.PDF ||
      outputFormat === FileExtension.EPUB ||
      g_imageFormat != FileExtension.NOT_SET
    ) {
      sendIpcToRenderer(
        "update-log-text",
        _("tool-shared-modal-log-converting-images") + "..."
      );
      sharp.cache(false); // avoid EBUSY error on windows
      for (let index = 0; index < imgFilePaths.length; index++) {
        if (g_cancel === true) {
          stopCancel();
          return;
        }
        sendIpcToRenderer(
          "update-log-text",
          _("tool-shared-modal-log-converting-image") +
            ": " +
            (index + 1) +
            " / " +
            imgFilePaths.length
        );
        let filePath = imgFilePaths[index];
        let fileFolderPath = path.dirname(filePath);
        let fileName = path.basename(filePath, path.extname(filePath));
        let imageFormat = g_imageFormat;
        if (outputFormat === FileExtension.PDF) {
          // change to a format compatible with pdfkit if needed
          if (
            imageFormat === FileExtension.WEBP ||
            imageFormat === FileExtension.AVIF ||
            (imageFormat === FileExtension.NOT_SET &&
              !fileFormats.hasPdfKitCompatibleImageExtension(filePath))
          ) {
            imageFormat = FileExtension.JPG;
          }
        }
        if (
          outputFormat === FileExtension.EPUB &&
          g_epubCreationImageFormat === "core-media-types-only"
        ) {
          // change to a format supported by the epub specification if needed
          if (
            imageFormat === FileExtension.WEBP ||
            imageFormat === FileExtension.AVIF ||
            (imageFormat === FileExtension.NOT_SET &&
              !fileFormats.hasEpubSupportedImageExtension(filePath))
          ) {
            imageFormat = FileExtension.JPG;
          }
        }
        if (imageFormat != FileExtension.NOT_SET) {
          didChangeFormat = true;
          let tmpFilePath = path.join(
            fileFolderPath,
            fileName + "." + FileExtension.TMP
          );
          if (imageFormat === FileExtension.JPG) {
            await sharp(filePath)
              .withMetadata()
              .jpeg({
                quality: outputQuality,
              })
              .toFile(tmpFilePath);
          } else if (imageFormat === FileExtension.PNG) {
            if (outputQuality < 100) {
              await sharp(filePath)
                .withMetadata()
                .png({
                  quality: outputQuality,
                })
                .toFile(tmpFilePath);
            } else {
              await sharp(filePath).withMetadata().png().toFile(tmpFilePath);
            }
          } else if (imageFormat === FileExtension.WEBP) {
            await sharp(filePath)
              .withMetadata()
              .webp({
                quality: outputQuality,
              })
              .toFile(tmpFilePath);
          } else if (imageFormat === FileExtension.AVIF) {
            await sharp(filePath)
              .withMetadata()
              .avif({
                quality: outputQuality,
              })
              .toFile(tmpFilePath);
          }
          let newFilePath = path.join(
            fileFolderPath,
            fileName + "." + imageFormat
          );
          fs.unlinkSync(filePath);
          fileUtils.moveFile(tmpFilePath, newFilePath);
          imgFilePaths[index] = newFilePath;
        }
      }
    }
    // update comicbook.xml if available, needs changing and the output format is right
    if (
      comicInfoFilePath &&
      (outputFormat === FileExtension.CBZ ||
        outputFormat === FileExtension.CB7) &&
      (didChangeFormat || didResize)
    ) {
      try {
        const {
          XMLParser,
          XMLBuilder,
          XMLValidator,
        } = require("fast-xml-parser");
        const xmlFileData = fs.readFileSync(comicInfoFilePath, "utf8");
        const isValidXml = XMLValidator.validate(xmlFileData);
        if (isValidXml === true) {
          // open
          const parserOptions = {
            ignoreAttributes: false,
          };
          const parser = new XMLParser(parserOptions);
          let json = parser.parse(xmlFileData);
          // modify
          sendIpcToRenderer(
            "update-log-text",
            _("tool-shared-modal-log-updating-comicinfoxml")
          );
          let oldPagesArray = json["ComicInfo"]["Pages"]["Page"].slice();
          json["ComicInfo"]["Pages"]["Page"] = [];
          for (let index = 0; index < imgFilePaths.length; index++) {
            let pageData = {
              "@_Image": "",
              "@_ImageSize": "",
              "@_ImageWidth": "",
              "@_ImageHeight": "",
            };
            if (oldPagesArray.length >= index) {
              pageData = oldPagesArray[index];
            }
            let filePath = imgFilePaths[index];
            pageData["@_Image"] = index;
            let fileStats = fs.statSync(filePath);
            let fileSizeInBytes = fileStats.size;
            pageData["@_ImageSize"] = fileSizeInBytes;
            const metadata = await sharp(filePath).metadata();
            pageData["@_ImageWidth"] = metadata.width;
            pageData["@_ImageHeight"] = metadata.height;
            json["ComicInfo"]["Pages"]["Page"].push(pageData);
          }
          // rebuild
          const builderOptions = {
            ignoreAttributes: false,
            format: true,
          };
          const builder = new XMLBuilder(builderOptions);
          let outputXmlData = builder.build(json);
          fs.writeFileSync(comicInfoFilePath, outputXmlData);
        } else {
          throw "ComicInfo.xml is not a valid xml file";
        }
      } catch (error) {
        console.log(
          "Warning: couldn't update the contents of ComicInfo.xml: " + error
        );
        sendIpcToRenderer(
          "update-log-text",
          _("tool-shared-modal-log-warning-comicinfoxml")
        );
        sendIpcToRenderer("update-log-text", error);
      }
    }
    createFileFromImages(
      imgFilePaths,
      outputFormat,
      outputFilePath,
      comicInfoFilePath
    );
  } catch (error) {
    stopError(error);
  }
}

async function createFileFromImages(
  imgFilePaths,
  outputFormat,
  outputFilePath,
  comicInfoFilePath
) {
  if (g_cancel === true) {
    stopCancel();
    return;
  }
  try {
    // compress to output folder
    sendIpcToRenderer(
      "update-log-text",
      _("tool-shared-modal-log-generating-new-file") + "..."
    );
    sendIpcToRenderer("update-log-text", outputFilePath);

    if (outputFormat === FileExtension.PDF) {
      // TODO: doesn't work in the worker, why?
      await fileFormats.createPdf(
        imgFilePaths,
        outputFilePath,
        g_pdfCreationMethod
      );
      fileUtils.cleanUpTempFolder();
      sendIpcToRenderer("finished-ok");
    } else {
      if (g_worker !== undefined) {
        // kill it after one use
        g_worker.kill();
        g_worker = undefined;
      }
      if (g_worker === undefined) {
        g_worker = fork(
          path.join(__dirname, "../../shared/main/tools-worker.js")
        );
        g_worker.on("message", (message) => {
          g_worker.kill(); // kill it after one use
          if (message === "success") {
            fileUtils.cleanUpTempFolder();
            sendIpcToRenderer("finished-ok");
            return;
          } else {
            stopError(message);
            return;
          }
        });
      }
      g_worker.send([
        "create",
        imgFilePaths,
        comicInfoFilePath,
        outputFormat,
        outputFilePath,
        fileUtils.getTempFolderPath(),
        outputFormat === FileExtension.EPUB
          ? g_epubCreationImageStorage
          : undefined,
      ]);
    }
  } catch (err) {
    stopError(err);
  }
}

///////////////////////////////////////////////////////////////////////////////
// LOCALIZATION ///////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

function updateLocalizedText() {
  sendIpcToRenderer(
    "update-localization",
    getLocalization(),
    getTooltipsLocalization()
  );
}
exports.updateLocalizedText = updateLocalizedText;

function getTooltipsLocalization() {
  return [
    {
      id: "tool-cc-tooltip-output-size",
      text: _("tool-shared-tooltip-output-scale"),
    },
    {
      id: "tool-cc-tooltip-output-folder",
      text: _("tool-shared-tooltip-output-folder"),
    },
    {
      id: "tool-cc-tooltip-remove-from-list",
      text: _("tool-shared-tooltip-remove-from-list"),
    },
    {
      id: "tool-cc-tooltip-pdf-extraction",
      text: _("tool-shared-ui-pdf-extraction-tooltip"),
    },
    {
      id: "tool-cc-tooltip-pdf-creation",
      text: _("tool-shared-ui-pdf-creation-tooltip"),
    },
  ];
}

function getLocalization() {
  return [
    {
      id: "tool-cc-title-text",
      text: _("tool-cc-title").toUpperCase(),
    },
    {
      id: "tool-cc-back-button-text",
      text: _("tool-shared-ui-back-button").toUpperCase(),
    },
    {
      id: "tool-cc-start-button-text",
      text: _("tool-shared-ui-convert").toUpperCase(),
    },
    //////////////////////////////////////////////
    {
      id: "tool-cc-section-general-options-text",
      text: _("tool-shared-ui-general-options"),
    },
    {
      id: "tool-cc-section-advanced-options-text",
      text: _("tool-shared-ui-advanced-options"),
    },
    //////////////////////////////////////////////
    {
      id: "tool-cc-input-options-text",
      text: _("tool-shared-ui-input-options"),
    },
    {
      id: "tool-cc-input-files-text",
      text: _("tool-shared-ui-input-files"),
    },
    {
      id: "tool-cc-add-file-button-text",
      text: _("tool-shared-ui-add").toUpperCase(),
    },
    //////////////////////////////////////////////
    {
      id: "tool-cc-output-options-text",
      text: _("tool-shared-ui-output-options"),
    },
    {
      id: "tool-cc-output-image-scale-text",
      text: _("tool-shared-ui-output-options-scale"),
    },
    {
      id: "tool-cc-output-format-text",
      text: _("tool-shared-ui-output-options-format"),
    },
    {
      id: "tool-cc-output-image-format-text",
      text: _("tool-shared-ui-output-options-image-format"),
    },
    {
      id: "tool-cc-output-image-quality-text",
      text: _("tool-shared-ui-output-options-image-quality"),
    },
    {
      id: "tool-cc-output-folder-text",
      text: _("tool-shared-ui-output-folder"),
    },
    {
      id: "tool-cc-change-folder-button-text",
      text: _("tool-shared-ui-change").toUpperCase(),
    },
    //////////////////////////////////////////////
    {
      id: "tool-cc-advanced-input-options-text",
      text: _("tool-shared-ui-advanced-input-options"),
    },
    {
      id: "tool-cc-pdf-extraction-text",
      text: _("tool-shared-ui-pdf-extraction"),
    },
    {
      id: "tool-cc-pdf-extraction-o1-text",
      text: _("tool-shared-ui-pdf-extraction-o1"),
    },
    {
      id: "tool-cc-pdf-extraction-o2-text",
      text: _("tool-shared-ui-pdf-extraction-o2"),
    },
    {
      id: "tool-cc-pdf-extraction-o3-text",
      text: _("tool-shared-ui-pdf-extraction-o3"),
    },
    //////////////////////////////////////////////
    {
      id: "tool-cc-advanced-output-options-text",
      text: _("tool-shared-ui-advanced-output-options"),
    },
    {
      id: "tool-cc-pdf-creation-text",
      text: _("tool-shared-ui-pdf-creation"),
    },
    {
      id: "tool-cc-pdf-creation-o1-text",
      text: _("tool-shared-ui-pdf-creation-o1"),
    },
    {
      id: "tool-cc-pdf-creation-o2-text",
      text: _("tool-shared-ui-pdf-creation-o2"),
    },
    {
      id: "tool-cc-pdf-creation-o3-text",
      text: _("tool-shared-ui-pdf-creation-o3"),
    },

    {
      id: "tool-cc-epub-creation-text",
      text: _("tool-shared-ui-epub-creation"),
    },
    {
      id: "tool-cc-epub-creation-image-format-o1-text",
      text: _("tool-shared-ui-epub-creation-image-format-o1"),
    },
    {
      id: "tool-cc-epub-creation-image-format-o2-text",
      text: _("tool-shared-ui-epub-creation-image-format-o2"),
    },
    {
      id: "tool-cc-epub-creation-image-storage-o1-text",
      text: _("tool-shared-ui-epub-creation-image-storage-o1"),
    },
    {
      id: "tool-cc-epub-creation-image-storage-o2-text",
      text: _("tool-shared-ui-epub-creation-image-storage-o2"),
    },
    //////////////////////////////////////////////
    {
      id: "tool-cc-keep-format-text",
      text: _("tool-shared-ui-output-options-format-keep"),
    },

    {
      id: "tool-cc-modal-close-button-text",
      text: _("tool-shared-ui-close").toUpperCase(),
    },
    {
      id: "tool-cc-modal-cancel-button-text",
      text: _("tool-shared-ui-cancel").toUpperCase(),
    },
  ];
}
