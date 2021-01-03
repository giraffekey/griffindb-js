const pmap = require("promise.map")

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

function find(SEA, col, key, query, options) {
	return new Promise((res, rej) => {
		let docs = []
		let promises = []

		col.once(async data => {
			if (data) {
				const entries = Object.entries(data)

				for (let i = 1; i < entries.length; i++) {
					let [id, doc] = entries[i]
					try {
						doc = await SEA.decrypt(doc, key)
						delete doc._
						docs.push(await clean(col, doc))
					} catch(e) {
						rej(e)
						return
					}
				}

				res(docs)
			} else {
				rej("Collection was not found")
			}
		})
	})
}

/*
 * Search through the entire collection and retrieve those who match the query
 * Options:
 *   sort - Fields to sort in ascending or descending order
 *   skip - The amount of documents to skip from the final result
 *   limit - Maximum amount of documents to return
 *   fields - Fields to include/exclude
 */
function Find(SEA, col, key, query, options) {
	function sort(sort) {
		return Find(SEA, col, key, query, {
			...options,
			sort,
		})
	}

	function skip(skip) {
		return Find(SEA, col, key, query, {
			...options,
			skip,
		})
	}

	function limit(limit) {
		return Find(SEA, col, key, query, {
			...options,
			limit,
		})
	}

	function fields(fields) {
		return Find(SEA, col, key, query, {
			...options,
			fields,
		})
	}

	function one() {
		options.one = true
		options.limit = 1
		return find(SEA, col, key, query, options)
	}

	function many() {
		options.one = false
		return find(SEA, col, key, query, options)
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
