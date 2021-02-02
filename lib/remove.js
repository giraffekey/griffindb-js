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

const pmap = require("promise.map")
const { matches } = require("./util")

async function remove({ name, get_kv, set_kv }, query, options) {
  let ids = []
  let promises = []
  let j = 0

  const col_ids = await get_kv(name)

  if (col_ids) {
  	for (let i = 0; i < col_ids.length; i++) {
      if (options.limit > 0 && j >= options.limit) {
      	break
      }

      const id = col_ids[i]
      const doc = await get_kv(id)

      if (doc && matches(doc, query)) {
      	j++
      	promises.push(set_kv(id, null))
      	ids.push(id)
      }
  	}
  }

  await pmap(promises, p => p, 30)

  const removed = col_ids.filter(id => !ids.includes(id))
  await set_kv(name, removed)

  return ids
}

/*
 * Remove documents that match a query
 * Options:
 *   limit - Maximum amount of documents to delete
 */
function Remove(col, query, options) {
  function limit(limit) {
    return Remove(col, query, {
      ...options,
      limit,
    })
  }

  async function one() {
    options.limit = 1
    return await remove(col, query, options)
  }

  async function many() {
    return await remove(col, query, options)
  }

  return {
    limit,
    one,
    many,
  }
}

module.exports = Remove
