const pmap = require("promise.map")
const { clean, matches } = require("./query")

function delete_(SEA, col, key, query, options) {
	return new Promise((res, rej) => {
		let ids = []
		let promises = []
		let j = 0

		col.once(async data => {
			if (data) {
				delete data._
				const entries = Object.entries(data)

				for (let i = 0; i < entries.length; i++) {
					if (options.limit > 0 && j >= options.limit) {
						break
					}

					let [id, doc] = entries[i]
					if (doc) {
						try {
							doc = await SEA.decrypt(doc, key)
							delete doc._
							doc = await clean(col, doc)
							if (matches(doc, query)) {
								j++
								promises.push(new Promise((res, rej) => {
									col.get(id).put(null, ack => {
										if (ack.err) {
											console.error(`Failed to delete document ${i}`)
										} else {
											ids.push(id)
											res()
										}
									})
								}))
							}
						} catch(e) {
							rej(e)
							return
						}
					}
				}

				await pmap(promises, p => p, 30)

				res(ids)
			} else {
				rej("Collection was not found")
			}
		})
	})
}

/*
 * Delete documents that match a query
 * Options:
 *   limit - Maximum amount of documents to delete
 */
function Delete(SEA, col, key, query, options) {
	function limit(limit) {
		return Delete(SEA, col, key, query, {
			...options,
			limit,
		})
	}

	function one() {
		options.limit = 1
		return delete_(SEA, col, key, query, options)
	}

	function many() {
		return delete_(SEA, col, key, query, options)
	}

	return {
		limit,
		one,
		many,
	}
}

module.exports = Delete
