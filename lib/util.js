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

function isObject(a) {
  const s = Object.prototype.toString.call(a)
  return s.slice("[object ".length, s.length - 1)
}

function matches(doc, query) {
  const entries = Object.entries(query)

  for (let i = 0; i < entries.length; i++) {
    const [field, cond] = entries[i]
    const value = doc[field]

    if (isObject(cond) === "Object") {
      if (cond.$not)
        if (!matches(value, cond.$not)) continue
        else return false

      if (cond.$eq)
        if (value === cond.$eq) continue
        else return false

      if (cond.$and) {
        const queries = cond.$and
        let match = true
        
        for (let i = 0; i < queries.length; i++) {
          if (!matches(value, queries[i])) {
            match = false
            break
          }
        }

        if (match) continue
        else return false
      }

      if (cond.$or) {
        const queries = cond.$or
        let match = false
        
        for (let i = 0; i < queries.length; i++) {
          if (matches(value, queries[i])) {
            match = true
            break
          }
        }

        if (match) continue
        else return false
      }

      const lt = cond.$lte ? value <= cond.$lte
               : cond.$lt  ? value <  cond.$lt
               : null

      const gt = cond.$gte ? value >= cond.$gte
               : cond.$gt  ? value >  cond.$gt
               : null

      if (lt === null && gt === null) continue
      else if (lt && gt || lt === null && gt || gt === null && lt) continue
      else return false
    }

    if (field === "$and") {
      const queries = cond
      let match = true
      
      for (let i = 0; i < queries.length; i++) {
        if (!matches(doc, queries[i])) {
          match = false
          break
        }
      }

      if (match) continue
      else return false
    }
    if (field === "$or") {
      const queries = cond
      let match = false
      
      for (let i = 0; i < queries.length; i++) {
        if (matches(doc, queries[i])) {
          match = true
          break
        }
      }

      if (match) continue
      else return false
    }

    if (value === cond) continue
    else return false
  }

  return true
}

function index_from_sort(sort) {
  let sorted = {}
  const entries = Object.entries(sort).sort(([a], [b]) => a.localeCompare(b))

  for (let i = 0; i < entries.length; i++) {
    const [key, value] = entries[i]
    sorted[key] = value
  }

  return JSON.stringify(sorted).replace(/\s/g, "")
}

module.exports = {
  isObject,
  matches,
  index_from_sort,
}
