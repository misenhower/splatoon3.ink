# Assets directory browser

This Worker renders read-only directory listings for the public R2 bucket without
running on ordinary object requests.

## Request routing

The browser-visible directory URLs end in `/`, for example:

- `https://assets.splatoon3.ink/`
- `https://assets.splatoon3.ink/data/`
- `https://assets.splatoon3.ink/splatnet/`

A Cloudflare URL Rewrite Rule rewrites only those requests to an internal prefix.
The rewrite is not visible to the client.

Filter expression:

```text
(http.host eq "assets.splatoon3.ink" and ends_with(http.request.uri.path, "/"))
```

Dynamic path rewrite:

```text
concat("/__directory", http.request.uri.path)
```

The Wrangler configuration routes only `assets.splatoon3.ink/__directory/*` to
the Worker. Every JSON file, calendar, image, and screenshot object continues to
go directly to the R2 custom domain.

## JSON listings

Each directory has a machine-readable representation at the same public URL:

```text
https://assets.splatoon3.ink/splatnet/images/?format=json
```

The response contains immediate child `directories`, immediate child `files`,
and an absolute `next` URL when another page is available. Listings are not
recursive. Clients can walk the bucket by following directory URLs and must
follow `next` verbatim rather than interpreting its opaque R2 cursor.

File records include their canonical URL, byte size, ETag, and R2 upload time.
The HTML listing displays that same upload time in its **Last modified** column.
JSON listing and error responses allow anonymous cross-origin reads with
`Access-Control-Allow-Origin: *`.

## Local preview

Start the Worker with its explicit local-development flag:

```sh
npm run assets-browser:dev
```

Then open `http://localhost:8787/`. Local mode accepts the natural directory
paths and serves linked objects from Wrangler's simulated R2 bucket. It never
connects to the production bucket.

## Validate without deploying

```sh
npm run assets-browser:test
npm run assets-browser:dry-run
```

## Production rollout

Do not create the URL Rewrite Rule until the Worker route has been deployed and
verified directly at an internal URL such as:

```text
https://assets.splatoon3.ink/__directory/data/
```

After that direct check succeeds, create the URL Rewrite Rule and verify the
browser-visible `/`, `/data/`, and `/splatnet/` directory URLs. To roll back,
disable the URL Rewrite Rule first, then remove the Worker route.
