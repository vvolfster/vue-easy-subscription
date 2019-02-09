import lodash from "lodash"

function singleSub(database, path, value) {
    const ref = database.ref(path)
    const id = lodash.last(lodash.compact(path.split('/')))
    ref.on('value', (snap) => {
        const val = snap.val()
        if(!lodash.isArray(val) && lodash.isObject(val)) {
            return value({ id, ...val })
        }
        return value(val)
    })
    return () => ref.off()
}

function getSubFn(database) {
    const sub = async (path, value) => {
        if(!path) {
            throw new Error(`firebase realtime db sub path must be a string!`)
        }

        if (lodash.isString(path)) {
            return singleSub(database, path, value)
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

            const allUnsubs = path.map((str, idx) => singleSub(database, str, v => depositValue(v, idx)))
            
            const singleUnsub = () => {
                const promises = allUnsubs.map(fn => fn())
                return Promise.all(promises)
            }
            
            return singleUnsub
        }

        throw new Error(`firebase realtime db sub path not valid!`)
    }
    return sub
}


export default { getSubFn }
