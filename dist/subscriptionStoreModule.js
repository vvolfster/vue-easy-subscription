import lodash from "lodash"
import Vuex from "vuex"
import Vue from "vue"
import Stringify from "json-stable-stringify"

Vue.use(Vuex)

function getStore(subFunction) {
    const map = {
        instances: {},
        unsubFns: {}
    }

    return {
        namespaced: true,
        state: {
            valueByPath: {},
        },
        actions: {
            setValue: ({ commit }, { path, value })  => commit("SET_VALUE", { path, value }),
            async subscribe({ dispatch }, { path, instanceId }) {
                if(!path) {
                    return
                }

                const stablePath = lodash.isObject(path) ? Stringify(path) : path
                if (!map.instances[stablePath]) {
                    try {
                        const unsub = await subFunction(path, value => dispatch(`setValue`, { path: stablePath, value }))
                        map.unsubFns[stablePath] = unsub
                        map.instances[stablePath] = [instanceId]
                    } catch(e) {
                        console.error(`SubscriptionStore:: Unable to make a subscription to`, path)
                        throw e
                    }
                } else {
                    map.instances[stablePath].push(instanceId)
                }
            },
            unsubscribe({ commit }, { path, instanceId }) {
                if(!path) {
                    return
                }

                const stablePath = lodash.isObject(path) ? Stringify(path) : path
                const instancesByPath = map.instances[stablePath]
                if(!instancesByPath) {
                    return
                }

                const idx = instancesByPath.indexOf(instanceId)
                if (idx === -1) {
                    return
                }

                instancesByPath.splice(idx, 1)
                if(!instancesByPath.length) {
                    // time to unsub from this
                    map.unsubFns[stablePath]();
                    commit(`DELETE_VALUE`, { path: stablePath })
                    delete map.instances[stablePath];
                    delete map.unsubFns[stablePath];
                }
            }
        },
        getters: {
            all: state => state.valueByPath
        },
        mutations: {
            SET_VALUE: (state, { path, value }) => Vue.set(state.valueByPath, path, value),
            DELETE_VALUE: (state, { path }) => Vue.delete(state.valueByPath, path),
        }
    }
}


export default getStore;
