/**
 *  litelib.js
 *      conception:
 *  1. Small size of library and code to use
 *      . no or minimum foolproofing
 *      . not frequent overloading of functions (as in most cases it is not profitable), for example no overloading get/set, or function with similar actions
 *  2. Cross-browser ie6+
 *  3. working with real DOM object
 *  4. Unobtrusive JavaScript
 *  5. simple to get only parts of library
 *  
 *  TODO: select base animate function; get position,offset,scroll offset; work with css styles, class; set/get attributes; effects animate;
 *  
 *      using:
 *      (function ($){
 *      $.css(myobj, "opacity", 0)
 *      })(liteLib)
*/
var liteLib = new (function (){
    
    // ------------------- CSS ----------------------
    // get/set css value
    // @el - DOM elem
    //     css(el, 'p_name') - get p_name property
    //        @p_name - property name (ex: border-width)
    //     css(el, p_name, p_val) 
    //     css(el, {p_name:p_val})
    //        @p_name - property name (ex: borderWidth)
    //         @p_val - value
    // todo: fix: in IE if elem set position=auto, then this function return 0px! maybe right return .style if != undefined
    function css(el, p_name, p_val){
        if (!el) return;
        
        if (typeof p_name=='object')
            for (var p in p_name) css(el, p, p_name[p]);
            
        else if (arguments.length>2){
            if (p_name!='opacity' || typeof el.style[p_name]=='string')
                el.style[p_name]=p_val;
            else
                //if (typeof e.style.filter=='stirng') // opacity for IE<9
                el.style.filter='alpha(opacity=' + (100 * p_val) + ')';
        }
        
        else{
            var val, dv = document.defaultView;
            
            // ie opacity
            if (p_name=='opacity' && typeof el.style[p_name]!='string')
                val = (el.filters && el.filters.alpha)? el.filters.alpha.opacity / 100 : 1;
                
            // other
            else if (dv && dv.getComputedStyle){
                var s = dv.getComputedStyle(el,'');
                if (s) val = s.getPropertyValue(p_name);
            }
            else {
                var pName = p_name.replace(/\-\w/g,function(s){ return s.charAt(1).toUpperCase() });
                val = (el.currentStyle || el.style)[pName];
                if(el.currentStyle)
                    val = el.currentStyle[pName];
                else
                    val = el.style[pName];
            }
            
            return val;
        }
    }
    

    // get css value
    // @el - DOM elem
    //     css(el, 'p_name') - get p_name property
    //        @p_name - property name (example: border-width)
    // todo: fix: in IE if elem set position=auto, then this function return 0px! maybe right return .style if != undefined
    function getCss(el, p_name){
        var val, dv = document.defaultView;
        
        return (val = dv && dv.getComputedStyle && dv.getComputedStyle(el,''))
                ? val.getPropertyValue(p_name) // for normal browsers
                : (el.currentStyle || el.style)[ // for ie and fallback
                        p_name.replace(/\-(\w)/g, function(s,s1){return s1.toUpperCase()}) // property-name => propertyName
                    ];
    }
    

    // set css value
    // @el - DOM elem
    //     css(el, p_name, p_val) 
    //     css(el, {p_name:p_val})
    //        @p_name - property name (ex: borderWidth)
    //         @p_val - value
    function setCss(el, p_name, p_val){
        if (typeof p_name=='object')
            for (var p in p_name) setCss(el, p, p_name[p]);
        else
            el.style[p_name]=p_val;
    }

    function setOpacity(el,p_val){
        if (typeof el.style.opacity=='string')
            el.style.opacity = p_val;
        else
            //if (typeof e.style.filter=='stirng') // opacity for IE<9
            el.style.filter='alpha(opacity=' + (100 * p_val) + ')';
    }


    function getOpacity(el){
        // ie opacity
        if (typeof el.style.opacity!='string')
            return (el.filters && el.filters.alpha)? el.filters.alpha.opacity / 100 : 1;
        else
            return getCss(el,'opacity')
    }

    
    // calc width/height
    // outer - outerWidth
    // margins - with margins
    function width(el,outer,margins){
        var names = "padding-left|padding-right|border-left-width|border-right-width".split("|");
        var padding = 0;
        for (var i=0; i<names.length; i++)
            padding += parseFloat(css(el,names[i])) || 0;
        
        var res = parseFloat(css(el,'width')) 
                || ((el.offsetWidth||0)-padding); // in ie computedStyle more right then offsetWidth
        if (outer) res += padding;
        if (margins)
            res += (parseFloat(css(el,"margin-left"))||0) + (parseFloat(css(el,"margin-right"))||0);
        return res
    }
    
    function height(el,outer,margins){
        var names = "padding-top|padding-bottom|border-top-width|border-bottom-width".split("|");
        var padding = 0;
        for (var i=0; i<names.length; i++)
            padding += parseFloat(css(el,names[i])) || 0;
        
        var res = parseFloat(css(el,'height')) 
                || ((el.offsetHeight||0)-padding); // in ie computedStyle more right then offsetWidth
        if (outer) res += padding;
        if (margins)
            res += (parseFloat(css(el,"margin-top"))||0) + (parseFloat(css(el,"margin-bottom"))||0);
        return res
    }

    function getRegClass(cName){
        return new RegExp("(^|\\s+)" + cName + "(\\s+|$)", "g");
    }
    
    function addClass(obj, cName){
        if (!(getRegClass(cName)).test(obj.className)) 
            obj.className = (obj.className + " " + cName);
    }

    function removeClass(obj, cName){
        obj.className = obj.className.replace(getRegClass(cName), " ")
    }

    function hasClass(obj, cName){
        return (getRegClass(cName)).test(obj.className)
    }

    function insertAfter(node, refNode){
        if (refNode.nextSibling)
            node.parentNode.insertBefore(node, refNode.nextSibling);
        else
            node.parentNode.appendChild(node);
    }
    
    
    // ------------------ EVENTS --------------------
    // cross-browser add event
    // @elem - elem
    // @type - name of event without "on" prefix
    // @handler - function. Attention!!! In IE elem "this" in "handler" is wrong
    // event object:
    // target = e.target || e.srcelem;
    function bind(elem, type, handler){
        //if(!e) { e = window.event; }
        if (elem.addEventListener)
            elem.addEventListener(type, handler, false)
        else
            elem.attachEvent("on"+type, handler)
    }
    
    function unbind(elem, type, handler){
        if (elem.removeEventListener) 
            elem.removeEventListener(type,handler, false);
        else 
            elem.detachEvent("on"+type,handler);
    }
    
    // fire(obj,'change');
    function fire(elem, type, memo){
        var event, dcE = document.createEvent; 
        
        if (dcE) { // for firefox + others
            event = document.createEvent("HTMLEvents");
            event.initEvent(type, true, true);// event type,bubbling,cancelable
        }
        else // for IE
            event = document.createEventObject();
        
        event.memo = memo || {};
        
        if (dcE) 
            return !elem.dispatchEvent(event);
        else 
            return elem.fireEvent("on" + type, event);
    }
    
    
    // on DOM ready event bind
    function bindReady(func){
        // prevent several fire
        var fired;
        function startReady(){
            if (!fired){
                fired=1;
                func();
            };
        };
        
        // browser event has already occurred.
        if ( document.readyState === "complete" ) {
            // Handle it asynchronously to allow scripts the opportunity to delay ready
            return setTimeout( startReady(), 1 );
        }
        
        // readystatechange for IE
        var eventName = document.addEventListener? "DOMContentLoaded": "readystatechange";
        function loaded(){
            if (eventName=="DOMContentLoaded" || document.readyState === "complete"){
                unbind(document, eventName, loaded);
                startReady();
            }
        }
        bind(document, eventName, loaded);
        
        // A fallback to window.onload, that will always work
        bind(window,'load', startReady);
    }
    
    // @target - object to move 
    // @handle - object to get, default = @target
    function movable(target, handle) {
        (handle || target).onmousedown = function(event) {
            var pageX = target.offsetLeft - event.pageX;
            var pageY = target.offsetTop - event.pageY;

            document.onmousemove = function(event) {
                target.style.left = event.pageX + pageX + "px";
                target.style.top = event.pageY + pageY + "px"; 
                target.style.bottom = 0;
                target.style.right = 0;
            }

            document.onmouseup = function() {
                document.onmousemove = null;
                document.onmouseup = null;
            }

            return false;
        }
    }
    
    
    // ------------------- TIMERS ----------------------- 


    // @func = function(a){} - callback function
    // @delay
    // @result = {stop:function(end){}}
    function process(func,delay,onEnd){
        // init
        var busy, a = 0, da = 50/delay; // 50- interval of setInterval
        var timer = setInterval(
            function(){
                if (a<1){
                    if (!busy){;
                        busy=1;
                        func(a);
                        busy=0;
                    }
                    a += da;
                }
                else
                    stop(1);
            },50 // about 50ms=20fps, 40ms=25fps
        )
        
        // stop
        function stop(end){
            clearInterval(timer);
            // go to end values
            if (end) {
                func(1);
                if (onEnd) onEnd();
            }
        }
        
        return {stop:stop};
    }

    function animate2(el,styles,delay,onend){
        // init
        var value0={},value1={},mask={};
        for (p in styles){
            value0[p] = getCss(el, p);
            value0[p] = (/-?\d+/.exec(value0[p]) || [value0[p]])[0];
            value1[p] = (/-?\d+/.exec(styles[p]) || [])[0];
            mask[p] = (styles[p]+"").replace(/-?\d+/,'@');
        }
        
        return process(
            function(a){
                for (p in styles)
                    setCss(el, p, (a!=1? mask[p].replace('@', parseFloat((1 - a)*value0[p] + a*value1[p])): styles[p]));
            },
            delay, onend
        )
    }
    

    // process with use timeout
    // @func - runing func(0..1);
    // @delay 
    // @onEnd - exec after end, if not stoped
    function process2(func,delay,onEnd){
        // init
        func(0);
        
        // start
        var run = 1;
        var time0 = new Date().getTime(); // start time
        function cont(){
            timer = setTimeout(
                function(){
                    var time1 = new Date().getTime() - time0; // elapsed time
                    if (time1 < delay){
                        var a = time1/delay;
                        
                        if (run){
                            func(a);
                            cont();
                        }
                    }
                    else
                        stop(1);
                },
                40
            )
        };
        
        cont();
        
        // stop
        function stop(end){
            run = 0;
            // go to end values
            if (end) {
                func(1);
                if (onEnd) onEnd();
            }
        }
    }
    
    
    function animate(el,styles,delay){
        // init
        var value0={},value1={},mask={};
        for (p in styles){
            value0[p] = css(el, p);
            value0[p] = (/-?\d+/.exec(value0[p]) || [value0[p]])[0];
            value1[p] = (/-?\d+/.exec(styles[p]) || [])[0];
            mask[p] = (styles[p]+"").replace(/-?\d+/,'@');
        }
        
        // start
        var time0 = new Date().getTime(); // start time
        var timer = setInterval(
            function(){
                var time1 = new Date().getTime() - time0; // elapsed time
                if (time1 < delay){
                    var a = time1/delay;
                    for (p in styles)
                        css(el, p, mask[p].replace('@', parseFloat((1 - a)*value0[p] + a*value1[p])));
                }
                else
                    stop(1);
            },30
        )
        
        // stop
        function stop(end){
            clearInterval(timer);
            // go to end values
            if (end) for (p in styles) css(el, p, styles[p]);
        }
        
        return stop;
    }
    
    function fadeIn(el,duration,onend){
        var old = getOpacity(el);
        
        setOpacity(el,0);
        el.style.visibility='visible';
        
        // init
        var value1 = parseFloat(old) || 1;
        
        return process(
            function(a){
                setOpacity(el, a*value1);
            },
            delay, 
            function(){
                setOpacity(el, old);
                if (onend) onend();
            }
        )
    }    
    
    function fadeIn2(el,duration){
        var old = css(el,'opacity');
        css(el,{opacity:0, visibility:'visible'});
        animate(el,{opacity:old},duration);
    }
    
    
    // @url
    // @success=function(text)
    // @error=function(status) where status=HTTP status: 404 - not found
    function ajax(url,success,error)
    {
        var xhr;
        // code for IE7+, Firefox, Chrome, Opera, Safari
        try { xhr = new XMLHttpRequest() }
        catch (e) { 
            // code for IE6, IE5
            try { xhr = new ActiveXObject('Microsoft.XMLHTTP') }
            catch (e) {}
        }
        
        if (xhr){
            xhr.onreadystatechange=function(){
                if (xhr.readyState==4){
                    if(xhr.status==200 || !xhr.status){ // 200=OK 0=for local file
                        if (success)
                            success(xhr.responseText);
                    }
                    // errors
                    else {
                        if (error) 
                            error(xhr.status);
                    }
                }
            }
            xhr.open("GET",url,true);
            xhr.send();
        }
        return xhr;
    }    
    
    // ----------------- OBJECTS --------------------
    function type(exp){
        var res = typeof exp;
        if (exp instanceof  Array) res='array';
        if (res=='object' && exp.tagName) res='node';
        return res;
    }

    // join arrays
    function join(to,from){    
        for(var i=0; i<from.length; i++) to[to.length] = from[i];
        return to;
    }
    
    // copy record one to other with replace
    function copy(to,from){
        for(var i in from) to[i] = from[i];
        return to;
    }

    // extend object by new fields from other
    function extend(to,from){
        for(var p in from) 
            if (!(p in to))
                to[p] = from[p];
        return to;
    }

    // clone objects
    function clone(o){
        if('object' !== typeof o) return o;
        
        var c = ((o instanceof Array) ? [] : {});
        for (var p in o)
            if (o.hasOwnProperty(p))
                c[p] = clone(o[p]);
        
        return c;
    };

    // viewport size and scroll position
    function viewport(){
        var doc = ((document.compatMode == 'CSS1Compat') ? document.documentelem : document.body);
        return {
            left : window.pageXOffset || doc.scrollLeft,
            top : window.pageYOffset || doc.scrollTop,
            width : window.innerWidth  || doc.clientWidth,
            height : window.innerHeight || doc.clientHeight
        };
    }     
    
    
    // export
    var $ = this;
    $.css = css;
    $.getCss = getCss;
    $.setCss = setCss;
    $.setOpacity = setOpacity;
    $.getOpacity = getOpacity; 
    $.width = width; 
    $.height = height; 
    $.addClass = addClass; 
    $.removeClass = removeClass; 
    $.hasClass = hasClass; 
    $.insertAfter = insertAfter; 
    $.bind = bind; 
    $.unbind = unbind; 
    $.fire = fire; 
    $.bindReady = bindReady; 
    $.movable = movable; 
    $.process = process; 
    $.animate2 = animate2; 
    $.process2 = process2; 
    $.animate = animate; 
    $.fadeIn = fadeIn; 
    $.fadeIn2 = fadeIn2; 
    $.ajax = ajax; 
    $.type = type; 
    $.join = join; 
    $.copy = copy; 
    $.extend = extend; 
    $.clone = clone; 
    $.viewport = viewport; 
});

