/* Spicy Lyrics renderer, upstream 0ecf3925aac0e9b76b9095ee23b6d5118d9a18cc. AGPL-3.0; full source and license in wallpaper/vendor/spicy-lyrics. */
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/.pnpm/cubic-spline@3.0.3/node_modules/cubic-spline/index.js
var require_cubic_spline = __commonJS({
  "node_modules/.pnpm/cubic-spline@3.0.3/node_modules/cubic-spline/index.js"(exports, module) {
    module.exports = class Spline {
      constructor(xs, ys) {
        this.xs = xs;
        this.ys = ys;
        this.ks = this.getNaturalKs(new Float64Array(this.xs.length));
      }
      getNaturalKs(ks) {
        const n = this.xs.length - 1;
        const A = zerosMat(n + 1, n + 2);
        for (let i = 1; i < n; i++) {
          A[i][i - 1] = 1 / (this.xs[i] - this.xs[i - 1]);
          A[i][i] = 2 * (1 / (this.xs[i] - this.xs[i - 1]) + 1 / (this.xs[i + 1] - this.xs[i]));
          A[i][i + 1] = 1 / (this.xs[i + 1] - this.xs[i]);
          A[i][n + 1] = 3 * ((this.ys[i] - this.ys[i - 1]) / ((this.xs[i] - this.xs[i - 1]) * (this.xs[i] - this.xs[i - 1])) + (this.ys[i + 1] - this.ys[i]) / ((this.xs[i + 1] - this.xs[i]) * (this.xs[i + 1] - this.xs[i])));
        }
        A[0][0] = 2 / (this.xs[1] - this.xs[0]);
        A[0][1] = 1 / (this.xs[1] - this.xs[0]);
        A[0][n + 1] = 3 * (this.ys[1] - this.ys[0]) / ((this.xs[1] - this.xs[0]) * (this.xs[1] - this.xs[0]));
        A[n][n - 1] = 1 / (this.xs[n] - this.xs[n - 1]);
        A[n][n] = 2 / (this.xs[n] - this.xs[n - 1]);
        A[n][n + 1] = 3 * (this.ys[n] - this.ys[n - 1]) / ((this.xs[n] - this.xs[n - 1]) * (this.xs[n] - this.xs[n - 1]));
        return solve(A, ks);
      }
      /**
       * inspired by https://stackoverflow.com/a/40850313/4417327
       */
      getIndexBefore(target) {
        let low = 0;
        let high = this.xs.length;
        let mid = 0;
        while (low < high) {
          mid = Math.floor((low + high) / 2);
          if (this.xs[mid] < target && mid !== low) {
            low = mid;
          } else if (this.xs[mid] >= target && mid !== high) {
            high = mid;
          } else {
            high = low;
          }
        }
        return low + 1;
      }
      at(x) {
        let i = this.getIndexBefore(x);
        const t = (x - this.xs[i - 1]) / (this.xs[i] - this.xs[i - 1]);
        const a = this.ks[i - 1] * (this.xs[i] - this.xs[i - 1]) - (this.ys[i] - this.ys[i - 1]);
        const b = -this.ks[i] * (this.xs[i] - this.xs[i - 1]) + (this.ys[i] - this.ys[i - 1]);
        const q = (1 - t) * this.ys[i - 1] + t * this.ys[i] + t * (1 - t) * (a * (1 - t) + b * t);
        return q;
      }
    };
    function solve(A, ks) {
      const m = A.length;
      let h = 0;
      let k = 0;
      while (h < m && k <= m) {
        let i_max = 0;
        let max = -Infinity;
        for (let i = h; i < m; i++) {
          const v2 = Math.abs(A[i][k]);
          if (v2 > max) {
            i_max = i;
            max = v2;
          }
        }
        if (A[i_max][k] === 0) {
          k++;
        } else {
          swapRows(A, h, i_max);
          for (let i = h + 1; i < m; i++) {
            const f = A[i][k] / A[h][k];
            A[i][k] = 0;
            for (let j = k + 1; j <= m; j++) A[i][j] -= A[h][j] * f;
          }
          h++;
          k++;
        }
      }
      for (let i = m - 1; i >= 0; i--) {
        var v = 0;
        if (A[i][i]) {
          v = A[i][m] / A[i][i];
        }
        ks[i] = v;
        for (let j = i - 1; j >= 0; j--) {
          A[j][m] -= A[j][i] * v;
          A[j][i] = 0;
        }
      }
      return ks;
    }
    function zerosMat(r, c) {
      const A = [];
      for (let i = 0; i < r; i++) A.push(new Float64Array(c));
      return A;
    }
    function swapRows(m, k, l) {
      let p = m[k];
      m[k] = m[l];
      m[l] = p;
    }
  }
});

// wallpaper/vendor/spicy-host/page.mjs
var PageContainer = null;
function setPage(page2) {
  PageContainer = page2;
}

// wallpaper/vendor/spicy-host/player.mjs
var position = 0;
var playing = false;
function setClock(ms, isPlaying) {
  position = ms;
  playing = isPlaying;
}
var SpotifyPlayer = { GetPosition: () => position, get IsPlaying() {
  return playing;
}, Seek() {
} };

// wallpaper/vendor/spicy-host/stores.mjs
var atom = (initial) => {
  let value = initial;
  const listeners = /* @__PURE__ */ new Set();
  return {
    get: () => value,
    set(next) {
      if (Object.is(next, value)) return;
      value = next;
      for (const fn of listeners) fn(value);
    },
    listen(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    subscribe(fn) {
      fn(value);
      listeners.add(fn);
      return () => listeners.delete(fn);
    }
  };
};
var $lyricsContainerExists = atom(false);
var $currentLyricsType = atom("None");
var $minimalLyricsMode = atom(false);
var $simpleLyricsMode = atom(false);
var $simpleLyricsModeRenderingType = atom("calculate");
var $smoothScrolling = atom(true);
var $seekFadeCompensation = atom(false);
var $scrollLeadEnabled = atom(false);
var $scrollLeadMs = atom(0);
var $developerMode = atom(false);
var $animationFpsCapEnabled = atom(true);
var $animationFpsCap = atom(60);
var $romanization = atom(false);

// wallpaper/vendor/spicy-lyrics/src/utils/EventManager.ts
var eventRegistry = /* @__PURE__ */ new Map();
var nextId = 1;
var listen = (eventName, callback) => {
  if (!eventRegistry.has(eventName)) {
    eventRegistry.set(eventName, /* @__PURE__ */ new Map());
  }
  const id = nextId++;
  const listeners = eventRegistry.get(eventName);
  if (listeners) {
    listeners.set(id, callback);
  }
  return id;
};
var unListen = (id) => {
  for (const [eventName, listeners] of eventRegistry) {
    if (listeners.has(id)) {
      listeners.delete(id);
      if (listeners.size === 0) {
        eventRegistry.delete(eventName);
      }
      return true;
    }
  }
  return false;
};
var evoke = (eventName, ...args) => {
  const listeners = eventRegistry.get(eventName);
  if (listeners) {
    for (const callback of listeners.values()) {
      callback(...args);
    }
  }
};
var Event = {
  listen,
  unListen,
  evoke
};
var EventManager_default = Event;

// wallpaper/vendor/spicy-host/global.mjs
var global_default = { Event: EventManager_default };

// wallpaper/vendor/spicy-lyrics/src/utils/CSS/Styles.ts
function applyStyles(element, styles) {
  if (element) {
    Object.entries(styles).forEach(([key, value]) => {
      element.style[key] = value;
    });
  } else {
    console.warn("Element not found");
  }
}
function removeAllStyles(element) {
  if (element) {
    element.removeAttribute("style");
  } else {
    console.warn("Element not found");
  }
}

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/isObject.js
function isObject(value) {
  var type = typeof value;
  return value != null && (type == "object" || type == "function");
}
var isObject_default = isObject;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_freeGlobal.js
var freeGlobal = typeof global == "object" && global && global.Object === Object && global;
var freeGlobal_default = freeGlobal;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_root.js
var freeSelf = typeof self == "object" && self && self.Object === Object && self;
var root = freeGlobal_default || freeSelf || Function("return this")();
var root_default = root;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/now.js
var now = function() {
  return root_default.Date.now();
};
var now_default = now;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_trimmedEndIndex.js
var reWhitespace = /\s/;
function trimmedEndIndex(string) {
  var index = string.length;
  while (index-- && reWhitespace.test(string.charAt(index))) {
  }
  return index;
}
var trimmedEndIndex_default = trimmedEndIndex;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_baseTrim.js
var reTrimStart = /^\s+/;
function baseTrim(string) {
  return string ? string.slice(0, trimmedEndIndex_default(string) + 1).replace(reTrimStart, "") : string;
}
var baseTrim_default = baseTrim;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_Symbol.js
var Symbol2 = root_default.Symbol;
var Symbol_default = Symbol2;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_getRawTag.js
var objectProto = Object.prototype;
var hasOwnProperty = objectProto.hasOwnProperty;
var nativeObjectToString = objectProto.toString;
var symToStringTag = Symbol_default ? Symbol_default.toStringTag : void 0;
function getRawTag(value) {
  var isOwn = hasOwnProperty.call(value, symToStringTag), tag = value[symToStringTag];
  try {
    value[symToStringTag] = void 0;
    var unmasked = true;
  } catch (e) {
  }
  var result = nativeObjectToString.call(value);
  if (unmasked) {
    if (isOwn) {
      value[symToStringTag] = tag;
    } else {
      delete value[symToStringTag];
    }
  }
  return result;
}
var getRawTag_default = getRawTag;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_objectToString.js
var objectProto2 = Object.prototype;
var nativeObjectToString2 = objectProto2.toString;
function objectToString(value) {
  return nativeObjectToString2.call(value);
}
var objectToString_default = objectToString;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/_baseGetTag.js
var nullTag = "[object Null]";
var undefinedTag = "[object Undefined]";
var symToStringTag2 = Symbol_default ? Symbol_default.toStringTag : void 0;
function baseGetTag(value) {
  if (value == null) {
    return value === void 0 ? undefinedTag : nullTag;
  }
  return symToStringTag2 && symToStringTag2 in Object(value) ? getRawTag_default(value) : objectToString_default(value);
}
var baseGetTag_default = baseGetTag;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/isObjectLike.js
function isObjectLike(value) {
  return value != null && typeof value == "object";
}
var isObjectLike_default = isObjectLike;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/isSymbol.js
var symbolTag = "[object Symbol]";
function isSymbol(value) {
  return typeof value == "symbol" || isObjectLike_default(value) && baseGetTag_default(value) == symbolTag;
}
var isSymbol_default = isSymbol;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/toNumber.js
var NAN = 0 / 0;
var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;
var reIsBinary = /^0b[01]+$/i;
var reIsOctal = /^0o[0-7]+$/i;
var freeParseInt = parseInt;
function toNumber(value) {
  if (typeof value == "number") {
    return value;
  }
  if (isSymbol_default(value)) {
    return NAN;
  }
  if (isObject_default(value)) {
    var other = typeof value.valueOf == "function" ? value.valueOf() : value;
    value = isObject_default(other) ? other + "" : other;
  }
  if (typeof value != "string") {
    return value === 0 ? value : +value;
  }
  value = baseTrim_default(value);
  var isBinary = reIsBinary.test(value);
  return isBinary || reIsOctal.test(value) ? freeParseInt(value.slice(2), isBinary ? 2 : 8) : reIsBadHex.test(value) ? NAN : +value;
}
var toNumber_default = toNumber;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/debounce.js
var FUNC_ERROR_TEXT = "Expected a function";
var nativeMax = Math.max;
var nativeMin = Math.min;
function debounce(func, wait, options) {
  var lastArgs, lastThis, maxWait, result, timerId, lastCallTime, lastInvokeTime = 0, leading = false, maxing = false, trailing = true;
  if (typeof func != "function") {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  wait = toNumber_default(wait) || 0;
  if (isObject_default(options)) {
    leading = !!options.leading;
    maxing = "maxWait" in options;
    maxWait = maxing ? nativeMax(toNumber_default(options.maxWait) || 0, wait) : maxWait;
    trailing = "trailing" in options ? !!options.trailing : trailing;
  }
  function invokeFunc(time) {
    var args = lastArgs, thisArg = lastThis;
    lastArgs = lastThis = void 0;
    lastInvokeTime = time;
    result = func.apply(thisArg, args);
    return result;
  }
  function leadingEdge(time) {
    lastInvokeTime = time;
    timerId = setTimeout(timerExpired, wait);
    return leading ? invokeFunc(time) : result;
  }
  function remainingWait(time) {
    var timeSinceLastCall = time - lastCallTime, timeSinceLastInvoke = time - lastInvokeTime, timeWaiting = wait - timeSinceLastCall;
    return maxing ? nativeMin(timeWaiting, maxWait - timeSinceLastInvoke) : timeWaiting;
  }
  function shouldInvoke(time) {
    var timeSinceLastCall = time - lastCallTime, timeSinceLastInvoke = time - lastInvokeTime;
    return lastCallTime === void 0 || timeSinceLastCall >= wait || timeSinceLastCall < 0 || maxing && timeSinceLastInvoke >= maxWait;
  }
  function timerExpired() {
    var time = now_default();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    timerId = setTimeout(timerExpired, remainingWait(time));
  }
  function trailingEdge(time) {
    timerId = void 0;
    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = lastThis = void 0;
    return result;
  }
  function cancel() {
    if (timerId !== void 0) {
      clearTimeout(timerId);
    }
    lastInvokeTime = 0;
    lastArgs = lastCallTime = lastThis = timerId = void 0;
  }
  function flush() {
    return timerId === void 0 ? result : trailingEdge(now_default());
  }
  function debounced() {
    var time = now_default(), isInvoking = shouldInvoke(time);
    lastArgs = arguments;
    lastThis = this;
    lastCallTime = time;
    if (isInvoking) {
      if (timerId === void 0) {
        return leadingEdge(lastCallTime);
      }
      if (maxing) {
        clearTimeout(timerId);
        timerId = setTimeout(timerExpired, wait);
        return invokeFunc(lastCallTime);
      }
    }
    if (timerId === void 0) {
      timerId = setTimeout(timerExpired, wait);
    }
    return result;
  }
  debounced.cancel = cancel;
  debounced.flush = flush;
  return debounced;
}
var debounce_default = debounce;

// node_modules/.pnpm/lodash-es@4.18.1/node_modules/lodash-es/throttle.js
var FUNC_ERROR_TEXT2 = "Expected a function";
function throttle(func, wait, options) {
  var leading = true, trailing = true;
  if (typeof func != "function") {
    throw new TypeError(FUNC_ERROR_TEXT2);
  }
  if (isObject_default(options)) {
    leading = "leading" in options ? !!options.leading : leading;
    trailing = "trailing" in options ? !!options.trailing : trailing;
  }
  return debounce_default(func, wait, {
    "leading": leading,
    "maxWait": wait,
    "trailing": trailing
  });
}
var throttle_default = throttle;

// node_modules/.pnpm/simplebar-core@1.3.2/node_modules/simplebar-core/dist/index.mjs
var __assign = function() {
  __assign = Object.assign || function __assign2(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
      s = arguments[i];
      for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
    }
    return t;
  };
  return __assign.apply(this, arguments);
};
function getElementWindow$1(element) {
  if (!element || !element.ownerDocument || !element.ownerDocument.defaultView) {
    return window;
  }
  return element.ownerDocument.defaultView;
}
function getElementDocument$1(element) {
  if (!element || !element.ownerDocument) {
    return document;
  }
  return element.ownerDocument;
}
var getOptions$1 = function(obj) {
  var initialObj = {};
  var options = Array.prototype.reduce.call(obj, function(acc, attribute) {
    var option = attribute.name.match(/data-simplebar-(.+)/);
    if (option) {
      var key = option[1].replace(/\W+(.)/g, function(_, chr) {
        return chr.toUpperCase();
      });
      switch (attribute.value) {
        case "true":
          acc[key] = true;
          break;
        case "false":
          acc[key] = false;
          break;
        case void 0:
          acc[key] = true;
          break;
        default:
          acc[key] = attribute.value;
      }
    }
    return acc;
  }, initialObj);
  return options;
};
function addClasses$1(el, classes) {
  var _a2;
  if (!el)
    return;
  (_a2 = el.classList).add.apply(_a2, classes.split(" "));
}
function removeClasses$1(el, classes) {
  if (!el)
    return;
  classes.split(" ").forEach(function(className) {
    el.classList.remove(className);
  });
}
function classNamesToQuery$1(classNames) {
  return ".".concat(classNames.split(" ").join("."));
}
var canUseDOM = !!(typeof window !== "undefined" && window.document && window.document.createElement);
var helpers = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  addClasses: addClasses$1,
  canUseDOM,
  classNamesToQuery: classNamesToQuery$1,
  getElementDocument: getElementDocument$1,
  getElementWindow: getElementWindow$1,
  getOptions: getOptions$1,
  removeClasses: removeClasses$1
});
var cachedScrollbarWidth = null;
var cachedDevicePixelRatio = null;
if (canUseDOM) {
  window.addEventListener("resize", function() {
    if (cachedDevicePixelRatio !== window.devicePixelRatio) {
      cachedDevicePixelRatio = window.devicePixelRatio;
      cachedScrollbarWidth = null;
    }
  });
}
function scrollbarWidth() {
  if (cachedScrollbarWidth === null) {
    if (typeof document === "undefined") {
      cachedScrollbarWidth = 0;
      return cachedScrollbarWidth;
    }
    var body = document.body;
    var box = document.createElement("div");
    box.classList.add("simplebar-hide-scrollbar");
    body.appendChild(box);
    var width = box.getBoundingClientRect().right;
    body.removeChild(box);
    cachedScrollbarWidth = width;
  }
  return cachedScrollbarWidth;
}
var getElementWindow = getElementWindow$1;
var getElementDocument = getElementDocument$1;
var getOptions = getOptions$1;
var addClasses = addClasses$1;
var removeClasses = removeClasses$1;
var classNamesToQuery = classNamesToQuery$1;
var SimpleBarCore = (
  /** @class */
  (function() {
    function SimpleBarCore2(element, options) {
      if (options === void 0) {
        options = {};
      }
      var _this = this;
      this.removePreventClickId = null;
      this.minScrollbarWidth = 20;
      this.stopScrollDelay = 175;
      this.isScrolling = false;
      this.isMouseEntering = false;
      this.isDragging = false;
      this.scrollXTicking = false;
      this.scrollYTicking = false;
      this.wrapperEl = null;
      this.contentWrapperEl = null;
      this.contentEl = null;
      this.offsetEl = null;
      this.maskEl = null;
      this.placeholderEl = null;
      this.heightAutoObserverWrapperEl = null;
      this.heightAutoObserverEl = null;
      this.rtlHelpers = null;
      this.scrollbarWidth = 0;
      this.resizeObserver = null;
      this.mutationObserver = null;
      this.elStyles = null;
      this.isRtl = null;
      this.mouseX = 0;
      this.mouseY = 0;
      this.onMouseMove = function() {
      };
      this.onWindowResize = function() {
      };
      this.onStopScrolling = function() {
      };
      this.onMouseEntered = function() {
      };
      this.onScroll = function() {
        var elWindow = getElementWindow(_this.el);
        if (!_this.scrollXTicking) {
          elWindow.requestAnimationFrame(_this.scrollX);
          _this.scrollXTicking = true;
        }
        if (!_this.scrollYTicking) {
          elWindow.requestAnimationFrame(_this.scrollY);
          _this.scrollYTicking = true;
        }
        if (!_this.isScrolling) {
          _this.isScrolling = true;
          addClasses(_this.el, _this.classNames.scrolling);
        }
        _this.showScrollbar("x");
        _this.showScrollbar("y");
        _this.onStopScrolling();
      };
      this.scrollX = function() {
        if (_this.axis.x.isOverflowing) {
          _this.positionScrollbar("x");
        }
        _this.scrollXTicking = false;
      };
      this.scrollY = function() {
        if (_this.axis.y.isOverflowing) {
          _this.positionScrollbar("y");
        }
        _this.scrollYTicking = false;
      };
      this._onStopScrolling = function() {
        removeClasses(_this.el, _this.classNames.scrolling);
        if (_this.options.autoHide) {
          _this.hideScrollbar("x");
          _this.hideScrollbar("y");
        }
        _this.isScrolling = false;
      };
      this.onMouseEnter = function() {
        if (!_this.isMouseEntering) {
          addClasses(_this.el, _this.classNames.mouseEntered);
          _this.showScrollbar("x");
          _this.showScrollbar("y");
          _this.isMouseEntering = true;
        }
        _this.onMouseEntered();
      };
      this._onMouseEntered = function() {
        removeClasses(_this.el, _this.classNames.mouseEntered);
        if (_this.options.autoHide) {
          _this.hideScrollbar("x");
          _this.hideScrollbar("y");
        }
        _this.isMouseEntering = false;
      };
      this._onMouseMove = function(e) {
        _this.mouseX = e.clientX;
        _this.mouseY = e.clientY;
        if (_this.axis.x.isOverflowing || _this.axis.x.forceVisible) {
          _this.onMouseMoveForAxis("x");
        }
        if (_this.axis.y.isOverflowing || _this.axis.y.forceVisible) {
          _this.onMouseMoveForAxis("y");
        }
      };
      this.onMouseLeave = function() {
        _this.onMouseMove.cancel();
        if (_this.axis.x.isOverflowing || _this.axis.x.forceVisible) {
          _this.onMouseLeaveForAxis("x");
        }
        if (_this.axis.y.isOverflowing || _this.axis.y.forceVisible) {
          _this.onMouseLeaveForAxis("y");
        }
        _this.mouseX = -1;
        _this.mouseY = -1;
      };
      this._onWindowResize = function() {
        _this.scrollbarWidth = _this.getScrollbarWidth();
        _this.hideNativeScrollbar();
      };
      this.onPointerEvent = function(e) {
        if (!_this.axis.x.track.el || !_this.axis.y.track.el || !_this.axis.x.scrollbar.el || !_this.axis.y.scrollbar.el)
          return;
        var isWithinTrackXBounds, isWithinTrackYBounds;
        _this.axis.x.track.rect = _this.axis.x.track.el.getBoundingClientRect();
        _this.axis.y.track.rect = _this.axis.y.track.el.getBoundingClientRect();
        if (_this.axis.x.isOverflowing || _this.axis.x.forceVisible) {
          isWithinTrackXBounds = _this.isWithinBounds(_this.axis.x.track.rect);
        }
        if (_this.axis.y.isOverflowing || _this.axis.y.forceVisible) {
          isWithinTrackYBounds = _this.isWithinBounds(_this.axis.y.track.rect);
        }
        if (isWithinTrackXBounds || isWithinTrackYBounds) {
          e.stopPropagation();
          if (e.type === "pointerdown" && e.pointerType !== "touch") {
            if (isWithinTrackXBounds) {
              _this.axis.x.scrollbar.rect = _this.axis.x.scrollbar.el.getBoundingClientRect();
              if (_this.isWithinBounds(_this.axis.x.scrollbar.rect)) {
                _this.onDragStart(e, "x");
              } else {
                _this.onTrackClick(e, "x");
              }
            }
            if (isWithinTrackYBounds) {
              _this.axis.y.scrollbar.rect = _this.axis.y.scrollbar.el.getBoundingClientRect();
              if (_this.isWithinBounds(_this.axis.y.scrollbar.rect)) {
                _this.onDragStart(e, "y");
              } else {
                _this.onTrackClick(e, "y");
              }
            }
          }
        }
      };
      this.drag = function(e) {
        var _a2, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        if (!_this.draggedAxis || !_this.contentWrapperEl)
          return;
        var eventOffset;
        var track = _this.axis[_this.draggedAxis].track;
        var trackSize = (_b = (_a2 = track.rect) === null || _a2 === void 0 ? void 0 : _a2[_this.axis[_this.draggedAxis].sizeAttr]) !== null && _b !== void 0 ? _b : 0;
        var scrollbar = _this.axis[_this.draggedAxis].scrollbar;
        var contentSize = (_d = (_c = _this.contentWrapperEl) === null || _c === void 0 ? void 0 : _c[_this.axis[_this.draggedAxis].scrollSizeAttr]) !== null && _d !== void 0 ? _d : 0;
        var hostSize = parseInt((_f = (_e = _this.elStyles) === null || _e === void 0 ? void 0 : _e[_this.axis[_this.draggedAxis].sizeAttr]) !== null && _f !== void 0 ? _f : "0px", 10);
        e.preventDefault();
        e.stopPropagation();
        if (_this.draggedAxis === "y") {
          eventOffset = e.pageY;
        } else {
          eventOffset = e.pageX;
        }
        var dragPos = eventOffset - ((_h = (_g = track.rect) === null || _g === void 0 ? void 0 : _g[_this.axis[_this.draggedAxis].offsetAttr]) !== null && _h !== void 0 ? _h : 0) - _this.axis[_this.draggedAxis].dragOffset;
        dragPos = _this.draggedAxis === "x" && _this.isRtl ? ((_k = (_j = track.rect) === null || _j === void 0 ? void 0 : _j[_this.axis[_this.draggedAxis].sizeAttr]) !== null && _k !== void 0 ? _k : 0) - scrollbar.size - dragPos : dragPos;
        var dragPerc = dragPos / (trackSize - scrollbar.size);
        var scrollPos = dragPerc * (contentSize - hostSize);
        if (_this.draggedAxis === "x" && _this.isRtl) {
          scrollPos = ((_l = SimpleBarCore2.getRtlHelpers()) === null || _l === void 0 ? void 0 : _l.isScrollingToNegative) ? -scrollPos : scrollPos;
        }
        _this.contentWrapperEl[_this.axis[_this.draggedAxis].scrollOffsetAttr] = scrollPos;
      };
      this.onEndDrag = function(e) {
        _this.isDragging = false;
        var elDocument = getElementDocument(_this.el);
        var elWindow = getElementWindow(_this.el);
        e.preventDefault();
        e.stopPropagation();
        removeClasses(_this.el, _this.classNames.dragging);
        _this.onStopScrolling();
        elDocument.removeEventListener("mousemove", _this.drag, true);
        elDocument.removeEventListener("mouseup", _this.onEndDrag, true);
        _this.removePreventClickId = elWindow.setTimeout(function() {
          elDocument.removeEventListener("click", _this.preventClick, true);
          elDocument.removeEventListener("dblclick", _this.preventClick, true);
          _this.removePreventClickId = null;
        });
      };
      this.preventClick = function(e) {
        e.preventDefault();
        e.stopPropagation();
      };
      this.el = element;
      this.options = __assign(__assign({}, SimpleBarCore2.defaultOptions), options);
      this.classNames = __assign(__assign({}, SimpleBarCore2.defaultOptions.classNames), options.classNames);
      this.axis = {
        x: {
          scrollOffsetAttr: "scrollLeft",
          sizeAttr: "width",
          scrollSizeAttr: "scrollWidth",
          offsetSizeAttr: "offsetWidth",
          offsetAttr: "left",
          overflowAttr: "overflowX",
          dragOffset: 0,
          isOverflowing: true,
          forceVisible: false,
          track: { size: null, el: null, rect: null, isVisible: false },
          scrollbar: { size: null, el: null, rect: null, isVisible: false }
        },
        y: {
          scrollOffsetAttr: "scrollTop",
          sizeAttr: "height",
          scrollSizeAttr: "scrollHeight",
          offsetSizeAttr: "offsetHeight",
          offsetAttr: "top",
          overflowAttr: "overflowY",
          dragOffset: 0,
          isOverflowing: true,
          forceVisible: false,
          track: { size: null, el: null, rect: null, isVisible: false },
          scrollbar: { size: null, el: null, rect: null, isVisible: false }
        }
      };
      if (typeof this.el !== "object" || !this.el.nodeName) {
        throw new Error("Argument passed to SimpleBar must be an HTML element instead of ".concat(this.el));
      }
      this.onMouseMove = throttle_default(this._onMouseMove, 64);
      this.onWindowResize = debounce_default(this._onWindowResize, 64, { leading: true });
      this.onStopScrolling = debounce_default(this._onStopScrolling, this.stopScrollDelay);
      this.onMouseEntered = debounce_default(this._onMouseEntered, this.stopScrollDelay);
      this.init();
    }
    SimpleBarCore2.getRtlHelpers = function() {
      if (SimpleBarCore2.rtlHelpers) {
        return SimpleBarCore2.rtlHelpers;
      }
      var dummyDiv = document.createElement("div");
      dummyDiv.innerHTML = '<div class="simplebar-dummy-scrollbar-size"><div></div></div>';
      var scrollbarDummyEl = dummyDiv.firstElementChild;
      var dummyChild = scrollbarDummyEl === null || scrollbarDummyEl === void 0 ? void 0 : scrollbarDummyEl.firstElementChild;
      if (!dummyChild)
        return null;
      document.body.appendChild(scrollbarDummyEl);
      scrollbarDummyEl.scrollLeft = 0;
      var dummyContainerOffset = SimpleBarCore2.getOffset(scrollbarDummyEl);
      var dummyChildOffset = SimpleBarCore2.getOffset(dummyChild);
      scrollbarDummyEl.scrollLeft = -999;
      var dummyChildOffsetAfterScroll = SimpleBarCore2.getOffset(dummyChild);
      document.body.removeChild(scrollbarDummyEl);
      SimpleBarCore2.rtlHelpers = {
        // determines if the scrolling is responding with negative values
        isScrollOriginAtZero: dummyContainerOffset.left !== dummyChildOffset.left,
        // determines if the origin scrollbar position is inverted or not (positioned on left or right)
        isScrollingToNegative: dummyChildOffset.left !== dummyChildOffsetAfterScroll.left
      };
      return SimpleBarCore2.rtlHelpers;
    };
    SimpleBarCore2.prototype.getScrollbarWidth = function() {
      try {
        if (this.contentWrapperEl && getComputedStyle(this.contentWrapperEl, "::-webkit-scrollbar").display === "none" || "scrollbarWidth" in document.documentElement.style || "-ms-overflow-style" in document.documentElement.style) {
          return 0;
        } else {
          return scrollbarWidth();
        }
      } catch (e) {
        return scrollbarWidth();
      }
    };
    SimpleBarCore2.getOffset = function(el) {
      var rect = el.getBoundingClientRect();
      var elDocument = getElementDocument(el);
      var elWindow = getElementWindow(el);
      return {
        top: rect.top + (elWindow.pageYOffset || elDocument.documentElement.scrollTop),
        left: rect.left + (elWindow.pageXOffset || elDocument.documentElement.scrollLeft)
      };
    };
    SimpleBarCore2.prototype.init = function() {
      if (canUseDOM) {
        this.initDOM();
        this.rtlHelpers = SimpleBarCore2.getRtlHelpers();
        this.scrollbarWidth = this.getScrollbarWidth();
        this.recalculate();
        this.initListeners();
      }
    };
    SimpleBarCore2.prototype.initDOM = function() {
      var _a2, _b;
      this.wrapperEl = this.el.querySelector(classNamesToQuery(this.classNames.wrapper));
      this.contentWrapperEl = this.options.scrollableNode || this.el.querySelector(classNamesToQuery(this.classNames.contentWrapper));
      this.contentEl = this.options.contentNode || this.el.querySelector(classNamesToQuery(this.classNames.contentEl));
      this.offsetEl = this.el.querySelector(classNamesToQuery(this.classNames.offset));
      this.maskEl = this.el.querySelector(classNamesToQuery(this.classNames.mask));
      this.placeholderEl = this.findChild(this.wrapperEl, classNamesToQuery(this.classNames.placeholder));
      this.heightAutoObserverWrapperEl = this.el.querySelector(classNamesToQuery(this.classNames.heightAutoObserverWrapperEl));
      this.heightAutoObserverEl = this.el.querySelector(classNamesToQuery(this.classNames.heightAutoObserverEl));
      this.axis.x.track.el = this.findChild(this.el, "".concat(classNamesToQuery(this.classNames.track)).concat(classNamesToQuery(this.classNames.horizontal)));
      this.axis.y.track.el = this.findChild(this.el, "".concat(classNamesToQuery(this.classNames.track)).concat(classNamesToQuery(this.classNames.vertical)));
      this.axis.x.scrollbar.el = ((_a2 = this.axis.x.track.el) === null || _a2 === void 0 ? void 0 : _a2.querySelector(classNamesToQuery(this.classNames.scrollbar))) || null;
      this.axis.y.scrollbar.el = ((_b = this.axis.y.track.el) === null || _b === void 0 ? void 0 : _b.querySelector(classNamesToQuery(this.classNames.scrollbar))) || null;
      if (!this.options.autoHide) {
        addClasses(this.axis.x.scrollbar.el, this.classNames.visible);
        addClasses(this.axis.y.scrollbar.el, this.classNames.visible);
      }
    };
    SimpleBarCore2.prototype.initListeners = function() {
      var _this = this;
      var _a2;
      var elWindow = getElementWindow(this.el);
      this.el.addEventListener("mouseenter", this.onMouseEnter);
      this.el.addEventListener("pointerdown", this.onPointerEvent, true);
      this.el.addEventListener("mousemove", this.onMouseMove);
      this.el.addEventListener("mouseleave", this.onMouseLeave);
      (_a2 = this.contentWrapperEl) === null || _a2 === void 0 ? void 0 : _a2.addEventListener("scroll", this.onScroll);
      elWindow.addEventListener("resize", this.onWindowResize);
      if (!this.contentEl)
        return;
      if (window.ResizeObserver) {
        var resizeObserverStarted_1 = false;
        var resizeObserver = elWindow.ResizeObserver || ResizeObserver;
        this.resizeObserver = new resizeObserver(function() {
          if (!resizeObserverStarted_1)
            return;
          elWindow.requestAnimationFrame(function() {
            _this.recalculate();
          });
        });
        this.resizeObserver.observe(this.el);
        this.resizeObserver.observe(this.contentEl);
        elWindow.requestAnimationFrame(function() {
          resizeObserverStarted_1 = true;
        });
      }
      this.mutationObserver = new elWindow.MutationObserver(function() {
        elWindow.requestAnimationFrame(function() {
          _this.recalculate();
        });
      });
      this.mutationObserver.observe(this.contentEl, {
        childList: true,
        subtree: true,
        characterData: true
      });
    };
    SimpleBarCore2.prototype.recalculate = function() {
      if (!this.heightAutoObserverEl || !this.contentEl || !this.contentWrapperEl || !this.wrapperEl || !this.placeholderEl)
        return;
      var elWindow = getElementWindow(this.el);
      this.elStyles = elWindow.getComputedStyle(this.el);
      this.isRtl = this.elStyles.direction === "rtl";
      var contentElOffsetWidth = this.contentEl.offsetWidth;
      var isHeightAuto = this.heightAutoObserverEl.offsetHeight <= 1;
      var isWidthAuto = this.heightAutoObserverEl.offsetWidth <= 1 || contentElOffsetWidth > 0;
      var contentWrapperElOffsetWidth = this.contentWrapperEl.offsetWidth;
      var elOverflowX = this.elStyles.overflowX;
      var elOverflowY = this.elStyles.overflowY;
      this.contentEl.style.padding = "".concat(this.elStyles.paddingTop, " ").concat(this.elStyles.paddingRight, " ").concat(this.elStyles.paddingBottom, " ").concat(this.elStyles.paddingLeft);
      this.wrapperEl.style.margin = "-".concat(this.elStyles.paddingTop, " -").concat(this.elStyles.paddingRight, " -").concat(this.elStyles.paddingBottom, " -").concat(this.elStyles.paddingLeft);
      var contentElScrollHeight = this.contentEl.scrollHeight;
      var contentElScrollWidth = this.contentEl.scrollWidth;
      this.contentWrapperEl.style.height = isHeightAuto ? "auto" : "100%";
      this.placeholderEl.style.width = isWidthAuto ? "".concat(contentElOffsetWidth || contentElScrollWidth, "px") : "auto";
      this.placeholderEl.style.height = "".concat(contentElScrollHeight, "px");
      var contentWrapperElOffsetHeight = this.contentWrapperEl.offsetHeight;
      this.axis.x.isOverflowing = contentElOffsetWidth !== 0 && contentElScrollWidth > contentElOffsetWidth;
      this.axis.y.isOverflowing = contentElScrollHeight > contentWrapperElOffsetHeight;
      this.axis.x.isOverflowing = elOverflowX === "hidden" ? false : this.axis.x.isOverflowing;
      this.axis.y.isOverflowing = elOverflowY === "hidden" ? false : this.axis.y.isOverflowing;
      this.axis.x.forceVisible = this.options.forceVisible === "x" || this.options.forceVisible === true;
      this.axis.y.forceVisible = this.options.forceVisible === "y" || this.options.forceVisible === true;
      this.hideNativeScrollbar();
      var offsetForXScrollbar = this.axis.x.isOverflowing ? this.scrollbarWidth : 0;
      var offsetForYScrollbar = this.axis.y.isOverflowing ? this.scrollbarWidth : 0;
      this.axis.x.isOverflowing = this.axis.x.isOverflowing && contentElScrollWidth > contentWrapperElOffsetWidth - offsetForYScrollbar;
      this.axis.y.isOverflowing = this.axis.y.isOverflowing && contentElScrollHeight > contentWrapperElOffsetHeight - offsetForXScrollbar;
      this.axis.x.scrollbar.size = this.getScrollbarSize("x");
      this.axis.y.scrollbar.size = this.getScrollbarSize("y");
      if (this.axis.x.scrollbar.el)
        this.axis.x.scrollbar.el.style.width = "".concat(this.axis.x.scrollbar.size, "px");
      if (this.axis.y.scrollbar.el)
        this.axis.y.scrollbar.el.style.height = "".concat(this.axis.y.scrollbar.size, "px");
      this.positionScrollbar("x");
      this.positionScrollbar("y");
      this.toggleTrackVisibility("x");
      this.toggleTrackVisibility("y");
    };
    SimpleBarCore2.prototype.getScrollbarSize = function(axis) {
      var _a2, _b;
      if (axis === void 0) {
        axis = "y";
      }
      if (!this.axis[axis].isOverflowing || !this.contentEl) {
        return 0;
      }
      var contentSize = this.contentEl[this.axis[axis].scrollSizeAttr];
      var trackSize = (_b = (_a2 = this.axis[axis].track.el) === null || _a2 === void 0 ? void 0 : _a2[this.axis[axis].offsetSizeAttr]) !== null && _b !== void 0 ? _b : 0;
      var scrollbarRatio = trackSize / contentSize;
      var scrollbarSize;
      scrollbarSize = Math.max(~~(scrollbarRatio * trackSize), this.options.scrollbarMinSize);
      if (this.options.scrollbarMaxSize) {
        scrollbarSize = Math.min(scrollbarSize, this.options.scrollbarMaxSize);
      }
      return scrollbarSize;
    };
    SimpleBarCore2.prototype.positionScrollbar = function(axis) {
      var _a2, _b, _c;
      if (axis === void 0) {
        axis = "y";
      }
      var scrollbar = this.axis[axis].scrollbar;
      if (!this.axis[axis].isOverflowing || !this.contentWrapperEl || !scrollbar.el || !this.elStyles) {
        return;
      }
      var contentSize = this.contentWrapperEl[this.axis[axis].scrollSizeAttr];
      var trackSize = ((_a2 = this.axis[axis].track.el) === null || _a2 === void 0 ? void 0 : _a2[this.axis[axis].offsetSizeAttr]) || 0;
      var hostSize = parseInt(this.elStyles[this.axis[axis].sizeAttr], 10);
      var scrollOffset = this.contentWrapperEl[this.axis[axis].scrollOffsetAttr];
      scrollOffset = axis === "x" && this.isRtl && ((_b = SimpleBarCore2.getRtlHelpers()) === null || _b === void 0 ? void 0 : _b.isScrollOriginAtZero) ? -scrollOffset : scrollOffset;
      if (axis === "x" && this.isRtl) {
        scrollOffset = ((_c = SimpleBarCore2.getRtlHelpers()) === null || _c === void 0 ? void 0 : _c.isScrollingToNegative) ? scrollOffset : -scrollOffset;
      }
      var scrollPourcent = scrollOffset / (contentSize - hostSize);
      var handleOffset = ~~((trackSize - scrollbar.size) * scrollPourcent);
      handleOffset = axis === "x" && this.isRtl ? -handleOffset + (trackSize - scrollbar.size) : handleOffset;
      scrollbar.el.style.transform = axis === "x" ? "translate3d(".concat(handleOffset, "px, 0, 0)") : "translate3d(0, ".concat(handleOffset, "px, 0)");
    };
    SimpleBarCore2.prototype.toggleTrackVisibility = function(axis) {
      if (axis === void 0) {
        axis = "y";
      }
      var track = this.axis[axis].track.el;
      var scrollbar = this.axis[axis].scrollbar.el;
      if (!track || !scrollbar || !this.contentWrapperEl)
        return;
      if (this.axis[axis].isOverflowing || this.axis[axis].forceVisible) {
        track.style.visibility = "visible";
        this.contentWrapperEl.style[this.axis[axis].overflowAttr] = "scroll";
        this.el.classList.add("".concat(this.classNames.scrollable, "-").concat(axis));
      } else {
        track.style.visibility = "hidden";
        this.contentWrapperEl.style[this.axis[axis].overflowAttr] = "hidden";
        this.el.classList.remove("".concat(this.classNames.scrollable, "-").concat(axis));
      }
      if (this.axis[axis].isOverflowing) {
        scrollbar.style.display = "block";
      } else {
        scrollbar.style.display = "none";
      }
    };
    SimpleBarCore2.prototype.showScrollbar = function(axis) {
      if (axis === void 0) {
        axis = "y";
      }
      if (this.axis[axis].isOverflowing && !this.axis[axis].scrollbar.isVisible) {
        addClasses(this.axis[axis].scrollbar.el, this.classNames.visible);
        this.axis[axis].scrollbar.isVisible = true;
      }
    };
    SimpleBarCore2.prototype.hideScrollbar = function(axis) {
      if (axis === void 0) {
        axis = "y";
      }
      if (this.isDragging)
        return;
      if (this.axis[axis].isOverflowing && this.axis[axis].scrollbar.isVisible) {
        removeClasses(this.axis[axis].scrollbar.el, this.classNames.visible);
        this.axis[axis].scrollbar.isVisible = false;
      }
    };
    SimpleBarCore2.prototype.hideNativeScrollbar = function() {
      if (!this.offsetEl)
        return;
      this.offsetEl.style[this.isRtl ? "left" : "right"] = this.axis.y.isOverflowing || this.axis.y.forceVisible ? "-".concat(this.scrollbarWidth, "px") : "0px";
      this.offsetEl.style.bottom = this.axis.x.isOverflowing || this.axis.x.forceVisible ? "-".concat(this.scrollbarWidth, "px") : "0px";
    };
    SimpleBarCore2.prototype.onMouseMoveForAxis = function(axis) {
      if (axis === void 0) {
        axis = "y";
      }
      var currentAxis = this.axis[axis];
      if (!currentAxis.track.el || !currentAxis.scrollbar.el)
        return;
      currentAxis.track.rect = currentAxis.track.el.getBoundingClientRect();
      currentAxis.scrollbar.rect = currentAxis.scrollbar.el.getBoundingClientRect();
      if (this.isWithinBounds(currentAxis.track.rect)) {
        this.showScrollbar(axis);
        addClasses(currentAxis.track.el, this.classNames.hover);
        if (this.isWithinBounds(currentAxis.scrollbar.rect)) {
          addClasses(currentAxis.scrollbar.el, this.classNames.hover);
        } else {
          removeClasses(currentAxis.scrollbar.el, this.classNames.hover);
        }
      } else {
        removeClasses(currentAxis.track.el, this.classNames.hover);
        if (this.options.autoHide) {
          this.hideScrollbar(axis);
        }
      }
    };
    SimpleBarCore2.prototype.onMouseLeaveForAxis = function(axis) {
      if (axis === void 0) {
        axis = "y";
      }
      removeClasses(this.axis[axis].track.el, this.classNames.hover);
      removeClasses(this.axis[axis].scrollbar.el, this.classNames.hover);
      if (this.options.autoHide) {
        this.hideScrollbar(axis);
      }
    };
    SimpleBarCore2.prototype.onDragStart = function(e, axis) {
      var _a2;
      if (axis === void 0) {
        axis = "y";
      }
      this.isDragging = true;
      var elDocument = getElementDocument(this.el);
      var elWindow = getElementWindow(this.el);
      var scrollbar = this.axis[axis].scrollbar;
      var eventOffset = axis === "y" ? e.pageY : e.pageX;
      this.axis[axis].dragOffset = eventOffset - (((_a2 = scrollbar.rect) === null || _a2 === void 0 ? void 0 : _a2[this.axis[axis].offsetAttr]) || 0);
      this.draggedAxis = axis;
      addClasses(this.el, this.classNames.dragging);
      elDocument.addEventListener("mousemove", this.drag, true);
      elDocument.addEventListener("mouseup", this.onEndDrag, true);
      if (this.removePreventClickId === null) {
        elDocument.addEventListener("click", this.preventClick, true);
        elDocument.addEventListener("dblclick", this.preventClick, true);
      } else {
        elWindow.clearTimeout(this.removePreventClickId);
        this.removePreventClickId = null;
      }
    };
    SimpleBarCore2.prototype.onTrackClick = function(e, axis) {
      var _this = this;
      var _a2, _b, _c, _d;
      if (axis === void 0) {
        axis = "y";
      }
      var currentAxis = this.axis[axis];
      if (!this.options.clickOnTrack || !currentAxis.scrollbar.el || !this.contentWrapperEl)
        return;
      e.preventDefault();
      var elWindow = getElementWindow(this.el);
      this.axis[axis].scrollbar.rect = currentAxis.scrollbar.el.getBoundingClientRect();
      var scrollbar = this.axis[axis].scrollbar;
      var scrollbarOffset = (_b = (_a2 = scrollbar.rect) === null || _a2 === void 0 ? void 0 : _a2[this.axis[axis].offsetAttr]) !== null && _b !== void 0 ? _b : 0;
      var hostSize = parseInt((_d = (_c = this.elStyles) === null || _c === void 0 ? void 0 : _c[this.axis[axis].sizeAttr]) !== null && _d !== void 0 ? _d : "0px", 10);
      var scrolled = this.contentWrapperEl[this.axis[axis].scrollOffsetAttr];
      var t = axis === "y" ? this.mouseY - scrollbarOffset : this.mouseX - scrollbarOffset;
      var dir = t < 0 ? -1 : 1;
      var scrollSize = dir === -1 ? scrolled - hostSize : scrolled + hostSize;
      var speed = 40;
      var scrollTo = function() {
        if (!_this.contentWrapperEl)
          return;
        if (dir === -1) {
          if (scrolled > scrollSize) {
            scrolled -= speed;
            _this.contentWrapperEl[_this.axis[axis].scrollOffsetAttr] = scrolled;
            elWindow.requestAnimationFrame(scrollTo);
          }
        } else {
          if (scrolled < scrollSize) {
            scrolled += speed;
            _this.contentWrapperEl[_this.axis[axis].scrollOffsetAttr] = scrolled;
            elWindow.requestAnimationFrame(scrollTo);
          }
        }
      };
      scrollTo();
    };
    SimpleBarCore2.prototype.getContentElement = function() {
      return this.contentEl;
    };
    SimpleBarCore2.prototype.getScrollElement = function() {
      return this.contentWrapperEl;
    };
    SimpleBarCore2.prototype.removeListeners = function() {
      var elWindow = getElementWindow(this.el);
      this.el.removeEventListener("mouseenter", this.onMouseEnter);
      this.el.removeEventListener("pointerdown", this.onPointerEvent, true);
      this.el.removeEventListener("mousemove", this.onMouseMove);
      this.el.removeEventListener("mouseleave", this.onMouseLeave);
      if (this.contentWrapperEl) {
        this.contentWrapperEl.removeEventListener("scroll", this.onScroll);
      }
      elWindow.removeEventListener("resize", this.onWindowResize);
      if (this.mutationObserver) {
        this.mutationObserver.disconnect();
      }
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
      }
      this.onMouseMove.cancel();
      this.onWindowResize.cancel();
      this.onStopScrolling.cancel();
      this.onMouseEntered.cancel();
    };
    SimpleBarCore2.prototype.unMount = function() {
      this.removeListeners();
    };
    SimpleBarCore2.prototype.isWithinBounds = function(bbox) {
      return this.mouseX >= bbox.left && this.mouseX <= bbox.left + bbox.width && this.mouseY >= bbox.top && this.mouseY <= bbox.top + bbox.height;
    };
    SimpleBarCore2.prototype.findChild = function(el, query) {
      var matches = el.matches || el.webkitMatchesSelector || el.mozMatchesSelector || el.msMatchesSelector;
      return Array.prototype.filter.call(el.children, function(child) {
        return matches.call(child, query);
      })[0];
    };
    SimpleBarCore2.rtlHelpers = null;
    SimpleBarCore2.defaultOptions = {
      forceVisible: false,
      clickOnTrack: true,
      scrollbarMinSize: 25,
      scrollbarMaxSize: 0,
      ariaLabel: "scrollable content",
      tabIndex: 0,
      classNames: {
        contentEl: "simplebar-content",
        contentWrapper: "simplebar-content-wrapper",
        offset: "simplebar-offset",
        mask: "simplebar-mask",
        wrapper: "simplebar-wrapper",
        placeholder: "simplebar-placeholder",
        scrollbar: "simplebar-scrollbar",
        track: "simplebar-track",
        heightAutoObserverWrapperEl: "simplebar-height-auto-observer-wrapper",
        heightAutoObserverEl: "simplebar-height-auto-observer",
        visible: "simplebar-visible",
        horizontal: "simplebar-horizontal",
        vertical: "simplebar-vertical",
        hover: "simplebar-hover",
        dragging: "simplebar-dragging",
        scrolling: "simplebar-scrolling",
        scrollable: "simplebar-scrollable",
        mouseEntered: "simplebar-mouse-entered"
      },
      scrollableNode: null,
      contentNode: null,
      autoHide: true
    };
    SimpleBarCore2.getOptions = getOptions;
    SimpleBarCore2.helpers = helpers;
    return SimpleBarCore2;
  })()
);

