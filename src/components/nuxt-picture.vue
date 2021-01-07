<template>
  <!--  v-if="layout === 'responsive'" -->
  <div class="wrapper__responsive">
    <div class="sizer__responsive" :style="{ paddingTop: sizerHeight }" />
    <picture v-show="isVisible">
      <source
        v-for="source of sources"
        v-if="sources.length > 1"
        :key="source.url"
        v-bind="source"
      >
      <img class="img" :src="sources[0].srcset" v-bind="imgAttributes" decoding="async" @load="onImageLoaded">
    </picture>
    <img v-if="placeholder" class="placeholder" :style="{ opacity: isLoaded ? 0 : 0.5 }">
    <p>isVisible: {{ isVisible }}</p>
    <p>isLoaded: {{ isLoaded }}</p>
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
    return {
      lazyState: this.isLazy ? LazyState.IDLE : LazyState.LOADED
    }
  },
  computed: {
    isVisible () {
      if (this.lazyState === LazyState.IDLE) {
        return false
      }
      return true
    },
    isLoaded () {
      return this.lazyState === LazyState.LOADED
    },
    isLazy () {
      return this.loading === true || this.loading === 'lazy'
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
        crossorigin: this.crossorigin,
        width: this.width,
        height: this.height
      }
    },
    nModifiers () {
      return {
        format: this.format,
        quality: this.quality,
        background: this.background,
        fit: this.fit,
        height: this.height
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
      if (this.format === 'svg' || getFileExtension(this.src) === 'svg') {
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
            width: size.width
          }
        }).url
      }))
    },
    sizerHeight () {
      const height = parseInt(this.height, 10)
      return isNaN(height) ? '100%;' : `${height}px`
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
      if (this.lazyState !== LazyState.LOADED) {
        console.log('lazyState to loaded', this.src)
        this.lazyState = LazyState.LOADED
        this.$emit('load')
      }
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
  min-weight: 100%;
  max-weight: 100%;
}
.placeholder {
  position: absolute;
  left: 0;
  top: 0;
  margin: 0;
  width: 100%;
  height: 100%;
  objectFit: cover;
  object-position: center center;
  filter: blur(10px);
  transition: opacity 1s;
  background-color: red;
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
