import {
  defineNuxtModule, createResolver, addImportsDir
} from '@nuxt/kit'
import { defu } from 'defu'

import type { ModuleOptions } from './runtime/types/meilisearch.d'

enum InstantSearchThemes {
  'reset',
  'algolia',
  'satellite',
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-meilisearch',
    configKey: 'meilisearch',
    compatibility: {
      nuxt: '^3.0.0-rc.9'
    }
  },
  defaults: {
    hostUrl: '',
    searchApiKey: '',
    serverSideUsage: false,
    adminApiKey: '',
    instantSearch: false,

  },
  setup (options, nuxt) {
    if (!options.hostUrl) {
      console.warn('`[nuxt-meilisearch]` Missing hostUrl`')
    }

    if (!options.searchApiKey) {
      console.warn('`[nuxt-meilisearch]` Missing `searchApiKey`')
    }

    const { adminApiKey, ...publicSafeModuleOptions } = options // eslint-disable-line
    nuxt.options.runtimeConfig.public.meilisearchClient = defu(nuxt.options.runtimeConfig.public.meilisearchClient, publicSafeModuleOptions)

    nuxt.options.runtimeConfig.serverMeilisearchClient = defu(nuxt.options.runtimeConfig.serverMeilisearchClient, options)

    const resolver = createResolver(import.meta.url)

    if (options.instantSearch) {
      nuxt.options.build.transpile.push('vue-instantsearch/vue3/es')

      if (typeof options.instantSearch === 'object') {
        const { theme } = options.instantSearch
        if (theme) {
          if (theme in InstantSearchThemes) {
            nuxt.options.css.push(`instantsearch.css/themes/${theme}.css`)
          }
        }
      }
    }

    addImportsDir(resolver.resolve('./runtime/composables'))

    if (options.serverSideUsage) {
      if (!options.adminApiKey) {
        console.warn('`[nuxt-meilisearch]` Missing `adminApiKey`')
      }
      nuxt.hook('nitro:config', config => { 
        config.externals = defu(config.externals, {
          inline: [resolver.resolve('./runtime/server')],
        }),
        config.imports = defu(config.imports, {
          presets: [
            {
              from: resolver.resolve('./runtime/server/utils/meilisearch'),
              imports: ['$meilisearch']}
            
          ]
        })
      })

    }

    nuxt.hook('prepare:types', ({ references }) => {
      references.push({
        path: resolver.resolve('./runtime/meilisearch.d.ts')
      }, {
        path: resolver.resolve('./runtime/instantsearch.d.ts')
      })
    })

    nuxt.hook('devtools:customTabs', (tabs) => {
      tabs.push({
        name: 'meilisearch',
        title: 'Meilisearch',
        icon: 'https://raw.githubusercontent.com/meilisearch/meilisearch/main/assets/logo.svg',
        view: {
          type: 'iframe',
          src: `${options.hostUrl}`
        }
      })
    })
  }

})