// node_modules/.pnpm/simplebar@6.3.3/node_modules/simplebar/dist/index.mjs
var extendStatics = function(d, b) {
  extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
    d2.__proto__ = b2;
  } || function(d2, b2) {
    for (var p in b2) if (Object.prototype.hasOwnProperty.call(b2, p)) d2[p] = b2[p];
  };
  return extendStatics(d, b);
};
function __extends(d, b) {
  if (typeof b !== "function" && b !== null)
    throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
  extendStatics(d, b);
  function __() {
    this.constructor = d;
  }
  d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}
var _a = SimpleBarCore.helpers;
var getOptions2 = _a.getOptions;
var addClasses2 = _a.addClasses;
var canUseDOM2 = _a.canUseDOM;
var SimpleBar = (
  /** @class */
  (function(_super) {
    __extends(SimpleBar2, _super);
    function SimpleBar2() {
      var args = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
      }
      var _this = _super.apply(this, args) || this;
      SimpleBar2.instances.set(args[0], _this);
      return _this;
    }
    SimpleBar2.initDOMLoadedElements = function() {
      document.removeEventListener("DOMContentLoaded", this.initDOMLoadedElements);
      window.removeEventListener("load", this.initDOMLoadedElements);
      Array.prototype.forEach.call(document.querySelectorAll("[data-simplebar]"), function(el) {
        if (el.getAttribute("data-simplebar") !== "init" && !SimpleBar2.instances.has(el))
          new SimpleBar2(el, getOptions2(el.attributes));
      });
    };
    SimpleBar2.removeObserver = function() {
      var _a2;
      (_a2 = SimpleBar2.globalObserver) === null || _a2 === void 0 ? void 0 : _a2.disconnect();
    };
    SimpleBar2.prototype.initDOM = function() {
      var _this = this;
      var _a2, _b, _c;
      if (!Array.prototype.filter.call(this.el.children, function(child) {
        return child.classList.contains(_this.classNames.wrapper);
      }).length) {
        this.wrapperEl = document.createElement("div");
        this.contentWrapperEl = document.createElement("div");
        this.offsetEl = document.createElement("div");
        this.maskEl = document.createElement("div");
        this.contentEl = document.createElement("div");
        this.placeholderEl = document.createElement("div");
        this.heightAutoObserverWrapperEl = document.createElement("div");
        this.heightAutoObserverEl = document.createElement("div");
        addClasses2(this.wrapperEl, this.classNames.wrapper);
        addClasses2(this.contentWrapperEl, this.classNames.contentWrapper);
        addClasses2(this.offsetEl, this.classNames.offset);
        addClasses2(this.maskEl, this.classNames.mask);
        addClasses2(this.contentEl, this.classNames.contentEl);
        addClasses2(this.placeholderEl, this.classNames.placeholder);
        addClasses2(this.heightAutoObserverWrapperEl, this.classNames.heightAutoObserverWrapperEl);
        addClasses2(this.heightAutoObserverEl, this.classNames.heightAutoObserverEl);
        while (this.el.firstChild) {
          this.contentEl.appendChild(this.el.firstChild);
        }
        this.contentWrapperEl.appendChild(this.contentEl);
        this.offsetEl.appendChild(this.contentWrapperEl);
        this.maskEl.appendChild(this.offsetEl);
        this.heightAutoObserverWrapperEl.appendChild(this.heightAutoObserverEl);
        this.wrapperEl.appendChild(this.heightAutoObserverWrapperEl);
        this.wrapperEl.appendChild(this.maskEl);
        this.wrapperEl.appendChild(this.placeholderEl);
        this.el.appendChild(this.wrapperEl);
        (_a2 = this.contentWrapperEl) === null || _a2 === void 0 ? void 0 : _a2.setAttribute("tabindex", this.options.tabIndex.toString());
        (_b = this.contentWrapperEl) === null || _b === void 0 ? void 0 : _b.setAttribute("role", "region");
        (_c = this.contentWrapperEl) === null || _c === void 0 ? void 0 : _c.setAttribute("aria-label", this.options.ariaLabel);
      }
      if (!this.axis.x.track.el || !this.axis.y.track.el) {
        var track = document.createElement("div");
        var scrollbar = document.createElement("div");
        addClasses2(track, this.classNames.track);
        addClasses2(scrollbar, this.classNames.scrollbar);
        track.appendChild(scrollbar);
        this.axis.x.track.el = track.cloneNode(true);
        addClasses2(this.axis.x.track.el, this.classNames.horizontal);
        this.axis.y.track.el = track.cloneNode(true);
        addClasses2(this.axis.y.track.el, this.classNames.vertical);
        this.el.appendChild(this.axis.x.track.el);
        this.el.appendChild(this.axis.y.track.el);
      }
      SimpleBarCore.prototype.initDOM.call(this);
      this.el.setAttribute("data-simplebar", "init");
    };
    SimpleBar2.prototype.unMount = function() {
      SimpleBarCore.prototype.unMount.call(this);
      SimpleBar2.instances["delete"](this.el);
    };
    SimpleBar2.initHtmlApi = function() {
      this.initDOMLoadedElements = this.initDOMLoadedElements.bind(this);
      if (typeof MutationObserver !== "undefined") {
        this.globalObserver = new MutationObserver(SimpleBar2.handleMutations);
        this.globalObserver.observe(document, { childList: true, subtree: true });
      }
      if (document.readyState === "complete" || // @ts-ignore: IE specific
      document.readyState !== "loading" && !document.documentElement.doScroll) {
        window.setTimeout(this.initDOMLoadedElements);
      } else {
        document.addEventListener("DOMContentLoaded", this.initDOMLoadedElements);
        window.addEventListener("load", this.initDOMLoadedElements);
      }
    };
    SimpleBar2.handleMutations = function(mutations) {
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(addedNode) {
          if (addedNode.nodeType === 1) {
            if (addedNode.hasAttribute("data-simplebar")) {
              !SimpleBar2.instances.has(addedNode) && document.documentElement.contains(addedNode) && new SimpleBar2(addedNode, getOptions2(addedNode.attributes));
            } else {
              addedNode.querySelectorAll("[data-simplebar]").forEach(function(el) {
                if (el.getAttribute("data-simplebar") !== "init" && !SimpleBar2.instances.has(el) && document.documentElement.contains(el))
                  new SimpleBar2(el, getOptions2(el.attributes));
              });
            }
          }
        });
        mutation.removedNodes.forEach(function(removedNode) {
          var _a2;
          if (removedNode.nodeType === 1) {
            if (removedNode.getAttribute("data-simplebar") === "init") {
              !document.documentElement.contains(removedNode) && ((_a2 = SimpleBar2.instances.get(removedNode)) === null || _a2 === void 0 ? void 0 : _a2.unMount());
            } else {
              Array.prototype.forEach.call(removedNode.querySelectorAll('[data-simplebar="init"]'), function(el) {
                var _a3;
                !document.documentElement.contains(el) && ((_a3 = SimpleBar2.instances.get(el)) === null || _a3 === void 0 ? void 0 : _a3.unMount());
              });
            }
          }
        });
      });
    };
    SimpleBar2.instances = /* @__PURE__ */ new WeakMap();
    return SimpleBar2;
  })(SimpleBarCore)
);
if (canUseDOM2) {
  SimpleBar.initHtmlApi();
}

// wallpaper/vendor/spicy-lyrics/src/modules/Scheduler.ts
var SchedulerEnums = {
  timeout: 0,
  interval: 1,
  raf: 2
};
var Timeout = (cb, ms) => [
  SchedulerEnums.timeout,
  window.setTimeout(cb, ms),
  { cancelled: false }
];
var Interval = (cb, ms) => [
  SchedulerEnums.interval,
  window.setInterval(cb, ms),
  { cancelled: false }
];
var OnPreRender = (cb) => [
  SchedulerEnums.raf,
  requestAnimationFrame(cb),
  { cancelled: false }
];
var Cancel = (scheduledItems) => {
  const normalizedItems = Array.isArray(scheduledItems[0]) ? scheduledItems : [scheduledItems];
  for (const scheduledItem of normalizedItems) {
    const [type, id, dataObject] = scheduledItem;
    if (dataObject.cancelled) continue;
    dataObject.cancelled = true;
    if (type === SchedulerEnums.timeout) window.clearTimeout(id);
    else if (type === SchedulerEnums.interval) window.clearInterval(id);
    else if (type === SchedulerEnums.raf) cancelAnimationFrame(id);
  }
};
var IsScheduled = (value) => Array.isArray(value) && value.length === 3 && typeof value[0] === "number" && typeof value[1] === "number" && typeof value[2] === "object";
var Scheduler = {
  Timeout,
  Interval,
  OnPreRender,
  Cancel,
  IsScheduled
};
var Scheduler_default = Scheduler;

// wallpaper/vendor/spicy-lyrics/src/modules/Maid.ts
function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === "x" ? r : r & 3 | 8).toString(16);
  });
}
function cleanItem(item) {
  if (typeof item === "function") {
    item();
  } else if (item instanceof MutationObserver || item instanceof ResizeObserver) {
    item.disconnect();
  } else if (item instanceof Element) {
    item.remove();
  } else if (Scheduler_default.IsScheduled(item)) {
    Scheduler_default.Cancel(item);
  } else if (typeof item === "object" && item !== null && "Destroy" in item && typeof item.Destroy === "function") {
    item.Destroy();
  } else {
    console.warn("[Maid] Unknown item type \u2014 cannot clean:", item);
  }
}
var Maid = class {
  _items = /* @__PURE__ */ new Map();
  _destroyed = false;
  Give(item, key) {
    const k = key ?? uuidv4();
    if (this._destroyed) {
      cleanItem(item);
      return item;
    }
    if (this._items.has(k)) {
      cleanItem(this._items.get(k));
    }
    this._items.set(k, item);
    return item;
  }
  GiveItems(...items) {
    for (const item of items) this.Give(item);
    return items;
  }
  Get(key) {
    return this._items.get(key);
  }
  Has(key) {
    return this._items.has(key);
  }
  Clean(key) {
    const item = this._items.get(key);
    if (item === void 0) return;
    this._items.delete(key);
    cleanItem(item);
  }
  CleanUp() {
    for (const item of this._items.values()) cleanItem(item);
    this._items.clear();
  }
  Destroy() {
    this.CleanUp();
    this._destroyed = true;
  }
  IsDestroyed() {
    return this._destroyed;
  }
};

// wallpaper/vendor/spicy-host/ui.mjs
var IsCompactMode = () => false;
var IsPIP = false;
var ArabicPersianRegex = /[\u0600-\u06FF]/;
function HideLyricsSkeleton() {
}
var Logger = class {
  constructor(name) {
    this.name = name;
  }
  warn(...args) {
    console.warn(this.name, ...args);
  }
  error(...args) {
    console.error(this.name, ...args);
  }
  log() {
  }
  debug() {
  }
  info() {
  }
};
var ui_default = Logger;
function ApplyIsByCommunity(data, container) {
  const people = data.UploadAttribution;
  if (!people) return;
  const credit = document.createElement("div");
  credit.className = "IsByCommunity";
  for (const role of ["Uploader", "Maker"]) {
    const person = people[role];
    if (!person?.username) continue;
    const label = document.createElement("span");
    label.textContent = `${role}: ${person.username}`;
    try {
      const url = new URL(person.url);
      if (url.protocol === "https:" && url.hostname === "spicylyrics.org") {
        const link = document.createElement("a");
        link.href = url.href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.append(label);
        credit.append(link, " ");
        continue;
      }
    } catch {
    }
    credit.append(label, " ");
  }
  container.append(credit);
}

// wallpaper/vendor/spicy-lyrics/src/utils/AnimationFrameLoop.ts
var callbacks = /* @__PURE__ */ new Set();
var FRAME_SLACK_MS = 1;
var MIN_FPS_CAP = 15;
var MAX_FPS_CAP = 240;
var DEFAULT_FPS_CAP = 60;
var computeFrameInterval = () => {
  if (!$animationFpsCapEnabled.get()) return 0;
  const saved = Number($animationFpsCap.get());
  const fps = Number.isFinite(saved) ? Math.min(MAX_FPS_CAP, Math.max(MIN_FPS_CAP, saved)) : DEFAULT_FPS_CAP;
  return 1e3 / fps;
};
var frameInterval = computeFrameInterval();
var updateFrameInterval = () => {
  frameInterval = computeFrameInterval();
};
$animationFpsCapEnabled.listen(updateFrameInterval);
$animationFpsCap.listen(updateFrameInterval);
var lastRender = -Infinity;
var shouldRender = (timestamp) => {
  if (frameInterval === 0) return true;
  const elapsed = timestamp - lastRender;
  if (elapsed < frameInterval - FRAME_SLACK_MS) return false;
  lastRender = elapsed >= frameInterval && elapsed < frameInterval * 2 ? timestamp - elapsed % frameInterval : timestamp;
  return true;
};
var pending = /* @__PURE__ */ new Map();
var nextPendingId = 1;
var run = (callback, timestamp) => {
  try {
    callback(timestamp);
  } catch (err) {
    console.error("Spicy Lyrics: animation frame callback failed", err);
  }
};
var loop = (timestamp) => {
  if (shouldRender(timestamp)) {
    for (const callback of callbacks) run(callback, timestamp);
    if (pending.size > 0) {
      const due = pending;
      pending = /* @__PURE__ */ new Map();
      for (const callback of due.values()) run(callback, timestamp);
    }
  }
  requestAnimationFrame(loop);
};
requestAnimationFrame(loop);
function onAnimationFrame(callback) {
  callbacks.add(callback);
  return () => callbacks.delete(callback);
}
function requestCappedFrame(callback) {
  const id = nextPendingId++;
  pending.set(id, callback);
  return id;
}
function cancelCappedFrame(id) {
  pending.delete(id);
}

// wallpaper/vendor/spicy-lyrics/src/utils/IntervalManager.ts
var intervalLogger = new ui_default("Interval Manager");
var IntervalManager = class {
  maid;
  callback;
  duration;
  // Duration in milliseconds
  unsubscribeFrame;
  intervalId;
  Running;
  Destroyed;
  constructor(duration, callback) {
    if (Number.isNaN(duration)) {
      throw new Error("Duration cannot be NaN.");
    }
    this.maid = new Maid();
    this.callback = callback;
    this.duration = duration === Infinity ? 0 : duration * 1e3;
    this.unsubscribeFrame = null;
    this.intervalId = null;
    this.Running = false;
    this.Destroyed = false;
    this.maid.Give(() => this.Stop());
  }
  // Starts the interval, or the per-frame callback when duration is Infinity
  Start() {
    if (this.Destroyed) {
      intervalLogger.warn("Cannot start; IntervalManager has been destroyed");
      return;
    }
    if (this.Running) {
      intervalLogger.warn("Interval is already running");
      return;
    }
    this.Running = true;
    if (this.duration > 0 && Number.isFinite(this.duration)) {
      this.intervalId = setInterval(() => {
        if (!this.Running || this.Destroyed) return;
        this.callback();
      }, this.duration);
      return;
    }
    this.unsubscribeFrame = onAnimationFrame(() => {
      if (!this.Running || this.Destroyed) return;
      this.callback();
    });
  }
  // Stops the animation frame loop without destroying the manager
  Stop() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.unsubscribeFrame !== null) {
      this.unsubscribeFrame();
      this.unsubscribeFrame = null;
    }
    this.Running = false;
  }
  // Restarts the animation frame loop
  Restart() {
    if (this.Destroyed) {
      intervalLogger.warn("Cannot restart; IntervalManager has been destroyed");
      return;
    }
    this.Stop();
    this.Start();
  }
  // Fully cleans up the manager and makes it unusable
  Destroy() {
    if (this.Destroyed) {
      intervalLogger.warn("IntervalManager is already destroyed");
      return;
    }
    this.Stop();
    this.maid.CleanUp();
    this.Destroyed = true;
    this.Running = false;
  }
};

// wallpaper/vendor/spicy-lyrics/src/utils/Scrolling/Page/IsHovering.ts
var IsMouseInLyricsPage = false;
function LyricsPageMouseEnter() {
  IsMouseInLyricsPage = true;
}
function LyricsPageMouseLeave() {
  IsMouseInLyricsPage = false;
}
function SetIsMouseInLyricsPage(value) {
  IsMouseInLyricsPage = value;
}

