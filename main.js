function isElementClickable(e) {
    var cssSelector = "a, button, select, input, textarea, summary, *[onclick], *[contenteditable=true], *.jfk-button, *.goog-flat-menu-button, *[role=button], *[role=link], *[role=menuitem], *[role=option], *[role=switch], *[role=tab], *[role=checkbox], *[role=combobox], *[role=menuitemcheckbox], *[role=menuitemradio]";

    return e.matches(cssSelector)
        || getComputedStyle(e).cursor === "pointer"
        || getComputedStyle(e).cursor.substr(0, 4) === "url("
        || e.closest("a, *[onclick], *[contenteditable=true], *.jfk-button, *.goog-flat-menu-button") !== null;
}

function getVisibleElements(filter) {
    var all = Array.from(document.documentElement.getElementsByTagName("*"));
    var visibleElements = [];
    for (var i = 0; i < all.length; i++) {
        var e = all[i];
        // include elements in a shadowRoot.
        if (e.shadowRoot) {
            var cc = e.shadowRoot.querySelectorAll('*');
            for (var j = 0; j < cc.length; j++) {
                all.push(cc[j]);
            }
        }
        var rect = e.getBoundingClientRect();
        if ( (rect.top <= window.innerHeight) && (rect.bottom >= 0)
            && (rect.left <= window.innerWidth) && (rect.right >= 0)
            && rect.height > 0
        ) {
            filter(e, visibleElements);
        }
    }
    return visibleElements;
}

function getRealRect(elm) {
    if (elm.childElementCount === 0) {
        var r = elm.getClientRects();
        if (r.length === 3) {
            // for a clipped A tag
            return r[1];
        } else if (r.length === 2) {
            // for a wrapped A tag
            return r[0];
        } else {
            return elm.getBoundingClientRect();
        }
    } else if (elm.childElementCount === 1 && elm.firstElementChild.textContent) {
        return elm.firstElementChild.getBoundingClientRect();
    } else {
        return elm.getBoundingClientRect();
    }
}

function setInnerHTML(elm, str) {
    elm.innerHTML = str;
}

function createElement(str) {
    var div = document.createElement('div');
    setInnerHTML(div, str);

    return div.firstChild;
}
var holder = createElement('<div id="sk_hints" style="display: block; opacity: 1;"/>');


function elementM(elm, i) {
    console.log(getRealRect(elm));
}

function getCoordinate() {
    // a hack to get co-ordinate
    var link = createElement('<div style="top: 0; left: 0;">A</div>');
    holder.prepend(link);
    document.documentElement.prepend(holder);
    var br = link.getBoundingClientRect();
    setInnerHTML(holder, "");
    return {
        top: br.top + window.pageYOffset - document.documentElement.clientTop,
        left: br.left + window.pageXOffset - document.documentElement.clientLeft
    };
};

var hChars = 'asdfgqwertzxcvb';
function genLabels(M) {
    if (M <= hChars.length) {
        return hChars.slice(0, M).toUpperCase().split('');
    }
    var codes = [];
    var genCodeWord = function(N, length) {
        for (var i = 0, word = ''; i < length; i++) {
            word += hChars.charAt(N % hChars.length).toUpperCase();
            N = ~~(N / hChars.length);
        }
        codes.push(word.split('').reverse().join(''));
    };

    var b = Math.ceil(Math.log(M) / Math.log(hChars.length));
    var cutoff = Math.pow(hChars.length, b) - M;
    var cutoffR = ~~(cutoff / (hChars.length - 1));

    for (var i = 0; i < cutoffR; i++) {
        genCodeWord(i, b - 1);
    }
    for (var j = cutoffR; j < M; j++) {
        genCodeWord(j + cutoff, b);
    }
    return codes;
};

function getZIndex(node) {
    var z = 0;
    do {
        var i = parseInt(getComputedStyle(node).getPropertyValue('z-index'));
        z += (isNaN(i) || i < 0) ? 0 : i;
        node = node.parentNode;
    } while (node && node !== document.body && node !== document && node.nodeType !== node.DOCUMENT_FRAGMENT_NODE);
    return z;
}

var _styleForClick = "";
function placeHints(elements) {
    setInnerHTML(holder, "");
    holder.setAttribute('mode', 'click');
    holder.style.display = "";

    var hintLabels = genLabels(elements.length);
    var bof = getCoordinate();
    var style = createElement(`<style>#sk_hints>div.myHint{${_styleForClick}}</style>`);
    var style = createElement("");
    holder.prepend(style);
    var links = elements.map(function(elm, i) {
        var r = getRealRect(elm),
            z = getZIndex(elm);
        var left, width = Math.min(r.width, window.innerWidth);
        // if (runtime.conf.hintAlign === "right") {
        //     left = window.pageXOffset + r.left - bof.left + width;
        // } else if (runtime.conf.hintAlign === "left") {
        //     left = window.pageXOffset + r.left - bof.left;
        // } else {
        left = window.pageXOffset + r.left - bof.left + width / 2;
        // }
        if (left < window.pageXOffset) {
            left = window.pageXOffset;
        } else if (left + 32 > window.pageXOffset + window.innerWidth) {
            left = window.pageXOffset + window.innerWidth - 32;
        }
        var link = createElement(`<div class="myHint">${hintLabels[i]}</div>`);
        if (elm.dataset.hint_scrollable) { link.classList.add('hint-scrollable'); }
        link.style.top = Math.max(r.top + window.pageYOffset - bof.top, 0) + "px";
        link.style.left = left + "px";
        link.style.zIndex = z + 9999;
        link.zIndex = link.style.zIndex;
        link.label = hintLabels[i];
        link.link = elm;
        return link;
    });
    links.forEach(function(link) {
        holder.appendChild(link);
    });
    var hints = holder.querySelectorAll('#sk_hints>div');
    var bcr = getRealRect(hints[0]);
    for (var i = 1; i < hints.length; i++) {
        var h = hints[i];
        var tcr = getRealRect(h);
        if (tcr.top === bcr.top && Math.abs(tcr.left - bcr.left) < bcr.width) {
            h.style.top = h.offsetTop + h.offsetHeight + "px";
        }
        bcr = getRealRect(h);
    }
    document.documentElement.prepend(holder);
}

function main2() {
    let elements = getVisibleElements(function(e, v) {
        if (isElementClickable(e)) {
            v.push(e);
        }
    });
    placeHints(elements);
    // let links = elements.map(elementM);
}

function main() {
    let elements = getVisibleElements(function(e, v) {
        if (isElementClickable(e)) {
            v.push(e);
        }
    });
}

$(document.head).append('<link rel="stylesheet" href="/home/simon/afc/ass/js/main.css">');
