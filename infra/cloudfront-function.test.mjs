// Quick local check of the CloudFront Function rewrite rules: node infra/cloudfront-function.test.mjs
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const src = readFileSync(new URL("./cloudfront-function.js", import.meta.url), "utf8");
const handler = new Function(`${src}; return handler;`)();
const run = (uri) => handler({ request: { uri, querystring: {} } }).uri;

assert.equal(run("/"), "/index.html");
assert.equal(run("/bookmarks"), "/bookmarks/index.html");
assert.equal(run("/bookmarks/"), "/bookmarks/index.html");
assert.equal(run("/city/st-johns"), "/city/st-johns/index.html");
assert.equal(run("/city/st-johns/"), "/city/st-johns/index.html");
assert.equal(run("/_next/static/chunks/abc.js"), "/_next/static/chunks/abc.js");
assert.equal(run("/data/countries-110m.json"), "/data/countries-110m.json");
assert.equal(
  run("/city/tokyo/__next.city.$d$slug.__PAGE__.txt"),
  "/city/tokyo/__next.city.$d$slug.__PAGE__.txt",
);
assert.equal(run("/404.html"), "/404.html");
console.log("cloudfront-function: all rewrite cases pass");
