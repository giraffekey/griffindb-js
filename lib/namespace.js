// Copyright 2021 GiraffeKey
//
// Redistribution and use in source and binary forms, with or without modification,
// are permitted provided that the following conditions are met:
//
// 1. Redistributions of source code must retain the above copyright notice, this list of
// conditions and the following disclaimer.
// 
// 2. Redistributions in binary form must reproduce the above copyright notice, this list of 
// conditions and the following disclaimer in the documentation and/or other materials provided
// with the distribution.
// 
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR
// IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
// FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS
// BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
// BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR
// BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
// OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED
// OF THE POSSIBILITY OF SUCH DAMAGE.
//

const { genKeyPairFromSeed } = require("skynet-js")
const Collection = require("./collection")
const { isObject } = require("./util")

function Chain(keys, get_kv, set_kv) {
  async function get_(key) {
    const key_ = [...keys, key].join("/")
    const doc = await get_kv(key_)

    if (doc) {
      const { type, value } = doc
      
      if (type === "keys") {
        const create_obj = async (value, keys_) => {
          let obj = {}

          for (let i = 0; i < value.length; i++) {
            const key_ = value[i]
            const key = [...keys, ...keys_, key_].join("/")
            const doc = await get_kv(key)

            if (doc) {
              const { type, value: value_ } = doc
              if (type === "keys") {
                obj[key_] = await create_obj(value_, [...keys_, key_])
              } else if (type === "value") {
                obj[key_] = value_
              }
            }
          }

          return obj
        }

        return await create_obj(value, [key])
      } else if (type === "value") {
        return value
      }
    } else {
      return null
    }
  }

  async function set_(key, value) {
    const key_ = [...keys, key].join("/")

    const set_all = async (keys, key) => {
      if (keys.length > 0) {
        const parent_key = keys.join("/")
        const doc = await get_kv(parent_key)

        if (doc) {
          const { type } = doc
          if (type === "keys") {
            await set_kv(parent_key, { type: "keys", value: [...doc.value, key] })
          } else if (type === "value") {
            if (isObject(doc.value) === "Object") {
              await set_kv(parent_key, { type: "keys", value: [...Object.keys(doc.value), key] })

              const entries = Object.entries(doc.value)

              for (let i = 0; i < entries.length; i++) {
                const [key, value] = entries[i]
                await set_kv([...keys, key].join("/"), { type: "value", value })
              }
            } else {
              throw new Error("Cannot set key of non-object")
            }
          }
        } else {
          await set_kv(parent_key, { type: "keys", value: [key] })
        }

        set_all(keys.slice(0, -1), keys.slice(-1)[0])
      }
    }

    await set_all(keys, key)
    await set_kv(key_, { type: "value", value })
  }

  async function remove(key) {
    const key_ = [...keys, key].join("/")
    const { type } = await get_kv(key_)

    if (type === "keys") {
      const remove_obj = async (value, keys_) => {
        for (let i = 0; i < value.length; i++) {
          const key_ = value[i]
          const key = [...keys, ...keys_, key_].join("/")
          const { type, value: value_ } = await get_kv(key)
          await set_kv(key, null)
          if (type === "keys") {
            await remove_obj(value_, [...keys_, key_])
          }
        }
      }
      return await create_obj(value)
    } else if (type === "value") {
      return value
    }
  }

  async function keys_() {
  	const { type, value } = await get_kv(keys.join("/"))
    if (type === "keys") {
      return value
    } else {
      throw new Error("Cannot get keys of non-object")
    }
  }

  function chain(key) {
  	return Chain([...keys, key], get_kv, set_kv)
  }

  return {
    get: get_,
    set: set_,
    remove,
    keys: keys_,
    chain,
  }
}

function Namespace(seed, get_, set_) {
  const { publicKey, privateKey } = genKeyPairFromSeed(seed)
  
  function collection(name) {
  	return Collection(name, get_kv, set_kv)
  }

  async function get_kv(key) {
    return await get_(publicKey, privateKey, key)
  }

  async function set_kv(key, value) {
    await set_(publicKey, privateKey, key, value)
  }

  async function remove_kv(key) {
    await set_kv(key, null)
  }

  function chain(key) {
    return Chain([key], get_kv, set_kv)
  }

  return {
  	collection,
    get: get_kv,
    set: set_kv,
    remove: remove_kv,
    chain,
  }
}

module.exports = Namespace
