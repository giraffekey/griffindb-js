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

async function find({ name, get_kv }, query, options) {
  let docs = []
  let promises = []
  let ids
  let sort

  const index = index_from_sort(options.sort)
  const index_ids = get_kv(`index/${name}/${index}`)
  if (index_ids) {
  	ids = index_ids
  	sort = false
  } else {
  	ids = get_kv(name)
  	sort = Object.keys(options.sort).length > 0
  }


}

/*
 * Search through the entire collection and retrieve those who match the query
 * Options:
 *   sort - Fields to sort in ascending or descending order
 *   skip - The amount of documents to skip from the final result
 *   limit - Maximum amount of documents to return
 *   fields - Fields to include/exclude
 */
function Find(col, query, options) {
  function sort(sort) {
    return Find(col, query, {
      ...options,
      sort,
    })
  }

  function skip(skip) {
    return Find(col, query, {
      ...options,
      skip,
    })
  }

  function limit(limit) {
    return Find(col, query, {
      ...options,
      limit,
    })
  }

  function fields(fields) {
    return Find(col, query, {
      ...options,
      fields,
    })
  }

  async function one() {
    options.one = true
    options.limit = 1
    return await find(col, query, options)
  }

  async function many() {
    options.one = false
    return await find(col, query, options)
  }

  return {
    sort,
    skip,
    limit,
    fields,
    one,
    many,
  }
}

module.exports = Find
