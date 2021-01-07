<template>
  <!--  v-if="layout === 'responsive'" -->
  <div class="wrapper__responsive">
    <div class="sizer__responsive" :style="{ paddingTop: sizerHeight }" />
    <img v-if="placeholder" aria-hidden="true" :src="placeholderSrc" class="placeholder" :style="{ opacity: isLoaded ? 0 : 1 }">
    <img
      v-if="isVisible"
      class="img"
      :src="sources[0].srcset"
      :srcset="srcset"
      v-bind="imgAttributes"
      decoding="async"
      :style="{ opacity: isLoaded ? 1 : 0 }"
      :loading="isLazy ? 'lazy' : 'eager'"
      @load="onImageLoaded"
    >
  </div>
</template>

<script>
import { generateAlt, getFileExtension, useObserver } from '@nuxt/image/runtime'

export const LazyState = {
  IDLE: 'idle',
  LOADING: 'loading',
  LOADED: 'loaded'
}

export default {
  name: 'NuxtPicture',
  props: {
  // input source
    src: { type: String, required: true },

    // <img> attributes
    width: { type: [String, Number], required: false, default: undefined },
    height: { type: [String, Number], required: false, default: undefined },
    alt: { type: String, required: false, default: undefined },
    referrerpolicy: { type: String, default: undefined },
    usemap: { type: String, default: undefined },
    longdesc: { type: String, default: undefined },
    ismap: { type: Boolean, default: false },
    crossorigin: { type: Boolean, default: false },

    // modifiers
    format: { type: String, required: false, default: undefined },
    quality: { type: [Number, String], required: false, default: undefined },
    background: { type: String, required: false, default: undefined },
    fit: { type: String, required: false, default: undefined },

    // options
    preset: { type: String, required: false, default: undefined },
    provider: { type: String, required: false, default: undefined },

    // extras
    placeholder: { type: [Boolean, String], default: false },
    loading: {
      type: [String, Boolean],
      default: true,
      validator: value => ['lazy', 'eager', true, false].includes(value)
    }
  },
  data () {
    const isLazy = this.loading === true || this.loading === 'lazy'
    return {
      isLazy,
      lazyState: isLazy ? LazyState.IDLE : LazyState.LOADED
    }
  },
  computed: {
    ratio () {
      return parseInt(this.height, 10) / parseInt(this.width, 10)
    },
    isVisible () {
      if (this.lazyState === LazyState.IDLE) {
        return false
      }
      return true
    },
    isLoaded () {
      return this.lazyState === LazyState.LOADED
    },
    nAlt () {
      return this.alt ?? generateAlt(this.src)
    },
    imgAttributes () {
      return {
        alt: this.nAlt,
        referrerpolicy: this.referrerpolicy,
        usemap: this.usemap,
        longdesc: this.longdesc,
        ismap: this.ismap,
        crossorigin: this.crossorigin
      }
    },
    nFormat () {
      return this.format || getFileExtension(this.src)
    },
    nModifiers () {
      return {
        format: this.format,
        quality: this.quality,
        background: this.background,
        fit: this.fit
      }
    },
    fallbackSource () {
      return this.$img(this.src, {
        modifiers: {
          ...this.nModifiers,
          width: this.width
        }
      })
    },
    sources () {
      if (this.nFormat === 'svg') {
        return [{ srcset: this.src }]
      }

      const sizes = this.$img.options.sizes.map(width => ({
        width,
        breakpoint: width,
        media: `(max-width: ${width}px)`
      }))

      return sizes.map(size => ({
        ...size,
        srcset: this.$img(this.src, {
          modifiers: {
            ...this.nModifiers,
            width: size.width,
            height: isNaN(this.ratio) ? undefined : Math.round(size.width * this.ratio)
          }
        }).url
      }))
    },
    srcset () {
      if (this.nFormat === 'svg') {
        return
      }
      return this.sources.map(source => `${source.srcset} ${source.width}w`)
    },
    placeholderSrc () {
      if (!this.placeholder) {
        return
      }
      const width = 30
      return this.$img(this.src, {
        modifiers: {
          ...this.modifiers,
          width,
          height: isNaN(this.ratio) ? undefined : Math.round(width * this.ratio)
        }
      }).url
    },
    sizerHeight () {
      return isNaN(this.ratio) ? '100%' : `${this.ratio * 100}%`
    }
  },
  watch: {
    src () {
      if (this.isLazy) {
        this.unobserve()
        this.$nextTick(() => this.observe())
      }
    }
  },
  mounted () {
    if (this.isLazy) {
      this.observe()
    }
  },
  beforeDestroy () {
    this.unobserve()
  },
  methods: {
    observe () {
      this._removeObserver = useObserver(this.$el, type => this.onObservered(type))
    },
    unobserve () {
      if (this._removeObserver) {
        this._removeObserver()
        delete this._removeObserver
      }
    },
    onError (err) {
      this.error = err.message
      console.error(err.message) // eslint-disable-line no-console
      this.$emit('error', err)
    },
    onImageLoaded () {
      if (this.lazyState === LazyState.LOADED) {
        return
      }
      this.$nextTick(() => {
        this.lazyState = LazyState.LOADED
        this.$emit('load')
      })
    },
    onObservered (type) {
      if (type === 'intersect') {
        // OK, element is visible, Hoooray
        this.lazyState = LazyState.LOADING
      } else if (type === 'print') {
        this.unobserve()
        this.lazyState = LazyState.LOADED
      }
    }
  }
}
</script>

<style scoped>
.img {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  width: 100%;
  box-sizing: border-box;
  border: none;
  margin: auto;
  padding: 0;
  min-width: 100%;
  max-width: 100%;
  min-width: 100%;
  max-height: 100%;
  transition: opacity 500ms ease 0s;
  object-fit: cover;
  object-position: center center;
}
.placeholder {
  position: absolute;
  left: 0;
  top: 0;
  margin: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center center;
  filter: blur(10px);
  transition-delay: 500ms;
}

.wrapper__responsive {
  display: block;
  overflow: hidden;
  position: relative;
  box-sizing: border-box;
  margin: 0;
}

.sizer__responsive {
  display: block;
  box-sizing: border-box;
}
</style>
