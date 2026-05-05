import mongoose from "mongoose";
import Car from "./src/models/car.model.js"; // Note: might need .js or without if ts-node paths are weird, let's use .js or whatever works in ESM

// Since the project is type: "module", tsx needs the import with .js extension or just import the ts file.
// Let's use TS imports directly
// Actually let's import it like this:
// import Car from "./src/models/car.model.ts";
