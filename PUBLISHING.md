# Publishing

## First-time setup

```bash
# 1. Install deps + verify everything typechecks.
npm install
npm run typecheck

# 2. Log in to npm as @ibalzam.
npm login
npm whoami    # should print: ibalzam

# 3. Initialize git + push to GitHub (one-time).
git init
git add -A
git commit -m "Initial commit"
# Create the repo on github.com first, then:
git remote add origin git@github.com:ibalzam/codejitsu-site-kit.git
git branch -M main
git push -u origin main
```

## Publish a new version

```bash
# 1. Bump version (pick semver bump).
#    - patch (0.1.0 → 0.1.1):  bug fixes only
#    - minor (0.1.0 → 0.2.0):  new features, no breaking changes
#    - major (0.1.0 → 1.0.0):  breaking changes (requires MIGRATIONS/<version>.md)
npm version patch    # or: minor, major

# 2. Publish. (publishConfig.access = "public" handles --access public for scoped packages.)
npm publish

# 3. Push the version commit + tag to GitHub.
git push --follow-tags
```

## After publishing — propagating to sites

Each Codejitsu site can update independently:

```bash
cd /path/to/site
npm update @ibalzam/codejitsu-core
# Then tell Claude:
#   "we upgraded @ibalzam/codejitsu-core to <version>, check MIGRATIONS for anything to apply"
```

## Verifying a publish

```bash
# Inspect what was published.
npm view @ibalzam/codejitsu-core

# Smoke install in a temp dir.
mkdir /tmp/pkg-test && cd /tmp/pkg-test
npm init -y
npm install @ibalzam/codejitsu-core
ls node_modules/@ibalzam/codejitsu-core
node -e "console.log(require('@ibalzam/codejitsu-core/package.json').version)"
```

## If something goes wrong

- **`npm publish` fails with "402 Payment Required":** scoped packages default to private. Confirm `publishConfig.access: "public"` is in package.json, or run `npm publish --access public` once.
- **`npm publish` fails with "403 Forbidden":** the scope `@ibalzam` doesn't exist on npm yet. Create it via `npm org create ibalzam` *(orgs)* or simply by being logged in as user `ibalzam` and publishing the first scoped package — npm auto-creates the user scope.
- **Wrong files published:** check the `files` field in package.json. Run `npm pack` (creates a tarball without publishing) and inspect it: `tar -tzf ibalzam-codejitsu-core-*.tgz`.

## Unpublishing

Within 72h of publish you can `npm unpublish @ibalzam/codejitsu-core@<version>`. After 72h, npm only allows deprecation: `npm deprecate @ibalzam/codejitsu-core@<version> "reason"`. Treat publish as **mostly irreversible** — `npm pack` and inspect first.
