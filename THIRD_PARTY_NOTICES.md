# Third-party code

The complete Spicy Lyrics rendering dependency graph is copied from https://github.com/Spikerko/spicy-lyrics at commit `0ecf3925aac0e9b76b9095ee23b6d5118d9a18cc`.

The original renderer source and styles remain unchanged in `wallpaper/vendor/spicy-lyrics`, with their AGPL-3.0 license and SHA-256 provenance manifest. Host-specific imports resolve to separately maintained wallpaper adapters in `wallpaper/vendor/spicy-host`. The built module is reproducible using `node scripts/build-spicy.mjs`.

The combined wallpaper is distributed under AGPL-3.0, supplied in `LICENSE`. Original independently written RetroWave code retains its MIT grant in `LICENSE-MIT`. The native companion contains no copied Spicy renderer code and retains that original license grant.

The copied spring implementation includes its original Fraktality MIT attribution. npm dependencies retain their own package licenses in the installed dependency tree.
