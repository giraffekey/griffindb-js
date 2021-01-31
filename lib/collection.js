// Copyright (C) 2021 GiraffeKey
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.
//

function Collection(name, get_kv, set_kv) {
  const col = { name, get_kv, set_kv }

  function find(query, options) {
    const query_ = query || {}
    const options_ = {
      sort: options.sort || {},
      skip: options.skip || 0,
      limit: options.limit || 0,
      fields: options.fields || {},
    }
    return Find(col, query_, options_)
  }

  function insert(docs, options) {
    const docs_ = docs || {}
    const options_ = {
      ordered: options.ordered || false,
    }
    return Insert(col, docs_, options_)
  }

  function update(query, updateDoc, options) {
    const query_ = query || {}
    const options_ = {
      limit: options.limit || 0,
      upsert: options.upsert || false,
    }
    return Update(col, query_, updateDoc, options_)
  }

  function replace(query, replacement, options) {
    const query_ = query || {}
    const options_ = {
      upsert: options.upsert || false,
    }
    return Replace(col, query_, replacement, options_)
  }

  function delete_(query, options) {
    const query_ = query || {}
    const options_ = {
      limit: options.limit || 0,
    }
    return Delete(col, query_, options_)
  }

  return {
	find,
	insert,
	update,
	replace,
	delete: delete_,
	// createIndex,
	// deleteIndex,
	// getIndices,
	// drop,
  }
}

module.exports = Collection
