# Assets directory browser

This Worker renders read-only directory listings for the public R2 bucket without
running on ordinary object requests. It also mounts the public DigitalOcean
Spaces data archive at `/data/archive/`.

## Virtual archive directory

The `/data/` R2 listing includes a synthetic `archive/` directory. Listings
under `/data/archive/` use anonymous S3 `ListObjectsV2` requests against the
public archive origin instead of R2. The mount prefix is removed from S3
requests and restored on browser-visible directory links.

Archive file links point directly to `https://data-archive.splatoon3.ink`, so
downloads do not pass through the Worker. Directory and pagination links remain
under `https://assets.splatoon3.ink/data/archive/`. The public S3 listing API on
the archive domain is unchanged.

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
paths and serves linked R2 objects from Wrangler's simulated bucket. It never
connects to the production R2 bucket.

The archive mount uses the anonymously readable production Spaces listing in
local mode, so it can be previewed at:

```text
http://localhost:8787/data/archive/
```

Archive file links in that preview still point to the public archive domain.

## Validate without deploying

```sh
npm run assets-browser:test
npm run assets-browser:deploy:dry-run
```

`npm run assets-browser:deploy` performs the production deployment. Production
deployments are handled by Cloudflare Workers Builds, configured from the
repository root with `main` as the production branch,
`npm run assets-browser:test` as the build command, and
`npm run assets-browser:deploy` as the deploy command.

## Production rollout

Do not create the URL Rewrite Rule until the Worker route has been deployed and
verified directly at an internal URL such as:

```text
https://assets.splatoon3.ink/__directory/data/
```

After that direct check succeeds, create the URL Rewrite Rule and verify the
browser-visible `/`, `/data/`, and `/splatnet/` directory URLs. To roll back,
disable the URL Rewrite Rule first, then remove the Worker route.
