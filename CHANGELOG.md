# Changelog

## 2.0.1

- Abort failed write transactions, including synchronous cloning/key failures during collection replacement, so previous data is not partially replaced.
- Retry schema creation when another instance or browser tab wins the version upgrade; preserve writes to both collections.
- Abort schema upgrades that already rejected as blocked, rather than applying them later in the background.
- Keep blocked database deletion pending until it finishes, preventing a rejected operation from unexpectedly deleting data afterwards.
- Add regression coverage for rollback, queue recovery, concurrent instances, blocked requests and binary data after reopening.

No runtime dependencies or schema/data migrations are introduced.
