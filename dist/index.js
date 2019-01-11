import lodash from "lodash"
import Stringify from "json-stable-stringify"
import SubscriptionStore from "./subscriptionStore"
import * as builtin from "./builtin"

const HELPERS = {
    toFlat(subs) {
        if(!subs) {
            return []
        }

        if(lodash.isArray(subs) || !lodash.isObject(subs)) {
            throw new Error(`subs must be an object!`, subs)
        }

        const flatInstancesArr = lodash.values(subs)
        return flatInstancesArr
    },
}

export default {
    install(Vue, opts) {
        const err = [
            `Cannot install subscription module because the opts to install this plugin are incorrect!`,
            `You can use one of the preconfigured subscription functions as:`,
            `Vue.use(subsPlugin, { firestore: Firebase.firestote() }) or Vue.use(subsPlugin, { firebaseRealtime: Firebase.database() })`,
            ``,
            `Or provide your own function in opts, with the following signature`,
            `Vue.use(subsPlugin, { sub: yourFunction(path: any, value: fn) })`,
            `your sub function must return a function that will unsubscribe the subscription`,
            `It must call the value function provided in the params with new values from the subscription!`
        ].join('\n')

        if(!opts) {
            throw new Error(err)
        }

        const options = lodash.isArray(opts) ? opts : [opts]
        if(options.length === 0) {
            throw new Error(err)
        }

        if(options.length > 1 && !lodash.every(opts, o => o && o.name)) {
            throw new Error(`You have provided multiple subscriptions. Please provide a name property for each`)
        }

        const mods = options.map((o) => {
            let subFn = null
            if (o) {
                if (o.firestore && lodash.isObject(o.firestore)) {
                    subFn = builtin.firestore(o.firestore)
                } else if (o.firebaseRealtime && lodash.isObject(o.firebaseRealtime)) {
                    subFn = builtin.firebaseRealtime(o.firebaseRealtime)
                } else if (o.sub && lodash.isFunction(o.sub)) {
                    subFn = o.sub
                }
            }
            return {
                name: o.name,
                subFn
            }
        })

        if(!lodash.every(mods, m => m && lodash.isFunction(m.subFn))) {
            throw new Error(err)
        }

        lodash.each(mods, ({ name, subFn }) => {
            // create new store for subscriptions
            const subscriptionStore = SubscriptionStore(subFn)
            const VARS = {
                dSubs: name ? `${name}_dSubs` : `dSubs`,
                $subs: name ? `$${name}_subs` : `$subs`,
                $subData: name ? `$${name}_subData` : `$subData`,
                dSubs_subscriptions: name ? `${name}_dSubs.subscriptions` : `dSubs.subscriptions`
            }


            // create a mixin!
            const mixin = {
                data() {
                    return {
                        [VARS.dSubs]: {
                            destroyed: false,
                            keys: [],
                            subscriptions: []
                        }
                    }
                },
                watch: {
                    [VARS.$subs]: {
                        immediate: true,
                        handler(v, ov) {
                            if(lodash.isEqual(v, ov) || (!v && !ov)) {
                                return
                            }

                            const dSubs = this[VARS.dSubs]
                            try {
                                const flattened = HELPERS.toFlat(v)
                                if(!lodash.isEqual(flattened, dSubs.subscriptions)) {
                                    dSubs.keys = lodash.keys(v)
                                    dSubs.subscriptions = flattened
                                }
                            } catch(e) {
                                console.error(`Could not form subscriptions`)
                                throw e
                            }
                        }
                    },
                    [VARS.dSubs_subscriptions]: {
                        immediate: true,
                        async handler(v, ov) {
                            if(lodash.isEqual(v, ov) || (!v && !ov)) {
                                return
                            }

                            const instanceId = lodash.get(this, "_uid")
                            try {
                                const addSubs = lodash.differenceWith(v, ov, lodash.isEqual)
                                const removeSubs = lodash.differenceWith(ov, v, lodash.isEqual)

                                if(removeSubs.length) {
                                    const unsubPromises = removeSubs.map(path => subscriptionStore.dispatch('unsubscribe', { instanceId,  path }))
                                    await Promise.all(unsubPromises)
                                }
                                if(addSubs.length) {
                                    const subPromises = addSubs.map(path => subscriptionStore.dispatch('subscribe', { instanceId,  path }))
                                    await Promise.all(subPromises)
                                }
                            } catch(e) {
                                console.error("Failed to sub or unsub. Resetting $subs instance", this[VARS.$subs])
                                this[VARS.dSubs].subscriptions = []
                                throw e
                            }
                        }
                    }
                },
                beforeDestroy() {
                    const dSubs = this[VARS.dSubs]
                    dSubs.destroyed = true
                    if (dSubs.subscriptions) {
                        const instanceId = lodash.get(this, "_uid")
                        lodash.each(dSubs.subscriptions, path => subscriptionStore.dispatch('unsubscribe', { instanceId,  path }))
                    }
                },
                computed: {
                    [VARS.$subData]() {
                        const { destroyed, keys, subscriptions } = this[VARS.dSubs]
                        if(destroyed || !subscriptions || !subscriptions.length || !keys || !keys.length) {
                            return {}
                        }

                        const data = {}
                        const storeData = subscriptionStore.getters.all
                        lodash.each(subscriptions, (v, idx) => {
                            try {
                                const path = lodash.isObject(v) ? Stringify(v) : v
                                const key = keys[idx]
                                data[key] = storeData[path]
                            } catch(e) {
                                console.error(e)
                            }
                        })
                        return data
                    }
                }
            }

            Vue.mixin(mixin)
        })
    }
}
