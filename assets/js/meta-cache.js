/**
 * 文章元数据 sidecar 按需加载（blog/meta/{slug}.json）+ 内存缓存
 *
 * 背景：articles-index.json 已瘦身（不再内联 excerpt）。搜索/筛选结果只在真正展示
 * 某条时才需要摘要，且一次最多展示 10 条 —— 所以摘要改为按需拉取 sidecar 并缓存，
 * 避免把全站描述塞进「每次都要下载」的索引里（110 篇时省 ~7KB，1000 篇时省 ~65KB）。
 *
 * 用法：window.LoczbMeta.get(slug).then(function(meta){ meta.description ... })
 *       window.LoczbMeta.cached(slug)  // 命中缓存则同步返回，否则 null
 */
(function() {
  'use strict';

  var cache = Object.create(null);    // slug -> sidecar 对象
  var pending = Object.create(null);  // slug -> Promise（并发去重）

  function candidatePaths(slug) {
    var file = encodeURIComponent(slug) + '.json';
    var path = window.location.pathname;
    // blog/ 目录下（blog/index.html、blog/page-N.html）→ 同级 meta/
    if (path.indexOf('/blog/') !== -1) return ['meta/' + file, '/blog/meta/' + file];
    // 二级目录（projects/、about/）→ 上一级 blog/meta/
    if (path.indexOf('/projects/') !== -1 || path.indexOf('/about/') !== -1) {
      return ['../blog/meta/' + file, '/blog/meta/' + file];
    }
    // 站点根（index.html）
    return ['blog/meta/' + file, '/blog/meta/' + file];
  }

  function fetchFrom(paths, index) {
    if (index >= paths.length) return Promise.resolve(null);
    return fetch(paths[index])
      .then(function(resp) { return resp.ok ? resp.json() : null; })
      .then(function(data) {
        if (data && typeof data === 'object') return data;
        return fetchFrom(paths, index + 1);
      })
      .catch(function() { return fetchFrom(paths, index + 1); });
  }

  function get(slug) {
    if (!slug) return Promise.resolve(null);
    if (cache[slug]) return Promise.resolve(cache[slug]);
    if (pending[slug]) return pending[slug];

    var promise = fetchFrom(candidatePaths(slug), 0).then(function(meta) {
      if (meta) cache[slug] = meta;
      delete pending[slug];
      return meta;
    }, function() {
      delete pending[slug];
      return null;
    });

    pending[slug] = promise;
    return promise;
  }

  window.LoczbMeta = {
    get: get,
    cached: function(slug) { return (slug && cache[slug]) || null; }
  };
})();
