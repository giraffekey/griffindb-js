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

const Find = require("./find")
const Insert = require("./insert")
const Update = require("./update")
const Replace = require("./replace")
const Delete = require("./delete")
const { index_from_sort } = require("./util")

function Collection(name, get_kv, set_kv) {
  const col = { name, get_kv, set_kv }

  function find(query, options) {
    const query_ = query || {}
    const options_ = {
      sort: (options && options.sort) || {},
      skip: (options && options.skip) || 0,
      limit: (options && options.limit) || 0,
      fields: (options && options.fields) || {},
    }
    return Find(col, query_, options_)
  }

  function insert(docs, options) {
    const docs_ = docs || {}
    const options_ = {
      ordered: (options && options.ordered) || false,
    }
    return Insert(col, docs_, options_)
  }

  function update(query, updateDoc, options) {
    const query_ = query || {}
    const options_ = {
      limit: (options && options.limit) || 0,
      upsert: (options && options.upsert) || false,
    }
    return Update(col, query_, updateDoc, options_)
  }

  function replace(query, replacement, options) {
    const query_ = query || {}
    const options_ = {
      upsert: (options && options.upsert) || false,
    }
    return Replace(col, query_, replacement, options_)
  }

  function remove(query, options) {
    const query_ = query || {}
    const options_ = {
      limit: (options && options.limit) || 0,
    }
    return Delete(col, query_, options_)
  }

  async function createIndex(sort) {
    const index = index_from_sort(sort)
    const found = await find({}, { sort }).many()
    let ids = []

    for (let i = 0; i < found.length; i++) {
      const doc = found[i]
      await set_kv(doc._id, doc)
      ids.push(doc._id)
    }

    await set_kv(`index/${name}/${index}`, ids)

    const indices = await get_kv(`indices/${name}`)
    await set_kv(`indices/${name}`, [...indices, index])
  }

  async function removeIndex(sort) {
    const index = index_from_sort(sort)
    const key = `index/${name}/${index}`
    const ids = await get_kv(key)

    for (let i = 0; i < ids.length; i++) {
      await set_kv(ids[i], null)
    }

    await set_kv(key, null)

    let indices = await get_kv(`indices/${name}`)
    const i = indices.findIndex(i => i === index)
    indices.splice(i, 1)
    await set_kv(`indices/${name}`, indices)
  }

  async function getIndices() {
    return await get_kv(`indices/${name}`)
  }

  async function drop() {
    // tbd
  }

  return {
  	find,
  	insert,
  	update,
  	replace,
  	remove,
  	createIndex,
  	removeIndex,
  	getIndices,
  	drop,
  }
}

module.exports = Collection
