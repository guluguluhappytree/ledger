import type { Plugin } from "vite";



type HtmlBootOptions = {

  title: string;

  themeColor?: string;

};



export function lifestyleHtmlBoot({ title, themeColor = "#ffffff" }: HtmlBootOptions): Plugin {

  return {

    name: "lifestyle-html-boot",

    transformIndexHtml(html) {

      let next = html;

      if (!next.includes("apple-mobile-web-app-capable")) {

        next = next.replace(

          "<head>",

          `<head>

    <meta name="apple-mobile-web-app-capable" content="yes" />

    <meta name="apple-mobile-web-app-status-bar-style" content="default" />

    <meta name="apple-mobile-web-app-title" content="${title}" />

    <meta name="mobile-web-app-capable" content="yes" />

    <meta name="format-detection" content="telephone=no" />`,

        );

      }



      if (!next.includes('name="theme-color"')) {

        next = next.replace("<head>", `<head>\n    <meta name="theme-color" content="${themeColor}" />`);

      }

      if (!next.includes("apple-touch-icon")) {

        next = next.replace(

          "<head>",

          `<head>

    <link rel="apple-touch-icon" sizes="180x180" href="./icons/apple-touch-icon.png" />`,

        );

      }



      if (!next.includes("boot-loading")) {

        const bootStyle = `

    <style>

      html, body { margin: 0; background: #ffffff; color: #37352f; min-height: 100%; }

      #root { min-height: 100dvh; display: flex; flex-direction: column; }

      .boot-loading {

        flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;

        gap: 8px; font-family: -apple-system, "PingFang SC", sans-serif;

      }

      .boot-loading__title { font-size: 1.25rem; color: #37352f; font-weight: 700; }

      .boot-loading__hint { font-size: 0.875rem; color: #9b9a97; }

    </style>`;



        next = next.replace("</head>", `${bootStyle}\n  </head>`);

        next = next.replace(

          '<div id="root"></div>',

          `<div id="root">

      <div class="boot-loading">

        <div class="boot-loading__title">${title}</div>

        <div class="boot-loading__hint">加载中…</div>

      </div>

    </div>`,

        );

        next = next.replace(

          '<div id="root">\n    </div>',

          `<div id="root">

      <div class="boot-loading">

        <div class="boot-loading__title">${title}</div>

        <div class="boot-loading__hint">加载中…</div>

      </div>

    </div>`,

        );

      }



      return next;

    },

  };

}