// wallpaper/vendor/spicy-lyrics/src/utils/Scrolling/Simplebar/ScrollSimplebar.ts
var ScrollSimplebar = null;
var ElementEventQuery = ".ContentBox .LyricsContainer";
function MountScrollSimplebar() {
  if (!PageContainer) {
    console.warn("Cannot mount ScrollSimplebar: PageContainer not found");
    return;
  }
  const LyricsContainer = PageContainer.querySelector(
    ".LyricsContainer .LyricsContent"
  );
  if (!LyricsContainer) {
    console.warn("Cannot mount ScrollSimplebar: LyricsContainer not found");
    return;
  }
  ScrollSimplebar = new SimpleBar(LyricsContainer, { autoHide: false });
  PageContainer.querySelector(ElementEventQuery)?.addEventListener("mouseenter", LyricsPageMouseEnter);
  PageContainer.querySelector(ElementEventQuery)?.addEventListener("mouseleave", LyricsPageMouseLeave);
}
function ClearScrollSimplebar() {
  ScrollSimplebar?.unMount();
  ScrollSimplebar = null;
  SetIsMouseInLyricsPage(false);
  if (PageContainer) {
    PageContainer.querySelector(ElementEventQuery)?.removeEventListener("mouseenter", LyricsPageMouseEnter);
    PageContainer.querySelector(ElementEventQuery)?.removeEventListener("mouseleave", LyricsPageMouseLeave);
  }
}
function RecalculateScrollSimplebar() {
  ScrollSimplebar?.recalculate();
}
new IntervalManager(Infinity, () => {
  if (!PageContainer) return;
  const LyricsContainer = PageContainer.querySelector(
    ".LyricsContainer .LyricsContent"
  );
  if (!LyricsContainer || !ScrollSimplebar) return;
  const hide = !IsMouseInLyricsPage && !ScrollSimplebar.isDragging;
  if (LyricsContainer.classList.contains("hide-scrollbar") !== hide) {
    LyricsContainer.classList.toggle("hide-scrollbar", hide);
  }
}).Start();

// wallpaper/vendor/spicy-lyrics/src/utils/Lyrics/Animator/Shared.ts
var IdleLyricsScale = 0.95;
var IdleEmphasisLyricsScale = 0.95;
var timeOffset = 0;
var BlurMultiplier = 1.25;

// wallpaper/vendor/spicy-lyrics/src/utils/Lyrics/ConvertTime.ts
function ConvertTime(time) {
  return time * 1e3;
}

// wallpaper/vendor/spicy-host/fetch.mjs
function ClearLyricsPageContainer() {
  PageContainer?.querySelector(".LyricsContent")?.replaceChildren();
}

// wallpaper/vendor/spicy-lyrics/src/utils/Lyrics/isRtl.ts
function isRtl(text) {
  if (!text || text.length === 0) return false;
  const rtlRegex = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB1D-\uFB4F\uFB50-\uFDFF\uFE70-\uFEFF]/;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (/[\d\s,.;:?!()[\]{}"'\\/<>@#$%^&*_=+-]/.test(char)) {
      continue;
    }
    return rtlRegex.test(char);
  }
  return false;
}
var isRtl_default = isRtl;

// wallpaper/vendor/spicy-lyrics/src/utils/Lyrics/Animator/Lyrics/LyricsAnimator.ts
var import_cubic_spline = __toESM(require_cubic_spline(), 1);

// node_modules/.pnpm/d3-ease@3.0.1/node_modules/d3-ease/src/sin.js
var pi = Math.PI;
var halfPi = pi / 2;
function sinOut(t) {
  return Math.sin(t * halfPi);
}

// node_modules/.pnpm/@tanstack+virtual-core@3.16.0/node_modules/@tanstack/virtual-core/dist/esm/lazy-measurements.js
function createLazyMeasurementsView(count, flat, getItemKey) {
  const cache = new Array(count);
  return new Proxy(cache, {
    get(target, prop, receiver) {
      if (typeof prop === "string") {
        const c = prop.charCodeAt(0);
        if (c >= 48 && c <= 57) {
          const i = +prop;
          if (Number.isInteger(i) && i >= 0 && i < count) {
            let v = target[i];
            if (!v) {
              const s = flat[i * 2];
              v = target[i] = {
                index: i,
                key: getItemKey(i),
                start: s,
                size: flat[i * 2 + 1],
                end: s + flat[i * 2 + 1],
                lane: 0
              };
            }
            return v;
          }
        }
        if (prop === "length") return count;
      }
      return Reflect.get(target, prop, receiver);
    }
  });
}

// node_modules/.pnpm/@tanstack+virtual-core@3.16.0/node_modules/@tanstack/virtual-core/dist/esm/utils.js
function memo(getDeps, fn, opts) {
  let deps = opts.initialDeps ?? [];
  let result;
  let isInitial = true;
  function memoizedFunction() {
    var _a2;
    const debugEnabled = !!opts.key && !!((_a2 = opts.debug) == null ? void 0 : _a2.call(opts));
    let depTime = 0;
    if (debugEnabled) depTime = Date.now();
    const newDeps = getDeps();
    const depsChanged = newDeps.length !== deps.length || newDeps.some((dep, index) => deps[index] !== dep);
    if (!depsChanged) {
      return result;
    }
    deps = newDeps;
    let resultTime = 0;
    if (debugEnabled) resultTime = Date.now();
    result = fn(...newDeps);
    if (debugEnabled) {
      const depEndTime = Math.round((Date.now() - depTime) * 100) / 100;
      const resultEndTime = Math.round((Date.now() - resultTime) * 100) / 100;
      const resultFpsPercentage = resultEndTime / 16;
      const pad = (str, num) => {
        str = String(str);
        while (str.length < num) {
          str = " " + str;
        }
        return str;
      };
      console.info(
        `%c\u23F1 ${pad(resultEndTime, 5)} /${pad(depEndTime, 5)} ms`,
        `
            font-size: .6rem;
            font-weight: bold;
            color: hsl(${Math.max(
          0,
          Math.min(120 - 120 * resultFpsPercentage, 120)
        )}deg 100% 31%);`,
        opts == null ? void 0 : opts.key
      );
    }
    if ((opts == null ? void 0 : opts.onChange) && !(isInitial && opts.skipInitialOnChange)) {
      opts.onChange(result);
    }
    isInitial = false;
    return result;
  }
  memoizedFunction.updateDeps = (newDeps) => {
    deps = newDeps;
  };
  return memoizedFunction;
}
function notUndefined(value, msg) {
  if (value === void 0) {
    throw new Error(`Unexpected undefined${msg ? `: ${msg}` : ""}`);
  } else {
    return value;
  }
}
var approxEqual = (a, b) => Math.abs(a - b) < 1.01;
var debounce2 = (targetWindow, fn, ms) => {
  let timeoutId;
  return function(...args) {
    targetWindow.clearTimeout(timeoutId);
    timeoutId = targetWindow.setTimeout(() => fn.apply(this, args), ms);
  };
};

