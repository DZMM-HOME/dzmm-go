(function () {
  // 候选主站：构建时从 src/sites.txt（dzmm-addr 的 sites.txt 副本）写入，排除跳转域名自己；打开时不请求任何外部名单
  var HOSTS = {{HOSTS}};
  var KEY = "dzmm_go_host";        // 上次跳去的主站，存在本页的 localStorage 和 cookie
  var TRIES = 3;                   // 每个域名测 3 次
  var NEED = 2;                    // 3 次里至少 2 次通才算可用
  var DEADLINE_MS = 8000;          // 整页最长等 8 秒
  var REMEMBERED_MS = 3000;        // 上次那个主站的 3 次探测各自最长等多久，留出时间测其余
  var tail = location.pathname + location.search + location.hash;
  var started = now();
  var settled = false;

  function now() {
    return (window.performance && performance.now) ? performance.now() : new Date().getTime();
  }

  function remember(host) {
    try { localStorage.setItem(KEY, host); } catch (e) {}
    try { document.cookie = KEY + "=" + host + "; max-age=31536000; path=/; SameSite=Lax; Secure"; } catch (e) {}
  }

  function recalled() {
    var host = "";
    try { host = localStorage.getItem(KEY) || ""; } catch (e) {}
    if (!host) {
      var m = document.cookie.match(new RegExp("(?:^|;\\s*)" + KEY + "=([^;]+)"));
      if (m) host = m[1];
    }
    return HOSTS.indexOf(host) !== -1 ? host : "";
  }

  function go(host) {
    if (settled) return;
    settled = true;
    remember(host);
    location.replace("https://www." + host + tail);
  }

  function fail() {
    if (settled) return;
    settled = true;
    document.getElementById("wait").hidden = true;
    document.getElementById("fail").hidden = false;
    document.getElementById("retry").href = location.href;
  }

  // 一次探测：只认 200、JSON、内容是 {"message":"ok"}，且没有被重定向到别处；done(通不通, 耗时毫秒)
  function probe(host, timeout, done) {
    var url = "https://www." + host + "/api/heartbeat?_=" + Math.random().toString(36).slice(2);
    var t0 = now();
    var over = false;
    var xhr = new XMLHttpRequest();
    function end(ok) {
      if (over) return;
      over = true;
      done(ok, now() - t0);
    }
    xhr.open("GET", url, true);
    xhr.timeout = Math.max(1, Math.round(timeout));
    xhr.onload = function () {
      var ok = false;
      try {
        var type = xhr.getResponseHeader("Content-Type") || "";
        var body = JSON.parse(xhr.responseText);
        ok = xhr.status === 200 && type.indexOf("json") !== -1 &&
          body && body.message === "ok" && (!xhr.responseURL || xhr.responseURL === url);
      } catch (e) {
        ok = false;
      }
      end(ok);
    };
    xhr.onerror = function () { end(false); };
    xhr.ontimeout = function () { end(false); };
    xhr.onabort = function () { end(false); };
    try { xhr.send(); } catch (e) { end(false); }
  }

  // 上次那个主站：并行测 3 次，有 1 次通就直接跳回去，不管延迟；3 次都不通才测其余
  function tryRemembered(host, next) {
    var failed = 0;
    for (var i = 0; i < TRIES; i++) {
      probe(host, REMEMBERED_MS, function (ok) {
        if (settled) return;
        if (ok) { go(host); return; }
        failed += 1;
        if (failed === TRIES) next();
      });
    }
  }

  // 其余主站：每个并行测 3 次，至少 2 次通才算可用，按通过那几次的平均耗时选最低
  function race(list) {
    if (!list.length) { fail(); return; }
    var stats = {};
    var timer = null;

    function average(s) {
      var sum = 0;
      for (var i = 0; i < s.ok.length; i++) sum += s.ok[i];
      return sum / s.ok.length;
    }

    // 还没测完的域名，最好情况下的平均耗时：还在等的那几次若通，耗时至少是已经过去的时间
    function bestCase(s, elapsed) {
      var pending = TRIES - s.done;
      var sum = 0, best = Infinity;
      for (var i = 0; i < s.ok.length; i++) sum += s.ok[i];
      for (var j = 0; j <= pending; j++) {
        var n = s.ok.length + j;
        if (n >= NEED) best = Math.min(best, (sum + j * elapsed) / n);
      }
      return best;
    }

    function pick(final) {
      var best = "", bestAvg = Infinity, elapsed = now() - started;
      for (var i = 0; i < list.length; i++) {
        var s = stats[list[i]];
        if ((s.done === TRIES || final) && s.ok.length >= NEED && average(s) < bestAvg) {
          best = list[i];
          bestAvg = average(s);
        }
      }
      if (final) { if (best) go(best); else fail(); return; }
      // 还有没测完、又可能比眼下最好的更快的，就接着等
      for (var k = 0; k < list.length; k++) {
        var t = stats[list[k]];
        if (t.done < TRIES && bestCase(t, elapsed) < bestAvg) return;
      }
      if (best) go(best); else fail();
    }

    var left = DEADLINE_MS - (now() - started);
    if (left <= 0) { fail(); return; }
    timer = setTimeout(function () { if (!settled) pick(true); }, left);
    for (var i = 0; i < list.length; i++) {
      stats[list[i]] = { done: 0, ok: [] };
      for (var n = 0; n < TRIES; n++) {
        (function (host) {
          probe(host, left, function (ok, ms) {
            if (settled) return;
            var s = stats[host];
            s.done += 1;
            if (ok) s.ok.push(ms);
            pick(false);
            if (settled && timer) clearTimeout(timer);
          });
        })(list[i]);
      }
    }
  }

  var last = recalled();
  if (last) {
    tryRemembered(last, function () {
      race(HOSTS.filter(function (h) { return h !== last; }));
    });
  } else {
    race(HOSTS);
  }
})();
