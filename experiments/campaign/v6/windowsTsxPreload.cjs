/**
 * Windows-only startup compatibility for tsx.
 *
 * tsx asks os.userInfo() only to name its temporary directory. On this host
 * that OS call intermittently returns ENOMEM. Supplying a process-local
 * geteuid avoids the unrelated lookup; it does not alter provider execution,
 * filesystem permissions, or experiment identity.
 */
if (process.platform === "win32" && typeof process.geteuid !== "function") {
  Object.defineProperty(process, "geteuid", {
    value: () => 0,
    configurable: true,
  });
}
