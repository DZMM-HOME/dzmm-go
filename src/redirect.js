(function () {
  // 主站派发池（构建时从域名登记的 rotation_domains 取，排除跳转域名自己），见 src/pool.json
  var HOSTS = {{HOSTS}};
  var TIMEOUT_MS = 8000;
  var tail = location.pathname + location.search + location.hash;
  var settled = false;
  var failed = 0;

  function go(host) {
    if (settled) return;
    settled = true;
    location.replace("https://www." + host + tail);
  }

  function miss() {
    failed += 1;
    if (settled || failed < HOSTS.length) return;
    settled = true;
    document.getElementById("wait").hidden = true;
    document.getElementById("fail").hidden = false;
    document.getElementById("retry").href = location.href;
  }

  function probe(host) {
    var url = "https://www." + host + "/api/heartbeat";
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.timeout = TIMEOUT_MS;
    xhr.onload = function () {
      var ok = false;
      try {
        // 只认 200、JSON、内容是 {"message":"ok"}，且没有被重定向到别处
        var type = xhr.getResponseHeader("Content-Type") || "";
        var body = JSON.parse(xhr.responseText);
        ok = xhr.status === 200 && type.indexOf("json") !== -1 &&
          body && body.message === "ok" && (!xhr.responseURL || xhr.responseURL === url);
      } catch (e) {
        ok = false;
      }
      if (ok) go(host); else miss();
    };
    xhr.onerror = miss;
    xhr.ontimeout = miss;
    xhr.onabort = miss;
    try { xhr.send(); } catch (e) { miss(); }
  }

  if (!HOSTS.length) { miss(); return; }
  for (var i = 0; i < HOSTS.length; i++) probe(HOSTS[i]);
})();
