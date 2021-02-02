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

function change(doc, updateDoc) {
  let new_doc = doc

  if (updateDoc.$inc) {
    const entries = Object.entries(updateDoc.$inc)

    for (let i = 0; i < entries.length; i++) {
      const [key, value] = entries[i]
      new_doc[key] += value
    }
  }

  if (updateDoc.$min) {
    const entries = Object.entries(updateDoc.$min)

    for (let i = 0; i < entries.length; i++) {
      const [key, value] = entries[i]
      if (new_doc[key] > value) new_doc[key] = value
    }
  }

  if (updateDoc.$max) {
    const entries = Object.entries(updateDoc.$max)

    for (let i = 0; i < entries.length; i++) {
      const [key, value] = entries[i]
      if (new_doc[key] < value) new_doc[key] = value
    }
  }

  if (updateDoc.$mul) {
    const entries = Object.entries(updateDoc.$mul)

    for (let i = 0; i < entries.length; i++) {
      const [key, value] = entries[i]
      new_doc[key] *= value
    }
  }

  if (updateDoc.$rename) {
    const entries = Object.entries(updateDoc.$rename)

    for (let i = 0; i < entries.length; i++) {
      const [key, new_key] = entries[i]
      new_doc[new_key] = new_doc[key]
      delete new_doc[key]
    }
  }

  if (updateDoc.$set) {
    const entries = Object.entries(updateDoc.$set)

    for (let i = 0; i < entries.length; i++) {
      const [key, value] = entries[i]
      new_doc[key] = value
    }
  }

  if (updateDoc.$unset) {
    const entries = Object.entries(updateDoc.$unset)

    for (let i = 0; i < entries.length; i++) {
      const [key, value] = entries[i]
      delete new_doc[key]
    }
  }

  if (updateDoc.$call) {
    const entries = Object.entries(updateDoc.$call)

    for (let i = 0; i < entries.length; i++) {
      const [key, value] = entries[i]

      const funcs = Object.entries(value)
      for (let j = 0; j < funcs.length; j++) {
      	const [func, value] = funcs[j]
      	new_doc[key][func](value)
      }
    }
  }

  return new_doc
}

async function update({ name, get_kv, set_kv }, query, updateDoc, options) {
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
  	  	promises.push(set_kv(id, change(doc, updateDoc)))
        ids.push(id)
  	  }
  	}
  }

  await pmap(promises, p => p, 30)

  return ids
}

/*
 * Update documents that match a query
 * Options:
 *   limit - Maximum amount of documents to delete
 *   upsert - Create a document if no documents match (does nothing right now)
 */
function Update(col, query, updateDoc, options) {
  function limit(limit) {
    return Update(col, query, updateDoc, {
      ...options,
      limit,
    })
  }

  function upsert(upsert) {
    return Update(col, query, updateDoc, {
      ...options,
      upsert,
    })
  }

  async function one() {
    options.one = true
    options.limit = 1
    return await update(col, query, updateDoc, options)
  }

  async function many() {
    options.one = false
    return await update(col, query, updateDoc, options)
  }

  return {
    limit,
    upsert,
    one,
    many,
  }
}

module.exports = Update