// node_modules/.pnpm/@tanstack+virtual-core@3.16.0/node_modules/@tanstack/virtual-core/dist/esm/index.js
var _isIOSResult;
var isIOSWebKit = () => {
  if (_isIOSResult !== void 0) return _isIOSResult;
  if (typeof navigator === "undefined") return _isIOSResult = false;
  if (/iP(hone|od|ad)/.test(navigator.userAgent)) return _isIOSResult = true;
  const mtp = navigator.maxTouchPoints;
  return _isIOSResult = navigator.platform === "MacIntel" && mtp !== void 0 && mtp > 0;
};
var getRect = (element) => {
  const { offsetWidth, offsetHeight } = element;
  return { width: offsetWidth, height: offsetHeight };
};
var defaultKeyExtractor = (index) => index;
var defaultRangeExtractor = (range) => {
  const start = Math.max(range.startIndex - range.overscan, 0);
  const end = Math.min(range.endIndex + range.overscan, range.count - 1);
  const len = end - start + 1;
  const arr = new Array(len);
  for (let i = 0; i < len; i++) {
    arr[i] = start + i;
  }
  return arr;
};
var observeElementRect = (instance, cb) => {
  const element = instance.scrollElement;
  if (!element) {
    return;
  }
  const targetWindow = instance.targetWindow;
  if (!targetWindow) {
    return;
  }
  const handler = (rect) => {
    const { width, height } = rect;
    cb({ width: Math.round(width), height: Math.round(height) });
  };
  handler(getRect(element));
  if (!targetWindow.ResizeObserver) {
    return () => {
    };
  }
  const observer = new targetWindow.ResizeObserver((entries) => {
    const run2 = () => {
      const entry = entries[0];
      if (entry == null ? void 0 : entry.borderBoxSize) {
        const box = entry.borderBoxSize[0];
        if (box) {
          handler({ width: box.inlineSize, height: box.blockSize });
          return;
        }
      }
      handler(getRect(element));
    };
    instance.options.useAnimationFrameWithResizeObserver ? requestAnimationFrame(run2) : run2();
  });
  observer.observe(element, { box: "border-box" });
  return () => {
    observer.unobserve(element);
  };
};
var addEventListenerOptions = {
  passive: true
};
var supportsScrollend = typeof window == "undefined" ? true : "onscrollend" in window;
var observeOffset = (instance, cb, readOffset) => {
  const element = instance.scrollElement;
  if (!element) {
    return;
  }
  const targetWindow = instance.targetWindow;
  if (!targetWindow) {
    return;
  }
  const registerScrollendEvent = instance.options.useScrollendEvent && supportsScrollend;
  let offset = 0;
  const fallback = registerScrollendEvent ? null : debounce2(
    targetWindow,
    () => cb(offset, false),
    instance.options.isScrollingResetDelay
  );
  const createHandler = (isScrolling) => () => {
    offset = readOffset(element);
    fallback == null ? void 0 : fallback();
    cb(offset, isScrolling);
  };
  const handler = createHandler(true);
  const endHandler = createHandler(false);
  element.addEventListener("scroll", handler, addEventListenerOptions);
  if (registerScrollendEvent) {
    element.addEventListener("scrollend", endHandler, addEventListenerOptions);
  }
  return () => {
    element.removeEventListener("scroll", handler);
    if (registerScrollendEvent) {
      element.removeEventListener("scrollend", endHandler);
    }
  };
};
var observeElementOffset = (instance, cb) => observeOffset(instance, cb, (el) => {
  const { horizontal, isRtl: isRtl2 } = instance.options;
  return horizontal ? el.scrollLeft * (isRtl2 && -1 || 1) : el.scrollTop;
});
var measureElement = (element, entry, instance) => {
  if (entry == null ? void 0 : entry.borderBoxSize) {
    const box = entry.borderBoxSize[0];
    if (box) {
      const size = Math.round(
        box[instance.options.horizontal ? "inlineSize" : "blockSize"]
      );
      return size;
    }
  }
  return element[instance.options.horizontal ? "offsetWidth" : "offsetHeight"];
};
var scrollWithAdjustments = (offset, {
  adjustments = 0,
  behavior
}, instance) => {
  var _a2, _b;
  (_b = (_a2 = instance.scrollElement) == null ? void 0 : _a2.scrollTo) == null ? void 0 : _b.call(_a2, {
    [instance.options.horizontal ? "left" : "top"]: offset + adjustments,
    behavior
  });
};
var elementScroll = scrollWithAdjustments;
var Virtualizer = class {
  constructor(opts) {
    this.unsubs = [];
    this.scrollElement = null;
    this.targetWindow = null;
    this.isScrolling = false;
    this.scrollState = null;
    this.measurementsCache = [];
    this._flatMeasurements = null;
    this.itemSizeCache = /* @__PURE__ */ new Map();
    this.itemSizeCacheVersion = 0;
    this.laneAssignments = /* @__PURE__ */ new Map();
    this.pendingMin = null;
    this.prevLanes = void 0;
    this.lanesChangedFlag = false;
    this.lanesSettling = false;
    this.pendingScrollAnchor = null;
    this.scrollRect = null;
    this.scrollOffset = null;
    this.scrollDirection = null;
    this.scrollAdjustments = 0;
    this._iosDeferredAdjustment = 0;
    this._iosTouching = false;
    this._iosJustTouchEnded = false;
    this._iosTouchEndTimerId = null;
    this._intendedScrollOffset = null;
    this.elementsCache = /* @__PURE__ */ new Map();
    this.now = () => {
      var _a2, _b, _c;
      return ((_c = (_b = (_a2 = this.targetWindow) == null ? void 0 : _a2.performance) == null ? void 0 : _b.now) == null ? void 0 : _c.call(_b)) ?? Date.now();
    };
    this.observer = /* @__PURE__ */ (() => {
      let _ro = null;
      const get = () => {
        if (_ro) {
          return _ro;
        }
        if (!this.targetWindow || !this.targetWindow.ResizeObserver) {
          return null;
        }
        return _ro = new this.targetWindow.ResizeObserver((entries) => {
          entries.forEach((entry) => {
            const run2 = () => {
              const node = entry.target;
              const index = this.indexFromElement(node);
              if (!node.isConnected) {
                this.observer.unobserve(node);
                for (const [cacheKey, cachedNode] of this.elementsCache) {
                  if (cachedNode === node) {
                    this.elementsCache.delete(cacheKey);
                    break;
                  }
                }
                return;
              }
              if (this.shouldMeasureDuringScroll(index)) {
                this.resizeItem(
                  index,
                  this.options.measureElement(node, entry, this)
                );
              }
            };
            this.options.useAnimationFrameWithResizeObserver ? requestAnimationFrame(run2) : run2();
          });
        });
      };
      return {
        disconnect: () => {
          var _a2;
          (_a2 = get()) == null ? void 0 : _a2.disconnect();
          _ro = null;
        },
        observe: (target) => {
          var _a2;
          return (_a2 = get()) == null ? void 0 : _a2.observe(target, { box: "border-box" });
        },
        unobserve: (target) => {
          var _a2;
          return (_a2 = get()) == null ? void 0 : _a2.unobserve(target);
        }
      };
    })();
    this.range = null;
    this.setOptions = (opts2) => {
      var _a2, _b;
      const merged = {
        debug: false,
        initialOffset: 0,
        overscan: 1,
        paddingStart: 0,
        paddingEnd: 0,
        scrollPaddingStart: 0,
        scrollPaddingEnd: 0,
        horizontal: false,
        getItemKey: defaultKeyExtractor,
        rangeExtractor: defaultRangeExtractor,
        onChange: () => {
        },
        measureElement,
        initialRect: { width: 0, height: 0 },
        scrollMargin: 0,
        gap: 0,
        indexAttribute: "data-index",
        initialMeasurementsCache: [],
        lanes: 1,
        anchorTo: "start",
        followOnAppend: false,
        scrollEndThreshold: 1,
        isScrollingResetDelay: 150,
        enabled: true,
        isRtl: false,
        useScrollendEvent: false,
        useAnimationFrameWithResizeObserver: false,
        laneAssignmentMode: "estimate"
      };
      for (const key in opts2) {
        const v = opts2[key];
        if (v !== void 0) merged[key] = v;
      }
      const prevOptions = this.options;
      let anchor = null;
      let followOnAppend = null;
      if (prevOptions !== void 0 && prevOptions.enabled && merged.enabled && merged.anchorTo === "end" && this.scrollElement !== null) {
        const prevCount = prevOptions.count;
        const nextCount = merged.count;
        const measurements = this.getMeasurements();
        const prevFirstKey = prevCount > 0 ? ((_a2 = measurements[0]) == null ? void 0 : _a2.key) ?? prevOptions.getItemKey(0) : null;
        const prevLastKey = prevCount > 0 ? ((_b = measurements[prevCount - 1]) == null ? void 0 : _b.key) ?? prevOptions.getItemKey(prevCount - 1) : null;
        const didCountChange = nextCount !== prevCount;
        const didEdgeKeysChange = didCountChange || prevCount > 0 && nextCount > 0 && (merged.getItemKey(0) !== prevFirstKey || merged.getItemKey(nextCount - 1) !== prevLastKey);
        if (didEdgeKeysChange) {
          const item = prevCount > 0 ? this.getVirtualItemForOffset(this.getScrollOffset()) ?? measurements[0] : null;
          if (item) {
            anchor = [item.key, this.getScrollOffset() - item.start];
          }
          const behavior = merged.followOnAppend === true ? "auto" : merged.followOnAppend || null;
          if (behavior && nextCount > prevCount && this.isAtEnd(prevOptions.scrollEndThreshold) && (prevCount === 0 || merged.getItemKey(nextCount - 1) !== prevLastKey)) {
            followOnAppend = behavior;
          }
        }
      }
      this.options = merged;
      if (anchor || followOnAppend) {
        this.pendingScrollAnchor = [
          (anchor == null ? void 0 : anchor[0]) ?? null,
          (anchor == null ? void 0 : anchor[1]) ?? 0,
          followOnAppend
        ];
      }
    };
    this.notify = (sync) => {
      var _a2, _b;
      (_b = (_a2 = this.options).onChange) == null ? void 0 : _b.call(_a2, this, sync);
    };
    this.maybeNotify = memo(
      () => {
        this.calculateRange();
        return [
          this.isScrolling,
          this.range ? this.range.startIndex : null,
          this.range ? this.range.endIndex : null
        ];
      },
      (isScrolling) => {
        this.notify(isScrolling);
      },
      {
        key: "maybeNotify",
        debug: () => this.options.debug,
        initialDeps: [
          this.isScrolling,
          this.range ? this.range.startIndex : null,
          this.range ? this.range.endIndex : null
        ]
      }
    );
    this.cleanup = () => {
      this.unsubs.filter(Boolean).forEach((d) => d());
      this.unsubs = [];
      this.observer.disconnect();
      if (this.rafId != null && this.targetWindow) {
        this.targetWindow.cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      this.scrollState = null;
      this.scrollElement = null;
      this.targetWindow = null;
    };
    this._didMount = () => {
      return () => {
        this.cleanup();
      };
    };
    this._willUpdate = () => {
      var _a2;
      const scrollElement = this.options.enabled ? this.options.getScrollElement() : null;
      if (this.scrollElement !== scrollElement) {
        this.cleanup();
        if (!scrollElement) {
          this.maybeNotify();
          return;
        }
        this.scrollElement = scrollElement;
        if (this.scrollElement && "ownerDocument" in this.scrollElement) {
          this.targetWindow = this.scrollElement.ownerDocument.defaultView;
        } else {
          this.targetWindow = ((_a2 = this.scrollElement) == null ? void 0 : _a2.window) ?? null;
        }
        this.elementsCache.forEach((cached) => {
          this.observer.observe(cached);
        });
        this.unsubs.push(
          this.options.observeElementRect(this, (rect) => {
            this.scrollRect = rect;
            this.maybeNotify();
          })
        );
        this.unsubs.push(
          this.options.observeElementOffset(this, (offset, isScrolling) => {
            if (this._intendedScrollOffset !== null && Math.abs(offset - this._intendedScrollOffset) < 1.5) {
              offset = this._intendedScrollOffset;
            }
            this._intendedScrollOffset = null;
            this.scrollAdjustments = 0;
            this.scrollDirection = isScrolling ? this.getScrollOffset() < offset ? "forward" : "backward" : null;
            this.scrollOffset = offset;
            this.isScrolling = isScrolling;
            this._flushIosDeferredIfReady();
            if (this.scrollState) {
              this.scheduleScrollReconcile();
            }
            this.maybeNotify();
          })
        );
        if ("addEventListener" in this.scrollElement) {
          const scrollEl = this.scrollElement;
          const onTouchStart = () => {
            this._iosTouching = true;
            this._iosJustTouchEnded = false;
            if (this._iosTouchEndTimerId !== null && this.targetWindow != null) {
              this.targetWindow.clearTimeout(this._iosTouchEndTimerId);
              this._iosTouchEndTimerId = null;
            }
          };
          const onTouchEnd = () => {
            this._iosTouching = false;
            if (!isIOSWebKit() || this.targetWindow == null) {
              return;
            }
            this._iosJustTouchEnded = true;
            this._iosTouchEndTimerId = this.targetWindow.setTimeout(() => {
              this._iosJustTouchEnded = false;
              this._iosTouchEndTimerId = null;
              this._flushIosDeferredIfReady();
            }, 150);
          };
          scrollEl.addEventListener(
            "touchstart",
            onTouchStart,
            addEventListenerOptions
          );
          scrollEl.addEventListener(
            "touchend",
            onTouchEnd,
            addEventListenerOptions
          );
          this.unsubs.push(() => {
            scrollEl.removeEventListener("touchstart", onTouchStart);
            scrollEl.removeEventListener("touchend", onTouchEnd);
            if (this._iosTouchEndTimerId !== null && this.targetWindow != null) {
              this.targetWindow.clearTimeout(this._iosTouchEndTimerId);
              this._iosTouchEndTimerId = null;
            }
          });
        }
        this._scrollToOffset(this.getScrollOffset(), {
          adjustments: void 0,
          behavior: void 0
        });
      }
      const anchor = this.pendingScrollAnchor;
      this.pendingScrollAnchor = null;
      if (anchor && this.scrollElement && this.options.enabled) {
        const [key, offset, followOnAppend] = anchor;
        if (key !== null) {
          const { count, getItemKey } = this.options;
          let index = 0;
          while (index < count && getItemKey(index) !== key) {
            index++;
          }
          const item = index < count ? this.getMeasurements()[index] : void 0;
          if (item) {
            const delta = item.start + offset - this.getScrollOffset();
            if (!approxEqual(delta, 0)) {
              this.applyScrollAdjustment(delta);
            }
          }
        }
        if (followOnAppend) {
          this.scrollToEnd({ behavior: followOnAppend });
        }
      }
    };
    this._flushIosDeferredIfReady = () => {
      if (this._iosDeferredAdjustment === 0) return;
      if (this.isScrolling) return;
      if (this._iosTouching) return;
      if (this._iosJustTouchEnded) return;
      const cur = this.getScrollOffset();
      const max = this.getMaxScrollOffset();
      if (cur < 0 || cur > max) return;
      const delta = this._iosDeferredAdjustment;
      this._iosDeferredAdjustment = 0;
      this._scrollToOffset(cur, {
        adjustments: this.scrollAdjustments += delta,
        behavior: void 0
      });
    };
    this.rafId = null;
    this.getSize = () => {
      if (!this.options.enabled) {
        this.scrollRect = null;
        return 0;
      }
      this.scrollRect = this.scrollRect ?? this.options.initialRect;
      return this.scrollRect[this.options.horizontal ? "width" : "height"];
    };
    this.getScrollOffset = () => {
      if (!this.options.enabled) {
        this.scrollOffset = null;
        return 0;
      }
      this.scrollOffset = this.scrollOffset ?? (typeof this.options.initialOffset === "function" ? this.options.initialOffset() : this.options.initialOffset);
      return this.scrollOffset;
    };
    this.getFurthestMeasurement = (measurements, index) => {
      const furthestMeasurementsFound = /* @__PURE__ */ new Map();
      const furthestMeasurements = /* @__PURE__ */ new Map();
      for (let m = index - 1; m >= 0; m--) {
        const measurement = measurements[m];
        if (furthestMeasurementsFound.has(measurement.lane)) {
          continue;
        }
        const previousFurthestMeasurement = furthestMeasurements.get(
          measurement.lane
        );
        if (previousFurthestMeasurement == null || measurement.end > previousFurthestMeasurement.end) {
          furthestMeasurements.set(measurement.lane, measurement);
        } else if (measurement.end < previousFurthestMeasurement.end) {
          furthestMeasurementsFound.set(measurement.lane, true);
        }
        if (furthestMeasurementsFound.size === this.options.lanes) {
          break;
        }
      }
      return furthestMeasurements.size === this.options.lanes ? Array.from(furthestMeasurements.values()).sort((a, b) => {
        if (a.end === b.end) {
          return a.index - b.index;
        }
        return a.end - b.end;
      })[0] : void 0;
    };
    this.getMeasurementOptions = memo(
      () => [
        this.options.count,
        this.options.paddingStart,
        this.options.scrollMargin,
        this.options.getItemKey,
        this.options.enabled,
        this.options.lanes,
        this.options.laneAssignmentMode
      ],
      (count, paddingStart, scrollMargin, getItemKey, enabled, lanes, laneAssignmentMode) => {
        const lanesChanged = this.prevLanes !== void 0 && this.prevLanes !== lanes;
        if (lanesChanged) {
          this.lanesChangedFlag = true;
        }
        this.prevLanes = lanes;
        this.pendingMin = null;
        return {
          count,
          paddingStart,
          scrollMargin,
          getItemKey,
          enabled,
          lanes,
          laneAssignmentMode
        };
      },
      {
        key: false
      }
    );
    this.getMeasurements = memo(
      () => [this.getMeasurementOptions(), this.itemSizeCacheVersion],
      ({
        count,
        paddingStart,
        scrollMargin,
        getItemKey,
        enabled,
        lanes,
        laneAssignmentMode
      }, _itemSizeCacheVersion) => {
        const itemSizeCache = this.itemSizeCache;
        if (!enabled) {
          this.measurementsCache = [];
          this.itemSizeCache.clear();
          this.laneAssignments.clear();
          return [];
        }
        if (this.laneAssignments.size > count) {
          for (const index of this.laneAssignments.keys()) {
            if (index >= count) {
              this.laneAssignments.delete(index);
            }
          }
        }
        if (this.lanesChangedFlag) {
          this.lanesChangedFlag = false;
          this.lanesSettling = true;
          this.measurementsCache = [];
          this.itemSizeCache.clear();
          this.laneAssignments.clear();
          this.pendingMin = null;
        }
        if (this.measurementsCache.length === 0 && !this.lanesSettling) {
          this.measurementsCache = this.options.initialMeasurementsCache;
          this.measurementsCache.forEach((item) => {
            this.itemSizeCache.set(item.key, item.size);
          });
        }
        const min = this.lanesSettling ? 0 : this.pendingMin ?? 0;
        this.pendingMin = null;
        if (this.lanesSettling && this.measurementsCache.length === count) {
          this.lanesSettling = false;
        }
        if (lanes === 1) {
          const gap = this.options.gap;
          const need = count * 2;
          let flat = this._flatMeasurements;
          if (!flat || flat.length < need) {
            const next = new Float64Array(need);
            if (flat && min > 0) next.set(flat.subarray(0, min * 2));
            flat = next;
            this._flatMeasurements = flat;
          }
          let runningStart;
          if (min === 0) {
            runningStart = paddingStart + scrollMargin;
          } else {
            const prevIdx = min - 1;
            runningStart = flat[prevIdx * 2] + flat[prevIdx * 2 + 1] + gap;
          }
          for (let i = min; i < count; i++) {
            const key = getItemKey(i);
            const measuredSize = itemSizeCache.get(key);
            const size = typeof measuredSize === "number" ? measuredSize : this.options.estimateSize(i);
            flat[i * 2] = runningStart;
            flat[i * 2 + 1] = size;
            runningStart += size + gap;
          }
          const view = createLazyMeasurementsView(count, flat, getItemKey);
          this.measurementsCache = view;
          return view;
        }
        const measurements = this.measurementsCache.slice(0, min);
        const laneLastIndex = new Array(lanes).fill(
          void 0
        );
        for (let m = 0; m < min; m++) {
          const item = measurements[m];
          if (item) {
            laneLastIndex[item.lane] = m;
          }
        }
        for (let i = min; i < count; i++) {
          const key = getItemKey(i);
          const cachedLane = this.laneAssignments.get(i);
          let lane;
          let start;
          const shouldCacheLane = laneAssignmentMode === "estimate" || itemSizeCache.has(key);
          if (cachedLane !== void 0 && this.options.lanes > 1) {
            lane = cachedLane;
            const prevIndex = laneLastIndex[lane];
            const prevInLane = prevIndex !== void 0 ? measurements[prevIndex] : void 0;
            start = prevInLane ? prevInLane.end + this.options.gap : paddingStart + scrollMargin;
          } else {
            const furthestMeasurement = this.options.lanes === 1 ? measurements[i - 1] : this.getFurthestMeasurement(measurements, i);
            start = furthestMeasurement ? furthestMeasurement.end + this.options.gap : paddingStart + scrollMargin;
            lane = furthestMeasurement ? furthestMeasurement.lane : i % this.options.lanes;
            if (this.options.lanes > 1 && shouldCacheLane) {
              this.laneAssignments.set(i, lane);
            }
          }
          const measuredSize = itemSizeCache.get(key);
          const size = typeof measuredSize === "number" ? measuredSize : this.options.estimateSize(i);
          const end = start + size;
          measurements[i] = {
            index: i,
            start,
            size,
            end,
            key,
            lane
          };
          laneLastIndex[lane] = i;
        }
        this.measurementsCache = measurements;
        return measurements;
      },
      {
        key: "getMeasurements",
        debug: () => this.options.debug
      }
    );
    this.calculateRange = memo(
      () => [
        this.getMeasurements(),
        this.getSize(),
        this.getScrollOffset(),
        this.options.lanes
      ],
      (measurements, outerSize, scrollOffset, lanes) => {
        return this.range = measurements.length > 0 && outerSize > 0 ? calculateRange({
          measurements,
          outerSize,
          scrollOffset,
          lanes,
          // Pass the typed array so binary search + forward-walk can
          // read start/end directly from Float64Array, skipping the
          // Proxy traps that materialize a full VirtualItem per probe.
          flat: lanes === 1 && this._flatMeasurements != null ? this._flatMeasurements : null
        }) : null;
      },
      {
        key: "calculateRange",
        debug: () => this.options.debug
      }
    );
    this.getVirtualIndexes = memo(
      () => {
        let startIndex = null;
        let endIndex = null;
        const range = this.calculateRange();
        if (range) {
          startIndex = range.startIndex;
          endIndex = range.endIndex;
        }
        this.maybeNotify.updateDeps([this.isScrolling, startIndex, endIndex]);
        return [
          this.options.rangeExtractor,
          this.options.overscan,
          this.options.count,
          startIndex,
          endIndex
        ];
      },
      (rangeExtractor, overscan, count, startIndex, endIndex) => {
        return startIndex === null || endIndex === null ? [] : rangeExtractor({
          startIndex,
          endIndex,
          overscan,
          count
        });
      },
      {
        key: "getVirtualIndexes",
        debug: () => this.options.debug
      }
    );
    this.indexFromElement = (node) => {
      const attributeName = this.options.indexAttribute;
      const indexStr = node.getAttribute(attributeName);
      if (!indexStr) {
        console.warn(
          `Missing attribute name '${attributeName}={index}' on measured element.`
        );
        return -1;
      }
      return parseInt(indexStr, 10);
    };
    this.shouldMeasureDuringScroll = (index) => {
      var _a2;
      if (!this.scrollState || this.scrollState.behavior !== "smooth") {
        return true;
      }
      const scrollIndex = this.scrollState.index ?? ((_a2 = this.getVirtualItemForOffset(this.scrollState.lastTargetOffset)) == null ? void 0 : _a2.index);
      if (scrollIndex !== void 0 && this.range) {
        const bufferSize = Math.max(
          this.options.overscan,
          Math.ceil((this.range.endIndex - this.range.startIndex) / 2)
        );
        const minIndex = Math.max(0, scrollIndex - bufferSize);
        const maxIndex = Math.min(
          this.options.count - 1,
          scrollIndex + bufferSize
        );
        return index >= minIndex && index <= maxIndex;
      }
      return true;
    };
    this.measureElement = (node) => {
      if (!node) {
        this.elementsCache.forEach((cached, key2) => {
          if (!cached.isConnected) {
            this.observer.unobserve(cached);
            this.elementsCache.delete(key2);
          }
        });
        return;
      }
      const index = this.indexFromElement(node);
      const key = this.options.getItemKey(index);
      const prevNode = this.elementsCache.get(key);
      if (prevNode !== node) {
        if (prevNode) {
          this.observer.unobserve(prevNode);
        }
        this.observer.observe(node);
        this.elementsCache.set(key, node);
      }
      if ((!this.isScrolling || this.scrollState) && this.shouldMeasureDuringScroll(index)) {
        this.resizeItem(index, this.options.measureElement(node, void 0, this));
      }
    };
    this.resizeItem = (index, size) => {
      var _a2, _b;
      if (index < 0 || index >= this.options.count) return;
      let cachedSize;
      let itemStart;
      let key;
      const flat = this._flatMeasurements;
      if (this.options.lanes === 1 && flat !== null) {
        key = this.options.getItemKey(index);
        itemStart = flat[index * 2];
        cachedSize = flat[index * 2 + 1];
      } else {
        const item = this.measurementsCache[index];
        if (!item) return;
        key = item.key;
        itemStart = item.start;
        cachedSize = item.size;
      }
      const itemSize = this.itemSizeCache.get(key) ?? cachedSize;
      const delta = size - itemSize;
      if (delta !== 0) {
        const wasAtEnd = this.options.anchorTo === "end" && ((_a2 = this.scrollState) == null ? void 0 : _a2.behavior) !== "smooth" && this.getVirtualDistanceFromEnd() <= this.options.scrollEndThreshold;
        const prevTotalSize = wasAtEnd ? this.getTotalSize() : 0;
        const shouldAdjustScroll = ((_b = this.scrollState) == null ? void 0 : _b.behavior) !== "smooth" && (this.shouldAdjustScrollPositionOnItemSizeChange !== void 0 ? this.shouldAdjustScrollPositionOnItemSizeChange(
          // The callback expects a VirtualItem; build one lazily only
          // when the consumer actually supplied a custom predicate.
          this.measurementsCache[index] ?? {
            index,
            key,
            start: itemStart,
            size: cachedSize,
            end: itemStart + cachedSize,
            lane: 0
          },
          delta,
          this
        ) : (
          // Default: adjust scrollTop only when the resize is an above-
          // viewport item AND we're not actively scrolling backward.
          // Adjusting during backward scroll fights the user's scroll
          // direction and produces the "items jump while scrolling up"
          // jank reported across many issues. Users who want the old
          // behavior can pass shouldAdjustScrollPositionOnItemSizeChange.
          itemStart < this.getScrollOffset() + this.scrollAdjustments && this.scrollDirection !== "backward"
        ));
        if (this.pendingMin === null || index < this.pendingMin) {
          this.pendingMin = index;
        }
        this.itemSizeCache.set(key, size);
        this.itemSizeCacheVersion++;
        if (wasAtEnd) {
          this.applyScrollAdjustment(this.getTotalSize() - prevTotalSize);
        } else if (shouldAdjustScroll) {
          this.applyScrollAdjustment(delta);
        }
        this.notify(false);
      }
    };
    this.getVirtualItems = memo(
      () => [this.getVirtualIndexes(), this.getMeasurements()],
      (indexes, measurements) => {
        const virtualItems = [];
        for (let k = 0, len = indexes.length; k < len; k++) {
          const i = indexes[k];
          const measurement = measurements[i];
          virtualItems.push(measurement);
        }
        return virtualItems;
      },
      {
        key: "getVirtualItems",
        debug: () => this.options.debug
      }
    );
    this.getVirtualItemForOffset = (offset) => {
      const measurements = this.getMeasurements();
      if (measurements.length === 0) {
        return void 0;
      }
      const flat = this._flatMeasurements;
      const useFlat = this.options.lanes === 1 && flat != null;
      const idx = findNearestBinarySearch(
        0,
        measurements.length - 1,
        useFlat ? (i) => flat[i * 2] : (i) => notUndefined(measurements[i]).start,
        offset
      );
      return notUndefined(measurements[idx]);
    };
    this.getMaxScrollOffset = () => {
      if (!this.scrollElement) return 0;
      if ("scrollHeight" in this.scrollElement) {
        return this.options.horizontal ? this.scrollElement.scrollWidth - this.scrollElement.clientWidth : this.scrollElement.scrollHeight - this.scrollElement.clientHeight;
      } else {
        const doc = this.scrollElement.document.documentElement;
        return this.options.horizontal ? doc.scrollWidth - this.scrollElement.innerWidth : doc.scrollHeight - this.scrollElement.innerHeight;
      }
    };
    this.getVirtualDistanceFromEnd = () => {
      return Math.max(
        this.getTotalSize() - this.getSize() - this.getScrollOffset(),
        0
      );
    };
    this.getDistanceFromEnd = () => {
      return Math.max(this.getMaxScrollOffset() - this.getScrollOffset(), 0);
    };
    this.isAtEnd = (threshold = this.options.scrollEndThreshold) => {
      return this.getDistanceFromEnd() <= threshold;
    };
    this.getOffsetForAlignment = (toOffset, align, itemSize = 0) => {
      if (!this.scrollElement) return 0;
      const size = this.getSize();
      const scrollOffset = this.getScrollOffset();
      if (align === "auto") {
        align = toOffset >= scrollOffset + size ? "end" : "start";
      }
      if (align === "center") {
        toOffset += (itemSize - size) / 2;
      } else if (align === "end") {
        toOffset -= size;
      }
      const maxOffset = this.getMaxScrollOffset();
      return Math.max(Math.min(maxOffset, toOffset), 0);
    };
    this.getOffsetForIndex = (index, align = "auto") => {
      index = Math.max(0, Math.min(index, this.options.count - 1));
      const size = this.getSize();
      const scrollOffset = this.getScrollOffset();
      const item = this.measurementsCache[index];
      if (!item) return;
      if (align === "auto") {
        if (item.end >= scrollOffset + size - this.options.scrollPaddingEnd) {
          align = "end";
        } else if (item.start <= scrollOffset + this.options.scrollPaddingStart) {
          align = "start";
        } else {
          return [scrollOffset, align];
        }
      }
      if (align === "end" && index === this.options.count - 1) {
        return [this.getMaxScrollOffset(), align];
      }
      const toOffset = align === "end" ? item.end + this.options.scrollPaddingEnd : item.start - this.options.scrollPaddingStart;
      return [
        this.getOffsetForAlignment(toOffset, align, item.size),
        align
      ];
    };
    this.scrollToOffset = (toOffset, { align = "start", behavior = "auto" } = {}) => {
      const offset = this.getOffsetForAlignment(toOffset, align);
      const now2 = this.now();
      this.scrollState = {
        index: null,
        align,
        behavior,
        startedAt: now2,
        lastTargetOffset: offset,
        stableFrames: 0
      };
      this._scrollToOffset(offset, { adjustments: void 0, behavior });
      this.scheduleScrollReconcile();
    };
    this.scrollToIndex = (index, {
      align: initialAlign = "auto",
      behavior = "auto"
    } = {}) => {
      index = Math.max(0, Math.min(index, this.options.count - 1));
      const offsetInfo = this.getOffsetForIndex(index, initialAlign);
      if (!offsetInfo) {
        return;
      }
      const [offset, align] = offsetInfo;
      const now2 = this.now();
      this.scrollState = {
        index,
        align,
        behavior,
        startedAt: now2,
        lastTargetOffset: offset,
        stableFrames: 0
      };
      this._scrollToOffset(offset, { adjustments: void 0, behavior });
      this.scheduleScrollReconcile();
    };
    this.scrollBy = (delta, { behavior = "auto" } = {}) => {
      const offset = this.getScrollOffset() + delta;
      const now2 = this.now();
      this.scrollState = {
        index: null,
        align: "start",
        behavior,
        startedAt: now2,
        lastTargetOffset: offset,
        stableFrames: 0
      };
      this._scrollToOffset(offset, { adjustments: void 0, behavior });
      this.scheduleScrollReconcile();
    };
    this.scrollToEnd = ({ behavior = "auto" } = {}) => {
      if (this.options.count > 0) {
        this.scrollToIndex(this.options.count - 1, {
          align: "end",
          behavior
        });
        return;
      }
      this.scrollToOffset(Math.max(this.getTotalSize() - this.getSize(), 0), {
        behavior
      });
    };
    this.getTotalSize = () => {
      var _a2;
      const measurements = this.getMeasurements();
      let end;
      if (measurements.length === 0) {
        end = this.options.paddingStart;
      } else if (this.options.lanes === 1) {
        const lastIdx = measurements.length - 1;
        const flat = this._flatMeasurements;
        if (flat != null) {
          end = flat[lastIdx * 2] + flat[lastIdx * 2 + 1];
        } else {
          end = ((_a2 = measurements[lastIdx]) == null ? void 0 : _a2.end) ?? 0;
        }
      } else {
        const endByLane = Array(this.options.lanes).fill(null);
        let endIndex = measurements.length - 1;
        while (endIndex >= 0 && endByLane.some((val) => val === null)) {
          const item = measurements[endIndex];
          if (endByLane[item.lane] === null) {
            endByLane[item.lane] = item.end;
          }
          endIndex--;
        }
        end = Math.max(...endByLane.filter((val) => val !== null));
      }
      return Math.max(
        end - this.options.scrollMargin + this.options.paddingEnd,
        0
      );
    };
    this.takeSnapshot = () => {
      const snapshot = [];
      if (this.itemSizeCache.size === 0) return snapshot;
      const m = this.getMeasurements();
      for (const item of m) {
        if (item && this.itemSizeCache.has(item.key)) {
          snapshot.push({
            index: item.index,
            key: item.key,
            start: item.start,
            size: item.size,
            end: item.end,
            lane: item.lane
          });
        }
      }
      return snapshot;
    };
    this._scrollToOffset = (offset, {
      adjustments,
      behavior
    }) => {
      this._intendedScrollOffset = offset + (adjustments ?? 0);
      this.options.scrollToFn(offset, { behavior, adjustments }, this);
    };
    this.measure = () => {
      this.pendingMin = null;
      this.itemSizeCache.clear();
      this.laneAssignments.clear();
      this.itemSizeCacheVersion++;
      this.notify(false);
    };
    this.setOptions(opts);
  }
  applyScrollAdjustment(delta, behavior) {
    if (delta === 0) return;
    if (this.options.debug) {
      console.info("correction", delta);
    }
    if (isIOSWebKit() && (this.isScrolling || this._iosTouching || this._iosJustTouchEnded)) {
      this._iosDeferredAdjustment += delta;
    } else {
      this._scrollToOffset(this.getScrollOffset(), {
        adjustments: this.scrollAdjustments += delta,
        behavior
      });
    }
  }
  scheduleScrollReconcile() {
    if (!this.targetWindow) {
      this.scrollState = null;
      return;
    }
    if (this.rafId != null) return;
    this.rafId = this.targetWindow.requestAnimationFrame(() => {
      this.rafId = null;
      this.reconcileScroll();
    });
  }
  reconcileScroll() {
    if (!this.scrollState) return;
    const el = this.scrollElement;
    if (!el) return;
    const MAX_RECONCILE_MS = 5e3;
    if (this.now() - this.scrollState.startedAt > MAX_RECONCILE_MS) {
      this.scrollState = null;
      return;
    }
    const offsetInfo = this.scrollState.index != null ? this.getOffsetForIndex(this.scrollState.index, this.scrollState.align) : void 0;
    const targetOffset = offsetInfo ? offsetInfo[0] : this.scrollState.lastTargetOffset;
    const STABLE_FRAMES = 1;
    const targetChanged = targetOffset !== this.scrollState.lastTargetOffset;
    if (!targetChanged && approxEqual(targetOffset, this.getScrollOffset())) {
      this.scrollState.stableFrames++;
      if (this.scrollState.stableFrames >= STABLE_FRAMES) {
        if (this.getScrollOffset() !== targetOffset) {
          this._scrollToOffset(targetOffset, {
            adjustments: void 0,
            behavior: "auto"
          });
        }
        this.scrollState = null;
        return;
      }
    } else {
      this.scrollState.stableFrames = 0;
      if (targetChanged) {
        const viewport = this.getSize() || 600;
        const distance = Math.abs(targetOffset - this.getScrollOffset());
        const keepSmooth = this.scrollState.behavior === "smooth" && distance > viewport;
        this.scrollState.lastTargetOffset = targetOffset;
        if (!keepSmooth) {
          this.scrollState.behavior = "auto";
        }
        this._scrollToOffset(targetOffset, {
          adjustments: void 0,
          behavior: keepSmooth ? "smooth" : "auto"
        });
      }
    }
    this.scheduleScrollReconcile();
  }
};
var findNearestBinarySearch = (low, high, getCurrentValue, value) => {
  while (low <= high) {
    const middle = (low + high) / 2 | 0;
    const currentValue = getCurrentValue(middle);
    if (currentValue < value) {
      low = middle + 1;
    } else if (currentValue > value) {
      high = middle - 1;
    } else {
      return middle;
    }
  }
  if (low > 0) {
    return low - 1;
  } else {
    return 0;
  }
};
function calculateRange({
  measurements,
  outerSize,
  scrollOffset,
  lanes,
  flat
}) {
  const lastIndex = measurements.length - 1;
  const getStart = flat ? (index) => flat[index * 2] : (index) => measurements[index].start;
  const getEnd = flat ? (index) => flat[index * 2] + flat[index * 2 + 1] : (index) => measurements[index].end;
  if (measurements.length <= lanes) {
    return {
      startIndex: 0,
      endIndex: lastIndex
    };
  }
  let startIndex = findNearestBinarySearch(0, lastIndex, getStart, scrollOffset);
  let endIndex = startIndex;
  if (lanes === 1) {
    while (endIndex < lastIndex && getEnd(endIndex) < scrollOffset + outerSize) {
      endIndex++;
    }
  } else if (lanes > 1) {
    const endPerLane = Array(lanes).fill(0);
    while (endIndex < lastIndex && endPerLane.some((pos) => pos < scrollOffset + outerSize)) {
      const item = measurements[endIndex];
      endPerLane[item.lane] = item.end;
      endIndex++;
    }
    const startPerLane = Array(lanes).fill(scrollOffset + outerSize);
    while (startIndex >= 0 && startPerLane.some((pos) => pos >= scrollOffset)) {
      const item = measurements[startIndex];
      startPerLane[item.lane] = item.start;
      startIndex--;
    }
    startIndex = Math.max(0, startIndex - startIndex % lanes);
    endIndex = Math.min(lastIndex, endIndex + (lanes - 1 - endIndex % lanes));
  }
  return { startIndex, endIndex };
}

// wallpaper/vendor/spicy-lyrics/src/modules/Spring.ts
var SLEEP_OFFSET_SQ_LIMIT = (1 / 3840) ** 2;
var SLEEP_VELOCITY_SQ_LIMIT = 0.01 ** 2;
var EPS = 1e-5;
var pi2 = Math.PI;
var exp = Math.exp;
var sin = Math.sin;
var cos = Math.cos;
var sqrt = Math.sqrt;
var Spring = class {
  d;
  f;
  g;
  p;
  v;
  constructor(startPosition, frequency, dampingRatio, goal) {
    this.d = dampingRatio;
    this.f = frequency;
    this.g = goal ?? startPosition;
    this.p = startPosition;
    this.v = 0;
  }
  Step(dt) {
    const d = this.d;
    const f = this.f * (2 * pi2);
    const g = this.g;
    let p = this.p;
    let v = this.v;
    if (d === 1) {
      const q = exp(-f * dt);
      const w = dt * q;
      const c0 = q + w * f;
      const c2 = q - w * f;
      const c3 = w * f * f;
      const o = p - g;
      p = o * c0 + v * w + g;
      v = v * c2 - o * c3;
    } else if (d < 1) {
      const q = exp(-d * f * dt);
      const c = sqrt(1 - d * d);
      const i = cos(dt * f * c);
      const j = sin(dt * f * c);
      let z;
      if (c > EPS) {
        z = j / c;
      } else {
        const a = dt * f;
        z = a + (a * a * (c * c) * (c * c) / 20 - c * c) * (a * a * a) / 6;
      }
      let y;
      if (f * c > EPS) {
        y = j / (f * c);
      } else {
        const b = f * c;
        y = dt + (dt * dt * (b * b) * (b * b) / 20 - b * b) * (dt * dt * dt) / 6;
      }
      const o = p - g;
      p = (o * (i + z * d) + v * y) * q + g;
      v = (v * (i - z * d) - o * (z * f)) * q;
    } else {
      const c = sqrt(d * d - 1);
      const r1 = -f * (d + c);
      const r2 = -f * (d - c);
      const ec1 = exp(r1 * dt);
      const ec2 = exp(r2 * dt);
      const o = p - g;
      const co2 = (v - o * r1) / (2 * f * c);
      const co1 = ec1 * (o - co2);
      p = co1 + co2 * ec2 + g;
      v = co1 * r1 + co2 * ec2 * r2;
    }
    this.p = p;
    this.v = v;
    return p;
  }
  CanSleep() {
    if (this.v * this.v > SLEEP_VELOCITY_SQ_LIMIT) return false;
    const offset = this.p - this.g;
    if (offset * offset > SLEEP_OFFSET_SQ_LIMIT) return false;
    return true;
  }
  GetGoal() {
    return this.g;
  }
  SetGoal(goal, replacePosition) {
    this.g = goal;
    if (replacePosition) {
      this.p = goal;
      this.v = 0;
    }
  }
  SetDampingRatio(dampingRatio) {
    this.d = dampingRatio;
  }
  SetFrequency(frequency) {
    this.f = frequency;
  }
};

// wallpaper/vendor/spicy-lyrics/src/utils/Lyrics/LyricsVirtualizer.ts
var GAP_NORMAL = 1;
var GAP_LINE_TO_BG = 0.2;
var ESTIMATE = {
  // Inactive musical-lines have line-height: 0 → measured height ~0.
  "musical-line": 0,
  // bg-lines are smaller than regular lines (no lead vocal padding).
  "bg-line": 50,
  // Single-line actual height is ~66px.
  default: 66
};
var virtualizerLogger = new ui_default("Lyrics Virtualizer");
var SMOOTH_SCROLL_FREQUENCY = 1;
var SMOOTH_SCROLL_DAMPING = 1;
var SMOOTH_SCROLL_SETTLE_PX = 0.25;
var SMOOTH_SCROLL_SETTLE_SPEED = 0.05;
var SMOOTH_SCROLL_MAX_STEP = 0.05;
var SMOOTH_SCROLL_MAX_ELAPSED = 0.1;
var SMOOTH_SCROLL_MAX_RECONCILES = 3;
var LAYOUT_GLIDE_TRANSITION = "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)";
var LAYOUT_GLIDE_BLOCK_INIT_MS = 1500;
var LAYOUT_GLIDE_BLOCK_MS = 800;
var LyricsVirtualizer = class _LyricsVirtualizer {
  _virtualizer = null;
  _allElements = [];
  _indexByElement = /* @__PURE__ */ new Map();
  // One positioning wrapper per line element. The wrapper gets position:absolute +
  // translateY from the virtualizer; the .line lives inside it so a CSS `scale` on
  // .line acts around its own center instead of composing with translateY through
  // transform-origin (which would shift elements down proportionally to translateY).
  _wrappers = [];
  _mountedIndices = /* @__PURE__ */ new Set();
  _virtualContainer = null;
  _scrollEl = null;
  // Invoked when a new element is mounted. Used by the animator to invalidate its
  // active-line blur cache so newly visible elements get the correct --BlurAmount
  // next frame instead of a stale value from a run that skipped them while disconnected.
  _onNewElementMounted = null;
  // Shared ResizeObserver — fires after every layout recalc for observed elements.
  _resizeObserver = null;
  // Timer for the scroll-settle remeasure pass (fallback for browsers without scrollend).
  _scrollEndTimer = null;
  _resizeDebounceTimer = null;
  // RAF handle used to coalesce multiple ResizeObserver entries into one _willUpdate()
  // call per frame.
  _resizeRAF = null;
  // Last observed clientWidth of the scroll element.
  _containerWidth = 0;
  // Last observed clientHeight of the scroll element. Lets the watchdog and the
  // width observer detect height-only resizes (which change the visible window
  // and the bottom spacer, but not individual item heights).
  _containerHeight = 0;
  // ResizeObserver dedicated to tracking clientWidth changes on the scroll element.
  _widthObserver = null;
  // MutationObserver that watches class attribute changes on musical-line elements.
  _classObserver = null;
  // Permanent spacer appended after the virtual container so the last item can
  // always be scrolled to center without temporarily inflating container height.
  _spacer = null;
  _maid = null;
  _lastVirtualWindowSignature = "";
  // Pending verification rAF for scrollToIndex. Programmatic scroll targets a
  // position from measurementsCache, but unmounted items only have _estimateSize,
  // so the first scroll after init (e.g. mid-song open) lands on a stale, clamped
  // position. We retry one frame after every scroll so the updated cache can
  // re-compute the target until it stabilises.
  _scrollVerifyRAF = null;
  // Walk far targets (mid-song open) until the line is actually mounted; bounded so a
  // pathological case can't loop forever (~0.5s at 60fps).
  static _MAX_SCROLL_RETRIES = 30;
  // True while a programmatic scrollToIndex is converging. During this window we
  // disable TanStack's own scroll-position adjustment (see _shouldAdjustScroll) so we are
  // the sole writer of scrollTop and the retry chain's "external scroll" abort only
  // trips on a genuine user scroll.
  _converging = false;
  // Re-entry guard for _onVirtualizerChange. TanStack's resizeItem calls onChange
  // synchronously on a non-zero size delta, so v.measureElement() inside the mount
  // loop can recurse back in; without this guard the outer loop's stale items
  // snapshot would overwrite correct transforms set by the inner call.
  _inOnChange = false;
  _onChangePending = false;
  _changeQueued = false;
  // Smooth-scroll state (see _smoothScrollToIndex). The spring persists across
  // scrolls so its velocity can carry over into the next target.
  _smoothSpring = null;
  // Stepped on the frame-capped loop: every glide frame writes scrollTop and a
  // translate, so at the display's own rate (240 Hz on some setups) the glide
  // alone redrew the whole page every refresh for the second or two it runs.
  _smoothRAF = null;
  _smoothTarget = null;
  _smoothLastTs = null;
  _smoothLastPosition = null;
  // Whole-pixel scrollTop last written; the sub-pixel remainder lives in
  // _smoothFraction and is applied as a translate on the virtual container.
  _smoothLastWhole = null;
  _smoothFraction = 0;
  // Layout the glide needs every frame, read once per retarget rather than per
  // frame — each read here forces a layout on top of the lyrics animator's writes.
  // Null means "stale, re-read next frame" (set on viewport resizes).
  _smoothGeometry = null;
  _smoothReconciles = 0;
  // performance.now() until which row glides stay off. See LAYOUT_GLIDE_BLOCK_MS.
  _layoutGlideBlockedUntil = 0;
  setOnNewElementMounted(cb) {
    this._onNewElementMounted = cb;
  }
  _isNextBgLine(index) {
    const next = this._allElements[index + 1];
    return next != null && next.classList.contains("bg-line");
  }
  _itemGap(index) {
    if (index >= this._allElements.length - 1) return 0;
    const el = this._allElements[index];
    if (el?.classList.contains("musical-line") && !el.classList.contains("Active")) return 0;
    return (this._isNextBgLine(index) ? GAP_LINE_TO_BG : GAP_NORMAL) * (this._containerWidth / 100);
  }
  _estimateSize = (index) => {
    const el = this._allElements[index];
    let h;
    if (!el) h = ESTIMATE.default;
    else if (el.classList.contains("musical-line")) {
      h = el.classList.contains("Active") ? ESTIMATE.default : ESTIMATE["musical-line"];
    } else if (el.classList.contains("bg-line")) h = ESTIMATE["bg-line"];
    else h = ESTIMATE.default;
    return h + this._itemGap(index);
  };
  // offsetHeight is the most reliable measurement: it reflects the true rendered
  // layout height and is unaffected by translateY, scrollTop, or paint clipping.
  _measureHeight(el) {
    return el.offsetHeight;
  }
  _remeasureVisible() {
    const v = this._virtualizer;
    if (!v) return;
    virtualizerLogger.debug("Remeasure pass started", {
      mountedCount: this._mountedIndices.size,
      containerWidth: this._containerWidth
    });
    const toMeasure = [];
    for (const idx of this._mountedIndices) {
      const wrapper = this._wrappers[idx];
      if (!wrapper?.isConnected) continue;
      const gap = this._itemGap(idx);
      const prevPad = parseFloat(wrapper.style.paddingBottom) || 0;
      if (Math.abs(prevPad - gap) >= 0.5) {
        wrapper.style.paddingBottom = `${gap}px`;
      }
      toMeasure.push(wrapper);
    }
    this._measureBatch(v, toMeasure);
    if (toMeasure.length > 0) {
      virtualizerLogger.debug("Remeasure pass updated virtualizer layout");
      v._willUpdate();
    } else {
      virtualizerLogger.debug("Remeasure pass completed with no changes");
    }
  }
  remeasure() {
    this._remeasureVisible();
  }
  // Push the live viewport size into TanStack's cached scrollRect when it has gone
  // stale. TanStack writes scrollRect only from observeElementRect's ResizeObserver,
  // which has no zero-guard: while hidden/occluded (Wayland) it caches a 0×0 rect and
  // does not reliably re-fire on restore, so scrollRect stays {0,0} → getSize() 0 →
  // calculateRange() null → the whole list unmounts and never comes back until a manual
  // scroll. Nothing else repairs this, so we write the real size here; offsetWidth/Height
  // matches TanStack's getRect() basis so we don't thrash its RO. Returns true on change.
  _syncScrollRect() {
    const v = this._virtualizer;
    const el = this._scrollEl;
    if (!v || !el || document.hidden) return false;
    const w = Math.round(el.offsetWidth);
    const h = Math.round(el.offsetHeight);
    if (w === 0 || h === 0) return false;
    const r = v.scrollRect;
    if (!r || Math.abs(r.width - w) >= 1 || Math.abs(r.height - h) >= 1) {
      v.scrollRect = { width: w, height: h };
      if (v.scrollOffset == null || Math.abs(v.scrollOffset - el.scrollTop) >= 1) {
        v.scrollOffset = el.scrollTop;
      }
      return true;
    }
    return false;
  }
  // Time-based fallback that self-heals layout drift the reactive observers miss.
  // ResizeObserver notifications can be coalesced/dropped/delivered as a transient
  // 0×0 size (Wayland, CPU lag, fast resizes), so the settle callback never lands and
  // the list stays wedged (stale width or measurements) until a scroll fires
  // _remeasureVisible(). This runs on a low-frequency Maid interval, does read-only
  // layout queries, and only runs the same recovery when it finds drift — returning
  // after the first acting branch to keep steady state at one reflow per tick.
  _selfHealCheck = () => {
    const v = this._virtualizer;
    const el = this._scrollEl;
    if (!v || !el) return;
    if (document.hidden) return;
    const clientWidth = el.clientWidth;
    if (clientWidth === 0) return;
    const clientHeight = el.clientHeight;
    if (this._syncScrollRect()) {
      virtualizerLogger.debug("Self-heal: refreshed stale TanStack scrollRect");
      this._onVirtualizerChange(v);
      return;
    }
    if (Math.abs(clientWidth - this._containerWidth) >= 1) {
      virtualizerLogger.debug("Self-heal: width drift detected", {
        previous: this._containerWidth,
        current: clientWidth
      });
      this._containerWidth = clientWidth;
      this._containerHeight = clientHeight;
      this._blockLayoutGlide(LAYOUT_GLIDE_BLOCK_MS);
      this._smoothGeometry = null;
      if (this._spacer) this._spacer.style.height = `${clientHeight / 2}px`;
      this._remeasureVisible();
      v._willUpdate();
      return;
    }
    if (Math.abs(clientHeight - this._containerHeight) >= 1) {
      virtualizerLogger.debug("Self-heal: height drift detected", {
        previous: this._containerHeight,
        current: clientHeight
      });
      this._containerHeight = clientHeight;
      this._smoothGeometry = null;
      if (this._spacer) this._spacer.style.height = `${clientHeight / 2}px`;
      v._willUpdate();
      return;
    }
    for (const idx of this._mountedIndices) {
      const wrapper = this._wrappers[idx];
      if (!wrapper?.isConnected) continue;
      const cached = v.measurementsCache[idx]?.size;
      if (cached === void 0) continue;
      if (Math.abs(wrapper.offsetHeight - cached) >= 1) {
        virtualizerLogger.debug("Self-heal: measurement drift detected", {
          index: idx,
          cached,
          measured: wrapper.offsetHeight
        });
        this._remeasureVisible();
        v._willUpdate();
        return;
      }
    }
  };
  _onScrollEnd = () => {
    if (this._smoothRAF !== null) return;
    if (this._scrollEndTimer !== null) {
      clearTimeout(this._scrollEndTimer);
      this._scrollEndTimer = null;
    }
    this._remeasureVisible();
  };
  _onScrollDebounced = () => {
    if (this._smoothRAF !== null) return;
    if (this._scrollEndTimer !== null) clearTimeout(this._scrollEndTimer);
    this._scrollEndTimer = setTimeout(() => {
      this._scrollEndTimer = null;
      this._remeasureVisible();
    }, 200);
  };
  init(scrollEl, virtualContainer, lineElements) {
    virtualizerLogger.info("Initializing lyrics virtualizer", {
      lineCount: lineElements.length,
      scrollClientHeight: scrollEl.clientHeight,
      scrollClientWidth: scrollEl.clientWidth
    });
    this.destroy();
    this._maid = new Maid();
    this._maid.Give(() => {
      if (this._scrollEndTimer !== null) {
        clearTimeout(this._scrollEndTimer);
        this._scrollEndTimer = null;
      }
      if (this._resizeRAF !== null) {
        cancelAnimationFrame(this._resizeRAF);
        this._resizeRAF = null;
      }
    });
    this._allElements = lineElements;
    this._indexByElement = new Map(lineElements.map((el, i) => [el, i]));
    this._wrappers = new Array(lineElements.length).fill(null);
    this._virtualContainer = virtualContainer;
    this._scrollEl = scrollEl;
    const containerWidth = scrollEl.clientWidth || virtualContainer.clientWidth || 0;
    this._containerWidth = containerWidth;
    this._containerHeight = scrollEl.clientHeight;
    virtualizerLogger.debug("Initial container width resolved", containerWidth);
    this._resizeObserver = this._maid.Give(new ResizeObserver((entries) => {
      const v = this._virtualizer;
      if (!v) return;
      if (this._scrollEl && this._scrollEl.clientWidth === 0) {
        virtualizerLogger.debug("Skipping resize measure: container width is zero");
        return;
      }
      const toMeasure = [];
      for (const entry of entries) {
        const el = entry.target;
        if (!el.isConnected) continue;
        if (el.getAttribute("data-index") === null) continue;
        toMeasure.push(el);
      }
      this._measureBatch(v, toMeasure);
      if (toMeasure.length > 0 && this._resizeRAF === null) {
        this._resizeRAF = requestAnimationFrame(() => {
          this._resizeRAF = null;
          if (this._virtualizer === v) {
            virtualizerLogger.debug("ResizeObserver scheduled virtualizer update");
            v._willUpdate();
          }
        });
      }
    }));
    this._classObserver = this._maid.Give(new MutationObserver((mutations) => {
      const v = this._virtualizer;
      if (!v) return;
      const toMeasure = [];
      for (const mutation of mutations) {
        const el = mutation.target;
        const index = this._indexByElement.get(el);
        if (index === void 0) continue;
        const wrapper = this._wrappers[index];
        if (!wrapper?.isConnected) continue;
        const gap = this._itemGap(index);
        const prev = parseFloat(wrapper.style.paddingBottom) || 0;
        if (Math.abs(gap - prev) >= 0.5) {
          wrapper.style.paddingBottom = `${gap}px`;
          toMeasure.push(wrapper);
        }
      }
      this._measureBatch(v, toMeasure);
      if (toMeasure.length > 0 && this._resizeRAF === null) {
        this._resizeRAF = requestAnimationFrame(() => {
          this._resizeRAF = null;
          if (this._virtualizer === v) {
            virtualizerLogger.debug("Class mutation scheduled virtualizer update");
            v._willUpdate();
          }
        });
      }
    }));
    this._classObserver.observe(virtualContainer, {
      subtree: true,
      attributes: true,
      attributeFilter: ["class"]
    });
    this._virtualizer = new Virtualizer({
      count: lineElements.length,
      getScrollElement: () => scrollEl,
      estimateSize: this._estimateSize,
      overscan: 5,
      gap: 0,
      scrollToFn: elementScroll,
      observeElementRect,
      observeElementOffset,
      onChange: (v) => this._queueChange(v),
      measureElement: this._measureHeight
    });
    this._virtualizer.shouldAdjustScrollPositionOnItemSizeChange = this._shouldAdjustScroll;
    this._maid.Give(
      $smoothScrolling.listen((enabled) => {
        if (!enabled) this._handOffSmoothScroll();
      })
    );
    this._blockLayoutGlide(LAYOUT_GLIDE_BLOCK_INIT_MS);
    scrollEl.scrollTop = 0;
    virtualizerLogger.debug("Scroll position reset to top during init");
    this._virtualizer._willUpdate();
    this._flushQueuedChange(this._virtualizer);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const v = this._virtualizer;
        if (!v || !this._scrollEl) return;
        const settled = this._scrollEl.clientWidth;
        if (settled > 0 && Math.abs(settled - this._containerWidth) >= 1) {
          virtualizerLogger.debug("Post-init width settled to new value", {
            previous: this._containerWidth,
            settled
          });
          this._containerWidth = settled;
          this._remeasureVisible();
        }
        this._syncScrollRect();
        this._onVirtualizerChange(v);
      });
    });
    scrollEl.addEventListener("scrollend", this._onScrollEnd, { passive: true });
    scrollEl.addEventListener("scroll", this._onScrollDebounced, { passive: true });
    this._maid.Give(() => {
      this._scrollEl?.removeEventListener("scrollend", this._onScrollEnd);
      this._scrollEl?.removeEventListener("scroll", this._onScrollDebounced);
    });
    const intentRoot = scrollEl.closest("[data-simplebar]") ?? scrollEl;
    for (const type of ["wheel", "touchstart", "keydown"]) {
      scrollEl.addEventListener(type, this._onUserScrollIntent, { passive: true });
    }
    intentRoot.addEventListener("pointerdown", this._onUserScrollIntent, { passive: true });
    this._maid.Give(() => {
      for (const type of ["wheel", "touchstart", "keydown"]) {
        scrollEl.removeEventListener(type, this._onUserScrollIntent);
      }
      intentRoot.removeEventListener("pointerdown", this._onUserScrollIntent);
    });
    const spacer = document.createElement("div");
    spacer.style.flexShrink = "0";
    spacer.style.pointerEvents = "none";
    spacer.setAttribute("aria-hidden", "true");
    spacer.style.height = `${scrollEl.clientHeight / 2}px`;
    scrollEl.appendChild(spacer);
    this._spacer = spacer;
    this._maid.Give(() => spacer.parentElement?.removeChild(spacer));
    this._widthObserver = this._maid.Give(new ResizeObserver(() => {
      const v = this._virtualizer;
      const el = this._scrollEl;
      if (!v || !el) return;
      const newWidth = el.clientWidth;
      if (newWidth === 0) {
        virtualizerLogger.debug("Ignoring width change to 0 (likely minimized)");
        return;
      }
      this._smoothGeometry = null;
      if (this._spacer) this._spacer.style.height = `${el.clientHeight / 2}px`;
      if (Math.abs(newWidth - this._containerWidth) < 1) {
        if (Math.abs(el.clientHeight - this._containerHeight) >= 1) {
          virtualizerLogger.debug("Container height changed (width stable)", {
            previous: this._containerHeight,
            next: el.clientHeight
          });
          this._containerHeight = el.clientHeight;
          this._blockLayoutGlide(LAYOUT_GLIDE_BLOCK_MS);
          v._willUpdate();
        }
        return;
      }
      this._blockLayoutGlide(LAYOUT_GLIDE_BLOCK_MS);
      virtualizerLogger.info("Container width changed", {
        previous: this._containerWidth,
        next: newWidth
      });
      this._containerWidth = newWidth;
      this._containerHeight = el.clientHeight;
      if (this._resizeDebounceTimer !== null) {
        clearTimeout(this._resizeDebounceTimer);
      }
      this._resizeDebounceTimer = setTimeout(() => {
        this._resizeDebounceTimer = null;
        virtualizerLogger.debug("Applying debounced resize remeasure");
        this._remeasureVisible();
        v._willUpdate();
      }, 150);
    }));
    this._widthObserver.observe(scrollEl);
    const healInterval = setInterval(this._selfHealCheck, 250);
    this._maid.Give(() => clearInterval(healInterval));
    const _handleVisibilityRestore = () => {
      if (document.hidden) return;
      this._blockLayoutGlide(LAYOUT_GLIDE_BLOCK_MS);
      virtualizerLogger.debug("Visibility restored; forcing remeasure cycle");
      requestAnimationFrame(() => {
        const v = this._virtualizer;
        if (!v || !this._scrollEl) return;
        const w = this._scrollEl.clientWidth;
        if (w > 0 && Math.abs(w - this._containerWidth) >= 0.5) {
          this._containerWidth = w;
        }
        this._syncScrollRect();
        this._remeasureVisible();
        this._onVirtualizerChange(v);
      });
    };
    document.addEventListener("visibilitychange", _handleVisibilityRestore);
    this._maid.Give(
      () => document.removeEventListener("visibilitychange", _handleVisibilityRestore)
    );
  }
  // Get or create the positioning wrapper for the given index.
  _getOrCreateWrapper(index) {
    let wrapper = this._wrappers[index];
    if (!wrapper) {
      wrapper = document.createElement("div");
      wrapper.setAttribute("data-index", String(index));
      wrapper.style.position = "absolute";
      wrapper.style.left = "0";
      wrapper.style.width = "100%";
      wrapper.style.willChange = "transform";
      wrapper.style.paddingBottom = `${this._itemGap(index)}px`;
      this._wrappers[index] = wrapper;
      const el = this._allElements[index];
      if (el) {
        el.style.position = "";
        el.style.transform = "";
        el.style.left = "";
        el.style.width = "100%";
        wrapper.appendChild(el);
      }
    }
    return wrapper;
  }
  // TanStack notifies once per resized item, and its ResizeObserver resizes items
  // one at a time: running the mount pass on each notify forced a layout per line.
  // Coalesce to one pass per task; the microtask still lands before paint.
  _queueChange(v) {
    if (this._inOnChange) {
      this._onChangePending = true;
      return;
    }
    if (this._changeQueued) return;
    this._changeQueued = true;
    queueMicrotask(() => this._flushQueuedChange(v));
  }
  // Run a queued pass now. Needed right after our own DOM insertions: Spicetify's
  // wrapper rescans the page once per mutation delivery, so mounting in a later
  // microtask would cost a second full scan.
  _flushQueuedChange(v) {
    if (!this._changeQueued) return;
    this._changeQueued = false;
    this._onVirtualizerChange(v);
  }
  // measureElement can synchronously re-enter onChange, whose DOM writes would
  // force a fresh layout for every following read. Hold onChange until the batch
  // is measured, then run it once.
  _measureBatch(v, wrappers) {
    if (this._inOnChange) {
      for (const wrapper of wrappers) v.measureElement(wrapper);
      return;
    }
    this._inOnChange = true;
    try {
      for (const wrapper of wrappers) v.measureElement(wrapper);
    } finally {
      this._inOnChange = false;
    }
    if (this._onChangePending) {
      this._onChangePending = false;
      this._onVirtualizerChange(v);
    }
  }
  _onVirtualizerChange(v) {
    if (v !== this._virtualizer) return;
    if (!this._virtualContainer) return;
    if (this._inOnChange) {
      this._onChangePending = true;
      return;
    }
    this._inOnChange = true;
    try {
      do {
        this._onChangePending = false;
        this._doOnVirtualizerChange(v);
      } while (this._onChangePending && this._virtualizer === v);
    } finally {
      this._inOnChange = false;
    }
  }
  _doOnVirtualizerChange(v) {
    if (!this._virtualContainer) return;
    const totalSize = v.getTotalSize();
    this._virtualContainer.style.height = `${totalSize}px`;
    const items = v.getVirtualItems();
    const nextVisible = new Set(items.map((i) => i.index));
    const firstVisible = items[0]?.index ?? -1;
    const lastVisible = items[items.length - 1]?.index ?? -1;
    const signature = `${firstVisible}:${lastVisible}:${items.length}:${totalSize}`;
    if (signature !== this._lastVirtualWindowSignature) {
      this._lastVirtualWindowSignature = signature;
      virtualizerLogger.debug("Visible window updated", {
        firstVisible,
        lastVisible,
        visibleCount: items.length,
        totalSize
      });
    }
    const toUnmount = [];
    for (const idx of this._mountedIndices) {
      if (!nextVisible.has(idx)) toUnmount.push(idx);
    }
    const unmountWrappers = [];
    for (const idx of toUnmount) {
      const wrapper = this._wrappers[idx];
      if (wrapper) {
        const gap = this._itemGap(idx);
        const prevPad = parseFloat(wrapper.style.paddingBottom) || 0;
        if (Math.abs(prevPad - gap) >= 0.5) {
          wrapper.style.paddingBottom = `${gap}px`;
        }
        unmountWrappers.push(wrapper);
      }
      this._mountedIndices.delete(idx);
    }
    for (const wrapper of unmountWrappers) v.measureElement(wrapper);
    for (const wrapper of unmountWrappers) {
      this._resizeObserver?.unobserve(wrapper);
      wrapper.parentElement?.removeChild(wrapper);
    }
    if (unmountWrappers.length > 0 && this._resizeRAF === null) {
      this._resizeRAF = requestAnimationFrame(() => {
        this._resizeRAF = null;
        if (this._virtualizer === v) {
          virtualizerLogger.debug("Unmount pass scheduled virtualizer update");
          v._willUpdate();
        }
      });
    }
    const toMeasure = [];
    let mountedAny = false;
    const glide = this._layoutGlideEnabled();
    for (const item of items) {
      const wrapper = this._getOrCreateWrapper(item.index);
      const gap = this._itemGap(item.index);
      const prevPad = parseFloat(wrapper.style.paddingBottom) || 0;
      const gapChanged = Math.abs(prevPad - gap) >= 0.5;
      if (gapChanged) {
        wrapper.style.paddingBottom = `${gap}px`;
      }
      const wantGlide = glide && this._mountedIndices.has(item.index);
      if (wrapper.dataset.glide === "1" !== wantGlide) {
        wrapper.style.transition = wantGlide ? LAYOUT_GLIDE_TRANSITION : "";
        wrapper.dataset.glide = wantGlide ? "1" : "";
      }
      wrapper.style.transform = `translateY(${Math.round(item.start)}px)`;
      if (!this._mountedIndices.has(item.index)) {
        this._virtualContainer.appendChild(wrapper);
        this._mountedIndices.add(item.index);
        this._resizeObserver?.observe(wrapper);
        toMeasure.push(wrapper);
        mountedAny = true;
      } else if (gapChanged) {
        toMeasure.push(wrapper);
      }
    }
    for (const wrapper of toMeasure) v.measureElement(wrapper);
    if (mountedAny) this._onNewElementMounted?.();
    const didMeasure = toMeasure.length > 0;
    if (didMeasure && this._resizeRAF === null) {
      this._resizeRAF = requestAnimationFrame(() => {
        this._resizeRAF = null;
        if (this._virtualizer === v) {
          virtualizerLogger.debug("Mount pass scheduled virtualizer update");
          v._willUpdate();
        }
      });
    }
  }
  getVirtualizer() {
    return this._virtualizer;
  }
  /**
   * Scroll the virtualizer to center (or align) a specific line index.
   *
   * Bypasses TanStack's scrollToIndex() (its offset ignores the scroll
   * container's margin-top). We read item.start/size from measurementsCache,
   * measure the absolute containerOffset, compute the target scrollTop, set it
   * directly, then schedule a one-frame retry that re-reads the cache and
   * re-scrolls if measurements drifted or the browser clamped scrollTop —
   * converging when the first call relied on estimates (mid-song open).
   */
  scrollToIndex(index, align = "center", instant = false, padding = 0) {
    if (this._scrollVerifyRAF !== null) {
      cancelAnimationFrame(this._scrollVerifyRAF);
      this._scrollVerifyRAF = null;
    }
    if (!instant && $smoothScrolling.get()) {
      this._smoothScrollToIndex(index, align, padding);
      return;
    }
    this._stopSmoothScroll();
    this._setConverging(true);
    this._scrollToIndexWithRetry(index, align, instant, padding, 0, null);
  }
  // Where item N sits in the virtual container. Unmeasured items fall back to an
  // average-size estimate; callers re-read this as measurements land.
  _getItemRect(v, index) {
    const cached = v.measurementsCache[index];
    if (cached) return { start: cached.start, size: cached.size };
    const count = this._allElements.length;
    const totalSize = v.getTotalSize();
    const avgItemSize = count > 1 ? totalSize / count : totalSize;
    return { start: index * avgItemSize, size: this._estimateSize(index) };
  }
  /**
   * Spring-driven alternative to the native smooth scroll. Each frame re-reads
   * the target line's position (items mounting above it shift it while we
   * travel), so this converges on far targets the same way the retry chain
   * does, without needing it. Calling again mid-flight just retargets.
   */
  _smoothScrollToIndex(index, align, padding) {
    const v = this._virtualizer;
    const scrollEl = v?.scrollElement;
    if (!v || !scrollEl || !this._virtualContainer) return;
    const viewportHeight = scrollEl.clientHeight;
    if (!viewportHeight) return;
    const animating = this._smoothRAF !== null;
    const current = animating && this._smoothSpring ? scrollEl.scrollTop + this._smoothFraction : scrollEl.scrollTop;
    if (!this._smoothSpring) {
      this._smoothSpring = new Spring(current, SMOOTH_SCROLL_FREQUENCY, SMOOTH_SCROLL_DAMPING);
    } else if (!animating) {
      this._smoothSpring.SetGoal(current, true);
    }
    this._smoothGeometry = this._readSmoothGeometry(v, scrollEl);
    this._smoothReconciles = 0;
    this._smoothTarget = { index, align, padding };
    this._setConverging(true);
    if (!animating) {
      this._smoothLastTs = null;
      this._smoothLastPosition = null;
      this._smoothLastWhole = null;
      this._smoothRAF = requestCappedFrame(this._smoothStep);
    }
  }
  // Layout reads for the glide. Done at retarget and after invalidation only —
  // never on an ordinary frame. Null when the list isn't laid out.
  _readSmoothGeometry(v, scrollEl) {
    const container = this._virtualContainer;
    const viewportHeight = scrollEl.clientHeight;
    if (!container || !viewportHeight) return null;
    const containerRect = container.getBoundingClientRect();
    const scrollElRect = scrollEl.getBoundingClientRect();
    return {
      containerOffset: containerRect.top - scrollElRect.top + scrollEl.scrollTop + this._smoothFraction,
      viewportHeight,
      maxScroll: Math.max(0, scrollEl.scrollHeight - viewportHeight),
      totalSize: v.getTotalSize()
    };
  }
  /**
   * One frame of the glide. Ordinarily reads no layout: the goal comes from
   * TanStack's measurement cache (items mounting above the target move it while
   * we travel, so it is re-read every frame) plus geometry cached at retarget,
   * with the scroll limit kept current from the change in total size. The only
   * DOM work is the scroll write and the sub-pixel translate.
   */
  _smoothStep = (ts) => {
    this._smoothRAF = null;
    const v = this._virtualizer;
    const target = this._smoothTarget;
    const spring = this._smoothSpring;
    const scrollEl = v?.scrollElement;
    const container = this._virtualContainer;
    if (!v || !target || !spring || !scrollEl || !container) {
      this._stopSmoothScroll();
      return;
    }
    if (!this._smoothGeometry) this._smoothGeometry = this._readSmoothGeometry(v, scrollEl);
    const geometry = this._smoothGeometry;
    if (!geometry) {
      this._stopSmoothScroll();
      return;
    }
    const maxScroll = Math.max(0, geometry.maxScroll + (v.getTotalSize() - geometry.totalSize));
    const item = this._getItemRect(v, target.index);
    const goal = Math.round(
      Math.min(
        maxScroll,
        this._computeFinalScrollTop(
          item.start,
          item.size,
          geometry.viewportHeight,
          geometry.containerOffset,
          target.align,
          target.padding
        )
      )
    );
    spring.SetGoal(goal);
    let elapsed = this._smoothLastTs === null ? 1 / 60 : Math.min((ts - this._smoothLastTs) / 1e3, SMOOTH_SCROLL_MAX_ELAPSED);
    this._smoothLastTs = ts;
    let stepped = spring.Step(Math.min(elapsed, SMOOTH_SCROLL_MAX_STEP));
    elapsed -= SMOOTH_SCROLL_MAX_STEP;
    while (elapsed > 0) {
      stepped = spring.Step(Math.min(elapsed, SMOOTH_SCROLL_MAX_STEP));
      elapsed -= SMOOTH_SCROLL_MAX_STEP;
    }
    const position2 = Math.max(0, stepped);
    const moved = this._smoothLastPosition === null ? Infinity : Math.abs(position2 - this._smoothLastPosition);
    this._smoothLastPosition = position2;
    const settled = Math.abs(position2 - goal) < SMOOTH_SCROLL_SETTLE_PX && moved < SMOOTH_SCROLL_SETTLE_SPEED && this._mountedIndices.has(target.index);
    const whole = settled ? goal : Math.min(Math.round(position2), Math.floor(maxScroll));
    const fraction = settled ? 0 : Math.max(0, Math.min(position2, maxScroll)) - whole;
    if (whole !== this._smoothLastWhole) {
      scrollEl.scrollTo({ top: whole, behavior: "instant" });
      this._smoothLastWhole = whole;
    }
    this._setSmoothFraction(fraction);
    if (v.scrollOffset == null || Math.abs(v.scrollOffset - whole) >= 1) {
      v.scrollOffset = whole;
      this._onVirtualizerChange(v);
    }
    if (settled) {
      const actual = scrollEl.scrollTop;
      if (Math.abs(actual - v.scrollOffset) >= 1) {
        v.scrollOffset = actual;
        this._onVirtualizerChange(v);
      }
      if (Math.abs(actual - goal) > 1 && this._smoothReconciles < SMOOTH_SCROLL_MAX_RECONCILES) {
        virtualizerLogger.debug("Smooth scroll landed off target, re-aiming", { actual, goal });
        this._smoothReconciles += 1;
        this._smoothGeometry = null;
        this._smoothLastWhole = actual;
        this._smoothLastPosition = null;
        spring.SetGoal(actual, true);
        this._smoothRAF = requestCappedFrame(this._smoothStep);
        return;
      }
      this._stopSmoothScroll();
      this._remeasureVisible();
    } else {
      this._smoothRAF = requestCappedFrame(this._smoothStep);
    }
  };
  // Smooth Scrolling was switched off mid-glide: stop the spring and let the
  // standard path finish the move, so the line still ends up in place.
  _handOffSmoothScroll() {
    const target = this._smoothTarget;
    const active = this._smoothRAF !== null;
    this._stopSmoothScroll();
    if (active && target) this.scrollToIndex(target.index, target.align, false, target.padding);
    if (this._virtualizer) this._onVirtualizerChange(this._virtualizer);
  }
  _setSmoothFraction(fraction) {
    if (Math.abs(fraction - this._smoothFraction) < 0.01 && fraction !== 0) return;
    this._smoothFraction = fraction;
    if (this._virtualContainer) {
      this._virtualContainer.style.translate = fraction === 0 ? "" : `0 ${-fraction}px`;
    }
  }
  _stopSmoothScroll() {
    const wasActive = this._smoothRAF !== null || this._smoothTarget !== null;
    if (this._smoothRAF !== null) {
      cancelCappedFrame(this._smoothRAF);
      this._smoothRAF = null;
    }
    this._smoothTarget = null;
    this._smoothGeometry = null;
    this._smoothLastTs = null;
    this._smoothLastPosition = null;
    this._smoothLastWhole = null;
    this._setSmoothFraction(0);
    if (wasActive) this._setConverging(false);
  }
  // The user is about to move the list themselves: let go of any glide, and hold
  // off row glides so measurement corrections while they scroll stay instant.
  _onUserScrollIntent = () => {
    this._blockLayoutGlide(LAYOUT_GLIDE_BLOCK_MS);
    if (this._smoothRAF !== null) {
      virtualizerLogger.debug("Smooth scroll cancelled: user scroll");
      this._stopSmoothScroll();
    }
  };
  _blockLayoutGlide(ms) {
    this._layoutGlideBlockedUntil = Math.max(this._layoutGlideBlockedUntil, performance.now() + ms);
  }
  _layoutGlideEnabled() {
    return $smoothScrolling.get() && performance.now() >= this._layoutGlideBlockedUntil;
  }
  // Converging (a programmatic scroll in flight): we are the only scrollTop
  // writer. Without this, TanStack's automatic scrollTop correction (for
  // above-viewport items measured larger than estimate) writes scrollTop out from
  // under the manual scroll and trips the retry's external-scroll guard — the
  // root cause of the active line never centering on a mid-song open.
  _setConverging(active) {
    this._converging = active;
  }
  /**
   * Installed as TanStack's shouldAdjustScrollPositionOnItemSizeChange. Outside
   * the two cases below it reproduces TanStack's default heuristic.
   */
  _shouldAdjustScroll = (item, _delta, instance) => {
    if (this._converging) return false;
    if (this._layoutGlideEnabled()) return false;
    const internals = instance;
    return item.start < internals.getScrollOffset() + internals.scrollAdjustments && instance.scrollDirection !== "backward";
  };
  _computeFinalScrollTop(itemStart, itemSize, viewportHeight, containerOffset, align, padding) {
    let target;
    if (align === "center" || align === "auto") {
      target = containerOffset + itemStart - (viewportHeight - itemSize) / 2;
    } else if (align === "start") {
      target = containerOffset + itemStart;
    } else {
      target = containerOffset + itemStart - viewportHeight + itemSize;
    }
    return Math.max(0, target + padding);
  }
  _scrollToIndexWithRetry(index, align, instant, padding, retry, expectedScrollTop) {
    const v = this._virtualizer;
    if (!v || !this._virtualContainer) {
      this._setConverging(false);
      return;
    }
    const scrollEl = v.scrollElement;
    if (!scrollEl) {
      this._setConverging(false);
      return;
    }
    const viewportHeight = scrollEl.clientHeight;
    if (!viewportHeight) {
      this._setConverging(false);
      return;
    }
    if (expectedScrollTop !== null && Math.abs(scrollEl.scrollTop - expectedScrollTop) > 2) {
      virtualizerLogger.debug("Aborting scrollToIndex retry: external scroll detected", {
        expectedScrollTop,
        actualScrollTop: scrollEl.scrollTop,
        retry
      });
      this._setConverging(false);
      return;
    }
    const { start: itemStart, size: itemSize } = this._getItemRect(v, index);
    const containerRect = this._virtualContainer.getBoundingClientRect();
    const scrollElRect = scrollEl.getBoundingClientRect();
    const containerOffset = containerRect.top - scrollElRect.top + scrollEl.scrollTop;
    const finalScrollTop = this._computeFinalScrollTop(
      itemStart,
      itemSize,
      viewportHeight,
      containerOffset,
      align,
      padding
    );
    if (retry === 0) {
      virtualizerLogger.debug("scrollToIndex computed target", {
        index,
        align,
        instant,
        padding
      });
      virtualizerLogger.debug("scrollToIndex computed offsets", {
        itemStart,
        itemSize,
        viewportHeight,
        containerOffset,
        finalScrollTop
      });
    } else {
      virtualizerLogger.debug("scrollToIndex retry pass", {
        index,
        retry,
        itemStart,
        itemSize,
        finalScrollTop
      });
    }
    if (instant) this._blockLayoutGlide(LAYOUT_GLIDE_BLOCK_MS);
    if (instant) {
      scrollEl.classList.add("InstantScroll");
    } else {
      scrollEl.classList.remove("InstantScroll");
    }
    scrollEl.scrollTo({
      top: finalScrollTop,
      behavior: instant ? "instant" : "auto"
    });
    const observedScrollTop = scrollEl.scrollTop;
    const maxScrollTop = scrollEl.scrollHeight - viewportHeight;
    const tanstackOffsetBefore = v.scrollOffset;
    if (virtualizerLogger.isEnabled) {
      const scrollHeight = scrollEl.scrollHeight;
      const clientHeight = scrollEl.clientHeight;
      virtualizerLogger.debug("scrollToIndex applied", {
        retry,
        finalScrollTop: Math.round(finalScrollTop),
        observedScrollTop: Math.round(observedScrollTop),
        tanstackOffset: tanstackOffsetBefore == null ? null : Math.round(tanstackOffsetBefore),
        scrollHeight,
        clientHeight,
        maxScroll: scrollHeight - clientHeight,
        virtualHeight: this._virtualContainer.offsetHeight,
        scrollBehavior: getComputedStyle(scrollEl).scrollBehavior,
        hasInstantScroll: scrollEl.classList.contains("InstantScroll"),
        targetMounted: this._mountedIndices.has(index)
      });
    }
    if (v.scrollOffset == null || Math.abs(v.scrollOffset - observedScrollTop) >= 1) {
      v.scrollOffset = observedScrollTop;
      this._onVirtualizerChange(v);
    }
    if (retry < _LyricsVirtualizer._MAX_SCROLL_RETRIES) {
      this._scrollVerifyRAF = requestAnimationFrame(() => {
        this._scrollVerifyRAF = null;
        if (this._virtualizer !== v) {
          this._setConverging(false);
          return;
        }
        const fresh = v.measurementsCache[index];
        const drift = fresh ? Math.abs(fresh.start - itemStart) + Math.abs(fresh.size - itemSize) : 0;
        const wasClamped = finalScrollTop - maxScrollTop > 1;
        const targetMounted = this._mountedIndices.has(index);
        if (!targetMounted || drift >= 1 || wasClamped) {
          this._scrollToIndexWithRetry(
            index,
            align,
            instant,
            padding,
            retry + 1,
            observedScrollTop
          );
        } else {
          this._setConverging(false);
        }
      });
    } else {
      this._setConverging(false);
    }
  }
  destroy() {
    virtualizerLogger.info("Destroying lyrics virtualizer", {
      mountedCount: this._mountedIndices.size,
      wrappers: this._wrappers.length,
      hasVirtualizer: Boolean(this._virtualizer)
    });
    if (this._scrollVerifyRAF !== null) {
      cancelAnimationFrame(this._scrollVerifyRAF);
      this._scrollVerifyRAF = null;
    }
    this._stopSmoothScroll();
    this._smoothSpring = null;
    this._layoutGlideBlockedUntil = 0;
    this._converging = false;
    this._maid?.Destroy();
    this._maid = null;
    this._scrollEl = null;
    this._resizeObserver = null;
    this._widthObserver = null;
    this._containerWidth = 0;
    this._containerHeight = 0;
    this._classObserver = null;
    this._spacer = null;
    try {
      this._virtualizer._cleanup?.();
    } catch {
    }
    for (const idx of this._mountedIndices) {
      this._wrappers[idx]?.parentElement?.removeChild(this._wrappers[idx]);
    }
    this._virtualizer = null;
    this._allElements = [];
    this._indexByElement.clear();
    this._wrappers = [];
    this._mountedIndices.clear();
    this._lastVirtualWindowSignature = "";
    this._virtualContainer = null;
    if (this._resizeDebounceTimer !== null) {
      clearTimeout(this._resizeDebounceTimer);
      this._resizeDebounceTimer = null;
    }
  }
};
var lyricsVirtualizer = new LyricsVirtualizer();
function initLyricsVirtualizer(scrollEl, virtualContainer, lineElements) {
  lyricsVirtualizer.init(scrollEl, virtualContainer, lineElements);
}
function getLyricsVirtualizer() {
  return lyricsVirtualizer.getVirtualizer();
}
function scrollLyricsToIndex(index, align = "center", instant = false, padding = 0) {
  lyricsVirtualizer.scrollToIndex(index, align, instant, padding);
}
function destroyLyricsVirtualizer() {
  lyricsVirtualizer.destroy();
}
function setOnNewElementMounted(cb) {
  lyricsVirtualizer.setOnNewElementMounted(cb);
}

