const Find = require("./find")
const Insert = require("./insert")
const Update = require("./update")
const Replace = require("./replace")
const Remove = require("./remove")
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
    return Remove(col, query_, options_)
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
