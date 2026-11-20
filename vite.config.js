import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Общие куски страниц: <!--@head--> и <!--@body--> заменяются содержимым src/head.html и src/shared.html.
// Так шапка, меню и все разделы живут в одном месте, а у каждого адреса свой title и описание.
const partial = (name) => readFileSync(resolve(__dirname, 'src', name), 'utf8');

function sharedParts() {
  return {
    name: 'asset-shared-parts',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => html.replace('<!--@head-->', partial('head.html')).replace('<!--@body-->', partial('shared.html')),
    },
    handleHotUpdate({ file, server }) {
      if (file.endsWith('shared.html') || file.endsWith('head.html')) server.ws.send({ type: 'full-reload' });
    },
  };
}

export default defineConfig({
  base: '/',
  appType: 'mpa',
  plugins: [sharedParts()],
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        uslugi: 'uslugi/index.html',
        process: 'process/index.html',
        raboty: 'raboty/index.html',
        kontakty: 'kontakty/index.html',
        notfound: '404.html',
        policy: 'policy.html',
      },
    },
  },
});
