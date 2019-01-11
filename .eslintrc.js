module.exports = {
    root: true,
    env: {
        node: true
    },
    extends: ["plugin:vue/essential", "@vue/airbnb"],
    rules: {
        "import/extensions": [
            "error",
            "always",z
            { js: "never",}
        ],
        // disallow reassignment of function parameters
        // disallow parameter object manipulation except for specific exclusions
        "no-param-reassign": [
            "error",
            {
                props: true,
                ignorePropertyModificationsFor: [
                    "state", // for vuex state
                    "acc", // for reduce accumulators
                    "e" // for e.returnvalue
                ]
            }
        ],
        // allow optionalDependencies
        "import/no-extraneous-dependencies": [
            "error",
            {
                optionalDependencies: ["test/unit/index.js"]
            }
        ],
        // allow debugger during development
        "no-debugger": process.env.NODE_ENV === "production" ? "error" : "off",

        indent: ["error", 4],
        "import/first": 0,
        "import/named": 2,
        "import/namespace": 2,
        "import/default": 2,
        "import/export": 2,
        "import/extensions": 0,
        "import/no-unresolved": 0,

        "max-len": [
            "error",
            {
                code: 7000,
                ignoreComments: true,
                ignoreStrings: true
            }
        ],
        "no-multi-spaces": "off",
        "arrow-body-style": "off",
        "comma-dangle": "off",
        "no-param-reassign": [
            "warn",
            {
                props: false
            }
        ],
        "linebreak-style": "off",
        "arrow-parens": "off",
        quotes: "off",
        "keyword-spacing": "off",
        "no-restricted-syntax": "off",
        "guard-for-in": "off",
        "space-before-blocks": "off",
        "brace-style": "off",
        "import/no-dynamic-require": "off",
        "no-console": [
            "warn",
            {
                allow: ["warn", "error"]
            }
        ],
        "no-shadow": [
            "error",
            {
                allow: ["resolve", "reject", "done", "cb"]
            }
        ],
        "object-curly-newline": "off",
        "semi": "off",
        // allow debugger during development
        "no-debugger": process.env.NODE_ENV === "production" ? 2 : 0,
    },
    parserOptions: {
        parser: "babel-eslint"
    }
};
