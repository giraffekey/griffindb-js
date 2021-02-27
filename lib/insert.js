const { v4: uuidv4 } = require("uuid")
const pmap = require("promise.map")
const { isObject } = require("./util")

async function insert({ name, get_kv, set_kv }, docs, options) {
  if (options.one) docs = [docs]
  else if (!Array.isArray(docs)) {
    rej("Documents must be an array")
    return
  }

  const { ordered } = options
  let ids = []
  let promises = []

  for (let i = 0; i < docs.length; i++) {
  	const doc = docs[i]

  	if (isObject(doc) !== "Object") {
  	  if (ordered) {
  	  	rej(`Document ${i} must be an object`)
  	  	return
  	  } else {
  	  	console.error(`Document ${i} must be an object`)
  	  	continue
  	  }
  	}

    const id = uuidv4()

  	try {
  	  if (ordered) {
        await set_kv(id, { _id: id, ...doc })
      } else {
        promises.push(set_kv(id, { _id: id, ...doc }))
      }
  	  ids.push(id)
  	} catch (e) {
  	  if (ordered) {
  	    rej(e)
  	    return
  	  }
  	}
  }

  if (!ordered) await pmap(promises, p => p, 30)

  const ids_ = await get_kv(name) || []
  await set_kv(name, [...ids_, ...ids])

  return ids
}

/*
 * Search through the entire collection and retrieve those who match the query
 * Options:
 *   ordered - Prevent inserting remaining documents if one insert fails
 */
function Insert(col, docs, options) {
  function ordered(ordered) {
	if (ordered === undefined) ordered = true
	return Insert(col, docs, {
	  ...options,
	  ordered,
	})
  }

  async function one() {
    options.one = true
    return await insert(col, docs, options)
  }

  async function many() {
    options.one = false
    return await insert(col, docs, options)
  }

  return {
    ordered,
    one,
    many,
  }
}

module.exports = Insert
