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
