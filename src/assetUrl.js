// 统一资源路径前缀。
// 项目可能被部署到站点子路径（例如 GitHub Pages 的 https://xxx.github.io/hunu-map/），
// 此时写死 "/data/xxx" 会指向站点根目录而 404。这里统一基于 Vite 的 BASE_URL 拼相对路径，
// 使构建产物在根路径、子路径、以及本地静态服务器下都能正确加载。
const BASE = import.meta.env.BASE_URL || '/';

export function assetUrl(path) {
  return BASE + String(path).replace(/^\//, '');
}
