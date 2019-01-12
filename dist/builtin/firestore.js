import lodash from "lodash"

const listeners = {
    collectionListener: async (snap, value) => {
        const ids = snap.docs.map(doc => doc.id)
        const data = await Promise.all(snap.docs.map(doc => doc.data()))
        const val = lodash.reduce(data, (acc, v, idx) => {
            const id = ids[idx]
            if (!v) {
                acc[id] = null
            } else {
                acc[id] = { id, ...v }
            }
            return acc
        }, {})
        value(val)
    },
    documentListener: async (snapshot, value) => {
        const v = await snapshot.data()
        if (v) {
            v.id = snapshot.id
        }
        value(v)
    }
}

function getSubFn(firestore) {
    const sub = async (path, value) => {
        if(!path) {
            throw new Error(`Cannot subscribe to anything without a path!`)
        }

        if (lodash.isString(path)) {
            const flat = lodash.compact(path.split("/"))
            if (flat.length < 1) {
                throw new Error(`Cannot subscribe to ${path}. Minimum path len is 1!`)
            }

            const listenerFn = flat.length % 2 === 0 ? listeners.documentListener : listeners.collectionListener
            const ref = lodash.reduce(flat, (acc, name, idx) => {
                if (idx === 0) {
                    return firestore.collection(name);
                }

                return idx % 2 === 0 ? acc.collection(name) : acc.doc(name)
            }, null)

            return ref.onSnapshot(snapshot => listenerFn(snapshot, value))
        }

        if (lodash.isObject(path)) {
            const { collection, where } = path
            if(!collection || !lodash.isString(collection)) {
                throw new Error(`Cannot subscribe because collection is not a string! ${JSON.stringify(path)}`)
            }

            const fsCollection = firestore.collection(collection)
            if (!where || !lodash.isArray(where) || !where.length || !lodash.every(where, arr => arr.length === 3)) {
                return fsCollection.onSnapshot(snap => listeners.collectionListener(snap, value))
            }

            lodash.each(where, (arr) => {
                const [field, opStr, val] = arr
                fsCollection.where(field, opStr, val)
            })

            return fsCollection.onSnapshot(snap => listeners.collectionListener(snap, value))
        }

        throw new Error(`path must be a string or an object!`)
    }
    return sub
}

export default { getSubFn }
