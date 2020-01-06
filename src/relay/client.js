import axios from 'axios'
import messages from './messages'
import filters from './filters'

const cashlib = require('bitcore-lib-cash')

class RelayClient {
  constructor (url) {
    this.url = url
  }

  static constructTextMessage (text, privKey) {
    // Construct vCard
    let textEntry = new messages.Entry()
    textEntry.setKind('text-utf8')
    let rawText = new TextEncoder('utf-8').encode(text)
    textEntry.setEntryData(rawText)

    // Construct payload
    let payload = new messages.Payload()
    payload.setTimestamp(Math.floor(Date.now() / 1000))
    payload.addEntries(textEntry)

    let serializedPayload = payload.serializeBinary()
    let hashbuf = cashlib.crypto.Hash.sha256(serializedPayload)
    let ecdsa = cashlib.crypto.ECDSA({ privkey: privKey, hashbuf })
    ecdsa.sign()

    let message = new messages.Message()
    let sig = ecdsa.sig.toCompact(1).slice(1)
    message.setPubKey(privKey.toPublicKey().toBuffer())
    message.setSignature(sig)
    message.setScheme(1)
    message.setSerializedPayload(serializedPayload)

    return message
  }

  static constructPriceFilterApplication (isPublic, acceptancePrice, notificationPrice, privKey) {
    // Construct PriceFilter
    let priceFilter = new filters.PriceFilter()
    priceFilter.setPublic(isPublic)
    priceFilter.setAcceptancePrice(acceptancePrice)
    priceFilter.setNotificationPrice(notificationPrice)

    // Construct Filter
    let filter = new filters.Filter()
    filter.setPriceFilter(priceFilter)

    // Construct FilterApplication
    let serializedFilter = filter.serializeBinary()
    let hashbuf = cashlib.crypto.Hash.sha256(serializedFilter)
    let ecdsa = cashlib.crypto.ECDSA({ privkey: privKey, hashbuf })
    ecdsa.sign()

    let filterApplication = new filters.FilterApplication()
    let sig = ecdsa.sig.toCompact(1).slice(1)
    filterApplication.setPubKey(privKey.toPublicKey().toBuffer())
    filterApplication.setSignature(sig)
    filterApplication.setScheme(1)
    filterApplication.setSerializedPayload(serializedFilter)

    return filterApplication
  }

  async getMessages (addr, token, startTime, endTime) {
    let url = `${this.url}/message/${addr.toLegacyAddress()}`

    let response
    try {
      response = await axios({
        method: 'get',
        url: url,
        headers: {
          'Authorization': token
        },
        params: {
          start: startTime,
          end: endTime
        }
      })
    } catch (err) {
      // TODO: Do something with err
    }
    if (response.status === 200) {
      let messageSet = messages.Message.deserializeBinary(response.data)
      return messageSet
    }
  }

  async putMessages (addr, messageSet) {
    let rawMetadata = messageSet.serializeBinary()
    let url = `${this.url}/message/${addr.toLegacyAddress()}`
    try {
      await axios({
        method: 'put',
        url: url,
        data: rawMetadata
      })
    } catch (err) {
      // TODO: Do something with err
    }
  }

  async getFilter (addr) {
    let url = `${this.url}/message/${addr.toLegacyAddress()}`
    let response
    try {
      response = await axios({
        method: 'get',
        url
      })
    } catch (err) {
      // TODO: Do something with err
    }
    if (response.status === 200) {
      let filtersMsg = filters.Filters.deserializeBinary(response.data)
      return filtersMsg
    }
  }

  async applyFilter (addr, filterApplication, token) {
    let rawApplication = filterApplication.serializeBinary()
    let url = `${this.url}/message/${addr.toLegacyAddress()}`
    try {
      await axios({
        method: 'put',
        url: url,
        headers: {
          'Authorization': token
        },
        data: rawApplication
      })
    } catch (err) {
      // TODO: Do something with err
    }
  }
}

export default RelayClient