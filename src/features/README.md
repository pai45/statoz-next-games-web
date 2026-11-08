# Features

Each directory represents a product capability and owns its UI, state, data
adapters, and feature-specific types. Keep route files in `src/app` thin.

Game modules may contain an `engine` for deterministic rules and a `state`
folder for browser interaction state. Put code in `shared` only after it is
genuinely reused and contains no feature-specific business behavior.
