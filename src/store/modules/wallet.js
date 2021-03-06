import Vue from 'vue'

import { calcId } from '../../wallet/helpers'
import { store } from '../../adapters/level-outpoint-store'

const cashlib = require('bitcore-lib-cash')

export async function rehydrateWallet (wallet) {
  if (!wallet || !wallet.xPrivKey) {
    return
  }
  if (!wallet.feePerByte) {
    wallet.feePerByte = 2
  }
  wallet.xPrivKey = cashlib.HDPrivateKey.fromObject(wallet.xPrivKey)
  wallet.utxos = {}
  // FIXME: This shouldn't be necessary, but the GUI needs real time
  // balance updates. In the future, we should just aggregate a total over time here.
  const outpointIterator = await store.getOutpointIterator()
  for await (const outpoint of outpointIterator) {
    if (!outpoint.address) {
      continue
    }
    wallet.utxos[calcId(outpoint)] = outpoint
  }
}

export default {
  namespaced: true,
  state: {
    xPrivKey: null,
    utxos: {},
    feePerByte: 2,
    seedPhrase: null
  },
  mutations: {
    setSeedPhrase (state, seedPhrase) {
      state.seedPhrase = seedPhrase
    },
    reset (state) {
      state.xPrivKey = null
      state.utxos = {}
    },
    setXPrivKey (state, xPrivKey) {
      state.xPrivKey = xPrivKey
    },
    removeUTXO (state, id) {
      Vue.delete(state.utxos, id)
    },
    addUTXO (state, output) {
      const utxoId = calcId(output)
      Vue.set(state.utxos, utxoId, output)
    }
  },
  getters: {
    getSeedPhrase (state) {
      return state.seedPhrase
    },
    getXPrivKey (state) {
      return state.xPrivKey
    },
    getUTXOs (state) {
      return state.utxos
    },
    balance (state) {
      return Object.values(state.utxos).reduce((acc, output) => acc + output.satoshis, 0) || 0
    }
  }
}
