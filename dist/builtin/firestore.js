// const lodash = require('lodash')
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
    },
    singleSub(firestore, path, value) {
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
}

function whereIsValid(where) {
    if (!where || !lodash.isArray(where) || !where.length) {
        return false
    }

    return lodash.every(where, (entry) => {
        if (lodash.isArray(entry)) {
            return entry.length === 3
        }
        if (lodash.isObject(entry)) {
            if (!entry.or) {
                return false
            }
            return lodash.every(entry.or, arr => lodash.isArray(arr) && arr.length === 3)
        }
        return false
    })
}

function getWhereSets(fsCollection, where, value) {
    const blankUnsub = () => true
    const unsubFns = []
    const state = {
        and: null,
        or: {}
    }
    const ands = where.filter(w => lodash.isArray(w))
    const ors = where.filter(w => lodash.isObject(w) && w.or).map(w => w.or)

    function emitValue() {
        const andReady = !ands.length || state.and !== null
        const orsReady = !ors.length || (lodash.keys(state.or).length === ors.length && lodash.every(state.or, or => lodash.every(or, o => o !== null)))

        if (!andReady || !orsReady) {
            return
        }

        const sets = ands.length ? [state.and] : []
        lodash.each(state.or, (arrays) => {
            const flattenedOnce = lodash.flattenDepth(arrays, 1)
            const set = lodash.uniqBy(flattenedOnce, i => i.id)
            sets.push(set)
        })

        const intersecting = lodash.intersectionBy(...sets, i => i.id)
        const asObject = lodash.reduce(intersecting, (acc, v) => {
            acc[v.id] = v
            return acc
        }, {})

        // const setOnlyIds = sets.map(s => s.map(i => i.id))
        // console.log('emit value', setOnlyIds)
        value(asObject)
    }

    function getQuery(wheres, fn) {
        if (wheres && wheres.length) {
            const query = lodash.reduce(wheres, (acc, arr) => {
                const [field, opStr, val] = arr
                return acc.where(field, opStr, val)
            }, fsCollection)
            return query.onSnapshot(snap => listeners.collectionListener(snap, fn))
        }
        fn([])
        return blankUnsub
    }

    const andUnsub = getQuery(ands, (result) => {
        state.and = lodash.values(result)
        emitValue()
    })

    unsubFns.push(andUnsub)

    lodash.each(ors, (arr, outerIdx) => {
        lodash.each(arr, (singleWhere, innerIdx) => {
            const name = `entry${outerIdx}[${innerIdx}]`
            lodash.set(state.or, name, null)

            const unsub = getQuery([singleWhere], (result) => {
                lodash.set(state.or, name, lodash.values(result))
                emitValue()
            })
            unsubFns.push(unsub)
        })
    }, [])

    function unsubAll() {
        const promises = unsubFns.map(fn => fn())
        return Promise.all(promises)
    }

    return unsubAll
}


function getSubFn(firestore) {
    const sub = async (path, value) => {
        if(!path) {
            throw new Error(`Cannot subscribe to anything without a path!`)
        }

        if (lodash.isString(path)) {
            return listeners.singleSub(firestore, path, value)
        }

        if (lodash.isArray(path)) {
            if (!lodash.every(path, lodash.isString)) {
                throw new Error(`Cannot subscribe because each member of the array isn't a string!`)
            }

            // create a magical value function for the array!
            const arr = []
            const depositValue = (v, idx) => {
                arr[idx] = v
                value(arr.filter(Boolean))
            }

            const allUnsubs = path.map((str, idx) => listeners.singleSub(firestore, str, v => depositValue(v, idx)))
            
            const singleUnsub = () => {
                const promises = allUnsubs.map(fn => fn())
                return Promise.all(promises)
            }
            
            return singleUnsub
        }

        if (lodash.isObject(path)) {
            const { collection, where } = path
            if(!collection || !lodash.isString(collection)) {
                throw new Error(`Cannot subscribe because collection is not a string! ${JSON.stringify(path)}`)
            }

            const fsCollection = firestore.collection(collection)
            if (!whereIsValid(where)) {
                return fsCollection.onSnapshot(snap => listeners.collectionListener(snap, value))
            }

            return getWhereSets(fsCollection, where, value)
        }

        throw new Error(`path must be a string or an object!`)
    }
    return sub
}

// module.exports = { getSubFn }
export default { getSubFn }
