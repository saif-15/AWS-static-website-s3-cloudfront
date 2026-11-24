// CloudFront Function (cloudfront-js-2.0), event type: viewer-request.
//
// S3 (via OAC) has no directory indexes, and the static export is built with
// `trailingSlash: true` (each route is `/route/index.html`). This rewrites:
//   /            -> /index.html
//   /city/tokyo/ -> /city/tokyo/index.html
//   /city/tokyo  -> /city/tokyo/index.html
// Requests for files (anything whose last segment has an extension, e.g.
// /_next/static/…js, /data/countries-110m.json, /city/tokyo/index.txt) pass through.
// The query string is left untouched (shared moments use ?city=…&at=…).
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- invoked by the CloudFront runtime, not by our code
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  if (uri.endsWith("/")) {
    request.uri = uri + "index.html";
  } else {
    var last = uri.substring(uri.lastIndexOf("/") + 1);
    if (last.indexOf(".") === -1) {
      request.uri = uri + "/index.html";
    }
  }
  return request;
}