// wallpaper/vendor/spicy-lyrics/src/utils/Lyrics/Animator/Lyrics/LyricsAnimator.ts
var getSLMAnimation = (duration) => {
  return `SLM_Animation ${duration}ms linear forwards`;
};
var getPreSLMAnimation = (duration) => {
  return `Pre_SLM_GradientAnimation ${duration}ms linear forwards`;
};
var GetSpline = (range) => {
  const times = range.map((value) => value.Time);
  const values = range.map((value) => value.Value);
  return new import_cubic_spline.default(times, values);
};
var LetterGlowMultiplier_Opacity = 185;
var ScaleRange = [
  { Time: 0, Value: 0.95 },
  {
    Time: 0.7,
    Value: 1.0505
    /* 1.025 */
  },
  { Time: 1, Value: 1 }
];
var LetterScaleRange = [
  { Time: 0, Value: 0.95 },
  {
    Time: 0.7,
    Value: 1.175
    /* 1.025 */
  },
  { Time: 1, Value: 1 }
];
var SimpleLetterScaleRange = [
  { Time: 0, Value: 0.95 },
  { Time: 0.7, Value: 1.07 },
  { Time: 1, Value: 1 }
];
var YOffsetRange = [
  { Time: 0, Value: 1 / 100 },
  { Time: 0.9, Value: -(1 / 60) },
  { Time: 1, Value: 0 }
];
var GlowRange = [
  { Time: 0, Value: 0 },
  { Time: 0.15, Value: 1 },
  { Time: 0.6, Value: 1 },
  { Time: 1, Value: 0 }
];
var SimpleYOffsetRange = [
  { Time: 0, Value: 1 / 100 },
  { Time: 1, Value: -0.033 }
];
var ScaleSpline = GetSpline(ScaleRange);
var LetterScaleSpline = GetSpline(
  $simpleLyricsMode.get() ? SimpleLetterScaleRange : LetterScaleRange
);
var YOffsetSpline = GetSpline(
  $simpleLyricsMode.get() ? SimpleYOffsetRange : YOffsetRange
);
var LetterYOffsetRange = [
  { Time: 0, Value: 1 / 100 },
  { Time: 0.9, Value: -(1 / 56) },
  { Time: 1, Value: 0 }
];
var SimpleLetterYOffsetRange = [
  { Time: 0, Value: 1 / 100 },
  { Time: 0.9, Value: -(1 / 62) },
  { Time: 1, Value: 0 }
];
var LetterYOffsetSpline = GetSpline(
  $simpleLyricsMode.get() ? SimpleLetterYOffsetRange : LetterYOffsetRange
);
var GlowSpline = GetSpline(GlowRange);
var YOffsetDamping = 0.4;
var YOffsetFrequency = 1.45;
var ScaleDamping = 0.64;
var ScaleFrequency = 0.88;
var GlowDamping = 0.56;
var GlowFrequency = 1.18;
var getDotOpacityRange = (simpleLyricsMode) => [
  // Controls element opacity
  { Time: 0, Value: simpleLyricsMode ? 0.27 : 0.35 },
  // Resting (NotSung)
  { Time: 0.6, Value: 1 },
  // Peak animation
  { Time: 1, Value: 1 }
  // End (Sung)
];
var DotAnimations = {
  YOffsetDamping: 0.4,
  YOffsetFrequency: 1.25,
  ScaleDamping: 0.6,
  ScaleFrequency: 0.7,
  GlowDamping: 0.5,
  GlowFrequency: 1,
  OpacityDamping: 0.5,
  OpacityFrequency: 1,
  ScaleRange: [
    { Time: 0, Value: 0.75 },
    // Resting (NotSung)
    { Time: 0.7, Value: 1.05 },
    // Peak animation
    { Time: 1, Value: 1 }
    // End (Sung)
  ],
  YOffsetRange: [
    // Relative to font-size
    { Time: 0, Value: 0 },
    // Resting (NotSung)
    { Time: 0.9, Value: -0.12 },
    // Peak animation
    { Time: 1, Value: 0 }
    // End (Sung)
  ],
  GlowRange: [
    // Controls --text-shadow-opacity and --text-shadow-blur-radius indirectly
    { Time: 0, Value: 0 },
    // Resting (NotSung)
    { Time: 0.6, Value: 1 },
    // Peak animation
    { Time: 1, Value: 1 }
    // End (Sung) - Note: Inspiration code ends at 1, might need adjustment based on visual needs
  ]
};
var DotGroupAnimations = {
  YOffsetDamping: 0.4,
  YOffsetFrequency: 1.25,
  ScaleDamping: 0.7,
  // 0.6
  ScaleFrequency: 5,
  // 4
  ScaleRange: [
    // Time is actually real-time (so in seconds)
    {
      Time: 0,
      Value: 0
    },
    {
      Time: 0.2,
      Value: 1.05
    },
    {
      Time: -0.075,
      Value: 1.15
    },
    {
      Time: -0,
      Value: 0
    }
    // Rest
  ],
  OpacityRange: [
    {
      Time: 0,
      Value: 0
    },
    {
      Time: 0.5,
      Value: 1
    },
    {
      Time: -0.075,
      Value: 1
    },
    {
      Time: -0,
      Value: 0
    }
    // Rest
  ],
  YOffsetRange: [
    // This is relative to the font-size
    {
      Time: 0,
      Value: 1 / 100
    },
    // Lowest
    {
      Time: 0.9,
      Value: -(1 / 60)
    },
    // Highest
    {
      Time: 1,
      Value: 0
    }
    // Rest
  ]
};
var DotScaleSpline = GetSpline(DotAnimations.ScaleRange);
var DotYOffsetSpline = GetSpline(DotAnimations.YOffsetRange);
var DotGlowSpline = GetSpline(DotAnimations.GlowRange);
var DotOpacitySpline = GetSpline(getDotOpacityRange($simpleLyricsMode.get()));
var createLetterSprings = () => {
  return {
    Scale: new Spring(LetterScaleSpline.at(0), ScaleFrequency, ScaleDamping),
    YOffset: new Spring(LetterYOffsetSpline.at(0), YOffsetFrequency, YOffsetDamping),
    Glow: new Spring(GlowSpline.at(0), GlowFrequency, GlowDamping)
  };
};
$simpleLyricsMode.subscribe((simpleLyricsMode) => {
  YOffsetSpline = GetSpline(simpleLyricsMode ? SimpleYOffsetRange : YOffsetRange);
  DotOpacitySpline = GetSpline(getDotOpacityRange(simpleLyricsMode));
  LetterYOffsetSpline = GetSpline(simpleLyricsMode ? SimpleLetterYOffsetRange : LetterYOffsetRange);
  LetterScaleSpline = GetSpline(simpleLyricsMode ? SimpleLetterScaleRange : LetterScaleRange);
});
var SungLetterGlow = 0.2;
function promoteToGPU(el) {
  el.style.willChange = "transform, opacity, text-shadow, scale";
  el.style.backfaceVisibility = "hidden";
}
var _gpuPromotedLines = /* @__PURE__ */ new WeakSet();
function promoteLineToGPU(el) {
  if (_gpuPromotedLines.has(el)) return;
  promoteToGPU(el);
  _gpuPromotedLines.add(el);
}
var _styleCache = /* @__PURE__ */ new WeakMap();
var _styleQueue = /* @__PURE__ */ new Map();
function queueStyle(el, prop, value) {
  let props = _styleQueue.get(el);
  if (!props) {
    props = /* @__PURE__ */ new Map();
    _styleQueue.set(el, props);
  }
  props.set(prop, value);
}
function setStyleIfChanged(el, prop, value, epsilon = 0, compareValue) {
  let map = _styleCache.get(el);
  if (!map) {
    map = /* @__PURE__ */ new Map();
    _styleCache.set(el, map);
  }
  let next = compareValue ?? parseFloat(value);
  if (Number.isNaN(next)) next = value;
  const prev = map.get(prop);
  if (prev !== void 0) {
    if (typeof prev === "number" && typeof next === "number") {
      if (Math.abs(prev - next) <= epsilon) return;
    } else if (prev === next) {
      return;
    }
  }
  queueStyle(el, prop, value);
  map.set(prop, next);
}
function setClass(el, cls, on) {
  if (el.classList.contains(cls) !== on) el.classList.toggle(cls, on);
}
function flushStyleBatch() {
  if (_styleQueue.size === 0) return;
  for (const [el, props] of _styleQueue) {
    for (const [prop, value] of props) {
      el.style.setProperty(prop, value);
    }
  }
  _styleQueue.clear();
}
var createWordSprings = () => {
  if ($simpleLyricsMode.get()) {
    return {
      Scale: {
        Step: () => {
        },
        SetGoal: () => {
        }
      },
      /* YOffset: {
        Step: () => {},
        SetGoal: () => {},
      }, */
      YOffset: new Spring(YOffsetSpline.at(0), YOffsetFrequency, YOffsetDamping),
      Glow: {
        Step: () => {
        },
        SetGoal: () => {
        }
      }
    };
  }
  return {
    Scale: new Spring(ScaleSpline.at(0), ScaleFrequency, ScaleDamping),
    YOffset: new Spring(YOffsetSpline.at(0), YOffsetFrequency, YOffsetDamping),
    Glow: new Spring(GlowSpline.at(0), GlowFrequency, GlowDamping)
  };
};
var createDotSprings = () => {
  if ($simpleLyricsMode.get()) {
    return {
      Scale: {
        Step: () => {
        },
        SetGoal: () => {
        }
      },
      YOffset: {
        Step: () => {
        },
        SetGoal: () => {
        }
      },
      Glow: {
        Step: () => {
        },
        SetGoal: () => {
        }
      },
      Opacity: new Spring(
        DotOpacitySpline.at(0),
        DotAnimations.OpacityFrequency,
        DotAnimations.OpacityDamping
      )
    };
  }
  return {
    Scale: new Spring(
      DotScaleSpline.at(0),
      DotAnimations.ScaleFrequency,
      DotAnimations.ScaleDamping
    ),
    YOffset: new Spring(
      DotYOffsetSpline.at(0),
      DotAnimations.YOffsetFrequency,
      DotAnimations.YOffsetDamping
    ),
    Glow: new Spring(DotGlowSpline.at(0), DotAnimations.GlowFrequency, DotAnimations.GlowDamping),
    Opacity: new Spring(
      DotOpacitySpline.at(0),
      DotAnimations.OpacityFrequency,
      DotAnimations.OpacityDamping
    )
  };
};
var LineGlowRange = [
  {
    Time: 0,
    Value: 0
  },
  {
    Time: 0.5,
    Value: 1
  },
  {
    Time: 1,
    Value: 0
  }
];
var LineGlowSpline = GetSpline(LineGlowRange);
var LineGlowDamping = 0.5;
var LineGlowFrequency = 1;
var createLineSprings = () => {
  if ($simpleLyricsMode.get()) {
    return {
      Glow: {
        Step: () => {
        },
        SetGoal: () => {
        }
      }
    };
  }
  return {
    Glow: new Spring(LineGlowSpline.at(0), LineGlowFrequency, LineGlowDamping)
  };
};
var Blurring_LastLine = null;
var lastFrameTime = performance.now();
setOnNewElementMounted(() => {
  Blurring_LastLine = null;
});
function setBlurringLastLine(c) {
  Blurring_LastLine = c;
}
function getElementState(currentTime, startTime, endTime) {
  if (currentTime < startTime) return "NotSung";
  if (currentTime >= endTime) return "Sung";
  return "Active";
}
function getProgressPercentage(currentTime, startTime, endTime) {
  if (currentTime <= startTime) return 0;
  if (currentTime >= endTime) return 1;
  return (currentTime - startTime) / (endTime - startTime);
}
var lastAnimateFrameTime = 0;
function Animate(position2) {
  const ProcessedPosition = position2 + timeOffset - ($simpleLyricsMode.get() ? 33.5 : 0);
  const now2 = performance.now();
  const deltaTime = (now2 - lastFrameTime) / 1e3;
  lastFrameTime = now2;
  lastAnimateFrameTime = now2;
  const CurrentLyricsType = $currentLyricsType.get();
  if (!CurrentLyricsType || CurrentLyricsType === "None") return;
  const applyBlur = (arr, activeIndex, blurMultiplierValue) => {
    if (!arr[activeIndex]) return;
    promoteLineToGPU(arr[activeIndex].HTMLElement);
    const max = BlurMultiplier * 5 + BlurMultiplier * 0.465;
    for (let i = 0; i < arr.length; i++) {
      const el = arr[i].HTMLElement;
      if (!el.isConnected) continue;
      const state = getElementState(ProcessedPosition, arr[i].StartTime, arr[i].EndTime);
      const distance = Math.abs(i - activeIndex);
      const blurAmount = distance === 0 ? 0 : Math.min(blurMultiplierValue * distance, max);
      const value = state === "Active" || distance === 0 ? "0px" : `${blurAmount}px`;
      setStyleIfChanged(el, "--BlurAmount", value, 0.25);
      promoteLineToGPU(el);
    }
  };
  let mountedLine = null;
  let anyLineUnsung = false;
  if (CurrentLyricsType === "Syllable") {
    const arr = LyricsObject.Types.Syllable.Lines;
    for (let index = 0; index < arr.length; index++) {
      const line = arr[index];
      if (!line.HTMLElement.isConnected) continue;
      const lineState = getElementState(ProcessedPosition, line.StartTime, line.EndTime);
      mountedLine ??= line.HTMLElement;
      if (lineState !== "Sung") anyLineUnsung = true;
      if (lineState === "Active") {
        if (Blurring_LastLine !== index) {
          applyBlur(arr, index, BlurMultiplier);
          Blurring_LastLine = index;
        }
        if (!line.HTMLElement.classList.contains("Active")) {
          line.HTMLElement.classList.add("Active");
        }
        if (line.HTMLElement.classList.contains("NotSung")) {
          line.HTMLElement.classList.remove("NotSung");
        }
        if (line.HTMLElement.classList.contains("Sung")) {
          line.HTMLElement.classList.remove("Sung");
        }
        if (line.DotLine) {
          if (ProcessedPosition > line.EndTime - preHiddenDotLineMs) {
            if (!line.HTMLElement.classList.contains("pre-hidden")) {
              line.HTMLElement.classList.add("pre-hidden");
            }
          } else {
            if (line.HTMLElement.classList.contains("pre-hidden")) {
              line.HTMLElement.classList.remove("pre-hidden");
            }
          }
        }
        if (!line.Syllables?.Lead) {
          console.warn("Line has no Syllables.Lead array");
          continue;
        }
        const words = line.Syllables.Lead;
        for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
          const word = words[wordIndex];
          const wordState = getElementState(ProcessedPosition, word.StartTime, word.EndTime);
          const percentage = getProgressPercentage(ProcessedPosition, word.StartTime, word.EndTime);
          const isLetterGroup = word?.LetterGroup;
          const isDot = word?.Dot;
          if (!isDot) {
            if (!word.AnimatorStore) {
              word.AnimatorStore = createWordSprings();
              word.AnimatorStore.Scale.SetGoal(ScaleSpline.at(0), true);
              word.AnimatorStore.YOffset.SetGoal(YOffsetSpline.at(0), true);
              word.AnimatorStore.Glow.SetGoal(GlowSpline.at(0), true);
            }
            let targetScale;
            let targetYOffset;
            let targetGlow;
            let targetGradientPos;
            const totalDuration = word.EndTime - word.StartTime;
            if (wordState === "Active") {
              targetScale = ScaleSpline.at(percentage);
              targetYOffset = YOffsetSpline.at(percentage);
              targetGlow = GlowSpline.at(percentage);
              if ($simpleLyricsMode.get()) {
                targetGradientPos = -50 + 120 * percentage;
              } else {
                targetGradientPos = -20 + 120 * percentage;
              }
            } else if (wordState === "NotSung") {
              targetScale = ScaleSpline.at(0);
              targetYOffset = YOffsetSpline.at(0);
              targetGlow = GlowSpline.at(0);
              if ($simpleLyricsMode.get()) {
                targetGradientPos = -50;
              } else {
                targetGradientPos = -20;
              }
            } else {
              targetScale = ScaleSpline.at(1);
              targetYOffset = YOffsetSpline.at(1);
              targetGlow = GlowSpline.at(1);
              targetGradientPos = 100;
            }
            word.AnimatorStore.Scale.SetGoal(targetScale);
            word.AnimatorStore.YOffset.SetGoal(targetYOffset);
            word.AnimatorStore.Glow.SetGoal(targetGlow);
            const currentScale = word.AnimatorStore.Scale.Step(deltaTime);
            const currentYOffset = word.AnimatorStore.YOffset.Step(deltaTime);
            const currentGlow = word.AnimatorStore.Glow.Step(deltaTime);
            setStyleIfChanged(word.HTMLElement, "scale", `${currentScale}`, 1e-3);
            setStyleIfChanged(
              word.HTMLElement,
              "transform",
              `translate3d(0, calc(var(--DefaultLyricsSize) * ${currentYOffset}), 0)`,
              1e-4,
              currentYOffset
            );
            if (isLetterGroup) {
              if ($simpleLyricsMode.get()) {
                if (wordState === "Active") {
                  if ($simpleLyricsModeRenderingType.get() === "animate") {
                    const nextWord = words[wordIndex + 1];
                    if (nextWord && !nextWord?.LetterGroup) {
                      if (!nextWord.PreSLMAnimated) {
                        nextWord.PreSLMAnimated = true;
                        nextWord.HTMLElement.style.removeProperty("--SLM_GradientPosition");
                        setTimeout(
                          () => {
                            nextWord.HTMLElement.style.animation = getPreSLMAnimation(250);
                          },
                          Number(totalDuration * 0.845 - 130) ?? totalDuration
                        );
                      }
                    }
                  }
                }
              }
            }
            if (!isLetterGroup) {
              if ($simpleLyricsMode.get()) {
                if (wordState === "Active" && !word.SLMAnimated) {
                  if ($simpleLyricsModeRenderingType.get() === "calculate") {
                    word.HTMLElement.style.setProperty(
                      "--SLM_GradientPosition",
                      `${targetGradientPos}%`
                    );
                  } else {
                    word.HTMLElement.style.removeProperty("--SLM_GradientPosition");
                    word.HTMLElement.style.animation = getSLMAnimation(totalDuration);
                    word.SLMAnimated = true;
                    word.PreSLMAnimated = false;
                    const nextWord = words[wordIndex + 1];
                    if (nextWord) {
                      if (!nextWord.PreSLMAnimated) {
                        nextWord.PreSLMAnimated = true;
                        nextWord.HTMLElement.style.removeProperty("--SLM_GradientPosition");
                        setTimeout(
                          () => {
                            nextWord.HTMLElement.style.animation = getPreSLMAnimation(125);
                          },
                          Number(totalDuration * 0.6 - 22) ?? totalDuration
                        );
                      }
                    }
                  }
                }
                if (wordState === "NotSung") {
                  if ($simpleLyricsModeRenderingType.get() === "calculate") {
                    word.HTMLElement.style.setProperty(
                      "--SLM_GradientPosition",
                      `${targetGradientPos}%`
                    );
                  } else {
                    if (!word.PreSLMAnimated) {
                      word.HTMLElement.style.animation = "none";
                      word.HTMLElement.style.setProperty("--SLM_GradientPosition", "-50%");
                    }
                    word.SLMAnimated = false;
                  }
                }
                if (wordState === "Sung") {
                  if ($simpleLyricsModeRenderingType.get() === "calculate") {
                    word.HTMLElement.style.setProperty(
                      "--SLM_GradientPosition",
                      `${targetGradientPos}%`
                    );
                  } else {
                    word.HTMLElement.style.animation = "none";
                    word.HTMLElement.style.setProperty("--SLM_GradientPosition", "100%");
                    word.SLMAnimated = false;
                    word.PreSLMAnimated = false;
                  }
                }
              } else {
                setStyleIfChanged(word.HTMLElement, "--gradient-position", `${targetGradientPos}%`);
              }
              setStyleIfChanged(
                word.HTMLElement,
                "--text-shadow-blur-radius",
                `${4 + 2 * currentGlow * 1}px`,
                0.5
              );
              setStyleIfChanged(
                word.HTMLElement,
                "--text-shadow-opacity",
                `${Math.min(currentGlow * 35, 100)}%`,
                1
              );
            }
          } else if (isDot && !isLetterGroup) {
            if (!word.AnimatorStore) {
              word.AnimatorStore = createDotSprings();
              word.AnimatorStore.Scale.SetGoal(DotScaleSpline.at(0), true);
              word.AnimatorStore.YOffset.SetGoal(DotYOffsetSpline.at(0), true);
              word.AnimatorStore.Glow.SetGoal(DotGlowSpline.at(0), true);
              word.AnimatorStore.Opacity.SetGoal(DotOpacitySpline.at(0), true);
            }
            let targetScale;
            let targetYOffset;
            let targetGlow;
            let targetOpacity;
            if (wordState === "Active") {
              targetScale = DotScaleSpline.at(percentage);
              targetYOffset = DotYOffsetSpline.at(percentage);
              targetGlow = DotGlowSpline.at(percentage);
              targetOpacity = DotOpacitySpline.at(percentage);
            } else if (wordState === "NotSung") {
              targetScale = DotScaleSpline.at(0);
              targetYOffset = DotYOffsetSpline.at(0);
              targetGlow = DotGlowSpline.at(0);
              targetOpacity = DotOpacitySpline.at(0);
            } else {
              targetScale = DotScaleSpline.at(1);
              targetYOffset = DotYOffsetSpline.at(1);
              targetGlow = DotGlowSpline.at(1);
              targetOpacity = DotOpacitySpline.at(1);
            }
            word.AnimatorStore.Scale.SetGoal(targetScale);
            word.AnimatorStore.YOffset.SetGoal(targetYOffset);
            word.AnimatorStore.Glow.SetGoal(targetGlow);
            word.AnimatorStore.Opacity.SetGoal(targetOpacity);
            const currentScale = word.AnimatorStore.Scale.Step(deltaTime);
            const currentYOffset = word.AnimatorStore.YOffset.Step(deltaTime);
            const currentGlow = word.AnimatorStore.Glow.Step(deltaTime);
            const currentOpacity = word.AnimatorStore.Opacity.Step(deltaTime);
            setStyleIfChanged(
              word.HTMLElement,
              "transform",
              `translate3d(0, calc(var(--DefaultLyricsSize) * ${currentYOffset ?? 0}), 0)`,
              1e-4,
              currentYOffset ?? 0
            );
            setStyleIfChanged(word.HTMLElement, "scale", `${currentScale}`, 1e-3);
            setStyleIfChanged(word.HTMLElement, "opacity", `${currentOpacity}`, 1e-3);
            setStyleIfChanged(
              word.HTMLElement,
              "--text-shadow-blur-radius",
              `${4 + 6 * currentGlow}px`,
              0.5
            );
            setStyleIfChanged(
              word.HTMLElement,
              "--text-shadow-opacity",
              `${currentGlow * 90}%`,
              1
            );
          }
          if (isLetterGroup && word.Letters) {
            if (wordState === "Active") {
              for (let k = 0; k < word.Letters.length; k++) {
                const letter = word.Letters[k];
                if (!letter.AnimatorStore) {
                  letter.AnimatorStore = createLetterSprings();
                  letter.AnimatorStore.Scale.SetGoal(LetterScaleSpline.at(0), true);
                  letter.AnimatorStore.YOffset.SetGoal(LetterYOffsetSpline.at(0), true);
                  letter.AnimatorStore.Glow.SetGoal(GlowSpline.at(0), true);
                }
                let targetScale, targetYOffset, targetGlow, targetGradient;
                let activeLetterIndex = -1;
                let activeLetterPercentage = 0;
                if (wordState === "Active" && word.Letters) {
                  for (let i = 0; i < word.Letters.length; i++) {
                    if (getElementState(
                      ProcessedPosition,
                      word.Letters[i].StartTime,
                      word.Letters[i].EndTime
                    ) === "Active") {
                      activeLetterIndex = i;
                      activeLetterPercentage = getProgressPercentage(
                        ProcessedPosition,
                        word.Letters[i].StartTime,
                        word.Letters[i].EndTime
                      );
                      break;
                    }
                  }
                }
                targetScale = LetterScaleSpline.at(0);
                targetYOffset = LetterYOffsetSpline.at(0);
                targetGlow = GlowSpline.at(0);
                const letterState = getElementState(
                  ProcessedPosition,
                  letter.StartTime,
                  letter.EndTime
                );
                if (activeLetterIndex !== -1) {
                  const percentageCount = $simpleLyricsMode.get() ? getProgressPercentage(ProcessedPosition, word.StartTime, word.EndTime) : activeLetterPercentage;
                  const config = SimpleLyricsMode_LetterEffectsStrengthConfig;
                  const baseScale = LetterScaleSpline.at(percentageCount) * ($simpleLyricsMode.get() ? word.TotalTime > config.LongerThan ? config.Longer.Scale : config.Shorter.Scale : 1);
                  const baseYOffset = LetterYOffsetSpline.at(percentageCount) * ($simpleLyricsMode.get() ? word.TotalTime > config.LongerThan ? config.Longer.YOffset : config.Shorter.YOffset : 1);
                  const baseGlow = GlowSpline.at(percentageCount) * ($simpleLyricsMode.get() ? word.TotalTime > config.LongerThan ? config.Longer.Glow : config.Shorter.Glow : 1);
                  const restingScale = LetterScaleSpline.at(0);
                  const restingYOffset = LetterYOffsetSpline.at(0);
                  const restingGlow = GlowSpline.at(0);
                  const distance = Math.abs(k - activeLetterIndex);
                  const falloff = Math.max(0, 1 / (1 + Math.pow(distance, 2.8)));
                  const glowFalloff = Math.max(0, 1 / (1 + distance * 0.9));
                  targetScale = restingScale + (baseScale - restingScale) * falloff;
                  targetYOffset = restingYOffset + (baseYOffset - restingYOffset) * falloff;
                  targetGlow = restingGlow + (baseGlow - restingGlow) * glowFalloff;
                }
                if (letterState === "NotSung" && !$simpleLyricsMode.get()) {
                  targetScale = LetterScaleSpline.at(0);
                  targetYOffset = LetterYOffsetSpline.at(0);
                  targetGlow = GlowSpline.at(0);
                } else if (letterState === "Sung" && activeLetterIndex === -1) {
                  targetGlow = GlowSpline.at(SungLetterGlow);
                }
                if (letterState === "NotSung") {
                  if ($simpleLyricsMode.get()) {
                    targetGradient = -50;
                  } else {
                    targetGradient = -20;
                  }
                } else if (letterState === "Sung") {
                  targetGradient = 100;
                } else {
                  targetGradient = k === activeLetterIndex ? -20 + 120 * sinOut(activeLetterPercentage) : -20;
                  if ($simpleLyricsMode.get()) {
                    targetGradient = k === activeLetterIndex ? -50 + 120 * sinOut(activeLetterPercentage) : -50;
                  } else {
                    targetGradient = k === activeLetterIndex ? -20 + 120 * sinOut(activeLetterPercentage) : -20;
                  }
                }
                letter.AnimatorStore.Scale.SetGoal(targetScale);
                letter.AnimatorStore.YOffset.SetGoal(targetYOffset);
                letter.AnimatorStore.Glow.SetGoal(targetGlow);
                const currentScale = letter.AnimatorStore.Scale.Step(deltaTime);
                const currentYOffset = letter.AnimatorStore.YOffset.Step(deltaTime);
                const currentGlow = letter.AnimatorStore.Glow.Step(deltaTime);
                const totalDuration = letter.EndTime - letter.StartTime;
                if ($simpleLyricsMode.get()) {
                  if ($simpleLyricsModeRenderingType.get() === "calculate") {
                    letter.HTMLElement.style.setProperty(
                      "--SLM_GradientPosition",
                      `${targetGradient}%`
                    );
                  } else {
                    if (letterState === "Active" && !letter.SLMAnimated) {
                      letter.HTMLElement.style.removeProperty("--SLM_GradientPosition");
                      letter.HTMLElement.style.animation = getSLMAnimation(totalDuration);
                      letter.SLMAnimated = true;
                    }
                    if (letterState === "NotSung") {
                      if (!letter.PreSLMAnimated) {
                        letter.HTMLElement.style.animation = "none";
                        letter.HTMLElement.style.setProperty("--SLM_GradientPosition", "-50%");
                      }
                      letter.SLMAnimated = false;
                    }
                    if (letterState === "Sung") {
                      letter.HTMLElement.style.animation = "none";
                      letter.HTMLElement.style.setProperty("--SLM_GradientPosition", "100%");
                      letter.SLMAnimated = false;
                    }
                  }
                } else {
                  setStyleIfChanged(letter.HTMLElement, "--gradient-position", `${targetGradient}%`);
                }
                setStyleIfChanged(
                  letter.HTMLElement,
                  "transform",
                  `translate3d(0, calc(var(--DefaultLyricsSize) * ${currentYOffset * 2}), 0)`,
                  1e-4,
                  currentYOffset * 2
                );
                setStyleIfChanged(letter.HTMLElement, "scale", `${currentScale}`, 1e-3);
                setStyleIfChanged(
                  letter.HTMLElement,
                  "--text-shadow-blur-radius",
                  `${4 + 12 * currentGlow}px`,
                  0.5
                );
                setStyleIfChanged(
                  letter.HTMLElement,
                  "--text-shadow-opacity",
                  `${currentGlow * LetterGlowMultiplier_Opacity}%`,
                  1
                );
              }
            } else if (wordState === "NotSung" && word.Letters) {
              for (let k = 0; k < word.Letters.length; k++) {
                const letter = word.Letters[k];
                if (!letter.AnimatorStore) {
                  letter.AnimatorStore = createLetterSprings();
                  letter.AnimatorStore.Scale.SetGoal(LetterScaleSpline.at(0), true);
                  letter.AnimatorStore.YOffset.SetGoal(LetterYOffsetSpline.at(0), true);
                  letter.AnimatorStore.Glow.SetGoal(GlowSpline.at(0), true);
                }
                letter.AnimatorStore.Scale.SetGoal(LetterScaleSpline.at(0));
                letter.AnimatorStore.YOffset.SetGoal(LetterYOffsetSpline.at(0));
                letter.AnimatorStore.Glow.SetGoal(GlowSpline.at(0));
                const currentScale = letter.AnimatorStore.Scale.Step(deltaTime);
                const currentYOffset = letter.AnimatorStore.YOffset.Step(deltaTime);
                const currentGlow = letter.AnimatorStore.Glow.Step(deltaTime);
                if ($simpleLyricsMode.get()) {
                  letter.HTMLElement.style.animation = "none";
                  letter.HTMLElement.style.setProperty("--SLM_GradientPosition", "-50%");
                } else {
                  setStyleIfChanged(letter.HTMLElement, "--gradient-position", `-20%`);
                }
                setStyleIfChanged(
                  letter.HTMLElement,
                  "transform",
                  `translate3d(0, calc(var(--DefaultLyricsSize) * ${currentYOffset * 2}), 0)`,
                  1e-4,
                  currentYOffset * 2
                );
                setStyleIfChanged(letter.HTMLElement, "scale", `${currentScale}`, 1e-3);
                setStyleIfChanged(
                  letter.HTMLElement,
                  "--text-shadow-blur-radius",
                  `${4 + 12 * currentGlow}px`,
                  0.5
                );
                setStyleIfChanged(
                  letter.HTMLElement,
                  "--text-shadow-opacity",
                  `${currentGlow * LetterGlowMultiplier_Opacity}%`,
                  1
                );
              }
            } else if (wordState === "Sung" && word.Letters) {
              for (let k = 0; k < word.Letters.length; k++) {
                const letter = word.Letters[k];
                if (!letter.AnimatorStore) {
                  letter.AnimatorStore = createLetterSprings();
                  letter.AnimatorStore.Scale.SetGoal(LetterScaleSpline.at(0), true);
                  letter.AnimatorStore.YOffset.SetGoal(LetterYOffsetSpline.at(0), true);
                  letter.AnimatorStore.Glow.SetGoal(GlowSpline.at(0), true);
                }
                letter.AnimatorStore.Scale.SetGoal(LetterScaleSpline.at(1));
                letter.AnimatorStore.YOffset.SetGoal(LetterYOffsetSpline.at(1));
                letter.AnimatorStore.Glow.SetGoal(GlowSpline.at(1));
                const currentScale = letter.AnimatorStore.Scale.Step(deltaTime);
                const currentYOffset = letter.AnimatorStore.YOffset.Step(deltaTime);
                const currentGlow = letter.AnimatorStore.Glow.Step(deltaTime);
                if ($simpleLyricsMode.get()) {
                  letter.HTMLElement.style.animation = "none";
                  letter.HTMLElement.style.setProperty("--SLM_GradientPosition", "100%");
                } else {
                  setStyleIfChanged(letter.HTMLElement, "--gradient-position", `100%`);
                }
                setStyleIfChanged(
                  letter.HTMLElement,
                  "transform",
                  `translate3d(0, calc(var(--DefaultLyricsSize) * ${currentYOffset * 2}), 0)`,
                  1e-4,
                  currentYOffset * 2
                );
                setStyleIfChanged(letter.HTMLElement, "scale", `${currentScale}`, 1e-3);
                setStyleIfChanged(
                  letter.HTMLElement,
                  "--text-shadow-blur-radius",
                  `${4 + 12 * currentGlow}px`,
                  0.5
                );
                setStyleIfChanged(
                  letter.HTMLElement,
                  "--text-shadow-opacity",
                  `${currentGlow * LetterGlowMultiplier_Opacity}%`,
                  1
                );
              }
            }
          }
        }
      } else if (lineState === "NotSung") {
        setClass(line.HTMLElement, "NotSung", true);
        setClass(line.HTMLElement, "Sung", false);
        if (line.HTMLElement.classList.contains("Active")) {
          line.HTMLElement.classList.remove("Active");
        }
        if (line.DotLine && !line.HTMLElement.classList.contains("pre-hidden")) {
          line.HTMLElement.classList.add("pre-hidden");
        }
      } else if (lineState === "Sung") {
        setClass(line.HTMLElement, "Sung", true);
        setClass(line.HTMLElement, "Active", false);
        setClass(line.HTMLElement, "NotSung", false);
        if (line.DotLine && line.HTMLElement.classList.contains("pre-hidden")) {
          line.HTMLElement.classList.remove("pre-hidden");
        }
        if (arr.length === index + 1) {
        }
        const checkNextLine = () => {
          const words = line.Syllables?.Lead;
          if (!words) return;
          for (let i = 0; i < words.length; i++) {
            const word = words[i];
            if (word.AnimatorStore && !word.Dot) {
              word.AnimatorStore.Scale.SetGoal(ScaleSpline.at(1));
              word.AnimatorStore.YOffset.SetGoal(YOffsetSpline.at(1));
              word.AnimatorStore.Glow.SetGoal(GlowSpline.at(1));
              const currentScale = word.AnimatorStore.Scale.Step(deltaTime);
              const currentYOffset = word.AnimatorStore.YOffset.Step(deltaTime);
              const currentGlow = word.AnimatorStore.Glow.Step(deltaTime);
              setStyleIfChanged(
                word.HTMLElement,
                "transform",
                `translate3d(0, calc(var(--DefaultLyricsSize) * ${currentYOffset}), 0)`,
                1e-4,
                currentYOffset
              );
              setStyleIfChanged(word.HTMLElement, "scale", `${currentScale}`, 1e-3);
              if (!word.LetterGroup) {
                if ($simpleLyricsMode.get()) {
                  word.HTMLElement.style.animation = "none";
                  word.HTMLElement.style.setProperty("--SLM_GradientPosition", "100%");
                } else {
                  setStyleIfChanged(word.HTMLElement, "--gradient-position", "100%");
                }
                setStyleIfChanged(
                  word.HTMLElement,
                  "--text-shadow-blur-radius",
                  `${4 + 2 * currentGlow * 1}px`,
                  0.5
                );
                setStyleIfChanged(
                  word.HTMLElement,
                  "--text-shadow-opacity",
                  `${Math.min(currentGlow * 35, 100)}%`,
                  1
                );
              }
            } else if (word.AnimatorStore && word.Dot && !word.LetterGroup) {
              word.AnimatorStore.Scale.SetGoal(DotScaleSpline.at(1));
              word.AnimatorStore.YOffset.SetGoal(DotYOffsetSpline.at(1));
              word.AnimatorStore.Glow.SetGoal(DotGlowSpline.at(1));
              word.AnimatorStore.Opacity.SetGoal(DotOpacitySpline.at(1));
              const currentScale = word.AnimatorStore.Scale.Step(deltaTime);
              const currentYOffset = word.AnimatorStore.YOffset.Step(deltaTime);
              const currentGlow = word.AnimatorStore.Glow.Step(deltaTime);
              const currentOpacity = word.AnimatorStore.Opacity.Step(deltaTime);
              setStyleIfChanged(
                word.HTMLElement,
                "transform",
                `translate3d(0, calc(var(--DefaultLyricsSize) * ${currentYOffset ?? 0}), 0)`,
                1e-4,
                currentYOffset ?? 0
              );
              setStyleIfChanged(word.HTMLElement, "scale", `${currentScale}`, 1e-3);
              setStyleIfChanged(word.HTMLElement, "opacity", `${currentOpacity}`, 1e-3);
              setStyleIfChanged(
                word.HTMLElement,
                "--text-shadow-blur-radius",
                `${4 + 6 * currentGlow}px`,
                0.5
              );
              setStyleIfChanged(
                word.HTMLElement,
                "--text-shadow-opacity",
                `${currentGlow * 90}%`,
                1
              );
            }
            if (word.LetterGroup && word.Letters) {
              for (let k = 0; k < word.Letters.length; k++) {
                const letter = word.Letters[k];
                if (!letter.AnimatorStore) {
                  letter.AnimatorStore = createLetterSprings();
                  letter.AnimatorStore.Scale.SetGoal(LetterScaleSpline.at(0), true);
                  letter.AnimatorStore.YOffset.SetGoal(LetterYOffsetSpline.at(0), true);
                  letter.AnimatorStore.Glow.SetGoal(GlowSpline.at(0), true);
                }
                letter.AnimatorStore.Scale.SetGoal(LetterScaleSpline.at(1));
                letter.AnimatorStore.YOffset.SetGoal(LetterYOffsetSpline.at(1));
                letter.AnimatorStore.Glow.SetGoal(GlowSpline.at(1));
                const currentScale = letter.AnimatorStore.Scale.Step(deltaTime);
                const currentYOffset = letter.AnimatorStore.YOffset.Step(deltaTime);
                const currentGlow = letter.AnimatorStore.Glow.Step(deltaTime);
                if ($simpleLyricsMode.get()) {
                  letter.HTMLElement.style.animation = "none";
                  letter.HTMLElement.style.setProperty("--SLM_GradientPosition", "100%");
                } else {
                  setStyleIfChanged(letter.HTMLElement, "--gradient-position", `100%`);
                }
                setStyleIfChanged(
                  letter.HTMLElement,
                  "transform",
                  `translate3d(0, calc(var(--DefaultLyricsSize) * ${currentYOffset * 2}), 0)`,
                  1e-4,
                  currentYOffset * 2
                );
                setStyleIfChanged(letter.HTMLElement, "scale", `${currentScale}`, 1e-3);
                setStyleIfChanged(
                  letter.HTMLElement,
                  "--text-shadow-blur-radius",
                  `${4 + 12 * currentGlow}px`,
                  0.5
                );
                setStyleIfChanged(
                  letter.HTMLElement,
                  "--text-shadow-opacity",
                  `${currentGlow * LetterGlowMultiplier_Opacity}%`,
                  1
                );
              }
            }
          }
        };
        {
          const NextLine = arr[index + 1];
          if (NextLine) {
            const nextLineStatus = getElementState(
              ProcessedPosition,
              NextLine.StartTime,
              NextLine.EndTime
            );
            if (nextLineStatus === "NotSung" || nextLineStatus === "Active") {
              checkNextLine();
            }
          } else if (!NextLine) {
            checkNextLine();
          }
        }
      }
    }
  } else if (CurrentLyricsType === "Line") {
    const arr = LyricsObject.Types.Line.Lines;
    for (let index = 0; index < arr.length; index++) {
      const line = arr[index];
      if (!line.HTMLElement.isConnected) continue;
      const lineState = getElementState(ProcessedPosition, line.StartTime, line.EndTime);
      mountedLine ??= line.HTMLElement;
      if (lineState !== "Sung") anyLineUnsung = true;
      if (lineState === "Active") {
        if (Blurring_LastLine !== index) {
          applyBlur(arr, index, BlurMultiplier);
          Blurring_LastLine = index;
        }
        if (!line.HTMLElement.classList.contains("Active")) {
          line.HTMLElement.classList.add("Active");
        }
        if (line.HTMLElement.classList.contains("NotSung")) {
          line.HTMLElement.classList.remove("NotSung");
        }
        if (line.HTMLElement.classList.contains("Sung")) {
          line.HTMLElement.classList.remove("Sung");
        }
        if (line.DotLine) {
          if (ProcessedPosition > line.EndTime - preHiddenDotLineMs) {
            if (!line.HTMLElement.classList.contains("pre-hidden")) {
              line.HTMLElement.classList.add("pre-hidden");
            }
          } else {
            if (line.HTMLElement.classList.contains("pre-hidden")) {
              line.HTMLElement.classList.remove("pre-hidden");
            }
          }
        }
        const percentage = getProgressPercentage(ProcessedPosition, line.StartTime, line.EndTime);
        if (line.DotLine && line.Syllables?.Lead) {
          const dotArray = line.Syllables.Lead;
          for (let i = 0; i < dotArray.length; i++) {
            const dot = dotArray[i];
            const dotState = getElementState(ProcessedPosition, dot.StartTime, dot.EndTime);
            const dotPercentage = getProgressPercentage(
              ProcessedPosition,
              dot.StartTime,
              dot.EndTime
            );
            if (!dot.AnimatorStore) {
              dot.AnimatorStore = createDotSprings();
              dot.AnimatorStore.Scale.SetGoal(DotScaleSpline.at(0), true);
              dot.AnimatorStore.YOffset.SetGoal(DotYOffsetSpline.at(0), true);
              dot.AnimatorStore.Glow.SetGoal(DotGlowSpline.at(0), true);
              dot.AnimatorStore.Opacity.SetGoal(DotOpacitySpline.at(0), true);
            }
            let targetScale;
            let targetYOffset;
            let targetGlow;
            let targetOpacity;
            if (dotState === "Active") {
              targetScale = DotScaleSpline.at(dotPercentage);
              targetYOffset = DotYOffsetSpline.at(dotPercentage);
              targetGlow = DotGlowSpline.at(dotPercentage);
              targetOpacity = DotOpacitySpline.at(dotPercentage);
            } else if (dotState === "NotSung") {
              targetScale = DotScaleSpline.at(0);
              targetYOffset = DotYOffsetSpline.at(0);
              targetGlow = DotGlowSpline.at(0);
              targetOpacity = DotOpacitySpline.at(0);
            } else {
              targetScale = DotScaleSpline.at(1);
              targetYOffset = DotYOffsetSpline.at(1);
              targetGlow = DotGlowSpline.at(1);
              targetOpacity = DotOpacitySpline.at(1);
            }
            dot.AnimatorStore.Scale.SetGoal(targetScale);
            dot.AnimatorStore.YOffset.SetGoal(targetYOffset);
            dot.AnimatorStore.Glow.SetGoal(targetGlow);
            dot.AnimatorStore.Opacity.SetGoal(targetOpacity);
            const currentScale = dot.AnimatorStore.Scale.Step(deltaTime);
            const currentYOffset = dot.AnimatorStore.YOffset.Step(deltaTime);
            const currentGlow = dot.AnimatorStore.Glow.Step(deltaTime);
            const currentOpacity = dot.AnimatorStore.Opacity.Step(deltaTime);
            setStyleIfChanged(
              dot.HTMLElement,
              "transform",
              `translate3d(0, calc(var(--DefaultLyricsSize) * ${currentYOffset ?? 0}), 0)`,
              1e-4,
              currentYOffset ?? 0
            );
            setStyleIfChanged(dot.HTMLElement, "scale", `${currentScale}`, 1e-3);
            setStyleIfChanged(dot.HTMLElement, "opacity", `${currentOpacity}`, 1e-3);
            setStyleIfChanged(
              dot.HTMLElement,
              "--text-shadow-blur-radius",
              `${4 + 6 * currentGlow}px`,
              0.5
            );
            setStyleIfChanged(
              dot.HTMLElement,
              "--text-shadow-opacity",
              `${currentGlow * 90}%`,
              1
            );
          }
        } else {
          if (!line.AnimatorStore) {
            line.AnimatorStore = createLineSprings();
            line.AnimatorStore.Glow.SetGoal(LineGlowSpline.at(0), true);
          }
          let targetGlow;
          let targetGradientPos;
          if (lineState === "Active") {
            targetGlow = LineGlowSpline.at(percentage);
            targetGradientPos = percentage * 100;
          } else if (lineState === "NotSung") {
            targetGlow = LineGlowSpline.at(0);
            targetGradientPos = -20;
          } else {
            targetGlow = LineGlowSpline.at(1);
            targetGradientPos = 100;
          }
          line.AnimatorStore.Glow.SetGoal(targetGlow);
          const currentGlow = line.AnimatorStore.Glow.Step(deltaTime);
          if (!$simpleLyricsMode.get()) {
            setStyleIfChanged(line.HTMLElement, "--gradient-position", `${targetGradientPos}%`);
            setStyleIfChanged(
              line.HTMLElement,
              "--text-shadow-blur-radius",
              `${4 + 8 * currentGlow}px`,
              0.5
            );
            setStyleIfChanged(
              line.HTMLElement,
              "--text-shadow-opacity",
              `${currentGlow * 50}%`,
              1
            );
          }
        }
      } else if (lineState === "NotSung") {
        if (!line.HTMLElement.classList.contains("NotSung")) {
          line.HTMLElement.classList.add("NotSung");
        }
        setClass(line.HTMLElement, "Sung", false);
        if (line.HTMLElement.classList.contains("Active")) {
          line.HTMLElement.classList.remove("Active");
        }
        if (line.DotLine && !line.HTMLElement.classList.contains("pre-hidden")) {
          line.HTMLElement.classList.add("pre-hidden");
        }
      } else if (lineState === "Sung") {
        if (!line.HTMLElement.classList.contains("Sung")) {
          line.HTMLElement.classList.add("Sung");
        }
        setClass(line.HTMLElement, "Active", false);
        setClass(line.HTMLElement, "NotSung", false);
        if (line.DotLine && line.HTMLElement.classList.contains("pre-hidden")) {
          line.HTMLElement.classList.remove("pre-hidden");
        }
        if (arr.length === index + 1) {
        }
      }
    }
  }
  const lyricsContent = mountedLine?.closest(".LyricsContent");
  if (lyricsContent) setClass(lyricsContent, "LinesAllSung", !anyLineUnsung);
  flushStyleBatch();
}

