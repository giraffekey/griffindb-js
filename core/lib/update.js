const pmap = require("promise.map")
const { clean, unclean, matches } = require("./util")

function change(doc, updateDoc) {
	if (updateDoc.$inc) {
		const entries = Object.entries(updateDoc.$inc)

		for (let i = 0; i < entries.length; i++) {
			const [key, value] = entries[i]
			console.log(key, doc[key], value, doc[key] + value)
			doc[key] += value
		}
	}

	if (updateDoc.$min) {
		const entries = Object.entries(updateDoc.$min)

		for (let i = 0; i < entries.length; i++) {
			const [key, value] = entries[i]
			if (doc[key] > value) doc[key] = value
		}
	}

	if (updateDoc.$max) {
		const entries = Object.entries(updateDoc.$max)

		for (let i = 0; i < entries.length; i++) {
			const [key, value] = entries[i]
			if (doc[key] < value) doc[key] = value
		}
	}

	if (updateDoc.$mul) {
		const entries = Object.entries(updateDoc.$mul)

		for (let i = 0; i < entries.length; i++) {
			const [key, value] = entries[i]
			doc[key] *= value
		}
	}

	if (updateDoc.$rename) {
		const entries = Object.entries(updateDoc.$rename)

		for (let i = 0; i < entries.length; i++) {
			const [key, new_key] = entries[i]
			doc[new_key] = doc[key]
			delete doc[key]
		}
	}

	if (updateDoc.$set) {
		const entries = Object.entries(updateDoc.$set)

		for (let i = 0; i < entries.length; i++) {
			const [key, value] = entries[i]
			doc[key] = value
		}
	}

	if (updateDoc.$unset) {
		const entries = Object.entries(updateDoc.$unset)

		for (let i = 0; i < entries.length; i++) {
			const [key, value] = entries[i]
			delete doc[key]
		}
	}

	return doc
}

function update(SEA, col, key, backup, query, updateDoc, options) {
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
								doc = change(doc, updateDoc)
								doc = await clean(doc)
								doc = await SEA.encrypt(doc, key)
								promises.push(new Promise((res, rej) => {
									col.get(id).put(doc, ack => {
										if (ack.err) {
											console.error(`Failed to delete document ${i}`)
										} else {
											ids.push(id)
											col.once(d => {
												const key = `${d._["#"]}/${id}`
												const data = doc
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

				// if (options.upsert && j === 0) {
				// 	doc = await SEA.encrypt(doc, key)
				// 	await new Promise((res, rej) => {
				// 		col.get(id).put(doc, ack => {
				// 			if (ack.err) {
				// 				console.error(`Failed to delete document ${i}`)
				// 			} else {
				// 				ids.push(id)
				// 				res()
				// 			}
				// 		})
				// 	})
				// }

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
 * Update documents that match a query
 * Options:
 *   limit - Maximum amount of documents to delete
 *   upsert - Create a document if no documents match
 */
function Update(SEA, col, key, backup, query, updateDoc, options) {
	function limit(limit) {
		return Update(SEA, col, key, backup, query, updateDoc, {
			...options,
			limit,
		})
	}

	function upsert(upsert) {
		return Update(SEA, col, key, backup, query, updateDoc, {
			...options,
			upsert,
		})
	}

	function one() {
		options.one = true
		options.limit = 1
		return update(SEA, col, key, backup, query, updateDoc, options)
	}

	function many() {
		options.one = false
		return update(SEA, col, key, backup, query, updateDoc, options)
	}

	return {
		limit,
		upsert,
		one,
		many,
	}
}

module.exports = Update
