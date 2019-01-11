# vue-easy-subscription

Quick and modular subscriptions for vue!

# Installation
	
	npm i vue-easy-subscription
	// NOTE: This library requires Vue and Vuex as peer dependencies!

# Initialization
There are 2 main ways to use library:

### A) As a Vue Plugin
In this scenario, a Vuex store will be created for you by default! Use option B if you wish to integrate it into an already existing Vuex store.

You can initialize the plugin in one of the following ways:

1. Initialize with firestore. The subscription function for firestore is already in the lib:
```javascript
import vueEasySub from "vue-easy-subscription"
import Vue from "vue"
import Firebase from "firebase"

Firebase.initializeApp({ ... your appConfig })

Vue.use(vueEasySub, { firestore: Firebase.firestore() })
```

2. Initialize with firebase realtime database. The subscription function for firebase realtime database is already in the lib:
```javascript
import vueEasySub from "vue-easy-subscription"
import Vue from "vue"
import Firebase from "firebase"

Firebase.initializeApp({ ... your appConfig })

Vue.use(vueEasySub, { firebaseRealtime: Firebase.database() })
```

3. Initialize with your own subscription function:
```javascript
import vueEasySub from "vue-easy-subscription"
Vue from "vue"
	
Vue.use(vueEasySub, { sub: yourSubFn(path, updateValueFn) })

/*
	1) yourSubFn must return a function that will unsubscribe from path. The function can be 
	async if you wish.
	2) yourSubFn must call the updateValueFn whenever the value at path is updated.

	---------------------
	Simple example subFn:
	---------------------
	const subFn = (path, updateValue) => {
		const updater = e => updateValue(e);
		window.addEventListener("scroll", updater);
		return () => window.removeEventListener("scroll", updater)
	}
*/
```
### B) As Vuex store module
Use this method if you wish to integrate into an already existing Vuex Store. It is very similar to using method A.

```javascript
import Vue from "vue"
import Vuex from "vuex"
import VueEasySub from "vue-easy-subscription"

const easySubModules = VueEasySub.getVuexModules(Vue, { sub: yourSubFn(path, updateValueFn) })
const store = new Vuex.Store({
	modules: {
		...easySubModules,
		yourStoreModuleA,
		yourStoreModuleB,
	}
})
```


# Usage
Usage of this lib is very simple and powerful.

#### To establish a subscription, declare a $subs object in your data()
```javascript
// inside your vue component
{
	data() {
		return {
			$subs: {
				pet: `pets/1`	// subFn will be called with path = `pets/1`
			}
		}
	},
	computed: {
		pet() {
			// a pet entry will become available in $subData when the subscription
			// returns a value.
			return this.$subData.pet
		}
	}
}
```
Once this component is destroyed and if there are no other subscribers to pets/1,
the library will automatically unsubscribe from pets/1

####  Establishing subscription using computed property.
```javascript
{
	props: ['petId'],	// assume we pass in 4
	computed: {
		$subs() {
			return {
				pet: 'pets/${this.petId}'	 // subFn will be called with path = `pets/4`
			}
		},
		pet() {
			// a pet entry will become available in $subData when the subscription
			// returns a value.
			return this.$subData.pet
		}
	}
}
```

#### Interdependent subscriptions!
```javascript
{
	props: ['petId'],	// assume we pass in 4
	computed: {
		$subs() {
			const subs = {
				pet: 'pets/${this.petId}'	 // subFn will be called with path = `pets/4`
			}
			
			if (this.pet) {	// we retrieved this from our subscription!!
				subs.owner = `owners/${this.pet.owner}`
			}

			return subs
		},
		pet() {  return this.$subData.pet },
		owner() { return this.$subData.owner }
	}
}
```

#### non-string subscriptions  (firestore example)
This example illustrates that the paths dont need to simple strings. As long as they are JSON serialiazible, any path is ok!
```javascript
{
	props: ['ownerId'],
	computed: {
		$subs() {
			return {
			    pets: {
			        collection: "pet",
			        where: [["ownerId", "==", this.ownerId]]
			    }
			}
		},
		// This will contain all the pets whose owner is what is passed into
		// the ownerId prop.
		pets() {  return this.$subData.pets },
	}
}
```

# Using multiple instances
The library comes equipped with being able to handle multiple subscription methods!

```javascript
Vue.use(VueEasySub, [
	{ firestore:  Firebase.firestore(), name:  'firestore' },
	{ firebaseRealtime:  Firebase.database(), name:  'firebase' },
	{ sub: yourSubFn, name: 'yours' }
])

/* 
subscriptions to firestore will be made using the $firestore_subs property
subscriptions to firebase will be made using the $firebase_subs property
subscriptions to yours will be made using the the $yours_subs property

the results of firestore subscriptions will be available at $firestore_subData
the results of firestore subscriptions will be available at $firebase_subData
the results of firestore subscriptions will be available at $yours_subData
*/

```



# Unsubscribing
As mentioned earlier, the lib will automatically unsubscribe when instances pointing to a subscription are destroyed. You don't have to manually call unsubscribe on anything!