// wallpaper/vendor/spicy-lyrics/src/utils/Lyrics/Animator/Lyrics/LyricsSetter.ts
function TimeSetter(PreCurrentPosition) {
  const CurrentPosition = PreCurrentPosition + timeOffset;
  const CurrentLyricsType = $currentLyricsType.get();
  if (CurrentLyricsType !== "Syllable" && CurrentLyricsType !== "Line") return;
  const lines = LyricsObject.Types[CurrentLyricsType].Lines;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (CurrentPosition < line.StartTime) line.Status = "NotSung";
    else if (CurrentPosition >= line.EndTime) line.Status = "Sung";
    else line.Status = "Active";
  }
}

// wallpaper/vendor/spicy-lyrics/src/utils/Lyrics/Animator/Main.ts
var Lyrics = {
  Animate,
  TimeSetter
};

// wallpaper/vendor/spicy-lyrics/src/utils/Lyrics/lyrics.ts
var getLyricsBetweenShow = () => $minimalLyricsMode.get() ? 5 : 3;
var SimpleLyricsMode_LetterEffectsStrengthConfig = {
  LongerThan: 1500,
  Longer: {
    Glow: 0.4,
    YOffset: 0.45,
    Scale: 1.103
  },
  Shorter: {
    Glow: 0.285,
    YOffset: 0.1,
    Scale: 1.09
  }
};
var LyricsObject = {
  Types: {
    Syllable: {
      Lines: []
    },
    Line: {
      Lines: []
    },
    Static: {
      Lines: []
    }
  }
};
var CurrentLineLyricsObject = LyricsObject.Types.Syllable.Lines.length - 1;
var LINE_SYNCED_CurrentLineLyricsObject = LyricsObject.Types.Line.Lines.length - 1;
function SetWordArrayInCurentLine() {
  CurrentLineLyricsObject = LyricsObject.Types.Syllable.Lines.length - 1;
  if (CurrentLineLyricsObject >= 0) {
    LyricsObject.Types.Syllable.Lines[CurrentLineLyricsObject].Syllables = {
      Lead: []
    };
  }
}
function SetWordArrayInCurentLine_LINE_SYNCED() {
  LINE_SYNCED_CurrentLineLyricsObject = LyricsObject.Types.Line.Lines.length - 1;
  if (LINE_SYNCED_CurrentLineLyricsObject >= 0) {
    LyricsObject.Types.Line.Lines[LINE_SYNCED_CurrentLineLyricsObject].Syllables = {
      Lead: []
    };
  }
}
function ClearLyricsContentArrays() {
  LyricsObject.Types.Syllable.Lines = [];
  LyricsObject.Types.Line.Lines = [];
  LyricsObject.Types.Static.Lines = [];
}
var LyricsInterval = () => {
  if ($lyricsContainerExists.get()) {
    const progress = SpotifyPlayer.GetPosition();
    Lyrics.TimeSetter(progress);
    Lyrics.Animate(progress);
  }
};
onAnimationFrame(LyricsInterval);
var isRomanized = $romanization.get();
var setRomanizedStatus = (val) => {
  isRomanized = val;
  $romanization.set(val);
};
var preHiddenDotLineMs = 500;
var getInterludeTimePadding = () => (preHiddenDotLineMs + 50) * -1;

