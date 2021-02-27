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
