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
	  await set_kv(id, doc)
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
