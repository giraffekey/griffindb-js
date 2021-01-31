// Copyright (C) 2021 GiraffeKey
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.
//

const { SkynetClient, deriveChildSeed, genKeyPairFromSeed } = require("skynet-js")
const bip39 = require("bip39")
const CryptoJS = require("crypto-js")
const Collection = require("./collection")

var client
var backup

function encrypt(data, privateKey) {
  return CryptoJS.AES.encrypt(JSON.stringify(data), privateKey).toString()
}

function decrypt(data, privateKey) {
  return JSON.parse(CryptoJS.AES.decrypt(data, privateKey).toString(CryptoJS.enc.Utf8))
}

function newClient(portal, options) {
  let client = new SkynetClient(portal || "https://siasky.net", options)

  client.get = (publicKey, privateKey, dataKey) => {
    return new Promise((res, rej) => {
      const resolve = data => data ? res(decrypt(data, privateKey)) : res(null)
      const data = localStorage.getItem(`${publicKey}/${dataKey}`)
      if (data) resolve(data)
      else client.db.getJSON(publicKey, dataKey)
        .then(({ data }) => resolve(data))
        .catch(async err => {
          let resolved = false
          for (let i = 0; i < backup.length; i++) {
            const client = new SkynetClient(backup[i])
            try {
              const { data } = await client.db.getJSON(publicKey, dataKey)
              resolve(data)
              resolved = true
              break
            } catch (e) {}
          }
          if (!resolved) rej(err)
        })
    })
  }

  client.set = (publicKey, privateKey, dataKey, data) => {
    return new Promise((res, rej) => {
      const enc = encrypt(data, privateKey)
      localStorage.setItem(`${publicKey}/${dataKey}`, enc)
      client.db.setJSON(privateKey, dataKey, enc)
        .then(() => res(true))
        .catch(async () => {
          let resolved = false
          for (let i = 0; i < backup.length; i++) {
            const client = new SkynetClient(backup[i])
            try {
              await client.db.setJSON(privateKey, dataKey, enc)
              res(true)
              resolved = true
              break
            } catch (e) {}
          }
          if (!resolved) {
            // We don't want to save the non-derived keys in localStorage
            if (dataKey !== "exists") {
              const failed = localStorage.getItem("failed") || []
              localStorage.setItem("failed", [...failed, { privateKey, dataKey, enc }])
            }
            res(false)
          }
        })
    })
  }

  return client
}

function Namespace(seed) {
  const { publicKey, privateKey } = genKeyPairFromSeed(seed)
  
  function collection(name) {
  	return Collection(name, get_kv, set_kv)
  }

  async function get_kv(key) {
    return await client.get(publicKey, privateKey, key)
  }

  async function set_kv(key, value) {
    await client.set(publicKey, privateKey, key, value)
  }

  return {
  	collection,
    get_kv,
    set_kv,
  }
}

function Griffin(portal, options, backups) {
  client = newClient(portal, options)
  backup = backups

  // Continuously attempt to publish failed set operations
  setInterval(() => {
    let lock = false
    const failed = localStorage.getItem("failed") || []
    for (let i = 0; i < failed.length; i++) {
      const { privateKey, dataKey, enc } = failed[i]
      const remove = () => {
        // Ensures multiple promises aren't editing failed
        while (lock) {}
        lock = true
        let failed = localStorage.getItem("failed")
        const index = failed.findIndex(b => {
          const a = { privateKey, dataKey, enc }
          return JSON.stringify(a) === JSON.stringify(b)
        })
        failed.splice(index, 1)
        localStorage.setItem("failed", failed)
      }
      client.db.setJSON(privateKey, dataKey, enc)
        .then(() => remove())
        .catch(async () => {
          let resolved
          for (let i = 0; i < backup.length; i++) {
            const client = new SkynetClient(backup[i])
            try {
              await client.db.setJSON(privateKey, dataKey, enc)
              remove()
              break
            } catch (e) {}
          }
        })
    }
  }, 60000)

  async function gen() {
    const key = bip39.generateMnemonic()
    const { publicKey, privateKey } = genKeyPairFromSeed(key)
    await client.set(publicKey, privateKey, "exists", true)
  	return key
  }

  async function namespace(ns, key) {
    const { publicKey, privateKey } = genKeyPairFromSeed(key)
    const exists = await client.get(publicKey, privateKey, "exists")
    if (!exists) throw new Error("Key is invalid")
    console.log(exists)
  	return Namespace(deriveChildSeed(key, ns))
  }

  function portal_(portal, options) {
  	client = newClient(portal, options)
  }

  function backups(backups) {
    backup = backups
  }

  return {
  	gen,
  	namespace,
  	portal: portal_,
    backups,
  }
}

module.exports = Griffin
