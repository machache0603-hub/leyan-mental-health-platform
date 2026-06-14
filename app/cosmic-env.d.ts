/// <reference types="vite/client" />

/**
 * 金蝶苍穹 Kingscript 运行时全局声明。
 * app/ks/controller/* 是部署到苍穹服务端运行的控制器，`platform` 由苍穹平台注入，
 * 不参与前端 Vite 打包；此声明仅让前端工程的类型检查（tsc）通过。
 */
declare const platform: any;
