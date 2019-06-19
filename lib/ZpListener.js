// homebridge-zp/lib/ZpListener.js
// Copyright © 2019 Erik Baauw. All rights reserved.
//
// Homebridge plugin for Sonos ZonePlayer.

'use strict'

const debug = require('debug')
const events = require('events')
const http = require('http')
const os = require('os')
const ZpXmlParser = require('./ZpXmlParser')

class ZpListener extends events.EventEmitter {
  // Convert string with IP address to int.
  static _ipToInt (ip) {
    const a = ip.split('.')
    return a[0] << 24 | a[1] << 16 | a[2] << 8 | a[3]
  }

  // Check whether ip1 and ip2 are in the same network.
  static _inSameNetwork (ip1, ip2, netmask) {
    return (ZpListener._ipToInt(ip1) & ZpListener._ipToInt(netmask)) ===
           (ZpListener._ipToInt(ip2) & ZpListener._ipToInt(netmask))
  }

  // Find my address for network of ip.
  static _findMyIpFor (ip) {
    const myIps = []
    const interfaces = os.networkInterfaces()
    for (const id in interfaces) {
      for (const alias of interfaces[id]) {
        if (
          alias.family === 'IPv4' && alias.internal === false
        ) {
          myIps.push([alias.address, alias.netmask])
        }
      }
    }
    if (myIps.length === 1 && ip == null) {
      return myIps[0][0]
    }
    if (myIps.length > 0 && ip != null) {
      for (const myIp of myIps) {
        if (ZpListener._inSameNetwork(ip, myIp[0], myIp[1])) {
          return myIp[0]
        }
      }
    }
    return null
  }

  constructor () {
    super()
    this._debug = debug('ZpListener')
    this._myPort = 0
    this._clients = {}
    this._parser = new ZpXmlParser()
    this._server = http.createServer((request, response) => {
      let buffer = ''
      request.on('data', (data) => {
        buffer += data
      })
      request.on('end', async () => {
        try {
          request.body = buffer
          this._debug('%s %s', request.method, request.url)
          if (request.method === 'GET' && request.url === '/notify') {
            // Provide an easy way to check that listener is reachable.
            response.writeHead(200, { 'Content-Type': 'text/plain' })
            response.write(
              `listening to ${Object.keys(this._clients).length} clients`
            )
          } else if (request.method === 'NOTIFY') {
            const array = request.url.split('/')
            if (array.length === 5) {
              array.splice(3, 0, 'ZonePlayer')
            }
            const client = this._clients[array[2]]
            if (
              array[1] === 'notify' && client !== null &&
              array[3] != null && array[4] != null
            ) {
              // this._debug('%s %s event: %s', array[3], array[4], request.body)
              const payload = await this._parser.parse(request.body)
              // this._debug('%s %s event: %j', array[3], array[4], payload)
              client.emit('event', array[3], array[4], payload)
            }
          }
          response.end()
        } catch (error) {
          this.emit('error', error)
        }
      })
    })
    this._server.on('error', (error) => { this.emit('error', error) })
    this._server.on('close', () => {
      // Doesn't get triggered?
      this.emit('close', this._callbackUrl)
      delete this._callbackUrl
    })
  }

  async listen (ip) {
    if (this._callbackUrl != null) {
      return
    }
    return new Promise((resolve, reject) => {
      this._debug('_listen(%j)', ip)
      try {
        if (this._myIp == null) {
          this._myIp = ZpListener._findMyIpFor(ip)
          if (this._myIp == null) {
            return reject(new Error('cannot determine my IPv4 address'))
          }
        }
        if (this._myPort == null) {
          this._myPort = 0
        }
        this._server.listen(this._myPort, this._myIp, () => {
          const address = this._server.address()
          this._myIp = address.address
          this._myPort = address.port
          this._callbackUrl =
            'http://' + this._myIp + ':' + this._myPort + '/notify'
          this.emit('listening', this._callbackUrl)
          this._debug('_listen(%j) => %j', ip, this._callbackUrl)
          return resolve()
        })
      } catch (error) {
        return reject(error)
      }
    })
  }

  close () {
    this.emit('close', this._callbackUrl)
    delete this._callbackUrl
    this._server.close()
  }

  async addClient (zpClient) {
    this._debug('addClient(%j)', zpClient)
    this._clients[zpClient.id] = zpClient
    await this.listen(zpClient.ip)
    const callbackUrl = this._callbackUrl + '/' + zpClient.id
    this._debug('addClient(%j) => %j', zpClient, callbackUrl)
    return callbackUrl
  }

  async removeClient (zpClient) {
    delete this._clients[zpClient._id]
    if (Object.keys(this._clients).length === 0) {
      this.close()
    }
  }
}

module.exports = ZpListener