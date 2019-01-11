import lodash from "lodash"

function getSubFn(database) {
    const sub = async (path, value) => {
        if(!path || !lodash.isString(path)) {
            throw new Error(`firebase realtime db sub path must be a string!`)
        }

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
    return sub
}


export default { getSubFn }
