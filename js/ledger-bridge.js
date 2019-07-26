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
                    case 'ledger-unlock':
                        this.unlock(replyAction, params.hdPath)
                    break
                    case 'ledger-sign-transaction':
                        this.signTransaction(replyAction, params.hdPath, params.tx, params.to)
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

    async unlock (replyAction, ledgerNextIdx) {
        try {
            await this.makeApp()
            const res = await this.app.getAddress(ledgerNextIdx,true)

            console.log(res)

            this.sendMessageToExtension({
                action: replyAction,
                success: true,
                payload: res,
            })


        }catch(e) {

            this.sendMessageToExtension({
                action: replyAction,
                success: false,
                payload: { error: e.toString() }
            })

        }finally {
            this.clean()
        }
    }

    
}