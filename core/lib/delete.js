const pmap = require("promise.map")
const { unclean, matches } = require("./util")

function delete_(SEA, col, key, backup, query, options) {
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
							doc = await unclean(col, doc)
							if (matches(doc, query)) {
								j++
								promises.push(new Promise((res, rej) => {
									col.get(id).put(null, ack => {
										if (ack.err) {
											console.error(`Failed to delete document ${i}`)
										} else {
											ids.push(id)
											col.once(d => {
												const key = `${d._["#"]}/${id}`
												const data = null
												backup(key, data)
											})
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

				col.once(d => {
					const key = d._["#"]
					backup(key, d)
				})

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
function Delete(SEA, col, key, backup, query, options) {
	function limit(limit) {
		return Delete(SEA, col, key, backup, query, {
			...options,
			limit,
		})
	}

	function one() {
		options.limit = 1
		return delete_(SEA, col, key, backup, query, options)
	}

	function many() {
		return delete_(SEA, col, key, backup, query, options)
	}

	return {
		limit,
		one,
		many,
	}
}

module.exports = Delete
