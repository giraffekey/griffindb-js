const { v4: uuidv4 } = require("uuid")
const { clean, unclean, matches } = require("./util")

function replace(SEA, col, key, backup, query, replacement, options) {
	return new Promise((res, rej) => {
		if (Object.prototype.toString.call(replacement) !== "[object Object]") {
			rej(`Replacement document must be an object`)
			return
		}

		let ret_id = null
		let j = 0

		col.once(async data => {
			if (data) {
				delete data._
				const entries = Object.entries(data)

				for (let i = 0; i < entries.length; i++) {
					let [id, doc] = entries[i]
					if (doc) {
						try {
							doc = await SEA.decrypt(doc, key)
							delete doc._
							doc = await unclean(col, doc)
							if (matches(doc, query)) {
								j++
								let doc = { _id: id, ...replacement }
								doc = await clean(doc)
								doc = await SEA.encrypt(doc, key)
								await new Promise((res, rej) => {
									col.get(id).put(doc, ack => {
										if (ack.err) {
											console.error(`Failed to insert document ${i}`)
										} else {
											ret_id = id
											col.once(d => {
												const key = `${d._["#"]}/${id}`
												const data = doc
												backup(key, data)
											})
											res()
										}
									})
								})
								break
							}
						} catch(e) {
							rej(e)
							return
						}
					}
				}

				if (options.upsert && j === 0) {
					const id = uuidv4()
					doc = await clean(replacement)
					doc = await SEA.encrypt(doc, key)
					await new Promise((res, rej) => {
						col.get(id).put(doc, ack => {
							if (ack.err) {
								console.error(`Failed to insert document ${i}`)
							} else {
								ret_id = id
								col.once(d => {
									const key = `${d._["#"]}/${id}`
									const data = doc
									backup(key, data)
								})
								res()
							}
						})
					})
				}

				col.once(d => {
					const key = d._["#"]
					backup(key, d)
				})

				res(ret_id)
			} else {
				rej("Collection was not found")
			}
		})
	})
}

/*
 * Replace a document that matches a query
 * Options:
 *   upsert - Create a document if no documents match
 */
function Replace(SEA, col, key, backup, query, replacement, options) {
	function upsert(upsert) {
		return Replace(SEA, col, key, backup, query, replacement, {
			...options,
			upsert,
		})
	}

	function one() {
		return replace(SEA, col, key, backup, query, replacement, options)
	}

	return {
		upsert,
		one,
	}
}

module.exports = Replace

