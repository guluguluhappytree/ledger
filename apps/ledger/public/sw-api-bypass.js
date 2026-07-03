/** 云同步 /api 必须走网络，不能被离线缓存替换成网页 */
self.addEventListener("fetch", (event) => {
  const { pathname } = new URL(event.request.url);
  if (!pathname.startsWith("/api/")) return;
  event.respondWith(
    fetch(event.request, { cache: "no-store" }).catch(
      () =>
        new Response(JSON.stringify({ success: false, error: { message: "offline" } }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }),
    ),
  );
});