// wallpaper/vendor/spicy-lyrics/src/utils/ScrollIntoView/Center.ts
function ScrollIntoCenterViewCSS(container, element, offset = 0, instantScroll = false) {
  const elementOffsetTop = element.offsetTop;
  const targetScrollTop = elementOffsetTop - (container.clientHeight / 2 - element.clientHeight / 2) - offset;
  if (instantScroll) {
    container.classList.add("InstantScroll");
  }
  container.scrollTop = targetScrollTop;
  if (instantScroll) {
    setTimeout(() => {
      container.classList.remove("InstantScroll");
    }, 50);
  }
}

// wallpaper/vendor/spicy-lyrics/src/utils/ScrollIntoView/Top.ts
function ScrollIntoTopViewCSS(container, element, offset = 0, instantScroll = false) {
  const elementOffsetTop = element.offsetTop;
  const targetScrollTop = elementOffsetTop - offset;
  if (instantScroll) {
    container.classList.add("InstantScroll");
  }
  container.scrollTop = targetScrollTop;
  if (instantScroll) {
    setTimeout(() => {
      container.classList.remove("InstantScroll");
    }, 50);
  }
}

// wallpaper/vendor/spicy-lyrics/src/utils/Scrolling/ScrollToActiveLine.ts
var lastLine = null;
var isUserScrolling = false;
var lastUserScrollTime = 0;
var lastPosition = 0;
var USER_SCROLL_COOLDOWN = 750;
var forceScrollQueued = false;
var smoothForceScrollQueued = false;
var currentSimpleBarInstance = null;
var wheelHandler = null;
var touchMoveHandler = null;
var wasDrasticPositionChange = (lastPosition2, newPosition) => {
  const positionChange = Math.abs(newPosition - lastPosition2);
  return positionChange > 1e3;
};
window.addEventListener("focus", ResetLastLine);
window.addEventListener("resize", ResetLastLine);
var lyricsContentObserver = new ResizeObserver(() => {
  ResetLastLine();
});
function setupLyricsContentObserver() {
  const lyricsContent = PageContainer?.querySelector(".LyricsContainer .LyricsContent");
  if (lyricsContent) {
    lyricsContentObserver.disconnect();
    lyricsContentObserver.observe(lyricsContent);
  }
}
function handleUserScroll(ScrollSimplebar2) {
  if (!ScrollSimplebar2) return;
  if (!isUserScrolling) {
    isUserScrolling = true;
    const lyricsContent = PageContainer?.querySelector(
      ".LyricsContainer .LyricsContent"
    );
    if (lyricsContent) {
      lyricsContent.classList.add("HideLineBlur");
    } else {
      console.warn(
        "SpicyLyrics: Could not find .LyricsContent in handleUserScroll to add HideLineBlur."
      );
    }
  }
  lastUserScrollTime = performance.now();
}
function InitializeScrollEvents(ScrollSimplebar2) {
  if (!$lyricsContainerExists.get()) return;
  currentSimpleBarInstance = ScrollSimplebar2;
  wheelHandler = () => handleUserScroll(currentSimpleBarInstance);
  touchMoveHandler = () => handleUserScroll(currentSimpleBarInstance);
  setupLyricsContentObserver();
  const scrollElement = ScrollSimplebar2?.getScrollElement();
  if (scrollElement && wheelHandler && touchMoveHandler) {
    scrollElement.removeEventListener("wheel", wheelHandler);
    scrollElement.removeEventListener("touchmove", touchMoveHandler);
    scrollElement.addEventListener("wheel", wheelHandler);
    scrollElement.addEventListener("touchmove", touchMoveHandler);
  }
}
var PIN_LOOKAHEAD = 2;
var IsBGLine = (line) => line.BGLine === true;
var ResolveToLeadIndex = (Lines, index) => {
  let i = index;
  while (i > 0 && IsBGLine(Lines[i])) i--;
  return i;
};
var GetGroupEndTime = (Lines, leadIdx) => {
  let end = Lines[leadIdx].EndTime;
  for (let i = leadIdx + 1; i < Lines.length && IsBGLine(Lines[i]); i++) {
    if (Lines[i].EndTime > end) end = Lines[i].EndTime;
  }
  return end;
};
var GetLookaheadLine = (Lines, leadIdx) => {
  let remaining = PIN_LOOKAHEAD;
  for (let i = leadIdx + 1; i < Lines.length; i++) {
    if (IsBGLine(Lines[i])) continue;
    if (--remaining === 0) return Lines[i];
  }
  return null;
};
var GetScrollLine = (Lines, ProcessedPosition) => {
  if ($currentLyricsType.get() === "Static" || $currentLyricsType.get() === "None" || !Lines)
    return;
  const activeIndices = [];
  for (let i = 0; i < Lines.length; i++) {
    const line = Lines[i];
    if (typeof line.StartTime === "number" && typeof line.EndTime === "number" && line.StartTime <= ProcessedPosition && line.EndTime >= ProcessedPosition) {
      activeIndices.push(i);
    }
  }
  if (activeIndices.length === 0) return null;
  const enhance = (index) => ({ ...Lines[index], _LineIndex: index });
  let frontLead = -1;
  for (const index of activeIndices) {
    const lead = ResolveToLeadIndex(Lines, index);
    if (lead > frontLead) frontLead = lead;
  }
  const activeLeads = [];
  for (const index of activeIndices) {
    const lead = ResolveToLeadIndex(Lines, index);
    if (IsBGLine(Lines[index]) && lead < frontLead) continue;
    if (activeLeads[activeLeads.length - 1] !== lead) activeLeads.push(lead);
  }
  const anchorIdx = activeLeads[0];
  const lookahead = GetLookaheadLine(Lines, anchorIdx);
  if (lookahead === null || GetGroupEndTime(Lines, anchorIdx) <= lookahead.StartTime) {
    return enhance(anchorIdx);
  }
  const firstIdx = activeLeads[0];
  const lastIdx = activeLeads[activeLeads.length - 1];
  return enhance(lastIdx - firstIdx <= 1 ? firstIdx : lastIdx);
};
var GetTopScrollOffset = (container) => IsPIP ? Math.min(50, Math.round(container.clientHeight * 0.2)) : 85;
var ScrollTo = (container, element, instantScroll = false, type = "Center", lineIndex) => {
  if (lineIndex !== void 0 && getLyricsVirtualizer()) {
    scrollLyricsToIndex(lineIndex, type === "Top" ? "start" : "center", instantScroll, type === "Top" ? -GetTopScrollOffset(container) : 30);
    return;
  }
  if (type === "Center") {
    ScrollIntoCenterViewCSS(container, element, -30, instantScroll);
  } else if (type === "Top") {
    ScrollIntoTopViewCSS(container, element, GetTopScrollOffset(container), instantScroll);
  }
};
var scrolledToLastLine = false;
var scrolledToFirstLine = false;
var VIEWPORT_CHECK_INTERVAL = 350;
var lastViewportCheckTime = 0;
var lastViewportLine = null;
var lastViewportContainer = null;
var lastIsLineInViewport = false;
var GetScrollType = () => {
  return IsCompactMode() ? "Top" : "Center";
};
var allowForceScrolling = true;
function ScrollToActiveLine(ScrollSimplebar2) {
  if ($currentLyricsType.get() === "Static" || $currentLyricsType.get() === "None") return;
  if (!$lyricsContainerExists.get()) return;
  const currentType = $currentLyricsType.get();
  const Lines = LyricsObject.Types[currentType]?.Lines;
  if (!Lines) return;
  const isForceScrollQueued = forceScrollQueued;
  const isSmoothForceScrollQueued = smoothForceScrollQueued;
  const Position = SpotifyPlayer.GetPosition();
  const PositionOffset = $scrollLeadEnabled.get() ? Math.max(0, $scrollLeadMs.get()) : 0;
  const ProcessedPosition = Position + PositionOffset;
  const currentLine = GetScrollLine(Lines, ProcessedPosition);
  let notSungCount = 0;
  let activeCount = 0;
  let sungCount = 0;
  for (let i = 0; i < Lines.length; i++) {
    const status = Lines[i].Status;
    if (status === "NotSung") notSungCount++;
    else if (status === "Active") activeCount++;
    else if (status === "Sung") sungCount++;
  }
  const allLinesNotSung = notSungCount === Lines.length;
  const oneActiveNoSung = activeCount === 1 && sungCount === 0;
  const allLinesSung = sungCount === Lines.length;
  const shouldForceScroll = isForceScrollQueued || lastLine == null;
  if (shouldForceScroll || !SpotifyPlayer.IsPlaying && lastPosition !== Position || lastPosition !== 0 && wasDrasticPositionChange(lastPosition ?? 0, Position)) {
    if (!allowForceScrolling) return;
    const container = ScrollSimplebar2?.getScrollElement();
    if (!container) return;
    isUserScrolling = false;
    const scrollToLine = allLinesSung ? Lines[Lines.length - 1]?.HTMLElement : currentLine?.HTMLElement;
    if (!scrollToLine) return;
    lastLine = scrollToLine;
    const forceScrollLineIndex = allLinesSung ? Lines.length - 1 : currentLine?._LineIndex;
    ScrollTo(
      container,
      scrollToLine,
      shouldForceScroll || lastPosition !== 0 && wasDrasticPositionChange(lastPosition ?? 0, Position),
      GetScrollType(),
      forceScrollLineIndex
    );
    if (forceScrollQueued) {
      forceScrollQueued = false;
    }
    lastPosition = Position;
    return;
  }
  lastPosition = Position;
  if (isSmoothForceScrollQueued) {
    if (!allowForceScrolling) return;
    const container = ScrollSimplebar2?.getScrollElement();
    if (!container) return;
    isUserScrolling = false;
    const scrollToLine = allLinesSung ? Lines[Lines.length - 1]?.HTMLElement : currentLine?.HTMLElement;
    if (!scrollToLine) return;
    lastLine = scrollToLine;
    const smoothScrollLineIndex = allLinesSung ? Lines.length - 1 : currentLine?._LineIndex;
    ScrollTo(container, scrollToLine, false, GetScrollType(), smoothScrollLineIndex);
    if (smoothForceScrollQueued) {
      smoothForceScrollQueued = false;
    }
    return;
  }
  if (!Lines) return;
  if (allLinesNotSung || oneActiveNoSung) {
    if (scrolledToFirstLine) return;
    QueueSmoothForceScroll();
    scrolledToFirstLine = true;
  }
  if (allLinesSung) {
    if (scrolledToLastLine) return;
    QueueSmoothForceScroll();
    scrolledToLastLine = true;
  }
  Continue(currentLine);
  function Continue(currentLine2) {
    if (currentLine2) {
      const LineElem = currentLine2?.HTMLElement;
      if (!LineElem) return;
      const container = ScrollSimplebar2?.getScrollElement();
      if (!container) return;
      const now2 = performance.now();
      const timeSinceLastScroll = now2 - lastUserScrollTime;
      const hasVirtualizer = getLyricsVirtualizer() !== null;
      const shouldRecalculateViewport = !hasVirtualizer && (now2 - lastViewportCheckTime > VIEWPORT_CHECK_INTERVAL || lastViewportLine !== LineElem || lastViewportContainer !== container);
      if (shouldRecalculateViewport) {
        const elementOffsetTop = LineElem.offsetTop;
        const elementBottom = elementOffsetTop + LineElem.clientHeight;
        const viewportTop = container.scrollTop;
        const viewportBottom = viewportTop + container.clientHeight;
        const visibleTop = Math.max(elementOffsetTop, viewportTop);
        const visibleBottom = Math.min(elementBottom, viewportBottom);
        const visibleHeight = Math.max(0, visibleBottom - visibleTop);
        lastIsLineInViewport = visibleHeight >= 5;
        lastViewportCheckTime = now2;
        lastViewportLine = LineElem;
        lastViewportContainer = container;
      }
      const isLineInViewport = hasVirtualizer ? LineElem.isConnected : lastIsLineInViewport;
      const isSameLine = lastLine === LineElem;
      if (timeSinceLastScroll > USER_SCROLL_COOLDOWN && isLineInViewport) {
        isUserScrolling = false;
        const lyricsContent = PageContainer?.querySelector(
          ".LyricsContainer .LyricsContent"
        );
        if (lyricsContent) {
          if (lyricsContent.classList.contains("HideLineBlur")) {
            lyricsContent.classList.remove("HideLineBlur");
          }
        } else {
          console.warn(
            "SpicyLyrics: Could not find .LyricsContent in ScrollToActiveLine to remove HideLineBlur."
          );
        }
        if (!isSameLine) {
          lastLine = LineElem;
          const Scroll = () => {
            ScrollTo(container, LineElem, false, GetScrollType(), currentLine2._LineIndex);
            scrolledToLastLine = false;
            scrolledToFirstLine = false;
          };
          if (!$smoothScrolling.get() && Lines[currentLine2._LineIndex - 1] && Lines[currentLine2._LineIndex - 1].DotLine === true) {
            setTimeout(() => {
              if (lastLine === LineElem) Scroll();
            }, 240);
          } else {
            Scroll();
          }
        }
      }
    }
  }
}
function QueueForceScroll() {
  forceScrollQueued = true;
}
function QueueSmoothForceScroll() {
  smoothForceScrollQueued = true;
}
function ResetLastLine() {
  lastLine = null;
  lastViewportLine = null;
  lastViewportContainer = null;
  lastIsLineInViewport = false;
  lastViewportCheckTime = 0;
  isUserScrolling = false;
  lastUserScrollTime = 0;
  lastPosition = 0;
  forceScrollQueued = false;
  smoothForceScrollQueued = false;
  scrolledToLastLine = false;
  scrolledToFirstLine = false;
}
function CleanupScrollEvents() {
  const scrollElement = currentSimpleBarInstance?.getScrollElement();
  if (scrollElement) {
    if (wheelHandler) {
      scrollElement.removeEventListener("wheel", wheelHandler);
    }
    if (touchMoveHandler) {
      scrollElement.removeEventListener("touchmove", touchMoveHandler);
    }
  }
  lyricsContentObserver?.disconnect();
  currentSimpleBarInstance = null;
  wheelHandler = null;
  touchMoveHandler = null;
  forceScrollQueued = false;
  smoothForceScrollQueued = false;
  scrolledToLastLine = false;
  scrolledToFirstLine = false;
}

// wallpaper/vendor/spicy-lyrics/src/utils/Lyrics/Applyer/CreateLyricsContainer.ts
var LyricsContainerInstances = /* @__PURE__ */ new Map();
var lastMapIndex = -1;
var CreateLyricsContainer = () => {
  const Container = document.createElement("div");
  Container.classList.add("SpicyLyricsScrollContainer");
  lastMapIndex += 1;
  const currentIndex = lastMapIndex;
  let resizeRAF = null;
  const Resize = () => {
    if (resizeRAF !== null) return;
    resizeRAF = requestAnimationFrame(() => {
      resizeRAF = null;
      QueueForceScroll();
      ScrollSimplebar?.recalculate();
    });
  };
  const ResizeListener = new ResizeObserver(() => {
    Resize();
  });
  const Remove = () => {
    if (resizeRAF !== null) {
      cancelAnimationFrame(resizeRAF);
      resizeRAF = null;
    }
    ResizeListener.unobserve(Container.parentElement);
    ResizeListener.disconnect();
    Container.remove();
    LyricsContainerInstances.delete(currentIndex);
  };
  const ReturnObject = {
    Container,
    ResizeListener,
    Append: (AppendTo) => {
      AppendTo.appendChild(Container);
      ResizeListener.observe(Container.parentElement);
    },
    Remove,
    Resize
  };
  LyricsContainerInstances.set(currentIndex, ReturnObject);
  return ReturnObject;
};
var DestroyAllLyricsContainers = () => {
  destroyLyricsVirtualizer();
  LyricsContainerInstances.forEach((Instance) => {
    Instance.Remove();
  });
  LyricsContainerInstances.clear();
  lastMapIndex = -1;
};

// wallpaper/vendor/spicy-lyrics/src/utils/Lyrics/Applyer/Utils/StripZeroWidth.ts
var ZeroWidthRegex = /[\u200B\u200E\u200F\u2060\uFEFF]/g;
function StripZeroWidth(text) {
  return text.replace(ZeroWidthRegex, "");
}

// wallpaper/vendor/spicy-lyrics/src/utils/Lyrics/EmptyLines.ts
var HasLyricsText = (text) => typeof text === "string" && StripZeroWidth(text).trim() !== "";
var HasRenderableText = (entry) => HasLyricsText(entry?.Text) || HasLyricsText(entry?.TransliteratedText);
var IsEmptySyllableGroup = (group) => !Array.isArray(group?.Syllables) || !group.Syllables.some((syllable) => HasRenderableText(syllable));
var IsEmptyLyricsLine = (line) => {
  if (line?.Lead !== void 0 || line?.Background !== void 0) {
    return IsEmptySyllableGroup(line.Lead) && !(Array.isArray(line.Background) ? line.Background.some((background) => !IsEmptySyllableGroup(background)) : false);
  }
  return !HasRenderableText(line);
};
var RemoveEmptyLyricsLines = (lines) => Array.isArray(lines) ? lines.filter((line) => !IsEmptyLyricsLine(line)) : [];

// wallpaper/vendor/spicy-lyrics/src/utils/Lyrics/Applyer/Utils/PickDisplayText.ts
function PickDisplayText(entry, useRomanized) {
  const original = entry?.Text;
  const romanized = entry?.TransliteratedText;
  if (useRomanized && romanized !== void 0) return romanized;
  if (HasLyricsText(original)) return original;
  return HasLyricsText(romanized) ? romanized : original ?? "";
}

// wallpaper/vendor/spicy-lyrics/src/utils/Lyrics/Applyer/Credits/ApplyLyricsCredits.ts
function ApplyLyricsCredits(data, LyricsContainer) {
  if (!data?.SongWriters || !LyricsContainer) return;
  const CreditsElement = document.createElement("div");
  CreditsElement.classList.add("Credits");
  const SongWriters = data.SongWriters.join(", ");
  CreditsElement.textContent = `Written by: ${SongWriters}`;
  LyricsContainer.appendChild(CreditsElement);
}

// wallpaper/vendor/spicy-lyrics/src/utils/Lyrics/Applyer/OnApply.ts
var EventPrefix = "lyrics:";
var EmitNotApplyed = () => {
  global_default.Event.evoke(`${EventPrefix}not-apply`, null);
};
var EmitApply = (Type, Content) => {
  PageContainer?.querySelector(
    ".LyricsContainer .LyricsContent"
  )?.classList.remove("HiddenTransitioned");
  HideLyricsSkeleton();
  global_default.Event.evoke(`${EventPrefix}apply`, { Type, Content });
};

// wallpaper/vendor/spicy-lyrics/src/utils/Lyrics/Applyer/Utils/Emphasize.ts
var Substractions = {
  StartTime: $simpleLyricsMode.get() ? -21 : 0,
  EndTime: $simpleLyricsMode.get() ? -40 : 250
};
function Emphasize(letters, applyTo, lead, isBgWord = false) {
  const StartTime = ConvertTime(lead.StartTime) - Substractions.StartTime;
  const EndTime = ConvertTime(lead.EndTime) - Substractions.EndTime;
  const totalDuration = EndTime - StartTime;
  const letterDuration = totalDuration / letters.length;
  const word = applyTo;
  const Letters = [];
  letters.forEach((letter, index) => {
    const letterElem = document.createElement("span");
    letterElem.textContent = letter;
    letterElem.classList.add("letter");
    letterElem.classList.add("Emphasis");
    if (letter.trim().length === 0) {
      letterElem.classList.add("SpaceLetter");
    }
    const isLastLetter = index === letters.length - 1;
    const letterStartTime = StartTime + index * letterDuration;
    const letterEndTime = letterStartTime + letterDuration;
    if (isLastLetter) {
      letterElem.classList.add("LastLetterInWord");
    }
    if (ArabicPersianRegex.test(lead.Text)) {
      word.setAttribute("font", "Vazirmatn");
    }
    const mcont2 = isBgWord ? {
      BGLetter: true
    } : {};
    Letters.push({
      HTMLElement: letterElem,
      StartTime: letterStartTime,
      EndTime: letterEndTime,
      TotalTime: letterDuration,
      Emphasis: true,
      ...mcont2
    });
    if (!$simpleLyricsMode.get()) {
      letterElem.style.setProperty("--gradient-position", `-20%`);
    }
    letterElem.style.setProperty("--text-shadow-opacity", `0%`);
    letterElem.style.setProperty("--text-shadow-blur-radius", `4px`);
    letterElem.style.scale = IdleEmphasisLyricsScale.toString();
    letterElem.style.transform = `translateY(calc(var(--DefaultLyricsSize) * 0.02))`;
    word.appendChild(letterElem);
  });
  word.classList.add("letterGroup");
  const mcont = isBgWord ? {
    BGWord: true
  } : {};
  if (CurrentLineLyricsObject >= 0 && LyricsObject.Types.Syllable.Lines?.[CurrentLineLyricsObject].Syllables) {
    LyricsObject.Types.Syllable.Lines[CurrentLineLyricsObject].Syllables.Lead.push({
      HTMLElement: word,
      StartTime,
      EndTime,
      TotalTime: totalDuration,
      LetterGroup: true,
      Letters,
      ...mcont
    });
  } else {
    console.warn(
      "Cannot add letter group: CurrentLineLyricsObject is invalid or Syllables.Lead doesn't exist"
    );
  }
}

// wallpaper/vendor/spicy-lyrics/src/utils/Lyrics/Applyer/Utils/IsLetterCapable.ts
var Simple = (letterLength, totalDuration) => {
  const minDuration = 1e3;
  return totalDuration >= minDuration;
};
var SimpleLyricsModeCapable = (letterLength, totalDuration) => {
  if (letterLength > 12) {
    return false;
  }
  const minDuration = 1050;
  return totalDuration >= minDuration;
};
function IsLetterCapable(letterLength, totalDuration) {
  return $simpleLyricsMode.get() ? SimpleLyricsModeCapable(letterLength, totalDuration) : Simple(letterLength, totalDuration);
}

// wallpaper/vendor/spicy-lyrics/src/utils/Lyrics/Applyer/Credits/ApplyProvider.ts
var ProviderMap = {
  "spt": "Spotify",
  "aml": "Apple Music",
  "spl": "Spicy Lyrics",
  "ldb": "Local DB"
};
function ApplyLyricsProvider(data, LyricsContainer) {
  if (!data?.source || !LyricsContainer) return;
  const ProviderElement = document.createElement("div");
  ProviderElement.classList.add("LyricsProvider");
  let providerLabel = "Unknown";
  if (typeof data.source === "string") {
    const source = data.source.toLowerCase();
    const match = Object.entries(ProviderMap).find(([key]) => source.includes(key));
    if (match) providerLabel = match[1];
  }
  ProviderElement.textContent = `Provided by: ${providerLabel}`;
  LyricsContainer.appendChild(ProviderElement);
}

