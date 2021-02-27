const { SkynetClient, deriveChildSeed, genKeyPairFromSeed } = require("skynet-js")
const bip39 = require("bip39")
const CryptoJS = require("crypto-js")
const Namespace = require("./namespace")

var client
var backup

function encrypt(data, privateKey) {
  return CryptoJS.AES.encrypt(JSON.stringify(data), privateKey).toString()
}

function decrypt(data, privateKey) {
  return JSON.parse(CryptoJS.AES.decrypt(data, privateKey).toString(CryptoJS.enc.Utf8))
}

function newClient(portal, options) {
  return new SkynetClient(portal || "https://siasky.net", options)
}

function get_(publicKey, privateKey, dataKey) {
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

function set_(publicKey, privateKey, dataKey, data) {
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
        const failed = localStorage.getItem("failed")
        const a = JSON.stringify({ privateKey, dataKey, enc })
        const failed_ = failed.filter(b => (a !== JSON.stringify(b)))
        localStorage.setItem("failed", failed_)
        lock = false
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
    await set_kvnew SkynetClient(portal || "https://siasky.net", options)(publicKey, privateKey, "exists", true)
  	return key
  }

  async function namespace(ns, key) {
    const { publicKey, privateKey } = genKeyPairFromSeed(key)
    const exists = await get_(publicKey, privateKey, "exists")
    if (!exists) throw new Error("Key is invalid")
    console.log(exists)
  	return Namespace(deriveChildSeed(key, ns), get_, set_)
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
