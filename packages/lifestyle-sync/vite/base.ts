/** 生产构建用相对路径（PWA/Capacitor）；开发用绝对路径，避免手机局域网访问时 JS 加载失败 */
export function lifestyleBase(mode: string) {
  return mode === "production" ? "./" : "/";
}
