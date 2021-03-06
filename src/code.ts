/*
 * @Author: Rodrigo Soares
 * @Date: 2019-07-31 20:36:11
 * @Last Modified by: Rodrigo Soares
 * @Last Modified time: 2020-05-22 14:54:15
 */

import { script as io } from './Lib/io.js'
import { Rename, FindReplace } from '@rodi01/renameitlib'
import * as isBlank from 'is-blank'
import { parseData, WhereTo, reorderSelection, hasSelection } from './Utilities'
import { findReplaceData, renameData } from './Lib/DataHelper'
import {
  getUUID,
  analyticsEnabled,
  setAnalyticsEnabled,
  analyticsFirstRun,
} from './Lib/GoogleAnalytics'

const data = parseData(figma.currentPage)

function doRename(rename, item, index, inputData) {
  const options = renameData(
    item,
    data.selectionCount,
    inputData.nameInput,
    inputData.sequenceInput,
    data.pageName
  )

  return rename.layer({
    ...item,
    ...options,
  })
}

function doFindReplace(findReplace, item, inputData) {
  const options = findReplaceData(
    item,
    inputData.findText,
    inputData.replaceText,
    inputData.caseSensitive
  )

  return findReplace.match(options) ? findReplace.layer(options) : false
}

async function theUI() {
  let to = 'noSelection'
  const firstRun = await analyticsFirstRun()
  let windowOptions = {
    width: 430,
    height: 490,
    visible: true,
  }

  // Set screen to show
  if (figma.command === WhereTo.RenameLayers && hasSelection(data)) {
    to = WhereTo.RenameLayers
  } else if (figma.command === WhereTo.FindReplace && hasSelection(data)) {
    to = WhereTo.FindReplace
    windowOptions = {
      width: 430,
      height: 320,
      visible: true,
    }
  } else if (figma.command === WhereTo.Settings) {
    to = WhereTo.Settings
    windowOptions = {
      width: 430,
      height: 300,
      visible: true,
    }
  } else if (figma.command === WhereTo.Donate) {
    to = WhereTo.Donate
    windowOptions = { width: 0, height: 0, visible: false }
    figma.showUI(__html__, { visible: false })
  } else {
    to = WhereTo.NoSelection
    windowOptions = {
      width: 430,
      height: 150,
      visible: true,
    }
  }

  const windowDim = firstRun
    ? { width: 430, height: 180, visible: true }
    : windowOptions

  figma.showUI(__html__, windowDim)

  io.send('sendData', {
    data: data,
    command: to,
    UUID: await getUUID(),
    firstRun: firstRun,
    analyticsEnabled: await analyticsEnabled(),
    windowDim: windowOptions,
  })

  io.once('renameLayers', (d) => {
    const rename = new Rename({ allowChildLayer: true })
    const sel = reorderSelection(figma.currentPage)
    sel.forEach((item, index) => {
      const name = doRename(rename, data.selection[index], index, d)
      if (!isBlank(name)) {
        item.name = name
      }
    })

    figma.closePlugin()
  })

  io.once('findReplaceLayers', (d) => {
    const findReplace = new FindReplace()
    const sel = reorderSelection(figma.currentPage)
    sel.forEach((item, index) => {
      const name = doFindReplace(findReplace, data.selection[index], d)
      if (name) item.name = name
    })

    figma.closePlugin()
  })

  io.once('cancel', (d) => {
    figma.closePlugin()
  })

  io.once('setAnalytics', (value) => {
    setAnalyticsEnabled(value)
  })

  io.once('resizeViewport', (opts) => {
    figma.ui.resize(opts.width, opts.height)
  })
}

theUI()
