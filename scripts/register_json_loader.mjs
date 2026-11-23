import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./json_loader.mjs", import.meta.url);
