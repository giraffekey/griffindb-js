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
