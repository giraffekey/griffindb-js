async function clean(col, doc) {
	if (Object.prototype.toString.call(doc) === "[object Object]") {
		if (doc._array) {
			let arr = []
			delete doc._array
			const entries = Object.entries(doc)

			for (let i = 0; i < entries.length; i++) {
				const [index, value] = entries[i]
				arr[index] = await clean(col, value)
			}

			return arr
		} else {
			let obj = {}
			const entries = Object.entries(doc)

			for (let i = 0; i < entries.length; i++) {
				const [key, value] = entries[i]
				obj[key] = await clean(col, value)
			}

			return obj
		}
	} else if (typeof doc === "string" && doc.startsWith("~")) {
		return await new Promise((res, rej) => {
			col.get(doc).once(res)
		})
	} else {
		return doc
	}
}

function matches(doc, query) {
	const entries = Object.entries(query)

	for (let i = 0; i < entries.length; i++) {
		const [field, cond] = entries[i]
		const value = doc[field]

		if (Object.prototype.toString.call(cond) === "[object Object]") {
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

module.exports = {
	clean,
	matches,
}
