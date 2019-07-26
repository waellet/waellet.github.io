'use strict'
import 'babel-polyfill'

require('buffer')

import TransportU2F from '@ledgerhq/hw-transport-u2f';
import Ae from '@aeternity/ledger-app-api';



export default class LedgerBridge {

    constructor() {
        this.addEventListeners()
    }

    addEventListeners() {
        window.addEventListener('message', async e => {
            if(e && e.data && e.data.target === 'LEDGER-IFRAME') {
                const { action, params } = e.data
                const replyAction = `${action}-reply`
                switch(action) {
                    case 'ledger-get-address':
                        this.getAddress(replyAction, params.accountIdx)
                    break
                    case 'ledger-sign-transaction':
                        this.signTransaction(replyAction, params.accountIdx, params.tx, params.networkId)
                    break
                }
            }
        })
    }

    sendMessageToExtension (msg) {
        window.parent.postMessage(msg, '*')
    }

    async makeApp() {
        try {
            this.app = new Ae(new TransportU2F())
        }catch(e) {
            console.log('LEDGER:::CREATE APP ERROR', e)
        }
    }

    clean() {
        this.app = null
    }
    
    async getAddress (replyAction, accountIdx) {
        try {
            await this.makeApp()
            const res = await this.app.getAddress(accountIdx,true)
            this.sendMessageToExtension({
                action: replyAction,
                success: true,
                payload: res,
            })
        }catch(err) {

            let e = this.ledgerErrToMessage(err)
            this.sendMessageToExtension({
                action: replyAction,
                success: false,
                payload: { error: e.toString() }
            })

        }finally {
            this.clean()
        }
    }

    async signTransaction (replyAction, accountIdx,tx, networkId) {
        try {
            await this.makeApp()
            const res = await this.app.signTransaction(accountIdx, tx, networkId)
            this.sendMessageToExtension({
                action: replyAction,
                success: true,
                payload: res,
            })

        } catch (err) {
            const e = this.ledgerErrToMessage(err)
            this.sendMessageToExtension({
                action: replyAction,
                success: false,
                payload: { error: e.toString() },
            })

        } finally {
            this.cleanUp()
        }
    }


    ledgerErrToMessage (err) {
        const isU2FError = (err) => !!err && !!(err).metaData
        const isStringError = (err) => typeof err === 'string'
        const isErrorWithId = (err) => err.hasOwnProperty('id') && err.hasOwnProperty('message')

        if (isU2FError(err)) {
          // Timeout
          if (err.metaData.code === 5) {
            return 'LEDGER_TIMEOUT'
          }

          return err.metaData.type
        }

        if (isStringError(err)) {
          // Wrong app logged into
          if (err.includes('6804')) {
            return 'LEDGER_WRONG_APP'
          }
          // Ledger locked
          if (err.includes('6801')) {
            return 'LEDGER_LOCKED'
          }

          return err
        }

        if (isErrorWithId(err)) {
          // Browser doesn't support U2F
          if (err.message.includes('U2F not supported')) {
            return 'U2F_NOT_SUPPORTED'
          }
        }

        // Other
        return err.toString()
    }
    
}