// wallpaper/vendor/spicy-lyrics/src/utils/Lyrics/Applyer/Synced/Syllable.ts
function ApplySyllableLyrics(data, UseRomanized = false) {
  if (!$lyricsContainerExists.get()) return;
  EmitNotApplyed();
  DestroyAllLyricsContainers();
  const LyricsContainerParent = PageContainer?.querySelector(
    ".LyricsContainer .LyricsContent"
  );
  const LyricsContainerInstance = CreateLyricsContainer();
  const LyricsContainer = LyricsContainerInstance.Container;
  if (!LyricsContainer) {
    console.error("LyricsContainer not found");
    return;
  }
  const content = RemoveEmptyLyricsLines(data.Content);
  const hasOppositeAligned = content.some((item) => item.OppositeAligned === true);
  LyricsContainer.classList.toggle("HasDuetLines", hasOppositeAligned);
  const hasRtlLines = content.some(
    (line) => line.Lead.Syllables.some((syllable) => isRtl_default(syllable.Text)) || line.Background?.some((bg) => bg.Syllables.some((syllable) => isRtl_default(syllable.Text))) === true
  );
  LyricsContainer.classList.toggle("HasRtlLines", hasRtlLines);
  LyricsContainer.setAttribute("data-lyrics-type", "Syllable");
  ClearLyricsContentArrays();
  ClearScrollSimplebar();
  ClearLyricsPageContainer();
  const virtualContainer = document.createElement("div");
  virtualContainer.classList.add("VirtualLyricsContainer");
  LyricsContainer.appendChild(virtualContainer);
  const lineElements = [];
  if (data.StartTime >= getLyricsBetweenShow()) {
    const musicalLine = document.createElement("div");
    musicalLine.classList.add("line");
    musicalLine.classList.add("musical-line");
    LyricsObject.Types.Syllable.Lines.push({
      HTMLElement: musicalLine,
      StartTime: 0,
      EndTime: ConvertTime(data.StartTime),
      TotalTime: ConvertTime(data.StartTime),
      DotLine: true
    });
    SetWordArrayInCurentLine();
    if (content[0]?.OppositeAligned) {
      musicalLine.classList.add("OppositeAligned");
    }
    const dotGroup = document.createElement("div");
    dotGroup.classList.add("dotGroup");
    const musicalDots1 = document.createElement("span");
    const musicalDots2 = document.createElement("span");
    const musicalDots3 = document.createElement("span");
    const totalTime = ConvertTime(data.StartTime);
    const baseDotTime = totalTime / 3;
    const dotPadding = getInterludeTimePadding() / 3;
    const dot1EndTime = Math.max(0, baseDotTime + dotPadding);
    const dot2EndTime = Math.max(dot1EndTime, baseDotTime * 2 + dotPadding * 2);
    const dot3EndTime = Math.max(dot2EndTime, totalTime + getInterludeTimePadding());
    musicalDots1.classList.add("word");
    musicalDots1.classList.add("dot");
    musicalDots1.textContent = "\u2022";
    if (LyricsObject.Types.Syllable.Lines[CurrentLineLyricsObject]?.Syllables?.Lead) {
      LyricsObject.Types.Syllable.Lines[CurrentLineLyricsObject].Syllables?.Lead.push({
        HTMLElement: musicalDots1,
        StartTime: 0,
        EndTime: dot1EndTime,
        TotalTime: dot1EndTime,
        Dot: true
      });
    } else {
      console.warn("Syllables.Lead is undefined for CurrentLineLyricsObject");
    }
    musicalDots2.classList.add("word");
    musicalDots2.classList.add("dot");
    musicalDots2.textContent = "\u2022";
    if (LyricsObject.Types.Syllable.Lines[CurrentLineLyricsObject]?.Syllables?.Lead) {
      LyricsObject.Types.Syllable.Lines[CurrentLineLyricsObject].Syllables?.Lead.push({
        HTMLElement: musicalDots2,
        StartTime: dot1EndTime,
        EndTime: dot2EndTime,
        TotalTime: dot2EndTime - dot1EndTime,
        Dot: true
      });
    } else {
      console.warn("Syllables.Lead is undefined for CurrentLineLyricsObject");
    }
    musicalDots3.classList.add("word");
    musicalDots3.classList.add("dot");
    musicalDots3.textContent = "\u2022";
    if (LyricsObject.Types.Syllable.Lines[CurrentLineLyricsObject]?.Syllables?.Lead) {
      LyricsObject.Types.Syllable.Lines[CurrentLineLyricsObject].Syllables?.Lead.push({
        HTMLElement: musicalDots3,
        StartTime: dot2EndTime,
        EndTime: dot3EndTime,
        TotalTime: dot3EndTime - dot2EndTime,
        Dot: true
      });
    } else {
      console.warn("Syllables.Lead is undefined for CurrentLineLyricsObject");
    }
    dotGroup.appendChild(musicalDots1);
    dotGroup.appendChild(musicalDots2);
    dotGroup.appendChild(musicalDots3);
    musicalLine.appendChild(dotGroup);
    lineElements.push(musicalLine);
  }
  content.forEach((line, index, arr) => {
    const lineElem = document.createElement("div");
    lineElem.classList.add("line");
    const nextLineStartTime = arr[index + 1]?.Lead.StartTime ?? 0;
    const lineEndTimeAndNextLineStartTimeDistance = nextLineStartTime !== 0 ? nextLineStartTime - line.Lead.EndTime : 0;
    const lineEndTime = $minimalLyricsMode.get() ? nextLineStartTime === 0 ? line.Lead.EndTime : lineEndTimeAndNextLineStartTimeDistance < getLyricsBetweenShow() && nextLineStartTime > line.Lead.EndTime ? nextLineStartTime : line.Lead.EndTime : line.Lead.EndTime;
    LyricsObject.Types.Syllable.Lines.push({
      HTMLElement: lineElem,
      StartTime: ConvertTime(line.Lead.StartTime),
      EndTime: ConvertTime(lineEndTime),
      TotalTime: ConvertTime(lineEndTime) - ConvertTime(line.Lead.StartTime)
    });
    SetWordArrayInCurentLine();
    if (line.OppositeAligned) {
      lineElem.classList.add("OppositeAligned");
    }
    lineElements.push(lineElem);
    let currentWordGroup = null;
    line.Lead.Syllables.filter(HasRenderableText).forEach((lead, iL, aL) => {
      let word = document.createElement("span");
      if (isRtl_default(lead.Text) && !lineElem.classList.contains("rtl")) {
        lineElem.classList.add("rtl");
      }
      const totalDuration = ConvertTime(lead.EndTime) - ConvertTime(lead.StartTime);
      const leadRenderText = StripZeroWidth(
        PickDisplayText(lead, UseRomanized)
      );
      const letterLength = leadRenderText.split("").length;
      const IfLetterCapable = letterLength > 0 && IsLetterCapable(letterLength, totalDuration) && !isRtl_default(leadRenderText);
      if (IfLetterCapable) {
        word = document.createElement("div");
        const letters = leadRenderText.split("");
        Emphasize(letters, word, lead);
        iL === aL.length - 1 ? word.classList.add("LastWordInLine") : lead.IsPartOfWord ? word.classList.add("PartOfWord") : null;
        if (!$simpleLyricsMode.get()) {
          word.style.setProperty("--text-shadow-opacity", `0%`);
          word.style.setProperty("--text-shadow-blur-radius", `4px`);
          word.style.scale = IdleEmphasisLyricsScale.toString();
          word.style.transform = `translateY(calc(var(--DefaultLyricsSize) * 0.02))`;
        }
      } else {
        word.textContent = leadRenderText;
        if (!$simpleLyricsMode.get()) {
          word.style.setProperty("--gradient-position", `-20%`);
          word.style.setProperty("--text-shadow-opacity", `0%`);
          word.style.setProperty("--text-shadow-blur-radius", `4px`);
          word.style.scale = IdleLyricsScale.toString();
          word.style.transform = `translateY(calc(var(--DefaultLyricsSize) * 0.01))`;
        }
        word.classList.add("word");
        iL === aL.length - 1 ? word.classList.add("LastWordInLine") : lead.IsPartOfWord ? word.classList.add("PartOfWord") : null;
        if (LyricsObject.Types.Syllable.Lines[CurrentLineLyricsObject]?.Syllables?.Lead) {
          LyricsObject.Types.Syllable.Lines[CurrentLineLyricsObject].Syllables?.Lead.push({
            HTMLElement: word,
            StartTime: ConvertTime(lead.StartTime),
            EndTime: ConvertTime(lead.EndTime),
            TotalTime: totalDuration
          });
        } else {
          console.warn("Syllables.Lead is undefined for CurrentLineLyricsObject");
        }
      }
      const prev = aL[iL - 1];
      if (lead.IsPartOfWord || prev?.IsPartOfWord && currentWordGroup) {
        if (!currentWordGroup) {
          const group = document.createElement("span");
          group.classList.add("word-group");
          lineElem.appendChild(group);
          currentWordGroup = group;
        }
        currentWordGroup.appendChild(word);
        if (!lead.IsPartOfWord && prev?.IsPartOfWord) {
          currentWordGroup = null;
        }
      } else {
        currentWordGroup = null;
        lineElem.appendChild(word);
      }
    });
    if (line.Background) {
      line.Background.filter((bg) => !IsEmptySyllableGroup(bg)).forEach((bg) => {
        const lineE = document.createElement("div");
        lineE.classList.add("line", "bg-line");
        LyricsObject.Types.Syllable.Lines.push({
          HTMLElement: lineE,
          StartTime: ConvertTime(bg.StartTime),
          EndTime: ConvertTime(bg.EndTime),
          TotalTime: ConvertTime(bg.EndTime) - ConvertTime(bg.StartTime),
          BGLine: true
        });
        SetWordArrayInCurentLine();
        if (line.OppositeAligned) {
          lineE.classList.add("OppositeAligned");
        }
        lineElements.push(lineE);
        let currentBGWordGroup = null;
        bg.Syllables.filter(HasRenderableText).forEach((bw, bI, bA) => {
          let bwE = document.createElement("span");
          if (isRtl_default(bw.Text) && !lineE.classList.contains("rtl")) {
            lineE.classList.add("rtl");
          }
          const totalDuration = ConvertTime(bw.EndTime) - ConvertTime(bw.StartTime);
          const bgRenderText = StripZeroWidth(
            PickDisplayText(bw, UseRomanized)
          );
          const letterLength = bgRenderText.split("").length;
          const IfLetterCapable = letterLength > 0 && IsLetterCapable(letterLength, totalDuration) && !isRtl_default(bgRenderText);
          if (IfLetterCapable) {
            bwE = document.createElement("div");
            const letters = bgRenderText.split("");
            Emphasize(letters, bwE, bw, true);
            bI === bA.length - 1 ? bwE.classList.add("LastWordInLine") : bw.IsPartOfWord ? bwE.classList.add("PartOfWord") : null;
            if (!$simpleLyricsMode.get()) {
              bwE.style.setProperty("--text-shadow-opacity", `0%`);
              bwE.style.setProperty("--text-shadow-blur-radius", `4px`);
              bwE.style.scale = IdleEmphasisLyricsScale.toString();
              bwE.style.transform = `translateY(calc(var(--font-size) * 0.02))`;
            }
          } else {
            bwE.textContent = bgRenderText;
            if (!$simpleLyricsMode.get()) {
              bwE.style.setProperty("--gradient-position", `0%`);
              bwE.style.setProperty("--text-shadow-opacity", `0%`);
              bwE.style.setProperty("--text-shadow-blur-radius", `4px`);
              bwE.style.scale = IdleLyricsScale.toString();
              bwE.style.transform = `translateY(calc(var(--font-size) * 0.01))`;
            }
            if (LyricsObject.Types.Syllable.Lines[CurrentLineLyricsObject]?.Syllables?.Lead) {
              LyricsObject.Types.Syllable.Lines[CurrentLineLyricsObject].Syllables?.Lead.push({
                HTMLElement: bwE,
                StartTime: ConvertTime(bw.StartTime),
                EndTime: ConvertTime(bw.EndTime),
                TotalTime: ConvertTime(bw.EndTime) - ConvertTime(bw.StartTime),
                BGWord: true
              });
            } else {
              console.warn("Syllables.Lead is undefined for CurrentLineLyricsObject");
            }
            bwE.classList.add("bg-word");
            bwE.classList.add("word");
            bI === bA.length - 1 ? bwE.classList.add("LastWordInLine") : bw.IsPartOfWord ? bwE.classList.add("PartOfWord") : null;
          }
          const prevBG = bA[bI - 1];
          if (bw.IsPartOfWord || prevBG?.IsPartOfWord && currentBGWordGroup) {
            if (!currentBGWordGroup) {
              const group = document.createElement("span");
              group.classList.add("word-group");
              lineE.appendChild(group);
              currentBGWordGroup = group;
            }
            currentBGWordGroup.appendChild(bwE);
            if (!bw.IsPartOfWord && prevBG?.IsPartOfWord) {
              currentBGWordGroup = null;
            }
          } else {
            currentBGWordGroup = null;
            lineE.appendChild(bwE);
          }
        });
      });
    }
    if (arr[index + 1] && arr[index + 1].Lead.StartTime - line.Lead.EndTime >= getLyricsBetweenShow()) {
      const musicalLine = document.createElement("div");
      musicalLine.classList.add("line");
      musicalLine.classList.add("musical-line");
      LyricsObject.Types.Syllable.Lines.push({
        HTMLElement: musicalLine,
        StartTime: ConvertTime(line.Lead.EndTime),
        EndTime: ConvertTime(arr[index + 1].Lead.StartTime),
        TotalTime: ConvertTime(arr[index + 1].Lead.StartTime) - ConvertTime(line.Lead.EndTime),
        DotLine: true
      });
      SetWordArrayInCurentLine();
      if (arr[index + 1].OppositeAligned) {
        musicalLine.classList.add("OppositeAligned");
      }
      const dotGroup = document.createElement("div");
      dotGroup.classList.add("dotGroup");
      const musicalDots1 = document.createElement("span");
      const musicalDots2 = document.createElement("span");
      const musicalDots3 = document.createElement("span");
      const gapStartTime = ConvertTime(line.Lead.EndTime);
      const totalTime = ConvertTime(arr[index + 1].Lead.StartTime) - gapStartTime;
      const baseDotTime = totalTime / 3;
      const dotPadding = getInterludeTimePadding() / 3;
      const dot1EndTime = Math.max(gapStartTime, gapStartTime + baseDotTime + dotPadding);
      const dot2EndTime = Math.max(dot1EndTime, gapStartTime + baseDotTime * 2 + dotPadding * 2);
      const dot3EndTime = Math.max(dot2EndTime, gapStartTime + totalTime + getInterludeTimePadding());
      musicalDots1.classList.add("word");
      musicalDots1.classList.add("dot");
      musicalDots1.textContent = "\u2022";
      if (LyricsObject.Types.Syllable.Lines[CurrentLineLyricsObject]?.Syllables?.Lead) {
        LyricsObject.Types.Syllable.Lines[CurrentLineLyricsObject].Syllables?.Lead.push({
          HTMLElement: musicalDots1,
          StartTime: gapStartTime,
          EndTime: dot1EndTime,
          TotalTime: dot1EndTime - gapStartTime,
          Dot: true
        });
      } else {
        console.warn("Syllables.Lead is undefined for CurrentLineLyricsObject");
      }
      musicalDots2.classList.add("word");
      musicalDots2.classList.add("dot");
      musicalDots2.textContent = "\u2022";
      if (LyricsObject.Types.Syllable.Lines[CurrentLineLyricsObject]?.Syllables?.Lead) {
        LyricsObject.Types.Syllable.Lines[CurrentLineLyricsObject].Syllables?.Lead.push({
          HTMLElement: musicalDots2,
          StartTime: dot1EndTime,
          EndTime: dot2EndTime,
          TotalTime: dot2EndTime - dot1EndTime,
          Dot: true
        });
      } else {
        console.warn("Syllables.Lead is undefined for CurrentLineLyricsObject");
      }
      musicalDots3.classList.add("word");
      musicalDots3.classList.add("dot");
      musicalDots3.textContent = "\u2022";
      if (LyricsObject.Types.Syllable.Lines[CurrentLineLyricsObject]?.Syllables?.Lead) {
        LyricsObject.Types.Syllable.Lines[CurrentLineLyricsObject].Syllables?.Lead.push({
          HTMLElement: musicalDots3,
          StartTime: dot2EndTime,
          EndTime: dot3EndTime,
          TotalTime: dot3EndTime - dot2EndTime,
          Dot: true
        });
      } else {
        console.warn("Syllables.Lead is undefined for CurrentLineLyricsObject");
      }
      dotGroup.appendChild(musicalDots1);
      dotGroup.appendChild(musicalDots2);
      dotGroup.appendChild(musicalDots3);
      musicalLine.appendChild(dotGroup);
      lineElements.push(musicalLine);
    }
  });
  ApplyLyricsCredits(data, LyricsContainer);
  ApplyLyricsProvider(data, LyricsContainer);
  ApplyIsByCommunity(data, LyricsContainer);
  if (LyricsContainerParent) {
    LyricsContainerInstance.Append(LyricsContainerParent);
  }
  if (ScrollSimplebar) RecalculateScrollSimplebar();
  else MountScrollSimplebar();
  const scrollEl = ScrollSimplebar?.getScrollElement();
  if (scrollEl) initLyricsVirtualizer(scrollEl, virtualContainer, lineElements);
  const LyricsStylingContainer = PageContainer?.querySelector(
    ".LyricsContainer .LyricsContent .simplebar-content"
  );
  if (LyricsStylingContainer) {
    removeAllStyles(LyricsStylingContainer);
    if (data.classes) {
      LyricsStylingContainer.className = data.classes;
    }
    if (data.styles) {
      applyStyles(LyricsStylingContainer, data.styles);
    }
  } else {
    console.warn("LyricsStylingContainer not found");
  }
  EmitApply(data.Type, content);
  setRomanizedStatus(UseRomanized);
}

// wallpaper/vendor/spicy-lyrics/src/utils/Lyrics/Applyer/Synced/Line.ts
function ApplyLineLyrics(data, UseRomanized = false) {
  if (!$lyricsContainerExists.get()) return;
  EmitNotApplyed();
  DestroyAllLyricsContainers();
  const LyricsContainerParent = PageContainer?.querySelector(
    ".LyricsContainer .LyricsContent"
  );
  const LyricsContainerInstance = CreateLyricsContainer();
  const LyricsContainer = LyricsContainerInstance.Container;
  if (!LyricsContainer) {
    console.error("LyricsContainer not found");
    return;
  }
  const content = RemoveEmptyLyricsLines(data.Content);
  const hasOppositeAligned = content.some((item) => item.OppositeAligned === true);
  LyricsContainer.classList.toggle("HasDuetLines", hasOppositeAligned);
  const hasRtlLines = content.some((line) => isRtl_default(line.Text));
  LyricsContainer.classList.toggle("HasRtlLines", hasRtlLines);
  LyricsContainer.setAttribute("data-lyrics-type", "Line");
  ClearLyricsContentArrays();
  ClearScrollSimplebar();
  ClearLyricsPageContainer();
  const virtualContainer = document.createElement("div");
  virtualContainer.classList.add("VirtualLyricsContainer");
  LyricsContainer.appendChild(virtualContainer);
  const lineElements = [];
  if (data.StartTime >= getLyricsBetweenShow()) {
    const musicalLine = document.createElement("div");
    musicalLine.classList.add("line");
    musicalLine.classList.add("musical-line");
    LyricsObject.Types.Line.Lines.push({
      HTMLElement: musicalLine,
      StartTime: 0,
      EndTime: ConvertTime(data.StartTime),
      TotalTime: ConvertTime(data.StartTime),
      DotLine: true
    });
    SetWordArrayInCurentLine_LINE_SYNCED();
    if (content[0]?.OppositeAligned) {
      musicalLine.classList.add("OppositeAligned");
    }
    const dotGroup = document.createElement("div");
    dotGroup.classList.add("dotGroup");
    const musicalDots1 = document.createElement("span");
    const musicalDots2 = document.createElement("span");
    const musicalDots3 = document.createElement("span");
    const totalTime = ConvertTime(data.StartTime);
    const baseDotTime = totalTime / 3;
    const dotPadding = getInterludeTimePadding() / 3;
    const dot1EndTime = Math.max(0, baseDotTime + dotPadding);
    const dot2EndTime = Math.max(dot1EndTime, baseDotTime * 2 + dotPadding * 2);
    const dot3EndTime = Math.max(dot2EndTime, totalTime + getInterludeTimePadding());
    musicalDots1.classList.add("word");
    musicalDots1.classList.add("dot");
    musicalDots1.textContent = "\u2022";
    if (LyricsObject.Types.Line.Lines[LINE_SYNCED_CurrentLineLyricsObject]?.Syllables?.Lead) {
      LyricsObject.Types.Line.Lines[LINE_SYNCED_CurrentLineLyricsObject].Syllables?.Lead.push({
        HTMLElement: musicalDots1,
        StartTime: 0,
        EndTime: dot1EndTime,
        TotalTime: dot1EndTime,
        Dot: true
      });
    } else {
      console.warn("Syllables.Lead is undefined for LINE_SYNCED_CurrentLineLyricsObject");
    }
    musicalDots2.classList.add("word");
    musicalDots2.classList.add("dot");
    musicalDots2.textContent = "\u2022";
    if (LyricsObject.Types.Line.Lines[LINE_SYNCED_CurrentLineLyricsObject]?.Syllables?.Lead) {
      LyricsObject.Types.Line.Lines[LINE_SYNCED_CurrentLineLyricsObject].Syllables?.Lead.push({
        HTMLElement: musicalDots2,
        StartTime: dot1EndTime,
        EndTime: dot2EndTime,
        TotalTime: dot2EndTime - dot1EndTime,
        Dot: true
      });
    } else {
      console.warn("Syllables.Lead is undefined for LINE_SYNCED_CurrentLineLyricsObject");
    }
    musicalDots3.classList.add("word");
    musicalDots3.classList.add("dot");
    musicalDots3.textContent = "\u2022";
    if (LyricsObject.Types.Line.Lines[LINE_SYNCED_CurrentLineLyricsObject]?.Syllables?.Lead) {
      LyricsObject.Types.Line.Lines[LINE_SYNCED_CurrentLineLyricsObject].Syllables?.Lead.push({
        HTMLElement: musicalDots3,
        StartTime: dot2EndTime,
        EndTime: dot3EndTime,
        TotalTime: dot3EndTime - dot2EndTime,
        Dot: true
      });
    } else {
      console.warn("Syllables.Lead is undefined for LINE_SYNCED_CurrentLineLyricsObject");
    }
    dotGroup.appendChild(musicalDots1);
    dotGroup.appendChild(musicalDots2);
    dotGroup.appendChild(musicalDots3);
    musicalLine.appendChild(dotGroup);
    lineElements.push(musicalLine);
  }
  content.forEach((line, index, arr) => {
    const lineElem = document.createElement("div");
    lineElem.textContent = StripZeroWidth(
      PickDisplayText(line, UseRomanized)
    );
    lineElem.classList.add("line");
    if (isRtl_default(line.Text) && !lineElem.classList.contains("rtl")) {
      lineElem.classList.add("rtl");
    }
    const nextLineStartTime = arr[index + 1]?.StartTime ?? 0;
    const lineEndTimeAndNextLineStartTimeDistance = nextLineStartTime !== 0 ? nextLineStartTime - line.EndTime : 0;
    const lineEndTime = $simpleLyricsMode.get() ? nextLineStartTime === 0 ? line.EndTime : lineEndTimeAndNextLineStartTimeDistance < getLyricsBetweenShow() && nextLineStartTime > line.EndTime ? nextLineStartTime : line.EndTime : line.EndTime;
    LyricsObject.Types.Line.Lines.push({
      HTMLElement: lineElem,
      StartTime: ConvertTime(line.StartTime),
      EndTime: ConvertTime(lineEndTime),
      TotalTime: ConvertTime(lineEndTime) - ConvertTime(line.StartTime)
    });
    if (line.OppositeAligned) {
      lineElem.classList.add("OppositeAligned");
    }
    lineElements.push(lineElem);
    if (arr[index + 1] && arr[index + 1].StartTime - line.EndTime >= getLyricsBetweenShow()) {
      const musicalLine = document.createElement("div");
      musicalLine.classList.add("line");
      musicalLine.classList.add("musical-line");
      LyricsObject.Types.Line.Lines.push({
        HTMLElement: musicalLine,
        StartTime: ConvertTime(line.EndTime),
        EndTime: ConvertTime(arr[index + 1].StartTime),
        TotalTime: ConvertTime(arr[index + 1].StartTime) - ConvertTime(line.EndTime),
        DotLine: true
      });
      SetWordArrayInCurentLine_LINE_SYNCED();
      if (arr[index + 1].OppositeAligned) {
        musicalLine.classList.add("OppositeAligned");
      }
      const dotGroup = document.createElement("div");
      dotGroup.classList.add("dotGroup");
      const musicalDots1 = document.createElement("span");
      const musicalDots2 = document.createElement("span");
      const musicalDots3 = document.createElement("span");
      const gapStartTime = ConvertTime(line.EndTime);
      const totalTime = ConvertTime(arr[index + 1].StartTime) - gapStartTime;
      const baseDotTime = totalTime / 3;
      const dotPadding = getInterludeTimePadding() / 3;
      const dot1EndTime = Math.max(gapStartTime, gapStartTime + baseDotTime + dotPadding);
      const dot2EndTime = Math.max(dot1EndTime, gapStartTime + baseDotTime * 2 + dotPadding * 2);
      const dot3EndTime = Math.max(dot2EndTime, gapStartTime + totalTime + getInterludeTimePadding());
      musicalDots1.classList.add("word");
      musicalDots1.classList.add("dot");
      musicalDots1.textContent = "\u2022";
      if (LyricsObject.Types.Line.Lines[LINE_SYNCED_CurrentLineLyricsObject]?.Syllables?.Lead) {
        LyricsObject.Types.Line.Lines[LINE_SYNCED_CurrentLineLyricsObject].Syllables?.Lead.push({
          HTMLElement: musicalDots1,
          StartTime: gapStartTime,
          EndTime: dot1EndTime,
          TotalTime: dot1EndTime - gapStartTime,
          Dot: true
        });
      } else {
        console.warn("Syllables.Lead is undefined for LINE_SYNCED_CurrentLineLyricsObject");
      }
      musicalDots2.classList.add("word");
      musicalDots2.classList.add("dot");
      musicalDots2.textContent = "\u2022";
      LyricsObject.Types.Line.Lines[LINE_SYNCED_CurrentLineLyricsObject].Syllables?.Lead.push({
        HTMLElement: musicalDots2,
        StartTime: dot1EndTime,
        EndTime: dot2EndTime,
        TotalTime: dot2EndTime - dot1EndTime,
        Dot: true
      });
      musicalDots3.classList.add("word");
      musicalDots3.classList.add("dot");
      musicalDots3.textContent = "\u2022";
      LyricsObject.Types.Line.Lines[LINE_SYNCED_CurrentLineLyricsObject].Syllables?.Lead.push({
        HTMLElement: musicalDots3,
        StartTime: dot2EndTime,
        EndTime: dot3EndTime,
        TotalTime: dot3EndTime - dot2EndTime,
        Dot: true
      });
      dotGroup.appendChild(musicalDots1);
      dotGroup.appendChild(musicalDots2);
      dotGroup.appendChild(musicalDots3);
      musicalLine.appendChild(dotGroup);
      lineElements.push(musicalLine);
    }
  });
  ApplyLyricsCredits(data, LyricsContainer);
  ApplyLyricsProvider(data, LyricsContainer);
  ApplyIsByCommunity(data, LyricsContainer);
  if (LyricsContainerParent) {
    LyricsContainerInstance.Append(LyricsContainerParent);
  }
  if (ScrollSimplebar) RecalculateScrollSimplebar();
  else MountScrollSimplebar();
  const scrollEl = ScrollSimplebar?.getScrollElement();
  if (scrollEl) initLyricsVirtualizer(scrollEl, virtualContainer, lineElements);
  const LyricsStylingContainer = PageContainer?.querySelector(
    ".LyricsContainer .LyricsContent .simplebar-content"
  );
  if (LyricsStylingContainer) {
    removeAllStyles(LyricsStylingContainer);
    if (data.classes) {
      LyricsStylingContainer.className = data.classes;
    }
    if (data.styles) {
      applyStyles(LyricsStylingContainer, data.styles);
    }
  } else {
    console.warn("LyricsStylingContainer not found");
  }
  EmitApply(data.Type, content);
  setRomanizedStatus(UseRomanized);
}

// wallpaper/vendor/spicy-lyrics/src/utils/Lyrics/Applyer/Static.ts
function ApplyStaticLyrics(data, UseRomanized = false) {
  if (!$lyricsContainerExists.get()) return;
  EmitNotApplyed();
  DestroyAllLyricsContainers();
  const LyricsContainerParent = PageContainer?.querySelector(
    ".LyricsContainer .LyricsContent"
  );
  const LyricsContainerInstance = CreateLyricsContainer();
  const LyricsContainer = LyricsContainerInstance.Container;
  if (!LyricsContainer) {
    console.error("Cannot apply static lyrics: LyricsContainer not found");
    return;
  }
  const lines = RemoveEmptyLyricsLines(data.Lines);
  LyricsContainer.classList.remove("HasDuetLines");
  const hasRtlLines = lines.some((line) => isRtl_default(line.Text));
  LyricsContainer.classList.toggle("HasRtlLines", hasRtlLines);
  LyricsContainer.setAttribute("data-lyrics-type", "Static");
  ClearLyricsContentArrays();
  ClearScrollSimplebar();
  ClearLyricsPageContainer();
  const virtualContainer = document.createElement("div");
  virtualContainer.classList.add("VirtualLyricsContainer");
  LyricsContainer.appendChild(virtualContainer);
  const lineElements = [];
  lines.forEach((line) => {
    const lineElem = document.createElement("div");
    lineElem.textContent = StripZeroWidth(
      PickDisplayText(line, UseRomanized)
    );
    if (isRtl_default(line.Text) && !lineElem.classList.contains("rtl")) {
      lineElem.classList.add("rtl");
    }
    lineElem.classList.add("line");
    lineElem.classList.add("static");
    const staticLine = {
      HTMLElement: lineElem
    };
    LyricsObject.Types.Static.Lines.push(staticLine);
    lineElements.push(lineElem);
  });
  ApplyLyricsCredits(data, LyricsContainer);
  ApplyLyricsProvider(data, LyricsContainer);
  ApplyIsByCommunity(data, LyricsContainer);
  if (LyricsContainerParent) {
    LyricsContainerInstance.Append(LyricsContainerParent);
  }
  if (ScrollSimplebar) {
    RecalculateScrollSimplebar();
  } else {
    MountScrollSimplebar();
  }
  const scrollEl = ScrollSimplebar?.getScrollElement();
  if (scrollEl) initLyricsVirtualizer(scrollEl, virtualContainer, lineElements);
  const LyricsStylingContainer = PageContainer?.querySelector(
    ".LyricsContainer .LyricsContent .simplebar-content"
  );
  if (LyricsStylingContainer) {
    if (data.offline) {
      LyricsStylingContainer.classList.add("offline");
    }
    removeAllStyles(LyricsStylingContainer);
    if (data.classes) {
      LyricsStylingContainer.className = data.classes;
    }
    if (data.styles) {
      applyStyles(LyricsStylingContainer, data.styles);
    }
  }
  EmitApply(data.Type, lines);
  setRomanizedStatus(UseRomanized);
}

// wallpaper/vendor/spicy-host/entry.mjs
var page = null;
var overflowObserver = new ResizeObserver((entries) => {
  const limit = (page?.querySelector(".LyricsContent")?.clientHeight || 0) - 64;
  if (limit < 80) return;
  const maxHeight = limit + "px";
  if (page.style.getPropertyValue("--row-max-height") !== maxHeight) page.style.setProperty("--row-max-height", maxHeight);
  const rows = new Set(entries.filter((entry) => entry.target.classList.contains("line")).map((entry) => entry.target));
  if (entries.some((entry) => entry.target.classList.contains("LyricsContent"))) for (const row of page.querySelectorAll(".line")) rows.add(row);
  for (const row of rows) row.classList.toggle("OverflowLine", row.scrollHeight > limit + 1);
});
onAnimationFrame(() => {
  if ($lyricsContainerExists.get()) ScrollToActiveLine(ScrollSimplebar);
});
global_default.Event.listen("lyrics:apply", () => {
  CleanupScrollEvents();
  InitializeScrollEvents(ScrollSimplebar);
  ResetLastLine();
});
function mount(element) {
  clear();
  page = element;
  setPage(element);
  element.id = "SpicyLyricsPage";
  element.className = "SpicyRenderer";
  element.innerHTML = '<div class="ContentBox"><div class="LyricsContainer"><div class="LyricsContent"></div></div></div>';
  overflowObserver.observe(element.querySelector(".LyricsContent"));
}
function clear() {
  overflowObserver.disconnect();
  $lyricsContainerExists.set(false);
  $currentLyricsType.set("None");
  CleanupScrollEvents();
  DestroyAllLyricsContainers();
  ClearScrollSimplebar();
  ClearLyricsContentArrays();
  setBlurringLastLine(null);
  page?.querySelector(".LyricsContent")?.replaceChildren();
}
function apply(data) {
  $lyricsContainerExists.set(true);
  $currentLyricsType.set(data.Type);
  if (data.Type === "Syllable") ApplySyllableLyrics(data);
  else if (data.Type === "Line") ApplyLineLyrics(data);
  else ApplyStaticLyrics(data);
  overflowObserver.observe(page.querySelector(".LyricsContent"));
  if (data.source === "lrclib") {
    const credit = page.querySelector(".LyricsProvider");
    if (credit) credit.textContent = "Provided by: LRCLIB";
  }
  const lines = LyricsObject.Types[data.Type]?.Lines || [];
  for (const [index, line] of lines.entries()) {
    overflowObserver.observe(line.HTMLElement);
    line.HTMLElement.dataset.line = String(index);
    if (line.StartTime !== void 0) {
      line.HTMLElement.dataset.start = String(line.StartTime / 1e3);
      line.HTMLElement.dataset.end = String(line.EndTime / 1e3);
    }
    for (const word of line.Syllables?.Lead || []) {
      if (Number.isFinite(word.StartTime) && Number.isFinite(word.EndTime)) {
        word.HTMLElement.dataset.start = String(word.StartTime / 1e3);
        word.HTMLElement.dataset.end = String(word.EndTime / 1e3);
      }
    }
  }
}
function clock(positionSeconds, playing2, enabled) {
  setClock(positionSeconds * 1e3, playing2);
  $lyricsContainerExists.set(enabled);
}
function appearance(config, reduced) {
  const simple = reduced || config.lowPower || config.lyricStyle !== "smooth";
  $simpleLyricsMode.set(simple);
  $minimalLyricsMode.set(config.lyricStyle === "minimal");
  $smoothScrolling.set(!reduced && !config.lowPower);
  $animationFpsCap.set(config.lowPower ? 30 : config.fps);
  page?.classList.toggle("SimpleLyricsMode", simple);
  page?.classList.toggle("MinimalLyricsMode", config.lyricStyle === "minimal");
  page?.classList.toggle("ReducedMotion", reduced || config.lowPower || config.lyricStyle === "minimal");
}
export {
  appearance,
  apply,
  clear,
  clock,
  mount
};
