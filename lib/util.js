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
