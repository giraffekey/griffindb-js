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

const { v4: uuidv4 } = require("uuid")
const { isObject, matches } = require("./util")

async function replace({ name, get_kv, set_kv }, query, replacement, options) {
  if (isObject(replacement) !== "Object") {
    rej(`Replacement document must be an object`)
    return
  }

  let ret_id = null
  let j = 0

  const ids = await get_kv(name)

  if (ids) {
  	for (let i = 0; i < ids.length; i++) {
      const id = ids[i]
      const doc = await get_kv(id)

      if (doc && matches(doc, query)) {
        j++
        const doc = { _id: id, ...replacement }
        await set_kv(id, doc)
        ret_id = id
        break
      }
  	}
  }

  if (options.upsert && j === 0) {
    const id = uuidv4()
    ret_id = id
    const doc = { _id: id, ...replacement }
    await set_kv(id, doc)
  	await set_kv(name, ids ? [...ids, id] : [id])
  }

  return ret_id
}

/*
 * Replace a document that matches a query
 * Options:
 *   upsert - Create a document if no documents match
 */
function Replace(col, query, replacement, options) {
  function upsert(upsert) {
    return Replace(col, query, replacement, {
      ...options,
      upsert,
    })
  }

  async function one() {
    return await replace(col, query, replacement, options)
  }

  return {
    upsert,
    one,
  }
}

module.exports = Replace
