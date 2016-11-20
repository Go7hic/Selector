let Selector;
(function () {
  const root = document.documentElement
    // 事件监听
  const addEventListeners = (listeners, el) => {
      const selectorClone = Selector(el)
      const events = Object.keys(listeners)
      const eventsLen = events.length

      for (let i = 0; i < eventsLen; i++) {
        const event = events[i]
        const handlers = listeners[event]
        const handlersLen = handlers.length

        for (let j = 0; j < handlersLen; j++) {
          selectorClone.on(event, handlers[j])
        }
      }
    }
    // 判断元素是否在数组里面
  const inArray = (el, arr) => {
    let i = arr.length
    while (i--) {
      if (arr[i] === el) return true
    }
    return false
  }

  // 把 DOM 元素数组转成真正的数组
  const toArray = obj => {
    const arr = []
    let i = obj.length
    while (i--) {
      arr[i] = obj[i]
    }
    return arr
  }
  const getEvents = domElement => domElement.selectorEventListeners

  /**
   * 选择器选择元素 class, id, tag name or universal selector
   * 返回数组格式
   */
  const selectElements = (selector, context = document) => {
    if (/^[\#.]?[\w-]+$/.test(selector)) {
      const firstChar = selector[0]
      if (firstChar === '.') {
        return toArray(context.getElementsByClassName(selector.slice(1)))
      }
      if (firstChar === '#') {
        const el = context.getElementById(selector.slice(1))
        return el ? [el] : []
      }
      if (selector === 'body') {
        return [document.body]
      }
      return toArray(context.getElementsByTagName(selector))
    }
    return toArray(context.querySelectorAll(selector))
  }
  const sanitize = (arr, flattenObjects, requireDomNodes) => {

    // 删除数组里面的 null 元素
    const arrLen = arr.length
    let i = arrLen
    while (i--) {
      // arr needs to be sanitized
      if ((!arr[i] && arr[i] !== 0) ||
        (flattenObjects && arr[i] instanceof Sizze) ||
        (requireDomNodes && (typeof arr[i] === 'string' || typeof arr[i] == 'number'))
      ) {
        const sanitized = []
        for (let j = 0; j < arrLen; j++) {
          const el = arr[j]
          if (!el && el !== 0) continue
          if (flattenObjects && el instanceof Sizze) {
            for (let k = 0; k < el.length; k++) {
              sanitized.push(el.get(k))
            }
            continue
          }
          if (requireDomNodes && (typeof el === 'string' || typeof el == 'number')) {
            sanitized.push(document.createTextNode(el))
            continue
          }
          sanitized.push(el)
        }
        return sanitized
      }
    }
    return arr
  }
  const splitNamespaces = event => sanitize(event.split('.'))

  const removeDuplicates = arr => {
    const clean = []
    let cleanLen = 0
    const arrLen = arr.length

    for (let i = 0; i < arrLen; i++) {
      const el = arr[i]
      let duplicate = false
      for (let j = 0; j < cleanLen; j++) {
        if (el !== clean[j]) continue
        duplicate = true
        break
      }
      if (duplicate) continue
      clean[cleanLen++] = el
    }

    return clean
  }
  const wrapMap = {
    legend: {
      intro: '<fieldset>',
      outro: '</fieldset>'
    },
    area: {
      intro: '<map>',
      outro: '</map>'
    },
    param: {
      intro: '<object>',
      outro: '</object>'
    },
    thead: {
      intro: '<table>',
      outro: '</table>'
    },
    tr: {
      intro: '<table><tbody>',
      outro: '</tbody></table>'
    },
    col: {
      intro: '<table><tbody></tbody><colgroup>',
      outro: '</colgroup></table>'
    },
    td: {
      intro: '<table><tbody><tr>',
      outro: '</tr></tbody></table>'
    }
  }

  const addPx = ((() => {
    const noPx = [
      'animation-iteration-count',
      'column-count',
      'flex-grow',
      'flex-shrink',
      'font-weight',
      'line-height',
      'opacity',
      'order',
      'orphans',
      'widows',
      'z-index',
    ]
    return function addPx(cssProperty, value) {
      if (inArray(cssProperty, noPx)) return value
      let stringValue = typeof value === 'string' ? value : value.toString()
      if (value && !/\D/.test(stringValue)) {
        stringValue += 'px'
      }
      return stringValue
    }
  })())

  const createDOM = HTMLString => {
    const tmp = document.createElement('div')
    const tag = /[\w:-]+/.exec(HTMLString)[0]
    const inMap = wrapMap[tag]
    let validHTML = HTMLString.trim()
    if (inMap) {
      validHTML = inMap.intro + validHTML + inMap.outro
    }
    tmp.insertAdjacentHTML('afterbegin', validHTML)
    let node = tmp.lastChild
    if (inMap) {
      let i = inMap.outro.match(/</g).length
      while (i--) {
        node = node.lastChild
      }
    }
    // prevent tmp to be node's parentNode
    tmp.textContent = ''
    return node
  }

  const domMethods = {
    afterbegin(el) {
      this.insertBefore(el, this.firstChild)
    },
    afterend(el) {
      const parent = this.parentElement
      parent && parent.insertBefore(el, this.nextSibling)
    },
    beforebegin(el) {
      const parent = this.parentElement
      parent && parent.insertBefore(el, this)
    },
    beforeend(el) {
      this.appendChild(el)
    },
  }

  const duplicateEventListeners = (el, clone) => {
    // Element nodes only
    if (el.nodeType > 1) return

    // Duplicate event listeners for the parent element...
    let listeners = getEvents(el)
    listeners && addEventListeners(listeners, clone)

    // ... and its descendants.
    const descendants = selectElements('*', el)
    const descendantsLen = descendants.length

    // cloneDescendants is defined later to avoid calling selectElements() if not needed
    let cloneDescendants
    let evtListeners
    for (let i = 0; i < descendantsLen; i++) {
      evtListeners = getEvents(descendants[i])
      if (!evtListeners) continue
      if (!cloneDescendants) {
        cloneDescendants = selectElements('*', clone)
      }
      addEventListeners(evtListeners, cloneDescendants[i])
    }
  }

  const findAncestors = function (startAtParent, limitToParent, limitToFirstMatch, selector, context) {
    const dom = []
    const self = this
    this.each(function () {
      let prt = startAtParent ? this.parentElement : this
      while (prt) {
        if (context && context === prt) break
        if (!selector || self.is(selector, prt)) {
          dom.push(prt)
          if (limitToFirstMatch) break
        }
        if (limitToParent) break
        prt = prt.parentElement
      }
    })
    return Selector(removeDuplicates(dom))
  }
  const getEventFromNamespace = event => splitNamespaces(event)[0]
  const getEventsToRemove = (domElement, event) => {
    Object.keys(getEvents(domElement)).filter(
      prop => splitNamespaces(event).every(name => inArray(name, splitNamespaces(prop)))
    )
  }

  const getSetDimension = (obj, prop, value) => {
    // get
    if (value == null) {
      const el = obj.get(0)
      if (!el || el.nodeType > 1) return
      const capitalizedProp = prop[0].toUpperCase() + prop.substring(1)
        // dimension of HTML document
      if (el === document) {
        const offset = root[`offset${capitalizedProp}`]
        const inner = window[`inner${capitalizedProp}`]
        return offset > inner ? offset : inner
      }
      // dimension of viewport
      if (el === window) {
        return window[`inner${capitalizedProp}`]
      }
      // dimension of element
      return el.getBoundingClientRect()[prop]
    }

    // set
    const isFunction = typeof value == 'function'
    let stringValue = isFunction ? '' : addPx(prop, value)
    return obj.each(function (index) {
      if (this == document || this == window || this.nodeType > 1) return
      if (isFunction) {
        stringValue = addPx(prop, value.call(this, index, Selector(this)[prop]()))
      }
      this.style[prop] = stringValue
    })
  }

  const insertHTML = function (position, args) {
    const argsLen = args.length
    let contents = args

    // reverse argument list for afterbegin and afterend
    if (argsLen > 1 && position.includes('after')) {
      contents = []
      let i = argsLen
      while (i--) {
        contents.push(args[i])
      }
    }

    for (let i = 0; i < argsLen; i++) {
      const content = contents[i]
      if (typeof content === 'string' || typeof content === 'number') {
        this.each(function () {
          this.insertAdjacentHTML(position, content)
        })
      } else if (typeof content === 'function') {
        this.each(function (index) {
          const callbackValue = content.call(this, index, this.innerHTML)
          insertHTML.call(Selector(this), position, [callbackValue])
        })
      } else {
        const isSelectorObj = content instanceof Sizze
        const clonedElements = []
        const elementsToInsert = ((() => {
          if (isSelectorObj) {
            return content.get()
          }
          if (Array.isArray(content)) {
            return sanitize(content, true, true)
          }
          // DOM node
          if (content.nodeType) {
            return [content]
          }
          // getElementsByTagName, getElementsByClassName, querySelectorAll
          return toArray(content)
        })())
        const elementsToInsertLen = elementsToInsert.length

        this.each(function (index) {
          const fragment = document.createDocumentFragment()
          for (let i = 0; i < elementsToInsertLen; i++) {
            const element = elementsToInsert[i]
            let elementToInsert
            if (index) {
              elementToInsert = element.cloneNode(true)
              duplicateEventListeners(element, elementToInsert)
            } else {
              elementToInsert = element
            }
            fragment.appendChild(elementToInsert)
            clonedElements.push(elementToInsert)
          }
          domMethods[position].call(this, fragment)
        })

        if (isSelectorObj) {
          content.dom = clonedElements
          content.length = clonedElements.length
        }
        if (i < argsLen - 1) continue
        return clonedElements
      }
    }
  }

  const isNamespaced = event => /\./.test(event)
  const manipulateClass = function (method, className, bool) {
    if (className == null) {
      if (method === 'add') {
        return this
      }
      return this.removeAttr('class')
    }

    let isString
    let classNames
    let classNamesLen

    if (typeof className === 'string') {
      isString = true
      classNames = className.trim().split(' ')
      classNamesLen = classNames.length
    }

    return this.each(function (i, el) {
      if (this.nodeType > 1) return
      if (!isString) {
        // className is a function
        const callbackValue = className.call(el, i, el.className)
        if (!callbackValue) return
        classNames = callbackValue.trim().split(' ')
        classNamesLen = classNames.length
      }
      for (let j = 0; j < classNamesLen; j++) {
        const name = classNames[j]
        if (!name) continue
        if (bool == null) {
          el.classList[method](name)
        } else {
          el.classList.toggle(name, bool)
        }
      }
    })
  }
  const matches = ((() => {
    const names = [
      'mozMatchesSelector',
      'webkitMatchesSelector',
      'msMatchesSelector',
      'matches',
    ]
    let i = names.length
    while (i--) {
      const name = names[i]
      if (!Element.prototype[name]) continue
      return name
    }
  })())

  const removeEvent = ((() => {
    const isHandlerShared = (el, event, registeredHandler) => {
      const similarEventsHandlers = Object.keys(getEvents(el)).filter(prop => getEventFromNamespace(event) === getEventFromNamespace(prop)).map(ev => getEvents(el)[ev]).reduce((a, b) => a.concat(b)).filter(handler => handler === registeredHandler)
      if (similarEventsHandlers.length < 2) return false
      return true
    }
    const removeListener = (el, event, namedHandler) => registeredHandler => {
      if (namedHandler && namedHandler !== registeredHandler) return
      el.removeEventListener(event, registeredHandler)
      if (!isNamespaced(event) || isHandlerShared(el, event, registeredHandler)) return
      el.removeEventListener(getEventFromNamespace(event), registeredHandler)
    }
    const clearRegisteredHandlers = (registeredHandlers, namedHandler) => registeredHandlers.filter(handler => namedHandler && namedHandler !== handler)
    return (el, namedHandler) => event => {
      getEvents(el)[event].forEach(removeListener(el, event, namedHandler))
      getEvents(el)[event] = clearRegisteredHandlers(getEvents(el)[event], namedHandler)
    }
  })())

  const removeMatchedEvents = (el, namedHandler) => event => {
    getEventsToRemove(el, event).forEach(removeEvent(el, namedHandler))
  }
  const scroll = ((() => {
    let scrollRoot
    return (selectorObj, method, value) => {
      // define scroll root element on first run
      if (!scrollRoot) {
        const initialScrollPos = root.scrollTop
        root.scrollTop = initialScrollPos + 1
        const updatedScrollPos = root.scrollTop
        root.scrollTop = initialScrollPos
        scrollRoot = updatedScrollPos > initialScrollPos ?
          root // spec-compliant browsers (like FF34 and IE11)
          :
          document.body // naughty boys (like Chrome 39 and Safari 8)
      }

      // get scroll position
      if (value == null) {
        let el = selectorObj.get(0)
        if (!el) return
        if (el === window || el === document) {
          el = scrollRoot
        }
        return el[method]
      }

      // set scroll position
      return selectorObj.each(function () {
        let el = this
        if (el == window || el == document) {
          el = scrollRoot
        }
        el[method] = value
      })
    }
  })())

  const selectAdjacentSiblings = (selectorObj, direction, selector, until) => {
    const dom = []
    const prop = `${direction}ElementSibling`
    selectorObj.each(function () {
      let el = this
      while (el = el[prop]) {
        if (until && selectorObj.is(until, el)) break
        if (selector && !selectorObj.is(selector, el)) continue
        dom.push(el)
      }
    })
    return Selector(removeDuplicates(dom))
  }

  const selectImmediateAdjacentSibling = (selectorObj, direction, selector) => {
    const prop = `${direction}ElementSibling`
    return selectorObj.map(function () {
      const el = this[prop]
      if (!el || (selector && !selectorObj.is(selector, el))) return
      return el
    }, false)
  }

  const wrap = ((() => {
    const callback = function (wrappingElement, variant) {
      const wrapEl = Selector(wrappingElement).clone(true).get(0)
      let innerWrap = wrapEl
      if (!wrapEl || this.nodeType > 1) return
      while (innerWrap.firstChild) {
        innerWrap = innerWrap.firstChild
      }
      if (variant === 'inner') {
        while (this.firstChild) {
          innerWrap.appendChild(this.firstChild)
        }
        this.appendChild(wrapEl)
      } else {
        const el = variant === 'all' ? this.get(0) : this
        const prt = el.parentNode
        const next = el.nextSibling
        variant === 'all' ?
          this.each(function () {
            innerWrap.appendChild(this)
          }) :
          innerWrap.appendChild(el)
        prt.insertBefore(wrapEl, next)
      }
    }
    return function (wrappingElement, variant) {
      if (typeof wrappingElement == 'function') {
        this.each(function (i) {
          Selector(this)[variant == 'inner' ? 'wrapInner' : 'wrap'](wrappingElement.call(this, i))
        })
      } else {
        variant == 'all' ?
          callback.call(this, wrappingElement, variant) :
          this.each(function () {
            callback.call(this, wrappingElement, variant)
          })
      }
      return this
    }
  })())

  // elements needing a construct already defined by other elements
  ;
  ['tbody', 'tfoot', 'colgroup', 'caption'].forEach(tag => {
    wrapMap[tag] = wrapMap.thead
  })
  wrapMap.th = wrapMap.td

  // Sizze constructor
  class Sizze {
    constructor(selector, context) {
        if (typeof selector == 'string') {
          // create DOM element
          if (selector[0] === '<') {
            this.dom = [createDOM(selector)]
          } else {
            // select DOM elements
            this.dom = context && context instanceof Sizze ?
              context.find(selector).get() :
              selectElements(selector, context)
          }
        } else if (Array.isArray(selector)) {
          this.dom = sanitize(selector)
        } else if (
          selector instanceof NodeList ||
          selector instanceof HTMLCollection
        ) {
          this.dom = toArray(selector)
        } else if (selector instanceof Sizze) {
          return selector
        } else if (typeof selector == 'function') {
          return this.ready(selector)
        } else {
          // assume DOM node
          this.dom = selector ? [selector] : []
        }
        this.length = this.dom.length
      }
      // dom methods
    add(selector) {
      const dom = this.get()
      const objToAdd = Selector(selector)
      const domToAdd = objToAdd.get()
      for (let i = 0; i < objToAdd.length; i++) {
        dom.push(domToAdd[i])
      }
      return Selector(removeDuplicates(dom))
    }

    addClass(className) {
      return manipulateClass.call(this, 'add', className)
    }
    after() {
      insertHTML.call(this, 'afterend', arguments)
      return this
    }
    append() {
      insertHTML.call(this, 'beforeend', arguments)
      return this
    }
    appendTo(target) {
      return Selector(insertHTML.call(Selector(target), 'beforeend', [this]))
    }
    attr(name, value) {
      const isFunc = typeof value === 'function'
      if (typeof value === 'string' || typeof value === 'number' || isFunc) {
        return this.each(function (i) {
          if (this.nodeType > 1) return
          this.setAttribute(
            name, isFunc ? value.call(this, i, this.getAttribute(name)) : value
          )
        })
      }
      if (typeof name === 'object') {
        const attrNames = Object.keys(name)
        const attrNamesLen = attrNames.length
        return this.each(function () {
          if (this.nodeType > 1) return
          for (let i = 0; i < attrNamesLen; i++) {
            const attribute = attrNames[i]
            this.setAttribute(attribute, name[attribute])
          }
        })
      }
      const el = this.get(0)
      if (!el || el.nodeType > 1) return
      const attrValue = el.getAttribute(name)
      if (attrValue == null) {
        return undefined
      }
      if (!attrValue) {
        return name
      }
      return attrValue
    }
    before() {
      insertHTML.call(this, 'beforebegin', arguments)
      return this
    }

    children(selector) {
      const dom = []
      const self = this
      this.each(function () {
        if (this.nodeType > 1) return
        const nodes = this.children
        const nodesLen = nodes.length
        for (let i = 0; i < nodesLen; i++) {
          const node = nodes[i]
          if (!selector || self.is(selector, node)) {
            dom.push(node)
          }
        }
      })
      return Selector(dom)
    }

    clone(withEvents) {
      return this.map(function () {
        if (!this) return
        const clone = this.cloneNode(true)
        withEvents && duplicateEventListeners(this, clone)
        return clone
      }, false)
    }

    closest(selector, context) {
      return findAncestors.call(this, false, false, true, selector, context)
    }

    css(property, value) {
      const valueType = typeof value
      const isString = valueType === 'string'

      // set
      if (isString || valueType === 'number') {
        const isRelativeValue = isString && /=/.test(value)
        if (isRelativeValue) {
          var relativeValue = parseInt(value[0] + value.slice(2))
        }
        return this.each(function () {
          if (this.nodeType > 1) return
          if (isRelativeValue) {
            const current = parseInt(getComputedStyle(this).getPropertyValue(property))
            var result = current + relativeValue
          }
          this.style[property] = addPx(property, isRelativeValue ? result : value)
        })
      }
      // set
      if (valueType == 'function') {
        return this.each(function (index) {
          if (this.nodeType > 1) return
          const oldValue = getComputedStyle(this).getPropertyValue(property)
          this.style[property] = value.call(this, index, oldValue)
        })
      }
      // read
      if (typeof property == 'string') {
        var el = this.get(0)
        if (!el || el.nodeType > 1) return
        return getComputedStyle(el).getPropertyValue(property)
      }
      // read
      if (Array.isArray(property)) {
        var el = this.get(0)
        if (!el || el.nodeType > 1) return
        const o = {}
        const styles = getComputedStyle(el)
        const propertyLen = property.length
        for (let i = 0; i < propertyLen; i++) {
          const prop = property[i]
          o[prop] = styles.getPropertyValue(prop)
        }
        return o
      }
      // set
      const properties = Object.keys(property)
      const propertiesLen = properties.length
      return this.each(function () {
        if (this.nodeType > 1) return
        for (let i = 0; i < propertiesLen; i++) {
          const prop = properties[i]
          this.style[prop] = addPx(prop, property[prop])
        }
      })
    }

    detach() {
      return this.map(function () {
        const parent = this.parentElement
        if (!parent) return
        parent.removeChild(this)
        return this
      }, false)
    }

    each(callback) {
      // callback(index, element) where element == this
      const dom = this.dom
      const len = this.length
      for (let i = 0; i < len; i++) {
        const node = dom[i]
        callback.call(node, i, node)
      }
      return this
    }

    empty() {
      return this.each(function () {
        this.innerHTML = ''
      })
    }

    eq(index) {
      return Selector(this.get(index))
    }

    filter(selector) {
      const isFunc = typeof selector === 'function'
      const self = this
      return this.map(function (i) {
        if (this.nodeType > 1 || (!isFunc && !self.is(selector, this)) || (isFunc && !selector.call(this, i, this))) return
        return this
      }, false)
    }

    find(selector) {
      // .find(selector)
      if (typeof selector === 'string') {
        const dom = []
        this.each(function () {
          if (this.nodeType > 1) return
          const elements = selectElements(selector, this)
          const elementsLen = elements.length
          for (let i = 0; i < elementsLen; i++) {
            dom.push(elements[i])
          }
        })
        return Selector(removeDuplicates(dom))
      }

      // .find(element)
      const elementsToFind = selector.nodeType ? [selector] : selector.get()
      const elementsToFindLen = elementsToFind.length
      const elementsFound = []
      let elementsFoundLen = 0

      for (let i = 0; i < this.length; i++) {
        const el = this.get(i)
        if (el.nodeType > 1) continue
          // check if each element in `this` contains the elements to find
        for (let j = 0; j < elementsToFindLen; j++) {
          const elementToFind = elementsToFind[j]
          if (!el.contains(elementToFind)) continue
          elementsFound[elementsFoundLen++] = elementToFind
          if (elementsFoundLen < elementsToFindLen) continue
            // everything has been found, return results
          return Selector(elementsFound)
        }
      }

      // some elements in elementsToFind weren't descendants of `this`
      return Selector(elementsFound)
    }

    first() {
      return this.eq(0)
    }

    get(index) {
      if (index == null) {
        return this.dom
      }
      if (index < 0) {
        index += this.length
      }
      return this.dom[index]
    }

    has(selector) {
      // .has(selector)
      if (typeof selector === 'string') {
        return this.map(function () {
          if (this.nodeType > 1 || !selectElements(selector, this)[0]) return
          return this
        }, false)
      }

      // .has(contained)
      const result = []
      let i = this.length
      while (i--) {
        const el = this.get(i)
        if (!el.contains(selector)) continue
        result.push(el)
        break
      }
      return Selector(result)
    }

    hasClass(name) {
      let i = this.length
      while (i--) {
        const el = this.get(i)
        if (el.nodeType > 1) return
        if (el.classList.contains(name)) {
          return true
        }
      }
      return false
    }

    height(value) {
      return getSetDimension(this, 'height', value)
    }

    html(htmlString) {
      if (htmlString == null) {
        const el = this.get(0)
        if (!el) return
        return el.innerHTML
      }
      if (typeof htmlString == 'function') {
        return this.each(function (i) {
          const content = htmlString.call(this, i, this.innerHTML)
          Selector(this).html(content)
        })
      }
      return this.each(function () {
        this.innerHTML = htmlString
      })
    }

    index(el) {
      if (!this.length) return
      let toFind
      let selectorElements
      if (!el) {
        toFind = this.get(0)
        selectorElements = this.first().parent().children()
      } else if (typeof el === 'string') {
        toFind = this.get(0)
        selectorElements = Selector(el)
      } else {
        toFind = el instanceof Sizze ? el.get(0) : el
        selectorElements = this
      }
      const elements = selectorElements.get()
      let i = elements.length
      while (i--) {
        if (elements[i] == toFind) {
          return i
        }
      }
      return -1
    }
    insertAfter(target) {
      Selector(target).after(this)
      return this
    }

    insertBefore(target) {
      Selector(target).before(this)
      return this
    }

    is(selector, element) {
      // element is undocumented, internal-use only.
      // It gives better perfs as it prevents the creation of many objects in internal methods.
      const set = element ? [element] : this.get()
      const setLen = set.length

      if (typeof selector === 'string') {
        for (var i = 0; i < setLen; i++) {
          const el = set[i]
          if (el.nodeType > 1) continue
          if (el[matches](selector)) {
            return true
          }
        }
        return false
      }
      if (typeof selector === 'object') {
        // Selector object or DOM element(s)
        let obj
        if (selector instanceof Sizze) {
          obj = selector.get()
        } else {
          obj = selector.length ? selector : [selector]
        }
        const objLen = obj.length
        for (var i = 0; i < setLen; i++) {
          for (let j = 0; j < objLen; j++) {
            if (set[i] === obj[j]) {
              return true
            }
          }
        }
        return false
      }
      if (typeof selector == 'function') {
        for (var i = 0; i < setLen; i++) {
          if (selector.call(this, i, this)) {
            return true
          }
        }
        return false
      }
    }
    last() {
      return this.eq(-1)
    }
    /**
     * 
     * 
     * @param {any} callback
     * @param {bool} flattenArrays 默认 true
     * @returns 
     * 
     * @memberOf Sizze
     */
    map(callback, flattenArrays) {
      if (flattenArrays == null) {
        flattenArrays = true
      }

      const dom = this.get()
      const len = this.length
      const values = []

      for (let i = 0; i < len; i++) {
        const el = dom[i]
        const val = callback.call(el, i, el)

        if (flattenArrays && Array.isArray(val)) {
          const valLen = val.length
          for (let j = 0; j < valLen; j++) {
            values.push(val[j])
          }
          continue
        }

        values.push(val)
      }

      return Selector(values)
    }

    next(selector) {
      return selectImmediateAdjacentSibling(this, 'next', selector)
    }

    nextAll(selector) {
      return selectAdjacentSiblings(this, 'next', selector)
    }

    nextUntil(selector, filter) {
      return selectAdjacentSiblings(this, 'next', filter, selector)
    }

    not(selector) {
      const isFunc = typeof selector == 'function'
      const self = this
      return this.map(function (i) {
        if (isFunc) {
          if (selector.call(this, i, this)) return
        } else {
          if (self.is(selector, this)) return
        }
        return this
      }, false)
    }

    off(events, handler) {
      if (typeof events === 'object') {
        Object.keys(events).forEach(function (event) {
          this.off(event, events[event])
        }, this)
        return this
      }
      if (events) {
        events = events.trim().split(' ')
      }
      return this.each(function () {
        if (!getEvents(this)) return
        if (events) {
          events.forEach(removeMatchedEvents(this, handler))
          return
        }
        Object.keys(getEvents(this)).forEach(removeEvent(this))
      })
    }

    offset(coordinates) {
      if (!coordinates) {
        const el = this.get(0)
        if (!el || el.nodeType > 1) return
        const pos = el.getBoundingClientRect()
        return {
          top: pos.top,
          left: pos.left
        }
      }
      if (typeof coordinates == 'object') {
        return this.each(function () {
          if (this.nodeType > 1) return
          const $this = Selector(this)
          $this.css('position') == 'static' ?
            $this.css('position', 'relative') :
            $this.css({
              top: 0,
              left: 0
            })
          const pos = $this.offset()
          $this.css({
            top: `${coordinates.top - pos.top}px`,
            left: `${coordinates.left - pos.left}px`
          })
        })
      }
      if (typeof coordinates == 'function') {
        return this.each(function (i) {
          const $this = Selector(this)
          const posObj = coordinates.call(this, i, $this.offset())
          $this.offset(posObj)
        })
      }
    }

    offsetParent() {
      const dom = []
      this.each(function () {
        if (this.nodeType > 1) return
        let prt = this
        while (prt != root) {
          prt = prt.parentNode
          const pos = getComputedStyle(prt).getPropertyValue('position')
          if (!pos) break
          if (pos != 'static') {
            dom.push(prt)
            return
          }
        }
        dom.push(root)
      })
      return Selector(dom)
    }

    on(events, handler) {
      // .on(events, handler)
      if (handler) {
        const eventsArr = events.trim().split(' ')

        return this.each(function () {
          if (!getEvents(this)) {
            this.selectorEventListeners = {}
          }
          eventsArr.forEach(function (event) {
            if (!getEvents(this)[event]) {
              getEvents(this)[event] = []
            }
            getEvents(this)[event].push(handler)

            this.addEventListener(event, handler)
            if (!isNamespaced(event)) return
            this.addEventListener(getEventFromNamespace(event), handler)
          }, this)
        })
      }

      // .on({ event: handler })
      Object.keys(events).forEach(function (event) {
        this.on(event, events[event])
      }, this)
      return this
    }

    parent(selector) {
      return findAncestors.call(this, true, true, false, selector)
    }
    /**
     * 
     * @param {any} selector
     * @returns
     * 和 jQuery不同的地方；1.$("html").parent() and $("html").parents()返回一个空的集合； 2.返回的集合不能进行倒序
     * 
     * @memberOf Sizze
     */
    parents(selector) {
      return findAncestors.call(this, true, false, false, selector)
    }

    position() {
      const pos = {
        first: this.offset(),
        prt: this.parent().offset()
      }
      if (!pos.first) return
      return {
        top: pos.first.top - pos.prt.top,
        left: pos.first.left - pos.prt.left
      }
    }

    prop(propertyName, value) {
      if (typeof propertyName == 'object') {
        const props = Object.keys(propertyName)
        const propsLen = props.length
        return this.each(function () {
          for (let i = 0; i < propsLen; i++) {
            const prop = props[i]
            this[prop] = propertyName[prop]
          }
        })
      }
      if (value == null) {
        const el = this.get(0)
        if (!el) return
        return el[propertyName]
      }
      const isFunc = typeof value == 'function'
      return this.each(function (i) {
        this[propertyName] = isFunc ? value.call(this, i, this[propertyName]) : value
      })
    }

    prepend() {
      insertHTML.call(this, 'afterbegin', arguments)
      return this
    }

    prependTo(target) {
      return Selector(insertHTML.call(Selector(target), 'afterbegin', [this]))
    }

    prev(selector) {
      return selectImmediateAdjacentSibling(this, 'previous', selector)
    }

    prevAll(selector) {
      return selectAdjacentSiblings(this, 'previous', selector)
    }

    prevUntil(selector, filter) {
      return selectAdjacentSiblings(this, 'previous', filter, selector)
    }

    ready(handler) {
      this.dom = [document]
      this.length = 1
      return this.on('DOMContentLoaded', handler)
    }

    remove(selector) {
      const self = this
      return this.each(function () {
        const parent = this.parentElement
        if (!parent) return
        if (!selector || self.is(selector, this)) {
          parent.removeChild(this)
        }
      })
    }

    removeAttr(attributeName) {
      if (attributeName) {
        const attributes = attributeName.trim().split(' ')
        const attributesLen = attributes.length
        this.each(function () {
          if (this.nodeType > 1) return
          for (let i = 0; i < attributesLen; i++) {
            this.removeAttribute(attributes[i])
          }
        })
      }
      return this
    }

    removeClass(className) {
      return manipulateClass.call(this, 'remove', className)
    }

    removeProp(propertyName) {
      return this.each(function () {
        this[propertyName] = undefined
      })
    }

    replaceAll(target) {
      Selector(target).replaceWith(this)
      return this
    }

    replaceWith(newContent) {
      if (typeof newContent == 'function') {
        return this.each(function (i) {
          Selector(this).replaceWith(newContent.call(this, i, this))
        })
      }
      return this.before(newContent).remove()
    }

    scrollLeft(value) {
      return scroll(this, 'scrollLeft', value)
    }

    scrollTop(value) {
      return scroll(this, 'scrollTop', value)
    }

    siblings(selector) {
      const siblings = []
      const self = this
      this.each(function (i, el) {
        Selector(this).parent().children().each(function () {
          if (this == el || (selector && !self.is(selector, this))) return
          siblings.push(this)
        })
      })
      return Selector(siblings)
    }

    size() {
      return this.length
    }

    slice(start, end) {
      const dom = this.get()
      const range = []
      let i = start >= 0 ? start : start + this.length
      let l = this.length
      if (end < 0) {
        l += end
      } else if (end >= 0) {
        l = end > this.length ? this.length : end
      }
      for (; i < l; i++) {
        range.push(dom[i])
      }
      return Selector(range)
    }

    text(content) {
      if (content == null) {
        const textContents = []
        this.each(function () {
          textContents.push(this.textContent)
        })
        return textContents.join('')
      }
      const isFunc = typeof content == 'function'
      return this.each(function (i) {
        this.textContent = isFunc ? content.call(this, i, this.textContent) : content
      })
    }

    toggleClass(className, bool) {
      return manipulateClass.call(this, 'toggle', className, bool)
    }

    trigger(event) {
      // IE polyfill
      if (!window.CustomEvent || typeof window.CustomEvent !== 'function') {
        var CustomEvent = (event, params) => {
          let evt
          params = params || {
            bubbles: false,
            cancelable: false,
            detail: undefined
          }
          evt = document.createEvent('CustomEvent')
          evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail)
          return evt
        }
        CustomEvent.prototype = window.Event.prototype
        window.CustomEvent = CustomEvent
      }
      return this.each(function () {
        getEventsToRemove(this, event).forEach(function (matchedEvent) {
          this.dispatchEvent(new CustomEvent(matchedEvent, {
            bubbles: true,
            cancelable: true,
          }))
        }, this)
      })
    }

    unwrap() {
      this.parent().each(function () {
        if (this == document.body || this == root) return
        Selector(this).replaceWith(this.childNodes)
      })
      return this
    }

    val(value) {
      if (value == null) {
        const el = this.get(0)
        if (!el) return
        if (el.multiple) {
          const values = []
          this.first().children(':checked').each(function () {
            values.push(this.value)
          })
          return values
        }
        return el.value
      }
      if (Array.isArray(value)) {
        const self = this
        return this.each(function () {
          if (this.multiple) {
            self.children().each(function () {
              this.selected = inArray(this.value, value)
            })
            return
          }
          this.checked = inArray(this.value, value)
        })
      }
      if (typeof value == 'function') {
        return this.each(function (i) {
          Selector(this).val(value.call(this, i, this.value))
        })
      }
      return this.each(function () {
        this.value = value
      })
    }

    width(value) {
      return getSetDimension(this, 'width', value)
    }

    wrap(wrappingElement) {
      return wrap.call(this, wrappingElement)
    }

    wrapAll(wrappingElement) {
      return wrap.call(this, wrappingElement, 'all')
    }

    wrapInner(wrappingElement) {
      return wrap.call(this, wrappingElement, 'inner')
    }
  }

  // public Selector
  Selector = (selector, context) => new Sizze(selector, context)
  if (window.$ == null) {
    window.$ = Selector
  }
}())